/**
 * Stage F7 — feature flag abstraction.
 *
 * Today flags are read from `import.meta.env.VITE_FF_*`. Flag values
 * are `'on'` / `'off'`; anything else is treated as default-off.
 *
 * When Vercel Edge Config wiring lands (operator step), `getFlag`
 * delegates to a fetched JSON instead of build-time vars without
 * changing any call site.
 */

const viteEnv: Record<string, string | undefined> =
  (typeof import.meta !== 'undefined' && (import.meta as { env?: Record<string, string | undefined> }).env) || {}

export type FeatureFlagName =
  | 'pgsodiumPiiEncryption'
  | 'discrepancyViewerV2'
  | 'rollingReleases'
  | 'mfaProgressiveProfiling'

const DEFAULTS: Record<FeatureFlagName, boolean> = {
  pgsodiumPiiEncryption: false,
  discrepancyViewerV2: false,
  rollingReleases: false,
  mfaProgressiveProfiling: false,
}

function envKey(name: FeatureFlagName): string {
  return `VITE_FF_${name.replace(/[A-Z]/g, c => `_${c}`).toUpperCase()}`
}

export function getFlag(name: FeatureFlagName): boolean {
  const v = viteEnv[envKey(name)]
  if (v === 'on' || v === 'true' || v === '1') return true
  if (v === 'off' || v === 'false' || v === '0') return false
  return DEFAULTS[name]
}

export function describeFlag(name: FeatureFlagName): { name: FeatureFlagName; envKey: string; enabled: boolean } {
  return { name, envKey: envKey(name), enabled: getFlag(name) }
}
