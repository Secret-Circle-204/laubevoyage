import React from 'react'
import { DawnCompassLoader } from '@/components/ui/loading/DawnCompassLoader'
import { FullScreenLoadingScreen } from '@/components/ui/loading/FullScreenLoadingScreen'

export default function Loading() {
  return (
    <div className="w-full min-h-[calc(100vh-5rem)] flex-grow flex flex-col items-center justify-center">
      <FullScreenLoadingScreen>
        <DawnCompassLoader size="lg" />
      </FullScreenLoadingScreen>
    </div>
  )
}
