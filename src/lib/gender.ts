/**
 * Stage H10 — Hebrew gendered grammar helper.
 *
 * Hebrew verbs + adjectives inflect for gender. Many of our existing
 * strings use the awkward `מצא/ה` pattern; this util makes the choice
 * deterministic from `profile.gender` without sprinkling slashes.
 *
 * Usage:
 *   t.signed = byGender(profile.gender, 'מאשר', 'מאשרת')
 *
 * Returns the masculine form by default when gender is unknown — both
 * sexually-neutral and consistent with Israeli legal Hebrew defaults.
 */

export type Gender = 'male' | 'female' | undefined | null

export function byGender(
  gender: Gender,
  masculine: string,
  feminine: string,
): string {
  return gender === 'female' ? feminine : masculine
}

/**
 * Build a gender-aware string from a template that uses `{{m|f}}` markers.
 *
 *   genderedTemplate('שלום {{אדוני|גברתי}}', 'female')  → 'שלום גברתי'
 */
export function genderedTemplate(template: string, gender: Gender): string {
  return template.replace(/\{\{([^|}]*)\|([^}]*)\}\}/g, (_, m, f) =>
    gender === 'female' ? f : m,
  )
}
