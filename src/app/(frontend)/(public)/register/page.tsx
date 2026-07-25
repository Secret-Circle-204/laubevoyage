'use client'

import React, { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, Badge, Input, Button } from '@/components/ui'
import { useToast } from '@/providers'
import { registerCustomerAction } from '@/application/actions/customer-actions'

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { addToast } = useToast()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName || !lastName || !email || !password) {
      addToast({ type: 'error', title: 'Error', description: 'Please fill in all required fields.' })
      return
    }

    setIsSubmitting(true)
    try {
      const res = await registerCustomerAction({
        email,
        firstName,
        lastName,
        password,
      })
      if (res.success) {
        addToast({
          type: 'success',
          title: 'Account Created!',
          description: "Welcome to L'Aube Voyage. 100 loyalty points awarded!",
        })
        const redirectPath = searchParams.get('redirect') || '/dashboard'
        router.push(redirectPath)
        router.refresh()
      } else {
        addToast({
          type: 'error',
          title: 'Registration Failed',
          description: res.error || 'Failed to create traveler account.',
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
    <form onSubmit={handleRegister} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            First Name
          </label>
          <Input
            name="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="John"
            required
            className="bg-white dark:bg-slate-900"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            Last Name
          </label>
          <Input
            name="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Doe"
            required
            className="bg-white dark:bg-slate-900"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
          Email Address
        </label>
        <Input
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="john@example.com"
          required
          className="bg-white dark:bg-slate-900"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
          Phone Number
        </label>
        <Input
          type="tel"
          name="phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+1 (555) 000-0000"
          className="bg-white dark:bg-slate-900"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
          Password
        </label>
        <Input
          type="password"
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          className="bg-white dark:bg-slate-900"
        />
      </div>

      <Button variant="primary" type="submit" size="lg" className="w-full mt-2" isLoading={isSubmitting}>
        Register & Claim 100 Bonus Points →
      </Button>
    </form>
  )
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

        <Suspense fallback={<div className="text-center py-4">Loading registration form...</div>}>
          <RegisterForm />
        </Suspense>

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
