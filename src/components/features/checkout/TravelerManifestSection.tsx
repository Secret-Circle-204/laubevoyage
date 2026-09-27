'use client'

import React, { useState, useMemo, useRef, useImperativeHandle, forwardRef } from 'react'
import { Card, Badge, Input, Button } from '@/components/ui'
import type {
  ManifestPresentationDiagnostics,
} from '@/application/booking/manifest-diagnostics'
import { ManifestDiagnosticsPresenter } from '@/application/booking/manifest-diagnostics'
import { JsonTranslationDictionary } from '@/domains/translation/dictionary'

const dict = new JsonTranslationDictionary()

export interface TravelerFormState {
  firstName: string
  lastName: string
  email?: string
  phone?: string
  dateOfBirth?: string
  passportNumber?: string
  nationality?: string
  type: 'adult' | 'child' | 'infant'
  declaredAge?: number
  beddingMode?: 'sharing_bed' | 'extra_bed'
}

export interface TravelerManifestSectionHandle {
  navigateToTraveler: (
    index: number,
    fieldToFocus?: 'firstName' | 'lastName' | 'email' | 'phone' | 'dateOfBirth' | 'nationality' | 'passportNumber',
    touchAll?: boolean,
  ) => void
}

export interface TravelerManifestSectionProps {
  travelers: TravelerFormState[]
  adultsCount: number
  childrenCount: number
  onUpdateField: (index: number, field: keyof TravelerFormState, value: string) => void
  onSaveAndNext: (currentIndex: number) => void
  locale: string
}

function CheckIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}

function AlertIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  )
}

function EditIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
  )
}

export const TravelerManifestSection = forwardRef<
  TravelerManifestSectionHandle,
  TravelerManifestSectionProps
