import type { CollectionPresentationConfig } from './types'
import { experiencesPresentation } from './configs/experiences'
import { bookingsPresentation } from './configs/bookings'

const PRESENTATION_REGISTRY: Record<string, CollectionPresentationConfig> = {
  experiences: experiencesPresentation,
  bookings: bookingsPresentation,
}

export function registerPresentationConfig(config: CollectionPresentationConfig): void {
  if (config && config.collectionSlug) {
    PRESENTATION_REGISTRY[config.collectionSlug] = config
  }
}

export function getPresentationConfig(collectionSlug: string): CollectionPresentationConfig | undefined {
  return PRESENTATION_REGISTRY[collectionSlug]
}

export type PeekSlotComponent = React.FC<{
  doc: any
  onActionSuccess?: () => Promise<void> | void
  onManageSlots?: (docId: string | number) => void
}>

const PEEK_SLOT_REGISTRY: Record<string, PeekSlotComponent> = {}

export function registerPeekSlot(slotId: string, component: PeekSlotComponent): void {
  PEEK_SLOT_REGISTRY[slotId] = component
}

export function getPeekSlot(slotId: string): PeekSlotComponent | undefined {
  return PEEK_SLOT_REGISTRY[slotId]
}
