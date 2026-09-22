'use client'

import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { TableAction } from '../types'

interface ActionsCellProps {
  row: any
  actions?: TableAction[]
  collectionSlug: string
}

export const ActionsCell: React.FC<ActionsCellProps> = ({
  row,
  actions = [],
  collectionSlug,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [coords, setCoords] = useState<{ top: number; right: number; openUpward: boolean } | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const resolvedActions: TableAction[] =
    actions.length > 0
      ? actions
      : [
          {
            id: 'edit',
            label: 'Edit',
            hrefTemplate: `/admin/collections/${collectionSlug}/{id}`,
          },
        ]

  const updatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const openUpward = spaceBelow < 180 && rect.top > 180

      setCoords({
        top: openUpward ? rect.top - 6 : rect.bottom + 6,
        right: window.innerWidth - rect.right,
        openUpward,
      })
    }
  }

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isOpen) {
      updatePosition()
      setIsOpen(true)
    } else {
      setIsOpen(false)
    }
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    function handleScrollOrResize() {
      if (isOpen) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      window.addEventListener('scroll', handleScrollOrResize, true)
      window.addEventListener('resize', handleScrollOrResize)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', handleScrollOrResize, true)
      window.removeEventListener('resize', handleScrollOrResize)
    }
  }, [isOpen])

  return (
    <div className="ut-actions-container">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className="ut-actions-btn"
        title="Row actions"
        aria-expanded={isOpen}
      >
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
          <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM18 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </button>

      {isOpen &&
        coords &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            className={`ut-actions-menu ut-actions-menu-portal ${coords.openUpward ? 'open-upward' : ''}`}
            style={{
              position: 'fixed',
              top: coords.openUpward ? 'auto' : `${coords.top}px`,
              bottom: coords.openUpward ? `${window.innerHeight - coords.top}px` : 'auto',
              right: `${coords.right}px`,
              zIndex: 999999,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {resolvedActions.map((action) => {
              const template =
                action.hrefTemplate || `/admin/collections/${collectionSlug}/{id}`
              const href = template.replace(/{(\w+)}/g, (_, key) =>
                String(row?.[key] ?? '')
              )

              return (
                <a
                  key={action.id}
                  href={href}
                  onClick={() => setIsOpen(false)}
                  className={`ut-actions-item ${action.variant === 'danger' ? 'danger' : ''}`}
                >
                  {action.label}
                </a>
              )
            })}
          </div>,
          document.body,
        )}
    </div>
  )
}
