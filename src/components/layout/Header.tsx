'use client'

import React, { useState, useEffect, useRef, useCallback, useId } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { useLoadingNavigation } from '@/application/loading/use-loading-navigation'
import { useLocale, useCurrency, useSession } from '@/providers'
import { useTheme } from '@/providers/theme-provider'
import { Button, Badge, Flag } from '@/components/ui'
import { ThemeToggle } from './ThemeToggle'
import { LanguageSwitcher, FLAG_MAP } from './LanguageSwitcher'
import { CurrencySwitcher } from './CurrencySwitcher'
import { CustomerAccountMenu } from './CustomerAccountMenu'
import type { LayoutDTO } from '@/application/layout/dto'

export interface HeaderProps {
  data: LayoutDTO
}

export function Header({ data }: HeaderProps) {
  const router = useRouter()
  const loadingNav = useLoadingNavigation()
  const pathname = usePathname()
  const { locale, setLocale } = useLocale()
  const { currency, setCurrency } = useCurrency()
  const { session, logout } = useSession()
  const { theme } = useTheme()
  const labels = data.uiLabels

  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isMenuClosing, setIsMenuClosing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const mobileMenuTriggerRef = useRef<HTMLButtonElement>(null)
  const mobileCloseBtnRef = useRef<HTMLButtonElement>(null)

  const currentPath = pathname || '/'
  const isDark = theme === 'dark'
  const isHomePage = currentPath === '/'
  const isHeaderSolid = isScrolled || !isHomePage

  const closeMobileMenu = useCallback(() => {
    setIsMenuClosing(true)
    setTimeout(() => {
      setIsMobileMenuOpen(false)
      setIsMenuClosing(false)
      mobileMenuTriggerRef.current?.focus()
    }, 220)
  }, [])

  const toggleMobileMenu = useCallback(() => {
    if (isMobileMenuOpen) {
      closeMobileMenu()
    } else {
      setIsMobileMenuOpen(true)
    }
  }, [isMobileMenuOpen, closeMobileMenu])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    loadingNav.push(`/experiences?q=${encodeURIComponent(searchQuery.trim())}`)
    closeMobileMenu()
  }

  // Keyboard shortcut for search (⌘K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
      if (e.key === 'Escape' && isMobileMenuOpen) {
        closeMobileMenu()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isMobileMenuOpen, closeMobileMenu])

  // Scroll listener for sticky header styling
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow
      document.body.style.overflow = 'hidden'
      // Focus close button on open
      setTimeout(() => {
        mobileCloseBtnRef.current?.focus()
      }, 50)
      return () => {
        document.body.style.overflow = originalStyle
      }
    }
  }, [isMobileMenuOpen])

  const navLinks = data.navigationMenu || []
  const availableCurrencies = data.supportedCurrencies || []
  const availableLocales = data.supportedLocales || []

  const isLinkActive = (href: string) => {
    if (href === '/') return currentPath === '/'
    return currentPath.startsWith(href)
  }

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ease-out ${
          isHeaderSolid
            ? 'bg-gradient-to-r from-[#231f20] via-[#1a1e4e] to-[#f58220] text-white shadow-lg py-2.5 sm:py-3 border-b border-white/10 dark:bg-background/90 dark:text-foreground dark:backdrop-blur-md dark:shadow-xs dark:border-border/60 dark:bg-none'
            : 'bg-gradient-to-r from-[#231f20]/95 via-[#1a1e4e]/95 to-[#f58220]/95 backdrop-blur-md text-white py-3.5 sm:py-4 border-b border-white/10 dark:bg-transparent dark:text-foreground dark:border-transparent dark:bg-none'
        }`}
      >
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 flex items-center justify-between gap-1 sm:gap-4">
          
          {/* ================================================================= */}
          {/* 1. BRAND LOGO */}
          {/* ================================================================= */}
          <Link
            href="/"
            className="group flex items-center flex-shrink-0 transition-transform duration-300 hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 dark:focus-visible:ring-secondary/60 rounded-lg p-0.5"
            aria-label="L'Aube Voyage Home"
          >
            <div className="relative h-7.5 w-24 sm:h-9 sm:w-36 md:w-44">
              <Image
                src="/logos/LAube-Voyage-logo-horizontal-colors-and-white.svg"
                alt="L'Aube Voyage"
                fill
                className="object-contain"
                priority
              />
            </div>
          </Link>

          {/* ================================================================= */}
          {/* 2. DESKTOP LIVING NAVIGATION (Waypoint Beacon Architecture) */}
          {/* ================================================================= */}
          <nav
            aria-label="Main Navigation"
            className="hidden lg:flex items-center gap-6 xl:gap-8 flex-shrink-0"
          >
            {navLinks.map((link) => {
              const active = isLinkActive(link.href)

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded-sm ${
                    active
                      ? 'text-white font-bold dark:text-foreground'
                      : 'text-white/85 hover:text-white dark:text-foreground/70 dark:hover:text-foreground group'
                  }`}
                  aria-current={active ? 'page' : undefined}
                >
                  <span>{link.label}</span>

                  {/* Waypoint Active Beacon & Micro Runway Line */}
                  {active ? (
                    <span
                      className="absolute -bottom-1 left-0 right-0 flex items-center justify-center pointer-events-none"
                      aria-hidden="true"
                    >
                      <span className="h-[2px] w-full bg-gradient-to-r from-transparent via-white to-transparent dark:via-secondary/70 rounded-full" />
                      <span className="absolute w-1.5 h-1.5 rounded-full bg-white dark:bg-secondary shadow-[0_0_8px_rgba(255,255,255,0.9)] dark:shadow-[0_0_8px_rgba(0,174,239,0.85)] ring-2 ring-white/30 dark:ring-secondary/20" />
                    </span>
                  ) : (
                    <span
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white/60 dark:bg-secondary/40 opacity-0 scale-0 transition-all duration-250 group-hover:opacity-100 group-hover:scale-100 pointer-events-none"
                      aria-hidden="true"
                    />
                  )}
                </Link>
              )
            })}
          </nav>

          {/* ================================================================= */}
          {/* 3. DESKTOP RIGHT CONTROL SURFACE */}
          {/* ================================================================= */}
          <div className="hidden lg:flex items-center gap-2 xl:gap-3 flex-shrink-0">
            {/* Travel Command Search (Keyboard & Intent Preserved) */}
            <form onSubmit={handleSearchSubmit} className="relative flex items-center group">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={labels.searchPlaceholder}
                aria-label={labels.searchAriaLabel}
                className="pl-8 pr-12 py-1.5 text-xs rounded-full border border-white/30 bg-white/20 hover:bg-white/30 text-white placeholder:text-white/75 transition-all duration-300 w-36 xl:w-52 focus:w-56 xl:focus:w-72 focus:outline-none focus:border-white focus:ring-2 focus:ring-white/30 focus:bg-white focus:text-slate-900 focus:placeholder:text-slate-400 shadow-xs dark:border-border/80 dark:bg-card/60 dark:hover:bg-card dark:text-foreground dark:placeholder:text-muted/60 dark:focus:border-secondary/80 dark:focus:bg-card dark:focus:ring-secondary/20 dark:focus:text-foreground"
              />
              <svg
                className="w-3.5 h-3.5 absolute left-2.5 text-white/80 group-focus-within:text-white dark:text-muted dark:group-focus-within:text-secondary pointer-events-none transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.75}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 text-white/80 hover:text-white cursor-pointer p-0.5 rounded-full focus:outline-none dark:text-muted dark:hover:text-foreground"
                  aria-label={labels.clearSearch}
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              ) : (
                <kbd
                  className="absolute right-2.5 hidden xl:inline-flex items-center px-1.5 py-0.5 text-[9px] font-medium rounded border border-white/40 bg-white/20 text-white/90 pointer-events-none dark:border-border/60 dark:bg-border/20 dark:text-muted/70"
                  title="Press ⌘K or Ctrl+K to focus search"
                >
                  ⌘K
                </kbd>
              )}
            </form>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Currency Switcher (Continuous Adaptive Density) */}
            {availableCurrencies.length > 0 && (
              <CurrencySwitcher
                currency={currency}
                setCurrency={setCurrency}
                availableCurrencies={availableCurrencies}
                isDark={isDark}
                title={labels.selectCurrency}
                ariaLabel={labels.selectCurrency}
              />
            )}

            {/* Language Switcher (Continuous Adaptive Density) */}
            {availableLocales.length > 0 && (
              <LanguageSwitcher
                locale={locale}
                setLocale={setLocale}
                availableLocales={availableLocales}
                isDark={isDark}
                title={labels.selectLanguage}
                ariaLabel={labels.selectLanguage}
              />
            )}

            {/* User Session Auth / Portal Link */}
            {session.isAuthenticated && session.role === 'customer' ? (
              <CustomerAccountMenu
                unreadNotificationsCount={data.unreadNotificationsCount}
                customerNavLabels={data.customerNavLabels}
                uiLabels={labels}
              />
            ) : session.isAuthenticated && (session.role === 'admin' || session.role === 'super_admin') ? (
              <div className="flex items-center gap-2">
                <Link href="/admin">
                  <Badge variant="secondary" size="md" className="cursor-pointer bg-[#2E3191] text-white hover:bg-[#2E3191]/90 font-bold border border-white/20">
                    {labels.adminPortal}
                  </Badge>
                </Link>
                <Button variant="ghost" size="sm" onClick={logout} className="text-white hover:bg-white/20 dark:text-primary dark:hover:bg-primary/10 dark:text-secondary">
                  {labels.signOut}
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 dark:text-primary dark:hover:bg-primary/10 dark:text-secondary">
                    {labels.logIn}
                  </Button>
                </Link>
                <Link href="/register">
                  <Button variant="primary" size="sm" className="bg-[#1a1e4e] hover:bg-[#151840] text-white shadow-md border-0 dark:bg-primary dark:text-primary-foreground font-semibold px-4">
                    {labels.signIn}
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* ================================================================= */}
          {/* 4. MOBILE TRAVEL BAR (Direct Visibility with Micro-Capsule Luxury Density) */}
          {/* ================================================================= */}
          <div className="flex lg:hidden items-center gap-1 sm:gap-2 flex-shrink-0">
            {/* Micro Currency Switcher on Mobile (Flag + Code) */}
            {availableCurrencies.length > 0 && (
              <CurrencySwitcher
                currency={currency}
                setCurrency={setCurrency}
                availableCurrencies={availableCurrencies}
                isDark={isDark}
                compactOnly={true}
                micro={true}
                title={labels.selectCurrency}
                ariaLabel={labels.selectCurrency}
              />
            )}

            {/* Micro Language Switcher on Mobile (Flag + Code) */}
            {availableLocales.length > 0 && (
              <LanguageSwitcher
                locale={locale}
                setLocale={setLocale}
                availableLocales={availableLocales}
                isDark={isDark}
                compactOnly={true}
                micro={true}
                title={labels.selectLanguage}
                ariaLabel={labels.selectLanguage}
              />
            )}

            {/* Mobile User Session Control (Direct Top Bar Access) */}
            {session.isAuthenticated && session.role === 'customer' ? (
              <CustomerAccountMenu
                unreadNotificationsCount={data.unreadNotificationsCount}
                customerNavLabels={data.customerNavLabels}
                uiLabels={labels}
                compact={true}
              />
            ) : session.isAuthenticated && (session.role === 'admin' || session.role === 'super_admin') ? (
              <Link
                href="/admin"
                className="flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1 rounded-full border border-white/30 bg-[#2E3191] text-white text-xs font-bold hover:bg-[#2E3191]/90 shadow-xs transition-all"
                aria-label={labels.adminPortal}
                title={labels.adminPortal}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
                </svg>
                <span className="hidden sm:inline">{labels.adminPortal}</span>
              </Link>
            ) : (
              <Link
                href="/login"
                className="p-1.5 sm:p-2 rounded-full border border-white/30 bg-white/20 hover:bg-white/30 text-white transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 cursor-pointer shadow-xs active:scale-95 dark:border-border/80 dark:bg-card/60 dark:hover:bg-card dark:text-foreground"
                aria-label={labels.logIn}
                title={labels.logIn}
              >
                <svg className="w-4.5 h-4.5 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </Link>
            )}

            {/* Mobile Travel Command Menu Trigger */}
            <button
              ref={mobileMenuTriggerRef}
              onClick={toggleMobileMenu}
              className="p-1.5 sm:p-2.5 rounded-full border border-white/30 bg-white/20 hover:bg-white/30 text-white transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 cursor-pointer shadow-xs active:scale-95 dark:border-border/80 dark:bg-card/60 dark:hover:bg-card dark:text-foreground"
              aria-label={labels.openMenu}
              aria-expanded={isMobileMenuOpen}
              aria-haspopup="dialog"
            >
              <svg className="w-4.5 h-4.5 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
          </div>

        </div>
      </header>

      {/* ================================================================= */}
      {/* 5. MOBILE TRAVEL COMMAND SURFACE (Spatial Editorial Overlay) */}
      {/* ================================================================= */}
      {isMobileMenuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={labels.travelCommand}
          className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end"
        >
          {/* Backdrop Scrim */}
          <div
            onClick={closeMobileMenu}
            className={`fixed inset-0 bg-dark/70 backdrop-blur-xs transition-opacity duration-300 ease-out ${
              isMenuClosing ? 'opacity-0' : 'opacity-100'
            }`}
            aria-hidden="true"
          />

          {/* Spatial Command Sheet */}
          <div
            className={`relative z-10 w-full max-h-[85vh] rounded-t-3xl border-t border-border/80 bg-card/95 backdrop-blur-xl shadow-2xl text-foreground flex flex-col overflow-hidden transition-all duration-300 ease-out ${
              isMenuClosing ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100'
            }`}
          >
            {/* Sheet Handle */}
            <div className="w-12 h-1 bg-border/80 rounded-full mx-auto mt-3 mb-1" aria-hidden="true" />

            {/* Sheet Header */}
            <div className="px-5 py-3 border-b border-border/40 flex items-center justify-between">
              <div className="relative h-7 w-32">
                <Image
                  src={
                    isDark
                      ? '/logos/LAube-Voyage-logo-horizontal-colors-and-white.svg'
                      : '/logos/LAube-Voyage-logo-horizontal -colors.svg'
                  }
                  alt="L'Aube Voyage"
                  fill
                  className="object-contain"
                />
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle variant="sheet" className="p-1.5" />
                <button
                  ref={mobileCloseBtnRef}
                  onClick={closeMobileMenu}
                  className="p-2 rounded-full text-muted hover:text-foreground hover:bg-border/30 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/50 cursor-pointer"
                  aria-label={labels.closeMenu}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Scrollable Content Container */}
            <div className="px-5 py-4 space-y-6 overflow-y-auto overscroll-contain">
              
              {/* Travel Command Quick Search */}
              <div>
                <div className="text-[10px] uppercase font-bold text-muted mb-2 px-1 font-serif">
                  {labels.travelCommand}
                </div>
                <form onSubmit={handleSearchSubmit} className="relative flex items-center">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={labels.searchPlaceholder}
                    aria-label={labels.searchAriaLabel}
                    className="w-full pl-9 pr-24 rtl:pl-24 rtl:pr-9 py-2.5 text-sm rounded-xl border border-border bg-card text-foreground placeholder:text-muted/60 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 shadow-xs"
                  />
                  <svg
                    className="w-4 h-4 absolute left-3 rtl:left-auto rtl:right-3 text-muted pointer-events-none"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                  <Button
                    type="submit"
                    variant="accent"
                    size="sm"
                    className="absolute right-1.5 rtl:right-auto rtl:left-1.5 top-1.5 bottom-1.5 px-3 uppercase text-xs"
                  >
                    {labels.searchButton}
                  </Button>
                </form>
              </div>

              {/* Editorial Collection Links */}
              <div>
                <div className="text-[10px] uppercase font-bold text-muted mb-2 px-1 font-serif">
                  {labels.exploreCollection}
                </div>
                <nav className="flex flex-col space-y-1">
                  {navLinks.map((link) => {
                    const active = isLinkActive(link.href)

                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={closeMobileMenu}
                        className={`flex items-center justify-between px-4 py-3 rounded-xl text-base font-serif tracking-tight transition-all duration-200 ${
                          active
                            ? 'bg-secondary/10 text-secondary font-bold pl-5 rtl:pl-4 rtl:pr-5 border-l-2 rtl:border-l-0 rtl:border-r-2 border-secondary'
                            : 'text-foreground/80 hover:text-foreground hover:bg-border/20'
                        }`}
                        aria-current={active ? 'page' : undefined}
                      >
                        <span>{link.label}</span>
                        <svg
                          className="w-4 h-4 text-muted/60 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1 rtl:rotate-180"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.5}
                          aria-hidden="true"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      </Link>
                    )
                  })}
                </nav>
              </div>

              {/* Regional Preferences: Language & Currency */}
              {(availableLocales.length > 0 || availableCurrencies.length > 0) && (
                <div className="pt-4 border-t border-border/60 space-y-4">
                  {/* Language Selector */}
                  {availableLocales.length > 0 && (
                    <div>
                      <div className="text-[10px] uppercase font-bold text-muted mb-2.5 px-1 font-serif flex items-center justify-between">
                        <span>{labels.languagePreferences}</span>
                        <span className="text-[10px] text-secondary font-sans font-semibold">
                          {availableLocales.find((l) => l.code === locale)?.name || locale.toUpperCase()}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {availableLocales.map((loc) => {
                          const isSelected = loc.code === locale
                          const flagCode = FLAG_MAP[loc.code] || loc.code
                          return (
                            <button
                              key={loc.code}
                              type="button"
                              onClick={() => {
                                setLocale(loc.code)
                              }}
                              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all duration-200 cursor-pointer ${
                                isSelected
                                  ? 'bg-secondary/10 border-secondary text-secondary font-bold shadow-xs ring-1 ring-secondary/30'
                                  : 'bg-card border-border/70 text-foreground/80 hover:bg-border/20 hover:text-foreground'
                              }`}
                            >
                              <Flag
                                flagCode={flagCode}
                                alt=""
                                className="w-4 h-3 object-cover rounded-xs shadow-xs flex-shrink-0"
                              />
                              <span className="truncate">{loc.name}</span>
                              {isSelected && (
                                <svg
                                  className="w-3.5 h-3.5 ml-auto rtl:ml-0 rtl:mr-auto text-secondary flex-shrink-0"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Currency Selector */}
                  {availableCurrencies.length > 0 && (
                    <div>
                      <div className="text-[10px] uppercase font-bold text-muted mb-2.5 px-1 font-serif flex items-center justify-between">
                        <span>{labels.currencyDisplay}</span>
                        <span className="text-[10px] text-secondary font-sans font-semibold">
                          {currency} · {availableCurrencies.find((c) => c.code === currency)?.name}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {availableCurrencies.map((c) => {
                          const isSelected = c.code === currency
                          return (
                            <button
                              key={c.code}
                              type="button"
                              onClick={() => {
                                setCurrency(c.code)
                              }}
                              className={`flex items-center justify-center gap-1.5 px-2.5 py-2.5 rounded-xl border text-xs font-semibold transition-all duration-200 cursor-pointer ${
                                isSelected
                                  ? 'bg-secondary/10 border-secondary text-secondary font-bold shadow-xs ring-1 ring-secondary/30'
                                  : 'bg-card border-border/70 text-foreground/80 hover:bg-border/20 hover:text-foreground'
                              }`}
                            >
                              <Flag
                                flagCode={c.flagCode}
                                alt=""
                                className="w-3.5 h-2.5 object-cover rounded-xs shadow-xs flex-shrink-0"
                              />
                              <span className="truncate">{c.code}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Session Account Bar */}
              {session.isAuthenticated && session.role === 'customer' ? (
                <div className="pt-4 border-t border-border/60">
                  <CustomerAccountMenu
                    unreadNotificationsCount={data.unreadNotificationsCount}
                    customerNavLabels={data.customerNavLabels}
                    uiLabels={labels}
                    isMobileMenu={true}
                    onNavigate={closeMobileMenu}
                  />
                </div>
              ) : session.isAuthenticated && (session.role === 'admin' || session.role === 'super_admin') ? (
                <div className="pt-4 border-t border-border/60">
                  <div className="flex items-center justify-between gap-3">
                    <Link
                      href="/admin"
                      onClick={closeMobileMenu}
                      className="flex-1"
                    >
                      <Button variant="accent" size="md" className="w-full bg-[#2E3191] hover:bg-[#2E3191]/90 text-white">
                        {labels.adminPortal}
                      </Button>
                    </Link>
                    <Button variant="ghost" size="md" onClick={logout}>
                      {labels.signOut}
                    </Button>
                  </div>
                </div>
              ) : !session.isAuthenticated ? (
                <div className="pt-4 border-t border-border/60">
                  <div className="grid grid-cols-2 gap-3">
                    <Link href="/login" onClick={closeMobileMenu}>
                      <Button variant="outline" size="md" className="w-full">
                        {labels.logIn}
                      </Button>
                    </Link>
                    <Link href="/register" onClick={closeMobileMenu}>
                      <Button variant="primary" size="md" className="w-full">
                        {labels.signIn}
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : null}

            </div>
          </div>
        </div>
      )}
    </>
  )
}

