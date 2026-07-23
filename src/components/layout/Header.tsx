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
  const { session, logout } = useSession()

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const navLinks = data?.navigationMenu || []
  const availableCurrencies = data?.supportedCurrencies?.map((c) => c.code) || []
  const availableLocales = data?.supportedLocales || []

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/80 dark:bg-slate-950/80 border-b border-slate-200/50 dark:border-slate-800/50 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#2e3192] to-[#00aeef] flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
            L
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-lg text-slate-900 dark:text-white tracking-tight leading-none">
              LAUBE VOYAGE
            </span>
            <span className="text-[10px] font-bold text-[#00aeef] tracking-widest uppercase mt-0.5">
              Luxury Redefined
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-semibold text-slate-600 hover:text-[#2e3192] dark:text-slate-300 dark:hover:text-[#00aeef] transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right Controls (Currency, Locale, Auth) */}
        <div className="hidden md:flex items-center gap-4">
          {/* Currency Switcher */}
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as any)}
            className="bg-slate-100 dark:bg-slate-900 text-xs font-bold rounded-lg px-2.5 py-1.5 border-0 text-slate-700 dark:text-slate-300 cursor-pointer focus:ring-2 focus:ring-[#00aeef]"
          >
            {availableCurrencies.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Locale Switcher */}
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value as any)}
            className="bg-slate-100 dark:bg-slate-900 text-xs font-bold rounded-lg px-2.5 py-1.5 border-0 text-slate-700 dark:text-slate-300 cursor-pointer focus:ring-2 focus:ring-[#00aeef]"
          >
            {availableLocales.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name || l.code.toUpperCase()}
              </option>
            ))}
          </select>

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
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
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

      {/* Mobile Drawer Navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 pt-4 pb-6 space-y-4">
          <nav className="flex flex-col space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-base font-semibold text-slate-700 dark:text-slate-200 hover:text-[#2e3192]"
              >
                {link.label}
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
                {availableCurrencies.map((c) => (
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
                {availableLocales.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name || l.code.toUpperCase()}
                  </option>
                ))}
              </select>
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
