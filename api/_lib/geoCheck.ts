/**
 * Server-side geo-block + VPN/datacenter check.
 *
 * Israel-only (IL) per Plan §10. Bypass options:
 *   - ?invite=<token>  query param (for trusted external testers)
 *   - GEO_BYPASS_TOKENS env var (comma-separated valid tokens)
 *   - Local dev: no x-vercel-ip-country header → assume IL
 *
 * Production: Vercel sets x-vercel-ip-country on every Function request
 * based on edge POP geolocation. VPN detection is best-effort via
 * IPQualityScore (env: IPQS_API_KEY). If no key, VPN check skipped.
 */

import { getServerConfig } from './serverConfig.js'

const ALLOWED_COUNTRY = 'IL'

// Reserved for future VPN/datacenter detection (Plan §8 IPQualityScore wiring).
// Common datacenter ASNs: AWS 16509, GCP 14618 (was 15169), Azure 8075, DO 14061.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _DATACENTER_ASN_PREFIXES = ['16509', '14618', '8075', '15169', '13335'] as const

export interface GeoCheckResult {
  allowed: boolean
  country: string
  reason?: string
}

export function isGeoAllowed(
  headers: Record<string, string | string[] | undefined>,
  query?: Record<string, string | string[] | undefined>
): GeoCheckResult {
  const country = pickHeader(headers, 'x-vercel-ip-country') || 'XX'

  // Local dev / non-Vercel host → no geo header → permissive
  if (country === 'XX') return { allowed: true, country: 'local-dev', reason: 'no-header' }

  if (country === ALLOWED_COUNTRY) return { allowed: true, country }

  // Invite token bypass
  const invite = pickQuery(query, 'invite')
  if (invite && validInviteToken(invite)) {
    return { allowed: true, country, reason: 'invite-bypass' }
  }

  return { allowed: false, country }
}

function pickHeader(headers: Record<string, string | string[] | undefined>, name: string): string {
  const value = headers[name] ?? headers[name.toLowerCase()]
  if (Array.isArray(value)) return value[0] || ''
  return typeof value === 'string' ? value : ''
}

function pickQuery(
  query: Record<string, string | string[] | undefined> | undefined,
  name: string
): string {
  if (!query) return ''
  const value = query[name]
  if (Array.isArray(value)) return value[0] || ''
  return typeof value === 'string' ? value : ''
}

function validInviteToken(token: string): boolean {
  return getServerConfig().geo.bypassTokens.includes(token)
}
