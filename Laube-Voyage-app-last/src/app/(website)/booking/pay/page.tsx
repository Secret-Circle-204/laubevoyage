import 'server-only'
import { redirect, notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@/payload.config'
import PaymentClient from './PaymentClient'
import type { Booking } from '@/payload-types'

interface PageProps {
  searchParams: Promise<{ id?: string }>
}

export default async function PaymentPage({ searchParams }: PageProps) {
  const params = await searchParams
  const bookingId = params.id

  if (!bookingId) {
    redirect('/book')
  }

  const payload = await getPayload({ config })

  // Verify user is authenticated
  const { user } = await payload.auth({ headers: await headers() })

  if (!user) {
    redirect(`/login?redirect=/booking/pay?id=${bookingId}`)
  }

  // Fetch the booking
  let booking: Booking | null = null

  try {
    const result = await payload.findByID({
      collection: 'bookings',
      id: Number(bookingId),
      depth: 2,
    })
    booking = result as Booking
  } catch {
    notFound()
  }

  if (!booking) {
    notFound()
  }

  // Verify the booking belongs to this user
  const bookingUserId = typeof booking.user === 'object' ? booking.user?.id : booking.user
  if (bookingUserId !== user.id) {
    redirect('/dashboard')
  }

  // If already paid, redirect to success
  if (booking.status === 'confirmed') {
    redirect(`/booking/success?bookingId=${booking.id}`)
  }

  return <PaymentClient booking={booking} />
}
