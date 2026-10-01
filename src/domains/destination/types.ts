/**
 * Options interface for Destination queries across Repository, Service, and Loader layers.
 * Prevents parameter explosion and ensures clean enterprise extensibility.
 */
export interface DestinationQueryOptions {
  locale?: string
  currency?: string
  draft?: boolean
  page?: number
  limit?: number
  type?: 'package' | 'daily_tour' | string
  query?: string
  countryId?: number
}
