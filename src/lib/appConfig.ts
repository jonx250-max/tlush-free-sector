function envString(key: string, fallbackKey?: string): string {
  const val = import.meta.env[key]
  if (val) return val
  if (fallbackKey) return import.meta.env[fallbackKey] ?? ''
  return ''
}

export const appConfig = {
  supabaseUrl: envString('VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: envString('VITE_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY'),
  isDemoAuthEnabled: import.meta.env.VITE_DEMO_AUTH === 'true',
  get requiresSupabaseConfiguration(): boolean {
    return !this.supabaseUrl || !this.supabaseAnonKey
  },
} as const
