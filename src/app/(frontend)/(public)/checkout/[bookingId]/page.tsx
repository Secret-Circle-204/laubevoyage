import React from 'react'
import type { Metadata } from 'next'
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

export default async function Page(props: {
  params: Promise<{ bookingId: string }>
}) {
  const params = await props.params
  const data = await CheckoutPageLoader.loadByBookingId(params.bookingId)

  if (!data) {
    notFound()
  }

  return <CheckoutPage data={data} />
}
