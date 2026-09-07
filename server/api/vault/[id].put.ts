import { getUserFromToken, getSupabaseAdmin } from '../../utils/supabaseAdmin'
import { setSensitiveSecurityHeaders, logSecurityAudit } from '../../utils/securityConfig'

export default defineEventHandler(async (event) => {
  setSensitiveSecurityHeaders(event)
  try {
    const authHeader = getHeader(event, 'Authorization')
    const user = await getUserFromToken(authHeader)
    if (!user) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const id = getRouterParam(event, 'id')
    if (!id) {
      throw createError({ statusCode: 400, statusMessage: 'ID item brankas diperlukan' })
    }

    const admin = getSupabaseAdmin()
    const { data: dbUser } = await admin
      .from('users')
      .select('id, household_id')
      .eq('auth_user_id', user.id)
      .single()

    if (!dbUser?.household_id) {
      throw createError({ statusCode: 403, statusMessage: 'User does not belong to an active household' })
    }

    // Verify item belongs to household
    const { data: existingItem } = await admin
      .from('vault_credentials')
      .select('id, household_id, owner_user_id')
      .eq('id', id)
      .eq('household_id', dbUser.household_id)
      .eq('is_deleted', false)
      .single()

    if (!existingItem) {
      throw createError({ statusCode: 404, statusMessage: 'Item brankas tidak ditemukan' })
    }

    const body = await readBody(event)
    const {
      platformType,
      platformName,
      usernameMasked,
      secretEncrypted,
      secretEncryptionIv,
      encryptionVersion,
      ownerUserId,
    } = body || {}

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    if (platformType) updates.platform_type = platformType
    if (platformName) updates.platform_name = platformName.trim()
    if (usernameMasked !== undefined) updates.username_masked = usernameMasked.trim() || '-'

    // Only update ciphertext if client submitted a newly re-encrypted secret
    if (secretEncrypted && secretEncryptionIv) {
      updates.secret_encrypted = secretEncrypted
      updates.secret_encryption_iv = secretEncryptionIv
      if (encryptionVersion) updates.encryption_version = Number(encryptionVersion)
    }

    if (ownerUserId && ownerUserId !== existingItem.owner_user_id) {
      // Validate owner is in same household
      const { data: partner } = await admin
        .from('users')
        .select('id')
        .eq('id', ownerUserId)
        .eq('household_id', dbUser.household_id)
        .single()
      if (partner) {
        updates.owner_user_id = partner.id
      }
    }

    const { error: updateError } = await admin
      .from('vault_credentials')
      .update(updates)
      .eq('id', existingItem.id)

    if (updateError) {
      console.error('[vault.put] update error:', updateError)
      throw createError({ statusCode: 500, statusMessage: 'Gagal memperbarui item brankas' })
    }

    await logSecurityAudit({
      householdId: dbUser.household_id,
      userId: dbUser.id,
      entityType: 'vault',
      entityId: existingItem.id,
      action: 'VAULT_UPDATED',
      metadata: {
        updatedSecret: !!(secretEncrypted && secretEncryptionIv),
        platformName: updates.platform_name || undefined,
      },
    })

    return {
      success: true,
      message: 'Kredensial brankas berhasil diperbarui',
    }
  } catch (err: any) {
    if (err?.statusCode) throw err
    console.error('[vault.put] error:', err?.message || err)
    throw createError({ statusCode: 500, statusMessage: err?.message || 'Gagal memperbarui kredensial' })
  }
})
