'use client'

import { useState, Suspense } from 'react'
import { motion } from 'framer-motion'
import { Mail, Lock, Loader2, ArrowRight } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/premium-ui/Button'

function LoginContent() {
  const [view, setView] = useState<'login' | 'forgot-password'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const isRegistered = searchParams.get('registered') === 'true'
  const isVerified = searchParams.get('verified') === 'true'

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/users/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        // Successful login
        router.push('/dashboard')
        router.refresh() // Refresh to update server-side auth state
      } else {
        setError(data.errors?.[0]?.message || 'Invalid credentials. Please attempt again.')
      }
    } catch (_error) {
      setError('An unexpected error occurred. Our team is investigating.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccessMsg('')

    try {
      const response = await fetch('/api/users/forgot-password-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccessMsg('Reset link has been dispatched to your email. Check your inbox.')
      } else {
        setError(data.error || 'Failed to send reset link.')
      }
    } catch (_error) {
      setError('An unexpected error occurred. Our team is investigating.')
    } finally {
      setIsLoading(false)
    }
  }

  if (view === 'forgot-password') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="mb-8">
          <h2 className="text-2xl font-serif font-bold text-white uppercase italic tracking-tight">
            Reset Password
          </h2>
          <p className="text-stone-400 text-sm mt-1">Enter your registered email to receive a secure link</p>
        </div>

        {successMsg ? (
          <div className="space-y-6">
            <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center space-y-3">
              <p className="text-emerald-400 text-sm font-medium">{successMsg}</p>
            </div>
            <Button
              onClick={() => {
                setView('login')
                setSuccessMsg('')
                setError('')
              }}
              className="w-full h-14 bg-primary text-secondary hover:bg-white border-primary rounded-2xl font-bold uppercase tracking-widest transition-all"
            >
              Back to Login
            </Button>
          </div>
        ) : (
          <form onSubmit={handleForgotPassword} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest ml-1">
                Email Address
              </label>
              <div className="relative group">
                <Mail
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500 group-focus-within:text-primary transition-colors"
                  size={18}
                />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-stone-600 focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all"
                  placeholder="e.g. excelsior@laube.com"
                />
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="text-red-400 text-xs font-medium bg-red-500/10 border border-red-500/20 p-3 rounded-xl"
              >
                {error}
              </motion.div>
            )}

            <div className="flex flex-col gap-4">
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-14 bg-primary text-secondary hover:bg-white border-primary rounded-2xl font-bold uppercase tracking-widest transition-all shadow-xl shadow-primary/10 active:scale-95"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin mr-2" />
                ) : (
                  <>
                    Send Reset Link{' '}
                    <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
              
              <button
                type="button"
                onClick={() => {
                  setView('login')
                  setError('')
                }}
                className="text-stone-400 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest py-2"
              >
                Cancel and return
              </button>
            </div>
          </form>
        )}
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
    >
      <div className="mb-8">
        <h2 className="text-2xl font-serif font-bold text-white uppercase italic tracking-tight">
          Login
        </h2>
        <p className="text-stone-400 text-sm mt-1">Access your elite member preferences</p>
      </div>

      {(isRegistered || isVerified) && (
        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
          <p className="text-emerald-400 text-xs font-medium text-center">
            {isVerified
              ? 'Account verified. Welcome to the circle of excellence.'
              : 'Membership requested. Please verify your identity via email.'}
          </p>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest ml-1">
            Email Address
          </label>
          <div className="relative group">
            <Mail
              className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500 group-focus-within:text-primary transition-colors"
              size={18}
            />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-stone-600 focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all"
              placeholder="e.g. excelsior@laube.com"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center mb-1">
            <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest ml-1">
              Password
            </label>
            <button
              type="button"
              onClick={() => {
                setView('forgot-password')
                setError('')
              }}
              className="text-[14px] mb-2 font-bold text-accent hover:text-white transition-colors underline underline-offset-4"
            >
              forget password
            </button>
          </div>
          <div className="relative group">
            <Lock
              className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500 group-focus-within:text-primary transition-colors"
              size={18}
            />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-stone-600 focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all"
              placeholder="••••••••••••"
            />
          </div>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="text-red-400 text-xs font-medium bg-red-500/10 border border-red-500/20 p-3 rounded-xl"
          >
            {error}
          </motion.div>
        )}

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-14 bg-primary text-secondary hover:bg-white border-primary rounded-2xl font-bold uppercase tracking-widest transition-all shadow-xl shadow-primary/10 active:scale-95"
        >
          {isLoading ? (
            <Loader2 className="animate-spin mr-2" />
          ) : (
            <>
              Unlock Portal{' '}
              <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </Button>
      </form>

      <div className="mt-12 pt-8 border-t border-white/5 flex flex-col items-center gap-4">
        <p className="text-stone-500 text-[13px] font-medium tracking-wide">
          Not a member of our circle?
        </p>
        <a
          href="/register"
          className="inline-flex items-center gap-3 text-white/90 hover:text-primary transition-all duration-300 group"
        >
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] border-b border-primary/20 group-hover:border-primary/60 pb-1">
            Request an Account
          </span>
          <svg 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="w-3 h-3 text-primary transition-transform group-hover:translate-x-1"
          >
            <path d="M5 12h14m-7-7 7 7-7 7" />
          </svg>
        </a>
      </div>
    </motion.div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center text-white">
          <Loader2 className="animate-spin mr-2" /> Loading Secure Portal...
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  )
}
