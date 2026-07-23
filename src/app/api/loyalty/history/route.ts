import { NextRequest, NextResponse } from 'next/server'
import { getDomainServices } from '@/domains/factory'

export async function GET(request: NextRequest) {
  try {
    const services = await getDomainServices()

    const userIdStr = request.headers.get('x-user-id')
    if (!userIdStr) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userId = Number(userIdStr)
    const portal = await services.dashboard.getPortalOverview(userId)

    return NextResponse.json({ history: [] })
  } catch (error) {
    console.error('Error fetching loyalty history:', error)
    return NextResponse.json({ error: 'Failed to fetch loyalty history' }, { status: 500 })
  }
}
