import { BookingPolicy } from '@/domains/booking/policy'
import type {
  TravelerInput,
  TravelerManifestFieldIssue,
  ManifestDiagnostics,
} from '@/domains/booking/types'

export type TravelerVisualStatus = 'complete' | 'needs_attention' | 'not_started'

export interface TravelerPresentationState {
  index: number
  travelerNumber: number
  travelerType: 'adult' | 'child' | 'infant'
  status: TravelerVisualStatus
  isComplete: boolean
  hasIssues: boolean
  issues: TravelerManifestFieldIssue[]
  missingFieldsSummary: string
  primaryMissingField?: 'firstName' | 'lastName' | 'email' | 'phone' | 'dateOfBirth' | 'nationality' | 'passportNumber'
}

export interface ManifestPresentationDiagnostics {
  valid: boolean
  totalExpected: number
  totalProvided: number
  completedCount: number
  needsAttentionCount: number
  notStartedCount: number
  progressPercent: number
  firstIncompleteIndex: number
  travelers: TravelerPresentationState[]
  issues: TravelerManifestFieldIssue[]
  incompleteTravelers: TravelerPresentationState[]
  bannerTitle: string
  bannerSubtitle: string
  primaryActionLabel: string
}

/**
 * Human-readable field label dictionary for missing information summaries.
 */
const FIELD_LABELS: Record<string, string> = {
  firstName: 'First name',
  lastName: 'Last name',
  email: 'Contact email',
  phone: 'Contact phone',
  dateOfBirth: 'Date of birth',
  nationality: 'Nationality',
  passportNumber: 'Passport / National ID',
}

/**
 * Application Service: Evaluates passenger manifest diagnostics and shapes
 * actionable presentation models for the Checkout UI.
 *
 * Invariant:
 * Pure coordinator: Calls domain BookingPolicy.diagnoseTravelersManifest() and
 * produces presentation states with zero duplicated business validation rules.
 */
export class ManifestDiagnosticsPresenter {
  static evaluate(
    travelers: TravelerInput[],
    expectedAdults: number,
    expectedChildren: number = 0,
    touchedMap: Record<number, boolean> = {},
  ): ManifestPresentationDiagnostics {
    // 1. Authoritative Domain Diagnostic Resolution
    const domainDiagnostics: ManifestDiagnostics = BookingPolicy.diagnoseTravelersManifest(
      travelers,
      expectedAdults,
      expectedChildren,
    )

    const totalExpected = domainDiagnostics.totalExpected
    const totalProvided = domainDiagnostics.totalProvided

    let completedCount = 0
    let needsAttentionCount = 0
    let notStartedCount = 0

    const presentationTravelers: TravelerPresentationState[] = []
    const incompleteTravelers: TravelerPresentationState[] = []

    for (let i = 0; i < totalProvided; i++) {
      const t = travelers[i]
      const issues = domainDiagnostics.travelerIssuesMap[i] || []
      const hasIssues = issues.length > 0
      const isComplete = !hasIssues
      const isTouched = Boolean(touchedMap[i])
      const travelerType = t.type || (i < expectedAdults ? 'adult' : 'child')

      let status: TravelerVisualStatus
      if (isComplete) {
        status = 'complete'
        completedCount++
      } else if (isTouched) {
        status = 'needs_attention'
        needsAttentionCount++
      } else {
        status = 'not_started'
        notStartedCount++
      }

      const missingFieldsLabels = issues.map((iss) => FIELD_LABELS[iss.field] || iss.field)
      const missingFieldsSummary =
        missingFieldsLabels.length > 0
          ? `Missing: ${missingFieldsLabels.join(', ')}`
          : ''

      const presState: TravelerPresentationState = {
        index: i,
        travelerNumber: i + 1,
        travelerType,
        status,
        isComplete,
        hasIssues,
        issues,
        missingFieldsSummary,
        primaryMissingField: issues[0]?.field,
      }

      presentationTravelers.push(presState)

      if (!isComplete) {
        incompleteTravelers.push(presState)
      }
    }

    const firstIncompleteIndex =
      incompleteTravelers.length > 0 ? incompleteTravelers[0].index : -1
    const progressPercent =
      totalExpected > 0 ? Math.round((completedCount / totalExpected) * 100) : 0

    const incompleteCount = incompleteTravelers.length
    const bannerTitle = 'Almost there'
    let bannerSubtitle = ''
    let primaryActionLabel = 'Review missing information →'

    if (incompleteCount === 1) {
      bannerSubtitle = '1 traveler still needs information.'
      const singleMissingField = incompleteTravelers[0].primaryMissingField
      if (singleMissingField === 'phone') {
        primaryActionLabel =
          incompleteTravelers[0].issues[0]?.code === 'INVALID_LEAD_PHONE'
            ? 'Fix phone number →'
            : 'Add phone number →'
      } else if (singleMissingField === 'email') {
        primaryActionLabel =
          incompleteTravelers[0].issues[0]?.code === 'INVALID_LEAD_EMAIL'
            ? 'Fix contact email →'
            : 'Add contact email →'
      } else if (singleMissingField === 'firstName') {
        primaryActionLabel = 'Add first name →'
      } else if (singleMissingField === 'lastName') {
        primaryActionLabel = 'Add last name →'
      } else if (singleMissingField === 'dateOfBirth') {
        primaryActionLabel = 'Add date of birth →'
      } else {
        primaryActionLabel = 'Review missing information →'
      }
    } else if (incompleteCount > 1) {
      bannerSubtitle = `${incompleteCount} travelers still need information.`
      primaryActionLabel = 'Review missing information →'
    }

    return {
      valid: domainDiagnostics.valid,
      totalExpected,
      totalProvided,
      completedCount,
      needsAttentionCount,
      notStartedCount,
      progressPercent,
      firstIncompleteIndex,
      travelers: presentationTravelers,
      issues: domainDiagnostics.issues,
      incompleteTravelers,
      bannerTitle,
      bannerSubtitle,
      primaryActionLabel,
    }
  }

  /**
   * Finds the next incomplete traveler index starting after currentIndex.
   * If there are no incomplete travelers after currentIndex, wraps around to the beginning.
   * If all travelers are complete, returns -1.
   *
   * Invariant:
   * "Next incomplete traveler" means the next passenger needing attention or not started,
   * strictly skipping any already completed travelers.
   */
  static findNextIncompleteIndex(
    currentIndex: number,
    diagnostics: ManifestPresentationDiagnostics,
  ): number {
    if (diagnostics.incompleteTravelers.length === 0) {
      return -1
    }

    const nextAfterCurrent = diagnostics.incompleteTravelers.find((t) => t.index > currentIndex)
    if (nextAfterCurrent) {
      return nextAfterCurrent.index
    }

    // If currentIndex is itself still incomplete, check if it's the only one
    if (diagnostics.incompleteTravelers[0].index !== currentIndex) {
      return diagnostics.incompleteTravelers[0].index
    }

    return diagnostics.incompleteTravelers.length > 1
      ? diagnostics.incompleteTravelers[1].index
      : currentIndex
  }
}
