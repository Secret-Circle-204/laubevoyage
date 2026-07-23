import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getDomainServices } from '@/domains'

/**
 * GET /api/loyalty/history
 * Get user loyalty points transaction history
 */
export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const services = getDomainServices(payload)

    const userIdStr = request.headers.get('x-user-id')
    if (!userIdStr) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userId = Number(userIdStr)
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 })
    }

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const history = await services.loyalty.getHistory(userId)

    return NextResponse.json({ data: history })

  } catch (error) {
    console.error('Error fetching loyalty history:', error)
    return NextResponse.json({ error: 'Failed to fetch loyalty history' }, { status: 500 })
  }
}
