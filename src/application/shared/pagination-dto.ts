export interface PaginationDTO {
  page: number
  limit: number
  totalPages: number
  totalItems: number
  hasNextPage: boolean
  hasPrevPage: boolean
}
