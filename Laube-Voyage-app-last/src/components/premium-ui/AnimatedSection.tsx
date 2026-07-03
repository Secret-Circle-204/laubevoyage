'use client'

import { motion, Variants } from 'framer-motion'
import { ReactNode } from 'react'

interface AnimatedSectionProps {
  children: ReactNode
  delay?: number // delay in seconds (e.g., 0.1, 0.2, 0.3)
  animation?: 'fade-up' | 'fade-left' | 'fade-right' | 'scale' | 'none'
  className?: string
  once?: boolean // animate only once when in view (default: true)
}

// Animation variants for different types
const getVariants = (animation: string): Variants => {
  switch (animation) {
    case 'fade-up':
      return {
        hidden: { opacity: 0, y: 50 },
        visible: { opacity: 1, y: 0 }
      }
    case 'fade-left':
      return {
        hidden: { opacity: 0, x: -50 },
        visible: { opacity: 1, x: 0 }
      }
    case 'fade-right':
      return {
        hidden: { opacity: 0, x: 50 },
        visible: { opacity: 1, x: 0 }
      }
    case 'scale':
      return {
        hidden: { opacity: 0, scale: 0.8 },
        visible: { opacity: 1, scale: 1 }
      }
    case 'none':
      return {
        hidden: {},
        visible: {}
      }
    default:
      return {
        hidden: { opacity: 0, y: 50 },
        visible: { opacity: 1, y: 0 }
      }
  }
}

export function AnimatedSection({ 
  children, 
  delay = 0, 
  animation = 'fade-up',
  className = '',
  once = true
}: AnimatedSectionProps) {
  const variants = getVariants(animation)

  return (
    <motion.div 
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin: "-100px" }} // Trigger slightly before element is fully visible
      variants={variants}
      transition={{
        duration: 0.6,
        delay: delay,
        ease: [0.22, 1, 0.36, 1] // Custom easing for smooth motion
      }}
    >
      {children}
    </motion.div>
  )
}

// Stagger container for animating children with stagger
export function AnimatedContainer({ 
  children, 
  className = '',
  staggerDelay = 0.1
}: { 
  children: ReactNode
  className?: string 
  staggerDelay?: number
}) {
  return (
    <motion.div 
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: staggerDelay
          }
        }
      }}
    >
      {children}
    </motion.div>
  )
}

// Child item for use inside AnimatedContainer
export function AnimatedItem({ 
  children, 
  className = '',
  animation = 'fade-up'
}: { 
  children: ReactNode
  className?: string
  animation?: 'fade-up' | 'fade-left' | 'fade-right' | 'scale'
}) {
  const variants = getVariants(animation)
  
  return (
    <motion.div 
      className={className}
      variants={variants}
      transition={{
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1]
      }}
    >
      {children}
    </motion.div>
  )
}
