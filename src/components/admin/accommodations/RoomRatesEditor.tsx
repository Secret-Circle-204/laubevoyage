'use client'

import React from 'react'
import type { OccupancyType, RoomRateItem } from './types'
import { OCCUPANCY_LABELS } from './types'

interface RoomRatesEditorProps {
  rates: RoomRateItem[]
  readOnly?: boolean
  onChange: (occupancy: OccupancyType, field: 'rateEGP' | 'enabled', value: any) => void
}

export const RoomRatesEditor: React.FC<RoomRatesEditorProps> = ({
  rates,
  readOnly = false,
  onChange,
}) => {
  return (
    <div className="ae-form-group">
      <label className="ae-form-label">
        Occupancy Room Rates (EGP) <span className="ae-form-label-required">*</span>
      </label>
      <p className="ae-form-desc">
        Specify commercial rates in Egyptian Pounds (EGP) for each supported occupancy.
        Disable occupancies that are not offered.
      </p>

      <table className="ae-rates-table">
        <thead>
          <tr>
            <th>Occupancy</th>
            <th>Rate (EGP)</th>
            <th style={{ textAlign: 'center' }}>Enabled</th>
          </tr>
        </thead>
        <tbody>
          {rates.map((rate) => {
            const info = OCCUPANCY_LABELS[rate.occupancy]
            return (
              <tr key={rate.occupancy}>
                <td>
                  <strong>{info.label}</strong>
                  <div style={{ fontSize: '0.75rem', color: 'var(--theme-elevation-400)' }}>
                    {info.guests} {info.guests === 1 ? 'Guest' : 'Guests'}
                  </div>
                </td>
                <td>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    className="ae-rate-input"
                    value={rate.rateEGP}
                    disabled={readOnly || !rate.enabled}
                    onChange={(e) => onChange(rate.occupancy, 'rateEGP', e.target.value)}
                  />
                </td>
                <td style={{ textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={rate.enabled}
                    disabled={readOnly}
                    onChange={(e) => onChange(rate.occupancy, 'enabled', e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
