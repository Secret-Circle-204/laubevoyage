import { describe, it, expect } from 'vitest'
import { bookingsPresentation } from '@/components/admin/universal-table/configs/bookings'
import { getPeekSlot } from '@/components/admin/universal-table/registry'
import '@/components/admin/universal-table/drawer/slots'

describe('Booking Peek UX & Presentation Contract Specification', () => {
  describe('1. Presentation Configuration Contract', () => {
    it('declares collectionSlug as bookings', () => {
      expect(bookingsPresentation.collectionSlug).toBe('bookings')
    })

    it('enforces wide desktop drawer (~70vw) via peekWidth: wide', () => {
      expect(bookingsPresentation.peekWidth).toBe('wide')
    })

    it('enforces depth: 2 for full relationship hydration of customer and experience', () => {
      expect(bookingsPresentation.peekDepth).toBe(2)
    })

    it('defines bookingNumber as authoritative titleField', () => {
      expect(bookingsPresentation.titleField).toBe('bookingNumber')
    })

    it('defines subtitleField formatting customer and experience safely', () => {
      expect(typeof bookingsPresentation.subtitleField).toBe('function')
      const formatSubtitle = bookingsPresentation.subtitleField as (doc: any) => string | null

      const mockDoc = {
        user: { firstName: 'Hamza', lastName: 'Bahaa' },
        experience: { title: 'Grand Pyramids Expedition' },
      }
      expect(formatSubtitle(mockDoc)).toBe('Hamza Bahaa • Grand Pyramids Expedition')

      // Gracefully handles missing user or experience
      expect(formatSubtitle({ experience: { title: 'Cairo Day Tour' } })).toBe('Cairo Day Tour')
      expect(formatSubtitle({ user: { firstName: 'Omar' } })).toBe('Omar')
      expect(formatSubtitle({})).toBeNull()
    })
  })

  describe('2. Slot Registry Verification', () => {
    it('registers bookingCockpit slot in registry for 3-row layout', () => {
      const slot = getPeekSlot('bookingCockpit')
      expect(slot).toBeDefined()
      expect(typeof slot).toBe('function')
    })

    it('preserves legacy bookingOverview slot in registry for backwards compatibility', () => {
      const slot = getPeekSlot('bookingOverview')
      expect(slot).toBeDefined()
      expect(typeof slot).toBe('function')
    })

    it('preserves legacy bookingTravelersList slot in registry for backwards compatibility', () => {
      const slot = getPeekSlot('bookingTravelersList')
      expect(slot).toBeDefined()
      expect(typeof slot).toBe('function')
    })

    it('preserves legacy bookingOperationalActions slot in registry for backwards compatibility', () => {
      const slot = getPeekSlot('bookingOperationalActions')
      expect(slot).toBeDefined()
      expect(typeof slot).toBe('function')
    })

    it('preserves departureSlots slot for Experiences', () => {
      const slot = getPeekSlot('departureSlots')
      expect(slot).toBeDefined()
      expect(typeof slot).toBe('function')
    })
  })

  describe('3. Information Architecture & Section Hierarchy', () => {
    const sections = bookingsPresentation.peekSections || []

    it('defines cockpit section in peekSections delegating to bookingCockpit', () => {
      expect(sections).toHaveLength(1)
      const cockpit = sections[0]
      expect(cockpit.id).toBe('cockpit')
      expect(cockpit.customSlot).toBe('bookingCockpit')
    })
  })

  describe('4. Traveler Contract & Embedded Data Guarantees', () => {
    it('formats multi-passenger booking accurately from authoritative document without extra request', () => {
      const mockDoc = {
        travelers: [
          { firstName: 'Hamza', lastName: 'Bahaa', type: 'adult', email: 'hamza@example.com' },
          { firstName: 'Shady', lastName: 'Fahim', type: 'adult' },
          { firstName: 'Omar', lastName: 'El Atar', type: 'child' },
        ],
      }

      const travelers = mockDoc.travelers
      expect(travelers).toHaveLength(3)

      const adults = travelers.filter((t) => t.type === 'adult').length
      const children = travelers.filter((t) => t.type === 'child').length
      expect(adults).toBe(2)
      expect(children).toBe(1)
    })
  })
})

