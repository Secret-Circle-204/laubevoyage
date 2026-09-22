'use client'

import React from 'react'
import { useListQuery } from '@payloadcms/ui'

export const ResetControl: React.FC = () => {
  const { query, refineListData } = useListQuery()

  const hasSearch = Boolean(query?.search && String(query.search).trim())
  const hasWhere = Boolean(query?.where && typeof query.where === 'object' && Object.keys(query.where).length > 0)
  const isDirty = hasSearch || hasWhere

  const handleReset = () => {
    void refineListData({
      search: undefined,
      where: undefined,
      page: 1,
    })
  }

  return (
    <div className="ut-reset-control">
      <button
        type="button"
        onClick={handleReset}
        disabled={!isDirty}
        className={isDirty ? 'ut-reset-active' : 'ut-reset-disabled'}
        title="Reset all active search and where filters"
      >
        Reset
      </button>
    </div>
  )
}
