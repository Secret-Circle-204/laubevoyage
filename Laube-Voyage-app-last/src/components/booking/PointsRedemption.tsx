'use client'

import { useState } from 'react'
import { Coins, Gift, Check, AlertCircle } from 'lucide-react'

// نظام تحويل النقاط للخصومات
// Points to discount conversion system
const REDEMPTION_TIERS = [
  { points: 500, discount: 25 },
  { points: 1000, discount: 55 },
  { points: 2000, discount: 120 },
  { points: 5000, discount: 350 },
] as const

interface PointsRedemptionProps {
  userPoints: number
  totalPrice: number
  onRedemptionChange: (points: number, discount: number) => void
  isDark?: boolean
}

/**
 * مكون استبدال النقاط - يتيح للمستخدم استخدام نقاطه للحصول على خصم
 * Points Redemption Component - Allows users to apply points for discount
 */
export function PointsRedemption({
  userPoints,
  totalPrice,
  onRedemptionChange,
  isDark = false,
}: PointsRedemptionProps) {
  const [selectedTier, setSelectedTier] = useState<number | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)

  // الحصول على الـ Tiers المتاحة للمستخدم
  const availableTiers = REDEMPTION_TIERS.filter((tier) => userPoints >= tier.points)

  // أفضل خيار متاح (الأعلى قيمة يمكن للمستخدم تحمله)
  const _bestAvailableTier =
    availableTiers.length > 0 ? availableTiers[availableTiers.length - 1] : null

  const handleSelect = (points: number, discount: number) => {
    if (selectedTier === points) {
      // إلغاء الاختيار
      setSelectedTier(null)
      onRedemptionChange(0, 0)
    } else {
      // اختيار tier جديد
      // التأكد من أن الخصم لا يتجاوز السعر الإجمالي
      const finalDiscount = Math.min(discount, totalPrice)
      setSelectedTier(points)
      onRedemptionChange(points, finalDiscount)
    }
  }

  if (userPoints < 500) {
    // لا يملك نقاط كافية للاستبدال
    return (
      <div
        className={`p-4 rounded-2xl border ${isDark ? 'border-white/10 bg-white/5' : 'border-gray/10 bg-gray/5'}`}
      >
        <div className="flex items-center gap-3">
          <Coins className="text-gray/40" size={18} />
          <div>
            <p className={`text-sm font-medium ${isDark ? 'text-white/60' : 'text-gray/60'}`}>
              Loyalty Points
            </p>
            <p className="text-xs text-gray/40">
              You have {userPoints} points. Earn {500 - userPoints} more to unlock discounts!
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`rounded-2xl border overflow-hidden transition-all ${
        selectedTier
          ? 'border-primary bg-primary/5'
          : isDark
            ? 'border-white/10 bg-white/5'
            : 'border-gray/10 bg-gray/5'
      }`}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              selectedTier ? 'bg-primary text-white' : 'bg-gray/10 text-gray/60'
            }`}
          >
            {selectedTier ? <Check size={18} /> : <Gift size={18} />}
          </div>
          <div className="text-left">
            <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-dark'}`}>
              {selectedTier ? 'Points Applied!' : 'Use Your Points'}
            </p>
            <p className="text-xs text-gray/60">
              {selectedTier
                ? `${selectedTier} points → $${REDEMPTION_TIERS.find((t) => t.points === selectedTier)?.discount} off`
                : `${userPoints.toLocaleString()} points available`}
            </p>
          </div>
        </div>
        <div
          className={`text-xs font-bold uppercase tracking-widest ${
            selectedTier ? 'text-primary' : 'text-gray/40'
          }`}
        >
          {isExpanded ? 'Hide' : selectedTier ? 'Change' : 'Apply'}
        </div>
      </button>

      {/* Expanded Options */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          <div className="h-px bg-gray/10" />

          {REDEMPTION_TIERS.map((tier) => {
            const isAvailable = userPoints >= tier.points
            const isSelected = selectedTier === tier.points
            const wouldExceedPrice = tier.discount > totalPrice

            return (
              <button
                key={tier.points}
                disabled={!isAvailable}
                onClick={() => handleSelect(tier.points, tier.discount)}
                className={`w-full p-3 rounded-xl flex items-center justify-between transition-all ${
                  isSelected
                    ? 'bg-primary/20 border-2 border-primary'
                    : isAvailable
                      ? 'bg-white/50 dark:bg-white/5 border border-gray/10 hover:border-primary/30'
                      : 'bg-gray/5 border border-gray/5 opacity-40 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                      isSelected
                        ? 'bg-primary text-white'
                        : isAvailable
                          ? 'bg-gray/10 text-gray/60'
                          : 'bg-gray/5 text-gray/30'
                    }`}
                  >
                    {isSelected ? <Check size={14} /> : <Coins size={14} />}
                  </div>
                  <div className="text-left">
                    <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-dark'}`}>
                      {tier.points.toLocaleString()} Points
                    </p>
                    {wouldExceedPrice && isAvailable && (
                      <p className="text-[10px] text-amber-500 flex items-center gap-1">
                        <AlertCircle size={10} />
                        Applied as ${totalPrice} (max)
                      </p>
                    )}
                  </div>
                </div>
                <div
                  className={`text-lg font-serif font-bold ${
                    isSelected ? 'text-primary' : isAvailable ? 'text-secondary' : 'text-gray/30'
                  }`}
                >
                  ${wouldExceedPrice ? totalPrice : tier.discount} off
                </div>
              </button>
            )
          })}

          {selectedTier && (
            <button
              onClick={() => handleSelect(selectedTier, 0)}
              className="w-full py-2 text-xs text-gray/50 hover:text-red-500 transition-colors"
            >
              Remove discount
            </button>
          )}
        </div>
      )}
    </div>
  )
}
