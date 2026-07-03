'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home,
  Map,
  Award,
  Settings,
  LogOut,
  User,
  Bell,
  Menu,
  X,
  LucideIcon,
  Star,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { ThemeToggle } from '@/components/premium-ui/ThemeToggle'
import { Button } from '@/components/premium-ui/Button'
import type { User as PayloadUser } from '@/payload-types'

interface SidebarItemProps {
  href: string
  icon: LucideIcon
  label: string
  active: boolean
}

const SidebarItem = ({ href, icon: Icon, label, active }: SidebarItemProps) => (
  <Link href={href}>
    <motion.div
      whileHover={{ x: 5 }}
      whileTap={{ scale: 0.98 }}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
        active
          ? 'bg-linear-to-r from-primary/20 to-secondary/20 text-primary border border-primary/10 shadow-[0_4px_12px_rgba(245,130,32,0.1)]'
          : 'text-stone-500 hover:text-secondary dark:text-stone-400 dark:hover:text-primary hover:bg-stone-100 dark:hover:bg-white/5'
      }`}
    >
      <Icon size={20} className={active ? 'text-primary' : ''} />
      <span className="font-medium">{label}</span>
      {active && (
        <motion.div
          layoutId="active-pill"
          className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(245,130,32,0.6)]"
        />
      )}
    </motion.div>
  </Link>
)

export default function DashboardShell({
  children,
  user,
}: {
  children: React.ReactNode
  user: PayloadUser
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await fetch('/api/users/logout', {
        method: 'POST',
      })
      router.push('/')
      router.refresh()
    } catch (_error) {
      console.error('Logout failed:', _error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  const menuItems = [
    { href: '/dashboard', icon: Home, label: 'Overview' },
    { href: '/dashboard/trips', icon: Map, label: 'My Trips' },
    { href: '/dashboard/points', icon: Award, label: 'My Points' },
    { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
    { href: '/dashboard/reviews', icon: Star, label: 'Reviews' },
  ]

  const userName = user?.email?.split('@')[0] || 'Traveler'
  const userInitials = userName.substring(0, 2).toUpperCase()
  const userTier = user?.loyaltyTier || 'Traveler'

  return (
    <div className="min-h-screen bg-(--background) text-(--foreground) transition-colors duration-500">
      {/* Mobile Header */}
      <div
        className={`fixed top-0 left-0 right-0 z-50 md:hidden flex items-center justify-between px-6 h-16 transition-all duration-300 ${
          scrolled
            ? 'bg-white/80 dark:bg-black/80 backdrop-blur-lg border-b border-stone-200 dark:border-white/10'
            : ''
        }`}
      >
        <h1 className="text-xl font-serif font-bold text-secondary dark:text-primary tracking-tighter uppercase italic">
          My Laube Voyage
        </h1>
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 rounded-full bg-stone-100 dark:bg-white/5 text-stone-600 dark:text-stone-300"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-60 md:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-80 bg-white dark:bg-[#0F0F0F] z-70 p-6 flex flex-col md:hidden"
            >
              <div className="flex items-center justify-between mb-10">
                <h2 className="text-2xl font-serif font-bold text-secondary dark:text-primary italic">
                  My Laube Voyage
                </h2>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-2 rounded-full hover:bg-stone-100 dark:hover:bg-white/5"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-2 flex-1">
                {menuItems.map((item) => (
                  <SidebarItem key={item.href} {...item} active={pathname === item.href} />
                ))}
              </div>

              <div className="mt-auto pt-6 border-t border-stone-100 dark:border-white/5">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-primary to-orange-600 flex items-center justify-center text-white font-bold text-lg shadow-lg uppercase">
                    {userInitials}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-stone-900 dark:text-white uppercase tracking-tight">
                      {userName}
                    </p>
                    <p className="text-xs text-primary font-medium">{userTier} Member</p>
                  </div>
                  <ThemeToggle />
                </div>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors group disabled:opacity-50"
                >
                  <LogOut size={20} className="group-hover:rotate-12 transition-transform" />
                  <span className="font-medium">
                    {isLoggingOut ? 'Signing Out...' : 'Sign Out'}
                  </span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="fixed left-0 top-0 bottom-0 w-72 bg-white/50 dark:bg-black/20 backdrop-blur-2xl border-r border-stone-200 dark:border-white/5 hidden md:flex flex-col z-40 transition-all duration-500">
          <div className="p-8">
            <Link href="/" className="inline-block group">
              <h2 className="text-3xl font-serif font-bold text-secondary dark:text-primary tracking-tighter transition-all group-hover:tracking-normal italic uppercase line-clamp-1">
                My Laube Voyage
              </h2>
              <p className="text-[10px] text-stone-400 dark:text-stone-500 font-medium tracking-[0.2em] uppercase mt-1">
                Personal Luxury Portal
              </p>
            </Link>
          </div>

          <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto">
            {menuItems.map((item) => (
              <SidebarItem key={item.href} {...item} active={pathname === item.href} />
            ))}
          </nav>

          <div className="p-6 mt-auto">
            <div className="bg-stone-100/50 dark:bg-white/5 rounded-2xl p-4 border border-stone-200 dark:border-white/10 group transition-all duration-300 hover:bg-white dark:hover:bg-white/10 hover:shadow-xl dark:hover:shadow-2xl hover:shadow-primary/5">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl bg-secondary dark:bg-primary flex items-center justify-center text-white dark:text-secondary font-bold text-sm shadow-md transition-transform group-hover:scale-105 uppercase">
                  {userInitials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-stone-900 dark:text-white truncate uppercase tracking-tight">
                    {userName}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-[10px] text-stone-500 dark:text-stone-400 font-bold uppercase">
                      {userTier}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="text-stone-400 dark:text-stone-500 hover:text-red-500 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                  title="Sign Out"
                >
                  <LogOut size={18} className={isLoggingOut ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Workspace */}
        <main className="flex-1 md:ml-72 min-h-screen relative">
          {/* Top Bar Navigation */}
          <header
            className={`sticky top-0 z-30 flex items-center justify-between px-8 h-20 transition-all duration-500 ${
              scrolled
                ? 'bg-white/80 dark:bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-stone-200 dark:border-white/10 shadow-sm'
                : 'bg-transparent'
            }`}
          >
            <div className="flex items-center gap-4">
              <h2 className="text-sm font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500 hidden lg:block">
                My Laube Voyage Hub
              </h2>
            </div>

            <div className="flex items-center gap-6">
              <div className="hidden sm:flex items-center gap-2">
                <Button
                  variant="ghost"
                  className="rounded-full w-10 h-10 p-0 hover:bg-stone-100 dark:hover:bg-white/5 border-none transition-transform active:scale-95"
                >
                  <Bell size={20} className="text-stone-500 dark:text-stone-400" />
                </Button>
                <ThemeToggle />
              </div>

              <div className="h-4 w-px bg-stone-200 dark:bg-white/10 hidden sm:block" />

              <div className="flex items-center gap-3 bg-stone-100/80 dark:bg-white/5 hover:bg-stone-200/80 dark:hover:bg-white/10 px-3 py-1.5 rounded-full border border-stone-200/50 dark:border-white/5 transition-all cursor-pointer group hover:border-primary/30">
                <User
                  size={16}
                  className="text-stone-500 dark:text-stone-400 group-hover:text-primary transition-colors"
                />
                <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  My Profile
                </span>
              </div>
            </div>
          </header>

          {/* Dynamic Content Area */}
          <div className="p-4 lg:p-12 max-w-[1800px] mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              {children}
            </motion.div>
          </div>

          {/* Background Decorative Elements */}
          <div className="fixed top-0 right-0 -z-10 w-96 h-96 bg-primary/5 rounded-full blur-[120px] pointer-events-none transition-colors duration-1000" />
          <div className="fixed bottom-0 left-0 -z-10 w-64 h-64 bg-secondary/10 dark:bg-primary/5 rounded-full blur-[100px] pointer-events-none transition-colors duration-1000" />
        </main>
      </div>
    </div>
  )
}
