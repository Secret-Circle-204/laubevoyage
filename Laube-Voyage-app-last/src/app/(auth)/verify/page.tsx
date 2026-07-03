'use client'

import { useState, Suspense } from 'react'
import { motion } from 'framer-motion'
import { ShieldCheck, Loader2, ArrowRight } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/premium-ui/Button'

function VerifyContent() {
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/users/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          code,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(true)
        setTimeout(() => {
          router.push('/login?verified=true')
        }, 3000)
      } else {
        setError(data.error || 'The secure key entered is invalid.')
      }
    } catch (_error) {
      setError('Communication with the vault failed. Please retry.')
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
          Identity Vault
        </h2>
        <p className="text-stone-400 text-sm mt-1">
          Enter the 6-digit secure key sent to your email.
        </p>
        <p className="text-primary/60 text-[10px] mt-1 font-bold">{email}</p>
      </div>

      {!success ? (
        <form onSubmit={handleVerify} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest ml-1">
              Secure Key
            </label>
            <div className="relative group">
              <ShieldCheck
                className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500 group-focus-within:text-primary transition-colors"
                size={18}
              />
              <input
                type="text"
                required
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-stone-600 focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all text-center text-2xl tracking-[0.5em] font-mono"
                placeholder="000000"
              />
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="text-red-400 text-xs font-medium bg-red-500/10 border border-red-500/20 p-3 rounded-xl text-center"
            >
              {error}
            </motion.div>
          )}

          <Button
            type="submit"
            disabled={isLoading || code.length !== 6}
            className="w-full h-14 bg-primary text-secondary hover:bg-white border-primary rounded-2xl font-bold uppercase tracking-widest transition-all shadow-xl shadow-primary/10 active:scale-95 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="animate-spin mr-2" />
            ) : (
              <>
                Validate Identity <ArrowRight className="ml-2" />
              </>
            )}
          </Button>
        </form>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-emerald-500/10 border border-emerald-500/20 p-8 rounded-3xl text-center space-y-4"
        >
          <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
            <ShieldCheck className="text-secondary" size={32} />
          </div>
          <h3 className="text-xl font-serif text-white uppercase italic">
            Verification Successful
          </h3>
          <p className="text-stone-400 text-sm">
            Your membership is now active. Redirecting to the secure entrance...
          </p>
        </motion.div>
      )}

      <div className="mt-8 pt-8 border-t border-white/10 text-center text-stone-500 text-[10px] uppercase tracking-widest">
        Security System Powered by L&apos;Aube Voyage
      </div>
    </motion.div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="text-white text-center py-20 uppercase tracking-widest animate-pulse">
          Synchronizing Identities...
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  )
}
