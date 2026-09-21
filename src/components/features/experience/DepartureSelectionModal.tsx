'use client'

import React, { useEffect, useRef } from 'react'
import type { DepartureSlotDTO, ScheduleConfig } from '@/application/experience/dto-details'
import { JsonTranslationDictionary } from '@/domains/translation/dictionary'

const dict = new JsonTranslationDictionary()

function CloseIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function CalendarIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  )
}

function ClockIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function AlertIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  )
}

function formatTimeTo12Hour(timeStr: string): string {
  if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) return timeStr
  const [hStr, mStr] = timeStr.split(':')
  const h = Number(hStr)
  const m = Number(mStr)
  if (isNaN(h) || isNaN(m)) return timeStr
  const period = h >= 12 ? 'PM' : 'AM'
  const displayH = h % 12 === 0 ? 12 : h % 12
  const displayM = m < 10 ? `0${m}` : `${m}`
  return `${displayH}:${displayM} ${period}`
}

function formatHumanDateCompact(dateStr: string, locale: string): string {
  if (!dateStr) return ''
  try {
    const [year, month, day] = dateStr.split('-').map(Number)
    if (!year || !month || !day) return dateStr
    const d = new Date(Date.UTC(year, month - 1, day))
    return new Intl.DateTimeFormat(locale, {
      timeZone: 'UTC',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d)
  } catch {
    return dateStr
  }
}

export interface DepartureSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  isFixedPackage: boolean
  isFlexiblePackage: boolean
  isDailyTour: boolean
  availableDepartures: DepartureSlotDTO[]
  selectedSlotId: number | null
  onSelectSlot: (id: number) => void
  selectedDate: string
  minDate: string
  onSelectDate: (date: string) => void
  calculatedEndDate: string | null
  isSelectedDateBlackedOut: boolean
  formattedDuration?: string
  schedules?: ScheduleConfig[]
  selectedTime: string
  onSelectTime: (time: string) => void
  isTimeSlotInPast: (timeStr: string) => boolean
  locale: string
}

