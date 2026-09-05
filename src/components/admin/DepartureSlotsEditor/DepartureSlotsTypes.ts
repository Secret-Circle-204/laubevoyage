import type { DepartureSlotStatus } from '@/domains/experience/types'

export type DepartureSlotsTab =
  | 'upcoming'
  | 'started'
  | 'completed'
  | 'cancelled'
  | 'all'
  | 'corrupted_invariant'

export interface NewSlotFormState {
  date: string
  startTime: string
  priceOverrideEGP: string
  capacityTotal: string
  status: DepartureSlotStatus
}

export interface EditSlotFormState {
  slotId: number
  date: string
  startTime: string
  priceOverrideEGP: string
  capacityTotal: string
  status: DepartureSlotStatus
  version: number
  reserved: number
  sold: number
}
