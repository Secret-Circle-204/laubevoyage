'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useToast, useSession } from '@/providers'
import { loginCustomerAction } from '@/application/actions/customer-actions'

export interface LoginFormProps {
  welcomeBonus?: number
}

export function LoginForm({ welcomeBonus: _welcomeBonus }: LoginFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { addToast } = useToast()
  const { setSession } = useSession()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      addToast({
        type: 'error',
        title: 'Error',
        description: 'Please fill in both email and password.',
      })
      return
    }

    setIsSubmitting(true)
    try {
      const res = await loginCustomerAction(email, password)
      if (res.success) {
        if (res.session) {
          setSession(res.session)
        }
        addToast({
          type: 'success',
          title: 'Welcome back!',
          description: `Logged in successfully as ${res.fullName || res.email}`,
        })
        const redirectPath = searchParams.get('redirect') || '/dashboard'
        router.push(redirectPath)
        router.refresh()
      } else {
        if ('code' in res && res.code === 'EMAIL_NOT_VERIFIED') {
          addToast({
            type: 'info',
            title: 'Email Verification Required',
            description: res.error || 'Please verify your email address before signing in.',
          })
          router.push(`/verify-email?email=${encodeURIComponent(email.trim())}`)
          return
        }
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
    <form onSubmit={handleLogin} className="space-y-4">
      {/* Email Address Field */}
      <div className="space-y-1.5">
        <label
          htmlFor="login-email"
          className="block text-[11px] font-semibold text-slate-300 uppercase tracking-widest font-sans"
        >
          Email Address
        </label>
        <div className="relative flex items-center group">
          {/* Leading Icon */}
          <div className="absolute left-3.5 text-slate-400 group-focus-within:text-[#00ADEE] transition-colors pointer-events-none">
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </div>

          <input
            id="login-email"
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="traveler@laubevoyage.com"
            required
            disabled={isSubmitting}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/15 bg-black/40 text-white placeholder:text-slate-400 text-sm transition-all duration-200 focus:outline-none focus:border-[#00ADEE] focus:ring-4 focus:ring-[#00ADEE]/20 hover:border-white/30 disabled:opacity-50 disabled:cursor-not-allowed shadow-inner"
          />
        </div>
      </div>

      {/* Password Field */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="login-password"
            className="block text-[11px] font-semibold text-slate-300 uppercase tracking-widest font-sans"
          >
            Password
          </label>
          <Link
            href="/forgot-password"
            className="text-xs text-[#00ADEE] hover:text-[#33bef2] transition-colors font-medium hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <div className="relative flex items-center group">
          {/* Leading Icon */}
          <div className="absolute left-3.5 text-slate-400 group-focus-within:text-[#00ADEE] transition-colors pointer-events-none">
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>

          <input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            disabled={isSubmitting}
            className="w-full pl-10 pr-11 py-3 rounded-xl border border-white/15 bg-black/40 text-white placeholder:text-slate-400 text-sm transition-all duration-200 focus:outline-none focus:border-[#00ADEE] focus:ring-4 focus:ring-[#00ADEE]/20 hover:border-white/30 disabled:opacity-50 disabled:cursor-not-allowed shadow-inner"
          />

          {/* Show / Hide Password Button */}
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

      {/* Vibrant Luxury Dawn CTA Button */}
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
              <span>Authenticating...</span>
            </>
          ) : (
            <>
              <span>Sign In</span>
              <span className="transition-transform duration-200 group-hover:translate-x-1.5 font-bold">→</span>
            </>
          )}
        </button>
      </div>
    </form>
  )
}
