'use client'

import React, { useEffect, useState } from 'react'
import { useConfig, usePayloadAPI } from '@payloadcms/ui'
import { PeekHeader } from './PeekHeader'
import { ExperiencePeekContent, BookingPeekContent } from './PeekSection'
import { PeekActions } from './PeekActions'
import { SlotsDrawerBridge } from './SlotsDrawerBridge'
import './peek-drawer.css'

interface PeekDrawerProps {
  collectionSlug: string
  docId: string | number | null
  initialRow: any
  onClose: () => void
  onOpenEditDrawer: (id: string | number) => void
}

/**
 * Editorial Mixed-Surface Peek Drawer:
 * - Read-only operational inspection side panel
 * - Instant 0ms presentation using initialRow
 * - Seamless bounded single-document read via usePayloadAPI (?depth=1)
 * - Deep Obsidian header + Light body + Soft Neutral actions
 * - Width: w-[min(520px,100vw)] responsive sheet
 * - Keyboard accessible (ESC to close)
 */
export const PeekDrawer: React.FC<PeekDrawerProps> = ({
  collectionSlug,
  docId,
  initialRow,
  onClose,
  onOpenEditDrawer,
}) => {
  const [isSlotsOpen, setIsSlotsOpen] = useState(false)
  const { config } = useConfig()
  const apiRoute = config?.routes?.api || '/api'
  const endpoint = docId ? `${apiRoute}/${collectionSlug}/${docId}?depth=1` : ''

  // Bounded single-document read with initialData optimistic instant hydration
  const [{ data: fetchedDoc }] = usePayloadAPI(endpoint, {
    initialData: initialRow,
  })

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (docId == null) {
    return null
  }

  const effectiveDoc = fetchedDoc || initialRow || {}
  const title =
    effectiveDoc.title ||
    effectiveDoc.name ||
    effectiveDoc.bookingNumber ||
    `Record #${docId}`
  const status = effectiveDoc.availability || effectiveDoc.status

  return (
    <>
      {/* Dimmed backdrop with subtle blur */}
      <div
        className="ut-peek-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-in Mixed-Surface Drawer Panel */}
      <div
        className="ut-peek-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ut-peek-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Deep Obsidian Header */}
        <PeekHeader
          title={title}
          subtitle={effectiveDoc.slug || (typeof effectiveDoc.city === 'object' ? effectiveDoc.city?.name : null)}
          collectionSlug={collectionSlug}
          status={status}
          onClose={onClose}
        />

        {/* Soft Light Scrollable Body */}
        <div className="ut-peek-scroll flex-1 p-2">
          {collectionSlug === 'experiences' ? (
            <ExperiencePeekContent
              doc={effectiveDoc}
              onManageSlots={() => setIsSlotsOpen(true)}
            />
          ) : collectionSlug === 'bookings' ? (
            <BookingPeekContent doc={effectiveDoc} />
          ) : (
            <div className="p-4 text-xs text-slate-600">
              <pre className="bg-white p-3 rounded-lg border border-slate-200 overflow-x-auto text-[11px] font-mono">
                {JSON.stringify(effectiveDoc, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Action Bar */}
        <PeekActions
          collectionSlug={collectionSlug}
          doc={effectiveDoc}
          onOpenEditDrawer={onOpenEditDrawer}
          onClose={onClose}
        />
      </div>

      {/* Authoritative Departure Slots Control Surface Bridge */}
      <SlotsDrawerBridge
        isOpen={isSlotsOpen}
        experienceId={docId}
        experienceTitle={title}
        onClose={() => setIsSlotsOpen(false)}
      />
    </>
  )
}
