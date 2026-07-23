'use client'

import React from 'react'
import Link from 'next/link'

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-slate-900 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-900">
          {/* Brand Info */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#2e3192] text-white flex items-center justify-center font-bold text-xl shadow-md">
                L
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-xl tracking-tight text-white">L&apos;AUBE VOYAGE</span>
                <span className="text-[10px] uppercase tracking-widest text-[#00aeef] font-semibold -mt-1">
                  Luxury Travel
                </span>
              </div>
            </Link>
            <p className="text-sm leading-relaxed text-slate-400 max-w-sm">
              Discover extraordinary luxury journeys, Nile cruises, and daily tours across Egypt and beyond. Tailored for discerning travelers seeking unmatched experiences.
            </p>
          </div>

          {/* Quick Links */}
          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Explore</h4>
            <Link href="/experiences" className="text-sm hover:text-[#00aeef] transition-colors">
              All Experiences
            </Link>
            <Link href="/destinations" className="text-sm hover:text-[#00aeef] transition-colors">
              Destinations
            </Link>
            <Link href="/experiences?type=package" className="text-sm hover:text-[#00aeef] transition-colors">
              Tour Packages
            </Link>
            <Link href="/experiences?type=daily_tour" className="text-sm hover:text-[#00aeef] transition-colors">
              Daily Tours
            </Link>
          </div>

          {/* Company */}
          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Company</h4>
            <Link href="/about" className="text-sm hover:text-[#00aeef] transition-colors">
              About Us
            </Link>
            <Link href="/blog" className="text-sm hover:text-[#00aeef] transition-colors">
              Travel Blog
            </Link>
            <Link href="/faq" className="text-sm hover:text-[#00aeef] transition-colors">
              FAQs
            </Link>
            <Link href="/contact" className="text-sm hover:text-[#00aeef] transition-colors">
              Contact Us
            </Link>
          </div>

          {/* Legal */}
          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Legal</h4>
            <Link href="/privacy" className="text-sm hover:text-[#00aeef] transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-sm hover:text-[#00aeef] transition-colors">
              Terms of Service
            </Link>
            <Link href="/dashboard" className="text-sm hover:text-[#00aeef] transition-colors">
              Customer Portal
            </Link>
          </div>
        </div>

        {/* Copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {currentYear} L&apos;Aube Voyage. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Built with <span className="text-[#f58220]">★</span> Enterprise Precision
          </p>
        </div>
      </div>
    </footer>
  )
}
