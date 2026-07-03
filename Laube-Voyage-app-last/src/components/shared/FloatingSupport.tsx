'use client'

import { motion } from 'framer-motion'
import { Phone } from 'lucide-react'

export function FloatingSupport() {
  return (
    <div className="fixed bottom-8 right-8 z-50 flex flex-col gap-4">
      {/* WhatsApp Button */}
      <motion.a
        href="https://wa.me/yournumber" // Replace with real number
        target="_blank"
        rel="noopener noreferrer"
        initial={{ opacity: 0, scale: 0.5, x: 20 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="w-14 h-14 bg-[#25D366] text-white rounded-full flex items-center justify-center shadow-2xl hover:bg-[#128C7E] transition-colors"
        title="Chat on WhatsApp"
      >
        <svg
          viewBox="0 0 24 24"
          width="24"
          height="24"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-white"
        >
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-10.6 8.38 8.38 0 0 1 3.8.9L21 3z"></path>
        </svg>
      </motion.a>

      {/* Contact Button */}
      <motion.a
        href="/contact"
        initial={{ opacity: 0, scale: 0.5, x: 20 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="w-14 h-14 bg-secondary text-white rounded-full flex items-center justify-center shadow-2xl hover:bg-primary transition-colors"
        title="Contact Us"
      >
        <Phone className="w-6 h-6" />
      </motion.a>
    </div>
  )
}
