'use client'

import React from 'react'
import type { OccupancyType, RoomRateItem } from './types'
import { OCCUPANCY_LABELS } from './types'
import './RoomRatesEditor.css'

interface RoomRatesEditorProps {
  rates: RoomRateItem[]
  readOnly?: boolean
  onChange: (occupancy: OccupancyType, field: 'rateEGP' | 'enabled', value: number | boolean) => void
}

export const RoomRatesEditor: React.FC<RoomRatesEditorProps> = ({
  rates,
  readOnly = false,
  onChange,
}) => {
  return (
    <div className="ae-rates-matrix-container">
      <table className="ae-rates-matrix-table">
        <thead>
          <tr>
            <th style={{ width: '40%' }}>Occupancy</th>
            <th style={{ width: '20%', textAlign: 'center' }}>Enabled</th>
            <th style={{ width: '40%' }}>Rate</th>
          </tr>
        </thead>
        <tbody>
          {rates.map((rate) => {
            const info = OCCUPANCY_LABELS[rate.occupancy]
            const occName =
              rate.occupancy === 'single'
                ? 'Single'
                : rate.occupancy === 'double'
                  ? 'Double'
                  : rate.occupancy === 'triple'
                    ? 'Triple'
                    : 'Quad'

            return (
              <tr key={rate.occupancy} className={!rate.enabled ? 'ae-rate-row--disabled' : ''}>
                <td>
                  <div className="ae-rate-occupancy-title">{occName}</div>
                  <div className="ae-rate-occupancy-caption">
                    {info.guests} {info.guests === 1 ? 'Guest' : 'Guests'} max
                  </div>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    className="ae-rate-checkbox"
                    checked={rate.enabled}
                    disabled={readOnly}
                    onChange={(e) => onChange(rate.occupancy, 'enabled', e.target.checked)}
                  />
                </td>
                <td>
                  <div className="ae-rate-input-wrap">
                    <input
                      type="number"
                      min="0"
                      step="50"
                      className="ae-rate-number-input"
                      value={rate.rateEGP}
                      disabled={readOnly || !rate.enabled}
                      onChange={(e) =>
                        onChange(rate.occupancy, 'rateEGP', Number(e.target.value) || 0)
                      }
                    />
                    <span className="ae-rate-currency-label">EGP</span>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
