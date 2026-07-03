import { headers } from 'next/headers'
import {
  ArrowUpRight,
  ArrowDownRight,
  Award,
  ShieldCheck,
  Zap,
  Diamond,
  Gem,
  BookOpen,
} from 'lucide-react'
import TierVisualizer from '@/components/dashboard/TierVisualizer'
import Link from 'next/link'
import { getLoyaltyConfig } from '@/services/loyaltyConfig'
import {
  getCurrentUser,
  getDashboardAllPoints,
  getDashboardPointsSummary,
} from '@/services/dashboard'
import type { User, LoyaltyPoint } from '@/payload-types'

// User-friendly label for transaction type
function getTypeLabel(t: LoyaltyPoint): string {
  if (t.type === 'earned') return 'Booking Reward'
  if (t.type === 'redeemed') return 'Points Used'
  // admin type — determine by direction
  if (t.points > 0) return 'Bonus Credit'
  return 'Points Redeemed'
}

// Clean system-internal prefixes from reason text
function cleanReason(reason: string | null | undefined): string {
  if (!reason) return 'Loyalty Reward'
  return (
    reason
      .replace(/^\[HOLD\]\s*/i, '')
      .replace(/^\[RESTORED\]\s*/i, '')
      .replace(/^\[REFUND\]\s*/i, '')
      .replace(/^\[AUTO\]\s*/i, '')
      .trim() || 'Loyalty Reward'
  )
}

