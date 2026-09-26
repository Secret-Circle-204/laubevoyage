'use client'

import React from 'react'

interface PeekActionsProps {
  collectionSlug: string
  doc: any
  previewUrlTemplate?: string
  onOpenEditDrawer: (id: string | number) => void
  onClose: () => void
}

/**
 * Editorial Mixed-Surface Peek Actions Footer:
 * Soft Neutral Surface (#f1f5f9) hosting the primary operational triggers:
 * - Native DocumentDrawer Edit Trigger (Opens Payload's official document editor)
 * - Public Site Preview (when previewUrlTemplate and slug/id exist)
 * - Close Drawer Trigger
 */
export const PeekActions: React.FC<PeekActionsProps> = ({
  collectionSlug,
  doc,
  previewUrlTemplate,
  onOpenEditDrawer,
  onClose,
}) => {
  const docId = doc?.id
  const slug = doc?.slug

  let publicUrl: string | null = null
  if (previewUrlTemplate && (slug || docId)) {
    publicUrl = previewUrlTemplate
      .replace('{slug}', slug || '')
      .replace('{id}', String(docId || ''))
  }

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
      </div>

      {docId != null && (
        <button
          type="button"
          onClick={() => onOpenEditDrawer(docId)}
          className="ut-peek-btn-primary"
          title="Open official Payload Document Drawer"
        >
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
        </button>
      )}
    </div>
  )
}
