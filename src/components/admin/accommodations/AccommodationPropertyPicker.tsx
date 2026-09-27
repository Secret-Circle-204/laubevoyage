'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import type { CatalogAccommodation } from './types'
import type {
  CatalogAccommodationDTO,
  DestinationStopOption,
} from '@/application/actions/accommodation-admin-actions'
import { getAccommodationsForAdminAction } from '@/application/actions/accommodation-admin-actions'
import './AccommodationPropertyPicker.css'

interface AccommodationPropertyPickerProps {
  selectedPropertyId: number
  catalog: CatalogAccommodation[]
  journeyCityIds?: number[]
  destinationStops: DestinationStopOption[]
  stayExistingPropertyIds?: number[]
  readOnly?: boolean
  defaultCityId?: number
  onSelectProperty: (propertyId: number, propertyDTO?: CatalogAccommodationDTO) => void
}

const TYPE_LABELS: Record<string, string> = {
  hotel: 'Hotel',
  resort: 'Resort',
  cruise: 'Nile Cruise',
  camp: 'Desert Camp',
  lodge: 'Lodge',
}

const AVAILABLE_TYPES = ['hotel', 'resort', 'cruise', 'camp', 'lodge']
const PAGE_SIZE = 10

export const AccommodationPropertyPicker: React.FC<AccommodationPropertyPickerProps> = ({
  selectedPropertyId,
  catalog,
  journeyCityIds,
  destinationStops,
  stayExistingPropertyIds = [],
  readOnly = false,
  defaultCityId,
  onSelectProperty,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedCityId, setSelectedCityId] = useState<number | 'all'>(
    defaultCityId ?? 'all',
  )
  const [selectedType, setSelectedType] = useState<string>('all')
  const [page, setPage] = useState<number>(1)
  const [loading, setLoading] = useState<boolean>(false)
  const [pageDocs, setPageDocs] = useState<CatalogAccommodationDTO[]>([])
  const [pagination, setPagination] = useState<{
    totalDocs: number
    totalPages: number
    page: number
    limit: number
    hasNextPage: boolean
    hasPrevPage: boolean
  } | null>(null)

  // Sync selectedCityId when defaultCityId changes (Official React pattern without cascading renders)
  const [prevDefaultCityId, setPrevDefaultCityId] = useState<number | undefined>(defaultCityId)
  if (prevDefaultCityId !== defaultCityId) {
    setPrevDefaultCityId(defaultCityId)
    setSelectedCityId(defaultCityId ?? 'all')
    setPage(1)
  }

  // Debounce search input to avoid querying on every keystroke
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const handleSearchChange = (val: string) => {
    setSearchTerm(val)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(val)
      setPage(1)
    }, 250)
  }

  const handleCityChange = (cityId: number | 'all') => {
    setSelectedCityId(cityId)
    setPage(1)
  }

  const handleTypeChange = (type: string) => {
    setSelectedType(type)
    setPage(1)
  }

  // Resolved journey city IDs
  const resolvedJourneyCityIds = useMemo(() => {
    if (journeyCityIds && journeyCityIds.length > 0) return journeyCityIds
    return destinationStops.map((d) => d.id)
  }, [journeyCityIds, destinationStops])

  // Server-side demand-driven fetch for current page
  useEffect(() => {
    let isMounted = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)

    getAccommodationsForAdminAction({
      journeyCityIds: resolvedJourneyCityIds,
      selectedCityId: selectedCityId === 'all' ? undefined : selectedCityId,
      type: selectedType === 'all' ? undefined : selectedType,
      search: debouncedSearch.trim() || undefined,
      page,
      limit: PAGE_SIZE,
    })
      .then((res) => {
        if (!isMounted) return
        if (res.success) {
          setPageDocs(res.docs)
          setPagination({
            totalDocs: res.totalDocs,
            totalPages: res.totalPages,
            page: res.page,
            limit: res.limit,
            hasNextPage: res.hasNextPage,
            hasPrevPage: res.hasPrevPage,
          })
        }
      })
      .catch((err) => {
        console.warn('[AccommodationPropertyPicker] Bounded query error:', err)
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [resolvedJourneyCityIds, selectedCityId, selectedType, debouncedSearch, page])

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [])

  return (
    <div className="ae-picker-root">
      {/* 1. Search Bar */}
      <div className="ae-picker-search-bar">
        <svg
          className="ae-picker-search-icon"
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="text"
          className="ae-picker-search-input"
          placeholder="Search properties by name..."
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
        {searchTerm && (
          <button
            type="button"
            className="ae-picker-clear-search"
            onClick={() => handleSearchChange('')}
            title="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {/* 2. Filter Groups */}
      <div className="ae-picker-filter-sections">
        {destinationStops.length > 0 && (
          <div className="ae-picker-filter-group">
            <span className="ae-picker-filter-heading">DESTINATION</span>
            <div className="ae-picker-filter-tabs">
              <button
                type="button"
                className={`ae-picker-tab ${selectedCityId === 'all' ? 'ae-picker-tab--active' : ''}`}
                onClick={() => handleCityChange('all')}
              >
                All
              </button>
              {destinationStops.map((stop) => (
                <button
                  key={stop.id}
                  type="button"
                  className={`ae-picker-tab ${
                    selectedCityId === stop.id ? 'ae-picker-tab--active' : ''
                  }`}
                  onClick={() => handleCityChange(stop.id)}
                >
                  {stop.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="ae-picker-filter-group">
          <span className="ae-picker-filter-heading">TYPE</span>
          <div className="ae-picker-filter-tabs">
            <button
              type="button"
              className={`ae-picker-tab ${selectedType === 'all' ? 'ae-picker-tab--active' : ''}`}
              onClick={() => handleTypeChange('all')}
            >
              All
            </button>
            {AVAILABLE_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                className={`ae-picker-tab ${selectedType === t ? 'ae-picker-tab--active' : ''}`}
                onClick={() => handleTypeChange(t)}
              >
                {TYPE_LABELS[t] || t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Results List */}
      <div className="ae-picker-results-container">
        <div className="ae-picker-results-header">
          {pagination ? (
            <span>
              {pagination.totalDocs} {pagination.totalDocs === 1 ? 'property' : 'properties'} available
              {loading && <span className="ae-picker-loading-badge"> · Loading...</span>}
            </span>
          ) : (
            <span>Properties</span>
          )}
        </div>

        {!loading && pageDocs.length === 0 ? (
          <div className="ae-picker-empty">
            <p>No accommodations match your search or filters.</p>
            {(searchTerm || selectedCityId !== 'all' || selectedType !== 'all') && (
              <button
                type="button"
                className="ae-picker-reset-btn"
                onClick={() => {
                  handleSearchChange('')
                  handleCityChange('all')
                  handleTypeChange('all')
                }}
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className={`ae-picker-results-list ${loading ? 'ae-picker-results-list--loading' : ''}`}>
            {pageDocs.map((hotel) => {
              const isSelected = selectedPropertyId === hotel.id
              const isAlreadyInStay = stayExistingPropertyIds.includes(hotel.id)
              const locationStr =
                hotel.cityName && hotel.countryName
                  ? `${hotel.cityName} · ${hotel.countryName}`
                  : hotel.cityName || ''
              const typeStr = TYPE_LABELS[hotel.type || ''] || hotel.type || 'Hotel'
              const ratingStr = hotel.rating ? ` · ★ ${hotel.rating} star` : ''

              return (
                <div
                  key={hotel.id}
                  className={`ae-picker-item ${isSelected ? 'ae-picker-item--selected' : ''}`}
                >
                  <div className="ae-picker-item-info">
                    <span className="ae-picker-item-name">{hotel.name}</span>
                    <div className="ae-picker-item-meta">
                      {locationStr && <span>{locationStr}</span>}
                      {locationStr && (typeStr || ratingStr) && <span className="ae-meta-sep">•</span>}
                      <span>{typeStr}{ratingStr}</span>
                    </div>
                  </div>

                  <div className="ae-picker-item-action">
                    {isSelected ? (
                      <span className="ae-picker-status-selected">
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Selected
                      </span>
                    ) : isAlreadyInStay ? (
                      <span className="ae-picker-status-in-stay">In this stay</span>
                    ) : (
                      <button
                        type="button"
                        className="ae-picker-btn-select"
                        disabled={readOnly}
                        onClick={() => onSelectProperty(hotel.id, hotel)}
                      >
                        Select
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* 4. Established Server-Side Pagination Bar */}
        {pagination && pagination.totalPages > 1 && (
          <div className="ae-picker-pagination">
            <span className="ae-picker-pagination-info">
              Showing <strong>{(page - 1) * pagination.limit + 1}</strong>–
              <strong>{Math.min(page * pagination.limit, pagination.totalDocs)}</strong> of{' '}
              <strong>{pagination.totalDocs}</strong> properties
            </span>
            <div className="ae-picker-pagination-actions">
              <button
                type="button"
                className="ae-picker-page-btn"
                disabled={!pagination.hasPrevPage || loading}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                ← Previous
              </button>
              <span className="ae-picker-page-indicator">
                {page} / {pagination.totalPages}
              </span>
              <button
                type="button"
                className="ae-picker-page-btn"
                disabled={!pagination.hasNextPage || loading}
                onClick={() => setPage((prev) => prev + 1)}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
