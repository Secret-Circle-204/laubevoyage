'use client'

import React, { useState, useRef, useEffect, useCallback, useId } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from '@/providers'
import { CANONICAL_CUSTOMER_NAV_ITEMS } from '@/application/dashboard/navigation'
import { NavIcon } from '@/components/features/dashboard/CustomerSidebar'

export interface CustomerAccountMenuProps {
  unreadNotificationsCount?: number
  customerNavLabels?: Record<string, string>
  uiLabels?: {
    myAccount?: string
    signOut?: string
  }
  compact?: boolean
  isMobileMenu?: boolean
  onNavigate?: () => void
}

export function CustomerAccountMenu({
  unreadNotificationsCount = 0,
  customerNavLabels = {},
  uiLabels,
  compact = false,
  isMobileMenu = false,
  onNavigate,
}: CustomerAccountMenuProps) {
  const pathname = usePathname()
  const { session, logout } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const itemRefs = useRef<(HTMLAnchorElement | HTMLButtonElement | null)[]>([])
  const menuId = useId()

  const fullName = [session.firstName, session.lastName].filter(Boolean).join(' ') || session.email || 'Traveler'
  const initials =
    [session.firstName, session.lastName]
      .filter(Boolean)
      .map((s) => s![0]?.toUpperCase())
      .join('') || (session.email ? session.email[0]?.toUpperCase() : 'TR')

  const totalInteractiveItems = CANONICAL_CUSTOMER_NAV_ITEMS.length + 1 // items + sign out

  const openMenu = useCallback(() => {
    setIsOpen(true)
    setFocusedIndex(0)
  }, [])

  const closeMenu = useCallback((restoreFocus = true) => {
    setIsOpen(false)
    setFocusedIndex(-1)
    if (restoreFocus) {
      triggerRef.current?.focus()
    }
  }, [])

  const toggleMenu = useCallback(() => {
    if (isOpen) {
      closeMenu(false)
    } else {
      openMenu()
    }
  }, [isOpen, closeMenu, openMenu])

  // Click outside to close
  useEffect(() => {
    if (!isOpen || isMobileMenu) return
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        closeMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, isMobileMenu, closeMenu])

  // Focus management when keyboard navigating
  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && !isMobileMenu) {
      itemRefs.current[focusedIndex]?.focus()
    }
  }, [isOpen, focusedIndex, isMobileMenu])

  const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openMenu()
    }
  }

  const handleMenuKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      closeMenu(true)
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusedIndex((prev) => (prev + 1) % totalInteractiveItems)
      return
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusedIndex((prev) => (prev - 1 + totalInteractiveItems) % totalInteractiveItems)
      return
    }

    if (e.key === 'Tab') {
      closeMenu(false)
    }
  }

  const handleSignOut = async () => {
    if (onNavigate) onNavigate()
    closeMenu(false)
    await logout()
  }

  const handleItemClick = () => {
    if (onNavigate) onNavigate()
    closeMenu(false)
  }

  const hasUnread = unreadNotificationsCount > 0

  // ---------------------------------------------------------------------------
  // MOBILE INLINE VARIANT (Unified Composition inside Mobile Command Surface)
  // ---------------------------------------------------------------------------
  if (isMobileMenu) {
    return (
      <div className="space-y-3">
        {/* User Identity Card */}
        <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-border/20 border border-border/60">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1a1e4e] to-[#2E3191] text-white flex items-center justify-center font-serif text-sm font-bold ring-1 ring-white/20 shadow-xs flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-serif font-bold text-foreground truncate">
              {fullName}
            </div>
            {session.email && (
              <div className="text-xs text-muted truncate">
                {session.email}
              </div>
            )}
            {session.tier && (
              <span className="inline-block mt-0.5 px-2 py-0.2 rounded-full text-[10px] font-bold uppercase tracking-wider bg-secondary/15 text-secondary border border-secondary/25">
                {session.tier}
              </span>
            )}
          </div>
        </div>

        {/* Canonical Navigation Links */}
        <div className="grid grid-cols-1 gap-1">
          {CANONICAL_CUSTOMER_NAV_ITEMS.map((item) => {
            const isNotifications = item.id === 'notifications'
            const label = customerNavLabels[item.id] || item.id
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href))

            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={handleItemClick}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                  isActive
                    ? 'bg-secondary/10 text-secondary font-bold'
                    : 'text-foreground/80 hover:bg-border/20 hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-3">
                  <NavIcon icon={item.icon} className="w-4 h-4 text-muted flex-shrink-0" />
                  <span>{label}</span>
                </div>
                {isNotifications && hasUnread && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-accent/15 text-accent border border-accent/25">
                    {unreadNotificationsCount}
                  </span>
                )}
              </Link>
            )
          })}
        </div>

        {/* Sign Out Action */}
        <div className="pt-2 border-t border-border/40">
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <NavIcon icon="signout" className="w-4 h-4 flex-shrink-0" />
              <span>{uiLabels?.signOut || 'Sign Out'}</span>
            </div>
          </button>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // DESKTOP DROPDOWN VARIANT (Floating Luxury Command Surface)
  // ---------------------------------------------------------------------------
  return (
    <div ref={containerRef} className="relative inline-block text-left">
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        id={`account-menu-trigger-${menuId}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        onClick={toggleMenu}
        onKeyDown={handleTriggerKeyDown}
        className="group relative flex items-center gap-2 py-1 px-1.5 sm:px-2.5 rounded-full border border-white/30 bg-white/15 hover:bg-white/25 text-white dark:border-border/80 dark:bg-card/60 dark:hover:bg-card dark:text-foreground transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 dark:focus-visible:ring-secondary/50 cursor-pointer shadow-xs active:scale-[0.98]"
      >
        {/* Avatar with dynamic Initials */}
        <div className="relative">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-[#1a1e4e] to-[#2E3191] text-white flex items-center justify-center font-serif text-xs font-bold ring-1 ring-white/30 dark:ring-border/80 shadow-xs flex-shrink-0">
            {initials}
          </div>
          {/* Subtle Beacon Indicator if unread notifications exist */}
          {hasUnread && (
            <span
              className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-accent ring-2 ring-[#231f20] dark:ring-card"
              aria-label={`${unreadNotificationsCount} unread notifications`}
            />
          )}
        </div>

        {/* Display Name */}
        {!compact && (
          <span className="hidden sm:inline-flex items-center text-xs font-semibold tracking-tight max-w-[120px] truncate">
            {fullName}
          </span>
        )}

        {/* Chevron Indicator */}
        <svg
          className={`w-3 h-3 text-white/80 dark:text-muted transition-transform duration-250 ease-out flex-shrink-0 ${
            isOpen ? 'rotate-180 text-white dark:text-secondary' : 'group-hover:text-white dark:group-hover:text-foreground'
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={1.75}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* Floating Menu Surface */}
      {isOpen && (
        <div
          id={menuId}
          role="menu"
          aria-labelledby={`account-menu-trigger-${menuId}`}
          tabIndex={-1}
          onKeyDown={handleMenuKeyDown}
          className="absolute right-0 rtl:right-auto rtl:left-0 mt-2 w-64 max-w-[calc(100vw-24px)] rounded-2xl shadow-xl border border-border/80 bg-card/95 backdrop-blur-md text-foreground dropdown-emergence overflow-hidden z-50 py-1.5 divide-y divide-border/30"
        >
          {/* Header Identity Section */}
          <div className="px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1a1e4e] to-[#2E3191] text-white flex items-center justify-center font-serif text-sm font-bold ring-1 ring-white/20 shadow-xs flex-shrink-0">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-serif font-bold text-foreground truncate">
                  {fullName}
                </div>
                {session.email && (
                  <div className="text-[11px] text-muted truncate">
                    {session.email}
                  </div>
                )}
                {session.tier && (
                  <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold uppercase tracking-wider bg-secondary/15 text-secondary border border-secondary/25">
                    {session.tier}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Canonical Nav Items Section */}
          <div className="py-1">
            {CANONICAL_CUSTOMER_NAV_ITEMS.map((item, idx) => {
              const isNotifications = item.id === 'notifications'
              const label = customerNavLabels[item.id] || item.id
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href))

              return (
                <Link
                  key={item.id}
                  ref={(el) => {
                    itemRefs.current[idx] = el
                  }}
                  href={item.href}
                  role="menuitem"
                  tabIndex={-1}
                  onClick={handleItemClick}
                  className={`w-full flex items-center justify-between px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer outline-none ${
                    isActive
                      ? 'bg-secondary/10 text-secondary font-bold'
                      : 'text-foreground hover:bg-secondary/5 focus:bg-secondary/10 focus:text-secondary'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <NavIcon
                      icon={item.icon}
                      className={`w-4 h-4 flex-shrink-0 transition-colors ${
                        isActive ? 'text-secondary' : 'text-muted'
                      }`}
                    />
                    <span>{label}</span>
                  </div>

                  {isNotifications && hasUnread && (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-accent/15 text-accent border border-accent/25 beacon-pulse">
                      <span className="w-1 h-1 rounded-full bg-accent" />
                      <span>{unreadNotificationsCount}</span>
                    </span>
                  )}
                </Link>
              )
            })}
          </div>

          {/* Sign Out Action Section */}
          <div className="py-1">
            <button
              ref={(el) => {
                itemRefs.current[CANONICAL_CUSTOMER_NAV_ITEMS.length] = el
              }}
              type="button"
              role="menuitem"
              tabIndex={-1}
              onClick={handleSignOut}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-muted hover:text-red-500 hover:bg-red-500/10 focus:bg-red-500/10 focus:text-red-500 transition-colors cursor-pointer outline-none"
            >
              <NavIcon icon="signout" className="w-4 h-4 flex-shrink-0" />
              <span>{uiLabels?.signOut || 'Sign Out'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
