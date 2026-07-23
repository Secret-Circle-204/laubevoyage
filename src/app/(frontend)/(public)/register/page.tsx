import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Card, Badge, Input, Button } from '@/components/ui'

export const metadata: Metadata = {
  title: "Create Traveler Account | L'Aube Voyage",
  description: "Register for a L'Aube Voyage traveler account to receive a 100 loyalty points welcome bonus and unlock luxury journey offers.",
}

export default function RegisterPage() {
  return (
    <div className="py-20 bg-slate-50 dark:bg-slate-950 min-h-screen flex items-center justify-center px-4">
      <Card variant="flat" padding="lg" className="w-full max-w-md shadow-xl border border-slate-200 dark:border-slate-800">
        <div className="text-center mb-8">
          <Badge variant="accent" size="sm" className="mb-3">
            🎁 100 Points Welcome Bonus
          </Badge>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Join L&apos;Aube Voyage
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Create your traveler profile and unlock exclusive luxury journeys.
          </p>
        </div>

        <form action="/api/auth/register" method="POST" className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                First Name
              </label>
              <Input name="firstName" placeholder="John" required className="bg-white dark:bg-slate-900" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Last Name
              </label>
              <Input name="lastName" placeholder="Doe" required className="bg-white dark:bg-slate-900" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <Input type="email" name="email" placeholder="john@example.com" required className="bg-white dark:bg-slate-900" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Phone Number
            </label>
            <Input type="tel" name="phone" placeholder="+1 (555) 000-0000" className="bg-white dark:bg-slate-900" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <Input type="password" name="password" placeholder="••••••••" required className="bg-white dark:bg-slate-900" />
          </div>

          <Button variant="primary" type="submit" size="lg" className="w-full mt-2">
            Register & Claim 100 Bonus Points →
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
          Already have an account?{' '}
          <Link href="/login" className="font-bold text-[#2e3192] dark:text-[#00aeef] hover:underline">
            Sign In Here
          </Link>
        </div>
      </Card>
    </div>
  )
}
