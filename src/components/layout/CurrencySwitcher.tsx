'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Flag } from '@/components/ui'

interface CurrencyOption {
  code: string
  name: string
  symbol: string
  flagCode?: string
}

interface CurrencySwitcherProps {
  currency: string
  setCurrency: (currency: any) => void
  availableCurrencies: CurrencyOption[]
  isDark?: boolean
}

export function CurrencySwitcher({
  currency,
  setCurrency,
  availableCurrencies,
  isDark,
}: CurrencySwitcherProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const activeCurrency = availableCurrencies.find((c) => c.code === currency) || {
    code: currency,
    name: currency,
    symbol: currency,
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className="relative inline-block text-left z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        type="button"
        className={`flex items-center gap-2 text-xs font-bold rounded-lg px-2.5 py-1.5 border transition-all duration-300 ${
          isDark
            ? 'bg-slate-800/85 hover:bg-slate-700/85 border-slate-700/60 text-slate-200'
            : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800'
        }`}
      >
        <Flag
          flagCode={activeCurrency.flagCode}
          alt={activeCurrency.name}
          className="w-5 h-3.5 object-cover rounded-sm shadow-sm"
        />
        <span>
          {activeCurrency.code} ({activeCurrency.symbol})
        </span>
        <svg
          className={`w-3.5 h-3.5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          className={`absolute right-0 mt-2 w-56 rounded-xl shadow-2xl border backdrop-blur-md transition-all duration-300 ${
            isDark
              ? 'bg-[#231F20]/95 border-white/10 text-slate-200'
              : 'bg-white/95 border-slate-200 text-slate-800'
          }`}
        >
          <div className="py-1.5 max-h-60 overflow-y-auto">
            {availableCurrencies.map((c) => (
              <button
                key={c.code}
                onClick={() => {
                  setCurrency(c.code)
                  setIsOpen(false)
                }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-xs font-semibold hover:bg-[#00aeef]/10 hover:text-[#00aeef] transition-colors ${
                  c.code === currency ? 'bg-[#00aeef]/5 text-[#00aeef]' : ''
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Flag
                    flagCode={c.flagCode}
                    alt={c.name}
                    className="w-5 h-3.5 object-cover rounded-sm shadow-sm flex-shrink-0"
                  />
                  <span className="truncate">{c.name}</span>
                </div>
                <span className="text-slate-400 font-bold flex-shrink-0">{c.symbol}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