export default async function MyPointsPage() {
  const user = await getCurrentUser(await headers())

  if (!user) return null

  // Fetch points log, points summary and loyalty configuration concurrently
  const [transactions, pointsSummary, loyaltyConfig] = await Promise.all([
    getDashboardAllPoints(user.id),
    getDashboardPointsSummary(user.id),
    getLoyaltyConfig(),
  ])

  const lifetimeEarned = pointsSummary.totalEarned
  const lifetimeRedeemed = pointsSummary.totalRedeemed

  const typedUser = user as User
  const totalSpend = typedUser.totalSpend || 0
  const currentPoints = typedUser.loyaltyPoints || 0
  const currentTier = (typedUser.loyaltyTier || 'traveler') as 'traveler' | 'explorer' | 'voyager'

  const redemptionTiers = loyaltyConfig.redemptionTiers

  const benefits = [
    {
      tier: 'traveler',
      label: `${loyaltyConfig.earning.pointsPerDollar * 10} pt / $10`,
      icon: Award,
      desc: `Earn ${loyaltyConfig.earning.pointsPerDollar * 10} point for every $10 spent on luxury bookings.`,
    },
    {
      tier: 'explorer',
      label: `${loyaltyConfig.earning.explorerMultiplier}x Points`,
      icon: Zap,
      desc: `Priority support and ${Math.round((loyaltyConfig.earning.explorerMultiplier - 1) * 100)}% bonus points on all adventures.`,
    },
    {
      tier: 'voyager',
      label: `${loyaltyConfig.earning.voyagerMultiplier}x Points`,
      icon: Diamond,
      desc: `Exclusive lounge access and ${Math.round((loyaltyConfig.earning.voyagerMultiplier - 1) * 100)}% bonus points.`,
    },
  ]

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-serif font-bold text-secondary dark:text-white tracking-tighter uppercase italic">
            Loyalty Hub
          </h1>
          <p className="text-stone-500 dark:text-stone-400 mt-2 font-medium">
            Manage your rewards and track your path to exclusive privileges.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Tier Progression */}
        <div className="lg:col-span-12">
          <TierVisualizer
            currentTier={currentTier}
            totalSpend={totalSpend}
            pointsEarned={lifetimeEarned}
          />
        </div>

        {/* Points Summary Cards */}
        <div className="lg:col-span-12 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-white/5 rounded-3xl p-8 border border-stone-100 dark:border-white/10 shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <Gem size={16} className="text-primary" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">
                Available Balance
              </span>
            </div>
            <p className="text-4xl font-serif font-bold text-secondary dark:text-white tracking-tighter">
              {currentPoints.toLocaleString()}
            </p>
            <p className="text-xs text-stone-400 mt-1">points ready to use</p>
          </div>
          <div className="bg-white dark:bg-white/5 rounded-3xl p-8 border border-stone-100 dark:border-white/10 shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <ArrowUpRight size={16} className="text-emerald-500" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">
                Lifetime Earned
              </span>
            </div>
            <p className="text-4xl font-serif font-bold text-emerald-500 tracking-tighter">
              +{lifetimeEarned.toLocaleString()}
            </p>
            <p className="text-xs text-stone-400 mt-1">points from all trips</p>
          </div>
          <div className="bg-white dark:bg-white/5 rounded-3xl p-8 border border-stone-100 dark:border-white/10 shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <ArrowDownRight size={16} className="text-primary" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">
                Total Redeemed
              </span>
            </div>
            <p className="text-4xl font-serif font-bold text-primary tracking-tighter">
              -{lifetimeRedeemed.toLocaleString()}
            </p>
            <p className="text-xs text-stone-400 mt-1">points used for discounts</p>
          </div>
        </div>

        {/* Points Value Table */}
        <div className="lg:col-span-12">
          <div className="bg-white dark:bg-[#121212]/50 backdrop-blur-3xl rounded-[40px] p-10 border border-stone-100 dark:border-white/5 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -mr-32 -mt-32" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <BookOpen size={20} className="text-primary" />
                <h3 className="text-2xl font-serif font-bold text-secondary dark:text-white uppercase tracking-tighter italic">
                  Points Value Guide
                </h3>
              </div>
              <p className="text-sm text-stone-500 dark:text-stone-400 font-medium mb-10">
                Use your points directly at checkout — no codes, no hassle. Just select your tier
                and save instantly.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {redemptionTiers.map((tier: { points: number; discountValue: number }) => {
                  const isAvailable = currentPoints >= tier.points
                  const pointsNeeded = tier.points - currentPoints

                  return (
                    <div
                      key={tier.points}
                      className={`relative rounded-3xl p-8 border-2 transition-all duration-500 group ${
                        isAvailable
                          ? 'border-primary/30 bg-primary/5 dark:bg-primary/10 hover:border-primary hover:shadow-xl hover:shadow-primary/10'
                          : 'border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-white/5 opacity-70'
                      }`}
                    >
                      {isAvailable && (
                        <div className="absolute -top-3 right-6 px-3 py-1 bg-primary text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg">
                          Available
                        </div>
                      )}
                      <p className="text-4xl font-serif font-bold text-secondary dark:text-white tracking-tighter mb-1">
                        {tier.points.toLocaleString()}
                      </p>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 mb-6">
                        Points
                      </p>

                      <div className="w-full h-px bg-stone-200 dark:bg-white/10 mb-6" />

                      <p className="text-3xl font-serif font-bold text-primary tracking-tighter mb-1">
                        ${tier.discountValue}
                      </p>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">
                        Discount Value
                      </p>

                      {!isAvailable && (
                        <p className="mt-6 text-xs font-bold text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-white/5 rounded-xl px-4 py-2 text-center">
                          Need {pointsNeeded.toLocaleString()} more pts
                        </p>
                      )}
                      {isAvailable && (
                        <Link href="/packages" className="block mt-6">
                          <div className="text-xs font-bold text-primary bg-primary/10 rounded-xl px-4 py-2 text-center hover:bg-primary/20 transition-colors cursor-pointer uppercase tracking-widest">
                            Book & Save →
                          </div>
                        </Link>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Benefits Grid */}
        <div className="lg:col-span-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {benefits.map((b) => (
              <div
                key={b.tier}
                className={`p-8 rounded-[32px] border transition-all duration-500 ${
                  currentTier === b.tier
                    ? 'bg-white dark:bg-white/5 border-primary shadow-xl shadow-primary/5'
                    : 'bg-stone-50 dark:bg-black/20 border-stone-100 dark:border-white/5'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 shadow-lg ${
                    currentTier === b.tier
                      ? 'bg-primary text-white'
                      : 'bg-stone-200 dark:bg-white/10 text-stone-500'
                  }`}
                >
                  <b.icon size={24} />
                </div>
                <h4 className="text-xl font-serif font-bold text-secondary dark:text-white uppercase italic">
                  {b.label}
                </h4>
                <p className="text-stone-500 dark:text-stone-400 mt-2 text-sm leading-relaxed">
                  {b.desc}
                </p>
                {currentTier === b.tier && (
                  <div className="mt-6 flex items-center gap-2 text-primary font-bold text-[10px] uppercase tracking-widest">
                    <ShieldCheck size={14} /> Active Benefit
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Activity Log */}
        <div className="lg:col-span-12">
          <div className="bg-white dark:bg-[#121212]/50 backdrop-blur-3xl rounded-[40px] p-10 border border-stone-100 dark:border-white/5 shadow-2xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
              <div>
                <h3 className="text-2xl font-serif font-bold text-secondary dark:text-white uppercase tracking-tighter italic">
                  Activity Log
                </h3>
                <p className="text-sm text-stone-500 dark:text-stone-400 font-medium">
                  A detailed history of your points earned and redeemed.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {transactions.length > 0 ? (
                transactions.map((t) => (
                  <div
                    key={t.id}
                    className="group flex items-center justify-between p-6 bg-stone-50/50 dark:bg-white/5 border border-stone-100 dark:border-white/5 hover:border-primary/30 transition-all duration-500 relative"
                  >
                    <div className="flex items-center gap-8">
                      <div className="text-center min-w-[60px]">
                        <span className="block text-[10px] uppercase font-black tracking-widest text-stone-400">
                          {new Date(t.createdAt).toLocaleString('en-US', { month: 'short' })}
                        </span>
                        <span className="block text-2xl font-serif font-bold text-secondary dark:text-white">
                          {new Date(t.createdAt).getDate()}
                        </span>
                      </div>

                      <div className="w-px h-10 bg-stone-200 dark:bg-white/10 hidden md:block" />

                      <div className="flex items-center gap-6">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ${
                            t.points > 0
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : 'bg-primary/10 text-primary'
                          }`}
                        >
                          {t.points > 0 ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                        </div>
                        <div>
                          <span
                            className={`text-[10px] font-black uppercase tracking-widest ${
                              t.points > 0 ? 'text-emerald-500' : 'text-primary'
                            }`}
                          >
                            {getTypeLabel(t)}
                          </span>
                          <h4 className="text-lg font-serif font-bold text-secondary dark:text-white leading-tight">
                            {cleanReason(t.reason)}
                          </h4>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div
                        className={`text-2xl font-serif font-bold ${
                          t.points > 0 ? 'text-emerald-500' : 'text-primary'
                        }`}
                      >
                        {t.points > 0 ? '+' : ''}
                        {t.points.toLocaleString()}
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">
                        Points
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-24 text-center">
                  <div className="w-20 h-20 bg-stone-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Award size={32} className="text-stone-300" />
                  </div>
                  <p className="text-stone-400 font-serif italic">
                    Your rewards legacy begins with your first voyage.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
