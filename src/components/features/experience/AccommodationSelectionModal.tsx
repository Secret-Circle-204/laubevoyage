'use client'

import React, { useEffect, useRef } from 'react'
import type { AccommodationOptionDTO } from '@/application/experience/dto-details'
import { JsonTranslationDictionary } from '@/domains/translation/dictionary'

const dict = new JsonTranslationDictionary()

interface AccommodationSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  stayOrder: number
  destinationName?: string
  nights: number
  options: AccommodationOptionDTO[]
  selectedOptionId?: string
  onSelectOption: (stayOrder: number, optionId: string) => void
  locale: string
}

export function AccommodationSelectionModal({
  isOpen,
  onClose,
  stayOrder,
  destinationName,
  nights,
  options,
  selectedOptionId,
  onSelectOption,
  locale,
}: AccommodationSelectionModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  // ESC key listener & body scroll lock
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

  const nightLabel =
    nights === 1
      ? dict.get(locale, 'experience.nightSingular')
      : dict.get(locale, 'experience.nightPlural')

  const titleText = dict.get(locale, 'experience.accommodationModal.title')

  const handleSelect = (optionId: string) => {
    if (optionId !== selectedOptionId) {
      onSelectOption(stayOrder, optionId)
    }
    onClose()
  }

  const handleScrollToDossier = () => {
    onClose()
    const element = document.getElementById('stay-dossier')
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="accommodation-modal-title"
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
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-secondary/15 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-primary dark:text-secondary">
              {destinationName ? `${destinationName} · ${nights} ${nightLabel}` : `${nights} ${nightLabel}`}
            </span>
            <h3 id="accommodation-modal-title" className="text-base sm:text-lg font-bold text-foreground mt-0.5">
              {titleText}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-card/60 hover:bg-slate-200 dark:hover:bg-secondary/20 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Options List (Strictly lightweight & fully controlled) */}
        <div className="p-5 sm:p-6 overflow-y-auto flex flex-col gap-3">
          {options.map((opt) => {
            const isSelected = opt.id === selectedOptionId
            const boardKey = `experience.boardBasis.${opt.boardBasis}`
            const boardLabel = dict.get(locale, boardKey) || opt.boardBasis

            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelect(opt.id)}
                className={`w-full p-4 rounded-2xl border text-left rtl:text-right transition-all cursor-pointer flex items-start gap-3.5 ${
                  isSelected
                    ? 'border-primary dark:border-secondary bg-primary/8 dark:bg-secondary/10 ring-2 ring-primary/25 dark:ring-secondary/30 shadow-xs'
                    : 'border-slate-200/80 dark:border-secondary/20 bg-slate-50/60 dark:bg-card/40 hover:border-primary/40 dark:hover:border-secondary/40 hover:bg-white dark:hover:bg-card/60'
                }`}
              >
                {/* Radio Indicator */}
                <div className="mt-0.5 shrink-0">
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                      isSelected
                        ? 'border-primary dark:border-secondary bg-primary dark:bg-secondary text-white'
                        : 'border-slate-300 dark:border-secondary/40 bg-white dark:bg-transparent'
                    }`}
                  >
                    {isSelected && (
                      <div className="w-2 h-2 rounded-full bg-white dark:bg-[#1a1715]" />
                    )}
                  </div>
                </div>

                {/* Hotel Summary */}
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-foreground truncate">
                      {opt.propertyName}
                    </span>
                    {opt.isDefault && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                        {dict.get(locale, 'experience.defaultBadge')}
                      </span>
                    )}
                  </div>

                  {/* Rating Stars */}
                  {opt.rating && opt.rating > 0 ? (
                    <div className="flex items-center gap-1 text-xs text-amber-500">
                      <span>{'★'.repeat(Math.min(opt.rating, 5))}</span>
                      <span className="text-xs font-medium text-muted-foreground ml-1 rtl:ml-0 rtl:mr-1">
                        {opt.rating} / 5
                      </span>
                    </div>
                  ) : null}

                  {/* Room Category & Board Basis */}
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap pt-0.5">
                    {opt.roomCategory && (
                      <span className="font-medium text-foreground/80">{opt.roomCategory}</span>
                    )}
                    {opt.roomCategory && opt.boardBasis && <span>·</span>}
                    {opt.boardBasis && (
                      <span>{boardLabel}</span>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Footer with scroll link to full StayDossier */}
        <div className="p-4 sm:p-5 bg-slate-50/80 dark:bg-card/40 border-t border-slate-100 dark:border-secondary/15 flex items-center justify-between gap-3 text-xs">
          <button
            type="button"
            onClick={handleScrollToDossier}
            className="text-primary dark:text-secondary hover:underline font-semibold cursor-pointer"
          >
            {dict.get(locale, 'experience.accommodationModal.viewFullDossier')}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200/80 dark:bg-card hover:bg-slate-300 dark:hover:bg-secondary/20 text-foreground font-bold transition-all cursor-pointer"
          >
            {dict.get(locale, 'experience.close')}
          </button>
        </div>
      </div>
    </div>
  )
}
