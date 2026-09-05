export interface ParsedExperienceSearchParams {
  query?: string
  countryId?: number
  cityId?: number
  type?: 'package' | 'daily_tour'
  date?: string
  minPrice?: number
  maxPrice?: number
  rating?: number
  duration?: number
  page?: number
}

export class ExperienceSearchParser {
  static parse(searchParams: { [key: string]: string | string[] | undefined }): ParsedExperienceSearchParams {
    const q = typeof searchParams.q === 'string' ? searchParams.q.trim() : undefined
    const countryIdRaw = typeof searchParams.countryId === 'string' ? parseInt(searchParams.countryId, 10) : undefined
    const countryId = !isNaN(countryIdRaw!) ? countryIdRaw : undefined
    const cityIdRaw = typeof searchParams.cityId === 'string' ? parseInt(searchParams.cityId, 10) : undefined
    const cityId = !isNaN(cityIdRaw!) ? cityIdRaw : undefined
    const typeRaw = typeof searchParams.type === 'string' ? searchParams.type : undefined
    const type = typeRaw === 'package' || typeRaw === 'daily_tour' ? typeRaw : undefined
    const dateRaw = typeof searchParams.date === 'string' ? searchParams.date.trim() : (typeof searchParams.departureDate === 'string' ? searchParams.departureDate.trim() : undefined)
    const date = dateRaw && /^\d{4}-\d{2}-\d{2}$/.test(dateRaw) ? dateRaw : undefined
    const minPrice = typeof searchParams.minPrice === 'string' ? parseInt(searchParams.minPrice, 10) : undefined
    const maxPrice = typeof searchParams.maxPrice === 'string' ? parseInt(searchParams.maxPrice, 10) : undefined
    const rating = typeof searchParams.rating === 'string' ? parseFloat(searchParams.rating) : undefined
    const duration = typeof searchParams.duration === 'string' ? parseInt(searchParams.duration, 10) : undefined
    const page = typeof searchParams.page === 'string' ? Math.max(1, parseInt(searchParams.page, 10)) : 1

    return {
      query: q,
      countryId,
      cityId,
      type,
      date,
      minPrice: !isNaN(minPrice!) ? minPrice : undefined,
      maxPrice: !isNaN(maxPrice!) ? maxPrice : undefined,
      rating: !isNaN(rating!) ? rating : undefined,
      duration: !isNaN(duration!) ? duration : undefined,
      page,
    }
  }
}


