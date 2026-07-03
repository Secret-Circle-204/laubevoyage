'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, Lock, Loader2, ArrowRight, User } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/premium-ui/Button'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        // Redirect to verification instead of login
        router.push(`/verify?email=${encodeURIComponent(email)}`)
      } else {
        const message = data.errors?.[0]?.message || ''
        if (message.includes('The following field is invalid: email')) {
          setError('This email is already registered. Please sign in instead.')
        } else {
          setError(message || 'Could not complete registration. Credentials may already be elite.')
        }
      }
    } catch (_error) {
      setError('An unexpected error occurred. Our concierge is investigating.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
    >
      <div className="mb-8">
        <h2 className="text-2xl font-serif font-bold text-white uppercase italic tracking-tight">
          Request Membership
        </h2>
        <p className="text-stone-400 text-sm mt-1">Initiate your voyage with L&apos;Aube</p>
      </div>

      <form onSubmit={handleRegister} className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest ml-1">
            Full Name
          </label>
          <div className="relative group">
            <User
              className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500 group-focus-within:text-primary transition-colors"
              size={18}
            />
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-stone-600 focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all"
              placeholder="e.g. Julian Laube"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest ml-1">
            Official Email
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
              placeholder="e.g. traveler@luxury.com"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest ml-1">
            Secure Password
          </label>
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
          <p className="text-[9px] text-stone-500 mt-1 italic italic">
            Minimum 8 characters of high entropy required.
          </p>
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
              Join the Circle{' '}
              <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </Button>
      </form>

      <div className="mt-8 pt-8 border-t border-white/10 text-center">
        <p className="text-stone-400 text-xs">
          Already a privileged member?{' '}
          <a href="/login" className="text-primary font-bold hover:text-white transition-colors">
            Sign In
          </a>
        </p>
      </div>
    </motion.div>
  )
}
