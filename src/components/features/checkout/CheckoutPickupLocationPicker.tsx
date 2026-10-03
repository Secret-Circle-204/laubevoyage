'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Card, Button } from '@/components/ui'
import { useLocale } from '@/providers'

export interface PickupLocationValue {
  label: string
  address: string
  latitude: number
  longitude: number
  source?: 'search' | 'map' | 'current_location' | 'fixed_meeting_point'
  instructions?: string
}

interface CheckoutPickupLocationPickerProps {
  value: PickupLocationValue | null
  onChange: (location: PickupLocationValue | null) => void
  destinationCityName?: string
  destinationCountryName?: string
  experienceTitle?: string
  experienceType?: 'package' | 'daily_tour'
}

function PinIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  )
}

function BuildingIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
    </svg>
  )
}

function CheckIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}

function GpsIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m0 13.5V21m9-9h-2.25M5.25 12H3m15.364 6.364l-1.591-1.591M7.227 7.227L5.636 5.636m12.728 0l-1.591 1.591M7.227 16.773l-1.591 1.591M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function InfoIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
    </svg>
  )
}

interface SearchResultItem {
  id: string
  label: string
  address: string
  lat: number
  lon: number
}

interface PhotonFeatureProperties {
  osm_type?: string
  osm_id?: number
  name?: string
  street?: string
  housenumber?: string
  district?: string
  locality?: string
  city?: string
  county?: string
  state?: string
  country?: string
  postcode?: string
}

interface PhotonFeature {
  type: string
  geometry: {
    type: string
    coordinates: [number, number] // [lon, lat]
  }
  properties?: PhotonFeatureProperties
}

interface PhotonResponse {
  type?: string
  features?: PhotonFeature[]
}

// Unified, open OpenStreetMap raster tile specification
const UNIFIED_OSM_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'osm-tiles': {
      type: 'raster',
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>',
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: 'osm-tiles-layer',
      type: 'raster',
      source: 'osm-tiles',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
}

function buildPhotonAddress(props?: PhotonFeatureProperties): { label: string; address: string } {
  if (!props) {
    return { label: '', address: '' }
  }

  const primaryName = props.name || props.street || ''

  const streetPart = [props.housenumber, props.street].filter(Boolean).join(' ')
  const areaPart = props.district || props.locality || ''
  const cityPart = props.city || props.county || props.state || ''
  const countryPart = props.country || ''

  const addressParts = [
    primaryName !== streetPart ? streetPart : '',
    areaPart,
    cityPart,
    countryPart,
  ].filter(Boolean)

  // Remove duplicates while preserving hierarchy
  const uniqueParts = addressParts.filter((part, idx) => addressParts.indexOf(part) === idx)

  const fullAddress = uniqueParts.length > 0 ? uniqueParts.join(', ') : primaryName

  return {
    label: primaryName,
    address: fullAddress,
  }
}

