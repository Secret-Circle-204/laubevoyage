'use client'

import React, { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, Badge, Input, Button } from '@/components/ui'
import { useToast } from '@/providers'
import { loginCustomerAction } from '@/application/actions/customer-actions'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { addToast } = useToast()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      addToast({ type: 'error', title: 'Error', description: 'Please fill in both email and password.' })
      return
    }

    setIsSubmitting(true)
    try {
      const res = await loginCustomerAction(email, password)
      if (res.success) {
        addToast({
          type: 'success',
          title: 'Welcome back!',
          description: `Logged in successfully as ${res.fullName || res.email}`,
        })
        const redirectPath = searchParams.get('redirect') || '/dashboard'
        router.push(redirectPath)
        router.refresh()
      } else {
        addToast({
          type: 'error',
          title: 'Sign In Failed',
          description: res.error || 'Invalid credentials',
        })
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred'
      addToast({ type: 'error', title: 'Error', description: msg })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleLogin} className="space-y-5">
      <div>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
          Email Address
        </label>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          className="bg-white dark:bg-slate-900"
        />
      </div>

      <Button variant="primary" type="submit" size="lg" className="w-full mt-2" isLoading={isSubmitting}>
        Sign In →
      </Button>
    </form>
  )
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

        <Suspense fallback={<div className="text-center py-4">Loading login form...</div>}>
          <LoginForm />
        </Suspense>

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
