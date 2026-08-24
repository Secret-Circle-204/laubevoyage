'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, Badge, Button } from '@/components/ui'
import { useToast } from '@/providers'
import { verifyEmailAction } from '@/application/actions/customer-actions'

interface VerifyEmailClientProps {
  token?: string
  email?: string
  welcomeBonus?: number
}

type StatusState = 'loading' | 'success' | 'already_verified' | 'failed'

export default function VerifyEmailClient({ token, email, welcomeBonus }: VerifyEmailClientProps) {
  const { addToast } = useToast()
  const [status, setStatus] = useState<StatusState>(token ? 'loading' : 'success')
  const [errorMessage, setErrorMessage] = useState('')
  const hasBonus = typeof welcomeBonus === 'number' && welcomeBonus > 0

  useEffect(() => {
    if (!token) return

    let isMounted = true

    const verify = async () => {
      try {
        const res = await verifyEmailAction(token, email)
        if (!isMounted) return

        if (res.success) {
          if ('alreadyVerified' in res && res.alreadyVerified) {
            setStatus('already_verified')
            addToast({
              type: 'info',
              title: 'Already Verified',
              description: 'Your email address is already verified.',
            })
          } else {
            setStatus('success')
            addToast({
              type: 'success',
              title: 'Email Verified!',
              description: hasBonus
                ? `Account activated successfully! ${welcomeBonus} loyalty points awarded!`
                : 'Account activated successfully!',
            })
          }
        } else {
          setStatus('failed')
          setErrorMessage(res.error || 'The verification link is invalid or expired.')
          addToast({
            type: 'error',
            title: 'Verification Failed',
            description: res.error || 'Failed to verify email address.',
          })
        }
      } catch (err: unknown) {
        if (!isMounted) return
        setStatus('failed')
        const msg = err instanceof Error ? err.message : 'An unexpected error occurred'
        setErrorMessage(msg)
        addToast({ type: 'error', title: 'Error', description: msg })
      }
    }

    verify()

    return () => {
      isMounted = false
    }
  }, [token, email, addToast, hasBonus, welcomeBonus])

  // If no token, show the standard "Check your email" instruction page
  if (!token) {
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
            We sent a verification link to {email ? <strong>{email}</strong> : 'your email address'}. Please check your inbox and click the link to activate your traveler profile{hasBonus ? <> and claim your <strong>{welcomeBonus} Welcome Points</strong></> : '.'}
          </p>

          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
            <Link href="/login" className="text-sm font-bold text-[#2e3192] dark:text-[#00aeef] hover:underline">
              ← Return to Sign In
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="py-20 bg-slate-50 dark:bg-slate-950 min-h-screen flex items-center justify-center px-4">
      <Card variant="flat" padding="lg" className="w-full max-w-md text-center shadow-xl border border-slate-200 dark:border-slate-800">
        {status === 'loading' && (
          <>
            <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/50 text-[#00aeef] flex items-center justify-center mx-auto mb-4 text-3xl font-bold animate-pulse">
              🔄
            </div>
            <Badge variant="primary" size="sm" className="mb-3">
              Processing
            </Badge>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Verifying Email
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              We are verifying your email verification token with L&apos;Aube Voyage secure servers. Please do not close this window.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 text-green-500 flex items-center justify-center mx-auto mb-4 text-3xl font-bold">
              ✅
            </div>
            <Badge variant="accent" size="sm" className="mb-3">
              {hasBonus ? `🎉 ${welcomeBonus} Welcome Points Awarded` : '🎉 Account Activated'}
            </Badge>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Email Verified!
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              {hasBonus
                ? `Your email is verified and your luxury traveler profile is now active. Your ${welcomeBonus} bonus loyalty points are available in your ledger.`
                : 'Your email is verified and your luxury traveler profile is now active.'}
            </p>
            <div className="mt-8">
              <Link href="/login">
                <Button variant="primary" size="md" className="w-full">
                  Sign In to Your Account →
                </Button>
              </Link>
            </div>
          </>
        )}

        {status === 'already_verified' && (
          <>
            <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-500 flex items-center justify-center mx-auto mb-4 text-3xl font-bold">
              ℹ️
            </div>
            <Badge variant="secondary" size="sm" className="mb-3">
              Status Active
            </Badge>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Already Verified
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              Your email address is already verified. Your account is active and you are ready to sign in.
            </p>
            <div className="mt-8">
              <Link href="/login">
                <Button variant="primary" size="md" className="w-full">
                  Proceed to Login →
                </Button>
              </Link>
            </div>
          </>
        )}

        {status === 'failed' && (
          <>
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 text-red-500 flex items-center justify-center mx-auto mb-4 text-3xl font-bold">
              ❌
            </div>
            <Badge variant="error" size="sm" className="mb-3">
              Verification Failed
            </Badge>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Invalid or Expired Link
            </h1>
            <p className="text-sm text-red-500 dark:text-red-400 mt-2 leading-relaxed text-xs p-3 bg-red-50 dark:bg-red-950/20 rounded-md border border-red-100 dark:border-red-900/30 font-mono">
              {errorMessage}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-4 leading-relaxed">
              Please check that you copied the complete URL, or try requesting a new verification email from the login page.
            </p>
            <div className="mt-8 space-y-3">
              <Link href="/login" className="block">
                <Button variant="secondary" size="md" className="w-full">
                  Return to Login
                </Button>
              </Link>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
