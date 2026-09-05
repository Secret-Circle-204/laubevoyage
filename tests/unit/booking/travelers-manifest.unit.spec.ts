import { describe, it, expect } from 'vitest'
import { BookingPolicy } from '@/domains/booking/policy'
import type { TravelerInput } from '@/domains/booking/types'
import { ManifestDiagnosticsPresenter } from '@/application/booking/manifest-diagnostics'

describe('GATE 5.2.2: BookingPolicy Travelers Manifest Diagnostics & Invariants', () => {
  it('enforces total manifest count matches expected adults + children', () => {
    const travelers: TravelerInput[] = [
      {
        firstName: 'Ahmed',
        lastName: 'Mohamed',
        email: 'ahmed@example.com',
        phone: '+201001234567',
        type: 'adult',
      },
      { firstName: 'Sara', lastName: 'Mohamed', type: 'adult' },
    ]

    // Expected 3 travelers (2 adults + 1 child), but provided 2
    const result = BookingPolicy.validateTravelersManifest(travelers, 2, 1)
    expect(result.allowed).toBe(false)
    expect(result.code).toBe('INVALID_TRAVELER_COUNT')
    expect(result.reason).toContain('does not match expected booking composition')
  })

  it('rejects empty traveler manifest', () => {
    const result = BookingPolicy.validateTravelersManifest([], 0, 0)
    expect(result.allowed).toBe(false)
    expect(result.code).toBe('EMPTY_TRAVELER_MANIFEST')
  })

  it('enforces Lead Traveler (travelers[0]) must have valid contact email and phone', () => {
    // Missing email
    const travelersNoEmail: TravelerInput[] = [
      {
        firstName: 'Ahmed',
        lastName: 'Mohamed',
        email: '',
        phone: '+201001234567',
        type: 'adult',
      },
    ]
    const res1 = BookingPolicy.validateTravelersManifest(travelersNoEmail, 1, 0)
    expect(res1.allowed).toBe(false)
    expect(res1.code).toBe('MISSING_LEAD_EMAIL')

    // Invalid email format
    const travelersBadEmail: TravelerInput[] = [
      {
        firstName: 'Ahmed',
        lastName: 'Mohamed',
        email: 'not-an-email',
        phone: '+201001234567',
        type: 'adult',
      },
    ]
    const res2 = BookingPolicy.validateTravelersManifest(travelersBadEmail, 1, 0)
    expect(res2.allowed).toBe(false)
    expect(res2.code).toBe('INVALID_LEAD_EMAIL')

    // Missing phone
    const travelersNoPhone: TravelerInput[] = [
      {
        firstName: 'Ahmed',
        lastName: 'Mohamed',
        email: 'ahmed@example.com',
        phone: '   ',
        type: 'adult',
      },
    ]
    const res3 = BookingPolicy.validateTravelersManifest(travelersNoPhone, 1, 0)
    expect(res3.allowed).toBe(false)
    expect(res3.code).toBe('MISSING_LEAD_PHONE')
  })

  it('permits companion adult travelers without email and phone', () => {
    const travelers: TravelerInput[] = [
      {
        firstName: 'Ahmed',
        lastName: 'Mohamed',
        email: 'ahmed@example.com',
        phone: '+201001234567',
        type: 'adult',
      },
      { firstName: 'Sara', lastName: 'Mohamed', type: 'adult' },
      { firstName: 'Omar', lastName: 'Mohamed', type: 'adult' },
    ]

    const result = BookingPolicy.validateTravelersManifest(travelers, 3, 0)
    expect(result.allowed).toBe(true)
  })

  it('enforces Date of Birth for child and infant passengers', () => {
    const travelersMissingChildDOB: TravelerInput[] = [
      {
        firstName: 'Ahmed',
        lastName: 'Mohamed',
        email: 'ahmed@example.com',
        phone: '+201001234567',
        type: 'adult',
      },
      { firstName: 'Mona', lastName: 'Mohamed', type: 'child' },
    ]

    const res1 = BookingPolicy.validateTravelersManifest(travelersMissingChildDOB, 1, 1)
    expect(res1.allowed).toBe(false)
    expect(res1.code).toBe('MISSING_CHILD_DOB')
    expect(res1.reason).toContain('Date of birth is required')

    // With valid DOB
    const travelersWithDOB: TravelerInput[] = [
      {
        firstName: 'Ahmed',
        lastName: 'Mohamed',
        email: 'ahmed@example.com',
        phone: '+201001234567',
        type: 'adult',
      },
      { firstName: 'Mona', lastName: 'Mohamed', dateOfBirth: '2019-06-15', type: 'child' },
    ]

    const res2 = BookingPolicy.validateTravelersManifest(travelersWithDOB, 1, 1)
    expect(res2.allowed).toBe(true)
  })

  describe('🔴 Non-Negotiable Scenario: 18 Adults + 4 Children (22 Travelers) with 4 Target Missing Fields', () => {
    const createBase22Travelers = (): TravelerInput[] => {
      const list: TravelerInput[] = []

      // Traveler 1: Lead Traveler
      list.push({
        firstName: 'Ahmed',
        lastName: 'Mohamed',
        email: 'ahmed@example.com',
        phone: '+201001234567',
        type: 'adult',
      })

      // Travelers 2..18: Companion Adults
      for (let i = 2; i <= 18; i++) {
        list.push({
          firstName: `AdultFirst${i}`,
          lastName: `AdultLast${i}`,
          type: 'adult',
        })
      }

      // Travelers 19..22: Children (19=Child 1, 20=Child 2, 21=Child 3, 22=Child 4)
      for (let i = 1; i <= 4; i++) {
        list.push({
          firstName: `ChildFirst${i}`,
          lastName: `ChildLast${i}`,
          dateOfBirth: '2018-04-10',
          type: 'child',
        })
      }

      return list
    }

    it('identifies exact 4 target missing fields with structured diagnostics', () => {
      const travelers = createBase22Travelers()

      // Target Omission 1: Traveler 4 (Index 3, Adult) -> First Name missing
      travelers[3].firstName = ''

      // Target Omission 2: Traveler 11 (Index 10, Adult) -> Last Name missing
      travelers[10].lastName = ''

      // Target Omission 3: Traveler 19 (Index 18, Child 1) -> Last Name missing
      travelers[18].lastName = ''

      // Target Omission 4: Traveler 20 (Index 19, Child 2) -> Date of Birth missing
      travelers[19].dateOfBirth = ''

      const diag = BookingPolicy.diagnoseTravelersManifest(travelers, 18, 4)

      expect(diag.valid).toBe(false)
      expect(diag.totalExpected).toBe(22)
      expect(diag.totalProvided).toBe(22)
      expect(diag.issues).toHaveLength(4)

      // Verify Traveler 4
      const issue4 = diag.issues.find((iss) => iss.travelerIndex === 3)
      expect(issue4).toBeDefined()
      expect(issue4?.travelerNumber).toBe(4)
      expect(issue4?.field).toBe('firstName')
      expect(issue4?.code).toBe('MISSING_COMPANION_FIRST_NAME')

      // Verify Traveler 11
      const issue11 = diag.issues.find((iss) => iss.travelerIndex === 10)
      expect(issue11).toBeDefined()
      expect(issue11?.travelerNumber).toBe(11)
      expect(issue11?.field).toBe('lastName')
      expect(issue11?.code).toBe('MISSING_COMPANION_LAST_NAME')

      // Verify Traveler 19 (Child 1)
      const issue19 = diag.issues.find((iss) => iss.travelerIndex === 18)
      expect(issue19).toBeDefined()
      expect(issue19?.travelerNumber).toBe(19)
      expect(issue19?.field).toBe('lastName')
      expect(issue19?.code).toBe('MISSING_COMPANION_LAST_NAME')

      // Verify Traveler 20 (Child 2)
      const issue20 = diag.issues.find((iss) => iss.travelerIndex === 19)
      expect(issue20).toBeDefined()
      expect(issue20?.travelerNumber).toBe(20)
      expect(issue20?.field).toBe('dateOfBirth')
      expect(issue20?.code).toBe('MISSING_CHILD_DOB')
    })

    it('resolves sequentially step-by-step from 4 issues to 0 issues (valid)', () => {
      const travelers = createBase22Travelers()
      travelers[3].firstName = ''
      travelers[10].lastName = ''
      travelers[18].lastName = ''
      travelers[19].dateOfBirth = ''

      // Initial state: 4 issues
      let diag = BookingPolicy.diagnoseTravelersManifest(travelers, 18, 4)
      expect(diag.issues).toHaveLength(4)

      // Step 1: Fix Traveler 4
      travelers[3].firstName = 'David'
      diag = BookingPolicy.diagnoseTravelersManifest(travelers, 18, 4)
      expect(diag.issues).toHaveLength(3)
      expect(diag.travelerIssuesMap[3]).toBeUndefined()

      // Step 2: Fix Traveler 11
      travelers[10].lastName = 'Smith'
      diag = BookingPolicy.diagnoseTravelersManifest(travelers, 18, 4)
      expect(diag.issues).toHaveLength(2)
      expect(diag.travelerIssuesMap[10]).toBeUndefined()

      // Step 3: Fix Traveler 19 (Child 1)
      travelers[18].lastName = 'Smith'
      diag = BookingPolicy.diagnoseTravelersManifest(travelers, 18, 4)
      expect(diag.issues).toHaveLength(1)
      expect(diag.travelerIssuesMap[18]).toBeUndefined()

      // Step 4: Fix Traveler 20 (Child 2)
      travelers[19].dateOfBirth = '2016-08-22'
      diag = BookingPolicy.diagnoseTravelersManifest(travelers, 18, 4)
      expect(diag.issues).toHaveLength(0)
      expect(diag.valid).toBe(true)

      const policyRes = BookingPolicy.validateTravelersManifest(travelers, 18, 4)
      expect(policyRes.allowed).toBe(true)
    })
  })

  describe('🔴 Immediate Submission Scenario: 18 Adults + 4 Children (All Incomplete)', () => {
    it('identifies 22 incomplete profiles without crashing or throwing server exceptions', () => {
      const emptyTravelers: TravelerInput[] = []
      // 18 Adults
      for (let i = 0; i < 18; i++) {
        emptyTravelers.push({ firstName: '', lastName: '', type: 'adult' })
      }
      // 4 Children
      for (let i = 0; i < 4; i++) {
        emptyTravelers.push({ firstName: '', lastName: '', type: 'child' })
      }

      const diag = BookingPolicy.diagnoseTravelersManifest(emptyTravelers, 18, 4)
      expect(diag.valid).toBe(false)
      expect(diag.totalExpected).toBe(22)
      expect(diag.totalProvided).toBe(22)

      // All 22 travelers have issues
      const travelersWithIssues = Object.keys(diag.travelerIssuesMap)
      expect(travelersWithIssues).toHaveLength(22)

      // First incomplete is Traveler 1 (Index 0)
      expect(diag.issues[0].travelerIndex).toBe(0)
      expect(diag.issues[0].travelerNumber).toBe(1)
      expect(diag.issues[0].field).toBe('firstName')
    })
  })

  describe('Application Layer: ManifestDiagnosticsPresenter Tri-State Resolution', () => {
    it('correctly maps untouched travelers to not_started and touched travelers to needs_attention', () => {
      const travelers: TravelerInput[] = [
        // Traveler 1: Valid
        {
          firstName: 'Ahmed',
          lastName: 'Mohamed',
          email: 'ahmed@example.com',
          phone: '+201001234567',
          type: 'adult',
        },
        // Traveler 2: Missing last name, touched
        { firstName: 'Sara', lastName: '', type: 'adult' },
        // Traveler 3: Missing everything, NOT touched
        { firstName: '', lastName: '', type: 'adult' },
      ]

      const touchedMap = { 0: true, 1: true } // Traveler 2 was touched; Traveler 3 was NOT touched

      const pres = ManifestDiagnosticsPresenter.evaluate(travelers, 3, 0, touchedMap)

      expect(pres.completedCount).toBe(1)
      expect(pres.needsAttentionCount).toBe(1)
      expect(pres.notStartedCount).toBe(1)

      // Traveler 1 is complete
      expect(pres.travelers[0].status).toBe('complete')
      // Traveler 2 is needs_attention
      expect(pres.travelers[1].status).toBe('needs_attention')
      expect(pres.travelers[1].missingFieldsSummary).toBe('Missing: Last name')
      // Traveler 3 is not_started
      expect(pres.travelers[2].status).toBe('not_started')
    })

    it('navigates to the next INCOMPLETE traveler, skipping completed travelers', () => {
      // Setup scenario:
      // Index 0 (T1): complete
      // Index 1 (T2): complete
      // Index 2 (T3): complete
      // Index 3 (T4): needs attention
      // Index 4 (T5): complete
      // Index 5 (T6): needs attention
      const travelers: TravelerInput[] = [
        { firstName: 'T1', lastName: 'L1', email: 't1@example.com', phone: '+201001234567', type: 'adult' },
        { firstName: 'T2', lastName: 'L2', type: 'adult' },
        { firstName: 'T3', lastName: 'L3', type: 'adult' },
        { firstName: 'T4', lastName: '', type: 'adult' }, // Incomplete (Missing last name)
        { firstName: 'T5', lastName: 'L5', type: 'adult' },
        { firstName: 'T6', lastName: '', type: 'adult' }, // Incomplete (Missing last name)
      ]

      const pres = ManifestDiagnosticsPresenter.evaluate(travelers, 6, 0, {
        0: true,
        1: true,
        2: true,
        3: true,
        4: true,
        5: true,
      })

      expect(pres.incompleteTravelers).toHaveLength(2)
      expect(pres.incompleteTravelers[0].index).toBe(3) // Traveler 4
      expect(pres.incompleteTravelers[1].index).toBe(5) // Traveler 6

      // When Traveler 4 (index 3) is evaluated, findNextIncompleteIndex returns index 5 (Traveler 6), skipping completed Traveler 5 (index 4)
      const nextIndex = ManifestDiagnosticsPresenter.findNextIncompleteIndex(3, pres)
      expect(nextIndex).toBe(5) // Jumps to Traveler 6, NOT Traveler 5!

      // Now simulate user completing Traveler 4:
      travelers[3].lastName = 'L4'
      const presAfterT4Fixed = ManifestDiagnosticsPresenter.evaluate(travelers, 6, 0, {
        0: true,
        1: true,
        2: true,
        3: true,
        4: true,
        5: true,
      })

      expect(presAfterT4Fixed.travelers[3].status).toBe('complete')
      expect(presAfterT4Fixed.incompleteTravelers).toHaveLength(1)
      expect(presAfterT4Fixed.incompleteTravelers[0].index).toBe(5) // Only Traveler 6 remains

      // Finding next incomplete after index 3 directly returns index 5 (Traveler 6)
      const nextAfterFix = ManifestDiagnosticsPresenter.findNextIncompleteIndex(3, presAfterT4Fixed)
      expect(nextAfterFix).toBe(5)

      // When user completes Traveler 6:
      travelers[5].lastName = 'L6'
      const presAllComplete = ManifestDiagnosticsPresenter.evaluate(travelers, 6, 0, {
        0: true,
        1: true,
        2: true,
        3: true,
        4: true,
        5: true,
      })
      expect(presAllComplete.valid).toBe(true)
      expect(presAllComplete.incompleteTravelers).toHaveLength(0)
      expect(ManifestDiagnosticsPresenter.findNextIncompleteIndex(5, presAllComplete)).toBe(-1)
    })

    describe('🔴 Required Field Has No UI Escape: Lead Traveler Missing Contact Phone', () => {
      it('surfaces exact diagnostic, targeted recovery label, rejects insufficient digits, and clears on valid input', () => {
        // Setup: Lead Traveler with valid names and email, but missing phone
        const travelers: TravelerInput[] = [
          {
            firstName: 'Ahmed',
            lastName: 'Mohamed',
            email: 'ahmed@example.com',
            phone: '',
            type: 'adult',
          },
        ]

        // 1. Initial State: Missing phone
        let pres = ManifestDiagnosticsPresenter.evaluate(travelers, 1, 0, { 0: true })
        expect(pres.valid).toBe(false)
        expect(pres.bannerTitle).toBe('Almost there')
        expect(pres.bannerSubtitle).toBe('1 traveler still needs information.')
        expect(pres.primaryActionLabel).toBe('Add phone number →')
        expect(pres.incompleteTravelers[0].primaryMissingField).toBe('phone')
        expect(pres.incompleteTravelers[0].missingFieldsSummary).toBe('Missing: Contact phone')

        // 2. Reject trivial character input (e.g. just "+") - must obey domain rule
        travelers[0].phone = '+'
        let diag = BookingPolicy.diagnoseTravelersManifest(travelers, 1, 0)
        expect(diag.valid).toBe(false)
        expect(diag.issues[0].code).toBe('INVALID_LEAD_PHONE')
        expect(diag.issues[0].field).toBe('phone')

        // 3. Reject insufficient digits (e.g. "+12345" - 5 digits)
        travelers[0].phone = '+12345'
        diag = BookingPolicy.diagnoseTravelersManifest(travelers, 1, 0)
        expect(diag.valid).toBe(false)
        expect(diag.issues[0].code).toBe('INVALID_LEAD_PHONE')

        // 4. Accept valid phone with >= 7 digits
        travelers[0].phone = '+20 100 123 4567'
        pres = ManifestDiagnosticsPresenter.evaluate(travelers, 1, 0, { 0: true })
        expect(pres.valid).toBe(true)
        expect(pres.completedCount).toBe(1)
        expect(pres.incompleteTravelers).toHaveLength(0)
        expect(pres.travelers[0].status).toBe('complete')

        const policyRes = BookingPolicy.validateTravelersManifest(travelers, 1, 0)
        expect(policyRes.allowed).toBe(true)
      })

      it('proves every diagnostic code maps to an exact field and actionable recovery label', () => {
        // 1. MISSING_LEAD_FIRST_NAME
        let pres = ManifestDiagnosticsPresenter.evaluate(
          [{ firstName: '', lastName: 'Doe', email: 'lead@example.com', phone: '+201001234567', type: 'adult' }],
          1, 0, { 0: true }
        )
        expect(pres.issues[0].code).toBe('MISSING_LEAD_FIRST_NAME')
        expect(pres.incompleteTravelers[0].primaryMissingField).toBe('firstName')
        expect(pres.primaryActionLabel).toBe('Add first name →')

        // 2. MISSING_LEAD_LAST_NAME
        pres = ManifestDiagnosticsPresenter.evaluate(
          [{ firstName: 'John', lastName: '', email: 'lead@example.com', phone: '+201001234567', type: 'adult' }],
          1, 0, { 0: true }
        )
        expect(pres.issues[0].code).toBe('MISSING_LEAD_LAST_NAME')
        expect(pres.incompleteTravelers[0].primaryMissingField).toBe('lastName')
        expect(pres.primaryActionLabel).toBe('Add last name →')

        // 3. MISSING_LEAD_EMAIL
        pres = ManifestDiagnosticsPresenter.evaluate(
          [{ firstName: 'John', lastName: 'Doe', email: '', phone: '+201001234567', type: 'adult' }],
          1, 0, { 0: true }
        )
        expect(pres.issues[0].code).toBe('MISSING_LEAD_EMAIL')
        expect(pres.incompleteTravelers[0].primaryMissingField).toBe('email')
        expect(pres.primaryActionLabel).toBe('Add contact email →')

        // 4. INVALID_LEAD_EMAIL
        pres = ManifestDiagnosticsPresenter.evaluate(
          [{ firstName: 'John', lastName: 'Doe', email: 'not-an-email', phone: '+201001234567', type: 'adult' }],
          1, 0, { 0: true }
        )
        expect(pres.issues[0].code).toBe('INVALID_LEAD_EMAIL')
        expect(pres.incompleteTravelers[0].primaryMissingField).toBe('email')
        expect(pres.primaryActionLabel).toBe('Fix contact email →')

        // 5. MISSING_LEAD_PHONE
        pres = ManifestDiagnosticsPresenter.evaluate(
          [{ firstName: 'John', lastName: 'Doe', email: 'lead@example.com', phone: '', type: 'adult' }],
          1, 0, { 0: true }
        )
        expect(pres.issues[0].code).toBe('MISSING_LEAD_PHONE')
        expect(pres.incompleteTravelers[0].primaryMissingField).toBe('phone')
        expect(pres.primaryActionLabel).toBe('Add phone number →')

        // 6. INVALID_LEAD_PHONE
        pres = ManifestDiagnosticsPresenter.evaluate(
          [{ firstName: 'John', lastName: 'Doe', email: 'lead@example.com', phone: '+12345', type: 'adult' }],
          1, 0, { 0: true }
        )
        expect(pres.issues[0].code).toBe('INVALID_LEAD_PHONE')
        expect(pres.incompleteTravelers[0].primaryMissingField).toBe('phone')
        expect(pres.primaryActionLabel).toBe('Fix phone number →')

        // 7. MISSING_COMPANION_FIRST_NAME
        pres = ManifestDiagnosticsPresenter.evaluate(
          [
            { firstName: 'John', lastName: 'Doe', email: 'lead@example.com', phone: '+201001234567', type: 'adult' },
            { firstName: '', lastName: 'Companion', type: 'adult' },
          ],
          2, 0, { 0: true, 1: true }
        )
        expect(pres.issues[0].code).toBe('MISSING_COMPANION_FIRST_NAME')
        expect(pres.incompleteTravelers[0].primaryMissingField).toBe('firstName')
        expect(pres.incompleteTravelers[0].missingFieldsSummary).toContain('First name')

        // 8. MISSING_COMPANION_LAST_NAME
        pres = ManifestDiagnosticsPresenter.evaluate(
          [
            { firstName: 'John', lastName: 'Doe', email: 'lead@example.com', phone: '+201001234567', type: 'adult' },
            { firstName: 'Jane', lastName: '', type: 'adult' },
          ],
          2, 0, { 0: true, 1: true }
        )
        expect(pres.issues[0].code).toBe('MISSING_COMPANION_LAST_NAME')
        expect(pres.incompleteTravelers[0].primaryMissingField).toBe('lastName')
        expect(pres.incompleteTravelers[0].missingFieldsSummary).toContain('Last name')

        // 9. MISSING_CHILD_DOB
        pres = ManifestDiagnosticsPresenter.evaluate(
          [
            { firstName: 'John', lastName: 'Doe', email: 'lead@example.com', phone: '+201001234567', type: 'adult' },
            { firstName: 'Kiddo', lastName: 'Doe', dateOfBirth: '', type: 'child' },
          ],
          1, 1, { 0: true, 1: true }
        )
        expect(pres.issues[0].code).toBe('MISSING_CHILD_DOB')
        expect(pres.incompleteTravelers[0].primaryMissingField).toBe('dateOfBirth')
        expect(pres.primaryActionLabel).toBe('Add date of birth →')
      })
    })
  })
})
