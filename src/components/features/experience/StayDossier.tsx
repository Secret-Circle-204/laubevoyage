'use client'

import React, { useState, useEffect } from 'react'
import type {
  AccommodationStayDTO,
  AccommodationOptionDTO,
  FormattedCommercialBreakdown,
} from '@/application/experience/dto-details'
import { JsonTranslationDictionary } from '@/domains/translation/dictionary'

const dict = new JsonTranslationDictionary()

function BedIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  )
}

function DiningIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 10a3 3 0 016 0v5a3 3 0 01-6 0v-5z" />
    </svg>
  )
}

function ChevronDownIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  )
}

function CheckIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}

export interface StayDossierProps {
  stays?: AccommodationStayDTO[]
  selectedAccommodationOptions?: Record<number, string>
  onSelectOption?: (stayOrder: number, optionId: string) => void
  locale: string
  staysBreakdown?: FormattedCommercialBreakdown['staysBreakdown']
}

export function StayDossier({
  stays,
  selectedAccommodationOptions = {},
  onSelectOption,
  locale,
  staysBreakdown,
}: StayDossierProps) {
  // Explicit user manual toggles: stayOrder -> boolean
  const [manualToggledStays, setManualToggledStays] = useState<Record<number, boolean>>({})
  // Hovered stay on desktop
  const [hoveredStay, setHoveredStay] = useState<number | null>(null)
  // Detected mobile / touch device
  const [isTouchOrMobile, setIsTouchOrMobile] = useState<boolean>(false)

  useEffect(() => {
    const checkTouch = () => {
      const hasTouch = window.matchMedia('(hover: none), (max-width: 768px)').matches
      setIsTouchOrMobile(hasTouch)
    }
    checkTouch()
    window.addEventListener('resize', checkTouch)
    return () => window.removeEventListener('resize', checkTouch)
  }, [])

  if (!stays || stays.length === 0) return null

  const toggleStay = (stayOrder: number, currentlyOpen: boolean) => {
    setManualToggledStays((prev) => ({
      ...prev,
      [stayOrder]: !currentlyOpen,
    }))
  }

  const getOccupancySubtitle = (occ: string) => {
    return dict.get(locale, `experience.occupancy.${occ}GuestHint`)
  }

  return (
    <section id="stay-dossier" className="animate-editorial-reveal">
      <div className="flex flex-col mb-8 pb-3 border-b border-border/60">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-secondary" />
          <span className="text-xs sm:text-sm font-semibold text-secondary">
            {dict.get(locale, 'experience.sanctuariesAndStays')}
          </span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-hornbill font-light text-foreground mt-1">
          {dict.get(locale, 'experience.staysTitle')}
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          {dict.get(locale, 'experience.staysSubtitle')}
        </p>
      </div>

      <div className="space-y-8">
        {stays.map((stay) => {
          const options = Array.isArray(stay.options) ? stay.options : []
          const isMultiOption = options.length > 1
          const selectedOptionId =
            selectedAccommodationOptions[stay.order] ||
            (options.length === 1 ? options[0]?.id : undefined)

          const selectedOption: AccommodationOptionDTO | null =
            options.find((opt) => opt.id === selectedOptionId) ||
            (options.length === 1 ? options[0] : null)

          const matchingStayBreakdown = staysBreakdown?.find(
            (s) => s.order === stay.order && (!s.optionId || s.optionId === selectedOption?.id),
          )

          // On mobile/touch: cards are open by default unless manually collapsed.
          // On desktop: cards preview on hover and pin on click.
          const isManuallyToggled = stay.order in manualToggledStays
          const isHovered = !isTouchOrMobile && hoveredStay === stay.order
          const isOpen = isTouchOrMobile
            ? isManuallyToggled
              ? manualToggledStays[stay.order]
              : true
            : isManuallyToggled
              ? manualToggledStays[stay.order] || isHovered
              : isHovered

          const controlId = `stay-rates-control-${stay.order}`
          const panelId = `stay-rates-panel-${stay.order}`

          // Group room allocation counts for this stay directly from the authoritative applied room rates
          const roomCounts: Record<string, number> = {}
          matchingStayBreakdown?.appliedRoomRates?.forEach((r) => {
            roomCounts[r.occupancy] = (roomCounts[r.occupancy] || 0) + 1
          })

          const allocationSummary = Object.entries(roomCounts)
            .map(([occ, count]) => {
              const occLabel = dict.get(locale, `experience.occupancy.${occ}Room`)
              return `${count} ${occLabel}`
            })
            .join(' · ')

          // Group individual room rate preview items for direct visible preview
          const activeRatesPreview = Object.entries(roomCounts).map(([occ, count]) => {
            const appliedRate = matchingStayBreakdown?.appliedRoomRates?.find((r) => r.occupancy === occ)
            const fallbackRoomRate = selectedOption?.roomRates?.find((r) => r.occupancy === occ)
            const occLabel = dict.get(locale, `experience.occupancy.${occ}Room`)
            const formattedUnitRate =
              appliedRate?.unitRatePrice?.formatted ||
              fallbackRoomRate?.ratePrice?.formatted ||
              ''
            return {
              occupancy: occ,
              count,
              label: occLabel,
              formattedUnitRate,
            }
          })

          return (
            <div
              key={stay.order}
              id={`stay-segment-${stay.order}`}
              onMouseEnter={() => !isTouchOrMobile && setHoveredStay(stay.order)}
              onMouseLeave={() =>
                !isTouchOrMobile &&
                setHoveredStay((current) => (current === stay.order ? null : current))
              }
              className={`p-6 sm:p-8 rounded-3xl border bg-card shadow-xs flex flex-col gap-6 transition-all duration-300 ${
                isOpen ? 'border-secondary/50 shadow-md' : 'border-border/80 hover:border-secondary/30'
              }`}
            >
              {/* Stay Segment Header */}
              <div className="flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-border/40">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-secondary/10 text-secondary border border-secondary/20">
                    {dict.get(locale, 'experience.stayDossier.stayOrder', { order: String(stay.order) })}
                  </span>
                  <span className="text-border">·</span>
                  <span className="text-xs font-semibold text-foreground">
                    {stay.nights}{' '}
                    {stay.nights === 1
                      ? dict.get(locale, 'experience.nightSingular')
                      : dict.get(locale, 'experience.nightPlural')}
                  </span>
                  {isMultiOption && (
                    <>
                      <span className="text-border">·</span>
                      <span className="text-xs text-muted-foreground font-medium">
                        {dict.get(locale, 'experience.stayDossier.optionsAvailable', { count: String(options.length) })}
                      </span>
                    </>
                  )}
                </div>

                {selectedOption && isMultiOption && (
                  <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    {selectedOption.isDefault
                      ? dict.get(locale, 'experience.stayDossier.defaultOptionBadge')
                      : dict.get(locale, 'experience.stayDossier.selectedOptionBadge')}
                  </span>
                )}
                {!selectedOption && isMultiOption && (
                  <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    {dict.get(locale, 'experience.stayDossier.selectionRequired')}
                  </span>
                )}
              </div>

              {/* Case A: Multiple Hotel Options Selector */}
              {isMultiOption && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">
                      {dict.get(locale, 'experience.stayDossier.selectOptionPrompt')}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {dict.get(locale, 'experience.stayDossier.selectOneAlternative')}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {options.map((option) => {
                      const isSelected = selectedOptionId === option.id

                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => onSelectOption?.(stay.order, option.id)}
                          className={`p-4 sm:p-5 rounded-2xl border text-left rtl:text-right flex flex-col justify-between gap-3 transition-all duration-200 cursor-pointer ${
                            isSelected
                              ? 'bg-secondary/8 border-secondary ring-2 ring-secondary/35 shadow-sm'
                              : 'bg-card-elevated/40 hover:bg-card-elevated/80 border-border/70 hover:border-secondary/30'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="text-[11px] font-medium text-muted-foreground capitalize">
                                  {option.propertyType}
                                </span>
                                {option.rating && (
                                  <span className="text-xs font-semibold text-amber-500">
                                    ★ {option.rating.toFixed(1)}
                                  </span>
                                )}
                                {option.isDefault && (
                                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-secondary/15 text-secondary border border-secondary/25">
                                    {dict.get(locale, 'experience.stayDossier.defaultChoiceTag')}
                                  </span>
                                )}
                              </div>
                              <h4 className="text-base sm:text-lg font-hornbill font-semibold text-foreground">
                                {option.propertyName}
                              </h4>
                              {option.roomCategory && (
                                <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground mt-1 font-medium">
                                  <BedIcon className="w-3.5 h-3.5 text-secondary shrink-0" />
                                  <span>{option.roomCategory}</span>
                                </div>
                              )}
                            </div>

                            {/* Radio / Selection Indicator */}
                            <div
                              className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                                isSelected
                                  ? 'border-secondary bg-secondary text-white'
                                  : 'border-border/80 bg-background'
                              }`}
                            >
                              {isSelected && <CheckIcon className="w-3 h-3" />}
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/30 flex-wrap">
                            {option.boardBasis ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-secondary">
                                <DiningIcon className="w-3 h-3 text-secondary shrink-0" />
                                <span>{dict.get(locale, `experience.boardBasis.${option.boardBasis}`)}</span>
                              </span>
                            ) : <span />}

                            <span className="text-[11px] font-medium text-muted-foreground">
                              {option.pricingUnit === 'per_night'
                                ? dict.get(locale, 'experience.stayDossier.pricedPerNight')
                                : dict.get(locale, 'experience.stayDossier.pricedPerStay')}
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Case B: Single Option Hotel Presentation (or Selected Option Details) */}
              {selectedOption ? (
                <div className="flex flex-col gap-4">
                  {!isMultiOption && (
                    <div>
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-xs font-medium text-muted-foreground capitalize">
                          {selectedOption.propertyType}
                        </span>
                        {selectedOption.boardBasis && (
                          <>
                            <span className="text-border">·</span>
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-secondary">
                              <DiningIcon className="w-3.5 h-3.5 text-secondary shrink-0" />
                              <span>{dict.get(locale, `experience.boardBasis.${selectedOption.boardBasis}`)}</span>
                            </span>
                          </>
                        )}
                      </div>
                      <h3 className="text-xl sm:text-2xl font-hornbill font-light text-foreground">
                        {selectedOption.propertyName}
                      </h3>
                      {selectedOption.roomCategory && (
                        <div className="inline-flex items-center gap-2 text-sm text-foreground/80 mt-1 font-medium">
                          <BedIcon className="w-4 h-4 text-secondary shrink-0" />
                          <span>{selectedOption.roomCategory}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Customer-Specific Stay Allocation & Total Banner */}
                  {matchingStayBreakdown && (
                    <div className="p-4 sm:p-5 rounded-2xl bg-card-elevated/60 border border-secondary/20 flex flex-col gap-3">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div>
                          <span className="text-xs font-semibold text-secondary block mb-0.5">
                            {dict.get(locale, 'experience.yourRoomAllocation')}
                          </span>
                          <span className="text-xs sm:text-sm font-semibold text-foreground">
                            {allocationSummary ||
                              `${matchingStayBreakdown.appliedRoomRates.length} ${dict.get(locale, 'experience.roomPlural')}`}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-semibold text-muted-foreground block mb-0.5">
                            {dict.get(locale, 'experience.yourStayTotal')}
                          </span>
                          <span className="text-base sm:text-lg font-hornbill font-bold text-foreground">
                            {matchingStayBreakdown.stayAccommodationTotalPrice.formatted}
                          </span>
                        </div>
                      </div>

                      {/* Visible Price Preview: Display each allocated room's unit rate immediately */}
                      {activeRatesPreview.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2.5 border-t border-border/40">
                          {activeRatesPreview.map((item) => (
                            <div
                              key={item.occupancy}
                              className="flex items-center justify-between text-xs py-1.5 px-3 rounded-xl bg-card/60 border border-border/50"
                            >
                              <span className="font-medium text-foreground/90">
                                {item.count > 1 ? `${item.count} × ${item.label}` : item.label}
                              </span>
                              <span className="font-semibold text-accent">
                                {item.formattedUnitRate}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Room Rates Ledger Progressive Disclosure (Hover to Preview, Click to Pin) */}
                  {selectedOption.roomRates && selectedOption.roomRates.length > 0 && (
                    <div className="pt-0.5">
                      <button
                        id={controlId}
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        onClick={() => toggleStay(stay.order, isOpen)}
                        className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer min-h-[44px] focus-visible:ring-2 focus-visible:ring-secondary/50 focus-visible:outline-none ${
                          isOpen
                            ? 'bg-secondary/15 text-secondary border border-secondary/35 shadow-xs'
                            : 'bg-secondary/5 hover:bg-secondary/10 text-secondary/90 hover:text-secondary border border-secondary/20 hover:border-secondary/35'
                        }`}
                      >
                        <span>
                          {isOpen
                            ? dict.get(locale, 'experience.hideRoomRates')
                            : dict.get(locale, 'experience.viewRoomRates')}
                        </span>
                        <ChevronDownIcon
                          className={`w-3.5 h-3.5 text-secondary transition-transform duration-300 ease-out motion-reduce:transition-none ${
                            isOpen ? 'rotate-180' : 'rotate-0'
                          }`}
                        />
                      </button>

                      {/* Smooth Collapsible Content Container with CSS Grid */}
                      <div
                        id={panelId}
                        role="region"
                        aria-labelledby={controlId}
                        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${
                          isOpen
                            ? 'grid-rows-[1fr] opacity-100 mt-2'
                            : 'grid-rows-[0fr] opacity-0 pointer-events-none mt-0'
                        }`}
                      >
                        <div className="overflow-hidden">
                          <div className="pt-3.5 pb-1 border-t border-border/50 mt-2">
                            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                              <span className="text-xs font-semibold text-muted-foreground">
                                {dict.get(locale, 'experience.supportedOccupancyOptions')}
                              </span>
                              <span className="text-[11px] font-medium text-secondary bg-secondary/10 px-2.5 py-0.5 rounded-full">
                                {selectedOption.pricingUnit === 'per_night'
                                  ? dict.get(locale, 'experience.coversNightly')
                                  : dict.get(locale, 'experience.coversAllNights', { nights: stay.nights })}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              {selectedOption.roomRates.map((rateObj) => {
                                const guestHint = getOccupancySubtitle(rateObj.occupancy)
                                const roomLabel =
                                  dict.get(locale, `experience.occupancy.${rateObj.occupancy}Room`) ||
                                  rateObj.label

                                return (
                                  <div
                                    key={rateObj.occupancy}
                                    className={`p-3.5 rounded-2xl bg-card-elevated/60 border text-xs flex flex-col justify-between gap-1.5 transition-all ${
                                      rateObj.enabled
                                        ? 'border-border/70 hover:border-secondary/30'
                                        : 'border-border/30 opacity-50 bg-card/20'
                                    }`}
                                  >
                                    <div>
                                      <span className="font-semibold block text-foreground capitalize text-xs">
                                        {roomLabel}
                                      </span>
                                      {guestHint && (
                                        <span className="text-xs text-muted-foreground block mt-0.5">
                                          {guestHint}
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-xs font-semibold mt-1 block">
                                      {!rateObj.enabled ? (
                                        <span className="text-muted-foreground text-xs">
                                          {dict.get(locale, 'experience.unavailable')}
                                        </span>
                                      ) : rateObj.rateEGP === 0 ? (
                                        <span className="text-secondary font-semibold">
                                          {dict.get(locale, 'experience.includedInBase')}
                                        </span>
                                      ) : (
                                        <span className="text-accent font-bold">
                                          {rateObj.ratePrice?.formatted || ''}
                                          <span className="text-xs font-normal text-muted-foreground ml-1">
                                            {selectedOption.pricingUnit === 'per_night'
                                              ? dict.get(locale, 'experience.perNightShort')
                                              : dict.get(locale, 'experience.perStayShort')}
                                          </span>
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 font-medium">
                  {dict.get(locale, 'experience.stayDossier.selectionRequiredPrompt', { order: String(stay.order) })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
