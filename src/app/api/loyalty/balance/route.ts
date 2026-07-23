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
    const points = await services.customer.getById(userId)

    return NextResponse.json({ points: points.loyalty?.points || 0 })
  } catch (error) {
    console.error('Error fetching loyalty balance:', error)
    return NextResponse.json({ error: 'Failed to fetch loyalty balance' }, { status: 500 })
  }
}
