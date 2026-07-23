import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Card, Badge, Input, Button } from '@/components/ui'

export const metadata: Metadata = {
  title: "Customer Sign In | L'Aube Voyage",
  description: "Sign in to your L'Aube Voyage customer portal to manage bookings, track loyalty points, and download trip vouchers.",
}

export default function LoginPage() {
  return (
    <div className="py-20 bg-slate-50 dark:bg-slate-950 min-h-screen flex items-center justify-center px-4">
      <Card variant="flat" padding="lg" className="w-full max-w-md shadow-xl border border-slate-200 dark:border-slate-800">
        <div className="text-center mb-8">
          <Badge variant="primary" size="sm" className="mb-3">
            Customer Portal
          </Badge>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Welcome Back
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Sign in to access your luxury travel bookings and loyalty ledger.
          </p>
        </div>

        <form action="/api/auth/login" method="POST" className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <Input
              type="email"
              name="email"
              placeholder="customer@example.com"
              required
              className="bg-white dark:bg-slate-900"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Password
              </label>
              <Link href="/forgot-password" className="text-xs text-[#00aeef] hover:underline">
                Forgot password?
              </Link>
            </div>
            <Input
              type="password"
              name="password"
              placeholder="••••••••"
              required
              className="bg-white dark:bg-slate-900"
            />
          </div>

          <Button variant="primary" type="submit" size="lg" className="w-full mt-2">
            Sign In →
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
          Don&apos;t have a traveler account?{' '}
          <Link href="/register" className="font-bold text-[#2e3192] dark:text-[#00aeef] hover:underline">
            Register & Get 100 Welcome Points
          </Link>
        </div>
      </Card>
    </div>
  )
}
