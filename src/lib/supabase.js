import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let client = null

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseAnonKey)
}

export function getSupabase() {
  if (!isSupabaseConfigured()) {
    return null
  }

  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey)
  }

  return client
}
