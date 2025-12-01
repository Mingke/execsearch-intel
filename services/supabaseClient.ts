import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey)

if (!isSupabaseConfigured) {
  console.warn("Supabase credentials missing! Authentication will not work correctly.")
}

// Singleton pattern to prevent multiple client instances
let supabaseInstance: SupabaseClient | null = null

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) {
    return null
  }

  if (!supabaseInstance) {
    supabaseInstance = createBrowserClient(supabaseUrl!, supabaseAnonKey!)
  }

  return supabaseInstance
}

// For backward compatibility - exports a client or null
export const supabase = isSupabaseConfigured ? createBrowserClient(supabaseUrl!, supabaseAnonKey!) : null
