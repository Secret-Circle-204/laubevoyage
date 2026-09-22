'use client'

import React from 'react'

interface PeekActionsProps {
  collectionSlug: string
  doc: any
  onOpenEditDrawer: (id: string | number) => void
  onClose: () => void
}

/**
 * Editorial Mixed-Surface Peek Actions Footer:
 * Soft Neutral Surface (#f1f5f9) hosting the primary operational triggers:
 * - Native DocumentDrawer Edit Trigger (Opens Payload's official document editor)
 * - Public Site Preview (when slug exists)
 * - Close Drawer Trigger
 */
export const PeekActions: React.FC<PeekActionsProps> = ({
  collectionSlug,
  doc,
  onOpenEditDrawer,
  onClose,
}) => {
  const docId = doc?.id
  const slug = doc?.slug

  const publicUrl =
    collectionSlug === 'experiences' && slug
      ? `/experiences/${slug}`
      : null

  return (
    <div className="ut-peek-footer">
      <div className="ut-peek-btn-group">
        <button
          type="button"
          onClick={onClose}
          className="ut-peek-btn-secondary"
        >
          Close
        </button>

        {publicUrl && (
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ut-peek-btn-secondary"
            title="Preview on live website"
          >
            <span>Preview</span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        )}
        {collectionSlug === 'bookings' && docId != null && (
          <button
            type="button"
            onClick={() => onOpenEditDrawer(docId)}
            className="ut-peek-btn-secondary"
            title="Open Document Editor"
          >
            <span>Edit Record</span>
          </button>
        )}
      </div>

      {docId != null && (
        <button
          type="button"
          onClick={() => onOpenEditDrawer(docId)}
          className="ut-peek-btn-primary"
          title={
            collectionSlug === 'bookings'
              ? 'Open Booking Operations (Status, Deposit, Financials)'
              : 'Open official Payload Document Drawer'
          }
        >
          {collectionSlug === 'bookings' ? (
            <>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <span>Open Booking Operations</span>
            </>
          ) : (
            <>
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              <span>Edit Record</span>
            </>
          )}
        </button>
      )}
    </div>
  )
}
