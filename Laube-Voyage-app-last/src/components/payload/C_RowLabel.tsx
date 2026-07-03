'use client'

import { useRowLabel } from '@payloadcms/ui'
import { useSectionDrawer } from './C_SectionDrawer'
import { User, Hash, FileText, Calendar } from 'lucide-react'
import React from 'react'
import Image from 'next/image'

interface RowData {
  name?: string
  label?: string
  title?: string
  subject?: string
  startDate?: string
  endDate?: string
  adultPrice?: number
  infantPrice?: number
  role?: unknown
  value?: unknown
  description?: unknown
  subtitle?: unknown
  photo?: unknown
  image?: unknown
  avatar?: unknown
}

const formatDateShort = (iso?: string): string | null => {
  if (!iso) return null
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return null
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return null
  }
}

export const C_RowLabel = () => {
  const { data, path, rowNumber = 0 } = useRowLabel<RowData>()
  const sectionDrawer = useSectionDrawer()

  const dateLabel = data?.startDate
    ? `${formatDateShort(data.startDate)}${data?.endDate ? ` → ${formatDateShort(data.endDate)}` : ''}`
    : null

  const mainLabel =
    data?.name ||
    data?.label ||
    data?.title ||
    data?.subject ||
    dateLabel ||
    `Item ${String((rowNumber ?? 0) + 1).padStart(2, '0')}`

  const rawSub: unknown =
    data?.role ||
    data?.value ||
    (data?.adultPrice != null ? `$${data.adultPrice}${data?.infantPrice != null ? ` / Child: $${data.infantPrice}` : ''}` : null) ||
    data?.description ||
    data?.subtitle
  const subLabel: string | undefined =
    typeof rawSub === 'string'
      ? rawSub
      : rawSub !== null && typeof rawSub === 'object'
        ? 'root' in rawSub
          ? 'Rich Text Content'
          : '...'
        : undefined

  const photo = data?.photo || data?.image || data?.avatar
  const photoUrl =
    typeof photo === 'object' && photo !== null && 'url' in photo && typeof photo.url === 'string'
      ? photo.url
      : undefined

  const getIcon = () => {
    if (data?.startDate) return <Calendar size={20} />
    if (data?.name || data?.role) return <User size={20} />
    if (data?.value || data?.label) return <Hash size={20} />
    return <FileText size={20} />
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    sectionDrawer?.openEditDrawer(path)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          e.stopPropagation()
          sectionDrawer?.openEditDrawer(path)
        }
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.85rem',
        cursor: sectionDrawer ? 'pointer' : 'default',
        padding: '0.4rem 0.6rem',
        borderRadius: 'var(--style-radius-m)',
        transition: 'all 0.2s ease',
        width: '100%',
      }}
      className={`member-row-label-preview group/row ${sectionDrawer ? 'hover:bg-(--theme-elevation-100)' : ''}`}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: '12px',
          overflow: 'hidden',
          flexShrink: 0,
          background: 'var(--theme-elevation-150)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--theme-primary)',
          border: '1px solid var(--theme-elevation-200)',
          boxShadow: 'var(--style-shadow-sm)',
        }}
        className="group-hover/row:border-primary/30 group-hover/row:bg-primary/5 transition-colors"
      >
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt=""
            width={42}
            height={42}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          getIcon()
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
        <span
          style={{
            fontWeight: 600,
            fontSize: '0.95rem',
            color: 'var(--theme-elevation-900)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          className="group-hover/row:text-primary transition-colors"
        >
          {mainLabel}
        </span>
        {subLabel && (
          <span
            style={{
              fontSize: '0.75rem',
              color: 'var(--theme-elevation-450)',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {subLabel}
          </span>
        )}
      </div>
    </div>
  )
}
