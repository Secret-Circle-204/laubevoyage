import React from 'react'
import type { Metadata } from 'next'
import VerifyEmailClient from './VerifyEmailClient'

export const metadata: Metadata = {
  title: "Verify Email | L'Aube Voyage",
  description: "Verify your email address to activate your customer account and claim your 100 points welcome bonus.",
}

interface PageProps {
  searchParams: Promise<{ token?: string; email?: string }>
}

export default async function VerifyEmailPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams
  return (
    <VerifyEmailClient token={resolvedParams.token} email={resolvedParams.email} />
  )
}
