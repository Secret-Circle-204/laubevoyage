'use client'

import React, { useEffect } from 'react'
import { DepartureSlotsEditor } from '@/components/admin/DepartureSlotsEditor'

interface SlotsDrawerBridgeProps {
  isOpen: boolean
  experienceId: string | number | null
  experienceTitle?: string | null
  onClose: () => void
}

/**
 * SlotsDrawerBridge:
 * Pure integration bridge that directly embeds the Authoritative
 * DepartureSlotsEditor without duplicating slot logic or state.
 */
export const SlotsDrawerBridge: React.FC<SlotsDrawerBridgeProps> = ({
  isOpen,
  experienceId,
  experienceTitle,
  onClose,
}) => {
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !experienceId) return null

  return (
    <>
      <div
        className="ut-peek-backdrop"
        style={{ zIndex: 1050 }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="ut-slots-slideover"
        role="dialog"
        aria-modal="true"
        aria-label={`Departure Slots for ${experienceTitle || 'Experience'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Deep Dark Header */}
        <div className="ut-slots-header">
          <div className="ut-slots-header-info">
            <div className="ut-slots-kicker">
              Departure Slots Control Surface
            </div>
            <h2 className="ut-slots-title">
              {experienceTitle ? `Slots: ${experienceTitle}` : `Experience #${experienceId}`}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="ut-slots-back-btn"
            title="Return to Experience Overview (Esc)"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            <span>Close</span>
          </button>
        </div>

        {/* Embedded Authoritative Control Surface */}
        <div className="ut-slots-body">
          <DepartureSlotsEditor id={experienceId} />
        </div>
      </div>
    </>
  )
}
