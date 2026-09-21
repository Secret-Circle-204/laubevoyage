'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  RoomAllocationPolicy,
  type OccupancyType,
  type RoomAllocationOption,
} from '@/domains/experience/room-allocation-policy'
import { JsonTranslationDictionary } from '@/domains/translation/dictionary'

const dict = new JsonTranslationDictionary()

/* Minimalist geometric SVG icons */
function CloseIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function BedIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
      />
    </svg>
  )
}

function ChevronDownIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  )
}

function AlertIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 7.5h.008v.008H12v-.008z"
      />
    </svg>
  )
}

function SparklesIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
      />
    </svg>
  )
}

export function formatOptionLabel(opt: RoomAllocationOption, locale: string): string {
  const counts: Record<OccupancyType, number> = { quad: 0, triple: 0, double: 0, single: 0 }
  opt.rooms.forEach((r) => {
    counts[r.occupancy] = (counts[r.occupancy] || 0) + 1
  })

  const parts: string[] = []
  const order: OccupancyType[] = ['quad', 'triple', 'double', 'single']

  order.forEach((occ) => {
    const c = counts[occ]
    if (c > 0) {
      const template =
        c === 1
          ? `1 ${dict.get(locale, `experience.occupancy.${occ}Room`)}`
          : dict.get(locale, `experience.occupancy.${occ}RoomsPlural`, { count: String(c) })
      parts.push(template)
    }
  })

  return parts.join(' + ')
}

export type DraftMatchStatus =
  | 'unavailable' // availableOptions is empty
  | 'incomplete' // Nominal capacity < totalGuests
  | 'excess_capacity' // Nominal capacity > totalGuests
  | 'unsupported_combination' // Capacity == totalGuests but no match in availableOptions
  | 'locally_matched' // Matches an approved availableOption locally (candidateOption !== null)

export type ServerValidationState =
  | 'idle' // No active server request
  | 'validating' // Server validation in-flight
  | 'valid' // Server confirmed pricing, availability, and allocation
  | 'invalid' // Server rejected allocation or pricing

export interface RebalancingSuggestion {
  option: RoomAllocationOption
  reason: 'incomplete' | 'excess_capacity' | 'unsupported_combination'
  capacityBefore: number
  capacityAfter: number
  label: string
}

export type SmartSuggestion = RebalancingSuggestion

/**
 * Pure, deterministic Smart Rebalancing Assistant resolver.
 * Evaluates user's current draft counts and resolves the closest approved option from availableOptions.
 */
