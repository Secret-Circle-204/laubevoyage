import React from 'react'
import { Skeleton, Spinner } from '@/components/ui'

export default function Loading() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 gap-4">
      <Spinner size="lg" />
      <Skeleton className="h-6 w-48" />
    </div>
  )
}
