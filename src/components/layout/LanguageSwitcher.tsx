'use client'

import React, { useState, useRef, useEffect } from 'react'

const FLAG_MAP: Record<string, string> = {
  en: 'gb',
  ar: 'eg',
  fr: 'fr',
  de: 'de',
  es: 'es',
  it: 'it',
  ru: 'ru',
  zh: 'cn',
  ja: 'jp',
  pt: 'pt',
  nl: 'nl',
  pl: 'pl',
  fi: 'fi',
}

interface LanguageSwitcherProps {
  locale: string
  setLocale: (locale: any) => void
  availableLocales: Array<{ code: string; name: string }>
  isDark?: boolean
}

export function LanguageSwitcher({ locale, setLocale, availableLocales, isDark }: LanguageSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const activeLocale = availableLocales.find((l) => l.code === locale) || { code: locale, name: locale.toUpperCase() }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getFlagUrl = (code: string) => `https://flagcdn.com/w40/${FLAG_MAP[code] || code}.png`

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
        <img
          src={getFlagUrl(activeLocale.code)}
          alt={activeLocale.name}
          className="w-5 h-3.5 object-cover rounded-sm shadow-sm"
        />
        <span>{activeLocale.name}</span>
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
          className={`absolute right-0 mt-2 w-44 rounded-xl shadow-2xl border backdrop-blur-md transition-all duration-300 ${
            isDark
              ? 'bg-[#231F20]/95 border-white/10 text-slate-200'
              : 'bg-white/95 border-slate-200 text-slate-800'
          }`}
        >
          <div className="py-1.5 max-h-60 overflow-y-auto">
            {availableLocales.map((l) => (
              <button
                key={l.code}
                onClick={() => {
                  setLocale(l.code)
                  setIsOpen(false)
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs font-semibold hover:bg-[#00aeef]/10 hover:text-[#00aeef] transition-colors ${
                  l.code === locale ? 'bg-[#00aeef]/5 text-[#00aeef]' : ''
                }`}
              >
                <img
                  src={getFlagUrl(l.code)}
                  alt={l.name}
                  className="w-5 h-3.5 object-cover rounded-sm shadow-sm"
                />
                <span className="truncate">{l.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