>(function TravelerManifestSection(
  {
    travelers,
    adultsCount,
    childrenCount,
    onUpdateField,
    onSaveAndNext,
    locale = 'en',
  },
  ref,
) {
  const [activeTravelerIndex, setActiveTravelerIndex] = useState<number>(0)
  const [touchedMap, setTouchedMap] = useState<Record<number, boolean>>(() => ({ 0: true }))
  const [showIncompleteCallout, setShowIncompleteCallout] = useState<boolean>(false)

  const activeEditorRef = useRef<HTMLDivElement>(null)
  const firstNameInputRef = useRef<HTMLInputElement>(null)
  const lastNameInputRef = useRef<HTMLInputElement>(null)
  const emailInputRef = useRef<HTMLInputElement>(null)
  const phoneInputRef = useRef<HTMLInputElement>(null)
  const dobInputRef = useRef<HTMLInputElement>(null)
  const nationalityInputRef = useRef<HTMLInputElement>(null)
  const passportInputRef = useRef<HTMLInputElement>(null)

  const diagnostics: ManifestPresentationDiagnostics = useMemo(() => {
    return ManifestDiagnosticsPresenter.evaluate(
      travelers,
      adultsCount,
      childrenCount,
      touchedMap,
    )
  }, [travelers, adultsCount, childrenCount, touchedMap])

  const navigateToTraveler = (
    index: number,
    fieldToFocus?: 'firstName' | 'lastName' | 'email' | 'phone' | 'dateOfBirth' | 'nationality' | 'passportNumber',
    touchAll?: boolean,
  ) => {
    setActiveTravelerIndex(index)
    setShowIncompleteCallout(true)
    setTouchedMap((prev) => {
      if (touchAll) {
        const touched: Record<number, boolean> = { ...prev }
        travelers.forEach((_, idx) => {
          touched[idx] = true
        })
        return touched
      }
      return { ...prev, [index]: true }
    })

    setTimeout(() => {
      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      activeEditorRef.current?.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'center',
      })
      const target =
        fieldToFocus || diagnostics.travelers[index]?.primaryMissingField || 'firstName'
      if (target === 'firstName') firstNameInputRef.current?.focus()
      else if (target === 'lastName') lastNameInputRef.current?.focus()
      else if (target === 'email') emailInputRef.current?.focus()
      else if (target === 'phone') phoneInputRef.current?.focus()
      else if (target === 'dateOfBirth') dobInputRef.current?.focus()
      else if (target === 'nationality') nationalityInputRef.current?.focus()
      else if (target === 'passportNumber') passportInputRef.current?.focus()
    }, 100)
  }

  useImperativeHandle(ref, () => ({
    navigateToTraveler: (index, fieldToFocus, touchAll) => {
      navigateToTraveler(index, fieldToFocus, touchAll)
    },
  }))

  const handleFieldChange = (field: keyof TravelerFormState, value: string) => {
    if (activeTravelerIndex < 0) return
    onUpdateField(activeTravelerIndex, field, value)
    setTouchedMap((prev) => (prev[activeTravelerIndex] ? prev : { ...prev, [activeTravelerIndex]: true }))
  }

  const handleSaveAndAdvance = () => {
    if (activeTravelerIndex < 0) return
    const currentPres = diagnostics.travelers[activeTravelerIndex]
    if (currentPres && currentPres.hasIssues) {
      setTouchedMap((prev) => ({ ...prev, [activeTravelerIndex]: true }))
      setShowIncompleteCallout(true)
      const missingField = currentPres.primaryMissingField
      setTimeout(() => {
        if (missingField === 'firstName') firstNameInputRef.current?.focus()
        else if (missingField === 'lastName') lastNameInputRef.current?.focus()
        else if (missingField === 'email') emailInputRef.current?.focus()
        else if (missingField === 'phone') phoneInputRef.current?.focus()
        else if (missingField === 'dateOfBirth') dobInputRef.current?.focus()
        else if (missingField === 'nationality') nationalityInputRef.current?.focus()
        else if (missingField === 'passportNumber') passportInputRef.current?.focus()
      }, 50)
      return
    }

    const nextIndex = ManifestDiagnosticsPresenter.findNextIncompleteIndex(
      activeTravelerIndex,
      diagnostics,
    )
    if (nextIndex !== -1 && nextIndex !== activeTravelerIndex) {
      const targetTraveler = diagnostics.travelers[nextIndex]
      navigateToTraveler(nextIndex, targetTraveler?.primaryMissingField)
    } else {
      setShowIncompleteCallout(false)
      setActiveTravelerIndex(-1)
      onSaveAndNext(activeTravelerIndex)
    }
  }

  const hasMoreIncomplete = useMemo(() => {
    if (activeTravelerIndex < 0) return false
    const nextIdx = ManifestDiagnosticsPresenter.findNextIncompleteIndex(
      activeTravelerIndex,
      diagnostics,
    )
    return nextIdx !== -1 && nextIdx !== activeTravelerIndex
  }, [activeTravelerIndex, diagnostics])

  const buttonLabel = hasMoreIncomplete
    ? dict.get(locale, 'checkout.manifest.nextTraveler')
    : dict.get(locale, 'checkout.manifest.saveTravelers')

  const activeTraveler = activeTravelerIndex >= 0 ? travelers[activeTravelerIndex] : undefined
  const activePres = activeTravelerIndex >= 0 ? diagnostics.travelers[activeTravelerIndex] : undefined
  const isLeadActive = activeTravelerIndex === 0

  const activeFieldErrors = useMemo(() => {
    const map: Record<string, string> = {}
    if (activePres && activeTravelerIndex >= 0 && touchedMap[activeTravelerIndex]) {
      activePres.issues.forEach((iss) => {
        map[iss.field] = iss.message
      })
    }
    return map
  }, [activePres, touchedMap, activeTravelerIndex])

  return (
    <div className="flex flex-col gap-6 animate-editorial-reveal">
      {/* 01 TRAVELERS Master Section Card */}
      <Card
        variant="flat"
        padding="lg"
        className="border border-border/80 bg-card shadow-xs rounded-2xl"
      >
        {/* Section Header with Step Badge & Progress Indicator */}
        <div className="pb-5 border-b border-border/60">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3.5">
              <span className="w-9 h-9 rounded-full bg-secondary text-background text-sm font-hornbill font-bold flex items-center justify-center shrink-0 shadow-xs">
                01
              </span>
              <div>
                <span className="text-[10px] text-secondary uppercase font-semibold block">
                  MANIFEST & ROSTER
                </span>
                <h2 className="text-xl sm:text-2xl font-hornbill font-light text-foreground tracking-tight">
                  Travelers & Passenger Manifest
                </h2>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-foreground block">
                {diagnostics.completedCount} of {diagnostics.totalProvided} Ready
              </span>
              <span className="text-[11px] font-hornbill text-secondary font-bold">
                {diagnostics.progressPercent}% Complete
              </span>
            </div>
          </div>

          {/* Derived Progress Guideline */}
          <div className="w-full h-1.5 bg-card-elevated rounded-full mt-4 overflow-hidden border border-border/40">
            <div
              className="h-full bg-secondary transition-all duration-300 ease-out rounded-full"
              style={{ width: `${diagnostics.progressPercent}%` }}
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between text-xs gap-2">
            <div className="flex items-center gap-3">
              <span className="text-secondary font-semibold flex items-center gap-1.5">
                <CheckIcon className="w-3.5 h-3.5 text-secondary" />
                <span>{diagnostics.completedCount} Ready</span>
              </span>
              {diagnostics.needsAttentionCount > 0 && (
                <span className="text-accent font-semibold flex items-center gap-1.5">
                  <AlertIcon className="w-3.5 h-3.5 text-accent" />
                  <span>{diagnostics.needsAttentionCount} Information Required</span>
                </span>
              )}
            </div>

            {diagnostics.firstIncompleteIndex !== -1 && (
              <button
                type="button"
                onClick={() =>
                  navigateToTraveler(
                    diagnostics.firstIncompleteIndex,
                    diagnostics.travelers[diagnostics.firstIncompleteIndex]?.primaryMissingField,
                  )
                }
                className="font-semibold text-secondary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>{dict.get(locale, 'checkout.manifest.jumpToNextIncomplete')}</span>
              </button>
            )}
          </div>
        </div>

        {/* 1. LEAD TRAVELER & PRIMARY CONTACT HIGHLIGHT */}
        <div className="mt-6 pt-1">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-muted-foreground uppercase block">
              Lead Traveler & Primary Contact
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-semibold uppercase bg-secondary/10 border border-secondary/25 text-secondary">
              <CheckIcon className="w-3 h-3" />
              <span>Primary Dispatch</span>
            </span>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-card-elevated/70 border border-border/70 text-xs">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex flex-col gap-1.5 min-w-0">
                <span className="font-hornbill text-base text-foreground font-semibold">
                  {travelers[0]?.firstName && travelers[0]?.lastName
                    ? `${travelers[0].firstName} ${travelers[0].lastName}`
                    : 'Lead Traveler (Primary Passenger)'}
                </span>
                <span className="text-muted-foreground text-xs truncate font-medium">
                  {travelers[0]?.email || 'No email provided'} • {travelers[0]?.phone || 'No phone provided'}
                </span>
                <span className="text-[11px] text-muted-foreground mt-0.5">
                  {travelers[0]?.phone
                    ? 'Official booking confirmation & departure logistics dispatched to this contact.'
                    : 'Contact phone is required for departure day logistics. Update in Lead Traveler profile.'}
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigateToTraveler(0, travelers[0]?.phone ? 'email' : 'phone')}
                className="text-xs font-semibold shrink-0 cursor-pointer"
              >
                <span>Edit Profile</span>
                <span>→</span>
              </Button>
            </div>
          </div>
        </div>

        {/* 2. TRAVEL COMPANIONS MATRIX */}
        <div className="mt-6 pt-4 border-t border-border/60 flex flex-col gap-4">
          {/* Adults Matrix */}
          <div>
            <span className="text-[11px] font-bold text-muted-foreground uppercase block mb-2.5">
              Adult Passengers ({adultsCount})
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {diagnostics.travelers.slice(0, adultsCount).map((pres) => {
                const t = travelers[pres.index]
                const isActive = activeTravelerIndex === pres.index
                return (
                  <button
                    key={pres.index}
                    type="button"
                    onClick={() => navigateToTraveler(pres.index, pres.primaryMissingField)}
                    className={`p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'border-secondary ring-1 ring-secondary/40 bg-card-elevated shadow-sm'
                        : pres.status === 'complete'
                          ? 'border-border/80 bg-card-elevated/40 hover:border-secondary/40'
                          : 'border-accent/40 bg-accent/5 hover:border-accent/60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-6 h-6 rounded-full text-xs font-hornbill font-bold flex items-center justify-center shrink-0 ${
                          pres.status === 'complete'
                            ? 'bg-secondary text-background'
                            : pres.status === 'needs_attention'
                              ? 'bg-accent text-background'
                              : 'bg-card border border-border text-foreground'
                        }`}
                      >
                        {pres.status === 'complete' ? (
                          <CheckIcon className="w-3 h-3 text-background" />
                        ) : (
                          String(pres.travelerNumber).padStart(2, '0')
                        )}
                      </span>
                      <div className="truncate">
                        <span className="font-semibold text-xs text-foreground block truncate">
                          {t?.firstName && t?.lastName
                            ? `${t.firstName} ${t.lastName}`
                            : pres.index === 0
                              ? 'Lead Traveler'
                              : `Traveler ${pres.travelerNumber}`}
                        </span>
                        <span
                          className={`text-[11px] block truncate ${
                            pres.status === 'needs_attention'
                              ? 'text-accent font-medium'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {pres.status === 'needs_attention'
                            ? pres.missingFieldsSummary
                            : pres.index === 0
                              ? 'Lead Passenger • Adult'
                              : 'Adult Companion'}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-semibold shrink-0 ml-2 ${
                        isActive
                          ? 'text-secondary font-bold'
                          : pres.status === 'needs_attention'
                            ? 'text-accent'
                            : 'text-muted-foreground'
                      }`}
                    >
                      {isActive
                        ? 'Editing'
                        : pres.status === 'complete'
                          ? 'Ready'
                          : 'Complete →'}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Children & Infants Matrix */}
          {childrenCount > 0 && (
            <div className="mt-2">
              <span className="text-[11px] font-bold text-muted-foreground uppercase block mb-2.5">
                Children & Infants ({childrenCount})
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {diagnostics.travelers.slice(adultsCount).map((pres) => {
                  const t = travelers[pres.index]
                  const isActive = activeTravelerIndex === pres.index
                  const childNumber = pres.index - adultsCount + 1
                  return (
                    <button
                      key={pres.index}
                      type="button"
                      onClick={() => navigateToTraveler(pres.index, pres.primaryMissingField)}
                      className={`p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all duration-200 cursor-pointer ${
                        isActive
                          ? 'border-secondary ring-1 ring-secondary/40 bg-card-elevated shadow-sm'
                          : pres.status === 'complete'
                            ? 'border-border/80 bg-card-elevated/40 hover:border-secondary/40'
                            : 'border-accent/40 bg-accent/5 hover:border-accent/60'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`w-6 h-6 rounded-full text-xs font-hornbill font-bold flex items-center justify-center shrink-0 ${
                            pres.status === 'complete'
                              ? 'bg-secondary text-background'
                              : pres.status === 'needs_attention'
                                ? 'bg-accent text-background'
                                : 'bg-card border border-border text-foreground'
                          }`}
                        >
                          {pres.status === 'complete' ? (
                            <CheckIcon className="w-3 h-3 text-background" />
                          ) : (
                            String(pres.travelerNumber).padStart(2, '0')
                          )}
                        </span>
                        <div className="truncate">
                          <span className="font-semibold text-xs text-foreground block truncate">
                            {t?.firstName && t?.lastName
                              ? `${t.firstName} ${t.lastName}`
                              : `Child ${childNumber}`}
                          </span>
                          <span
                            className={`text-[11px] block truncate ${
                              pres.status === 'needs_attention'
                                ? 'text-accent font-medium'
                                : 'text-secondary font-medium'
                            }`}
                          >
                            {pres.status === 'needs_attention'
                              ? pres.missingFieldsSummary
                              : t?.type === 'infant'
                                ? `Infant (Age ${t.declaredAge ?? 1} • Free)`
                                : `Child (Age ${t?.declaredAge ?? 6} • ${t?.beddingMode === 'extra_bed' ? 'Extra Bed' : 'Sharing Bed'})`}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`text-xs font-semibold shrink-0 ml-2 ${
                          isActive
                            ? 'text-secondary font-bold'
                            : pres.status === 'needs_attention'
                              ? 'text-accent'
                              : 'text-muted-foreground'
                        }`}
                      >
                        {isActive
                          ? 'Editing'
                          : pres.status === 'complete'
                            ? 'Ready'
                            : 'Complete →'}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Active Traveler Editor Panel */}
          {activeTraveler && activePres && (
            <div
              ref={activeEditorRef}
              className="mt-4 p-5 sm:p-7 rounded-2xl bg-card-elevated border border-border/80 shadow-md flex flex-col gap-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-border/60 flex-wrap gap-2">
                <div>
                  <h3 className="font-hornbill font-light text-base sm:text-lg text-foreground flex items-center gap-2">
                    <EditIcon className="w-4 h-4 text-secondary shrink-0" />
                    <span>
                      {isLeadActive
                        ? 'Passenger 01 (Lead Traveler)'
                        : activeTraveler.type === 'adult'
                          ? `Passenger ${String(activeTravelerIndex + 1).padStart(2, '0')} (Adult Companion)`
                          : `Passenger ${String(activeTravelerIndex + 1).padStart(2, '0')} (${activeTraveler.type === 'infant' ? 'Infant' : 'Child'})`}
                    </span>
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {activeTraveler.type === 'child' || activeTraveler.type === 'infant'
                      ? `Declared Age: ${activeTraveler.declaredAge} years • ${activeTraveler.beddingMode === 'extra_bed' ? 'Extra Bed' : 'Sharing Parent Bed'}`
                      : 'Standard adult package traveler'}
                  </span>
                </div>
                <Badge
                  variant={activePres.status === 'complete' ? 'outline' : 'accent'}
                  size="sm"
                  className="font-semibold text-xs"
                >
                  {activePres.status === 'complete'
                    ? 'Ready for Manifest'
                    : 'Information Required'}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  ref={firstNameInputRef}
                  label="First / Given Name *"
                  value={activeTraveler.firstName}
                  error={activeFieldErrors.firstName}
                  helperText={
                    !activeFieldErrors.firstName
                      ? "Legal first name matching travel identification"
                      : undefined
                  }
                  onChange={(e) => handleFieldChange('firstName', e.target.value)}
                  placeholder="e.g. Alexander"
                />
                <Input
                  ref={lastNameInputRef}
                  label="Last / Family Name *"
                  value={activeTraveler.lastName}
                  error={activeFieldErrors.lastName}
                  helperText={
                    !activeFieldErrors.lastName
                      ? "Legal last name matching travel identification"
                      : undefined
                  }
                  onChange={(e) => handleFieldChange('lastName', e.target.value)}
                  placeholder="e.g. Vance"
                />

                {isLeadActive ? (
                  <>
                    <Input
                      ref={emailInputRef}
                      label="Trip Contact Email *"
                      type="email"
                      value={activeTraveler.email || ''}
                      error={activeFieldErrors.email}
                      helperText={
                        !activeFieldErrors.email
                          ? 'Booking confirmation & itinerary vouchers will be dispatched here'
                          : undefined
                      }
                      onChange={(e) => handleFieldChange('email', e.target.value)}
                      placeholder="e.g. name@example.com"
                    />
                    <Input
                      ref={phoneInputRef}
                      label="Trip Contact Phone *"
                      type="tel"
                      value={activeTraveler.phone || ''}
                      error={activeFieldErrors.phone}
                      helperText={
                        !activeFieldErrors.phone
                          ? 'Required for departure day logistics and urgent notifications'
                          : undefined
                      }
                      onChange={(e) => handleFieldChange('phone', e.target.value)}
                      placeholder="e.g. +20 100 123 4567"
                    />
                  </>
                ) : (
                  <>
                    <Input
                      ref={emailInputRef}
                      label="Email Address"
                      type="email"
                      value={activeTraveler.email || ''}
                      error={activeFieldErrors.email}
                      helperText={
                        !activeFieldErrors.email
                          ? 'Optional - for personalized tickets and itinerary notifications'
                          : undefined
                      }
                      onChange={(e) => handleFieldChange('email', e.target.value)}
                      placeholder="e.g. companion@example.com"
                    />
                    <Input
                      ref={phoneInputRef}
                      label="Phone Number"
                      type="tel"
                      value={activeTraveler.phone || ''}
                      error={activeFieldErrors.phone}
                      helperText={
                        !activeFieldErrors.phone
                          ? 'Optional - for journey day updates and logistical notifications'
                          : undefined
                      }
                      onChange={(e) => handleFieldChange('phone', e.target.value)}
                      placeholder="e.g. +20 100 987 6543"
                    />
                  </>
                )}

                <div>
                  <Input
                    ref={dobInputRef}
                    label="Date of Birth *"
                    type="date"
                    value={activeTraveler.dateOfBirth || ''}
                    error={activeFieldErrors.dateOfBirth}
                    helperText={
                      !activeFieldErrors.dateOfBirth
                        ? (activeTraveler.type === 'child' || activeTraveler.type === 'infant'
                            ? 'Required to verify child accommodation policy compliance'
                            : 'Legal date of birth matching travel identification')
                        : undefined
                    }
                    onChange={(e) => handleFieldChange('dateOfBirth', e.target.value)}
                  />
                </div>

                <Input
                  ref={nationalityInputRef}
                  label="Nationality *"
                  value={activeTraveler.nationality || ''}
                  error={activeFieldErrors.nationality}
                  helperText={
                    !activeFieldErrors.nationality
                      ? 'Country of citizenship matching passport'
                      : undefined
                  }
                  onChange={(e) => handleFieldChange('nationality', e.target.value)}
                  placeholder="e.g. Egyptian / British"
                />

                <div className="sm:col-span-2">
                  <Input
                    ref={passportInputRef}
                    label="Passport / National ID *"
                    value={activeTraveler.passportNumber || ''}
                    error={activeFieldErrors.passportNumber}
                    helperText={
                      !activeFieldErrors.passportNumber
                        ? 'Official passport number or National ID required for passenger manifest'
                        : undefined
                    }
                    onChange={(e) => handleFieldChange('passportNumber', e.target.value)}
                    placeholder="Enter passport number or National ID"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border/60">
                <span className="text-[11px] text-muted-foreground">
                  * {dict.get(locale, 'checkout.manifest.requiredVerification')}
                </span>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleSaveAndAdvance}
                  className="font-semibold text-xs py-2.5 px-5 shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  {buttonLabel}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
})

TravelerManifestSection.displayName = 'TravelerManifestSection'

