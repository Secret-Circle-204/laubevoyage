'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useListQuery, useConfig } from '@payloadcms/ui'
import type { Where } from 'payload'
import type { FilterDefinition, TableFilterOption } from '../types'

interface QuickFilterDropdownProps {
  filter: FilterDefinition
  collectionSlug?: string
  resolvedOptions?: TableFilterOption[]
}

function extractFieldValue(where: Where | undefined, field: string): string | undefined {
  if (!where || typeof where !== 'object') return undefined
  const directField = where[field] as Record<string, any> | undefined
  if (directField?.equals !== undefined) {
    return String(directField.equals)
  }
  if (Array.isArray(where.and)) {
    for (const condition of where.and) {
      const condField = condition?.[field] as Record<string, any> | undefined
      if (condField?.equals !== undefined) {
        return String(condField.equals)
      }
    }
  }
  return undefined
}

function buildWhereClause(
  currentWhere: Where | undefined,
  field: string,
  selectedValue: string | undefined | null,
): Where | undefined {
  // 1. Removing filter
  if (!selectedValue) {
    if (!currentWhere || typeof currentWhere !== 'object') {
      return undefined
    }

    if (Array.isArray(currentWhere.and)) {
      const remainingAnd = currentWhere.and.filter(
        (cond) => !cond || (cond[field] as any)?.equals === undefined,
      )
      if (remainingAnd.length === 0) {
        return undefined
      }
      return {
        ...currentWhere,
        and: remainingAnd,
      }
    }

    // Top-level single field or multi-field condition
    const { [field]: _removed, ...rest } = currentWhere
    return Object.keys(rest).length > 0 ? (rest as Where) : undefined
  }

  // 2. Adding or updating filter
  const condition: Where = { [field]: { equals: selectedValue } }

  if (!currentWhere || typeof currentWhere !== 'object') {
    return condition
  }

  if (Array.isArray(currentWhere.and)) {
    const updatedAnd = currentWhere.and.filter(
      (cond) => !cond || (cond[field] as any)?.equals === undefined,
    )
    return {
      ...currentWhere,
      and: [...updatedAnd, condition],
    }
  }

  const { [field]: _old, ...existingOther } = currentWhere
  if (Object.keys(existingOther).length === 0) {
    return condition
  }
  return {
    and: [existingOther as Where, condition],
  }
}

