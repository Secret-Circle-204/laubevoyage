import React, { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Card, Badge } from '@/components/ui'
import { RegisterForm } from './RegisterForm'
import { CustomerLoyaltyLoader } from '@/application/loyalty/loaders'
import { SessionResolver } from '@/application/auth/session-resolver'
import { getLocaleContext } from '@/lib/get-locale-context'
import { getDomainServices } from '@/domains/factory'

export const metadata: Metadata = {
  title: "Join L'Aube Voyage | Luxury Travel Registration",
  description: "Create your traveler profile and unlock exclusive luxury journeys.",
}

export default async function RegisterPage() {
  const session = await SessionResolver.resolve()
  if (session.isAuthenticated) {
    redirect('/dashboard')
  }

  const ctx = await getLocaleContext()
  const { localization } = await getDomainServices()

  const loyaltyConfig = await CustomerLoyaltyLoader.loadPublicConfig()
  const welcomeBonus = loyaltyConfig.welcomeBonus
  const hasBonus = typeof welcomeBonus === 'number' && welcomeBonus > 0

  const createAccountTitle = localization.translateUiKey('auth.createAccountTitle', ctx)
  const createAccountSubtitle = localization.translateUiKey('auth.createAccountSubtitle', ctx)
  const alreadyHaveAccount = localization.translateUiKey('auth.alreadyHaveAccount', ctx)
  const signInLink = localization.translateUiKey('auth.signInLink', ctx)

  return (
    <div className="py-20 bg-slate-50 dark:bg-slate-950 min-h-screen flex items-center justify-center px-4">
      <Card variant="flat" padding="lg" className="w-full max-w-md shadow-xl border border-slate-200 dark:border-slate-800">
        <div className="text-center mb-8">
          <Badge variant="accent" size="sm" className="mb-3">
            {hasBonus ? `🎁 ${welcomeBonus} Points Welcome Bonus` : 'Traveler Portal'}
          </Badge>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {createAccountTitle}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            {createAccountSubtitle}
          </p>
        </div>

        <Suspense fallback={<div className="text-center py-4">Loading registration form...</div>}>
          <RegisterForm welcomeBonus={welcomeBonus} />
        </Suspense>

        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
          {alreadyHaveAccount}{' '}
          <Link href="/login" className="font-bold text-[#2e3192] dark:text-[#00aeef] hover:underline">
            {signInLink}
          </Link>
        </div>
      </Card>
    </div>
  )
}
