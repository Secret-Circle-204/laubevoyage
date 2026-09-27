'use client'

import React, { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedFirstName = firstName.trim()
    const trimmedLastName = lastName.trim()
    const trimmedEmail = email.trim()
    const trimmedPhone = phone.trim()

    if (!trimmedFirstName || !trimmedLastName || !trimmedEmail || !trimmedPhone || !password) {
      addToast({
        type: 'error',
        title: 'Error',
        description: 'Please fill in all required fields.',
      })
      return
    }

    setIsSubmitting(true)
    try {
      const res = await registerCustomerAction({
        email: trimmedEmail,
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        password,
        phone: trimmedPhone,
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
        if ('code' in res && res.code === 'ACCOUNT_PENDING_VERIFICATION') {
          addToast({
            type: 'info',
            title: 'Account Awaiting Verification',
            description: res.error || 'Your account has been created but your email is not verified yet.',
          })
          router.push(`/verify-email?email=${encodeURIComponent(trimmedEmail)}`)
          return
        }
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
    <form onSubmit={handleRegister} className="space-y-3.5">
      {/* 2-Column Name Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label
            htmlFor="register-first-name"
            className="block text-[11px] font-semibold text-slate-300 uppercase tracking-widest font-sans"
          >
            First Name <span className="text-[#F48120] font-bold">*</span>
          </label>
          <div className="relative flex items-center group">
            <div className="absolute left-3 text-slate-400 group-focus-within:text-[#00ADEE] transition-colors pointer-events-none">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <input
              id="register-first-name"
              type="text"
              name="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="John"
              required
              disabled={isSubmitting}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-white/15 bg-black/40 text-white placeholder:text-slate-400 text-sm transition-all duration-200 focus:outline-none focus:border-[#00ADEE] focus:ring-4 focus:ring-[#00ADEE]/20 hover:border-white/30 disabled:opacity-50 disabled:cursor-not-allowed shadow-inner"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="register-last-name"
            className="block text-[11px] font-semibold text-slate-300 uppercase tracking-widest font-sans"
          >
            Last Name <span className="text-[#F48120] font-bold">*</span>
          </label>
          <div className="relative flex items-center group">
            <div className="absolute left-3 text-slate-400 group-focus-within:text-[#00ADEE] transition-colors pointer-events-none">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <input
              id="register-last-name"
              type="text"
              name="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Doe"
              required
              disabled={isSubmitting}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-white/15 bg-black/40 text-white placeholder:text-slate-400 text-sm transition-all duration-200 focus:outline-none focus:border-[#00ADEE] focus:ring-4 focus:ring-[#00ADEE]/20 hover:border-white/30 disabled:opacity-50 disabled:cursor-not-allowed shadow-inner"
            />
          </div>
        </div>
      </div>

      {/* Email Address */}
      <div className="space-y-1">
        <label
          htmlFor="register-email"
          className="block text-[11px] font-semibold text-slate-300 uppercase tracking-widest font-sans"
        >
          Email Address <span className="text-[#F48120] font-bold">*</span>
        </label>
        <div className="relative flex items-center group">
          <div className="absolute left-3 text-slate-400 group-focus-within:text-[#00ADEE] transition-colors pointer-events-none">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </div>
          <input
            id="register-email"
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="john.doe@example.com"
            required
            disabled={isSubmitting}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-white/15 bg-black/40 text-white placeholder:text-slate-400 text-sm transition-all duration-200 focus:outline-none focus:border-[#00ADEE] focus:ring-4 focus:ring-[#00ADEE]/20 hover:border-white/30 disabled:opacity-50 disabled:cursor-not-allowed shadow-inner"
          />
        </div>
      </div>

      {/* Phone Number (Strictly Required Invariant) */}
      <div className="space-y-1">
        <label
          htmlFor="register-phone"
          className="block text-[11px] font-semibold text-slate-300 uppercase tracking-widest font-sans"
        >
          Phone Number <span className="text-[#F48120] font-bold">*</span>
        </label>
        <div className="relative flex items-center group">
          <div className="absolute left-3 text-slate-400 group-focus-within:text-[#00ADEE] transition-colors pointer-events-none">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </div>
          <input
            id="register-phone"
            type="tel"
            name="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 (555) 000-0000"
            required
            disabled={isSubmitting}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-white/15 bg-black/40 text-white placeholder:text-slate-400 text-sm transition-all duration-200 focus:outline-none focus:border-[#00ADEE] focus:ring-4 focus:ring-[#00ADEE]/20 hover:border-white/30 disabled:opacity-50 disabled:cursor-not-allowed shadow-inner"
          />
        </div>
      </div>

      {/* Password */}
      <div className="space-y-1">
        <label
          htmlFor="register-password"
          className="block text-[11px] font-semibold text-slate-300 uppercase tracking-widest font-sans"
        >
          Password <span className="text-[#F48120] font-bold">*</span>
        </label>
        <div className="relative flex items-center group">
          <div className="absolute left-3 text-slate-400 group-focus-within:text-[#00ADEE] transition-colors pointer-events-none">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <input
            id="register-password"
            type={showPassword ? 'text' : 'password'}
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            disabled={isSubmitting}
            className="w-full pl-9 pr-11 py-2.5 rounded-xl border border-white/15 bg-black/40 text-white placeholder:text-slate-400 text-sm transition-all duration-200 focus:outline-none focus:border-[#00ADEE] focus:ring-4 focus:ring-[#00ADEE]/20 hover:border-white/30 disabled:opacity-50 disabled:cursor-not-allowed shadow-inner"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 p-1.5 rounded-lg text-slate-400 hover:text-[#00ADEE] focus:outline-none focus:text-[#00ADEE] transition-colors cursor-pointer"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                <line x1="2" y1="2" x2="22" y2="22" />
              </svg>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Hero Dawn CTA Button */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="relative w-full py-3.5 px-6 rounded-xl font-bold text-xs uppercase tracking-widest text-white overflow-hidden transition-all duration-300 bg-gradient-to-r from-[#F48120] via-[#f7943d] to-[#e06f10] hover:brightness-110 shadow-[0_10px_30px_rgba(244,129,32,0.35)] hover:shadow-[0_15px_40px_rgba(244,129,32,0.55)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 cursor-pointer flex items-center justify-center gap-2 group before:absolute before:inset-0 before:-translate-x-full hover:before:translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/25 before:to-transparent before:transition-transform before:duration-700"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin w-4 h-4 text-white" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>Creating Traveler Profile...</span>
            </>
          ) : (
            <>
              <span>
                {hasBonus ? `Register & Claim ${welcomeBonus} Bonus Points` : 'Create Traveler Profile'}
              </span>
              <span className="transition-transform duration-200 group-hover:translate-x-1.5 font-bold">→</span>
            </>
          )}
        </button>
      </div>
    </form>
  )
}
