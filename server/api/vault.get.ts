import { getSupabaseAdmin } from '../utils/supabaseAdmin'

export default defineEventHandler(async (event) => {
  try {
    const authHeader = getHeader(event, 'Authorization')
    const admin = getSupabaseAdmin()

    let householdId: string | null = null
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      const { data: { user } } = await admin.auth.getUser(token)
      if (user) {
        const { data: profile } = await admin.from('users').select('household_id').eq('auth_user_id', user.id).single()
        householdId = profile?.household_id ?? null
      }
    }
    if (!householdId) {
      const { data: hh } = await admin.from('households').select('id').limit(1).single()
      householdId = hh?.id ?? null
    }

    const { data: vaultData = [] } = await admin
      .from('vault_credentials')
      .select('*, owner_user:users!vault_credentials_owner_user_id_fkey(id, role, full_name)')
      .eq('is_deleted', false)
      .eq('household_id', householdId)
      .order('created_at')

    const items = (vaultData ?? []).map((v: any) => ({
      id: v.id,
      platformType: v.platform_type,
      bankName: (v.platform_name || '?').charAt(0).toUpperCase(),
      name: `${v.platform_name} (${v.owner_user?.role === 'suami' ? 'Suami' : 'Istri'})`,
      user: v.username_masked || '-',
      owner: v.owner_user?.role || 'bersama',
      secret: (() => {
        try { return Buffer.from(v.secret_encrypted, 'base64').toString('utf-8') }
        catch { return v.secret_encrypted }
      })(),
    }))

    return { items }
  } catch (err: any) {
    console.error('[vault.get] error:', err?.message ?? err)
    throw createError({ statusCode: 500, statusMessage: err?.message ?? 'Internal server error' })
  }
})
