import type { DepartureSlotEntity, DepartureSlotStatus } from '../types'

export interface IDatabaseAdapter {
  sessions?: Record<
    string,
    {
      db?: {
        session?: {
          client?: { query(sql: string, params: unknown[]): Promise<{ rowCount: number }> }
        }
      }
    }
  >
  pool?: { query(sql: string, params: unknown[]): Promise<{ rowCount: number }> }
  drizzle?: { execute(sql: string, params: unknown[]): Promise<{ rowCount?: number }> }
}

export interface FindSlotsQueryOptions {
  minDate?: string
  maxDate?: string
  status?: DepartureSlotStatus
  notStatus?: DepartureSlotStatus
  limit?: number
  page?: number
  sort?: string
}

export interface PaginatedDepartureSlotsResult {
  docs: DepartureSlotEntity[]
  totalDocs: number
  limit: number
  totalPages: number
  page: number
  hasPrevPage: boolean
  hasNextPage: boolean
}
