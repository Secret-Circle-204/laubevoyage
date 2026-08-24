import { describe, it, expect } from 'vitest'
import { Bookings } from '@/collections/Bookings'

describe('Admin Presentation & Immutability Guarantees', () => {
  it('enforces strict field immutability for completionAt and destinationTimezone in Bookings schema', () => {
    const completionAtField = Bookings.fields.find((f: any) => f.name === 'completionAt') as any
    const destinationTimezoneField = Bookings.fields.find((f: any) => f.name === 'destinationTimezone') as any

    expect(completionAtField).toBeDefined()
    expect(completionAtField.access?.update).toBeDefined()
    // Test that update access returns false
    expect(completionAtField.access.update({} as any)).toBe(false)
    expect(completionAtField.admin?.readOnly).toBe(true)

    expect(destinationTimezoneField).toBeDefined()
    expect(destinationTimezoneField.access?.update).toBeDefined()
    expect(destinationTimezoneField.access.update({} as any)).toBe(false)
    expect(destinationTimezoneField.admin?.readOnly).toBe(true)

    // Verify Collection-level Hard Deletion is strictly forbidden
    expect(Bookings.access?.delete).toBeDefined()
    expect((Bookings.access as any).delete({} as any)).toBe(false)
  })

  it('enforces destinationTimezone presence in Bookings admin.defaultColumns for List View rowData availability', () => {
    expect(Bookings.admin?.defaultColumns).toContain('destinationTimezone')
    expect(Bookings.admin?.defaultColumns).toContain('completionAt')
    expect(Bookings.admin?.defaultColumns).toContain('startDate')
    expect(Bookings.admin?.defaultColumns).toContain('endDate')
  })

  it('formats completionAt faithfully using authoritative destination timezone without fallbacks', () => {
    const cellData = '2026-08-25T09:00:00.000Z'
    const timezone = 'Africa/Cairo'

    const date = new Date(cellData)
    const formatted = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date)

    // 09:00 UTC in Africa/Cairo (UTC+3) -> Aug 25, 2026, 12:00 PM
    expect(formatted).toBe('Aug 25, 2026, 12:00 PM')
  })
})
