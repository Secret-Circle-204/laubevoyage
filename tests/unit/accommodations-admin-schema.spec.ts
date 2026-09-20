import { describe, it, expect } from 'vitest'
import { Experiences } from '@/collections/Experiences'
import { AccommodationPolicy } from '@/domains/experience/accommodation-policy'
import type { Field, ArrayField, SelectField, RelationshipField } from 'payload'

describe('Gate 2 — Payload Accommodation Schema & Invariants Specification', () => {
  const accommodationsField = Experiences.fields.find(
    (f) => 'name' in f && f.name === 'accommodations',
  ) as ArrayField | undefined

  it('1. accommodations field exists as an array on Experiences collection', () => {
    expect(accommodationsField).toBeDefined()
    expect(accommodationsField?.type).toBe('array')
  })

  it('2. registers the custom AccommodationsEditor Field component', () => {
    expect(accommodationsField?.admin?.components?.Field).toBe(
      '@/components/admin/AccommodationsEditor#AccommodationsEditor',
    )
  })

  it('3. Stay level schema contains order and nights, but forbids property/rates', () => {
    const stayFields = accommodationsField?.fields || []
    const fieldNames = stayFields.map((f) => ('name' in f ? f.name : ''))

    // Authoritative Stay fields
    expect(fieldNames).toContain('order')
    expect(fieldNames).toContain('nights')
    expect(fieldNames).toContain('options')

    // Disallowed Stay fields (must NOT exist at Stay level)
    expect(fieldNames).not.toContain('property')
    expect(fieldNames).not.toContain('propertyId')
    expect(fieldNames).not.toContain('roomCategory')
    expect(fieldNames).not.toContain('boardBasis')
    expect(fieldNames).not.toContain('pricingUnit')
    expect(fieldNames).not.toContain('roomRates')
  })

  it('4. options is an array inside Stay with minRows: 1', () => {
    const stayFields = accommodationsField?.fields || []
    const optionsField = stayFields.find(
      (f) => 'name' in f && f.name === 'options',
    ) as ArrayField | undefined

    expect(optionsField).toBeDefined()
    expect(optionsField?.type).toBe('array')
    expect(optionsField?.minRows).toBe(1)
    expect(optionsField?.required).toBe(true)
  })

  it('5. Option level schema contains property relationship to accommodations', () => {
    const stayFields = accommodationsField?.fields || []
    const optionsField = stayFields.find(
      (f) => 'name' in f && f.name === 'options',
    ) as ArrayField | undefined
    const optFields = optionsField?.fields || []

    const propertyField = optFields.find(
      (f) => 'name' in f && f.name === 'property',
    ) as RelationshipField | undefined

    expect(propertyField).toBeDefined()
    expect(propertyField?.type).toBe('relationship')
    expect(propertyField?.relationTo).toBe('accommodations')
    expect(propertyField?.required).toBe(true)

    // Ensure propertyId is not duplicated as a separate field
    const optNames = optFields.map((f) => ('name' in f ? f.name : ''))
    expect(optNames).not.toContain('propertyId')
    expect(optNames).not.toContain('nights')
    expect(optNames).not.toContain('order')
  })

  it('6. Option level preserves boardBasis, pricingUnit, and roomRates', () => {
    const stayFields = accommodationsField?.fields || []
    const optionsField = stayFields.find(
      (f) => 'name' in f && f.name === 'options',
    ) as ArrayField | undefined
    const optFields = optionsField?.fields || []

    const pricingUnitField = optFields.find(
      (f) => 'name' in f && f.name === 'pricingUnit',
    ) as SelectField | undefined
    expect(pricingUnitField?.type).toBe('select')
    expect(pricingUnitField?.required).toBe(true)
    expect(pricingUnitField?.defaultValue).toBe('per_stay')

    const boardBasisField = optFields.find(
      (f) => 'name' in f && f.name === 'boardBasis',
    ) as SelectField | undefined
    expect(boardBasisField?.type).toBe('select')

    const roomRatesField = optFields.find(
      (f) => 'name' in f && f.name === 'roomRates',
    ) as ArrayField | undefined
    expect(roomRatesField?.type).toBe('array')
    expect(roomRatesField?.required).toBe(true)
    expect(roomRatesField?.minRows).toBe(1)
  })

  it('7. RoomRate schema enforces occupancy, non-negative rateEGP, and enabled checkbox', () => {
    const stayFields = accommodationsField?.fields || []
    const optionsField = stayFields.find(
      (f) => 'name' in f && f.name === 'options',
    ) as ArrayField | undefined
    const optFields = optionsField?.fields || []
    const roomRatesField = optFields.find(
      (f) => 'name' in f && f.name === 'roomRates',
    ) as ArrayField | undefined
    const rateFields = roomRatesField?.fields || []
    const rateFieldNames = rateFields.map((f) => ('name' in f ? f.name : ''))

    expect(rateFieldNames).toContain('occupancy')
    expect(rateFieldNames).toContain('rateEGP')
    expect(rateFieldNames).toContain('enabled')
  })

  it('8. Domain policy allows multiple options in a single stay', () => {
    const validMultiOptionStay = [
      {
        id: 'stay-1',
        order: 1,
        nights: 4,
        options: [
          {
            id: 'opt-1',
            propertyId: 101,
            pricingUnit: 'per_stay' as const,
            roomRates: [
              { occupancy: 'double' as const, guestCount: 2, rateEGP: 2500, enabled: true },
            ],
          },
          {
            id: 'opt-2',
            propertyId: 102,
            pricingUnit: 'per_stay' as const,
            roomRates: [
              { occupancy: 'double' as const, guestCount: 2, rateEGP: 3200, enabled: true },
            ],
          },
        ],
      },
    ]

    const result = AccommodationPolicy.validate('package', validMultiOptionStay)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('9. Domain policy forbids duplicate properties in the same stay', () => {
    const duplicateHotelStay = [
      {
        id: 'stay-1',
        order: 1,
        nights: 3,
        options: [
          {
            id: 'opt-1',
            propertyId: 101,
            pricingUnit: 'per_stay' as const,
            roomRates: [
              { occupancy: 'double' as const, guestCount: 2, rateEGP: 2000, enabled: true },
            ],
          },
          {
            id: 'opt-2',
            propertyId: 101, // Duplicate!
            pricingUnit: 'per_stay' as const,
            roomRates: [
              { occupancy: 'double' as const, guestCount: 2, rateEGP: 2500, enabled: true },
            ],
          },
        ],
      },
    ]

    const result = AccommodationPolicy.validate('package', duplicateHotelStay)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('duplicate property'))).toBe(true)
  })

  it('10. Domain policy rejects stay with 0 options', () => {
    const emptyOptionStay = [
      {
        id: 'stay-1',
        order: 1,
        nights: 3,
        options: [],
      },
    ]

    const result = AccommodationPolicy.validate('package', emptyOptionStay)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('at least one accommodation option'))).toBe(true)
  })
})
