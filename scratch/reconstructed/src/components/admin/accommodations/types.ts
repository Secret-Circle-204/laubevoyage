"// ─────────────────────────────────────────────────────────────────────────────
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
  full_board: '
<truncated 2505 bytes>