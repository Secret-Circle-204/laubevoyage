import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Card, Badge, Button } from '@/components/ui'

export const metadata: Metadata = {
  title: "Verify Email | L'Aube Voyage",
  description: "Verify your email address to activate your customer account and claim your 100 points welcome bonus.",
}

export default function VerifyEmailPage() {
  return (
    <div className="py-20 bg-slate-50 dark:bg-slate-950 min-h-screen flex items-center justify-center px-4">
      <Card variant="flat" padding="lg" className="w-full max-w-md text-center shadow-xl border border-slate-200 dark:border-slate-800">
        <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/50 text-[#00aeef] flex items-center justify-center mx-auto mb-4 text-3xl font-bold">
          ✉️
        </div>

        <Badge variant="primary" size="sm" className="mb-3">
          Account Verification
        </Badge>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Verify Your Email
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
          We sent a verification link to your email address. Please click the link to activate your traveler profile and claim your <strong>100 Welcome Points</strong>.
        </p>

        <div className="mt-8 space-y-3">
          <Link href="/login">
            <Button variant="primary" size="md" className="w-full">
              Proceed to Login →
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}
