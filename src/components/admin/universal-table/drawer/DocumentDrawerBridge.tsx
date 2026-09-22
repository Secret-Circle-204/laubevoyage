'use client'

import React, { useEffect, useRef } from 'react'
import { useDocumentDrawer } from '@payloadcms/ui'

interface DocumentDrawerInstanceProps {
  collectionSlug: string
  docId: string | number
  onSave?: (savedDoc: any) => void
  onClose: () => void
}

/**
 * Isolated Document Drawer Instance:
 * Mounts synchronously with an exact (collectionSlug, docId) key.
 * This guarantees the drawer slug is derived synchronously without stale slug race conditions.
 */
const DocumentDrawerInstance: React.FC<DocumentDrawerInstanceProps> = ({
  collectionSlug,
  docId,
  onSave,
  onClose,
}) => {
  const [DocumentDrawer, , { openDrawer, isDrawerOpen }] = useDocumentDrawer({
    collectionSlug,
    id: docId as any,
  })

  // Open the drawer immediately upon mount
  useEffect(() => {
    openDrawer()
  }, [openDrawer])

  // Track closure: when isDrawerOpen transitions from true -> false, notify parent
  const hasOpenedRef = useRef(false)
  useEffect(() => {
    if (isDrawerOpen) {
      hasOpenedRef.current = true
    } else if (hasOpenedRef.current && !isDrawerOpen) {
      onClose()
    }
  }, [isDrawerOpen, onClose])

  return (
    <DocumentDrawer
      onSave={({ doc, result }) => {
        const payloadDoc = doc || result
        if (onSave && payloadDoc) {
          onSave(payloadDoc)
        }
      }}
    />
  )
}

interface DocumentDrawerBridgeProps {
  collectionSlug: string
  docId: string | number | null
  onSave?: (savedDoc: any) => void
  onClose: () => void
}

/**
 * DocumentDrawerBridge:
 * Renders Payload's official DocumentDrawer whenever a document ID is provided.
 * Uses a unique key to ensure clean mount/unmount and lifecycle safety.
 */
export const DocumentDrawerBridge: React.FC<DocumentDrawerBridgeProps> = ({
  collectionSlug,
  docId,
  onSave,
  onClose,
}) => {
  if (docId == null) {
    return null
  }

  return (
    <DocumentDrawerInstance
      key={`${collectionSlug}-${String(docId)}`}
      collectionSlug={collectionSlug}
      docId={docId}
      onSave={onSave}
      onClose={onClose}
    />
  )
}
