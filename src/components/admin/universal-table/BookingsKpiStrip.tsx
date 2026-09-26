import React from 'react'
import type { Payload } from 'payload'
import { UniversalKpiStrip } from './UniversalKpiStrip'

export interface BookingsKpiStripServerProps {
  payload?: Payload
  user?: any
  collectionConfig?: {
    slug?: string
    [key: string]: any
  }
  collectionSlug?: string
  overrideAccess?: boolean
  [key: string]: any
}

/**
 * Server Component: Authoritative Booking Collection KPI Metrics.
 * Delegates to the universal, declarative UniversalKpiStrip with collectionSlug="bookings".
 */
export async function BookingsKpiStrip(props: BookingsKpiStripServerProps) {
  return UniversalKpiStrip({ ...props, collectionSlug: 'bookings' })
}

/**
 * @deprecated Use UniversalKpiStrip directly with collectionSlug="experiences".
 * Preserved for backward compatibility with existing component imports.
 */
export async function ExperiencesKpiStrip(props: BookingsKpiStripServerProps) {
  return UniversalKpiStrip({ ...props, collectionSlug: 'experiences' })
}
