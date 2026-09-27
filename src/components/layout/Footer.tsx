'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { LayoutDTO } from '@/application/layout/dto'

export interface FooterProps {
  data: LayoutDTO
}

export function Footer({ data }: FooterProps) {
  const currentYear = new Date().getFullYear()
  const columns = data.footerNavigation

  return (
    <footer className="bg-gradient-to-br from-[#231f20] via-[#1a1e4e] to-[#f58220] text-white border-t border-white/15 dark:bg-card dark:text-foreground dark:border-border dark:bg-none pt-16 pb-12 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-white/20 dark:border-border/40">
          {/* Brand Info */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <Link href="/" className="flex items-center">
              <div className="relative h-10 w-44">
                <Image
                  src="/logos/LAube-Voyage-logo-horizontal-colors-and-white.svg"
                  alt="L'Aube Voyage"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </Link>
            <p className="text-sm leading-relaxed text-white/90 dark:text-muted max-w-sm font-medium">
              {data.uiLabels.brandDescription}
            </p>
          </div>

          {/* Dynamic Footer Columns */}
          {columns.map((col) => (
            <div key={col.title} className="flex flex-col gap-3 group">
              <div className="relative pb-2 border-b border-white/20 dark:border-border/40">
                <h4 className="text-xs font-bold text-white dark:text-foreground uppercase font-serif tracking-wider">
                  {col.title}
                </h4>
                <div className="absolute bottom-0 left-0 h-0.5 w-5 bg-white dark:bg-accent/70 rounded-full transition-all duration-300 group-hover:w-12 pointer-events-none" />
              </div>
              <ul className="space-y-2 mt-1">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="inline-block text-xs sm:text-sm text-white/85 hover:text-white hover:translate-x-1 dark:text-muted dark:hover:text-secondary transition-all duration-200 font-medium"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/80 dark:text-muted">
          <p>© {currentYear} L&apos;Aube Voyage. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-white dark:hover:text-secondary transition-colors underline-offset-4 hover:underline">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-white dark:hover:text-secondary transition-colors underline-offset-4 hover:underline">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
