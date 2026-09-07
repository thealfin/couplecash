import { createClient } from '@supabase/supabase-js'

export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || 'https://fjgiolmwwpgxesbikjnp.supabase.co'
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqZ2lvbG13d3BneGVzYmlram5wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODE0NzA0NCwiZXhwIjoyMTAzNzIzMDQ0fQ.ePKqWgCO6IMgv4mZn7MFeBswa4c8yajy2QxL0fc5Dpw'
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

export async function getUserFromToken(authHeader: string | undefined) {
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }
  const token = authHeader.split(' ')[1]
  if (!token || token === 'null' || token === 'undefined') {
    return null
  }
  const admin = getSupabaseAdmin()
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data?.user) {
    if (error) {
      console.warn('[getUserFromToken] getUser error:', error.message)
    }
    return null
  }
  return data.user
}

export function fmtRp(n: number): string {
  const num = Number(n) || 0
  if (num < 0) {
    return '-Rp ' + Math.abs(num).toLocaleString('id-ID')
  }
  return 'Rp ' + num.toLocaleString('id-ID')
}

export function getMonthRange(monthOffset = 0) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + monthOffset
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 1)
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  }
}
