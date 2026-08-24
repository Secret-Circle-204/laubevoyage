'use client'

import React, { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input, Button } from '@/components/ui'
import { useToast } from '@/providers'
import { registerCustomerAction } from '@/application/actions/customer-actions'

export interface RegisterFormProps {
  welcomeBonus?: number
}

export function RegisterForm({ welcomeBonus }: RegisterFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { addToast } = useToast()
  const hasBonus = typeof welcomeBonus === 'number' && welcomeBonus > 0

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
        if ('requiresVerification' in res && res.requiresVerification) {
          addToast({
            type: 'info',
            title: 'Verification Required',
            description: 'Account created! Please verify your email address to log in.',
          })
          router.push(`/verify-email?email=${encodeURIComponent(email)}`)
        } else {
          addToast({
            type: 'success',
            title: 'Account Created!',
            description: hasBonus
              ? `Welcome to L'Aube Voyage. ${welcomeBonus} loyalty points awarded!`
              : "Welcome to L'Aube Voyage. Your traveler account is created!",
          })
          const redirectPath = searchParams.get('redirect') || '/dashboard'
          router.push(redirectPath)
          router.refresh()
        }
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
        {hasBonus ? `Register & Claim ${welcomeBonus} Bonus Points →` : 'Create Traveler Account →'}
      </Button>
    </form>
  )
}
