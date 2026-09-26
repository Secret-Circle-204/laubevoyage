'use client'

import React from 'react'
import { useSelection, useConfig, useListQuery, EditMany } from '@payloadcms/ui'
import type { ClientCollectionConfig } from 'payload'
import type { CollectionPresentationConfig } from '../types'
import './bulk-actions.css'

export interface BulkActionBarProps {
  collectionSlug: string
  presentation: CollectionPresentationConfig
  collectionConfig?: ClientCollectionConfig
  onOpenPeek?: (id: string | number) => void
  onDocUpdated?: (doc: any) => void
  onExecuteBulkAction?: (actionId: string, selectedIDs: (string | number)[]) => Promise<void> | void
}

/**
 * Universal Floating Bulk Action Bar:
 * - 100% Generic Presentation & Orchestration Shell.
 * - Zero custom bulk engines or parallel mutation loops.
 * - Delegates multi-document data mutations to Payload's native EditMany engine.
 * - Respects collection capabilities (e.g. bulkEdit: false for domain-protected collections).
 * - Forwards active query where constraint to protect 'select-all across pages' operations.
 * - Provides clean selection feedback, declarative bulk actions, and instant deselect.
 */
export const BulkActionBar: React.FC<BulkActionBarProps> = ({
  collectionSlug,
  presentation,
  collectionConfig: collectionConfigFromProps,
  onExecuteBulkAction,
}) => {
  const { count, selectedIDs, toggleAll } = useSelection()
  const { getEntityConfig } = useConfig()
  const listQueryContext = useListQuery?.()
  const currentWhere = listQueryContext?.query?.where

  const collectionConfig =
    collectionConfigFromProps || (collectionSlug ? getEntityConfig({ collectionSlug }) : undefined)

  const selectedCount = Math.max(selectedIDs?.length || 0, count || 0)
  const isEnabled = presentation.capabilities?.bulkActions !== false
  const isBulkEditAvailable =
    presentation.capabilities?.bulkEdit !== false &&
    !(collectionConfig as any)?.admin?.disableBulkEdit &&
    Boolean(collectionConfig)

  const customBulkActions = presentation.bulkActions || []

  if (!isEnabled || selectedCount <= 0) {
    return null
  }

  return (
    <div className="ut-bulk-bar-container" role="region" aria-label="Bulk Operations Bar">
      <div className="ut-bulk-bar-selection-pill">
        <span className="ut-bulk-bar-count-badge">{selectedCount}</span>
        <span>Selected</span>
      </div>

      <div className="ut-bulk-bar-divider" />

      <div className="ut-bulk-bar-actions">
        {/* Payload Native Bulk Edit: Presentation Trigger delegating to Payload's native EditMany engine */}
        {isBulkEditAvailable && collectionConfig && (
          <div className="ut-bulk-edit-container">
            <EditMany
              collection={collectionConfig}
              {...({ modalPrefix: 'ut-bulk', where: currentWhere } as any)}
            />
          </div>
        )}

        {/* Configured Domain/Collection Bulk Actions (if declared by collection presentation) */}
        {customBulkActions.map((action) => (
          <button
            key={action.id}
            type="button"
            className={`ut-bulk-btn ${action.variant === 'danger' ? 'ut-bulk-btn-cancel' : 'ut-bulk-btn-inspect'}`}
            title={action.label}
            onClick={() => {
              if (onExecuteBulkAction && selectedIDs) {
                void onExecuteBulkAction(action.id, selectedIDs)
              }
            }}
          >
            {action.label}
          </button>
        ))}

        {/* Deselect All */}
        <button
          type="button"
          className="ut-bulk-btn ut-bulk-btn-deselect"
          onClick={() => {
            if (typeof toggleAll === 'function') toggleAll()
          }}
          title="Deselect all records"
        >
          Deselect All
        </button>
      </div>
    </div>
  )
}

