'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useLocale, useCurrency, useSession } from '@/providers'
import { useTheme } from '@/providers/theme-provider'
import { Button, Badge } from '@/components/ui'
import { ThemeToggle } from './ThemeToggle'
import type { LayoutDTO } from '@/application/layout/dto'

export interface HeaderProps {
  data?: LayoutDTO
}

export function Header({ data }: HeaderProps) {
  const { locale, setLocale } = useLocale()
  const { currency, setCurrency } = useCurrency()
  const { session, logout } = useSession()
  const { theme } = useTheme()

  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = data?.navigationMenu || []
  const availableCurrencies = data?.supportedCurrencies?.map((c) => c.code) || []
  const availableLocales = data?.supportedLocales || []

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
          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Currency Switcher */}
          {availableCurrencies.length > 0 && (
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as any)}
              className={`text-xs font-bold rounded-lg px-2.5 py-1.5 border-0 cursor-pointer focus:ring-2 focus:ring-[#00aeef] ${
                isDark
                  ? 'bg-slate-800 text-slate-200'
                  : 'bg-slate-100 text-slate-800'
              }`}
            >
              {availableCurrencies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}

          {/* Locale Switcher */}
          {availableLocales.length > 0 && (
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value as any)}
              className={`text-xs font-bold rounded-lg px-2.5 py-1.5 border-0 cursor-pointer focus:ring-2 focus:ring-[#00aeef] ${
                isDark
                  ? 'bg-slate-800 text-slate-200'
                  : 'bg-slate-100 text-slate-800'
              }`}
            >
              {availableLocales.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name || l.code.toUpperCase()}
                </option>
              ))}
            </select>
          )}

          {/* User Auth Portal Link */}
          {session.isAuthenticated ? (
            <div className="flex items-center gap-3">
              <Link href="/dashboard">
                <Badge variant="accent" size="md" className="cursor-pointer hover:opacity-90">
                  👤 My Account
                </Badge>
              </Link>
              <Button variant="ghost" size="sm" onClick={logout}>
                Sign Out
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Log In
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="primary" size="sm">
                  Book Now
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
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
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as any)}
                  className="bg-slate-800 text-white text-xs font-bold rounded-lg px-2 py-1"
                >
                  {availableCurrencies.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}
              {availableLocales.length > 0 && (
                <select
                  value={locale}
                  onChange={(e) => setLocale(e.target.value as any)}
                  className="bg-slate-800 text-white text-xs font-bold rounded-lg px-2 py-1"
                >
                  {availableLocales.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.name || l.code.toUpperCase()}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {session.isAuthenticated ? (
              <Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
                <Button variant="accent" size="sm">
                  Dashboard
                </Button>
              </Link>
            ) : (
              <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                <Button variant="primary" size="sm">
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
