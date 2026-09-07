import { getSupabaseAdmin, getUserFromToken } from '../utils/supabaseAdmin'
import { setSensitiveSecurityHeaders } from '../utils/securityConfig'

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

    const { data: vaultData = [], error } = await admin
      .from('vault_credentials')
      .select('id, household_id, owner_user_id, platform_type, platform_name, username_masked, secret_encrypted, secret_encryption_iv, encryption_version, encryption_algorithm, created_at, updated_at, owner_user:users!vault_credentials_owner_user_id_fkey(id, role, full_name)')
      .eq('household_id', dbUser.household_id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[vault.get] db error:', error)
      throw createError({ statusCode: 500, statusMessage: 'Gagal memuat kredensial brankas' })
    }

    // Return sanitized items with ciphertext and IV for client-side decrypt.
    // SERVER NEVER DECRYPTS SECRET.
    const items = (vaultData ?? []).map((v: any) => ({
      id: v.id,
      platformType: v.platform_type || 'bank',
      platformName: v.platform_name || '',
      bankName: (v.platform_name || '?').charAt(0).toUpperCase(),
      name: `${v.platform_name} (${v.owner_user?.role === 'suami' ? 'Suami' : v.owner_user?.role === 'istri' ? 'Istri' : 'Bersama'})`,
      usernameMasked: v.username_masked || '-',
      owner: v.owner_user?.role || 'bersama',
      ownerUserId: v.owner_user_id,
      isOwner: v.owner_user_id === dbUser.id,
      secretEncrypted: v.secret_encrypted,
      secretEncryptionIv: v.secret_encryption_iv || '',
      encryptionVersion: v.encryption_version || 1,
      createdAt: v.created_at,
      updatedAt: v.updated_at,
    }))

    return {
      success: true,
      items,
    }
  } catch (err: any) {
    if (err?.statusCode) throw err
    console.error('[vault.get] error:', err?.message ?? err)
    throw createError({ statusCode: 500, statusMessage: err?.message ?? 'Internal server error' })
  }
})

