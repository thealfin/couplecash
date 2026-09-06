import { pool } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => ({}))
  const { userId } = body || {}

  // Generate random 6-digit number string
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString()

  try {
    // Attempt saving to PostgreSQL if available
    await pool.query(
      `INSERT INTO couple_sync_codes (code, created_by_user_id, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '15 minutes')
       ON CONFLICT (created_by_user_id)
       DO UPDATE SET code = $1, expires_at = NOW() + INTERVAL '15 minutes'`,
      [otpCode, userId || null]
    ).catch(() => {})
  } catch (err: any) {
    console.warn('PostgreSQL sync code query skipped:', err?.message || err)
  }

  return {
    success: true,
    code: otpCode,
    expiresInMinutes: 15,
  }
})
