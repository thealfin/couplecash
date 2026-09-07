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

    const admin = getSupabaseAdmin()
    const { data: dbUser } = await admin
      .from('users')
      .select('id, household_id, role')
      .eq('auth_user_id', user.id)
      .single()

    if (!dbUser?.household_id) {
      throw createError({ statusCode: 403, statusMessage: 'User does not belong to an active household' })
    }

    const body = await readBody(event)
    const {
      platformType = 'bank',
      platformName,
      usernameMasked,
      secretEncrypted,
      secretEncryptionIv,
      encryptionVersion = 1,
      ownerUserId,
    } = body || {}

    if (!platformName || !secretEncrypted || !secretEncryptionIv) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Nama platform, ciphertext, dan IV enkripsi wajib diisi',
      })
    }

    // Determine owner: must be a member of this household, else current user
    let resolvedOwnerId = dbUser.id
    if (ownerUserId && ownerUserId !== dbUser.id) {
      const { data: partner } = await admin
        .from('users')
        .select('id')
        .eq('id', ownerUserId)
        .eq('household_id', dbUser.household_id)
        .single()
      if (partner) {
        resolvedOwnerId = partner.id
      }
    }

    const { data: newVault, error: insertError } = await admin
      .from('vault_credentials')
      .insert({
        household_id: dbUser.household_id,
        owner_user_id: resolvedOwnerId,
        platform_type: platformType,
        platform_name: platformName.trim(),
        username_masked: usernameMasked?.trim() || '-',
        secret_encrypted: secretEncrypted,
        secret_encryption_iv: secretEncryptionIv,
        encryption_version: Number(encryptionVersion) || 1,
        encryption_algorithm: 'AES-GCM-256',
        is_deleted: false,
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('[vault.post] insert error:', insertError)
      throw createError({ statusCode: 500, statusMessage: 'Gagal menyimpan kredensial ke brankas' })
    }

    await logSecurityAudit({
      householdId: dbUser.household_id,
      userId: dbUser.id,
      entityType: 'vault',
      entityId: newVault.id,
      action: 'VAULT_CREATED',
      metadata: {
        platformType,
        platformName: platformName.trim(),
      },
    })

    return {
      success: true,
      id: newVault.id,
      message: 'Kredensial berhasil disimpan dengan aman',
    }
  } catch (err: any) {
    if (err?.statusCode) throw err
    console.error('[vault.post] error:', err?.message || err)
    throw createError({ statusCode: 500, statusMessage: err?.message || 'Gagal menyimpan kredensial' })
  }
})
