import { pool } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const clientId = process.env.NUXT_OAUTH_GOOGLE_CLIENT_ID
  const clientSecret = process.env.NUXT_OAUTH_GOOGLE_CLIENT_SECRET

  // If OAuth credentials are fully provided in .env, redirect to Google authorization server
  const query = getQuery(event)
  if (query.code && clientId && clientSecret) {
    try {
      // Token exchange flow
      const tokenRes: any = await $fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        body: {
          code: query.code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: `${getRequestProtocol(event)}://${getRequestHost(event)}/api/auth/google`,
          grant_type: 'authorization_code',
        },
      })

      if (tokenRes.access_token) {
        const googleUser: any = await $fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenRes.access_token}` },
        })

        // Sync user to NocoDB / Postgres
        const payloadUser = {
          google_id: googleUser.sub,
          email: googleUser.email,
          full_name: googleUser.name,
          avatar_url: googleUser.picture,
          role: 'suami',
        }

        if (process.env.NOCODB_URL && process.env.NOCODB_API_TOKEN) {
          await $fetch(`${process.env.NOCODB_URL}/api/v2/tables/${process.env.NOCODB_USERS_TABLE_ID || 'TABLE_USERS_ID'}/records`, {
            method: 'POST',
            headers: { 'xc-token': process.env.NOCODB_API_TOKEN },
            body: payloadUser,
          }).catch(() => {})
        } else {
          await pool.query(
            `INSERT INTO users (full_name, email, role, created_at)
             VALUES ($1, $2, 'suami', NOW())
             ON CONFLICT (email) DO NOTHING`,
            [googleUser.name, googleUser.email]
          ).catch(() => {})
        }

        return sendRedirect(event, '/beranda')
      }
    } catch (err: any) {
      console.error('Google OAuth callback error:', err?.message || err)
    }
  }

  if (clientId && !query.code) {
    const redirectUri = `${getRequestProtocol(event)}://${getRequestHost(event)}/api/auth/google`
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid%20profile%20email`
    return sendRedirect(event, authUrl)
  }

  // Demo fallback mode if Google credentials are not set in .env
  return sendRedirect(event, '/beranda')
})
