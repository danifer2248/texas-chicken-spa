import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const isPlaceholder = (value) => !value || /your-project-ref|your-publishable-or-anon-key|replace[-_ ]?me|pending/i.test(value)
const hasValidUrl = (value) => {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.hostname.endsWith('.supabase.co')
  } catch {
    return false
  }
}

const configurationError = isPlaceholder(supabaseUrl)
  ? 'Configura VITE_SUPABASE_URL en .env.local con la URL de tu proyecto Supabase.'
  : !hasValidUrl(supabaseUrl)
    ? 'VITE_SUPABASE_URL no parece una URL válida de Supabase. Revísala en .env.local.'
    : isPlaceholder(supabaseAnonKey)
      ? 'Configura VITE_SUPABASE_ANON_KEY en .env.local con la clave publicable o anon de tu proyecto.'
      : null

export const supabase = !configurationError
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null

export const isSupabaseConfigured = Boolean(supabase)

export function requireSupabase() {
  if (!supabase) {
    throw new Error(configurationError || 'Revisa la configuración de Supabase en .env.local.')
  }
  return supabase
}