export function resolveSmartRebalancingSuggestion(params: {
  draftCounts: Record<OccupancyType, number>
  availableOptions: RoomAllocationOption[]
  totalGuests: number
  locale?: string
}): RebalancingSuggestion | null {
  const { draftCounts, availableOptions, totalGuests, locale = 'ar' } = params

  if (!availableOptions || availableOptions.length === 0) {
    return null
  }

  // 1. Check if draft matches an available option directly
  const matched = availableOptions.find((opt) => {
    const optCounts: Record<OccupancyType, number> = { quad: 0, triple: 0, double: 0, single: 0 }
    opt.rooms.forEach((r) => {
      optCounts[r.occupancy] = (optCounts[r.occupancy] || 0) + 1
    })
    return (
      optCounts.quad === (draftCounts.quad || 0) &&
      optCounts.triple === (draftCounts.triple || 0) &&
      optCounts.double === (draftCounts.double || 0) &&
      optCounts.single === (draftCounts.single || 0)
    )
  })

  if (matched) {
    return null // Already perfectly matched, no rebalancing needed
  }

  const capacityBefore =
    (draftCounts.quad || 0) * 4 +
    (draftCounts.triple || 0) * 3 +
    (draftCounts.double || 0) * 2 +
    (draftCounts.single || 0) * 1

  // Rank candidates deterministically:
  // 1. Full room-count composition delta: sum(|opt[occ] - draft[occ]|)
  // 2. Tie-breaker: Pre-existing domain order in availableOptions
  const candidatesWithDelta = availableOptions.map((opt, originalIndex) => {
    const optCounts: Record<OccupancyType, number> = { quad: 0, triple: 0, double: 0, single: 0 }
    let optCapacity = 0
    opt.rooms.forEach((r) => {
      optCounts[r.occupancy] = (optCounts[r.occupancy] || 0) + 1
      optCapacity += r.adults + (r.children || 0)
    })

    const delta =
      Math.abs(optCounts.quad - (draftCounts.quad || 0)) +
      Math.abs(optCounts.triple - (draftCounts.triple || 0)) +
      Math.abs(optCounts.double - (draftCounts.double || 0)) +
      Math.abs(optCounts.single - (draftCounts.single || 0))

    return { opt, delta, optCapacity, originalIndex }
  })

  candidatesWithDelta.sort((a, b) => {
    if (a.delta !== b.delta) {
      return a.delta - b.delta
    }
    return a.originalIndex - b.originalIndex
  })

  const bestMatch = candidatesWithDelta[0]
  if (!bestMatch) return null

  const best = bestMatch.opt
  const capacityAfter = bestMatch.optCapacity

  const reason: 'incomplete' | 'excess_capacity' | 'unsupported_combination' =
    capacityBefore < totalGuests
      ? 'incomplete'
      : capacityBefore > totalGuests
        ? 'excess_capacity'
        : 'unsupported_combination'

  const label =
    reason === 'excess_capacity'
      ? dict.get(locale, 'experience.roomArrangement.excessCapacityNotice', {
          capacity: String(capacityBefore),
          totalGuests: String(totalGuests),
        })
      : reason === 'incomplete'
        ? dict.get(locale, 'experience.roomArrangement.insufficientCapacityNotice', {
            capacity: String(capacityBefore),
            totalGuests: String(totalGuests),
          })
        : dict.get(locale, 'experience.roomArrangement.unsupportedComboNotice')

  return {
    option: best,
    reason,
    capacityBefore,
    capacityAfter,
    label,
  }
}

/**
 * Level 1: Intent-Aware Auto-Balancing / Surplus Cleanup
 *
 * When the user updates a counter for an occupancy:
 * 1. That occupancy is the protected user intent with count = nextCount.
 * 2. If the resulting capacity exceeds totalGuests:
 *    Search availableOptions for an approved option where:
 *      - optCounts[touchedOccupancy] === nextCount
 *      - All other untouched occupancies are <= updatedCounts (pure surplus reduction)
 *    If found:
 *      Auto-clean surplus from untouched occupancies to land on the approved option.
 * 3. If no approved option matches with only reductions, keep the user's direct change
 *    and let Level 2 (Domain Rebalancing Assistant) provide an explicit suggestion card.
 */
export function performIntentAwareAutoBalance(params: {
  draftCounts: Record<OccupancyType, number>
  touchedOccupancy: OccupancyType
  nextCount: number
  totalGuests: number
  availableOptions: RoomAllocationOption[]
}): Record<OccupancyType, number> {
  const { draftCounts, touchedOccupancy, nextCount, totalGuests, availableOptions } = params

  const updatedCounts: Record<OccupancyType, number> = {
    ...draftCounts,
    [touchedOccupancy]: Math.max(0, nextCount),
  }

  if (!availableOptions || availableOptions.length === 0) {
    return updatedCounts
  }

  const computeCapacity = (counts: Record<OccupancyType, number>) =>
    (counts.quad || 0) * 4 +
    (counts.triple || 0) * 3 +
    (counts.double || 0) * 2 +
    (counts.single || 0) * 1

  const currentCapacity = computeCapacity(updatedCounts)

  // If capacity <= totalGuests, no surplus to clean up; preserve user increments/decrements directly
  if (currentCapacity <= totalGuests) {
    return updatedCounts
  }

  // Capacity > totalGuests: Attempt Level 1 Intent-Aware Surplus Cleanup
  // Candidate options must:
  // 1. Strictly preserve touchedOccupancy at nextCount
  // 2. Only REDUCE (never add) rooms of other untouched occupancies
  const candidateCleanups: {
    optCounts: Record<OccupancyType, number>
    reductionAmount: number
    isRecommended?: boolean
  }[] = []

  const occupancies: OccupancyType[] = ['quad', 'triple', 'double', 'single']

  availableOptions.forEach((opt) => {
    const optCounts: Record<OccupancyType, number> = { quad: 0, triple: 0, double: 0, single: 0 }
    opt.rooms.forEach((r) => {
      optCounts[r.occupancy] = (optCounts[r.occupancy] || 0) + 1
    })

    // Rule 1: Protected User Intent
    if (optCounts[touchedOccupancy] !== nextCount) {
      return
    }

    // Rule 2: Pure reduction on untouched rooms (never invent or increase untouched rooms)
    const isPureReduction = occupancies.every((occ) => {
      if (occ === touchedOccupancy) return true
      return optCounts[occ] <= updatedCounts[occ]
    })

    if (!isPureReduction) {
      return
    }

    // Compute total surplus rooms removed
    const reductionAmount = occupancies.reduce((acc, occ) => {
      if (occ === touchedOccupancy) return acc
      return acc + (updatedCounts[occ] - optCounts[occ])
    }, 0)

    candidateCleanups.push({
      optCounts,
      reductionAmount,
      isRecommended: opt.isRecommended,
    })
  })

  // If candidate cleanups exist, pick the best one
  if (candidateCleanups.length > 0) {
    candidateCleanups.sort((a, b) => {
      // Prioritize recommended option if tie
      if (a.isRecommended && !b.isRecommended) return -1
      if (!a.isRecommended && b.isRecommended) return 1
      // Otherwise prefer minimal room disruptions
      return a.reductionAmount - b.reductionAmount
    })

    return candidateCleanups[0].optCounts
  }

  // Level 1 cannot safely clean up surplus without violating rules;
  // preserve user's direct counter change and let Level 2 Rebalancing handle guidance.
  return updatedCounts
}

