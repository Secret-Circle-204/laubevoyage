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
      'w-9 h-9 rounded-full bg-[#00aeef] border-2 border-white shadow-2xl flex items-center justify-center cursor-grab active:cursor-grabbing transform -translate-x-1/2 -translate-y-full hover:scale-110 transition-transform ring-4 ring-[#00aeef]/20'
    el.innerHTML = '<span style="font-size: 18px; line-height: 1;">📍</span>'

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
    <Card variant="flat" padding="lg" className="border border-slate-200/80 dark:border-slate-800">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-[#00aeef]/20 text-[#00aeef] text-sm flex items-center justify-center font-bold">
            📍
          </span>
          {isArabic ? 'مكان الانطلاق والتجمع' : 'Pickup & Meeting Location'}
        </h2>
        {value && !isEditing && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
            ✓ {isArabic ? 'تم تأكيد المكان' : 'Location Selected'}
          </span>
        )}
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
        {isArabic
          ? 'من أين نلتقي بك لبدء هذه الرحلة؟ يمكنك البحث باسم فندقك، استخدام موقعك الحالي، أو النقر وسحب الدبوس على الخريطة.'
          : 'Where should our driver/guide meet you for this journey? Search your hotel, use GPS, or drop a pin on the map.'}
      </p>

      {/* Confirmed Location Summary */}
      {value && !isEditing ? (
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="text-2xl mt-0.5">🏨</span>
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  {value.label}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-2">
                  {value.address}
                </p>
                {(value.instructions || localNote) && (
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-1 rounded-md mt-2 border border-amber-200/50 dark:border-amber-800/40">
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
              className="text-xs font-bold self-start sm:self-center"
            >
              ✏️ {isArabic ? 'تغيير المكان' : 'Change Location'}
            </Button>
          </div>
        </div>
      ) : (
        /* Location Picker Active Mode */
        <div className="flex flex-col gap-4">
          {/* Search bar + GPS Button */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchInputChange(e.target.value)}
                placeholder={
                  destinationCityName
                    ? isArabic
                      ? `🔍 ابحث عن فندقك أو عنوانك في ${destinationCityName}...`
                      : `🔍 Search hotel or address in ${destinationCityName}...`
                    : isArabic
                    ? '🔍 ابحث عن فندقك، معلم سياحي، أو شارع...'
                    : '🔍 Search your hotel, landmark, or street address...'
                }
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#00aeef]"
              />
              {isSearching && (
                <span className="absolute right-3 top-3 text-xs text-slate-400 animate-spin">
                  ⏳
                </span>
              )}

              {/* Search Error State */}
              {searchError && (
                <p className="text-[11px] text-red-500 mt-1">{searchError}</p>
              )}

              {/* Search Suggestions Dropdown with Stable Provider IDs */}
              {searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 max-h-60 overflow-y-auto">
                  {searchResults.map((res) => (
                    <button
                      key={res.id}
                      type="button"
                      onClick={() => {
                        void handleSelectCoordinate(res.lat, res.lon, 'search', res.label, res.address)
                        setSearchResults([])
                        setSearchQuery('')
                      }}
                      className="w-full p-3 text-left hover:bg-[#00aeef]/10 transition-colors flex items-start gap-2.5"
                    >
                      <span className="text-base mt-0.5">📍</span>
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-xs text-slate-900 dark:text-white block truncate">
                          {res.label}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
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
              className="text-xs font-bold whitespace-nowrap h-[42px] px-4"
            >
              📍 {isArabic ? 'موقعي الحالي' : 'Use My Location'}
            </Button>
          </div>

          {/* Interactive Map Container */}
          <div className="relative w-full h-72 sm:h-80 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner">
            <div ref={mapContainerRef} className="w-full h-full" />
            <div className="absolute bottom-2 left-2 z-10 bg-slate-900/85 backdrop-blur-sm text-white text-[10px] sm:text-xs px-3 py-1.5 rounded-lg shadow-md border border-white/10">
              {isGeocoding ? (
                <span>⏳ {isArabic ? 'جاري تحديد العنوان...' : 'Resolving address...'}</span>
              ) : (
                <span>
                  💡{' '}
                  {isArabic
                    ? 'انقر في أي مكان على الخريطة أو اسحب الدبوس لتحديد نقطة التجمع'
                    : 'Click anywhere on map or drag the pin to pinpoint meeting spot'}
                </span>
              )}
            </div>
          </div>

          {/* Active Pinned Preview & Confirmation */}
          {value && (
            <div className="p-3.5 rounded-xl bg-[#00aeef]/10 border border-[#00aeef]/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-xl">📍</span>
                <div className="truncate">
                  <span className="font-bold text-xs text-slate-900 dark:text-white block truncate">
                    {value.label}
                  </span>
                  <span className="text-[11px] text-slate-600 dark:text-slate-300 block truncate">
                    {value.address}
                  </span>
                </div>
              </div>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setIsEditing(false)}
                className="text-xs font-bold flex-shrink-0"
              >
                ✓ {isArabic ? 'تأكيد هذا المكان' : 'Confirm Location'}
              </Button>
            </div>
          )}

          {/* Single Driver Note Editing Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
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
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#00aeef]"
            />
          </div>
        </div>
      )}
    </Card>
  )
}
