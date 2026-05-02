/**
 * Client-side runtime config — Zod-validated.
 *
 * Vite replaces `import.meta.env` at build time for the browser bundle.
 * Node runtime (Vercel Functions, Vitest) leaves it as `undefined`, so
 * we guard. Tests can set values via `process.env` and they'll flow
 * through `import.meta.env` because Vite resolves both prefixes.
 */

import { z } from 'zod'

const viteEnv: Record<string, string | boolean | undefined> =
  (typeof import.meta !== 'undefined' && (import.meta as { env?: Record<string, string | boolean | undefined> }).env) || {}

function pickEnv(key: string, fallbackKey?: string): string | undefined {
  const direct = viteEnv[key]
  if (typeof direct === 'string' && direct) return direct
  if (fallbackKey) {
    const fb = viteEnv[fallbackKey]
    if (typeof fb === 'string' && fb) return fb
  }
  return undefined
}

const ClientEnvSchema = z.object({
  supabaseUrl: z.string().url().optional(),
  supabaseAnonKey: z.string().min(20).optional(),
  isDemoAuthEnabled: z.boolean(),
  appRelease: z.string().optional(),
  webVitalsEndpoint: z.string().optional(),
})

export type AppConfig = z.infer<typeof ClientEnvSchema> & {
  readonly requiresSupabaseConfiguration: boolean
}

function buildConfig(): AppConfig {
  const raw = {
    supabaseUrl: pickEnv('VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL'),
    supabaseAnonKey: pickEnv('VITE_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY'),
    isDemoAuthEnabled: viteEnv.VITE_DEMO_AUTH === 'true',
    appRelease: pickEnv('VITE_APP_RELEASE'),
    webVitalsEndpoint: pickEnv('VITE_WEB_VITALS_ENDPOINT'),
  }
  const parsed = ClientEnvSchema.safeParse(raw)
  if (!parsed.success) {
    const issues = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')
    throw new Error(`[appConfig] invalid client env: ${issues}`)
  }
  const value = parsed.data

  // Stage C item C8: refuse to boot if demo auth is enabled in a Vite
  // production build. Vite sets `import.meta.env.PROD = true` only on
  // production builds, so dev + test still work normally.
  const isProdBuild = (viteEnv.PROD === true || viteEnv.PROD === 'true' || viteEnv.MODE === 'production')
  if (value.isDemoAuthEnabled && isProdBuild) {
    throw new Error('[appConfig] VITE_DEMO_AUTH=true is forbidden in production builds')
  }

  return {
    ...value,
    get requiresSupabaseConfiguration(): boolean {
      return !value.supabaseUrl || !value.supabaseAnonKey
    },
  }
}

export const appConfig: AppConfig = buildConfig()
