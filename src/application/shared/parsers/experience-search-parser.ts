export interface ParsedExperienceSearchParams {
  query?: string
  type?: 'package' | 'daily_tour'
  minPrice?: number
  maxPrice?: number
  rating?: number
  duration?: number
  page?: number
}

export class ExperienceSearchParser {
  static parse(searchParams: { [key: string]: string | string[] | undefined }): ParsedExperienceSearchParams {
    const q = typeof searchParams.q === 'string' ? searchParams.q.trim() : undefined
    const typeRaw = typeof searchParams.type === 'string' ? searchParams.type : undefined
    const type = typeRaw === 'package' || typeRaw === 'daily_tour' ? typeRaw : undefined
    const minPrice = typeof searchParams.minPrice === 'string' ? parseInt(searchParams.minPrice, 10) : undefined
    const maxPrice = typeof searchParams.maxPrice === 'string' ? parseInt(searchParams.maxPrice, 10) : undefined
    const rating = typeof searchParams.rating === 'string' ? parseFloat(searchParams.rating) : undefined
    const duration = typeof searchParams.duration === 'string' ? parseInt(searchParams.duration, 10) : undefined
    const page = typeof searchParams.page === 'string' ? Math.max(1, parseInt(searchParams.page, 10)) : 1

    return {
      query: q,
      type,
      minPrice: !isNaN(minPrice!) ? minPrice : undefined,
      maxPrice: !isNaN(maxPrice!) ? maxPrice : undefined,
      rating: !isNaN(rating!) ? rating : undefined,
      duration: !isNaN(duration!) ? duration : undefined,
      page,
    }
  }
}
