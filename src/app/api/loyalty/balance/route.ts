import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getDomainServices } from '@/domains'

/**
 * GET /api/loyalty/balance
 * Get user loyalty points balance
 */
export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const services = getDomainServices(payload)

    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const balance = await services.loyalty.getBalance(userId)
    const user = await services.user.getProfile(userId)

    return NextResponse.json({
      balance,
      tier: user.loyalty?.tier,
      totalSpent: user.loyalty?.totalSpent,
    })
  } catch (error) {
    console.error('Error fetching loyalty balance:', error)
    return NextResponse.json({ error: 'Failed to fetch loyalty balance' }, { status: 500 })
  }
}
