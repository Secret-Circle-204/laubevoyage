import { NextRequest, NextResponse } from 'next/server'
import { getDomainServices } from '@/domains/factory'
import { getPayload } from 'payload'
import config from '@payload-config'

async function getAuthenticatedUser(request: NextRequest) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: request.headers })
  if (user) return user

  const authHeader = request.headers.get('authorization')
  const userIdStr = request.headers.get('x-user-id')
  if (authHeader && userIdStr) {
    const userId = Number(userIdStr)
    if (!isNaN(userId)) return { id: userId }
  }

  return null
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const services = await getDomainServices()
    const body = await request.json()

    const bookingId = await services.booking.create({
      userId: Number(user.id),
      experienceId: Number(body.experienceId),
      travelers: body.travelers,
      startDate: body.startDate,
      endDate: body.endDate,
      pointsToRedeem: body.pointsToRedeem ? Number(body.pointsToRedeem) : undefined,
      currency: body.currency,
    })

    const booking = await services.booking.getById(bookingId)
    return NextResponse.json(booking, { status: 201 })
  } catch (error) {
    console.error('Error creating booking:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create booking' },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const services = await getDomainServices()
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    const bookings = await services.booking.getUserBookings(Number(user.id), page, limit)
    return NextResponse.json(bookings)
  } catch (error) {
    console.error('Error fetching bookings:', error)
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
  }
}
