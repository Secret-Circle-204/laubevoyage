'use client'

import React, { useState } from 'react'
import type { LoyaltyLedgerRecordDTO } from '@/application/loyalty/dto'

interface LoyaltyLedgerRowProps {
  record: LoyaltyLedgerRecordDTO
  pointsUnit: string
}

function getTypeLabel(type: string): string {
  switch (type.toLowerCase()) {
    case 'welcome_bonus':
      return 'Welcome Bonus'
    case 'tier_bonus':
      return 'Tier Bonus'
    case 'earn':
    case 'earned':
      return 'Voyage Reward'
    case 'redeem':
    case 'redeemed':
      return 'Checkout Redemption'
    case 'refund':
    case 'refunded':
      return 'Refund Credit'
    case 'reverse':
    case 'reversed':
      return 'Adjustment Reversal'
    case 'expiration':
    case 'expired':
      return 'Points Expiration'
    case 'manual_adjustment':
      return 'Admin Adjustment'
    default:
      return type.replace(/_/g, ' ').toUpperCase()
  }
}

export function LoyaltyLedgerRow({ record, pointsUnit }: LoyaltyLedgerRowProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const typeLabel = getTypeLabel(record.type)

  const dateObj = new Date(record.createdAt)
  const monthStr = dateObj.toLocaleDateString('en-US', { month: 'short' })
  const dayStr = dateObj.getDate()
  const fullDateStr = dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="group relative overflow-hidden rounded-xl border border-border/80 bg-card p-4 sm:p-5 transition-all duration-300 hover:border-accent/40 shadow-xs">
      {/* Resting State Ledger Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left Segment: Date Block + Direction Icon + Type/Reason Hierarchy */}
        <div className="flex items-center gap-4 min-w-0">
          {/* 1. Date Block (Fixed Geometry) */}
          <div className="text-center min-w-[48px] sm:min-w-[54px] shrink-0">
            <span className="block text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
              {monthStr}
            </span>
            <span className="block text-xl sm:text-2xl font-hornbill font-light text-foreground leading-tight">
              {dayStr}
            </span>
          </div>

          {/* Vertical Divider */}
          <div className="w-px h-9 bg-border/60 hidden sm:block shrink-0" />

          {/* 2. Direction Indicator (2 Semantic Colors Max: Emerald for Credit, Orange/Primary for Debit) */}
          <div
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              record.isPositive
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                : 'bg-accent/10 text-accent border-accent/20'
            }`}
          >
            {record.isPositive ? (
              <svg className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
              </svg>
            ) : (
              <svg className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 4.5l-15 15m0 0h11.25m-11.25 0V8.25" />
              </svg>
            )}
          </div>

          {/* 3. Text Hierarchy: Crisp Type Header + Clean Reason (No variable pill backgrounds) */}
          <div className="min-w-0">
            <span className="block text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {typeLabel}
            </span>
            <h4 className="text-sm font-medium text-foreground truncate max-w-[280px] sm:max-w-[340px] md:max-w-[420px] mt-0.5">
              {record.reason || typeLabel}
            </h4>
          </div>
        </div>

        {/* Right Segment: Points Delta & Accessible Details Toggle */}
        <div className="flex items-center justify-between sm:justify-end gap-4 pt-3 sm:pt-0 border-t sm:border-t-0 border-border/50 shrink-0">
          <div className="text-left sm:text-right">
            <div
              className={`text-base sm:text-lg font-hornbill font-semibold ${
                record.isPositive ? 'text-emerald-500' : 'text-accent'
              }`}
            >
              {record.isPositive ? `+${record.points}` : record.points}{' '}
              <span className="text-xs uppercase font-medium text-muted-foreground">
                {pointsUnit}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            aria-expanded={isExpanded}
            aria-controls={`ledger-row-details-${record.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-border/80 bg-card hover:border-accent/40 hover:text-accent focus-visible:ring-2 focus-visible:ring-accent cursor-pointer transition-colors"
          >
            <span>Details</span>
            <span className="font-bold text-xs" aria-hidden="true">
              {isExpanded ? '−' : '+'}
            </span>
          </button>
        </div>
      </div>

      {/* Progressive Spatial Disclosure Panel (grid-template-rows: 0fr -> 1fr, zero network requests) */}
      <div
        id={`ledger-row-details-${record.id}`}
        className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
          isExpanded ? 'grid-rows-[1fr] opacity-100 mt-4 pt-4 border-t border-border/60' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-card-elevated/70 p-4 rounded-xl border border-border/70 text-xs">
            <div>
              <span className="text-[10px] uppercase text-muted-foreground block mb-1 font-semibold tracking-wider">
                Full Description
              </span>
              <span className="font-medium text-foreground block leading-relaxed">
                {record.reason || typeLabel}
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase text-muted-foreground block mb-1 font-semibold tracking-wider">
                Recorded Date
              </span>
              <span className="font-medium text-foreground block">
                {fullDateStr}
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase text-muted-foreground block mb-1 font-semibold tracking-wider">
                Audit Reference ID
              </span>
              <span className="text-xs text-accent font-bold block">
                #{record.id}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
