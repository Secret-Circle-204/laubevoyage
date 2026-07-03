'use client'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useField, useConfig, useListDrawer } from '@payloadcms/ui'
import { FieldWrapper } from './FieldWrapper'
import { Image as ImageIcon, X, Plus, GripHorizontal } from 'lucide-react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Media } from '@/payload-types'
import type { FieldConfig } from './types'

/**
 * GalleryField — Professional 2D Grid Gallery for Payload CMS 3.
 * Features: Multi-select, Native Media integration, and Smooth 2D Sortable Grid.
 */
export const GalleryField: React.FC<{
  path: string

  field?: FieldConfig
  readOnly?: boolean
}> = (props) => {
  const { path, field: clientField, readOnly } = props
  const label = typeof clientField?.label === 'string' ? clientField.label : undefined
  const desc = clientField?.admin?.description
  const description = typeof desc === 'string' ? desc : undefined
  const required = clientField?.required

  const { value, setValue } = useField<(string | number | { id: string | number })[]>({ path })
  const { config } = useConfig()

  const [mediaData, setMediaData] = useState<Record<string, Media>>({})
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  // Ensure value is an array of IDs or objects
  const imageItems = useMemo(() => (Array.isArray(value) ? value : []), [value])

  // Reorder logic for 2D Grid
  const moveItem = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (readOnly || fromIndex === toIndex) return
      const newItems = [...imageItems]
      const [movedItem] = newItems.splice(fromIndex, 1)
      newItems.splice(toIndex, 0, movedItem)
      setValue(newItems)
    },
    [imageItems, readOnly, setValue],
  )

  // Fetch missing media data
  useEffect(() => {
    const fetchMedia = async () => {
      const idsToFetch = imageItems
        .map((item) => (typeof item === 'object' ? item.id : item))
        .filter((id) => id && !mediaData[id])

      if (idsToFetch.length === 0) return

      try {
        const response = await fetch(
          `${config.serverURL || ''}/api/media?where[id][in]=${idsToFetch.join(',')}&limit=100`,
        )
        const data = await response.json()

        if (data.docs) {
          const newData = { ...mediaData }

          data.docs.forEach((doc: Media) => {
            newData[doc.id] = doc
          })
          setMediaData(newData)
        }
      } catch (err) {
        console.error('GalleryField: Error fetching media:', err)
      }
    }
    fetchMedia()
  }, [imageItems, config.serverURL, mediaData]) // Media selection drawer
  const [ListDrawer, ListDrawerToggler, { closeDrawer }] = useListDrawer({
    collectionSlugs: ['media'],
    uploads: true,
  })

  return (
    <FieldWrapper
      path={path}
      label={label || 'Package Gallery'}
      description={
        description ||
        'Drag and drop images to reorder in the grid. Select multiple images from the media library.'
      }
      required={required}
      variant="card"
      headerExtra={
        <div className="flex items-center gap-2">
          {!readOnly && imageItems.length > 1 && (
            <span className="text-[9px] font-bold text-(--theme-elevation-400) uppercase bg-(--theme-elevation-150) px-1.5 py-0.5 rounded flex items-center gap-1">
              <GripHorizontal size={10} /> 2D Sort Enabled
            </span>
          )}
          <span className="text-[10px] font-bold uppercase py-0.5 px-2 rounded bg-primary/10 text-primary">
            {imageItems.length} Images
          </span>
        </div>
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 p-1">
        <AnimatePresence initial={false}>
          {imageItems.map((item, index) => {
            const isObject = typeof item === 'object' && item !== null
            const id = isObject ? item.id : item
            const doc = mediaData[id] || (isObject ? item : null)
            const src = doc?.url || doc?.sizes?.thumbnail?.url || ''
            const alt = doc?.alt || ''

            return (
              <div
                key={`${id}-${index}`}
                draggable={!readOnly}
                onDragStart={(e) => {
                  setDraggedIndex(index)
                  if (e.dataTransfer) {
                    e.dataTransfer.effectAllowed = 'move'
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  if (draggedIndex !== null && draggedIndex !== index) {
                    moveItem(draggedIndex, index)
                    setDraggedIndex(index)
                  }
                }}
                onDragEnd={() => setDraggedIndex(null)}
                className="relative aspect-square"
              >
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{
                    opacity: draggedIndex === index ? 0.4 : 1,
                    scale: draggedIndex === index ? 0.95 : 1,
                    zIndex: draggedIndex === index ? 50 : 1,
                  }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  className={`w-full h-full rounded-xl overflow-hidden border cursor-grab active:cursor-grabbing group ${
                    draggedIndex === index
                      ? 'border-primary shadow-inner bg-primary/5'
                      : 'border-(--theme-elevation-200) bg-(--theme-elevation-100) shadow-sm hover:shadow-md hover:border-primary/40 transition-colors'
                  }`}
                >
                  {src ? (
                    <Image
                      src={src}
                      alt={alt || `Gallery image ${index + 1}`}
                      fill
                      className="w-full h-full object-cover pointer-events-none select-none"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-(--theme-elevation-200)">
                      <ImageIcon size={20} className="text-(--theme-elevation-400) animate-pulse" />
                    </div>
                  )}

                  {/* Remove Button - With better positioning in grid */}
                  {!readOnly && (
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        const newValue = imageItems.filter((_, i) => i !== index)
                        setValue(newValue)
                      }}
                      className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center bg-black/50 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 z-50 backdrop-blur-sm"
                      type="button"
                    >
                      <X size={12} />
                    </button>
                  )}

                  {/* Index Indicator */}
                  <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/40 backdrop-blur-md text-white text-[8px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                    {index + 1}
                  </div>

                  {/* Footer Gradient & Filename */}
                  <div className="absolute inset-x-0 bottom-0 p-2 bg-linear-to-t from-black/80 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <p className="text-[9px] text-white truncate font-medium">
                      {doc?.filename || 'Image'}
                    </p>
                  </div>
                </motion.div>
              </div>
            )
          })}
        </AnimatePresence>

        {!readOnly && (
          <ListDrawerToggler className="flex flex-col items-center justify-center aspect-square rounded-xl border-2 border-dashed border-(--theme-elevation-200) hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group bg-(--theme-elevation-50)/50">
            <div className="w-10 h-10 rounded-full bg-(--theme-elevation-100) flex items-center justify-center mb-2 group-hover:bg-primary/10 transition-colors">
              <Plus
                size={22}
                className="text-(--theme-elevation-400) group-hover:text-primary transition-transform group-hover:rotate-90 duration-300"
              />
            </div>
            <span className="text-[9px] font-bold text-(--theme-elevation-500) group-hover:text-primary uppercase tracking-wider">
              Add Selection
            </span>
          </ListDrawerToggler>
        )}
      </div>

      {!readOnly && (
        <ListDrawer
          enableRowSelections={true}
          onSelect={({ docID }) => {
            const strId = String(docID)
            const currentIds = imageItems.map((item) =>
              String(typeof item === 'object' ? item.id : item),
            )

            if (!currentIds.includes(strId)) {
              setValue([...imageItems, docID])
            }
            closeDrawer()
          }}
          onBulkSelect={(selectedMap) => {
            const currentIds = imageItems.map((item) =>
              String(typeof item === 'object' ? item.id : item),
            )
            const newValues = [...imageItems]

            let idsToAdd: (string | number)[] = []
            if (selectedMap instanceof Map) {
              idsToAdd = Array.from(selectedMap.keys())
            } else if (Array.isArray(selectedMap)) {
              idsToAdd = selectedMap
            } else if (selectedMap && typeof selectedMap === 'object') {
              idsToAdd = Object.keys(selectedMap)
            }

            let hasChanged = false
            idsToAdd.forEach((id) => {
              const strId = String(id)
              if (strId && !currentIds.includes(strId)) {
                newValues.push(id)
                hasChanged = true
              }
            })

            if (hasChanged) {
              setValue(newValues)
            }
            closeDrawer()
          }}
        />
      )}

      {imageItems.length === 0 && (
        <div className="py-16 flex flex-col items-center justify-center border border-dashed border-(--theme-elevation-200) rounded-xl mt-2 bg-(--theme-elevation-50)/30">
          <div className="w-12 h-12 rounded-full bg-(--theme-elevation-100) flex items-center justify-center mb-4">
            <ImageIcon size={24} className="text-(--theme-elevation-300)" />
          </div>
          <p className="text-sm text-(--theme-elevation-600) font-semibold">Gallery Empty</p>
          <p className="text-xs text-(--theme-elevation-400) mt-1 px-4 text-center">
            Choose high-quality images to showcase this travel package.
          </p>
        </div>
      )}
    </FieldWrapper>
  )
}

export default GalleryField
