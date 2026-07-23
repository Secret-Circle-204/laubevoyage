'use client'

import React from 'react'
import { Button } from '@/components/ui'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8 gap-4">
      <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">Something went wrong</h2>
      <p className="text-slate-600 dark:text-slate-400 max-w-md">
        We encountered an unexpected error loading this page. Please try again.
      </p>
      <Button variant="primary" onClick={() => reset()}>
        Try Again
      </Button>
    </div>
  )
}
