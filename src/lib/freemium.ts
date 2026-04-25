// Client-side freemium UX helpers + email/device fingerprint hashing.
// Server-side enforcement lives in api/analyses/create.ts via
// free_tier_usage table atomic INSERT (RLS service-role-only).

/**
 * Normalize email for fingerprint dedup:
 *   - lowercase
 *   - strip Gmail dots (jane.doe@gmail.com == janedoe@gmail.com)
 *   - strip + tags (user+tag@x.com == user@x.com)
 */
export function normalizeEmail(email: string): string {
  const lower = email.trim().toLowerCase()
  const [local, domain] = lower.split('@')
  if (!domain) return lower
  let normLocal = local.split('+')[0]
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    normLocal = normLocal.replaceAll('.', '')
  }
  return `${normLocal}@${domain === 'googlemail.com' ? 'gmail.com' : domain}`
}

export async function hashEmail(email: string): Promise<string> {
  const normalized = normalizeEmail(email)
  const bytes = new TextEncoder().encode(normalized)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return bytesToHex(new Uint8Array(digest))
}

/**
 * Canvas fingerprint for soft device dedup. Captures:
 *   user-agent + screen res + timezone + language + canvas-rendered text glyphs
 * NOT a PII tracker (no IP, no GPS). Used only for free-tier abuse prevention.
 */
export async function computeDeviceFingerprint(): Promise<string> {
  if (typeof window === 'undefined') return 'ssr'

  const components: string[] = [
    navigator.userAgent,
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.language,
    canvasGlyphHash(),
  ]

  const bytes = new TextEncoder().encode(components.join('|'))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return bytesToHex(new Uint8Array(digest))
}

function canvasGlyphHash(): string {
  try {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return 'no-canvas'
    canvas.width = 240
    canvas.height = 40
    ctx.textBaseline = 'top'
    ctx.font = '14px Heebo, Arial'
    ctx.fillText('בדיקה ABC abc 123', 2, 2)
    return canvas.toDataURL().slice(-128)
  } catch {
    return 'canvas-error'
  }
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

export interface FreeTierStatus {
  used: boolean
  reason?: 'user' | 'device' | 'email'
}

/**
 * Client-side advisory check. Server is the source of truth; this is for
 * UX hint only ("you've already used your free check"). Never trust client.
 */
export function readLocalFreeTierFlag(): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem('talush_free_used') === '1'
}

export function markLocalFreeTierUsed(): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem('talush_free_used', '1')
}
