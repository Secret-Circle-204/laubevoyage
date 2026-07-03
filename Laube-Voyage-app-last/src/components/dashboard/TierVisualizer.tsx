'use client'

import { motion } from 'framer-motion'
import { Award, Star, Crown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/premium-ui/Button'

interface TierVisualizerProps {
  currentTier: 'traveler' | 'explorer' | 'voyager'
  totalSpend: number
  pointsEarned?: number
}

const TIERS = [
  {
    id: 'traveler',
    label: 'Traveler',
    threshold: 0,
    icon: Award,
    color: 'from-stone-400 to-stone-500',
  },
  {
    id: 'explorer',
    label: 'Explorer',
    threshold: 5000,
    icon: Star,
    color: 'from-primary to-orange-400',
  },
  {
    id: 'voyager',
    label: 'Voyager',
    threshold: 15000,
    icon: Crown,
    color: 'from-secondary to-[#2E3192]',
  },
]

export default function TierVisualizer({
  currentTier,
  totalSpend,
  pointsEarned,
}: TierVisualizerProps) {
  const currentTierIndex = TIERS.findIndex((t) => t.id === currentTier)
  const nextTier = TIERS[currentTierIndex + 1]

  const progress = nextTier ? Math.min(100, (totalSpend / nextTier.threshold) * 100) : 100

  const displayedPointsEarned = pointsEarned ?? Math.floor(totalSpend * 0.1)

  return (
    <div className="bg-white dark:bg-[#121212]/50 backdrop-blur-3xl rounded-[40px] p-10 border border-stone-100 dark:border-white/5 shadow-2xl relative overflow-hidden group">
      {/* Decorative Aura */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -mr-32 -mt-32" />

      <div className="flex items-center justify-between mb-12 relative z-10">
        <div>
          <h3 className="text-2xl font-serif font-bold text-secondary dark:text-white uppercase tracking-tighter italic">
            L&apos;AUBE Privileges
          </h3>
          <p className="text-sm text-stone-500 dark:text-stone-400 font-medium mt-1">
            Elevating your journey through our exclusive tiers.
          </p>
        </div>
        <div className="px-6 py-2 rounded-none bg-linear-to-r from-primary to-orange-500 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/20">
          Current Tier: {currentTier}
        </div>
      </div>

      <div className="relative pt-12 pb-10 px-6">
        {/* Progress Background */}
        <div className="absolute top-[55.5px] left-0 right-0 h-2 bg-stone-100 dark:bg-white/5 rounded-full overflow-hidden">
          {/* Subtle Base Pulse */}
          <motion.div
            animate={{ opacity: [0.1, 0.3, 0.1] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="absolute inset-0 bg-primary/20"
          />
        </div>

        {/* Glowing Progress Line */}
        <div className="absolute top-[55.5px] left-0 right-0 h-2 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 2, ease: [0.22, 1, 0.36, 1] }}
            className="h-full bg-linear-to-r from-primary via-orange-400 to-secondary relative shadow-[0_0_20px_rgba(245,130,32,0.5)]"
          >
            {/* White Shine Animation */}
            <motion.div
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 bg-linear-to-r from-transparent via-white/30 to-transparent w-1/2"
            />
          </motion.div>
        </div>

        {/* Tier Nodes */}
        <div className="relative flex justify-between items-center">
          {TIERS.map((tier, index) => {
            const Icon = tier.icon
            const isActive = index <= currentTierIndex
            const isNext = index === currentTierIndex + 1

            return (
              <div key={tier.id} className="flex flex-col items-center relative z-10">
                <motion.div
                  initial={false}
                  animate={{
                    scale: isActive ? 1.15 : 1,
                    boxShadow: isActive ? '0 10px 30px -5px rgba(245,130,32,0.3)' : 'none',
                  }}
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center border-4 transition-all duration-700 ${
                    isActive
                      ? 'bg-linear-to-br from-primary to-orange-600 border-white dark:border-[#1A1A1A] text-white'
                      : isNext
                        ? 'bg-white dark:bg-white/10 border-primary/30 text-primary dark:text-primary animate-pulse'
                        : 'bg-stone-100 dark:bg-white/5 border-transparent text-stone-400 dark:text-stone-700'
                  }`}
                >
                  <Icon size={24} />
                </motion.div>

                <div className="mt-6 text-center">
                  <p
                    className={`text-[11px] font-black uppercase tracking-[0.25em] ${
                      isActive
                        ? 'text-stone-900 dark:text-white'
                        : 'text-stone-400 dark:text-stone-700'
                    }`}
                  >
                    {tier.label}
                  </p>
                  {isNext && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2"
                    >
                      <span className="text-[10px] bg-primary/10 text-primary px-3 py-1 rounded-full font-black uppercase tracking-widest">
                        ${(tier.threshold - totalSpend).toLocaleString()} to unlock
                      </span>
                    </motion.div>
                  )}
                  {isActive && index === currentTierIndex && (
                    <div className="w-1.5 h-1.5 bg-primary rounded-full mx-auto mt-2 shadow-[0_0_8px_var(--color-primary)]" />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-10 pt-10 border-t border-stone-100 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
        <div className="flex gap-16">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-stone-400 dark:text-stone-500 uppercase tracking-[0.3em]">
              Total Investment
            </p>
            <p className="text-3xl font-serif font-bold text-secondary dark:text-white tracking-tighter italic">
              ${totalSpend.toLocaleString()}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-stone-400 dark:text-stone-500 uppercase tracking-[0.3em]">
              Points Earned
            </p>
            <p className="text-3xl font-serif font-bold text-primary tracking-tighter italic">
              {displayedPointsEarned.toLocaleString()}{' '}
              <span className="text-xs font-sans uppercase tracking-[0.2em] font-black ml-1 text-stone-500">
                Pts
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            className="rounded-none border-accent-dark text-accent-dark dark:text-white  dark:bg-accent-dark dark:border-white/10 text-[10px] font-black uppercase tracking-widest px-8"
          >
            Benefit Details
          </Button>
          <Button className="rounded-none bg-secondary text-white border-none text-[10px] font-black uppercase tracking-widest px-8 shadow-xl shadow-secondary/20 hover:scale-105 transition-transform">
            Path to Excellence <ChevronRight size={14} className="ml-2" />
          </Button>
        </div>
      </div>
    </div>
  )
}
