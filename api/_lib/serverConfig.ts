/**
 * Server-side runtime config — single Zod-validated source of truth.
 *
 * Replaces scattered `process.env.*` reads in Vercel Function handlers.
 * Re-parses on every call so test code that mutates process.env (e.g.
 * geoCheck.test.ts) keeps working without manual cache invalidation.
 *
 * Two helpers narrow optional creds to required ones — handlers that
 * need admin keys throw a typed `ConfigMissingError` if they aren't
 * set, which the handler can catch and translate to a 500 response.
 */

import { z } from 'zod'

const ServerEnvSchema = z.object({
  // URLs and keys are length-checked but not URL-format-validated. Format
  // rejection at parse time would throw before handlers can return their
  // own CONFIG_MISSING shape. Field-existence checks below carry the load.
  SUPABASE_URL: z.string().min(8).optional(),
  SUPABASE_ANON_KEY: z.string().min(20).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),
  VITE_SUPABASE_URL: z.string().min(8).optional(),
  VITE_SUPABASE_ANON_KEY: z.string().min(20).optional(),

  GOOGLE_VISION_API_KEY: z.string().min(20).optional(),
  ANTHROPIC_API_KEY: z.string().min(20).optional(),
  OCR_DAILY_LIMIT: z.coerce.number().int().positive().default(20),
  OCR_MOCK_MODE: z.string().optional(),

  GEO_BYPASS_TOKENS: z.string().default(''),
  FREE_TIER_HASH_PEPPER: z.string().min(1).default('tlush.beta.v1'),

  VERCEL_ENV: z.enum(['development', 'preview', 'production']).optional(),
})

export interface ServerConfig {
  supabase: {
    url: string | undefined
    anonKey: string | undefined
    serviceRoleKey: string | undefined
  }
  ocr: {
    visionKey: string | undefined
    claudeKey: string | undefined
    dailyLimit: number
    mockMode: boolean
    isConfigured: boolean
  }
  geo: { bypassTokens: string[] }
  freeTierPepper: string
  vercelEnv: 'development' | 'preview' | 'production' | undefined
  isProduction: boolean
}

export class ConfigMissingError extends Error {
  constructor(public code: string, message: string) {
    super(message)
    this.name = 'ConfigMissingError'
  }
}

export function getServerConfig(): ServerConfig {
  const parsed = ServerEnvSchema.safeParse(process.env)
  if (!parsed.success) {
    const issues = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')
    throw new ConfigMissingError('CONFIG_INVALID', `Invalid server env: ${issues}`)
  }
  const e = parsed.data
  return {
    supabase: {
      url: e.SUPABASE_URL ?? e.VITE_SUPABASE_URL,
      anonKey: e.SUPABASE_ANON_KEY ?? e.VITE_SUPABASE_ANON_KEY,
      serviceRoleKey: e.SUPABASE_SERVICE_ROLE_KEY,
    },
    ocr: {
      visionKey: e.GOOGLE_VISION_API_KEY,
      claudeKey: e.ANTHROPIC_API_KEY,
      dailyLimit: e.OCR_DAILY_LIMIT,
      mockMode: e.OCR_MOCK_MODE === 'true',
      isConfigured: Boolean(e.GOOGLE_VISION_API_KEY && e.ANTHROPIC_API_KEY),
    },
    geo: {
      bypassTokens: e.GEO_BYPASS_TOKENS.split(',').map(t => t.trim()).filter(Boolean),
    },
    freeTierPepper: e.FREE_TIER_HASH_PEPPER,
    vercelEnv: e.VERCEL_ENV,
    isProduction: e.VERCEL_ENV === 'production',
  }
}

export interface SupabaseUserCreds {
  url: string
  anonKey: string
}

export interface SupabaseAdminCreds extends SupabaseUserCreds {
  serviceRoleKey: string
}

export function assertSupabaseUserCreds(): SupabaseUserCreds {
  const c = getServerConfig().supabase
  if (!c.url || !c.anonKey) {
    throw new ConfigMissingError('CONFIG_MISSING_SUPABASE_USER', 'Supabase user credentials not configured')
  }
  return { url: c.url, anonKey: c.anonKey }
}

export function assertSupabaseAdminCreds(): SupabaseAdminCreds {
  const c = getServerConfig().supabase
  if (!c.url || !c.anonKey || !c.serviceRoleKey) {
    throw new ConfigMissingError('CONFIG_MISSING_SUPABASE_ADMIN', 'Supabase admin credentials not configured')
  }
  return { url: c.url, anonKey: c.anonKey, serviceRoleKey: c.serviceRoleKey }
}
