'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'

import { useRouter } from 'next/navigation'
import { useLocale, useCurrency, useSession } from '@/providers'
import { useTheme } from '@/providers/theme-provider'
import { Button, Badge } from '@/components/ui'
import { ThemeToggle } from './ThemeToggle'
import { LanguageSwitcher } from './LanguageSwitcher'
import { CurrencySwitcher } from './CurrencySwitcher'
import type { LayoutDTO } from '@/application/layout/dto'

export interface HeaderProps {
  data: LayoutDTO
}

export function Header({ data }: HeaderProps) {
  const router = useRouter()
  const { locale, setLocale } = useLocale()
  const { currency, setCurrency } = useCurrency()
  const { session, logout } = useSession()
  const { theme } = useTheme()

  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    router.push(`/experiences?q=${encodeURIComponent(searchQuery.trim())}`)
    setIsMobileMenuOpen(false)
  }


  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = data.navigationMenu
  const availableCurrencies = data.supportedCurrencies
  const availableLocales = data.supportedLocales

  const isDark = theme === 'dark'

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled
          ? isDark
            ? 'bg-[#231F20]/95 backdrop-blur-md shadow-xl py-3 border-b border-white/10'
            : 'bg-white/95 backdrop-blur-md shadow-md py-3 border-b border-slate-200/80'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="group flex items-center">
          <div className="relative h-9 w-36 sm:w-44 transition-transform duration-500 group-hover:scale-105">
            <Image
              src={
                isDark
                  ? '/logos/LAube-Voyage-logo-horizontal-colors-and-white.svg'
                  : '/logos/LAube-Voyage-logo-horizontal -colors.svg'
              }
              alt="L'Aube Voyage"
              fill
              className="object-contain"
              priority
            />
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-semibold tracking-wide transition-colors ${
                isDark
                  ? 'text-slate-200 hover:text-[#00aeef]'
                  : 'text-slate-700 hover:text-[#2e3192]'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right Controls */}
        <div className="hidden lg:flex items-center gap-4">
          {/* Desktop Search Input */}
          <form onSubmit={handleSearchSubmit} className="relative hidden xl:flex items-center">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search experiences..."
              className={`pl-9 pr-4 py-1.5 text-xs rounded-full border transition-all duration-300 w-44 focus:w-60 focus:outline-none ${
                isDark
                  ? 'bg-white/10 border-white/20 text-white placeholder-white/50 focus:border-[#f58220]'
                  : 'bg-slate-100 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-[#f58220]'
              }`}
            />
            <svg className="w-4 h-4 absolute left-3 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </form>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Currency Switcher */}
          {availableCurrencies.length > 0 && (
            <CurrencySwitcher
              currency={currency}
              setCurrency={setCurrency}
              availableCurrencies={availableCurrencies}
              isDark={isDark}
            />
          )}

          {/* Locale Switcher */}
          {availableLocales.length > 0 && (
            <LanguageSwitcher
              locale={locale}
              setLocale={setLocale}
              availableLocales={availableLocales}
              isDark={isDark}
            />
          )}

          {/* User Auth Portal Link */}
          {session.isAuthenticated ? (
            <div className="flex items-center gap-3">
              <Link href="/dashboard">
                <Badge variant="accent" size="md" className="cursor-pointer hover:opacity-90">
                  {data?.uiLabels?.myAccount}
                </Badge>
              </Link>
              <Button variant="ghost" size="sm" onClick={logout}>
                {data?.uiLabels?.signOut}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  {data?.uiLabels?.logIn}
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="primary" size="sm">
                  {data?.uiLabels?.bookNow}
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex lg:hidden items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`p-2 rounded-lg ${
              isDark ? 'text-white hover:bg-slate-800' : 'text-slate-900 hover:bg-slate-100'
            }`}
            aria-label="Toggle Navigation Menu"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isMobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {isMobileMenuOpen && (
        <div
          className={`lg:hidden border-t px-4 pt-4 pb-6 space-y-4 shadow-2xl ${
            isDark
              ? 'bg-[#231F20] border-slate-800 text-white'
              : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          {/* Mobile Search Form */}
          <form onSubmit={handleSearchSubmit} className="relative mb-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search experiences, destinations..."
              className={`w-full pl-9 pr-20 py-2.5 text-sm rounded-lg border ${
                isDark
                  ? 'bg-white/10 border-white/20 text-white placeholder-white/50 focus:border-[#f58220]'
                  : 'bg-slate-100 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-[#f58220]'
              } focus:outline-none`}
            />
            <svg className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <button
              type="submit"
              className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-[#f58220] hover:bg-[#2e3192] text-white text-xs font-semibold rounded-md transition-colors"
            >
              Search
            </button>
          </form>

          <nav className="flex flex-col space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-base font-semibold hover:text-[#00aeef]"
              >

                {link.label}
              </Link>
            ))}
          </nav>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {availableCurrencies.length > 0 && (
                <CurrencySwitcher
                  currency={currency}
                  setCurrency={setCurrency}
                  availableCurrencies={availableCurrencies}
                  isDark={true}
                />
              )}
              {availableLocales.length > 0 && (
                <LanguageSwitcher
                  locale={locale}
                  setLocale={setLocale}
                  availableLocales={availableLocales}
                  isDark={true}
                />
              )}
            </div>

            {session.isAuthenticated ? (
              <Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
                <Button variant="accent" size="sm">
                  {data?.uiLabels?.myAccount}
                </Button>
              </Link>
            ) : (
              <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                <Button variant="primary" size="sm">
                  {data?.uiLabels?.logIn}
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
