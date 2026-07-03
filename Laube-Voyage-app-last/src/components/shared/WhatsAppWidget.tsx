'use client'

import { MessageCircle } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'

export default function WhatsAppWidget() {
  const pathname = usePathname()
  const [isVisible, setIsVisible] = useState(true)
  const [isHovered, setIsHovered] = useState(false)
  const [whatsappUrl, setWhatsappUrl] = useState('')

  const whatsappNumber = '201234567890' // Replace with actual number

  // Hide on checkout/booking confirmation pages
  const hiddenPaths = ['/checkout', '/booking-confirmation']
  const shouldHide = hiddenPaths.some(path => pathname?.includes(path))

  // Set WhatsApp URL on client side only to avoid hydration mismatch
  useEffect(() => {
    const whatsappMessage = encodeURIComponent(
      `Hello L'Aube Voyage! I was browsing ${window.location.href} and I need some assistance.`
    )
    setWhatsappUrl(`https://wa.me/${whatsappNumber}?text=${whatsappMessage}`)
  }, [pathname])

  // Scroll behavior - hide when at very bottom of page
  useEffect(() => {
    const handleScroll = () => {
      const scrolledToBottom = 
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 100
      setIsVisible(!scrolledToBottom)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  if (shouldHide || !whatsappUrl) return null

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-6 right-6 z-50"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat on WhatsApp"
            className="group flex items-center gap-3"
          >
            {/* Tooltip */}
            <AnimatePresence>
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="bg-white dark:bg-dark-card px-4 py-2 shadow-lg border border-gray/10 dark:border-gray/20 hidden md:block"
                >
                  <p className="text-sm font-medium text-foreground dark:text-dark-foreground whitespace-nowrap">
                    Chat with us
                  </p>
                  <p className="text-xs text-gray">
                    Instant support via WhatsApp
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Button */}
            <div className="relative">
              {/* Ping animation */}
              <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-25" />
              
              {/* Main button */}
              <div className="relative w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 cursor-pointer">
                <MessageCircle className="w-7 h-7 text-white" />
              </div>
            </div>
          </a>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
