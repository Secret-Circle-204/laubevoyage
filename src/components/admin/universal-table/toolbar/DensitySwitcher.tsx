'use client'

import React from 'react'
import type { DensityMode } from '../types'

interface DensitySwitcherProps {
  value: DensityMode
  onChange: (mode: DensityMode) => void
}

const DENSITY_OPTIONS: Array<{ id: DensityMode; label: string; title: string }> = [
  { id: 'comfortable', label: 'Comfortable', title: 'Comfortable row spacing (64px)' },
  { id: 'compact', label: 'Compact', title: 'Compact row spacing (48px)' },
  { id: 'dense', label: 'Dense', title: 'Dense operations console (36px)' },
]

export const DensitySwitcher: React.FC<DensitySwitcherProps> = ({ value, onChange }) => {
  return (
    <div
      className="ut-density-switcher"
      role="radiogroup"
      aria-label="Table row density"
    >
      {DENSITY_OPTIONS.map((opt) => {
        const isActive = value === opt.id
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={isActive}
            title={opt.title}
            onClick={() => onChange(opt.id)}
            className={`ut-density-btn ${isActive ? 'is-active' : ''}`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
