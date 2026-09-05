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
    <footer className="bg-[#231F20] text-slate-300 border-t border-white/10 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-white/10">
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
            <p className="text-sm leading-relaxed text-slate-400 max-w-sm">
              {data.uiLabels.brandDescription}
            </p>
          </div>

          {/* Dynamic Footer Columns */}
          {columns.map((col) => (
            <div key={col.title} className="flex flex-col gap-3">
              <h4 className="text-xs font-extrabold text-white uppercase tracking-widest border-b border-[#f58220]/30 pb-1">
                {col.title}
              </h4>
              <ul className="space-y-2 mt-1">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-xs sm:text-sm text-slate-400 hover:text-[#00aeef] transition-colors"
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
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {currentYear} L&apos;Aube Voyage. Est. 1996. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-[#00aeef] transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-[#00aeef] transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
