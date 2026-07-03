'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface LoaderProps {
  isLoading?: boolean
}

export function TravelLoader({ isLoading = true }: LoaderProps) {
  const [visible, setVisible] = useState(isLoading)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => setVisible(false), 600)
      return () => clearTimeout(timer)
    }
    setVisible(true)
  }, [isLoading])

  if (!visible || !mounted) return null

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#231F20]"
        >
          <div className="relative flex flex-col items-center">
            {/* Elegant Logo Animation */}
            <motion.div
              className="text-center mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
            >
              <div className="flex items-center justify-center gap-4 mb-6">
                <motion.div
                  className="h-px w-12 bg-[#F58220]"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.5, duration: 0.6 }}
                />
                <motion.span
                  className="text-[#00AEEF] text-xs tracking-[0.4em] uppercase"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  Est. 1996
                </motion.span>
                <motion.div
                  className="h-px w-12 bg-[#F58220]"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.5, duration: 0.6 }}
                />
              </div>

              <h1 className="text-4xl font-serif tracking-[0.15em] text-white">L&apos;AUBE</h1>
              <motion.p
                className="text-[#F58220] text-sm tracking-[0.4em] uppercase mt-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                Voyage
              </motion.p>
            </motion.div>

            {/* Animated Globe & Plane */}
            <motion.div
              className="relative w-24 h-24 mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {/* Rotating Globe Lines */}
              <svg
                className="w-full h-full animate-[spin_8s_linear_infinite]"
                viewBox="0 0 100 100"
              >
                <defs>
                  <linearGradient id="globeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#2E3192" />
                    <stop offset="100%" stopColor="#00AEEF" />
                  </linearGradient>
                </defs>
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="url(#globeGrad)"
                  strokeWidth="1.5"
                  strokeDasharray="8 4"
                />
                <ellipse
                  cx="50"
                  cy="50"
                  rx="40"
                  ry="18"
                  fill="none"
                  stroke="url(#globeGrad)"
                  strokeWidth="1"
                />
                <ellipse
                  cx="50"
                  cy="50"
                  rx="18"
                  ry="40"
                  fill="none"
                  stroke="url(#globeGrad)"
                  strokeWidth="1"
                />
              </svg>

              {/* Pulsing Plane */}
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <svg className="w-8 h-8 text-[#F58220]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                </svg>
              </motion.div>
            </motion.div>

            {/* Elegant Loading Bar */}
            <div className="relative w-48">
              <div className="h-px bg-[#A7AAAC]/30 w-full" />
              <motion.div
                className="absolute top-0 left-0 h-px"
                style={{
                  background: 'linear-gradient(90deg, #2E3192, #00AEEF, #F58220)',
                }}
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{
                  duration: 2,
                  ease: 'easeInOut',
                  repeat: Infinity,
                }}
              />
            </div>

            {/* Subtle Text */}
            <motion.p
              className="text-[#A7AAAC] text-xs tracking-[0.2em] uppercase mt-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.3, 0.8, 0.3] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            >
              Preparing your journey
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default TravelLoader