export interface RoomArrangementModalProps {
  isOpen: boolean
  onClose: () => void
  totalGuests: number
  adultsCount: number
  childrenCount: number
  supportedOccupancies: OccupancyType[]
  availableOptions: RoomAllocationOption[]
  activeOptionId: string | null
  onApplyAllocation: (allocationId: string) => Promise<boolean>
  locale: string
}

export function RoomArrangementModal(props: RoomArrangementModalProps) {
  if (!props.isOpen) return null

  return (
    <RoomArrangementModalDialog
      key={`${props.activeOptionId || 'default'}-${props.totalGuests}`}
      {...props}
    />
  )
}

function RoomArrangementModalDialog({
  onClose,
  totalGuests,
  adultsCount,
  childrenCount,
  supportedOccupancies,
  availableOptions,
  activeOptionId,
  onApplyAllocation,
  locale,
}: RoomArrangementModalProps) {
  // Recommended Option helper (authoritative domain fallback)
  const recommendedOption = useMemo(() => {
    return RoomAllocationPolicy.getRecommendedAllocationOption(availableOptions) || null
  }, [availableOptions])

  // Active Applied Option helper
  const activeOption = useMemo(() => {
    return availableOptions.find((o) => o.id === activeOptionId) || recommendedOption
  }, [availableOptions, activeOptionId, recommendedOption])

  // 1. Invariant: Maintain draftAllocation strictly separated from appliedAllocation
  // Initialized synchronously on mount without needing an effect or causing cascading renders
  const [draftCounts, setDraftCounts] = useState<Record<OccupancyType, number>>(() => {
    const initialCounts: Record<OccupancyType, number> = {
      quad: 0,
      triple: 0,
      double: 0,
      single: 0,
    }
    if (activeOption) {
      activeOption.rooms.forEach((r) => {
        initialCounts[r.occupancy] = (initialCounts[r.occupancy] || 0) + 1
      })
    }
    return initialCounts
  })

  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [serverValidationState, setServerValidationState] = useState<ServerValidationState>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Monotonically increasing request ID protecting against stale async network responses
  const requestIdRef = useRef<number>(0)
  const modalRef = useRef<HTMLDivElement>(null)

  // Close on ESC key (only if not applying)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isApplying) {
        requestIdRef.current += 1
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isApplying, onClose])

  // Match draftCounts against authoritative availableOptions by structured room composition
  const candidateOption = useMemo(() => {
    if (!availableOptions || availableOptions.length === 0) return null
    return (
      availableOptions.find((opt) => {
        const optCounts: Record<OccupancyType, number> = {
          quad: 0,
          triple: 0,
          double: 0,
          single: 0,
        }
        opt.rooms.forEach((r) => {
          optCounts[r.occupancy] = (optCounts[r.occupancy] || 0) + 1
        })
        return (
          optCounts.quad === (draftCounts.quad || 0) &&
          optCounts.triple === (draftCounts.triple || 0) &&
          optCounts.double === (draftCounts.double || 0) &&
          optCounts.single === (draftCounts.single || 0)
        )
      }) || null
    )
  }, [draftCounts, availableOptions])

  // Authoritative domain validation from RoomAllocationPolicy
  const domainValidation = useMemo(() => {
    if (!candidateOption) return null
    return RoomAllocationPolicy.validateCustomAllocation({
      allocation: candidateOption.rooms,
      adultsCount,
      childrenCount,
      supportedOccupancies,
    })
  }, [candidateOption, adultsCount, childrenCount, supportedOccupancies])

  // Advisory nominal bed capacity for UI guidance
  const allocatedNominalCapacity =
    (draftCounts.quad || 0) * 4 +
    (draftCounts.triple || 0) * 3 +
    (draftCounts.double || 0) * 2 +
    (draftCounts.single || 0) * 1

  const draftRoomCount =
    (draftCounts.quad || 0) +
    (draftCounts.triple || 0) +
    (draftCounts.double || 0) +
    (draftCounts.single || 0)

  // 1. Definition: locally_matched is derived strictly from current draftCounts matching an approved availableOption
  const matchStatus: DraftMatchStatus = useMemo(() => {
    if (!availableOptions || availableOptions.length === 0) {
      return 'unavailable'
    }
    if (candidateOption !== null) {
      return 'locally_matched'
    }
    if (allocatedNominalCapacity < totalGuests) {
      return 'incomplete'
    }
    if (allocatedNominalCapacity > totalGuests) {
      return 'excess_capacity'
    }
    return 'unsupported_combination'
  }, [availableOptions, candidateOption, allocatedNominalCapacity, totalGuests])

  // Smart Rebalancing Assistant: strictly queries pre-approved availableOptions
  const rebalancingSuggestion = useMemo<RebalancingSuggestion | null>(() => {
    return resolveSmartRebalancingSuggestion({
      draftCounts,
      availableOptions,
      totalGuests,
      locale,
    })
  }, [availableOptions, draftCounts, totalGuests, locale])

  // 2. Immediate Validation Invalidation & Intent-Aware Auto-Balancing on Stepper Change
  const handleRoomCountChange = (occupancy: OccupancyType, count: number) => {
    requestIdRef.current += 1
    setServerValidationState('idle')
    setErrorMessage(null)
    setIsApplying(false)

    const nextCount = Math.max(0, count)

    // Level 1: Intent-Aware Auto-Balancing (Auto-cleans surplus if valid approved combination reached)
    const balancedCounts = performIntentAwareAutoBalance({
      draftCounts,
      touchedOccupancy: occupancy,
      nextCount,
      totalGuests,
      availableOptions,
    })

    setDraftCounts(balancedCounts)
  }

  // Rebalancing action: applies complete suggested arrangement on user explicit click
  const handleApplyRebalancing = (suggestion: RebalancingSuggestion) => {
    requestIdRef.current += 1
    setServerValidationState('idle')
    setErrorMessage(null)
    setIsApplying(false)

    const newCounts: Record<OccupancyType, number> = { quad: 0, triple: 0, double: 0, single: 0 }
    suggestion.option.rooms.forEach((r) => {
      newCounts[r.occupancy] = (newCounts[r.occupancy] || 0) + 1
    })
    setDraftCounts(newCounts)
  }

  // Cancel / Close Discards Draft Changes with Zero Side-Effects
  const handleClose = () => {
    if (isApplying) return
    requestIdRef.current += 1
    setErrorMessage(null)
    setServerValidationState('idle')
    onClose()
  }

  // 3. canApply Logic: Candidate matched and ready for server authorization
  const canApply =
    !isApplying &&
    candidateOption !== null &&
    matchStatus === 'locally_matched' &&
    Boolean(domainValidation?.valid) &&
    serverValidationState !== 'invalid'

  // Handle Apply Custom Arrangement (Awaits server resolution before closing)
  const handleApplyCustom = async () => {
    if (!canApply || !candidateOption) return

    const currentRequestId = ++requestIdRef.current
    setIsApplying(true)
    setServerValidationState('validating')
    setErrorMessage(null)

    try {
      const success = await onApplyAllocation(candidateOption.id)

      // 3. Stale Response Protection: Protect validation state, errors, commit, and modal closing
      if (currentRequestId !== requestIdRef.current) {
        return
      }

      if (success) {
        setServerValidationState('valid')
        setIsApplying(false)
        onClose()
      } else {
        setServerValidationState('invalid')
        setIsApplying(false)
        setErrorMessage(
          dict.get(locale, 'experience.pricingResolutionFailed') || 'Failed to update pricing.',
        )
      }
    } catch (err: unknown) {
      if (currentRequestId !== requestIdRef.current) return
      setServerValidationState('invalid')
      setIsApplying(false)
      const message = err instanceof Error ? err.message : 'Failed to update pricing.'
      setErrorMessage(message)
    }
  }

  const occupancyCapacityMap: Record<OccupancyType, number> = {
    quad: 4,
    triple: 3,
    double: 2,
    single: 1,
  }

  // Dynamic Status Banner Text Generator
  const renderStatusBannerText = () => {
    if (matchStatus === 'locally_matched') {
      return dict.get(locale, 'experience.roomArrangement.statusMatched')
    }
    if (matchStatus === 'incomplete') {
      const remaining = totalGuests - allocatedNominalCapacity
      return dict.get(locale, 'experience.roomArrangement.statusIncomplete', {
        allocated: String(allocatedNominalCapacity),
        total: String(totalGuests),
        remaining: String(remaining),
      })
    }
    if (matchStatus === 'excess_capacity') {
      return dict.get(locale, 'experience.roomArrangement.statusExcess', {
        allocated: String(allocatedNominalCapacity),
        total: String(totalGuests),
      })
    }
    return dict.get(locale, 'experience.roomArrangement.statusUnsupported')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      aria-modal="true"
      role="dialog"
      aria-labelledby="room-arrangement-title"
    >
      {/* Click outside to cancel */}
      <div className="fixed inset-0" onClick={handleClose} aria-hidden="true" />

      {/* Modal Dialog Card */}
      <div
        ref={modalRef}
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl bg-white dark:bg-[#171514] border border-gray-200 dark:border-secondary/25 shadow-2xl flex flex-col max-h-[90vh] text-foreground transition-colors duration-300"
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-secondary/15 flex items-center justify-between bg-gradient-to-r from-primary/5 via-transparent to-primary/5 dark:from-secondary/5 dark:to-transparent">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-primary dark:bg-secondary flex items-center justify-center shadow-xs">
              <BedIcon className="w-4 h-4 text-white" />
            </span>
            <div>
              <h3
                id="room-arrangement-title"
                className="font-hornbill text-base sm:text-lg font-bold text-foreground"
              >
                {dict.get(locale, 'experience.roomArrangement.title')}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {totalGuests}{' '}
                {totalGuests === 1
                  ? dict.get(locale, 'experience.travellerSingular')
                  : dict.get(locale, 'experience.travellerPlural')}
                {childrenCount > 0 &&
                  ` (${adultsCount} ${adultsCount === 1 ? dict.get(locale, 'experience.adultSingular') : dict.get(locale, 'experience.adultPlural')} + ${childrenCount} ${childrenCount === 1 ? dict.get(locale, 'experience.childSingular') : dict.get(locale, 'experience.childPlural')})`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isApplying}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-card text-muted-foreground hover:text-foreground transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Close"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body Scrollable */}
        <div className="p-5 sm:p-6 overflow-y-auto flex flex-col gap-5">
          {/* Server Error Notice if any */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/25 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertIcon className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Explicit Unavailable Notice if availableOptions is empty */}
          {matchStatus === 'unavailable' && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-400 text-xs flex items-center gap-2.5">
              <AlertIcon className="w-5 h-5 shrink-0" />
              <span>
                {dict.get(locale, 'experience.roomArrangement.noArrangementAvailable')}
              </span>
            </div>
          )}

          {/* 2. Build Your Arrangement Section */}
          {matchStatus !== 'unavailable' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-semibold text-foreground">
                  {dict.get(locale, 'experience.roomArrangement.buildArrangement')}
                </span>
                <span className="text-xs text-muted-foreground">
                  {dict.get(locale, 'experience.roomArrangement.adjustRoomCounts')}
                </span>
              </div>

              {/* Room Type Selector Stepper Rows */}
              <div className="flex flex-col gap-2 rounded-2xl p-3 bg-gray-50 dark:bg-card/40 border border-gray-200/80 dark:border-secondary/20">
                {supportedOccupancies.map((occ) => {
                  const currentCount = draftCounts[occ] || 0
                  const capacityPerRoom = occupancyCapacityMap[occ]
                  const occLabel = dict.get(locale, `experience.occupancy.${occ}Room`)

                  return (
                    <div
                      key={occ}
                      className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-[#171514] border border-gray-200/60 dark:border-secondary/15 transition-all shadow-xs"
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs sm:text-sm font-bold text-foreground truncate">
                          {occLabel}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {dict.get(locale, 'experience.roomArrangement.capacityUpTo', {
                            capacity: String(capacityPerRoom),
                          })}
                        </span>
                      </div>

                      {/* Tactile Smart Stepper Controls */}
                      <div className="flex items-center gap-1.5 sm:gap-2 bg-gray-50 dark:bg-card/60 p-1 rounded-xl border border-gray-200/80 dark:border-secondary/20 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleRoomCountChange(occ, Math.max(0, currentCount - 1))}
                          disabled={currentCount === 0 || isApplying}
                          aria-label={dict.get(locale, 'experience.roomArrangement.decreaseRoomCount', { roomType: occLabel })}
                          className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm bg-white dark:bg-[#171514] text-foreground border border-gray-200 dark:border-secondary/25 hover:bg-gray-100 dark:hover:bg-card active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                        >
                          −
                        </button>
                        <span
                          className="w-8 text-center font-hornbill text-base font-bold text-foreground px-1"
                          aria-live="polite"
                        >
                          {currentCount}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRoomCountChange(occ, currentCount + 1)}
                          disabled={isApplying}
                          aria-label={dict.get(locale, 'experience.roomArrangement.increaseRoomCount', { roomType: occLabel })}
                          className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm bg-white dark:bg-[#171514] text-foreground border border-gray-200 dark:border-secondary/25 hover:bg-gray-100 dark:hover:bg-card active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Status Banner */}
              <div
                className={`p-3.5 rounded-2xl border text-xs font-medium flex items-center justify-between gap-2 transition-all ${
                  matchStatus === 'locally_matched'
                    ? serverValidationState === 'valid'
                      ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-400'
                      : 'bg-primary/8 dark:bg-secondary/10 border-primary/25 dark:border-secondary/30 text-primary dark:text-secondary'
                    : matchStatus === 'incomplete'
                      ? 'bg-amber-500/10 border-amber-500/25 text-amber-700 dark:text-amber-400'
                      : matchStatus === 'excess_capacity'
                        ? 'bg-sky-500/10 border-sky-500/25 text-sky-700 dark:text-sky-400'
                        : 'bg-red-500/10 border-red-500/25 text-red-600 dark:text-red-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  {matchStatus === 'locally_matched' ? (
                    <span className="w-5 h-5 rounded-full bg-primary dark:bg-secondary text-white dark:text-background flex items-center justify-center text-xs font-bold shrink-0">
                      ✓
                    </span>
                  ) : (
                    <AlertIcon className="w-4 h-4 shrink-0" />
                  )}
                  <span>{renderStatusBannerText()}</span>
                </div>
                <span className="font-bold shrink-0">
                  {draftRoomCount}{' '}
                  {draftRoomCount === 1
                    ? dict.get(locale, 'experience.roomSingular')
                    : dict.get(locale, 'experience.roomPlural')}
                </span>
              </div>

              {/* Contextual Smart Rebalancing Assistant Card */}
              {rebalancingSuggestion && (
                <div className="p-4 rounded-2xl bg-amber-500/[0.07] dark:bg-amber-500/10 border border-amber-500/25 flex flex-col gap-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400 text-xs font-bold">
                      <SparklesIcon className="w-4 h-4 shrink-0" />
                      <span>
                        {dict.get(locale, 'experience.roomArrangement.rebalancingSuggestion')}
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-400">
                      {rebalancingSuggestion.option.roomCount}{' '}
                      {rebalancingSuggestion.option.roomCount === 1
                        ? dict.get(locale, 'experience.roomSingular')
                        : dict.get(locale, 'experience.roomPlural')}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex flex-col min-w-0">
                      <span className="text-[11px] text-muted-foreground leading-relaxed">
                        {rebalancingSuggestion.label}
                      </span>
                      <span className="font-hornbill text-sm sm:text-base font-bold text-foreground mt-1 truncate">
                        {formatOptionLabel(rebalancingSuggestion.option, locale)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleApplyRebalancing(rebalancingSuggestion)}
                      disabled={isApplying}
                      className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white text-xs font-bold transition-all shrink-0 cursor-pointer self-start sm:self-auto shadow-xs disabled:opacity-50"
                    >
                      {dict.get(locale, 'experience.roomArrangement.applyRebalancing')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. Optional Room Details Accordion */}
          {candidateOption && candidateOption.rooms.length > 0 && (
            <div className="border-t border-gray-100 dark:border-secondary/15 pt-3">
              <button
                type="button"
                onClick={() => setIsDetailsOpen((prev) => !prev)}
                className="w-full flex items-center justify-between text-xs font-bold text-primary dark:text-secondary hover:underline cursor-pointer py-1"
              >
                <span>
                  {isDetailsOpen
                    ? dict.get(locale, 'experience.roomArrangement.hideRoomDetails')
                    : dict.get(locale, 'experience.roomArrangement.viewRoomDetails')}
                </span>
                <ChevronDownIcon
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${isDetailsOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {isDetailsOpen && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 animate-in fade-in duration-150">
                  {candidateOption.rooms.map((rm) => {
                    const occLabel = dict.get(locale, `experience.occupancy.${rm.occupancy}Room`)
                    return (
                      <div
                        key={rm.roomIndex}
                        className="p-2.5 rounded-xl bg-gray-50 dark:bg-card/40 border border-gray-200/60 dark:border-secondary/15 text-xs flex flex-col gap-0.5"
                      >
                        <span className="font-bold text-[#1a1e4e] dark:text-secondary text-[11px]">
                          {dict.get(locale, 'experience.roomArrangement.roomNumber', { number: String(rm.roomIndex) })}
                        </span>
                        <span className="text-foreground font-medium text-[11px]">
                          {rm.adults}{' '}
                          {rm.adults === 1
                            ? dict.get(locale, 'experience.adultSingular')
                            : dict.get(locale, 'experience.adultPlural')}{' '}
                          · {occLabel}
                          {rm.children > 0 &&
                            ` + ${rm.children} ${rm.children === 1 ? dict.get(locale, 'experience.childSingular') : dict.get(locale, 'experience.childPlural')}`}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-gray-100 dark:border-secondary/15 bg-gray-50/80 dark:bg-card/40 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleClose}
            disabled={isApplying}
            className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-secondary/30 text-xs font-semibold text-foreground hover:bg-gray-100 dark:hover:bg-card transition-colors cursor-pointer disabled:opacity-50"
          >
            {dict.get(locale, 'experience.cancel')}
          </button>
          <button
            type="button"
            onClick={handleApplyCustom}
            disabled={!canApply}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 ${
              canApply
                ? 'bg-primary dark:bg-secondary text-white dark:text-background hover:opacity-90 active:scale-[0.98] cursor-pointer'
                : 'bg-gray-200 dark:bg-card/60 text-muted-foreground cursor-not-allowed border border-transparent'
            }`}
          >
            {isApplying && (
              <span className="w-3.5 h-3.5 rounded-full border-2 border-white dark:border-background border-t-transparent animate-spin" />
            )}
            <span>
              {isApplying
                ? dict.get(locale, 'experience.roomArrangement.verifyingPricing')
                : dict.get(locale, 'experience.roomArrangement.applyArrangement')}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
