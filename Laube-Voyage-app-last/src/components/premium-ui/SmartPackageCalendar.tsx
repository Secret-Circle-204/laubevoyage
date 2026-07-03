'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTheme } from '../providers/ThemeProvider'

export interface DateRange {
  id?: string | null
  startDate?: string | null
  endDate?: string | null
  adultPrice?: number | null
  infantPrice?: number | null
}

interface SmartPackageCalendarProps {
  availableDates: DateRange[]
  onSelect: (date: Date, dateRange?: DateRange) => void
  selectedDate?: Date | null
}

export function SmartPackageCalendar({
  availableDates,
  onSelect,
  selectedDate,
}: SmartPackageCalendarProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  // Filter to only dates with valid start/end
  const validDates = availableDates.filter(
    (d): d is DateRange & { startDate: string; endDate: string } => !!d.startDate && !!d.endDate,
  )

  // Determine mode: free-pick vs restricted
  const hasPredefinedDates = validDates.length > 0

  // Find the first available month to show initially
  const initialDate = useMemo(() => {
    if (hasPredefinedDates) {
      const sorted = [...validDates].sort(
        (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
      )
      const today = new Date()
      const firstFuture = sorted.find((d) => new Date(d.startDate) > today)
      if (firstFuture) return new Date(firstFuture.startDate)
      return today
    }
    return new Date()
  }, [validDates, hasPredefinedDates])

  const [currentMonth, setCurrentMonth] = useState(initialDate)

  // Normalize dates for easy comparison
  const normalize = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

  // Parse ranges into comparable objects
  const ranges = useMemo(() => {
    return validDates
      .map((d) => ({
        start: normalize(new Date(d.startDate)),
        end: normalize(new Date(d.endDate)),
        original: d,
      }))
      .sort((a, b) => a.start - b.start)
  }, [validDates])

  const getDayStatus = (date: Date) => {
    const time = normalize(date)
    for (const range of ranges) {
      if (time === range.start && time === range.end) return { type: 'single', range }
      if (time === range.start) return { type: 'start', range }
      if (time === range.end) return { type: 'end', range }
      if (time > range.start && time < range.end) return { type: 'middle', range }
    }
    return null
  }

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()
  const firstDayOfWeek = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay()

  const nextMonth = () =>
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  const prevMonth = () =>
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))

  const jumpToNextAvailable = () => {
    const startOfNextMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      1,
    ).getTime()
    const nextFuture = ranges.find((r) => r.start >= startOfNextMonth)
    if (nextFuture) {
      setCurrentMonth(new Date(nextFuture.original.startDate))
    } else if (ranges.length > 0) {
      setCurrentMonth(new Date(ranges[0].original.startDate))
    }
  }

  const jumpToPreviousAvailable = () => {
    const startOfCurrentMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      1,
    ).getTime()
    const previousTrips = ranges.filter((r) => r.start < startOfCurrentMonth)
    if (previousTrips.length > 0) {
      const lastPrevious = previousTrips[previousTrips.length - 1]
      setCurrentMonth(new Date(lastPrevious.original.startDate))
    } else if (ranges.length > 0) {
      setCurrentMonth(new Date(ranges[ranges.length - 1].original.startDate))
    }
  }

  // Today for disabling past dates in free-pick mode
  const todayNorm = normalize(new Date())

  return (
    <div
      className={`rounded-3xl border overflow-hidden transition-all duration-300 ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray/10 shadow-lg'}`}
    >
      {/* Header */}
      <div
        className={`p-6 flex items-center justify-between border-b ${isDark ? 'border-white/10' : 'border-gray/10'}`}
      >
        <button
          onClick={prevMonth}
          className={`p-2 rounded-full hover:bg-gray/10 transition-colors ${isDark ? 'text-white' : 'text-dark'}`}
        >
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <h3 className={`font-serif text-lg font-medium ${isDark ? 'text-white' : 'text-dark'}`}>
            {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </h3>
          {hasPredefinedDates ? (
            // Restricted mode: show "Dates Available" indicator
            ranges.some((r) => {
              const start = new Date(r.original.startDate)
              return (
                start.getMonth() === currentMonth.getMonth() &&
                start.getFullYear() === currentMonth.getFullYear()
              )
            }) && (
              <>
                <span className="text-[10px] text-accent font-bold uppercase tracking-widest block mt-1">
                  Dates Available
                </span>
                <div className="flex items-center gap-1.5 justify-center mt-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-accent shadow-sm" />
                  <span className="text-[9px] text-gray/60 uppercase tracking-wider">
                    Start Date
                  </span>
                </div>
              </>
            )
          ) : (
            // Free-pick mode: show hint
            <span className="text-[10px] text-secondary font-bold uppercase tracking-widest block mt-1">
              Pick Your Preferred Date
            </span>
          )}
        </div>
        <button
          onClick={nextMonth}
          className={`p-2 rounded-full hover:bg-gray/10 transition-colors ${isDark ? 'text-white' : 'text-dark'}`}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Grid */}
      <div className="p-6">
        <div className="grid grid-cols-7 mb-4 text-center">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
            <div key={d} className="text-[10px] uppercase font-bold text-gray/40">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-2">
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i + 1)
            const dayNorm = normalize(date)

            if (hasPredefinedDates) {
              // ─── RESTRICTED MODE: Only predefined start dates are clickable ───
              const status = getDayStatus(date)
              const isSelected = selectedDate && normalize(selectedDate) === dayNorm
              const isClickable = status?.type === 'start' || status?.type === 'single'
              const datePrice = status?.range?.original?.adultPrice

              return (
                <div key={i} className="relative h-10 flex items-center justify-center group/day">
                  {/* Range highlighting */}
                  {status?.type === 'middle' && (
                    <div
                      className={`absolute inset-y-0 left-0 right-0 ${isDark ? 'bg-accent/20' : 'bg-accent/10'}`}
                    />
                  )}
                  {status?.type === 'start' && status.range.start !== status.range.end && (
                    <div
                      className={`absolute inset-y-0 right-0 left-1/2 ${isDark ? 'bg-accent/20' : 'bg-accent/10'}`}
                    />
                  )}
                  {status?.type === 'end' && status.range.start !== status.range.end && (
                    <div
                      className={`absolute inset-y-0 left-0 right-1/2 ${isDark ? 'bg-accent/20' : 'bg-accent/10'}`}
                    />
                  )}

                  {/* Price Tooltip */}
                  {isClickable && datePrice && (
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-accent text-white text-[8px] font-bold rounded-md whitespace-nowrap opacity-0 group-hover/day:opacity-100 transition-opacity pointer-events-none z-20 shadow-lg">
                      ${datePrice.toLocaleString()}
                    </div>
                  )}

                  <button
                    disabled={!isClickable}
                    onClick={() => isClickable && onSelect(date, status?.range?.original)}
                    className={`
                      relative z-10 w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300
                      ${
                        isClickable
                          ? isDark
                            ? 'hover:bg-accent text-white ring-1 ring-accent/50'
                            : 'hover:bg-accent hover:text-white text-dark ring-1 ring-accent/20'
                          : 'text-gray/30 cursor-default'
                      }
                      ${status?.type === 'start' || status?.type === 'single' ? 'bg-accent text-white shadow-lg shadow-accent/30' : ''}
                      ${status?.type === 'end' && !isClickable ? (isDark ? 'bg-white/10 text-white' : 'bg-gray/10 text-dark') : ''}
                      ${isSelected ? 'scale-110 ring-2 ring-white' : ''}
                    `}
                  >
                    {i + 1}
                  </button>
                </div>
              )
            } else {
              // ─── FREE-PICK MODE: Any future date is clickable ───
              const isPast = dayNorm < todayNorm
              const isSelected = selectedDate && normalize(selectedDate) === dayNorm
              const isToday = dayNorm === todayNorm

              return (
                <div key={i} className="relative h-10 flex items-center justify-center">
                  <button
                    disabled={isPast}
                    onClick={() => !isPast && onSelect(date)}
                    className={`
                      relative z-10 w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300
                      ${
                        isPast
                          ? 'text-gray/20 cursor-default'
                          : isSelected
                            ? 'bg-accent text-white shadow-lg shadow-accent/30 scale-110 ring-2 ring-accent/30'
                            : isToday
                              ? isDark
                                ? 'ring-1 ring-secondary/50 text-secondary hover:bg-secondary hover:text-white'
                                : 'ring-1 ring-secondary/30 text-secondary hover:bg-secondary hover:text-white'
                              : isDark
                                ? 'text-white/80 hover:bg-accent/20 hover:text-white'
                                : 'text-dark hover:bg-accent/10 hover:text-accent'
                      }
                    `}
                  >
                    {i + 1}
                  </button>
                </div>
              )
            }
          })}
        </div>

        {/* Navigation Buttons — Only for restricted mode */}
        {hasPredefinedDates && (
          <div className="mt-8 pt-6 border-t border-gray/10 flex flex-wrap gap-3 justify-center">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer transition-colors ${isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray/5 hover:bg-gray/10 text-dark'}`}
              onClick={jumpToPreviousAvailable}
            >
              <ChevronLeft size={12} />
              <span>Previous trip</span>
            </div>
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer transition-colors ${isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray/5 hover:bg-gray/10 text-dark'}`}
              onClick={jumpToNextAvailable}
            >
              <span>Jump to next trip</span>
              <ChevronRight size={12} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
