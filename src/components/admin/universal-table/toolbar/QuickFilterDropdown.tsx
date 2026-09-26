'use client'

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useListQuery, useConfig } from '@payloadcms/ui'
import type { Where } from 'payload'
import type { FilterDefinition, TableFilterOption } from '../types'
import { composeWhere } from '../utils/composeWhere'

interface QuickFilterDropdownProps {
  filter: FilterDefinition
  collectionSlug?: string
  resolvedOptions?: TableFilterOption[]
}

function matchesOptionCondition(condVal: unknown, option: TableFilterOption): boolean {
  if (option.whereCondition) {
    if (condVal && typeof condVal === 'object') {
      const condObj = condVal as Record<string, unknown>
      const condIn = condObj.in
      const optIn = option.whereCondition.in
      if (Array.isArray(optIn) && Array.isArray(condIn)) {
        const optInStr = [...optIn].map(String).sort().join(',')
        const condInStr = [...condIn].map(String).sort().join(',')
        return optInStr === condInStr
      }
      if (option.whereCondition.equals !== undefined) {
        return String(condObj.equals) === String(option.whereCondition.equals)
      }
    }
    return false
  }
  if (typeof condVal === 'object' && condVal !== null) {
    const condObj = condVal as Record<string, unknown>
    if (condObj.equals !== undefined) {
      return String(condObj.equals) === option.value
    }
  }
  return false
}

function extractFieldValue(
  where: Where | undefined,
  field: string,
  options: TableFilterOption[],
): string | undefined {
  if (!where || typeof where !== 'object') return undefined

  const checkCondition = (fieldCond: any): string | undefined => {
    if (!fieldCond) return undefined
    for (const opt of options) {
      if (matchesOptionCondition(fieldCond, opt)) {
        return opt.value
      }
    }
    if (fieldCond.equals !== undefined) {
      return String(fieldCond.equals)
    }
    return undefined
  }

  const findInNode = (node: any): string | undefined => {
    if (!node || typeof node !== 'object') return undefined
    if (node[field] !== undefined) {
      const match = checkCondition(node[field])
      if (match) return match
    }
    if (Array.isArray(node.and)) {
      for (const item of node.and) {
        const match = findInNode(item)
        if (match) return match
      }
    }
    if (Array.isArray(node.or)) {
      for (const item of node.or) {
        const match = findInNode(item)
        if (match) return match
      }
    }
    return undefined
  }

  return findInNode(where)
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
  const [relationshipSearch, setRelationshipSearch] = useState('')
  const [relationPage, setRelationPage] = useState(1)
  const [hasNextPage, setHasNextPage] = useState(false)
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

  // 2. Bounded, demand-driven relationship retrieval
  const fetchRelationOptions = useCallback(
    async (pageToFetch: number, search: string, append: boolean = false) => {
      if (!isRelationship) return
      const relationTo = (filter.source as any).relationTo
      const labelField = (filter.source as any).labelField || 'name'
      const valueField = (filter.source as any).valueField || 'id'

      setIsLoadingRelation(true)
      try {
        let url = `/api/${relationTo}?limit=25&page=${pageToFetch}&depth=0`
        if (labelField) {
          url += `&sort=${labelField}`
        }
        if (search.trim()) {
          url += `&where[${labelField}][like]=${encodeURIComponent(search.trim())}`
        }

        const res = await fetch(url)
        if (!res.ok) return
        const data = await res.json()

        if (data && Array.isArray(data.docs)) {
          const mapped: TableFilterOption[] = data.docs.map((doc: any) => ({
            label: String(doc[labelField] || doc.title || doc.name || doc.id),
            value: String(doc[valueField] || doc.id),
          }))

          setFetchedOptions((prev) => {
            if (!append) return mapped
            const existingValues = new Set(prev.map((o) => o.value))
            const newOptions = mapped.filter((o) => !existingValues.has(o.value))
            return [...prev, ...newOptions]
          })
          setHasNextPage(Boolean(data.hasNextPage))
          setRelationPage(pageToFetch)
        }
      } catch (err) {
        console.error('[QuickFilterDropdown] Error fetching relationship options:', err)
      } finally {
        setIsLoadingRelation(false)
      }
    },
    [filter.source, isRelationship],
  )

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
      void fetchRelationOptions(1, '', false)
    }
  }

  // Debounced search when user types inside relationship filter
  useEffect(() => {
    if (!isOpen || !isRelationship) return
    const timer = setTimeout(() => {
      void fetchRelationOptions(1, relationshipSearch, false)
    }, 250)
    return () => clearTimeout(timer)
  }, [relationshipSearch, isOpen, isRelationship, fetchRelationOptions])

  // 3. Prioritized options: Static Config > Schema > Resolved > Lazy Fetched
  const options: TableFilterOption[] = useMemo(() => {
    if (filter.source.type === 'static' && filter.source.options) {
      return filter.source.options
    }
    if (schemaOptions && schemaOptions.length > 0) {
      return schemaOptions
    }
    if (resolvedOptions && resolvedOptions.length > 0) {
      return resolvedOptions
    }
    return fetchedOptions
  }, [filter.source, schemaOptions, resolvedOptions, fetchedOptions])

  // 4. Extract active value from Payload where state
  const activeValue = useMemo(() => {
    return extractFieldValue(query?.where, filter.field, options) || ''
  }, [query?.where, filter.field, options])

  // Resolve active relationship document label if not yet present in options
  useEffect(() => {
    if (!isRelationship || !activeValue) return
    const match = options.find((opt) => opt.value === activeValue)
    if (!match) {
      const relationTo = (filter.source as any).relationTo
      const labelField = (filter.source as any).labelField || 'name'
      const valueField = (filter.source as any).valueField || 'id'

      fetch(`/api/${relationTo}/${activeValue}?depth=0`)
        .then((res) => (res.ok ? res.json() : null))
        .then((doc) => {
          if (doc) {
            const singleOpt: TableFilterOption = {
              label: String(doc[labelField] || doc.title || doc.name || doc.id),
              value: String(doc[valueField] || doc.id),
            }
            setFetchedOptions((prev) => {
              if (prev.some((o) => o.value === singleOpt.value)) return prev
              return [singleOpt, ...prev]
            })
          }
        })
        .catch((err) => {
          console.error(`[QuickFilterDropdown] Failed to resolve relationship label for ${activeValue}:`, err)
        })
    }
  }, [activeValue, isRelationship, filter.source, options])

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

    const selectedOption = value ? options.find((o) => o.value === value) : undefined
    const condition = selectedOption
      ? (selectedOption.whereCondition ?? { equals: selectedOption.value })
      : null

    const nextWhere = composeWhere(query?.where, filter.field, condition)
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
          {isRelationship && (
            <div className="p-2 border-b border-white/10">
              <input
                type="text"
                placeholder={`Search ${filter.label}...`}
                value={relationshipSearch}
                onChange={(e) => setRelationshipSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="w-full px-2.5 py-1 text-xs rounded bg-white/10 text-white placeholder-slate-400 border border-white/10 focus:outline-none focus:border-amber-400"
              />
            </div>
          )}

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

          {isRelationship && hasNextPage && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                void fetchRelationOptions(relationPage + 1, relationshipSearch, true)
              }}
              disabled={isLoadingRelation}
              className="w-full text-center py-2 text-xs text-amber-400 hover:text-amber-300 font-medium border-t border-white/10 disabled:opacity-50"
            >
              {isLoadingRelation ? 'Loading more...' : 'Load more...'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
