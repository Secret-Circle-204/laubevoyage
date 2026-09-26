'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useConfig } from '@payloadcms/ui'
import type { CollectionPresentationConfig } from '../types'
import { PeekHeader } from './PeekHeader'
import {
  ConfiguredPeekContent,
  GenericPeekContent,
  PeekDrawerSkeleton,
} from './PeekSection'
import { PeekActions } from './PeekActions'
import { SlotsDrawerBridge } from './SlotsDrawerBridge'
import './peek-drawer.css'

interface PeekDrawerProps {
  collectionSlug: string
  docId: string | number | null
  initialRow?: any
  presentation?: CollectionPresentationConfig
  onClose: () => void
  onOpenEditDrawer: (id: string | number) => void
  onDocUpdated?: (freshDoc: any) => void
}

/**
 * Editorial Mixed-Surface Peek Drawer:
 * - Read-only operational inspection side panel
 * - Authoritative single-document read with depth=1 for full relationship hydration
 * - Project Skeleton displayed strictly while request is genuinely pending
 * - Error boundary with retry trigger
 * - 100% Collection-Agnostic & Config-driven
 * - Deep Obsidian header + Light body + Soft Neutral actions
 * - Keyboard accessible (ESC to close)
 */
export const PeekDrawer: React.FC<PeekDrawerProps> = ({
  collectionSlug,
  docId,
  initialRow,
  presentation,
  onClose,
  onOpenEditDrawer,
  onDocUpdated,
}) => {
  const [isSlotsOpen, setIsSlotsOpen] = useState(false)
  const [doc, setDoc] = useState<any>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const { config } = useConfig()
  const apiRoute = config?.routes?.api || '/api'
  const depth = presentation?.peekDepth ?? 1

  // Fetch authoritative single document (?depth=...) on mount or when docId/collection changes
  useEffect(() => {
    if (!docId) return

    const controller = new AbortController()

    async function loadDocument() {
      try {
        const res = await fetch(`${apiRoute}/${collectionSlug}/${docId}?depth=${depth}`, {
          signal: controller.signal,
          headers: {
            Accept: 'application/json',
          },
        })

        if (!res.ok) {
          throw new Error(`Failed to load document (${res.status} ${res.statusText})`)
        }

        const data = await res.json()
        if (!controller.signal.aborted) {
          setDoc(data)
          setIsLoading(false)
        }
      } catch (err: any) {
        if (controller.signal.aborted || err.name === 'AbortError') return
        console.error(`[PeekDrawer] Failed to fetch document #${docId} from ${collectionSlug}:`, err)
        setError(err.message || 'Failed to load authoritative document.')
        setIsLoading(false)
      }
    }

    loadDocument()

    return () => {
      controller.abort()
    }
  }, [apiRoute, collectionSlug, docId, depth])

  // User-triggered retry action (safe outside effect body)
  const handleRetry = useCallback(() => {
    if (!docId) return
    setIsLoading(true)
    setError(null)

    fetch(`${apiRoute}/${collectionSlug}/${docId}?depth=${depth}`, {
      headers: {
        Accept: 'application/json',
      },
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Failed to load document (${res.status} ${res.statusText})`)
        }
        const data = await res.json()
        setDoc(data)
        setIsLoading(false)
      })
      .catch((err) => {
        setError(err.message || 'Failed to load authoritative document.')
        setIsLoading(false)
      })
  }, [apiRoute, collectionSlug, docId, depth])

  // Re-read authoritative document upon operational action completion
  const handleActionSuccess = useCallback(async () => {
    if (!docId) return
    try {
      const res = await fetch(`${apiRoute}/${collectionSlug}/${docId}?depth=${depth}`)
      if (res.ok) {
        const freshDoc = await res.json()
        if (freshDoc && freshDoc.id) {
          setDoc(freshDoc)
          if (onDocUpdated) {
            onDocUpdated(freshDoc)
          }
        }
      }
    } catch (e) {
      console.error('[PeekDrawer] Failed to re-read authoritative document after action:', e)
    }
  }, [apiRoute, collectionSlug, docId, depth, onDocUpdated])

  // Native browser-level print utility scoping directly to the authoritative Booking representation
  const handlePrint = useCallback(() => {
    if (typeof window === 'undefined') return

    const panel = document.querySelector('.ut-peek-panel') as HTMLElement | null
    if (!panel) {
      window.print()
      return
    }

    // Create an isolated, zero-footprint iframe to bypass framework layout clipping
    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.top = '-9999px'
    iframe.style.left = '-9999px'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    iframe.setAttribute('aria-hidden', 'true')
    document.body.appendChild(iframe)

    const iframeDoc = iframe.contentWindow?.document
    if (!iframeDoc) {
      window.print()
      return
    }

    // Collect all loaded project styles (fonts, colors, layouts)
    let stylesHtml = ''
    document.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => {
      stylesHtml += node.outerHTML
    })

    // Clone the active Peek panel and strip non-paper interactive controls
    const clone = panel.cloneNode(true) as HTMLElement
    clone
      .querySelectorAll('.print-hide, .ut-peek-close-btn, .ut-peek-footer, .ut-peek-chevron')
      .forEach((el) => el.remove())

    iframeDoc.open()
    iframeDoc.write(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Booking Record</title>
    ${stylesHtml}
    <style>
      @page {
        margin: 12mm 15mm;
        size: auto;
      }
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        color: #0f172a !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }
      .ut-peek-panel {
        position: static !important;
        width: 100% !important;
        max-width: 100% !important;
        height: auto !important;
        box-shadow: none !important;
        border: none !important;
        animation: none !important;
        transform: none !important;
        background: #ffffff !important;
      }
      .ut-peek-scroll {
        overflow: visible !important;
        height: auto !important;
        max-height: none !important;
        padding: 0 !important;
      }
      .ut-peek-header {
        border-radius: 6px !important;
        margin-bottom: 14px !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .ut-peek-cockpit-card {
        box-shadow: none !important;
        border: 1px solid #cbd5e1 !important;
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
      .ut-peek-card-header {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .ut-peek-cockpit-row-3 {
        grid-template-columns: 1fr !important;
      }
      .ut-peek-card-icon,
      .ut-peek-subbox,
      .ut-peek-cust-stat-box,
      .ut-peek-timeline-box,
      .ut-peek-payment-status-block,
      .ut-peek-badge-status,
      .ut-peek-psb-badge {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .ut-peek-traveler-row {
        cursor: default !important;
        transform: none !important;
      }
      .print-hide {
        display: none !important;
      }
    </style>
  </head>
  <body>
    ${clone.outerHTML}
  </body>
</html>`)
    iframeDoc.close()

    // Trigger native browser print on the isolated document
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus()
        iframe.contentWindow?.print()
      } catch (e) {
        console.error('[PeekDrawer] print error, falling back:', e)
        window.print()
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe)
          }
        }, 1500)
      }
    }, 250)
  }, [])

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

  // Header display prioritizes authoritative doc, falling back to initialRow
  const effectiveDoc = doc || initialRow || {}
  const title = presentation?.titleField
    ? typeof presentation.titleField === 'function'
      ? presentation.titleField(effectiveDoc)
      : effectiveDoc[presentation.titleField]
    : effectiveDoc.title ||
      effectiveDoc.name ||
      effectiveDoc.bookingNumber ||
      `Record #${docId}`

  const subtitle = presentation?.subtitleField
    ? typeof presentation.subtitleField === 'function'
      ? presentation.subtitleField(effectiveDoc)
      : effectiveDoc[presentation.subtitleField]
    : effectiveDoc.slug ||
      (typeof effectiveDoc.city === 'object' && effectiveDoc.city?.name
        ? effectiveDoc.city.name
        : null)

  const status = effectiveDoc.availability || effectiveDoc.status

  // Resolve hero image if configured
  const heroField = presentation?.heroField
  const heroVal = heroField && doc ? doc[heroField] : null
  const heroUrl =
    typeof heroVal === 'object' && heroVal?.url
      ? heroVal.url
      : typeof heroVal === 'string'
        ? heroVal
        : null

  const heroCaption =
    typeof doc?.city === 'object' && doc.city?.name ? doc.city.name : null

  const isWide = presentation?.peekWidth === 'wide'

  return (
    <>
      {/* Dimmed backdrop */}
      <div
        className="ut-peek-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-in Mixed-Surface Drawer Panel */}
      <div
        className={`ut-peek-panel ${isWide ? 'is-wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ut-peek-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Deep Obsidian Header */}
        <PeekHeader
          title={title}
          subtitle={subtitle}
          collectionSlug={collectionSlug}
          kicker={presentation?.title}
          status={status}
          createdAt={effectiveDoc.createdAt}
          updatedAt={effectiveDoc.updatedAt}
          docId={effectiveDoc.id}
          onPrint={handlePrint}
          onClose={onClose}
        />

        {/* Soft Light Scrollable Body */}
        <div className="ut-peek-scroll flex-1 p-2">
          {isLoading ? (
            <PeekDrawerSkeleton hero={Boolean(presentation?.heroField)} />
          ) : error ? (
            <div className="ut-peek-card" style={{ padding: '24px', textAlign: 'center' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px auto',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                Failed to Load Document
              </h4>
              <p style={{ margin: '0 0 14px 0', fontSize: '12px', color: '#64748b' }}>
                {error}
              </p>
              <button
                type="button"
                onClick={handleRetry}
                className="ut-peek-btn-secondary"
                style={{ display: 'inline-flex', margin: '0 auto' }}
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              {heroUrl && (
                <div className="ut-peek-hero">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={heroUrl} alt={title || 'Document Hero'} />
                  <div className="ut-peek-hero-gradient" />
                  {heroCaption && (
                    <div className="ut-peek-hero-caption">{heroCaption}</div>
                  )}
                </div>
              )}

              {presentation?.peekSections && presentation.peekSections.length > 0 ? (
                <ConfiguredPeekContent
                  doc={doc}
                  sections={presentation.peekSections}
                  onActionSuccess={handleActionSuccess}
                  onManageSlots={() => setIsSlotsOpen(true)}
                />
              ) : (
                <GenericPeekContent doc={doc} />
              )}
            </>
          )}
        </div>

        {/* Action Bar */}
        <PeekActions
          collectionSlug={collectionSlug}
          doc={effectiveDoc}
          previewUrlTemplate={presentation?.previewUrlTemplate}
          onOpenEditDrawer={onOpenEditDrawer}
          onClose={onClose}
        />
      </div>

      {/* Embedded Departure Slots Control Surface Bridge */}
      {isSlotsOpen && doc?.id != null && (
        <SlotsDrawerBridge
          isOpen={isSlotsOpen}
          experienceId={doc.id}
          experienceTitle={doc.title}
          onClose={() => setIsSlotsOpen(false)}
        />
      )}
    </>
  )
}
