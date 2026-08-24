import React from 'react'
import type { Metadata } from 'next'
import VerifyEmailClient from './VerifyEmailClient'
import { CustomerLoyaltyLoader } from '@/application/loyalty/loaders'

export const metadata: Metadata = {
  title: "Verify Email | L'Aube Voyage",
  description: "Verify your email address to activate your customer account and claim your welcome bonus points.",
}

interface PageProps {
  searchParams: Promise<{ token?: string; email?: string }>
}

export default async function VerifyEmailPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams
  const loyaltyConfig = await CustomerLoyaltyLoader.loadPublicConfig()

  return (
    <VerifyEmailClient
      token={resolvedParams.token}
      email={resolvedParams.email}
      welcomeBonus={loyaltyConfig.welcomeBonus}
    />
  )
}
