'use client'

import React from 'react'
import { useTheme } from '@/providers/theme-provider'
import { Card, Badge, Button } from '@/components/ui'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div className={`min-h-[70vh] flex flex-col items-center justify-center text-center p-8 ${isDark ? 'bg-[#231F20]' : 'bg-slate-50'} transition-colors duration-500`}>
      <Card variant="flat" padding="lg" className="max-w-md w-full shadow-2xl flex flex-col items-center gap-4">
        <Badge variant="accent" size="sm">
          System Notice
        </Badge>
        
        <h2 className={`text-3xl font-serif font-light tracking-tight ${isDark ? 'text-white' : 'text-[#231F20]'}`}>
          Unexpected Disruption
        </h2>
        
        <div className="h-1 w-16 bg-[#f58220] my-1" />

        <p className={`text-sm leading-relaxed ${isDark ? 'text-[#a7aaac]' : 'text-[#666666]'}`}>
          We encountered a temporary disruption while loading your journey details. Please try refreshing or click below to retry.
        </p>

        <Button variant="primary" size="md" onClick={() => reset()} className="mt-4 w-full">
          Retry Request →
        </Button>
      </Card>
    </div>
  )
}
