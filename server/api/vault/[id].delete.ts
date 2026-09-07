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

    const { data: existingItem } = await admin
      .from('vault_credentials')
      .select('id, platform_name, household_id')
      .eq('id', id)
      .eq('household_id', dbUser.household_id)
      .eq('is_deleted', false)
      .single()

    if (!existingItem) {
      throw createError({ statusCode: 404, statusMessage: 'Item brankas tidak ditemukan' })
    }

    // Soft delete: is_deleted = true
    const { error: deleteError } = await admin
      .from('vault_credentials')
      .update({
        is_deleted: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingItem.id)

    if (deleteError) {
      console.error('[vault.delete] error:', deleteError)
      throw createError({ statusCode: 500, statusMessage: 'Gagal menghapus kredensial dari brankas' })
    }

    await logSecurityAudit({
      householdId: dbUser.household_id,
      userId: dbUser.id,
      entityType: 'vault',
      entityId: existingItem.id,
      action: 'VAULT_DELETED',
      metadata: {
        platformName: existingItem.platform_name,
      },
    })

    return {
      success: true,
      message: 'Kredensial berhasil dihapus dari brankas',
    }
  } catch (err: any) {
    if (err?.statusCode) throw err
    console.error('[vault.delete] error:', err?.message || err)
    throw createError({ statusCode: 500, statusMessage: err?.message || 'Gagal menghapus kredensial' })
  }
})
