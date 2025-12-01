import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"

function getSupabaseUrl(): string | undefined {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return process.env.NEXT_PUBLIC_SUPABASE_URL
  }

  // Try to derive from POSTGRES_URL
  // Format: postgres://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
  const postgresUrl = process.env.POSTGRES_URL
  if (postgresUrl) {
    const match = postgresUrl.match(/postgres\.([a-z0-9]+):/)
    if (match && match[1]) {
      return `https://${match[1]}.supabase.co`
    }
  }

  return undefined
}

const supabaseUrl = getSupabaseUrl()
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey)

if (!isSupabaseConfigured) {
  console.warn("Supabase credentials missing! Authentication will not work correctly.")
  console.warn("Supabase URL:", supabaseUrl ? "Found" : "Missing")
  console.warn("Supabase Anon Key:", supabaseAnonKey ? "Found" : "Missing")
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
