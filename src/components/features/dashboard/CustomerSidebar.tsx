'use client'

import React, { useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Badge } from '@/components/ui'
import type { CustomerSidebarDTO } from '@/application/dashboard/dto'

export interface CustomerSidebarProps {
  data: CustomerSidebarDTO
  unreadCount?: number
}

function NavIcon({ href, className = 'w-4 h-4' }: { href: string; className?: string }) {
  switch (href) {
    case '/dashboard':
      // Horizon / Compass
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <circle cx="12" cy="12" r="9" />
          <polygon points="12 7 15 12 12 17 9 12 12 7" stroke="currentColor" fill="currentColor" fillOpacity={0.15} />
        </svg>
      )
    case '/dashboard/bookings':
      // Travel Luggage
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <rect x="5" y="7" width="14" height="13" rx="2" />
          <path d="M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2" />
          <line x1="12" y1="11" x2="12" y2="15" />
          <line x1="9" y1="20" x2="9" y2="21" />
          <line x1="15" y1="20" x2="15" y2="21" />
        </svg>
      )
    case '/dashboard/loyalty':
      // Faceted Jewel / Tier Crown
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path d="M6 9l6-6 6 6-6 12L6 9z" />
          <path d="M6 9h12" />
        </svg>
      )
    case '/dashboard/profile':
      // Traveler Silhouette
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
        </svg>
      )
    case '/dashboard/invoices':
      // Ledger / Receipt
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path d="M9 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V9l-6-6H9z" />
          <path d="M15 3v6h6" />
          <line x1="9" y1="13" x2="15" y2="13" />
          <line x1="9" y1="17" x2="13" y2="17" />
        </svg>
      )
    case '/dashboard/notifications':
      // Slender Beacon Bell
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
      )
    case '/dashboard/settings':
      // Sliders / Dial
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <line x1="4" y1="21" x2="4" y2="14" />
          <line x1="4" y1="10" x2="4" y2="3" />
          <line x1="12" y1="21" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12" y2="3" />
          <line x1="20" y1="21" x2="20" y2="16" />
          <line x1="20" y1="12" x2="20" y2="3" />
          <circle cx="4" cy="12" r="2" />
          <circle cx="12" cy="10" r="2" />
          <circle cx="20" cy="14" r="2" />
        </svg>
      )
    default:
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <circle cx="12" cy="12" r="2" />
        </svg>
      )
  }
}

export function CustomerSidebar({ data, unreadCount }: CustomerSidebarProps) {
  const pathname = usePathname()
  const mobileNavRef = useRef<HTMLDivElement>(null)

  const isLinkActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  // Auto-scroll active item into center of the mobile scroll rail
  useEffect(() => {
    if (mobileNavRef.current) {
      const activeEl = mobileNavRef.current.querySelector<HTMLElement>('[data-active="true"]')
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
      }
    }
  }, [pathname])

  return (
    <aside className="w-full lg:w-64 flex-shrink-0 bg-card/90 backdrop-blur-md border border-border/80 rounded-3xl p-4 sm:p-5 shadow-sm text-foreground">
      {/* Customer Profile Header */}
      <div className="flex items-center gap-3.5 pb-4 lg:pb-5 border-b border-border/50">
        <div className="relative flex-shrink-0">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-serif text-base font-bold ring-1 ring-border/80 shadow-sm">
            {data.fullName.charAt(0)}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-secondary ring-2 ring-card" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] font-semibold uppercase text-muted">Personal Journey</span>
          <span className="font-bold text-sm text-foreground truncate tracking-tight">{data.fullName}</span>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-accent/10 text-accent border border-accent/25">
              {data.formattedTier || `${data.currentTier} ${data.tierSuffix}`}
            </span>
          </div>
        </div>
      </div>

      {/* Journey Section Header (Desktop) */}
      <div className="hidden lg:flex items-center gap-2 mt-5 mb-2 px-2 text-[10px] font-bold uppercase text-muted">
        <span>Your Journey</span>
        <span className="flex-1 h-px bg-border/60" />
        <span className="w-1.5 h-1.5 rounded-full bg-primary/40 dark:bg-secondary/40" />
      </div>

      {/* Desktop Vertical Navigation Links */}
      <nav className="hidden lg:flex flex-col gap-1">
        {data.navLinks.map((link) => {
          const isActive = isLinkActive(link.href)
          const isNotificationLink = link.href === '/dashboard/notifications'
          const showBadge = isNotificationLink && Boolean(unreadCount && unreadCount > 0)

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 group ${
                isActive
                  ? 'bg-card-elevated border border-border text-foreground font-bold shadow-sm translate-x-0.5'
                  : 'text-muted hover:text-foreground hover:bg-border/20 hover:translate-x-1'
              }`}
            >
              <div className="flex items-center gap-3">
                <NavIcon
                  href={link.href}
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-primary dark:text-secondary' : 'text-muted group-hover:text-foreground'
                  }`}
                />
                <span>{link.label}</span>
              </div>
              <div className="flex items-center gap-2">
                {showBadge && (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-accent/15 text-accent border border-accent/25 beacon-pulse">
                    <span className="w-1 h-1 rounded-full bg-accent" />
                    <span>{unreadCount}</span>
                  </span>
                )}
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary dark:bg-secondary shadow-[0_0_6px_rgba(46,49,146,0.6)] dark:shadow-[0_0_6px_rgba(0,174,239,0.8)]" />
                )}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Mobile Horizontal Navigation Tabs (Rail with fade edges) */}
      <nav
        ref={mobileNavRef}
        className="flex lg:hidden items-center gap-2 mt-4 overflow-x-auto pb-1 scrollbar-none mask-fade-edges px-2"
      >
        {data.navLinks.map((link) => {
          const isActive = isLinkActive(link.href)
          const isNotificationLink = link.href === '/dashboard/notifications'
          const showBadge = isNotificationLink && Boolean(unreadCount && unreadCount > 0)

          return (
            <Link
              key={link.href}
              href={link.href}
              data-active={isActive ? 'true' : 'false'}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 flex-shrink-0 ${
                isActive
                  ? 'bg-card-elevated border border-border text-foreground shadow-sm'
                  : 'text-muted hover:text-foreground hover:bg-border/20 border border-border/40'
              }`}
            >
              <NavIcon
                href={link.href}
                className={`w-3.5 h-3.5 ${isActive ? 'text-primary dark:text-secondary' : 'text-muted'}`}
              />
              <span>{link.label}</span>
              {showBadge && (
                <span className="flex items-center px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-accent/15 text-accent border border-accent/25 beacon-pulse">
                  {unreadCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
