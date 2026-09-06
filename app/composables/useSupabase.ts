import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let supabaseInstance: SupabaseClient | null = null

const SUPABASE_URL = 'https://fjgiolmwwpgxesbikjnp.supabase.co'
const SUPABASE_PUBLISHABLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqZ2lvbG13d3BneGVzYmlram5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxNDcwNDQsImV4cCI6MjEwMzcyMzA0NH0.KApKxceeRlieNWu0-NKcllpsZDWqYVDKnr_Il03h7GE'

export function useSupabase() {
  if (!supabaseInstance) {
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }

  return supabaseInstance
}
