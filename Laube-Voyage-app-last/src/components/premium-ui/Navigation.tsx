'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ThemeToggle } from './ThemeToggle'
import { useTheme } from '@/components/providers/ThemeProvider'

import { useAuth } from '@/components/providers/AuthProvider'

interface SubNavLink {
  href: string
  label: string
  icon: string
}

interface NavLink {
  href?: string
  label: string
  children?: SubNavLink[]
}

export function Navigation() {
  const { user } = useAuth()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { theme } = useTheme()

  // Ensure we match server-side dark mode default until mounted
  const isDark = mounted ? theme === 'dark' : true

  useEffect(() => {
    setMounted(true)
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)

  const navLinks: NavLink[] = [
    { href: '/', label: 'Home' },
    {
      label: 'Explore',
      children: [
        { href: '/destinations', label: 'Destinations', icon: '🌍' },
        { href: '/packages', label: 'Packages', icon: '📦' },
        { href: '/excursions', label: 'Daily Tours', icon: '🧭' },

      ],
    },
    { href: '/blog', label: 'Journal' },
    { href: '/about', label: 'Who We Are' },
    { href: '/contact', label: 'Inquiries' },
  ]

  const userInitial = user?.email?.charAt(0).toUpperCase() || user?.name?.charAt(0).toUpperCase()

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ${
        isScrolled
          ? isDark
            ? 'bg-[#231F20]/95 backdrop-blur-md py-4'
            : 'bg-white/95 backdrop-blur-md shadow-sm py-4'
          : 'bg-transparent py-6'
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="group">
            <div className="relative h-10 w-40 transition-transform duration-500 group-hover:scale-105">
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
          <ul className="hidden lg:flex items-center gap-12">
            {navLinks.map((link) => (
              <li
                key={link.label}
                className="relative group/nav"
                onMouseEnter={() => link.children && setActiveDropdown(link.label)}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                {link.href ? (
                  <Link
                    href={link.href}
                    className={`text-[0.7rem] xl:text-[0.8rem] tracking-[0.2em] uppercase font-medium transition-all duration-300 relative py-2 ${
                      isDark
                        ? 'text-[#A7AAAC] hover:text-[#00AEEF]'
                        : isScrolled
                          ? 'text-[#666666] hover:text-[#2E3192]'
                          : 'text-white/80 hover:text-white'
                    }`}
                  >
                    {link.label}
                    <span className="absolute bottom-0 left-0 w-0 h-px bg-current transition-all duration-300 group-hover/nav:w-full" />
                  </Link>
                ) : (
                  <button
                    className={`flex items-center gap-2 text-[0.7rem] xl:text-[0.8rem] tracking-[0.2em] uppercase font-medium transition-all duration-300 cursor-pointer py-2 ${
                      isDark
                        ? 'text-[#A7AAAC] hover:text-[#00AEEF]'
                        : isScrolled
                          ? 'text-[#666666] hover:text-[#2E3192]'
                          : 'text-white/80 hover:text-white'
                    }`}
                  >
                    {link.label}
                    <motion.span
                      animate={{ rotate: activeDropdown === link.label ? 180 : 0 }}
                      className="text-[0.6rem] opacity-50"
                    >
                      ▼
                    </motion.span>
                  </button>
                )}

                {/* Dropdown Menu */}
                {link.children && (
                  <AnimatePresence>
                    {activeDropdown === link.label && (
                      <motion.div
                        initial={{ opacity: 0, y: 20, pointerEvents: 'none' }}
                        animate={{ opacity: 1, y: 0, pointerEvents: 'auto' }}
                        exit={{ opacity: 0, y: 10, pointerEvents: 'none' }}
                        className={`absolute top-full -left-4 w-60 pt-4`}
                      >
                        <div
                          className={`rounded-xl shadow-2xl overflow-hidden border ${
                            isDark ? 'bg-[#231F20] border-white/5' : 'bg-white border-black/5'
                          }`}
                        >
                          <div className="p-2">
                            {link.children.map((child) => (
                              <Link
                                key={child.href}
                                href={child.href}
                                className={`flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-300 ${
                                  isDark
                                    ? 'hover:bg-white/5 text-stone-400 hover:text-white'
                                    : 'hover:bg-[#2E3192]/5 text-stone-600 hover:text-[#2E3192]'
                                }`}
                              >
                                <span className="text-lg">{child.icon}</span>
                                <span className="text-[0.75rem] tracking-widest uppercase font-medium">
                                  {child.label}
                                </span>
                              </Link>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}
              </li>
            ))}
          </ul>

          {/* Right Side */}
          <div className="hidden lg:flex items-center gap-8">
            <ThemeToggle />

            {user ? (
              <Link href="/dashboard" className="group">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-10 h-10 rounded-full bg-linear-to-br from-[#F58220] to-[#2E3192] flex items-center justify-center text-white font-serif font-bold text-lg shadow-lg border-2 border-white/20"
                >
                  {userInitial}
                </motion.div>
              </Link>
            ) : (
              <div className="flex items-center gap-4">
                <Link
                  href="/login"
                  className={`text-xs tracking-[0.2em] uppercase transition-colors duration-300 ${
                    isDark
                      ? 'text-white hover:text-[#F58220]'
                      : isScrolled
                        ? 'text-[#231F20] hover:text-[#F58220]'
                        : 'text-white hover:text-[#F58220]'
                  }`}
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="px-6 py-2.5 bg-[#F58220] text-white text-xs tracking-[0.2em] uppercase hover:bg-white hover:text-[#F58220] transition-all duration-500 border border-[#F58220]"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-4">
            <ThemeToggle />
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={isDark ? 'p-2 text-white' : 'p-2 text-[#231F20]'}
            >
              <div className="w-6 flex flex-col gap-1.5">
                <motion.span
                  className={`block h-px origin-center ${isDark ? 'bg-white' : isScrolled ? 'bg-[#231F20]' : 'bg-white'}`}
                  animate={{
                    rotate: isMobileMenuOpen ? 45 : 0,
                    y: isMobileMenuOpen ? 6 : 0,
                  }}
                />
                <motion.span
                  className={`block h-px ${isDark ? 'bg-white' : isScrolled ? 'bg-[#231F20]' : 'bg-white'}`}
                  animate={{ opacity: isMobileMenuOpen ? 0 : 1 }}
                />
                <motion.span
                  className={`block h-px origin-center ${isDark ? 'bg-white' : isScrolled ? 'bg-[#231F20]' : 'bg-white'}`}
                  animate={{
                    rotate: isMobileMenuOpen ? -45 : 0,
                    y: isMobileMenuOpen ? -6 : 0,
                  }}
                />
              </div>
            </button>
          </div>
        </nav>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden overflow-hidden"
            >
              <div
                className={`py-8 space-y-6 ${isDark ? '' : 'bg-white/95 rounded-xl mt-4 px-6 shadow-xl'}`}
              >
                <ul className="space-y-4">
                  {navLinks.map((link, index) => (
                    <motion.li
                      key={link.label}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="space-y-2"
                    >
                      {link.href ? (
                        <Link
                          href={link.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`block py-3 text-sm tracking-[0.15em] uppercase transition-colors border-b ${
                            isDark
                              ? 'text-[#A7AAAC] hover:text-[#00AEEF] border-[#A7AAAC]/10'
                              : 'text-[#666666] hover:text-[#2E3192] border-[#231F20]/10'
                          }`}
                        >
                          {link.label}
                        </Link>
                      ) : (
                        <div className="space-y-2">
                          <button
                            onClick={() =>
                              setActiveDropdown(activeDropdown === link.label ? null : link.label)
                            }
                            className={`flex items-center justify-between w-full py-3 text-sm tracking-[0.15em] uppercase border-b ${
                              isDark
                                ? 'text-[#A7AAAC] border-[#A7AAAC]/10'
                                : 'text-[#666666] border-[#231F20]/10'
                            }`}
                          >
                            <span>{link.label}</span>
                            <motion.span
                              animate={{ rotate: activeDropdown === link.label ? 180 : 0 }}
                            >
                              ▼
                            </motion.span>
                          </button>
                          <AnimatePresence>
                            {activeDropdown === link.label && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="pl-4 space-y-2 overflow-hidden"
                              >
                                {link.children?.map((child) => (
                                  <Link
                                    key={child.href}
                                    href={child.href}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`block py-2 text-[0.7rem] tracking-[0.2em] uppercase ${
                                      isDark
                                        ? 'text-stone-500 hover:text-white'
                                        : 'text-stone-400 hover:text-[#2E3192]'
                                    }`}
                                  >
                                    {child.icon} {child.label}
                                  </Link>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </motion.li>
                  ))}
                </ul>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  {user ? (
                    <Link
                      href="/dashboard"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-4 p-4 bg-[#F58220]/10 rounded-xl"
                    >
                      <div className="w-10 h-10 rounded-full bg-linear-to-br from-[#F58220] to-[#2E3192] flex items-center justify-center text-white font-serif font-bold uppercase">
                        {userInitial}
                      </div>
                      <span className="text-sm font-bold tracking-widest uppercase text-[#F58220]">
                        Dashboard
                      </span>
                    </Link>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <Link
                        href="/login"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center justify-center py-4 border text-xs tracking-[0.2em] uppercase rounded-lg ${
                          isDark
                            ? 'border-white/10 text-white'
                            : 'border-[#F58220]/30 text-[#666666]'
                        }`}
                      >
                        Login
                      </Link>
                      <Link
                        href="/register"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center justify-center py-4 bg-[#F58220] text-white text-xs tracking-[0.2em] uppercase shadow-lg shadow-[#F58220]/20 rounded-lg"
                      >
                        Register
                      </Link>
                    </div>
                  )}
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  )
}
