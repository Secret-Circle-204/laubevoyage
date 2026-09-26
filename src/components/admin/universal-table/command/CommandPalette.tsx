'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useListQuery, useSelection } from '@payloadcms/ui'
import type { DensityMode, CollectionPresentationConfig } from '../types'
import { composeWhere } from '../utils/composeWhere'
import './command-palette.css'

export interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  collectionSlug: string
  presentation: CollectionPresentationConfig
  density: DensityMode
  onDensityChange: (newDensity: DensityMode) => void
  onOpenPeek?: (id: string | number) => void
  onResetWidths?: () => void
}

interface CommandItem {
  id: string
  title: string
  subtitle?: string
  badge?: string
  icon?: React.ReactNode
  group: 'search' | 'filters' | 'workspace' | 'selection'
  onSelect: () => void
}

const GROUP_LABELS: Record<string, string> = {
  search: 'Search Operations',
  filters: 'Operational Filter Presets',
  workspace: 'Workspace Controls',
  selection: 'Selection Controls',
}

interface CommandPaletteModalProps extends Omit<CommandPaletteProps, 'isOpen'> {}

const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  onClose,
  collectionSlug,
  presentation,
  density,
  onDensityChange,
  onResetWidths,
}) => {
  const { query: listQueryState, refineListData } = useListQuery()
  const { count, selectedIDs, toggleAll } = useSelection()

  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)

  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Close on Escape or Ctrl/Cmd+K while modal is open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleQueryChange = (val: string) => {
    setQuery(val)
    setSelectedIndex(0)
  }

  // Build unified items list dynamically from collection presentation configuration
  const items = useMemo<CommandItem[]>(() => {
    const list: CommandItem[] = []
    const trimmed = query.trim()
    const lowerQuery = trimmed.toLowerCase()

    // 1. Direct Search in Current Collection (Bounded, demand-driven search trigger)
    if (trimmed.length > 0) {
      list.push({
        id: 'direct-search',
        title: `Search ${presentation.title || collectionSlug}: "${trimmed}"`,
        subtitle: `Refines server-side search across indexable fields`,
        badge: 'Search',
        group: 'search',
        icon: (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        ),
        onSelect: () => {
          void refineListData({
            search: trimmed,
            page: 1,
          })
          onClose()
        },
      })
    }

    // 2. Operational Filter Presets (Dynamically extracted from presentation.toolbar.quickFilters)
    const quickFilters = presentation.toolbar?.quickFilters || []
    quickFilters.forEach((filter) => {
      if (filter.source.type === 'static' && Array.isArray(filter.source.options)) {
        filter.source.options.forEach((opt) => {
          const matchTitle = opt.label.toLowerCase().includes(lowerQuery)
          const matchField = filter.label.toLowerCase().includes(lowerQuery)

          if (!lowerQuery || matchTitle || matchField) {
            list.push({
              id: `filter-${filter.id}-${opt.value}`,
              title: `${filter.label}: ${opt.label}`,
              subtitle: `where.${filter.field} = ${opt.value}`,
              group: 'filters',
              icon: (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                </svg>
              ),
              onSelect: () => {
                const condition = opt.whereCondition ?? { equals: opt.value }
                void refineListData({
                  where: composeWhere(listQueryState?.where, filter.field, condition),
                  page: 1,
                })
                onClose()
              },
            })
          }
        })
      }
    })

    // 3. Workspace Controls (Density Modes)
    const densityOptions: Array<{ mode: DensityMode; label: string; height: string }> = [
      { mode: 'comfortable', label: 'Comfortable Density', height: '64px default row height' },
      { mode: 'compact', label: 'Compact Density', height: '48px condensed row height' },
      { mode: 'dense', label: 'Dense Density', height: '36px ultra-compact row height' },
    ]

    densityOptions.forEach((opt) => {
      if (!lowerQuery || opt.label.toLowerCase().includes(lowerQuery) || opt.mode.toLowerCase().includes(lowerQuery)) {
        list.push({
          id: `density-${opt.mode}`,
          title: `Switch Density: ${opt.label}`,
          subtitle: opt.height,
          badge: density === opt.mode ? 'Active' : undefined,
          group: 'workspace',
          icon: (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          ),
          onSelect: () => {
            onDensityChange(opt.mode)
            onClose()
          },
        })
      }
    })

    // Reset Column Widths
    if (onResetWidths && (!lowerQuery || 'reset column widths autosize layout'.includes(lowerQuery))) {
      list.push({
        id: 'reset-column-widths',
        title: 'Reset Column Widths',
        subtitle: 'Auto-fits all columns to optimal balanced boundaries',
        group: 'workspace',
        icon: (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 3 21 3 21 9" />
            <polyline points="9 21 3 21 3 15" />
            <line x1="21" y1="3" x2="14" y2="10" />
            <line x1="3" y1="21" x2="10" y2="14" />
          </svg>
        ),
        onSelect: () => {
          onResetWidths()
          onClose()
        },
      })
    }

    // Reset All Filters
    if (!lowerQuery || 'clear reset all filters'.includes(lowerQuery)) {
      list.push({
        id: 'reset-all-filters',
        title: 'Reset All Filters',
        subtitle: 'Clears all active filters and returns table to initial view',
        group: 'workspace',
        icon: (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        ),
        onSelect: () => {
          void refineListData({
            where: undefined,
            search: undefined,
            page: 1,
          })
          onClose()
        },
      })
    }

    // 4. Selection Operations (when rows are selected)
    const selectedCount = Math.max(selectedIDs?.length || 0, count || 0)
    if (selectedCount > 0) {
      if (!lowerQuery || 'deselect unselect clear'.includes(lowerQuery)) {
        list.push({
          id: 'deselect-all',
          title: `Deselect All (${selectedCount} selected)`,
          subtitle: 'Clears current table row selection',
          group: 'selection',
          icon: (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          ),
          onSelect: () => {
            if (typeof toggleAll === 'function') toggleAll()
            onClose()
          },
        })
      }
    }

    return list
  }, [
    query,
    presentation,
    collectionSlug,
    density,
    count,
    selectedIDs,
    listQueryState?.where,
    refineListData,
    onClose,
    onDensityChange,
    onResetWidths,
    toggleAll,
  ])

  // Derive active clamped index during render
  const activeIndex = items.length === 0 ? 0 : Math.min(selectedIndex, items.length - 1)

  // Keyboard Navigation inside Command Palette
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1 < items.length ? prev + 1 : 0))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : items.length - 1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const selected = items[activeIndex]
        if (selected) {
          selected.onSelect()
        }
      }
    },
    [items, activeIndex],
  )

  return createPortal(
    <div className="ut-command-palette-backdrop" onClick={onClose}>
      <div
        className="ut-command-palette-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Universal Command Palette"
      >
        {/* Header Search Input */}
        <div className="ut-command-palette-header">
          <svg
            className="ut-command-palette-search-icon"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="ut-command-palette-input"
            placeholder={`Type a command, filter, or search ${presentation.title || collectionSlug}...`}
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            type="button"
            className="ut-command-palette-close-badge"
            onClick={onClose}
            title="Close Command Palette (Esc)"
          >
            <kbd>ESC</kbd>
          </button>
        </div>

        {/* Scrollable Command Body */}
        <div ref={listRef} className="ut-command-palette-body">
          {items.length === 0 ? (
            <div className="ut-command-palette-empty">
              No matching commands or filters found for &quot;{query}&quot;
            </div>
          ) : (
            items.map((item, index) => {
              const isSelected = index === activeIndex
              const prevGroup = index > 0 ? items[index - 1].group : null
              const showGroupHeader = item.group !== prevGroup

              return (
                <React.Fragment key={item.id}>
                  {showGroupHeader && (
                    <div className="ut-command-palette-group-title">
                      {GROUP_LABELS[item.group] || item.group}
                    </div>
                  )}
                  <div
                    data-id={item.id}
                    className={`ut-command-palette-item ${isSelected ? 'is-selected' : ''}`}
                    onClick={item.onSelect}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <div className="ut-command-palette-item-left">
                      <span className="ut-command-palette-item-icon">{item.icon}</span>
                      <div className="ut-command-palette-item-content">
                        <span className="ut-command-palette-item-title">{item.title}</span>
                        {item.subtitle && (
                          <span className="ut-command-palette-item-subtitle">{item.subtitle}</span>
                        )}
                      </div>
                    </div>
                    <div className="ut-command-palette-item-right">
                      {item.badge && (
                        <span className="ut-command-palette-item-badge">{item.badge}</span>
                      )}
                      {isSelected && <span className="ut-command-palette-item-kbd">↵ Enter</span>}
                    </div>
                  </div>
                </React.Fragment>
              )
            })
          )}
        </div>

        {/* Footer Quick Hints */}
        <div className="ut-command-palette-footer">
          <div className="ut-command-palette-footer-shortcuts">
            <span>
              <kbd className="ut-command-palette-item-kbd">↑</kbd>{' '}
              <kbd className="ut-command-palette-item-kbd">↓</kbd> Navigate
            </span>
            <span>
              <kbd className="ut-command-palette-item-kbd">↵</kbd> Select
            </span>
            <span>
              <kbd className="ut-command-palette-item-kbd">ESC</kbd> Dismiss
            </span>
          </div>
          <span>Operating Workspace • Universal</span>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export const CommandPalette: React.FC<CommandPaletteProps> = (props) => {
  if (!props.isOpen || typeof document === 'undefined') {
    return null
  }
  return <CommandPaletteModal {...props} />
}

