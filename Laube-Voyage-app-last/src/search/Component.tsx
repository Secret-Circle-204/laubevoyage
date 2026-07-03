'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export const Search: React.FC = () => {
  const [value, setValue] = useState('')
  const [debouncedValue, setDebouncedValue] = useState(value)
  const router = useRouter()

  // Inline debounce implementation to avoid missing utility dependencies
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, 500)
    return () => clearTimeout(timer)
  }, [value])

  useEffect(() => {
    if (debouncedValue !== undefined) {
      router.push(`/search${debouncedValue ? `?q=${debouncedValue}` : ''}`)
    }
  }, [debouncedValue, router])

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
        }}
        className="relative"
      >
        <label htmlFor="search" className="sr-only">
          Search
        </label>
        <input
          id="search"
          type="text"
          value={value}
          onChange={(event) => {
            setValue(event.target.value)
          }}
          placeholder="Search..."
          className="w-full bg-white dark:bg-[#1a1718] border border-dark/5 dark:border-gray/10 px-6 py-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all text-sm text-dark dark:text-white"
        />
        <button type="submit" className="sr-only">
          submit
        </button>
      </form>
    </div>
  )
}
