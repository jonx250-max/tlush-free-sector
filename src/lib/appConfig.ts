// Vite replaces `import.meta.env` at build time for the browser bundle.
// Node runtime (Vercel Functions) leaves it as `undefined`, so we guard.
const viteEnv: Record<string, string | undefined> =
  (typeof import.meta !== 'undefined' && (import.meta as { env?: Record<string, string | undefined> }).env) || {}

function envString(key: string, fallbackKey?: string): string {
  const val = viteEnv[key]
  if (val) return val
  if (fallbackKey) return viteEnv[fallbackKey] ?? ''
  return ''
}

export const appConfig = {
  supabaseUrl: envString('VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: envString('VITE_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY'),
  isDemoAuthEnabled: viteEnv.VITE_DEMO_AUTH === 'true',
  get requiresSupabaseConfiguration(): boolean {
    return !this.supabaseUrl || !this.supabaseAnonKey
  },
} as const
