import { NextRequest, NextResponse } from 'next/server'
import { getDomainServices } from '@/domains/factory'

export async function POST(request: NextRequest) {
  try {
    const services = await getDomainServices()
    const user = await services.customer.authenticateRequest(request.headers)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()

    const departure = body.slotId
      ? await services.experience.resolveBookableDepartureBySlot(Number(body.experienceId), Number(body.slotId))
      : await services.experience.resolveBookableDepartureWithoutSlot(Number(body.experienceId))

    const bookingId = await services.booking.create({
      userId: Number(user.id),
      departure,
      travelers: body.travelers,
      endDate: body.endDate || departure.date,
      pointsToRedeem: body.pointsToRedeem ? Number(body.pointsToRedeem) : undefined,
      currency: body.currency,
      source: 'api',
    })

    const booking = await services.booking.getById(bookingId)
    return NextResponse.json(booking, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating booking:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create booking' },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const services = await getDomainServices()
    const user = await services.customer.authenticateRequest(request.headers)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    const bookings = await services.booking.getUserBookings(Number(user.id), page, limit)
    return NextResponse.json(bookings)
  } catch (error: unknown) {
    console.error('Error fetching bookings:', error)
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const services = await getDomainServices()
    const searchParams = request.nextUrl.searchParams

    const ids: number[] = []
    const idParam = searchParams.get('id')
    if (idParam) {
      const parsed = Number(idParam)
      if (!isNaN(parsed)) ids.push(parsed)
    } else {
      for (const [key, value] of searchParams.entries()) {
        if (key.includes('[id]') && key.includes('[in]')) {
          const parsed = Number(value)
          if (!isNaN(parsed)) ids.push(parsed)
        }
      }
    }

    if (ids.length === 0) {
      try {
        const body = await request.json()
        if (body.ids && Array.isArray(body.ids)) {
          for (const item of body.ids) {
            const parsed = Number(item)
            if (!isNaN(parsed)) ids.push(parsed)
          }
        } else if (body.id) {
          const parsed = Number(body.id)
          if (!isNaN(parsed)) ids.push(parsed)
        }
      } catch {
        // Body reading optional if searchParams present
      }
    }

    if (ids.length === 0) {
      throw new Error('[DELETE /api/bookings] No valid booking IDs provided for deletion.')
    }

    const isHardPurge = searchParams.get('purge') === 'true' || searchParams.get('hard') === 'true'

    const user = await services.customer.authenticateRequest(request.headers)
    const actor = user
      ? { type: 'customer' as const, id: user.id }
      : { type: 'system' as const, id: 'admin' }

    for (const id of ids) {
      if (isHardPurge) {
        await services.booking.delete(id)
      } else {
        await services.booking.cancel(id, 'Cancelled via API DELETE request', actor)
      }
    }

    return NextResponse.json({ success: true, count: ids.length, deletedIds: ids, purged: isHardPurge }, { status: 200 })
  } catch (error: unknown) {
    console.error('Error deleting booking(s):', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete booking(s)' },
      { status: 400 },
    )
  }
}
