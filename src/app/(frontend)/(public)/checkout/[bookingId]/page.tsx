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

export default async function Page(props: {
  params: Promise<{ bookingId: string }>
  searchParams: Promise<{ experienceId?: string; adults?: string; [key: string]: any }>
}) {
  const params = await props.params
  const searchParams = await props.searchParams

  // 1. Resolve Session and enforce authentication
  const session = await SessionResolver.resolve()
  if (!session.isAuthenticated || !session.customerId) {
    const experienceId = searchParams.experienceId || ''
    const slotId = searchParams.slotId || ''
    const adults = searchParams.adults || ''
    const dest = `/checkout/${params.bookingId}?experienceId=${experienceId}&slotId=${slotId}&adults=${adults}`
    redirect(`/login?redirect=${encodeURIComponent(dest)}`)
  }

  const cookieStore = await cookies()
  const locale = cookieStore.get('laube-locale')?.value
  const currency = cookieStore.get('laube-currency')?.value

  const experienceId = searchParams.experienceId ? Number(searchParams.experienceId) : undefined
  const adults = searchParams.adults ? Number(searchParams.adults) : undefined
  const slotId = searchParams.slotId ? Number(searchParams.slotId) : undefined

  const data = await CheckoutPageLoader.loadByBookingId(params.bookingId, {
    locale,
    currency,
    experienceId,
    adults,
    slotId,
  })

  if (!data) {
    notFound()
  }

  return <CheckoutPage data={data} />
}
