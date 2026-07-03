import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getDomainServices } from '@/domains'
import { CurrencyCode, ExperienceType } from '@/types'

/**
 * GET /api/destinations/experiences
 * Search or list experiences
 */
export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const services = getDomainServices(payload)

    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')
    const cityId = searchParams.get('cityId')
    const type = searchParams.get('type') as ExperienceType | null
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const locale = searchParams.get('locale') || 'en'
    const currency = (searchParams.get('currency') || 'EGP') as CurrencyCode

    // Search
    if (query) {
      const results = await services.destination.searchExperiences(query, {
        type: type || undefined,
        page,
        limit,
        locale,
        currency,
      })
      return NextResponse.json(results)
    }

    // List by city
    if (cityId) {
      const results = await services.destination.getExperiencesByCity(Number(cityId), {
        type: type || undefined,
        page,
        limit,
        locale,
        currency,
      })
      return NextResponse.json(results)
    }

    // Featured experiences
    const featured = await services.destination.getFeaturedExperiences({
      limit,
      locale,
      currency,
    })

    return NextResponse.json({ docs: featured, total: featured.length })
  } catch (error) {
    console.error('Error fetching experiences:', error)
    return NextResponse.json({ error: 'Failed to fetch experiences' }, { status: 500 })
  }
}
