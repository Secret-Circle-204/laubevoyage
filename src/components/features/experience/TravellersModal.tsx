'use client'

import React, { useEffect, useRef } from 'react'
import { JsonTranslationDictionary } from '@/domains/translation/dictionary'

const dict = new JsonTranslationDictionary()

function CloseIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function UsersIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  )
}

export interface TravellersModalProps {
  isOpen: boolean
  onClose: () => void
  adults: number
  childrenCount: number
  childAges: number[]
  childBeddingModes: ('sharing_bed' | 'extra_bed')[]
  childrenAllowed: boolean
  onAdultsChange: (delta: number) => void
  onAddChild: () => void
  onRemoveChild: (index: number) => void
  onChildAgeChange: (index: number, age: number) => void
  onChildBeddingChange: (index: number, mode: 'sharing_bed' | 'extra_bed') => void
  locale: string
}

export function TravellersModal({
  isOpen,
  onClose,
  adults,
  childrenCount,
  childAges,
  childBeddingModes,
  childrenAllowed,
  onAdultsChange,
  onAddChild,
  onRemoveChild,
  onChildAgeChange,
  onChildBeddingChange,
  locale,
}: TravellersModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const titleText = dict.get(locale, 'experience.whoIsTravelling')

  const adultsLabel = adults === 1
    ? dict.get(locale, 'experience.adultSingular')
    : dict.get(locale, 'experience.adultPlural')

  const childrenLabel = childrenCount === 1
    ? dict.get(locale, 'experience.childSingular')
    : dict.get(locale, 'experience.childPlural')

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="travellers-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-md bg-white dark:bg-[#1a1715] rounded-3xl border border-slate-200/80 dark:border-secondary/20 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-secondary/15 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 dark:bg-secondary/15 text-primary dark:text-secondary flex items-center justify-center shrink-0">
              <UsersIcon className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <h3 id="travellers-modal-title" className="text-base sm:text-lg font-bold text-foreground">
                {titleText}
              </h3>
              <span className="text-xs text-muted-foreground font-medium">
                {adults} {adultsLabel}
                {childrenCount > 0 ? ` · ${childrenCount} ${childrenLabel}` : ''}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={dict.get(locale, 'experience.close') || 'Close'}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-card/60 hover:bg-slate-200 dark:hover:bg-secondary/20 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex flex-col gap-4">
          {/* Adults Stepper Card */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/80 dark:bg-card/50 border border-slate-200/80 dark:border-secondary/20 shadow-xs">
            <div>
              <span className="font-semibold block text-sm text-foreground">
                {dict.get(locale, 'experience.adults') || 'Adults'}
              </span>
              <span className="text-xs text-muted-foreground">
                {dict.get(locale, 'experience.adultsAgeHint') || 'Age 12+ years'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={adults <= 1}
                onClick={() => onAdultsChange(-1)}
                className="w-9 h-9 rounded-xl bg-primary dark:bg-transparent border-0 dark:border dark:border-secondary/30 flex items-center justify-center font-bold text-base text-white dark:text-secondary hover:bg-primary-dark dark:hover:bg-secondary dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer shadow-sm active:scale-95"
                aria-label={dict.get(locale, 'experience.aria.decreaseAdults') || 'Decrease adults'}
              >
                −
              </button>
              <span className="font-hornbill text-lg font-bold w-6 text-center text-foreground">
                {adults}
              </span>
              <button
                type="button"
                onClick={() => onAdultsChange(1)}
                className="w-9 h-9 rounded-xl bg-primary dark:bg-transparent border-0 dark:border dark:border-secondary/30 flex items-center justify-center font-bold text-base text-white dark:text-secondary hover:bg-primary-dark dark:hover:bg-secondary dark:hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
                aria-label={dict.get(locale, 'experience.aria.increaseAdults') || 'Increase adults'}
              >
                +
              </button>
            </div>
          </div>

          {/* Children Stepper Card */}
          {childrenAllowed && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/80 dark:bg-card/50 border border-slate-200/80 dark:border-secondary/20 shadow-xs">
                <div>
                  <span className="font-semibold block text-sm text-foreground">
                    {dict.get(locale, 'experience.children') || 'Children'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {dict.get(locale, 'experience.childrenAgeHint') || 'Age 0–11 years'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={childrenCount <= 0}
                    onClick={() => onRemoveChild(childrenCount - 1)}
                    className="w-9 h-9 rounded-xl bg-primary dark:bg-transparent border-0 dark:border dark:border-secondary/30 flex items-center justify-center font-bold text-base text-white dark:text-secondary hover:bg-primary-dark dark:hover:bg-secondary dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer shadow-sm active:scale-95"
                    aria-label={dict.get(locale, 'experience.aria.decreaseChildren') || 'Decrease children'}
                  >
                    −
                  </button>
                  <span className="font-hornbill text-lg font-bold w-6 text-center text-foreground">
                    {childrenCount}
                  </span>
                  <button
                    type="button"
                    onClick={onAddChild}
                    className="w-9 h-9 rounded-xl bg-primary dark:bg-transparent border-0 dark:border dark:border-secondary/30 flex items-center justify-center font-bold text-base text-white dark:text-secondary hover:bg-primary-dark dark:hover:bg-secondary dark:hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
                    aria-label={dict.get(locale, 'experience.aria.increaseChildren') || 'Increase children'}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Individual Child Customization */}
              {childrenCount > 0 && (
                <div className="space-y-3 pt-1">
                  {childAges.map((age, idx) => {
                    const isInfant = age < 2
                    const currentMode = childBeddingModes[idx] || 'sharing_bed'
                    return (
                      <div
                        key={idx}
                        className="p-3.5 sm:p-4 rounded-2xl border border-gray-200 dark:border-secondary/20 bg-white dark:bg-card/60 flex flex-col gap-3 shadow-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs sm:text-sm font-semibold text-foreground">
                            {dict
                              .get(locale, 'experience.childIndexLabel')
                              .replace('{index}', String(idx + 1)) ||
                              dict.get(locale, 'experience.childIndex').replace('{index}', String(idx + 1)) ||
                              `Child ${idx + 1}`}
                          </span>
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-muted-foreground">
                              {dict.get(locale, 'experience.childAge') || dict.get(locale, 'experience.ageLabel') || 'Age'}:
                            </label>
                            <select
                              value={age}
                              onChange={(e) =>
                                onChildAgeChange(idx, Number(e.target.value))
                              }
                              className="p-1.5 rounded-lg border border-gray-200 dark:border-secondary/30 bg-white dark:bg-[#171514] text-xs font-semibold text-foreground focus:outline-none focus:border-primary dark:focus:border-secondary"
                            >
                              {Array.from({ length: 18 }, (_, i) => i).map((a) => (
                                <option key={a} value={a}>
                                  {a}{' '}
                                  {a === 1
                                    ? dict.get(locale, 'experience.yearSingular')
                                    : dict.get(locale, 'experience.yearPlural')}{' '}
                                  {a < 2
                                    ? dict.get(locale, 'experience.infantCategory')
                                    : a >= 12
                                      ? dict.get(locale, 'experience.adultCategory')
                                      : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {isInfant ? (
                          <div className="text-xs font-medium text-[#1a1e4e] dark:text-secondary bg-primary/8 dark:bg-secondary/10 border border-primary/15 dark:border-secondary/20 p-2.5 rounded-xl">
                            {dict.get(locale, 'experience.infantSharingNotice') || 'Infant (Under 2): Free • Sharing parent\'s bed'}
                          </div>
                        ) : age < 12 ? (
                          <div className="flex flex-col gap-2">
                            <label className="text-xs font-medium text-muted-foreground">
                              {dict.get(locale, 'experience.beddingPreference') || 'Bedding Preference'}
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => onChildBeddingChange(idx, 'sharing_bed')}
                                className={`p-2.5 sm:p-3 rounded-xl border text-left rtl:text-right transition-all cursor-pointer ${
                                  currentMode === 'sharing_bed'
                                    ? 'border-primary dark:border-secondary ring-1 ring-primary/30 dark:ring-secondary/40 bg-primary/8 dark:bg-secondary/10 text-foreground shadow-xs'
                                    : 'border-gray-200 dark:border-secondary/20 bg-white dark:bg-card/40 hover:border-primary/30 dark:hover:border-secondary/40 text-foreground'
                                }`}
                              >
                                <span className="block font-semibold text-xs text-foreground">
                                  {dict.get(locale, 'experience.sharingBed') || 'Sharing Bed'}
                                </span>
                                <span className="block text-[11px] text-muted-foreground mt-0.5">
                                  {dict.get(locale, 'experience.sharingBedDesc') || 'Shares parents\' bed'}
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => onChildBeddingChange(idx, 'extra_bed')}
                                className={`p-2.5 sm:p-3 rounded-xl border text-left rtl:text-right transition-all cursor-pointer ${
                                  currentMode === 'extra_bed'
                                    ? 'border-primary dark:border-secondary ring-1 ring-primary/30 dark:ring-secondary/40 bg-primary/8 dark:bg-secondary/10 text-foreground shadow-xs'
                                    : 'border-gray-200 dark:border-secondary/20 bg-white dark:bg-card/40 hover:border-primary/30 dark:hover:border-secondary/40 text-foreground'
                                }`}
                              >
                                <span className="block font-semibold text-xs text-foreground">
                                  {dict.get(locale, 'experience.extraBed') || 'Extra Bed'}
                                </span>
                                <span className="block text-[11px] text-muted-foreground mt-0.5">
                                  {dict.get(locale, 'experience.extraBedDesc') || 'Dedicated rollaway bed'}
                                </span>
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-secondary/15 flex items-center justify-end bg-slate-50/60 dark:bg-card/30">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-primary dark:bg-secondary text-white font-bold text-xs sm:text-sm hover:opacity-95 active:scale-[0.98] transition-all cursor-pointer shadow-sm"
          >
            {dict.get(locale, 'experience.done')}
          </button>
        </div>
      </div>
    </div>
  )
}
