import React from 'react'
import type { Metadata } from 'next'
import { CheckoutSuccessClient } from './CheckoutSuccessClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: "Payment Status Checkpoint | L'Aube Voyage",
  description: 'Verifying payment status and confirming your luxury experience booking.',
}

export default async function CheckoutSuccessPage(props: {
  searchParams: Promise<{ tx?: string; bookingNumber?: string; [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams

  return (
    <CheckoutSuccessClient
      transactionId={searchParams.tx}
      bookingNumber={searchParams.bookingNumber}
    />
  )
}
