import { NextRequest, NextResponse } from 'next/server'
import { getDomainServices } from '@/domains/factory'

/**
 * GET /api/destinations/cities
 * Search or list cities with demand-driven server-side search, country filter, and pagination.
 * Transport adapter: validates HTTP inputs and coordinates Destination + Localization services.
 */
export async function GET(request: NextRequest) {
  try {
    const services = await getDomainServices()
    const searchParams = request.nextUrl.searchParams

    const q = searchParams.get('q')?.trim() || undefined

    const rawPage = parseInt(searchParams.get('page') || '1', 10)
    const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1

    const rawLimit = parseInt(searchParams.get('limit') || '20', 10)
    const limit = Number.isFinite(rawLimit) && rawLimit >= 1 ? Math.min(rawLimit, 50) : 20

    const rawCountryId = searchParams.get('countryId') ? Number(searchParams.get('countryId')) : undefined
    const countryId = rawCountryId !== undefined && Number.isFinite(rawCountryId) && rawCountryId > 0 ? rawCountryId : undefined

    const locale = request.cookies.get('laube-locale')?.value || searchParams.get('locale') || undefined

    const results = await services.destination.searchCities({
      countryId,
      query: q,
      page,
      limit,
      locale,
    })

    if (locale && results.docs.length > 0) {
      const rawNames = results.docs.map((d: any) => d.name)
      const ctx = await services.localization.buildContext({ cookieLocale: locale })
      const translatedNames = await services.localization.translateBatch(rawNames, ctx)
      results.docs = results.docs.map((doc: any, idx: number) => ({
        ...doc,
        name: translatedNames[idx] || doc.name,
      }))
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error('[API /api/destinations/cities] Error fetching cities:', error)
    return NextResponse.json({ error: 'Failed to fetch cities' }, { status: 500 })
  }
}
