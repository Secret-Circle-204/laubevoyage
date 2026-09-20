// ─────────────────────────────────────────────────────────────────────────────
// Accommodation Admin Editor — Domain & UI Type Contracts
// ─────────────────────────────────────────────────────────────────────────────

export interface CatalogAccommodation {
  id: number
  name: string
  slug?: string
  type?: string
  rating?: number
  city?: number | { id: number; name?: string }
}

export type OccupancyType = 'single' | 'double' | 'triple' | 'quad'
export type BoardBasis = 'bed_and_breakfast' | 'half_board' | 'full_board' | 'all_inclusive'
export type PricingUnit = 'per_stay' | 'per_night'

export interface RoomRateItem {
  id?: string
  occupancy: OccupancyType
  rateEGP: number
  enabled: boolean
}

export interface AccommodationOptionItem {
  id?: string
  property: number | { id: number | string; name?: string; type?: string; rating?: number }
  roomCategory?: string
  boardBasis?: BoardBasis
  pricingUnit: PricingUnit
  isDefault?: boolean
  roomRates: RoomRateItem[]
}

export interface AccommodationStayItem {
  id?: string
  order: number
  nights: number
  options: AccommodationOptionItem[]
  // Transitional fields for unmigrated flat records
  property?: any
  roomCategory?: string
  boardBasis?: any
  pricingUnit?: any
  roomRates?: any
}

export const DEFAULT_ROOM_RATES: RoomRateItem[] = [
  { occupancy: 'single', rateEGP: 0, enabled: true },
  { occupancy: 'double', rateEGP: 0, enabled: true },
  { occupancy: 'triple', rateEGP: 0, enabled: false },
  { occupancy: 'quad', rateEGP: 0, enabled: false },
]

export const BOARD_BASIS_LABELS: Record<BoardBasis, string> = {
  bed_and_breakfast: 'Bed & Breakfast (BB)',
  half_board: 'Half Board (HB)',
  full_board: 'Full Board (FB)',
  all_inclusive: 'All Inclusive (AI)',
}

export const PRICING_UNIT_LABELS: Record<PricingUnit, string> = {
  per_stay: 'Per Stay (Fixed room rate)',
  per_night: 'Per Night (Multiplied by nights)',
}

export const OCCUPANCY_LABELS: Record<OccupancyType, { label: string; guests: number }> = {
  single: { label: 'Single Occupancy', guests: 1 },
  double: { label: 'Double Occupancy', guests: 2 },
  triple: { label: 'Triple Occupancy', guests: 3 },
  quad: { label: 'Quad Occupancy', guests: 4 },
}

// ─────────────────────────────────────────────────────────────────────────────
// Pure Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function getPropertyId(prop: AccommodationOptionItem['property']): number {
  if (!prop) return 0
  if (typeof prop === 'object' && prop !== null && 'id' in prop) {
    return Number(prop.id)
  }
  return Number(prop)
}

export function resolvePropertyName(
  prop: AccommodationOptionItem['property'],
  catalog: CatalogAccommodation[],
): string {
  if (!prop) return 'Select Property'
  if (typeof prop === 'object' && prop !== null && 'name' in prop && prop.name) {
    return prop.name
  }
  const id = getPropertyId(prop)
  const found = catalog.find((c) => c.id === id)
  if (found) return found.name
  return `Hotel #${id}`
}

/**
 * Clones or standardizes room rate tiers across single, double, triple, quad.
 * Preserves authentic Payload IDs when present, but never generates synthetic prefix IDs.
 */
export function cloneRates(rates?: RoomRateItem[]): RoomRateItem[] {
  if (!Array.isArray(rates) || rates.length === 0) {
    return JSON.parse(JSON.stringify(DEFAULT_ROOM_RATES))
  }
  const occupancies: OccupancyType[] = ['single', 'double', 'triple', 'quad']
  return occupancies.map((occ) => {
    const existing = rates.find((r) => r.occupancy === occ)
    if (existing) {
      return {
        id: existing.id,
        occupancy: occ,
        rateEGP: Number(existing.rateEGP) || 0,
        enabled: existing.enabled !== false,
      }
    }
    return { occupancy: occ, rateEGP: 0, enabled: false }
  })
}