export function DepartureSelectionModal({
  isOpen,
  onClose,
  isFixedPackage,
  isFlexiblePackage,
  isDailyTour,
  availableDepartures,
  selectedSlotId,
  onSelectSlot,
  selectedDate,
  minDate,
  onSelectDate,
  calculatedEndDate,
  isSelectedDateBlackedOut,
  formattedDuration,
  schedules,
  selectedTime,
  onSelectTime,
  isTimeSlotInPast,
  locale,
}: DepartureSelectionModalProps) {
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

  const handleSelectSlotAndClose = (slotId: number) => {
    onSelectSlot(slotId)
    onClose()
  }

  const titleText = dict.get(locale, 'experience.departureModal.title')

  const modeBadgeText = isFixedPackage
    ? dict.get(locale, 'experience.fixedDeparture')
    : isDailyTour
      ? dict.get(locale, 'experience.departureModal.dailyTour')
      : dict.get(locale, 'experience.departureModal.flexibleDates')

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="departure-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-lg bg-white dark:bg-[#1a1715] rounded-3xl border border-slate-200/80 dark:border-secondary/20 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-secondary/15 flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-primary dark:text-secondary">
              {modeBadgeText}
            </span>
            <h3 id="departure-modal-title" className="text-base sm:text-lg font-bold text-foreground mt-0.5">
              {titleText}
            </h3>
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
          {/* Fixed Package Slots */}
          {isFixedPackage && (
            <div className="flex flex-col gap-3">
              {availableDepartures.length === 0 ? (
                <div className="p-4 rounded-2xl border border-secondary/25 bg-secondary/10 text-secondary text-xs font-semibold text-center leading-relaxed flex items-center justify-center gap-2">
                  <ClockIcon className="w-4 h-4 shrink-0 text-secondary" />
                  <span>{dict.get(locale, 'experience.empty.noPackageSlots')}</span>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {availableDepartures.map((slot) => {
                    const isSelected = selectedSlotId === slot.id
                    const isSlotSoldOut = slot.availableSeats === 0
                    const isLowAvailability = !isSlotSoldOut && slot.availableSeats <= 4
                    const formattedDate = formatHumanDateCompact(slot.departureDate, locale)
                    const formattedTime = slot.startTime ? formatTimeTo12Hour(slot.startTime) : null
                    const totalCap = slot.totalCapacity
                    const hasValidTotalCapacity = typeof totalCap === 'number' && totalCap > 0
                    const hasHeldSeats = typeof slot.heldSeats === 'number' && slot.heldSeats > 0
                    const heldCount = slot.heldSeats || 0
                    const shouldRenderMiniSeatStrip = hasValidTotalCapacity && totalCap <= 24

                    return (
                      <div
                        key={slot.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleSelectSlotAndClose(slot.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            handleSelectSlotAndClose(slot.id)
                          }
                        }}
                        className={`group p-4 rounded-2xl text-left rtl:text-right transition-all duration-200 relative flex flex-col gap-3 cursor-pointer border ${
                          isSelected
                            ? 'border-primary dark:border-secondary ring-2 ring-primary/20 dark:ring-secondary/30 bg-primary/[0.04] dark:bg-secondary/15 shadow-sm'
                            : 'border-slate-200/80 dark:border-secondary/20 bg-white dark:bg-card/60 hover:border-primary/40 dark:hover:border-secondary/50 hover:bg-slate-50/60 dark:hover:bg-secondary/5 shadow-xs'
                        }`}
                      >
                        {/* 1. Header: Date, Time & Selection State */}
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                isSelected
                                  ? 'bg-primary text-white dark:bg-secondary'
                                  : 'bg-slate-100 text-slate-600 dark:bg-[#171514] dark:text-secondary group-hover:bg-primary/10 group-hover:text-primary'
                              }`}
                            >
                              <CalendarIcon className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-hornbill text-sm sm:text-base font-bold text-foreground tracking-tight truncate">
                                {formattedDate || slot.departureDate}
                              </span>
                              {formattedTime && (
                                <span className="text-xs text-muted-foreground font-medium mt-0.5">
                                  {formattedTime}
                                </span>
                              )}
                            </div>
                          </div>

                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${
                              isSelected
                                ? 'bg-primary dark:bg-secondary text-white shadow-xs ring-2 ring-primary/20 dark:ring-secondary/30'
                                : 'border-2 border-slate-300 dark:border-secondary/30 group-hover:border-primary/50 dark:group-hover:border-secondary/60'
                            }`}
                          >
                            {isSelected && (
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                            )}
                          </div>
                        </div>

                        {/* 2. Key Availability & Capacity Metrics */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-secondary/15">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                                isSlotSoldOut
                                  ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                                  : isLowAvailability
                                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isSlotSoldOut ? 'bg-red-500' : isLowAvailability ? 'bg-amber-500 animate-pulse' : 'bg-amber-500'
                                }`}
                              />
                              {isSlotSoldOut
                                ? (dict.get(locale, 'experience.soldOut') || 'Sold Out')
                                : slot.availableSeats === 1
                                  ? dict.get(locale, 'experience.seatLeftSingle')
                                  : isLowAvailability
                                    ? dict.get(locale, 'experience.seatsLeft').replace('{count}', String(slot.availableSeats))
                                    : (dict.get(locale, 'experience.seatsAvailable') || '{count} seats available').replace('{count}', String(slot.availableSeats))}
                            </span>

                            {hasValidTotalCapacity && (
                              <span className="text-xs text-muted-foreground font-medium">
                                {(dict.get(locale, 'experience.capacityProgress') || '{available} of {total} seats available')
                                  .replace('{available}', String(slot.availableSeats))
                                  .replace('{total}', String(totalCap))}
                              </span>
                            )}
                          </div>

                          {hasHeldSeats && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 dark:text-sky-400 bg-sky-500/10 dark:bg-sky-500/15 px-2 py-0.5 rounded-full border border-sky-500/25">
                              <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                              {heldCount === 1
                                ? (dict.get(locale, 'experience.seatOnHoldSingle') || '1 on hold')
                                : (dict.get(locale, 'experience.seatsOnHold') || '{count} on hold').replace('{count}', String(heldCount))}
                            </span>
                          )}
                        </div>

                        {/* 3. Visual Airline Seat Matrix Strip (Airline-grade seat indicator) */}
                        {shouldRenderMiniSeatStrip && (
                          <div
                            className="grid gap-1 p-2 rounded-xl bg-slate-100/70 dark:bg-[#151413] border border-slate-200/60 dark:border-secondary/20"
                            style={{
                              gridTemplateColumns: `repeat(${Math.min(totalCap, 12)}, minmax(0, 1fr))`,
                            }}
                            role="img"
                            aria-label={`${slot.availableSeats} of ${totalCap} seats available`}
                          >
                            {Array.from({ length: totalCap }).map((_, idx) => {
                              const isSeatAvailable = idx < slot.availableSeats
                              const isSeatOnHold =
                                !isSeatAvailable &&
                                hasHeldSeats &&
                                idx < slot.availableSeats + heldCount

                              return (
                                <div
                                  key={idx}
                                  title={
                                    isSeatAvailable
                                      ? (dict.get(locale, 'experience.legendAvailable') || 'Available')
                                      : isSeatOnHold
                                        ? (dict.get(locale, 'experience.legendOnHold') || 'On hold')
                                        : (dict.get(locale, 'experience.legendBooked') || 'Booked')
                                  }
                                  className={`h-3 rounded-xs flex items-center justify-center transition-all ${
                                    isSeatAvailable
                                      ? 'bg-amber-500 text-white shadow-2xs'
                                      : isSeatOnHold
                                        ? 'bg-sky-500/30 border border-sky-500/50 text-sky-600'
                                        : 'bg-red-500/15 border border-red-500/25 text-red-500'
                                  }`}
                                >
                                  <span
                                    className={`w-1 h-1 rounded-full ${
                                      isSeatAvailable
                                        ? 'bg-white'
                                        : isSeatOnHold
                                          ? 'bg-sky-500 animate-pulse'
                                          : 'bg-red-500'
                                    }`}
                                  />
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {/* 4. Legend & Dossier Exploration Action */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-muted-foreground font-medium">
                          <div className="flex items-center gap-2.5">
                            <span className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              <span>{dict.get(locale, 'experience.legendAvailable') || 'Available'}</span>
                            </span>
                            {hasHeldSeats && (
                              <span className="flex items-center gap-1 text-sky-600 dark:text-sky-400 font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                                <span>{dict.get(locale, 'experience.legendOnHold') || 'On hold'}</span>
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                              <span>{dict.get(locale, 'experience.legendBooked') || 'Booked'}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Flexible Package Date Picker */}
          {isFlexiblePackage && (
            <div className="flex flex-col gap-3">
              <label className="text-xs sm:text-sm font-semibold text-foreground">
                {dict.get(locale, 'experience.selectStartDate') || 'Select Trip Start Date'}
              </label>
              <input
                type="date"
                value={selectedDate}
                min={minDate}
                onChange={(e) => onSelectDate(e.target.value)}
                className="w-full p-4 rounded-2xl border border-gray-200 dark:border-secondary/25 bg-gray-50/80 dark:bg-card/60 text-base font-semibold focus:outline-none focus:border-primary dark:focus:border-secondary focus:ring-2 focus:ring-primary/25 dark:focus:ring-secondary/30 transition-all text-foreground shadow-sm"
              />
              {isSelectedDateBlackedOut && (
                <p className="text-xs text-amber-500 dark:text-amber-400 font-semibold mt-1 flex items-center gap-1.5 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <AlertIcon className="w-4 h-4 shrink-0 text-amber-500 dark:text-amber-400" />
                  <span>{dict.get(locale, 'experience.blackoutDateNotice')}</span>
                </p>
              )}
              {selectedDate && calculatedEndDate && (
                <div className="p-4 rounded-2xl bg-gray-50/80 dark:bg-card/60 border border-gray-200 dark:border-secondary/25 text-xs flex flex-col gap-2 shadow-sm">
                  <div className="flex items-center justify-between font-medium text-muted-foreground">
                    <span>{dict.get(locale, 'experience.tripDuration')}</span>
                    <span className="text-foreground font-semibold text-sm">
                      {formattedDuration}
                    </span>
                  </div>
                  <div className="flex items-center justify-between font-semibold text-primary dark:text-secondary text-sm">
                    <span>{dict.get(locale, 'experience.returnDate')}</span>
                    <span>{calculatedEndDate}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Daily Tour Schedule */}
          {isDailyTour && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs sm:text-sm font-semibold text-foreground">
                  {dict.get(locale, 'experience.selectTourDate') || 'Select Tour Date'}
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  min={minDate}
                  onChange={(e) => onSelectDate(e.target.value)}
                  className="w-full p-4 rounded-2xl border border-gray-200 dark:border-secondary/25 bg-gray-50/80 dark:bg-card/60 text-base font-semibold focus:outline-none focus:border-primary dark:focus:border-secondary focus:ring-2 focus:ring-primary/25 dark:focus:ring-secondary/30 transition-all text-foreground shadow-sm"
                />
              </div>

              {schedules && schedules.length > 0 && (
                <div className="flex flex-col gap-2">
                  <label className="text-xs sm:text-sm font-semibold text-foreground">
                    {dict.get(locale, 'experience.selectDailyTimeSlot') || 'Select Departure Time'}
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {schedules.map((schedule) => {
                      const isSlotPast = isTimeSlotInPast(schedule.startTime)
                      const isSelected = selectedTime === schedule.startTime
                      return (
                        <button
                          key={schedule.startTime}
                          type="button"
                          disabled={isSlotPast}
                          onClick={() => {
                            if (!isSlotPast) {
                              onSelectTime(schedule.startTime)
                            }
                          }}
                          className={`p-3 rounded-2xl border text-center text-xs font-semibold transition-all cursor-pointer ${
                            isSlotPast
                              ? 'opacity-40 border-gray-200 dark:border-secondary/10 bg-gray-50 dark:bg-card/20 cursor-not-allowed text-muted-foreground'
                              : isSelected
                                ? 'border-primary dark:border-secondary ring-2 ring-primary/30 dark:ring-secondary/40 bg-primary/8 dark:bg-secondary/20 text-foreground shadow-md'
                                : 'border-gray-200 dark:border-secondary/25 hover:border-primary/40 dark:hover:border-secondary/50 bg-gray-50/80 dark:bg-card/60 hover:bg-primary/5 dark:hover:bg-secondary/5 text-foreground shadow-sm'
                          }`}
                        >
                          <div className="inline-flex items-center gap-1.5 text-sm font-semibold">
                            <ClockIcon className={`w-3.5 h-3.5 ${isSelected ? 'text-primary' : 'text-gray-400'} dark:text-secondary`} />
                            <span>{schedule.startTime}</span>
                          </div>
                          {isSlotPast ? (
                            <span className="block text-xs text-muted-foreground/60 line-through mt-0.5 font-medium">
                              {dict.get(locale, 'experience.passed')}
                            </span>
                          ) : schedule.label ? (
                            <span className="block text-xs text-muted-foreground mt-0.5 font-normal">
                              {schedule.label}
                            </span>
                          ) : null}
                        </button>
                      )
                    })}
                  </div>
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
            className="px-5 py-2.5 rounded-xl bg-primary dark:bg-secondary text-white font-bold text-xs sm:text-sm hover:opacity-95 active:scale-[0.98] transition-all cursor-pointer shadow-sm"
          >
            {dict.get(locale, 'experience.done') || dict.get(locale, 'experience.close')}
          </button>
        </div>
      </div>
    </div>
  )
}
