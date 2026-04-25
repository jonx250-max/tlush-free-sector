// Lookup engine for extension orders (צווי הרחבה).
// STUB for P4: empty registry. P7 wires to data/laws/extension_orders/*.json
// scraped from gov.il.
//
// Extension orders: government-issued binding extensions of collective
// agreements to entire sectors. Critical for non-unionized employees.

export interface ExtensionOrder {
  id: string
  name: string
  sector: string
  effectiveFrom: string // ISO
  effectiveUntil: string | null
  scope: string
  bindingTerms: string[] // free-text descriptions of binding obligations
}

export interface OrderLookupResult {
  applicable: ExtensionOrder[]
  reason: string
}

export function findApplicableOrders(
  sector: string | null,
  asOfDate: string = new Date().toISOString().slice(0, 10),
  registry: ExtensionOrder[] = []
): OrderLookupResult {
  if (!sector) {
    return { applicable: [], reason: 'ענף לא צוין — אין חיפוש' }
  }
  if (registry.length === 0) {
    return { applicable: [], reason: 'מאגר צווי הרחבה עדיין ריק (P7 — auto-update pipeline)' }
  }

  const target = sector.toLowerCase()
  const applicable = registry.filter(o => {
    if (o.sector.toLowerCase() !== target) return false
    if (o.effectiveFrom > asOfDate) return false
    if (o.effectiveUntil && o.effectiveUntil < asOfDate) return false
    return true
  })

  return {
    applicable,
    reason: applicable.length > 0
      ? `${applicable.length} צווי הרחבה תואמים`
      : 'לא נמצאו צווי הרחבה לענף זה',
  }
}
