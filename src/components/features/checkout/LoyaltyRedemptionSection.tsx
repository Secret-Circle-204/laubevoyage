'use client'

import React from 'react'
import { Card, Badge } from '@/components/ui'
import { JsonTranslationDictionary } from '@/domains/translation/dictionary'
import type { ConvertedPrice } from '@/domains/currency/types'

const dict = new JsonTranslationDictionary()

export interface PricingPreviewState {
  unitPrice: ConvertedPrice
  totalPrice: ConvertedPrice
  originalPrice?: ConvertedPrice
  loyaltyDiscountPrice?: ConvertedPrice
  estimatedEarnPoints?: number
  remainingLoyaltyPoints?: number
}

interface LoyaltyRedemptionSectionProps {
  availableLoyaltyPoints: number
  minRedemptionPoints: number
  redemptionStepUnit: number
  applyPoints: boolean
  pointsToRedeem: number | string
  previewPricing: PricingPreviewState | null
  isRepricing: boolean
  effectivePricingError: string | null
  onToggleApplyPoints: (checked: boolean) => void
  onChangePointsToRedeem: (value: number | string) => void
  locale: string
}

export function LoyaltyRedemptionSection({
  availableLoyaltyPoints,
  minRedemptionPoints,
  redemptionStepUnit,
  applyPoints,
  pointsToRedeem,
  previewPricing,
  isRepricing,
  effectivePricingError,
  onToggleApplyPoints,
  onChangePointsToRedeem,
  locale,
}: LoyaltyRedemptionSectionProps) {
  if (availableLoyaltyPoints <= 0) {
    return null
  }

  const applyLoyaltyTitle = dict.get(locale, 'checkout.applyLoyaltyPoints') || 'Loyalty Points Redemption'

  const currentPointsNum =
    applyPoints && pointsToRedeem !== '' && typeof pointsToRedeem === 'number'
      ? pointsToRedeem
      : applyPoints && pointsToRedeem !== '' && !isNaN(Number(pointsToRedeem))
        ? Number(pointsToRedeem)
        : 0

  return (
    <Card variant="flat" padding="lg" className="border border-border/80 bg-card rounded-2xl shadow-xs">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3 pb-4 border-b border-border/60">
        <div className="flex items-center gap-3.5">
          <span className="w-9 h-9 rounded-full bg-secondary text-background text-sm font-hornbill font-bold flex items-center justify-center shrink-0 shadow-xs">
            03
          </span>
          <div>
            <span className="text-[10px] text-secondary uppercase font-semibold block">
              MEMBER PRIVILEGES
            </span>
            <h2 className="text-xl sm:text-2xl font-hornbill font-light text-foreground tracking-tight">
              {applyLoyaltyTitle}
            </h2>
          </div>
        </div>
        <Badge variant="secondary" size="sm" className="text-xs border border-secondary/25 bg-secondary/10 text-secondary font-semibold">
          {availableLoyaltyPoints.toLocaleString()} Points Available
        </Badge>
      </div>

      <div className="flex flex-col gap-4">
        <label className="flex items-center gap-3.5 cursor-pointer select-none p-4 rounded-2xl bg-card-elevated/70 border border-border/70 hover:border-secondary/40 transition-colors">
          <input
            type="checkbox"
            checked={applyPoints}
            onChange={(e) => {
              onToggleApplyPoints(e.target.checked)
              if (e.target.checked && pointsToRedeem === '') {
                onChangePointsToRedeem(minRedemptionPoints)
              }
            }}
            className="w-4 h-4 rounded border-border text-secondary focus:ring-secondary accent-secondary bg-background cursor-pointer"
          />
          <span className="text-xs sm:text-sm font-medium text-foreground">
            Redeem verified member points for an immediate credit toward this reservation
          </span>
        </label>

        {applyPoints && (
          <div className="pt-2 pl-1 sm:pl-7 flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="number"
                min={minRedemptionPoints}
                max={availableLoyaltyPoints}
                step={redemptionStepUnit}
                value={pointsToRedeem}
                onChange={(e) => {
                  const raw = e.target.value
                  onChangePointsToRedeem(raw === '' ? '' : Number(raw))
                }}
                className="w-44 px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-border bg-card-elevated text-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-secondary"
              />
              <span className="text-xs text-muted-foreground font-medium">
                (Multiples of {redemptionStepUnit} pts)
              </span>
            </div>

            <div className="pt-3 border-t border-border/60 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-card-elevated/70 border border-border/70">
                <span className="text-muted-foreground block mb-1 text-[11px] uppercase font-semibold">
                  Points Applied
                </span>
                <span className="font-bold text-foreground text-sm">
                  {currentPointsNum.toLocaleString()} pts
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-card-elevated/70 border border-border/70">
                <span className="text-muted-foreground block mb-1 text-[11px] uppercase font-semibold">
                  Credit Value
                </span>
                <span className="font-bold text-secondary text-sm">
                  {previewPricing?.loyaltyDiscountPrice
                    ? previewPricing.loyaltyDiscountPrice.formatted
                    : isRepricing
                      ? 'Calculating...'
                      : '—'}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-card-elevated/70 border border-border/70">
                <span className="text-muted-foreground block mb-1 text-[11px] uppercase font-semibold">
                  Remaining Balance
                </span>
                <span className="font-bold text-foreground text-sm">
                  {previewPricing?.remainingLoyaltyPoints !== undefined
                    ? `${previewPricing.remainingLoyaltyPoints.toLocaleString()} pts`
                    : isRepricing
                      ? '...'
                      : `${availableLoyaltyPoints.toLocaleString()} pts`}
                </span>
              </div>
            </div>

            {effectivePricingError && (
              <div className="text-xs text-accent bg-accent/10 p-3 rounded-xl border border-accent/30 font-medium">
                {effectivePricingError}
              </div>
            )}

            <p className="text-[11px] text-muted-foreground italic">
              * Points credit is calculated server-side and applied authoritatively to the booking ledger upon confirmation.
            </p>
          </div>
        )}
      </div>
    </Card>
  )
}
