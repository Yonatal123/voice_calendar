import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()
const anon = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim()

function authStorageKey(): string | null {
  if (!url) return null
  try {
    const ref = new URL(url).hostname.split('.')[0]
    return `sb-${ref}-auth-token`
  } catch {
    return null
  }
}

/** Session from localStorage — instant, no network (used while SDK refresh is in flight). */
export function readCachedAuthSession(): Session | null {
  const key = authStorageKey()
  if (!key) return null
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const session = JSON.parse(raw) as Session
    if (session?.access_token && session?.refresh_token && session?.expires_at) {
      return session
    }
    return null
  } catch {
    return null
  }
}

export function isRemoteConfigured(): boolean {
  return Boolean(url && anon)
}

let client: SupabaseClient | null = null

/** Single client; throws if env vars are missing. */
export function getSupabase(): SupabaseClient {
  if (!url || !anon) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
  }
  if (!client) {
    client = createClient(url, anon, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }
  return client
}
