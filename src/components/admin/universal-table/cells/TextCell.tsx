import React from 'react'
import type { TableCellProps } from '../types'

export const TextCell: React.FC<TableCellProps> = ({ row, field, value }) => {
  // Value could be passed directly by AG Grid or extracted from nested row path
  let val = value !== undefined ? value : field ? row?.[field] : null

  if (val === undefined && field && field.includes('.')) {
    const parts = field.split('.')
    let curr: unknown = row
    for (const part of parts) {
      if (curr == null || typeof curr !== 'object') break
      curr = (curr as Record<string, unknown>)[part]
    }
    val = curr
  }

  if (val === undefined || val === null || val === '') {
    return <span className="text-slate-600">—</span>
  }

  // Boolean values
  if (typeof val === 'boolean') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${
          val
            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
            : 'bg-slate-800/60 text-slate-400 border border-slate-700/40'
        }`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${val ? 'bg-emerald-400' : 'bg-slate-500'}`}
        />
        {val ? 'Yes' : 'No'}
      </span>
    )
  }

  // ID and Slug fields: sleek monospace code pill
  if (field === 'id' || field === '_id' || field === 'slug') {
    return (
      <span
        className="font-mono text-[11px] text-slate-300 bg-slate-800/60 px-2 py-0.5 rounded border border-slate-700/50 truncate max-w-[220px] inline-block tracking-tight"
        title={String(val)}
      >
        {String(val)}
      </span>
    )
  }

  // Array of items (e.g. destinations, tags, included, excluded)
  if (Array.isArray(val)) {
    if (val.length === 0) return <span className="text-slate-600">—</span>
    
    // Check if items are objects or strings
    if (typeof val[0] === 'object' && val[0] !== null) {
      const names = val
        .map((item) => {
          if (typeof item === 'object' && item !== null) {
            const obj = item as Record<string, unknown>
            return String(obj.title || obj.name || obj.id || 'Item')
          }
          return String(item)
        })
        .slice(0, 3)
        .join(', ')
      const extra = val.length > 3 ? ` +${val.length - 3}` : ''
      return (
        <span className="text-slate-300 text-xs truncate max-w-[200px]" title={names + extra}>
          {names}{extra}
        </span>
      )
    }

    const joined = val.slice(0, 3).join(', ')
    const extra = val.length > 3 ? ` +${val.length - 3}` : ''
    return (
      <span className="text-slate-300 text-xs truncate max-w-[200px]" title={joined + extra}>
        {joined}{extra}
      </span>
    )
  }

  // Nested Object (e.g. relationship or rich group)
  if (typeof val === 'object' && val !== null) {
    const obj = val as Record<string, unknown>
    const label = obj.title || obj.name || obj.label || obj.id
    if (label) {
      return <span className="text-slate-300 text-xs font-medium">{String(label)}</span>
    }
    return <span className="text-slate-500 text-xs">{Object.keys(obj).length} fields</span>
  }

  return (
    <span
      className="text-slate-300 text-xs font-medium truncate block max-w-full"
      title={String(val)}
    >
      {String(val)}
    </span>
  )
}
