import { NextRequest, NextResponse } from 'next/server'
import { getDomainServices } from '@/domains/factory'
import type { ExperienceType } from '@/domains/experience/types'

/**
 * GET /api/destinations/experiences
 * Search or list experiences with server-side pagination via Experience Domain SSOT.
 */
export async function GET(request: NextRequest) {
  try {
    const services = await getDomainServices()

    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q') || undefined
    const cityId = searchParams.get('cityId') ? Number(searchParams.get('cityId')) : undefined
    const type = (searchParams.get('type') as ExperienceType) || undefined
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    const results = await services.experience.search({
      keyword: query,
      cityId,
      type,
      page,
      limit,
      sort: '-createdAt',
    })

    return NextResponse.json(results)
  } catch (error) {
    console.error('[API /api/destinations/experiences] Error fetching experiences:', error)
    return NextResponse.json({ error: 'Failed to fetch experiences' }, { status: 500 })
  }
}

