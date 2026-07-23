import { NextRequest, NextResponse } from 'next/server'
import { getDomainServices } from '@/domains/factory'

/**
 * POST /api/bookings
 * Create new booking
 */
export async function POST(request: NextRequest) {
  try {
    const services = await getDomainServices()

    const userIdStr = request.headers.get('x-user-id')
    if (!userIdStr) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userId = Number(userIdStr)
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 })
    }

    const body = await request.json()

    const bookingId = await services.booking.create({
      userId,
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

/**
 * GET /api/bookings
 * Get user bookings
 */
export async function GET(request: NextRequest) {
  try {
    const services = await getDomainServices()

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
    const limit = parseInt(searchParams.get('limit') || '10')

    const bookings = await services.booking.getUserBookings(userId, page, limit)

    return NextResponse.json(bookings)
  } catch (error) {
    console.error('Error fetching bookings:', error)
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
  }
}
