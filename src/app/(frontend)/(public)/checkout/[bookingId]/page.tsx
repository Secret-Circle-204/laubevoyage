import React from 'react'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { CheckoutPageLoader } from '@/application/booking/loaders-checkout'
import { CheckoutPage } from '@/components/features/checkout/CheckoutPage'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Secure Checkout | L'Aube Voyage",
    description: 'Complete your luxury tour or daily tour booking securely.',
  }
}

import { redirect } from 'next/navigation'
import { SessionResolver } from '@/application/auth/session-resolver'
import { AccommodationParamsParser } from '@/application/shared/parsers'

export default async function Page(props: {
  params: Promise<{ bookingId: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await props.params
  const searchParams = await props.searchParams

  // 1. Resolve Session and enforce authentication
  const session = await SessionResolver.resolve()
  if (!session.isAuthenticated || !session.customerId) {
    const query = new URLSearchParams()
    for (const [key, value] of Object.entries(searchParams)) {
      if (value !== undefined && value !== null && value !== '') {
        query.set(key, String(value))
      }
    }
    const queryString = query.toString()
    const dest = `/checkout/${params.bookingId}${queryString ? `?${queryString}` : ''}`
    redirect(`/login?redirect=${encodeURIComponent(dest)}`)
  }

  const cookieStore = await cookies()
  const locale = cookieStore.get('laube-locale')?.value
  const currency = cookieStore.get('laube-currency')?.value

  const experienceId = searchParams.experienceId ? Number(searchParams.experienceId) : undefined
  const adults = searchParams.adults ? Number(searchParams.adults) : undefined
  const children = searchParams.children ? Number(searchParams.children) : undefined
  const childAges = typeof searchParams.childAges === 'string'
    ? searchParams.childAges.split(',').map(Number).filter((n) => !isNaN(n))
    : undefined
  const childBeddingModes = typeof searchParams.childBeddingModes === 'string'
    ? (searchParams.childBeddingModes.split(',') as ('sharing_bed' | 'extra_bed')[])
    : undefined
  const selectedAllocationId = typeof searchParams.roomAllocation === 'string' && searchParams.roomAllocation.trim() !== ''
    ? searchParams.roomAllocation.trim()
    : undefined
  const selectedAccommodationOptions = typeof searchParams.accommodations === 'string'
    ? AccommodationParamsParser.parse(searchParams.accommodations)
    : undefined
  const slotId = searchParams.slotId ? Number(searchParams.slotId) : undefined
  const date = typeof searchParams.date === 'string' ? searchParams.date : undefined
  const startTime = typeof searchParams.startTime === 'string' ? searchParams.startTime : undefined

  const data = await CheckoutPageLoader.loadByBookingId(params.bookingId, {
    locale,
    currency,
    experienceId,
    adults,
    children,
    childAges,
    childBeddingModes,
    selectedAllocationId,
    selectedAccommodationOptions,
    slotId,
    date,
    startTime,
  })

  if (!data) {
    notFound()
  }

  return <CheckoutPage data={data} />
}
