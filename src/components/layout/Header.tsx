'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useLocale, useCurrency, useSession } from '@/providers'
import { Button, Badge } from '@/components/ui'
import type { LayoutDTO } from '@/application/layout/dto'

export interface HeaderProps {
  data?: LayoutDTO
}

export function Header({ data }: HeaderProps) {
  const { locale, setLocale } = useLocale()
  const { currency, setCurrency } = useCurrency()
  const { session } = useSession()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navItems = data?.navigationMenu || [
    { label: 'Home', href: '/' },
    { label: 'Experiences', href: '/experiences' },
    { label: 'Destinations', href: '/destinations' },
    { label: 'Blog', href: '/blog' },
    { label: 'FAQ', href: '/faq' },
  ]

  const currencies = ['EGP', 'USD', 'EUR', 'GBP', 'SAR', 'AED'] as const
  const locales = [
    { code: 'en', label: 'English' },
    { code: 'ar', label: 'العربية' },
    { code: 'fr', label: 'Français' },
  ] as const

  return (
    <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-slate-200/80 dark:bg-slate-950/90 dark:border-slate-800/80 transition-all duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-[#2e3192] text-white flex items-center justify-center font-bold text-xl shadow-md group-hover:scale-105 transition-transform">
            L
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-xl tracking-tight text-[#2e3192] dark:text-white">
              L&apos;AUBE VOYAGE
            </span>
            <span className="text-[10px] uppercase tracking-widest text-[#00aeef] font-semibold -mt-1">
              Luxury Travel
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-semibold text-slate-700 hover:text-[#2e3192] dark:text-slate-200 dark:hover:text-[#00aeef] transition-colors underline-animate"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Action Controls & User Account */}
        <div className="hidden lg:flex items-center gap-4">
          {/* Currency Switcher */}
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as 'EGP' | 'USD' | 'EUR' | 'GBP')}
            className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-[#00aeef]"
          >
            {currencies.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Locale Switcher */}
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value as Parameters<typeof setLocale>[0])}
            className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-[#00aeef]"
          >
            {locales.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>

          {/* User Portal Link or Login CTA */}
          {session.isAuthenticated || data?.userSession?.isAuthenticated ? (
            <Link href="/dashboard">
              <Button variant="outline" size="sm" className="gap-2">
                <span>{data?.userSession?.fullName || session.email || 'My Account'}</span>
                <Badge variant="accent" size="sm">
                  {data?.userSession?.points || session.points || 0} pts
                </Badge>
              </Button>
            </Link>
          ) : (
            <Link href="/dashboard">
              <Button variant="accent" size="sm">
                Sign In
              </Button>
            </Link>
          )}
        </div>

        {/* Mobile Menu Toggle Button */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 pt-2 pb-6 flex flex-col gap-4">
          <nav className="flex flex-col gap-3">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-base font-semibold text-slate-800 dark:text-slate-200 py-1"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as any)}
                className="bg-slate-100 dark:bg-slate-900 text-xs font-bold rounded-lg px-2 py-1"
              >
                {currencies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value as any)}
                className="bg-slate-100 dark:bg-slate-900 text-xs font-bold rounded-lg px-2 py-1"
              >
                {locales.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="accent" size="sm">
                Dashboard
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