export function CheckoutPickupLocationPicker({
  value,
  onChange,
  destinationCityName,
  destinationCountryName,
}: CheckoutPickupLocationPickerProps) {
  const { locale } = useLocale()
  const isArabic = locale === 'ar'

  const [isEditing, setIsEditing] = useState<boolean>(!value)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([])
  const [isSearching, setIsSearching] = useState<boolean>(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false)
  const [isLocating, setIsLocating] = useState<boolean>(false)
  const [localNote, setLocalNote] = useState<string>(() => value?.instructions || '')

  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markerRef = useRef<maplibregl.Marker | null>(null)

  // Race safety refs: Monotonic Sequence IDs & AbortControllers
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const searchAbortControllerRef = useRef<AbortController | null>(null)
  const searchRequestIdRef = useRef<number>(0)

  const geocodeAbortControllerRef = useRef<AbortController | null>(null)
  const geocodeRequestIdRef = useRef<number>(0)

  const hasInitializedDestinationCenterRef = useRef<boolean>(false)

  // Cleanup timers & in-flight requests on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
      searchAbortControllerRef.current?.abort()
      geocodeAbortControllerRef.current?.abort()
    }
  }, [])

  // Reverse geocode via Photon API with race protection and AbortController
  const reverseGeocode = useCallback(
    async (lat: number, lon: number): Promise<{ label: string; address: string } | null> => {
      geocodeAbortControllerRef.current?.abort()
      const controller = new AbortController()
      geocodeAbortControllerRef.current = controller

      const reqId = ++geocodeRequestIdRef.current
      setIsGeocoding(true)

      try {
        const url = `https://photon.komoot.io/reverse?lat=${lat}&lon=${lon}&lang=${locale}`
        const res = await fetch(url, { signal: controller.signal })

        if (reqId !== geocodeRequestIdRef.current) {
          // Newer request has already been issued; drop stale response
          return null
        }

        if (!res.ok) {
          setIsGeocoding(false)
          return null
        }

        const data: PhotonResponse = await res.json()
        if (reqId !== geocodeRequestIdRef.current) {
          return null
        }

        setIsGeocoding(false)

        if (Array.isArray(data.features) && data.features.length > 0) {
          const firstFeature = data.features[0]
          const resolved = buildPhotonAddress(firstFeature.properties)
          if (resolved.label || resolved.address) {
            return {
              label: resolved.label || (isArabic ? 'نقطة محددة على الخريطة' : 'Selected Map Location'),
              address: resolved.address || (isArabic ? 'الموقع المحدد على الخريطة' : 'Pinned Location on Map'),
            }
          }
        }

        return {
          label: isArabic ? 'نقطة محددة على الخريطة' : 'Selected Map Location',
          address: isArabic ? 'الموقع المحدد على الخريطة' : 'Pinned Location on Map',
        }
      } catch (err: unknown) {
        if ((err as Error)?.name === 'AbortError') {
          return null
        }
        if (reqId === geocodeRequestIdRef.current) {
          setIsGeocoding(false)
        }
        return null
      }
    },
    [locale, isArabic]
  )

  // Handle location update from map click, drag, search, or GPS
  const handleSelectCoordinate = useCallback(
    async (
      lat: number,
      lon: number,
      source: 'search' | 'map' | 'current_location' | 'fixed_meeting_point',
      customLabel?: string,
      customAddress?: string
    ) => {
      // Reposition marker immediately
      if (markerRef.current) {
        markerRef.current.setLngLat([lon, lat])
      }
      if (mapRef.current) {
        mapRef.current.flyTo({
          center: [lon, lat],
          zoom: 15,
          essential: true,
        })
      }

      let label = customLabel
      let address = customAddress

      if (!label || !address) {
        const geo = await reverseGeocode(lat, lon)
        if (!geo) return // Dropped stale response or aborted
        label = label || geo.label
        address = address || geo.address
      }

      const note = localNote.trim() || undefined

      const updated: PickupLocationValue = {
        label,
        address,
        latitude: lat,
        longitude: lon,
        source,
        instructions: note,
      }

      onChange(updated)
    },
    [reverseGeocode, localNote, onChange]
  )

  // Initialize MapLibre GL Map
  useEffect(() => {
    if (!isEditing || !mapContainerRef.current) return

    if (mapRef.current) {
      mapRef.current.resize()
      return
    }

    // Default neutral center if no location or destination city known yet
    const initialLat = value?.latitude ?? 0
    const initialLon = value?.longitude ?? 0
    const initialZoom = value ? 15 : 2

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: UNIFIED_OSM_STYLE,
      center: [initialLon, initialLat],
      zoom: initialZoom,
      attributionControl: { compact: true },
    })

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right')
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 100, unit: 'metric' }), 'bottom-left')

    // Marker element
    const el = document.createElement('div')
    el.className =
      'w-9 h-9 rounded-full bg-secondary border-2 border-background shadow-2xl flex items-center justify-center cursor-grab active:cursor-grabbing transform -translate-x-1/2 -translate-y-full hover:scale-110 transition-transform ring-4 ring-secondary/20 text-white'
    el.innerHTML = '<svg style="width: 18px; height: 18px;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>'

    const marker = new maplibregl.Marker({
      element: el,
      draggable: true,
    })

    if (value) {
      marker.setLngLat([value.longitude, value.latitude]).addTo(map)
    }

    marker.on('dragend', () => {
      const lngLat = marker.getLngLat()
      void handleSelectCoordinate(lngLat.lat, lngLat.lng, 'map')
    })

    map.on('click', (e: maplibregl.MapMouseEvent) => {
      const { lng, lat } = e.lngLat
      if (!markerRef.current) {
        marker.setLngLat([lng, lat]).addTo(map)
      } else {
        marker.setLngLat([lng, lat])
      }
      void handleSelectCoordinate(lat, lng, 'map')
    })

    mapRef.current = map
    markerRef.current = marker

    const resizeTimer = setTimeout(() => map.resize(), 200)

    return () => {
      clearTimeout(resizeTimer)
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [isEditing, value, handleSelectCoordinate])

  // Center map on legitimate destination city context if value is not yet set
  useEffect(() => {
    if (value || hasInitializedDestinationCenterRef.current) return
    if (!destinationCityName || !mapRef.current) return

    hasInitializedDestinationCenterRef.current = true
    const destinationQuery = [destinationCityName, destinationCountryName].filter(Boolean).join(', ')

    void (async () => {
      try {
        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(
          destinationQuery
        )}&limit=1&lang=${locale}`
        const res = await fetch(url)
        if (res.ok) {
          const data: PhotonResponse = await res.json()
          if (Array.isArray(data.features) && data.features.length > 0) {
            const [lon, lat] = data.features[0].geometry.coordinates
            if (mapRef.current) {
              mapRef.current.flyTo({
                center: [lon, lat],
                zoom: 12,
                essential: true,
              })
            }
          }
        }
      } catch {
        // Controlled non-blocking destination resolution
      }
    })()
  }, [destinationCityName, destinationCountryName, value, locale])

  // Search input handler with AbortController and monotonic sequence IDs
  const handleSearchInputChange = (query: string) => {
    setSearchQuery(query)
    setSearchError(null)

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (!query.trim() || query.length < 2) {
      setSearchResults([])
      setIsSearching(false)
      searchAbortControllerRef.current?.abort()
      return
    }

    setIsSearching(true)
    searchTimeoutRef.current = setTimeout(async () => {
      searchAbortControllerRef.current?.abort()
      const controller = new AbortController()
      searchAbortControllerRef.current = controller

      const reqId = ++searchRequestIdRef.current

      try {
        let url = `https://photon.komoot.io/api/?q=${encodeURIComponent(
          query
        )}&limit=6&lang=${locale}`

        if (value) {
          url += `&lat=${value.latitude}&lon=${value.longitude}`
        }

        const res = await fetch(url, { signal: controller.signal })

        if (reqId !== searchRequestIdRef.current) {
          return // Dropped stale search response
        }

        if (!res.ok) {
          setSearchError(isArabic ? 'تعذر البحث عن الموقع حالياً' : 'Search service temporarily unavailable')
          setIsSearching(false)
          return
        }

        const data: PhotonResponse = await res.json()

        if (reqId !== searchRequestIdRef.current) {
          return
        }

        if (Array.isArray(data.features) && data.features.length > 0) {
          const results: SearchResultItem[] = data.features.map((f) => {
            const resolved = buildPhotonAddress(f.properties)
            const osmType = f.properties?.osm_type || 'N'
            const osmId = f.properties?.osm_id || Math.floor(Math.random() * 1000000)
            return {
              id: `${osmType}_${osmId}`,
              label: resolved.label || (isArabic ? 'موقع محدد' : 'Selected Location'),
              address: resolved.address || (isArabic ? 'الموقع المحدد على الخريطة' : 'Pinned Location'),
              lat: f.geometry.coordinates[1],
              lon: f.geometry.coordinates[0],
            }
          })
          setSearchResults(results)
        } else {
          setSearchResults([])
        }
      } catch (err: unknown) {
        if ((err as Error)?.name === 'AbortError') {
          return
        }
        if (reqId === searchRequestIdRef.current) {
          setSearchError(isArabic ? 'تعذر إتمام البحث' : 'Failed to perform location search')
        }
      } finally {
        if (reqId === searchRequestIdRef.current) {
          setIsSearching(false)
        }
      }
    }, 300)
  }

  // Explicit, opt-in User Geolocation
  const handleUseCurrentLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      alert(
        isArabic
          ? 'خدمة تحديد الموقع غير مدعومة في متصفحك'
          : 'Geolocation is not supported by your browser'
      )
      return
    }

    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false)
        const lat = pos.coords.latitude
        const lon = pos.coords.longitude
        void handleSelectCoordinate(
          lat,
          lon,
          'current_location',
          isArabic ? 'موقعي الحالي' : 'My Current Location'
        )
      },
      () => {
        setIsLocating(false)
        alert(
          isArabic
            ? 'تعذر تحديد موقعك الحالي. يُرجى التحقق من أذونات الموقع في المتصفح.'
            : 'Could not access your location. Please check location permissions in your browser.'
        )
      },
      { timeout: 10000, enableHighAccuracy: true }
    )
  }

  // Single ownership Driver Note handler
  const handleDriverNoteChange = (text: string) => {
    setLocalNote(text)
    if (value) {
      onChange({
        ...value,
        instructions: text.trim() ? text : undefined,
      })
    }
  }

  return (
    <Card
      variant="flat"
      padding="lg"
      className="relative overflow-hidden border border-border/70 bg-gradient-to-b from-white via-card-elevated/80 to-card/30 dark:from-card dark:via-card dark:to-card rounded-2xl shadow-xs"
    >
      {/* Subtle Luxury Atmospheric Blooms for Light & Dark Modes */}
      <div
        className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-gradient-to-br from-secondary/12 via-secondary/5 to-transparent pointer-events-none blur-3xl opacity-75"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-gradient-to-tr from-accent/12 via-accent/5 to-transparent pointer-events-none blur-3xl opacity-75"
        aria-hidden="true"
      />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3 pb-4 border-b border-border/60">
          <div className="flex items-center gap-3.5">
            <span className="w-9 h-9 rounded-full bg-gradient-to-br from-secondary to-secondary-dark text-white text-sm font-hornbill font-bold flex items-center justify-center shrink-0 shadow-xs">
              02
            </span>
          <div>
            <span className="text-[10px] text-secondary uppercase font-semibold block">
              DEPARTURE LOGISTICS
            </span>
            <h2 className="text-xl sm:text-2xl font-hornbill font-light text-foreground tracking-tight">
              {isArabic ? 'مكان الانطلاق والتجمع' : 'Pickup & Meeting Location'}
            </h2>
          </div>
        </div>
        {value && !isEditing && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-secondary/10 border border-secondary/25 text-secondary">
            <CheckIcon className="w-3.5 h-3.5" />
            <span>{isArabic ? 'تم تأكيد المكان' : 'Location Confirmed'}</span>
          </span>
        )}
      </div>

      <p className="text-xs text-muted-foreground mb-5">
        {isArabic
          ? 'من أين نلتقي بك لبدء هذه الرحلة؟ يمكنك البحث باسم فندقك، استخدام موقعك الحالي، أو النقر وسحب الدبوس على الخريطة.'
          : 'Where should our private concierge/driver meet you for this journey? Search your hotel, use GPS, or drop a pin on the map.'}
      </p>

      {/* Confirmed Location Summary */}
      {value && !isEditing ? (
        <div className="p-4 sm:p-5 rounded-2xl bg-card-elevated/70 border border-border/70 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary flex-shrink-0 mt-0.5">
                <BuildingIcon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-hornbill font-semibold text-base text-foreground">
                  {value.label}
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {value.address}
                </p>
                {(value.instructions || localNote) && (
                  <p className="text-[11px] text-secondary bg-secondary/10 px-2.5 py-1.5 rounded-lg mt-2.5 border border-secondary/20">
                    <span className="font-semibold">
                      {isArabic ? 'ملاحظة للسائق:' : 'Driver Note:'}
                    </span>{' '}
                    {value.instructions || localNote}
                  </p>
                )}
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="text-xs font-semibold self-start sm:self-center cursor-pointer shrink-0"
            >
              <span>{isArabic ? 'تغيير المكان' : 'Change Location'}</span>
              <span>→</span>
            </Button>
          </div>
        </div>
      ) : (
        /* Location Picker Active Mode */
        <div className="flex flex-col gap-4">
          {/* Search bar + GPS Button */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchInputChange(e.target.value)}
                placeholder={
                  destinationCityName
                    ? isArabic
                      ? `ابحث عن فندقك أو عنوانك في ${destinationCityName}...`
                      : `Search hotel or address in ${destinationCityName}...`
                    : isArabic
                    ? 'ابحث عن فندقك، معلم سياحي، أو شارع...'
                    : 'Search your hotel, landmark, or street address...'
                }
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-border bg-card-elevated text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-secondary"
              />
              {isSearching && (
                <span className="absolute right-3 top-3 text-xs text-secondary">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                </span>
              )}

              {/* Search Error State */}
              {searchError && (
                <p className="text-[11px] text-accent mt-1">{searchError}</p>
              )}

              {/* Search Suggestions Dropdown with Stable Provider IDs */}
              {searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-card-elevated border border-border/80 rounded-xl shadow-2xl overflow-hidden divide-y divide-border/60 max-h-60 overflow-y-auto">
                  {searchResults.map((res) => (
                    <button
                      key={res.id}
                      type="button"
                      onClick={() => {
                        void handleSelectCoordinate(res.lat, res.lon, 'search', res.label, res.address)
                        setSearchResults([])
                        setSearchQuery('')
                      }}
                      className="w-full p-3 text-left hover:bg-secondary/10 transition-colors flex items-start gap-2.5 cursor-pointer"
                    >
                      <PinIcon className="w-4 h-4 text-secondary mt-0.5 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="font-semibold text-xs text-foreground block truncate">
                          {res.label}
                        </span>
                        <span className="text-[11px] text-muted-foreground block truncate">
                          {res.address}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              isLoading={isLocating}
              onClick={handleUseCurrentLocation}
              className="text-xs font-semibold whitespace-nowrap h-[42px] px-4 cursor-pointer inline-flex items-center gap-1.5"
            >
              <GpsIcon className="w-3.5 h-3.5" />
              <span>{isArabic ? 'موقعي الحالي' : 'Use My Location'}</span>
            </Button>
          </div>

          {/* Interactive Map Container */}
          <div className="relative w-full h-72 sm:h-80 rounded-2xl overflow-hidden border border-border/80 shadow-inner bg-card-elevated">
            <div ref={mapContainerRef} className="w-full h-full" />
            <div className="absolute bottom-2 left-2 z-10 bg-background/90 backdrop-blur-sm text-foreground text-[10px] sm:text-xs px-3 py-1.5 rounded-lg shadow-md border border-border/70">
              {isGeocoding ? (
                <span className="text-secondary inline-flex items-center gap-1.5">
                  <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                  {isArabic ? 'جاري تحديد العنوان...' : 'Resolving address...'}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <InfoIcon className="w-3.5 h-3.5 text-secondary" />
                  {isArabic
                    ? 'انقر في أي مكان على الخريطة أو اسحب الدبوس لتحديد نقطة التجمع'
                    : 'Click anywhere on map or drag the pin to pinpoint meeting spot'}
                </span>
              )}
            </div>
          </div>

          {/* Active Pinned Preview & Confirmation */}
          {value && (
            <div className="p-3.5 rounded-xl bg-secondary/10 border border-secondary/25 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <PinIcon className="w-4 h-4 text-secondary flex-shrink-0" />
                <div className="truncate">
                  <span className="font-semibold text-xs text-foreground block truncate">
                    {value.label}
                  </span>
                  <span className="text-[11px] text-muted-foreground block truncate">
                    {value.address}
                  </span>
                </div>
              </div>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setIsEditing(false)}
                className="text-xs font-semibold flex-shrink-0 cursor-pointer shadow-xs inline-flex items-center gap-1.5"
              >
                <CheckIcon className="w-3.5 h-3.5" />
                <span>{isArabic ? 'تأكيد هذا المكان' : 'Confirm Location'}</span>
              </Button>
            </div>
          )}

          {/* Single Driver Note Editing Field */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              {isArabic
                ? 'ملاحظات للسائق أو تفاصيل التجمع (اختياري)'
                : 'Driver Note / Specific Meeting Spot (Optional)'}
            </label>
            <input
              type="text"
              value={localNote}
              onChange={(e) => handleDriverNoteChange(e.target.value)}
              placeholder={
                isArabic
                  ? 'مثال: في بهو الفندق، أو أمام البوابة الرئيسية...'
                  : 'e.g. In hotel lobby, near main entrance...'
              }
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-border bg-card-elevated text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-secondary"
            />
          </div>
        </div>
      )}
      </div>
    </Card>
  )
}