export const QuickFilterDropdown: React.FC<QuickFilterDropdownProps> = ({
  filter,
  collectionSlug,
  resolvedOptions,
}) => {
  const { query, refineListData } = useListQuery()
  const { getEntityConfig } = useConfig()
  const [isOpen, setIsOpen] = useState(false)
  const [fetchedOptions, setFetchedOptions] = useState<TableFilterOption[]>([])
  const [isLoadingRelation, setIsLoadingRelation] = useState(false)
  const hasFetchedRelationRef = useRef(false)
  const dropdownRef = useRef<HTMLDivElement | null>(null)

  const isRelationship = filter.source.type === 'relationship'

  // 1. Authoritative Schema Options: Extracted directly from Payload collection config
  const collectionConfig = collectionSlug ? getEntityConfig({ collectionSlug }) : null
  const schemaOptions = useMemo<TableFilterOption[] | null>(() => {
    if (!collectionConfig?.fields) return null
    const field = collectionConfig.fields.find((f: any) => f.name === filter.field) as any
    if (field && Array.isArray(field.options) && field.options.length > 0) {
      return field.options.map((opt: any) => {
        if (typeof opt === 'string') {
          return { label: opt, value: opt }
        }
        return {
          label: typeof opt.label === 'string' ? opt.label : String(opt.value),
          value: String(opt.value),
        }
      })
    }
    return null
  }, [collectionConfig, filter.field])

  // 2. Lazy-load relationship options on demand (event-driven when the user opens the dropdown)
  const handleToggleOpen = () => {
    const nextOpen = !isOpen
    setIsOpen(nextOpen)

    if (
      nextOpen &&
      isRelationship &&
      !hasFetchedRelationRef.current &&
      (!resolvedOptions || resolvedOptions.length === 0)
    ) {
      hasFetchedRelationRef.current = true
      setIsLoadingRelation(true)

      const relationTo = (filter.source as any).relationTo
      const labelField = (filter.source as any).labelField || 'name'
      const valueField = (filter.source as any).valueField || 'id'

      fetch(`/api/${relationTo}?limit=100&depth=0`)
        .then((res) => res.json())
        .then((data) => {
          if (data && Array.isArray(data.docs)) {
            const mapped: TableFilterOption[] = data.docs.map((doc: any) => ({
              label: String(doc[labelField] || doc.title || doc.name || doc.id),
              value: String(doc[valueField] || doc.id),
            }))
            setFetchedOptions(mapped)
          }
        })
        .catch(() => {})
        .finally(() => {
          setIsLoadingRelation(false)
        })
    }
  }

  // 3. Prioritized options: Schema > Resolved > Static > Lazy Fetched
  const options: TableFilterOption[] = useMemo(() => {
    if (schemaOptions && schemaOptions.length > 0) {
      return schemaOptions
    }
    if (resolvedOptions && resolvedOptions.length > 0) {
      return resolvedOptions
    }
    if (filter.source.type === 'static' && filter.source.options) {
      return filter.source.options
    }
    return fetchedOptions
  }, [schemaOptions, resolvedOptions, filter.source, fetchedOptions])

  // 4. Extract active value from Payload where state
  const activeValue = useMemo(() => {
    return extractFieldValue(query?.where, filter.field) || ''
  }, [query?.where, filter.field])

  // Active label display
  const activeLabel = useMemo(() => {
    if (!activeValue) return filter.placeholder || `All ${filter.label}`
    const match = options.find((opt) => opt.value === activeValue)
    return match ? match.label : activeValue
  }, [activeValue, options, filter])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick)
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [isOpen])

  // 5. Select Option with strict enum contract validation
  const handleSelectOption = (value: string) => {
    setIsOpen(false)
    if (value === activeValue) return

    // Strict validation: verify value belongs to allowed options if not empty
    if (value && options.length > 0 && !options.some((o) => o.value === value)) {
      console.warn(
        `[QuickFilterDropdown] Discarding invalid query value "${value}" for field "${filter.field}".`,
      )
      return
    }

    const nextWhere = buildWhereClause(query?.where, filter.field, value)
    void refineListData({
      where: nextWhere,
      page: 1,
    })
  }

  const isFiltered = Boolean(activeValue)

  return (
    <div className="ut-filter-dropdown" ref={dropdownRef}>
      <button
        type="button"
        onClick={handleToggleOpen}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={`ut-filter-btn ${isFiltered ? 'ut-filter-btn-active' : ''}`}
      >
        <span className="ut-filter-btn-label">{activeLabel}</span>
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`ut-filter-chevron ${isOpen ? 'ut-filter-chevron-open' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div role="listbox" className="ut-filter-menu">
          {/* Default 'All' Option */}
          <button
            type="button"
            role="option"
            aria-selected={!activeValue}
            onClick={() => handleSelectOption('')}
            className={`ut-filter-option ${!activeValue ? 'ut-filter-option-active' : ''}`}
          >
            <span>{filter.placeholder || `All ${filter.label}`}</span>
            {!activeValue && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>

          <div className="ut-filter-divider" />

          {isLoadingRelation && options.length === 0 && (
            <div className="px-3.5 py-2 text-xs text-slate-400">Loading options...</div>
          )}

          {options.map((opt) => {
            const isSelected = opt.value === activeValue
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelectOption(opt.value)}
                className={`ut-filter-option ${isSelected ? 'ut-filter-option-active' : ''}`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
