import { createClient } from '@supabase/supabase-js';

// Helper to safely access environment variables in various environments (Vite/Browser/Test)
const getEnvVar = (key: string): string => {
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      return import.meta.env[key] || '';
    }
  } catch (e) {
    // ignore errors in environments where import.meta is not supported
  }
  return '';
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey && supabaseUrl !== 'https://placeholder.supabase.co');

if (!isSupabaseConfigured) {
  console.warn("Supabase credentials missing! Authentication will not work correctly.");
}

// Use a distinct dummy URL if missing so we can catch it, but don't use a real domain that times out
const validUrl = isSupabaseConfigured ? supabaseUrl : 'https://missing-config.local';
const validKey = isSupabaseConfigured ? supabaseAnonKey : 'missing-key';

export const supabase = createClient(validUrl, validKey);
