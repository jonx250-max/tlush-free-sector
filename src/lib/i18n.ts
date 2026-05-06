/**
 * Stage H9 — lightweight i18n helper.
 *
 * Wraps the existing flat `he` translation object (`src/i18n/he.ts`) so
 * we can add ICU-flavored interpolation + gender markers without
 * pulling in a full library. Direct `he.foo.bar` access still works
 * for migrated-and-legacy callers.
 *
 * Features:
 *   - `t('section.key', vars?, gender?)` — dotted-path lookup
 *   - `{name}` placeholders interpolated from `vars`
 *   - `{{masculine|feminine}}` resolved via `gender` (see lib/gender.ts)
 *   - `count` plural rule (Hebrew has 4 categories per CLDR; we ship a
 *     conservative one/other approximation; stub for full plurals.
 *
 * When/if we add a proper @formatjs/intl, the public surface stays.
 */

import { he as messages } from '../i18n/he'
import { genderedTemplate, type Gender } from './gender'

type Messages = typeof messages

function lookup(path: string): string | undefined {
  const parts = path.split('.')
  let cur: unknown = messages as Record<string, unknown>
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p]
    } else {
      return undefined
    }
  }
  return typeof cur === 'string' ? cur : undefined
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (m, name) => {
    const v = vars[name]
    return v === undefined ? m : String(v)
  })
}

export interface TOptions {
  vars?: Record<string, string | number>
  gender?: Gender
  /** Fallback to render if key is missing. Defaults to the path itself. */
  fallback?: string
}

export function t(path: string, options: TOptions = {}): string {
  const raw = lookup(path) ?? options.fallback ?? path
  const interpolated = interpolate(raw, options.vars)
  return genderedTemplate(interpolated, options.gender)
}

/** Re-export the flat object for legacy callers. */
export { messages }

/** Hebrew plural rule, simplified (one / other). */
export function plural(count: number, one: string, other: string): string {
  return count === 1 ? one : other
}

/** Type-safe access for migrated callsites. */
export type MessagesShape = Messages
