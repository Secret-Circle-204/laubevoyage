'use client'

import React, { useState } from 'react'
import type { CustomerLoyaltyPortalDTO } from '@/application/loyalty/dto'
import { Badge } from '@/components/ui'

interface LoyaltyPassCardProps {
  data: CustomerLoyaltyPortalDTO
}

function GemIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
    </svg>
  )
}

function ShieldIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  )
}

export function LoyaltyPassCard({ data }: LoyaltyPassCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-5 sm:p-7 shadow-sm transition-all duration-300 hover:border-secondary/40">
      {/* Top Pass Header: Eyebrow + Tier Badge */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
          <span className="text-xs uppercase text-secondary font-semibold">
            MEMBER PRIVILEGES & REWARDS PASS
          </span>
        </div>
        <Badge
          variant="secondary"
          size="sm"
          className="text-xs uppercase bg-secondary/10 text-secondary border-secondary/25 font-semibold"
        >
          {data.translatedCurrentTier} {data.uiLabels.tierMemberSuffix}
        </Badge>
      </div>

      {/* Main Resting Pass Display */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-5">
        {/* Left: Master Balance */}
        <div className="space-y-1.5">
          <span className="text-xs uppercase text-muted-foreground block font-medium">
            {data.uiLabels.availableBalance}
          </span>
          <div className="flex items-baseline gap-2.5">
            <span className="text-4xl sm:text-5xl font-hornbill font-light text-foreground">
              {data.formattedAvailablePoints}
            </span>
            <span className="text-base sm:text-lg font-bold text-secondary uppercase">
              {data.uiLabels.pointsUnit}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-semibold text-emerald-500">
              {data.uiLabels.cashValuePrefix} {data.pointsMonetaryValue.formatted}
            </span>
            <span>•</span>
            <span>{data.uiLabels.instantCheckoutDiscount}</span>
          </div>
        </div>

        {/* Right: Tier Elevation Summary & Accessible Toggle */}
        <div className="flex flex-col sm:flex-row md:flex-col items-start sm:items-center md:items-end justify-between gap-4 pt-4 md:pt-0 border-t md:border-t-0 border-border/60 flex-shrink-0">
          <div className="space-y-1.5 text-left sm:text-right md:text-right">
            <span className="text-xs uppercase text-muted-foreground block font-medium">
              Tier Elevation
            </span>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-foreground">
                {data.nextTierProgressPercent}% → {data.nextTierName}
              </span>
              <div className="w-24 h-2 rounded-full bg-border/80 overflow-hidden">
                <div
                  className="h-full bg-secondary transition-all duration-500"
                  style={{ width: `${data.nextTierProgressPercent}%` }}
                />
              </div>
            </div>
            <span className="text-xs text-muted-foreground block">
              {data.progressText}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            aria-expanded={isExpanded}
            aria-controls="loyalty-pass-details"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border border-border/80 bg-card-elevated text-foreground hover:border-secondary/40 hover:text-secondary focus-visible:ring-2 focus-visible:ring-secondary cursor-pointer transition-colors"
          >
            <span>Privilege Details</span>
            <span className="font-bold text-xs">{isExpanded ? '−' : '+'}</span>
          </button>
        </div>
      </div>

      {/* Progressive Spatial Disclosure Panel (grid-template-rows: 0fr -> 1fr, zero network requests) */}
      <div
        id="loyalty-pass-details"
        className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
          isExpanded ? 'grid-rows-[1fr] opacity-100 mt-6 pt-6 border-t border-border/60' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden space-y-6">
          {/* 1. Full Tier Elevation Track */}
          <div className="p-4 sm:p-5 rounded-xl bg-card-elevated/70 border border-border/60 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <ShieldIcon className="w-4 h-4 text-secondary" />
                <span>Tier Milestone Track</span>
              </span>
              <span className="text-muted-foreground">
                {data.uiLabels.totalQualifyingSpend}: <strong className="text-foreground">{data.formattedTotalSpentEGP}</strong>
              </span>
            </div>

            {/* Milestone Thresholds */}
            <div className="flex justify-between text-xs text-muted-foreground">
              {data.tierThresholds.map((threshold) => (
                <span key={threshold.tier}>
                  {threshold.translatedTierName} ({threshold.formattedMinSpent})
                </span>
              ))}
            </div>

            <div className="w-full h-2.5 rounded-full bg-border/80 overflow-hidden">
              <div
                className="h-full bg-secondary transition-all duration-500"
                style={{ width: `${data.nextTierProgressPercent}%` }}
              />
            </div>

            <p className="text-xs text-muted-foreground text-right">
              {data.progressText}
            </p>
          </div>

          {/* 2. Points Privilege & Value Guide */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 sm:p-5 rounded-xl bg-card-elevated/70 border border-border/60 text-xs">
            <div className="space-y-1 max-w-xl">
              <div className="flex items-center gap-2">
                <GemIcon className="w-4 h-4 text-secondary" />
                <h3 className="font-semibold text-foreground text-sm">
                  {data.pointsValueGuide.title}
                </h3>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                {data.pointsValueGuide.description}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 self-stretch md:self-auto justify-between md:justify-end">
              <div className="px-3 py-2 rounded-xl bg-card border border-border/80 text-center">
                <span className="text-[11px] text-muted-foreground uppercase block font-medium">
                  {data.uiLabels.officialRate}
                </span>
                <span className="text-xs font-bold text-foreground">
                  {data.pointsValueGuide.unitText}
                </span>
              </div>

              <div className="px-3 py-2 rounded-xl bg-card border border-border/80 text-center">
                <span className="text-[11px] text-muted-foreground uppercase block font-medium">
                  {data.uiLabels.yourPointsValue}
                </span>
                <span className="text-xs font-bold text-emerald-500">
                  {data.pointsMonetaryValue.formatted}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Held Points Notice (if any) */}
          {data.heldPoints > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-500 text-xs">
              {data.uiLabels.heldPointsNotice}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
