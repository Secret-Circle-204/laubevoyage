'use client'

import React, { useState, useRef, useEffect, useId } from 'react'
import { Flag } from '@/components/ui'

export const FLAG_MAP: Record<string, string> = {
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

const SHORT_CODE_MAP: Record<string, string> = {
  en: 'EN',
  ar: 'ع',
  fr: 'FR',
  de: 'DE',
  es: 'ES',
  it: 'IT',
  ru: 'RU',
  zh: '中',
  ja: '日',
  pt: 'PT',
  nl: 'NL',
  pl: 'PL',
  fi: 'FI',
}

export interface LocaleOption {
  code: string
  name: string
}

export interface LanguageSwitcherProps {
  locale: string
  setLocale: (locale: string) => void
  availableLocales: LocaleOption[]
  isDark?: boolean
  className?: string
  compactOnly?: boolean
  micro?: boolean
  title?: string
  ariaLabel?: string
}

export function LanguageSwitcher({
  locale,
  setLocale,
  availableLocales,
  isDark,
  className = '',
  compactOnly = false,
  micro = false,
  title,
  ariaLabel,
}: LanguageSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([])
  const listboxId = useId()

  const activeIndex = availableLocales.findIndex((l) => l.code === locale)
  const activeLocale = availableLocales[activeIndex] || {
    code: locale,
    name: locale.toUpperCase(),
  }

  const shortLabel = SHORT_CODE_MAP[activeLocale.code] || activeLocale.code.toUpperCase()

  const openDropdown = () => {
    const initialIdx = activeIndex >= 0 ? activeIndex : 0
    setFocusedIndex(initialIdx)
    setIsOpen(true)
  }

  const closeDropdown = (restoreFocus = true) => {
    setIsOpen(false)
    setFocusedIndex(-1)
    if (restoreFocus) {
      triggerRef.current?.focus()
    }
  }

  const toggleDropdown = () => {
    if (isOpen) {
      closeDropdown(false)
    } else {
      openDropdown()
    }
  }

  const selectLocale = (code: string) => {
    setLocale(code)
    closeDropdown(true)
  }

  useEffect(() => {
    if (isOpen) {
      const idx = focusedIndex >= 0 ? focusedIndex : (activeIndex >= 0 ? activeIndex : 0)
      const timer = setTimeout(() => {
        optionRefs.current[idx]?.focus()
      }, 30)
      return () => clearTimeout(timer)
    }
  }, [isOpen, focusedIndex, activeIndex])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        closeDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openDropdown()
    }
  }

  const handleListKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      closeDropdown(true)
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusedIndex((prev) => {
        const next = (prev + 1) % availableLocales.length
        optionRefs.current[next]?.focus()
        return next
      })
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusedIndex((prev) => {
        const next = (prev - 1 + availableLocales.length) % availableLocales.length
        optionRefs.current[next]?.focus()
        return next
      })
    } else if (e.key === 'Home') {
      e.preventDefault()
      setFocusedIndex(0)
      optionRefs.current[0]?.focus()
    } else if (e.key === 'End') {
      e.preventDefault()
      const last = availableLocales.length - 1
      setFocusedIndex(last)
      optionRefs.current[last]?.focus()
    } else if (e.key === 'Tab') {
      closeDropdown(false)
    }
  }

  return (
    <div ref={containerRef} className={`relative inline-block text-left z-50 ${className}`}>
      <button
        ref={triggerRef}
        onClick={toggleDropdown}
        onKeyDown={handleTriggerKeyDown}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        aria-label={ariaLabel || `Current language: ${activeLocale.name}. Click to switch language`}
        className={`group relative flex items-center ${
          micro
            ? 'gap-1 text-[11px] font-bold rounded-full px-1.5 sm:px-2.5 py-0.5 sm:py-1'
            : 'gap-1.5 sm:gap-2 text-xs font-semibold rounded-full px-2.5 sm:px-3 py-1.5'
        } border border-white/30 bg-white/20 hover:bg-white/30 text-white dark:border-border/80 dark:bg-card/60 dark:hover:bg-card dark:text-foreground transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 dark:focus-visible:ring-secondary/50 cursor-pointer shadow-xs active:scale-[0.98] ${
          isOpen ? 'ring-2 ring-white/40 border-white bg-white/30 dark:ring-secondary/30 dark:border-secondary/60 dark:bg-card' : ''
        }`}
      >
        <Flag
          flagCode={FLAG_MAP[activeLocale.code] || activeLocale.code}
          alt=""
          className={`${micro ? 'w-3.5 h-2.5' : 'w-4 h-3'} object-cover rounded-xs shadow-xs flex-shrink-0`}
        />

        {/* Adaptive Density Container */}
        <span className="flex items-center tracking-wide font-medium">
          {!compactOnly ? (
            <>
              {/* Short representation visible at rest */}
              <span className="group-hover:hidden group-focus-within:hidden font-semibold">
                {shortLabel}
              </span>
              {/* Full name gently revealed on hover/focus */}
              <span className="hidden group-hover:inline-flex group-focus-within:inline-flex font-semibold whitespace-nowrap animate-fade-in">
                {activeLocale.name}
              </span>
            </>
          ) : (
            <span className="font-semibold">{shortLabel}</span>
          )}
        </span>

        <svg
          className={`${micro ? 'w-2.5 h-2.5' : 'w-3 h-3 sm:w-3.5 sm:h-3.5'} text-white/80 dark:text-muted transition-transform duration-250 ease-out flex-shrink-0 ${
            isOpen ? 'rotate-180 text-white dark:text-secondary' : 'group-hover:text-white dark:group-hover:text-foreground'
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={1.75}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel || 'Available languages'}
          tabIndex={-1}
          onKeyDown={handleListKeyDown}
          className="absolute right-0 mt-2 w-52 sm:w-56 max-w-[calc(100vw-24px)] rounded-2xl shadow-xl border border-border/80 bg-card/95 backdrop-blur-md text-foreground dropdown-emergence overflow-hidden z-50 py-1.5"
        >
          <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-muted border-b border-border/40 font-serif">
            {title || 'Select Language'}
          </div>
          <div className="py-1 max-h-60 overflow-y-auto overscroll-contain divide-y divide-border/20">
            {availableLocales.map((l, idx) => {
              const isSelected = l.code === locale
              return (
                <button
                  key={l.code}
                  ref={(el) => {
                    optionRefs.current[idx] = el
                  }}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => selectLocale(l.code)}
                  className={`w-full flex items-center justify-between gap-2.5 px-3.5 py-2.5 text-left text-xs font-semibold transition-colors cursor-pointer outline-none ${
                    isSelected
                      ? 'bg-secondary/10 text-secondary font-bold'
                      : 'text-foreground hover:bg-secondary/5 focus:bg-secondary/10 focus:text-secondary'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Flag
                      flagCode={FLAG_MAP[l.code] || l.code}
                      alt=""
                      className="w-4 h-3 object-cover rounded-xs shadow-xs flex-shrink-0"
                    />
                    <span className="truncate">{l.name}</span>
                  </div>
                  {isSelected && (
                    <svg
                      className="w-3.5 h-3.5 text-secondary flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.2}
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

