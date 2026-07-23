'use client'

import React from 'react'
import Link from 'next/link'
import { useTheme } from '@/providers/theme-provider'
import { Card, Badge, Button } from '@/components/ui'

export default function NotFound() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div className={`min-h-[70vh] flex flex-col items-center justify-center text-center p-8 ${isDark ? 'bg-[#231F20]' : 'bg-slate-50'} transition-colors duration-500`}>
      <Card variant="flat" padding="lg" className="max-w-md w-full shadow-2xl flex flex-col items-center gap-4">
        <span className="text-6xl font-serif font-light text-[#00aeef] tracking-widest">
          404
        </span>

        <Badge variant="secondary" size="sm">
          Destination Unreachable
        </Badge>

        <h2 className={`text-3xl font-serif font-light tracking-tight ${isDark ? 'text-white' : 'text-[#231F20]'}`}>
          Page Not Found
        </h2>

        <div className="h-1 w-16 bg-[#f58220] my-1" />

        <p className={`text-sm leading-relaxed ${isDark ? 'text-[#a7aaac]' : 'text-[#666666]'}`}>
          The experience or destination page you are searching for does not exist or has been relocated.
        </p>

        <Link href="/" className="w-full mt-4">
          <Button variant="primary" size="md" className="w-full">
            Return to Home Page →
          </Button>
        </Link>
      </Card>
    </div>
  )
}
