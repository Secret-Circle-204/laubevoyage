'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, Badge, Button } from '@/components/ui'
import { useToast } from '@/providers'
import { verifyEmailAction, resendVerificationAction } from '@/application/actions/customer-actions'

interface VerifyEmailClientProps {
  token?: string
  email?: string
  welcomeBonus?: number
}

type StatusState = 'loading' | 'success' | 'already_verified' | 'failed'

// SVG Icons
function MailIcon({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  )
}

function SpinnerIcon({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  )
}

function CheckCircleIcon({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function InfoIcon({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
    </svg>
  )
}

function XCircleIcon({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

export default function VerifyEmailClient({ token, email, welcomeBonus }: VerifyEmailClientProps) {
  const { addToast } = useToast()
  const [status, setStatus] = useState<StatusState>(token ? 'loading' : 'success')
  const [errorMessage, setErrorMessage] = useState('')
  const [isResending, setIsResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const hasBonus = typeof welcomeBonus === 'number' && welcomeBonus > 0

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCooldown])

  const handleResend = async () => {
    if (!email || isResending || resendCooldown > 0) return
    setIsResending(true)
    try {
      const res = await resendVerificationAction(email)
      if (res.success) {
        addToast({
          type: 'success',
          title: 'Verification Link Sent',
          description: res.message || 'A fresh verification link has been sent to your email.',
        })
        setResendCooldown(60)
      } else {
        addToast({
          type: 'error',
          title: 'Resend Failed',
          description: res.error || 'Failed to resend verification link.',
        })
      }
    } catch {
      addToast({
        type: 'error',
        title: 'Error',
        description: 'An unexpected error occurred while requesting verification email.',
      })
    } finally {
      setIsResending(false)
    }
  }

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
      <div className="py-20 bg-background min-h-screen flex items-center justify-center px-4">
        <Card variant="flat" padding="lg" className="w-full max-w-md text-center shadow-xl border border-border">
          <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
            <MailIcon className="w-8 h-8" />
          </div>

          <Badge variant="primary" size="sm" className="mb-3">
            Account Verification
          </Badge>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
            Verify Your Email
          </h1>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            We sent a verification link to {email ? <strong>{email}</strong> : 'your email address'}. Please check your inbox and click the link to activate your traveler profile{hasBonus ? <> and claim your <strong>{welcomeBonus} Welcome Points</strong></> : '.'}
          </p>

          <div className="mt-6 space-y-3">
            {email && (
              <Button
                type="button"
                variant="primary"
                size="md"
                className="w-full"
                disabled={isResending || resendCooldown > 0}
                onClick={handleResend}
              >
                {isResending
                  ? 'Sending...'
                  : resendCooldown > 0
                    ? `Resend in ${resendCooldown}s`
                    : 'Resend Verification Email'}
              </Button>
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-border">
            <Link href="/login" className="text-sm font-bold text-primary hover:underline">
              ← Return to Sign In
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="py-20 bg-background min-h-screen flex items-center justify-center px-4">
      <Card variant="flat" padding="lg" className="w-full max-w-md text-center shadow-xl border border-border">
        {status === 'loading' && (
          <>
            <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
              <SpinnerIcon className="w-8 h-8" />
            </div>
            <Badge variant="primary" size="sm" className="mb-3">
              Processing
            </Badge>
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
              Verifying Email
            </h1>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              We are verifying your email verification token with L&apos;Aube Voyage secure servers. Please do not close this window.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-4">
              <CheckCircleIcon className="w-8 h-8" />
            </div>
            <Badge variant="accent" size="sm" className="mb-3">
              {hasBonus ? `${welcomeBonus} Welcome Points Awarded` : 'Account Activated'}
            </Badge>
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
              Email Verified!
            </h1>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
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
            <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
              <InfoIcon className="w-8 h-8" />
            </div>
            <Badge variant="secondary" size="sm" className="mb-3">
              Status Active
            </Badge>
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
              Already Verified
            </h1>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
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
            <div className="w-16 h-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto mb-4">
              <XCircleIcon className="w-8 h-8" />
            </div>
            <Badge variant="error" size="sm" className="mb-3">
              Verification Failed
            </Badge>
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
              Invalid or Expired Link
            </h1>
            <p className="text-sm text-destructive mt-2 leading-relaxed text-xs p-3 bg-destructive/10 rounded-md border border-destructive/20 font-medium">
              {errorMessage}
            </p>
            <p className="text-sm text-muted-foreground mt-4 leading-relaxed">
              Please check that you copied the complete URL, or try requesting a new verification email below.
            </p>
            <div className="mt-8 space-y-3">
              {email && (
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  className="w-full"
                  disabled={isResending || resendCooldown > 0}
                  onClick={handleResend}
                >
                  {isResending
                    ? 'Sending...'
                    : resendCooldown > 0
                      ? `Resend in ${resendCooldown}s`
                      : 'Request New Verification Link'}
                </Button>
              )}
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
