'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { useTheme } from '@/components/providers/ThemeProvider'

export function Footer() {
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Ensure initial render matches server (dark mode)
  const isDark = mounted ? theme === 'dark' : true

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <footer
      className={`${isDark ? 'bg-[#231F20] border-[#A7AAAC]/10' : 'bg-[#f5f5f5] border-[#231F20]/5'} border-t`}
    >
      {/* Main Footer */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link href="/" className="inline-block mb-8">
              <div className="relative h-12 w-48">
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
            </Link>
            <p
              className={`${isDark ? 'text-[#A7AAAC]' : 'text-[#666666]'} text-sm leading-relaxed mb-8`}
            >
              Crafting extraordinary journeys for the discerning traveler since 1996.
            </p>
            <div className="flex gap-6">
              {['Instagram', 'LinkedIn', 'Twitter'].map((social) => (
                <a
                  key={social}
                  href="#"
                  className={`${isDark ? 'text-[#A7AAAC]/60 hover:text-[#00AEEF]' : 'text-[#666666]/60 hover:text-[#2E3192]'} text-xs tracking-wider uppercase transition-colors duration-300`}
                >
                  {social}
                </a>
              ))}
            </div>
          </div>

          {/* Collections */}
          <div>
            <h4
              className={`${isDark ? 'text-white' : 'text-[#231F20]'} text-sm tracking-[0.2em] uppercase mb-6`}
            >
              Collections
            </h4>
            <ul className="space-y-4">
              {[
                { href: '/destinations', label: 'All Destinations' },
                { href: '/packages', label: 'Packages' },
                { href: '/excursions', label: 'Daily Tours' },
              ].map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className={`${isDark ? 'text-[#A7AAAC] hover:text-[#F58220]' : 'text-[#666666] hover:text-[#F58220]'} text-sm transition-colors duration-300`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4
              className={`${isDark ? 'text-white' : 'text-[#231F20]'} text-sm tracking-[0.2em] uppercase mb-6`}
            >
              Company
            </h4>
            <ul className="space-y-4">
              {[
                { href: '/about', label: 'About Us' },
                { href: '/blog', label: 'Journal' },
                { href: '#', label: 'Careers' },
                { href: '/contact', label: 'Contact' },
              ].map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className={`${isDark ? 'text-[#A7AAAC] hover:text-[#F58220]' : 'text-[#666666] hover:text-[#F58220]'} text-sm transition-colors duration-300`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4
              className={`${isDark ? 'text-white' : 'text-[#231F20]'} text-sm tracking-[0.2em] uppercase mb-6`}
            >
              Connect
            </h4>
            <div className={`space-y-4 ${isDark ? 'text-[#A7AAAC]' : 'text-[#666666]'} text-sm`}>
              <p className="leading-relaxed">For inquiries and reservations:</p>
              <div className="space-y-1">
                <a
                  href="mailto:contact@laubevoyage.com"
                  className="text-[#00AEEF] hover:text-[#F58220] transition-colors block"
                >
                  contact@laubevoyage.com
                </a>
                <a
                  href="mailto:reservation@laubevoyage.com"
                  className="text-[#00AEEF] hover:text-[#F58220] transition-colors block"
                >
                  reservation@laubevoyage.com
                </a>
              </div>
              <p className="text-[#F58220]">+1 (888) 555-0192</p>
              <p className="leading-relaxed pt-2">
                6th, El-Margoushy street, 6th District, Nasr City, Cairo, Egypt
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className={`border-t ${isDark ? 'border-[#A7AAAC]/10' : 'border-[#231F20]/5'}`}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p
            className={`${isDark ? 'text-[#A7AAAC]/60' : 'text-[#666666]/60'} text-xs tracking-wider`}
          >
            © {new Date().getFullYear()} L&apos;AUBE VOYAGE. All rights reserved.
          </p>
          <div className="flex gap-8 text-xs tracking-wider">
            <Link
              href="#"
              className={`${isDark ? 'text-[#A7AAAC]/60 hover:text-white' : 'text-[#666666]/60 hover:text-[#231F20]'} transition-colors`}
            >
              Privacy
            </Link>
            <Link
              href="#"
              className={`${isDark ? 'text-[#A7AAAC]/60 hover:text-white' : 'text-[#666666]/60 hover:text-[#231F20]'} transition-colors`}
            >
              Terms
            </Link>
            <Link
              href="#"
              className={`${isDark ? 'text-[#A7AAAC]/60 hover:text-white' : 'text-[#666666]/60 hover:text-[#231F20]'} transition-colors`}
            >
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
