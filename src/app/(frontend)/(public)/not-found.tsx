import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui'

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8 gap-4">
      <h1 className="text-6xl font-extrabold text-[#2e3192]">404</h1>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Page Not Found</h2>
      <p className="text-slate-600 dark:text-slate-400 max-w-md">
        The experience or page you are looking for does not exist or has been moved.
      </p>
      <Link href="/">
        <Button variant="accent">Return Home</Button>
      </Link>
    </div>
  )
}
