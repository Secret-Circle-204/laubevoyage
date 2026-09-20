import { NextRequest, NextResponse } from 'next/server'
import { getDomainServices } from '@/domains/factory'
import { getApplicationServices } from '@/application/factory'

export async function POST(request: NextRequest) {
  try {
    const services = await getApplicationServices()
    const user = await services.customer.authenticateRequest(request.headers)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()

    let slotId: number | undefined = body.slotId ? Number(body.slotId) : undefined
    if (!slotId) {
      if (!body.date || !body.startTime) {
        return NextResponse.json(
          { error: 'Departure slotId (or explicit date and startTime) is required to create a booking.' },
          { status: 400 },
        )
      }
      const concreteSlot = await services.experience.getOrCreateDailyDeparture(
        Number(body.experienceId),
        body.date,
        body.startTime,
      )
      slotId = concreteSlot.id
    }

    if (!slotId) {
      return NextResponse.json({ error: 'Failed to resolve departure slot.' }, { status: 400 })
    }

    const departure = await services.experience.resolveBookableDepartureBySlot(Number(body.experienceId), slotId)

    const expDoc = await services.experience.getById(Number(body.experienceId))
    if (!expDoc) {
      return NextResponse.json({ error: 'Experience not found' }, { status: 404 })
    }

    const travelers = Array.isArray(body.travelers) ? body.travelers : []
    const adultsCount =
      body.adultsCount ||
      travelers.filter((t: any) => t.type !== 'child' && t.type !== 'infant').length ||
      travelers.length ||
      1
    const childrenCount =
      body.childrenCount ||
      travelers.filter((t: any) => t.type === 'child' || t.type === 'infant').length ||
      0
    const childAges =
      body.childAges ||
      travelers
        .filter((t: any) => t.type === 'child' && typeof t.age === 'number')
        .map((t: any) => t.age)

    const localeCtx = await services.localization.buildContext({
      cookieLocale: body.locale || 'en',
      cookieCurrency: body.currency || 'EGP',
    })

    const pointsToRedeem = body.pointsToRedeem ? Number(body.pointsToRedeem) : undefined

    // Authoritative Commercial Pricing (Single Source of Truth)
    let pricingSnapshot: any = undefined
    const isFixedPackage = expDoc.type === 'package' && expDoc.packageMode === 'fixed_date'

    if (isFixedPackage) {
      const pricingResult = await services.bookingPricingUseCase.calculate({
        experienceId: Number(body.experienceId),
        slotId,
        adultsCount,
        childrenCount,
        childAges,
        selectedAllocationId: body.selectedAllocationId,
        ctx: localeCtx,
        pointsToRedeem,
        customerId: Number(user.id),
      })
      pricingSnapshot = pricingResult.snapshot
    } else {
      const pricingResult = await services.bookingPricingUseCase.calculatePreview({
        experienceId: Number(body.experienceId),
        date: departure.date,
        startTime: departure.startTime || body.startTime || '',
        adultsCount,
        childrenCount,
        childAges,
        selectedAllocationId: body.selectedAllocationId,
        ctx: localeCtx,
        pointsToRedeem,
        customerId: Number(user.id),
      })
      pricingSnapshot = pricingResult.snapshot
    }

    const bookingId = await services.booking.create({
      userId: Number(user.id),
      departure,
      travelers: body.travelers,
      endDate: body.endDate || departure.date,
      pointsToRedeem,
      pricingSnapshot,
      currency: body.currency,
      source: 'api',
    })

    const booking = await services.booking.getById(bookingId)
    return NextResponse.json(booking, { status: 201 })
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to create booking'
    console.error('Error creating booking:', error)
    const isPolicyViolation =
      errorMsg.includes('[PointsCalculator]') ||
      errorMsg.includes('[BookingCreator]') ||
      errorMsg.includes('[BookingPolicy]')
    return NextResponse.json(
      { error: errorMsg },
      { status: isPolicyViolation ? 400 : 500 },
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
    const user = await services.customer.authenticateRequest(request.headers)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

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
      return NextResponse.json(
        { error: 'No valid booking IDs provided for deletion.' },
        { status: 400 },
      )
    }

    const isHardPurge = searchParams.get('purge') === 'true' || searchParams.get('hard') === 'true'
    const isAdmin = (user as any).role === 'admin' || (user as any).role === 'super_admin'

    if (isHardPurge && !isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Hard purge requires administrator privileges.' },
        { status: 403 },
      )
    }

    const actor = { type: isAdmin ? ('system' as const) : ('customer' as const), id: user.id }

    for (const id of ids) {
      const targetBooking = await services.booking.getById(id)
      if (!targetBooking) {
        return NextResponse.json({ error: `Booking #${id} not found.` }, { status: 404 })
      }

      // Strict Tenant Isolation: verify booking ownership
      if (!isAdmin && targetBooking.customerId !== Number(user.id)) {
        return NextResponse.json(
          { error: `Forbidden: You do not have permission to delete or cancel Booking #${id}.` },
          { status: 403 },
        )
      }

      if (isHardPurge && isAdmin) {
        await services.booking.delete(id)
      } else {
        await services.booking.cancel(id, 'Cancelled via API DELETE request', actor)
      }
    }

    return NextResponse.json(
      { success: true, count: ids.length, deletedIds: ids, purged: isHardPurge },
      { status: 200 },
    )
  } catch (error: unknown) {
    console.error('Error deleting booking(s):', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete booking(s)' },
      { status: 400 },
    )
  }
}
