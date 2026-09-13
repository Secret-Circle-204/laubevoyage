'use client'

import React, { useState } from 'react'
import { Card, Input, Button, Badge } from '@/components/ui'
import { useToast } from '@/providers'
import { updateCustomerProfileAction } from '@/application/actions/customer-actions'
import type { CustomerProfileDataDTO } from '@/application/customer/dto'

interface ProfileFormClientProps {
  initialData: CustomerProfileDataDTO
}

function UsersIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  )
}

function CalendarIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.253M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
    </svg>
  )
}

function ShieldCheckIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  )
}

export function ProfileFormClient({ initialData }: ProfileFormClientProps) {
  const { addToast } = useToast()
  const [firstName, setFirstName] = useState(initialData.firstName || '')
  const [lastName, setLastName] = useState(initialData.lastName || '')
  const [phone, setPhone] = useState(initialData.phone || '')
  const [passportNumber, setPassportNumber] = useState(initialData.passportNumber || '')
  const [nationality, setNationality] = useState(initialData.nationality || '')
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      addToast({
        type: 'error',
        title: 'Validation Error',
        description: 'First Name and Last Name are required.',
      })
      return
    }

    setIsSaving(true)
    try {
      const res = await updateCustomerProfileAction({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || undefined,
        passportNumber: passportNumber.trim() || undefined,
        nationality: nationality.trim() || undefined,
      })

      if (res.success) {
        addToast({
          type: 'success',
          title: 'Profile Updated',
          description: 'Your profile information has been saved successfully.',
        })
      } else {
        addToast({
          type: 'error',
          title: 'Update Failed',
          description: res.error || 'Failed to save profile details.',
        })
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.'
      addToast({
        type: 'error',
        title: 'Error',
        description: msg,
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card variant="flat" padding="lg" className="flex flex-col gap-6 bg-card border-border/80 shadow-xs">
        <h2 className="text-xl font-hornbill font-light text-foreground">Personal Account Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="First Name *"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="e.g. John"
          />
          <Input
            label="Last Name *"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="e.g. Doe"
          />
          <Input
            label="Email Address"
            value={initialData.email}
            readOnly
            disabled
          />
          <Input
            label="Phone / WhatsApp"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. +20 100 123 4567"
          />
          <Input
            label="Passport Number"
            value={passportNumber}
            onChange={(e) => setPassportNumber(e.target.value)}
            placeholder="e.g. A1234567"
          />
          <Input
            label="Nationality"
            value={nationality}
            onChange={(e) => setNationality(e.target.value)}
            placeholder="e.g. Egyptian"
          />
        </div>
        <Button
          variant="primary"
          size="md"
          className="w-fit font-semibold shadow-md"
          isLoading={isSaving}
          onClick={handleSave}
        >
          Save Profile Details
        </Button>
      </Card>

      {/* Companion Travelers Presentation Section */}
      <Card variant="flat" padding="lg" className="flex flex-col gap-6 bg-card border-border/80 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-hornbill font-light text-foreground">Companion Travelers</h2>
            <p className="text-xs text-muted-foreground mt-1">Family members and companions registered with your customer account.</p>
          </div>
          <Badge variant="accent" size="sm">
            {initialData.totalCompanions ?? initialData.travelers?.length ?? 0} Saved
          </Badge>
        </div>

        {(!initialData.travelers || initialData.travelers.length === 0) ? (
          <div className="text-center py-8 px-4 border border-dashed border-border/80 bg-card rounded-2xl flex flex-col items-center">
            <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent mb-3">
              <UsersIcon className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-foreground">No companion travelers registered yet</p>
            <p className="text-xs text-muted-foreground mt-1">Travelers added to your bookings will automatically appear here for expedited future checkouts.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {initialData.travelers.map((traveler) => (
              <div
                key={traveler.id}
                className="flex flex-col gap-2 p-4 rounded-2xl bg-card border border-border/80 hover:border-accent/40 shadow-xs transition-all duration-200"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-foreground">
                    {traveler.firstName} {traveler.lastName}
                  </span>
                  <Badge variant="accent" size="sm" className="capitalize text-[10px]">
                    {traveler.relationship}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                  {traveler.dateOfBirth && (
                    <span className="inline-flex items-center gap-1">
                      <CalendarIcon className="w-3.5 h-3.5 text-accent" />
                      {new Date(traveler.dateOfBirth).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                  )}
                  {traveler.passportNumber && (
                    <span className="inline-flex items-center gap-1 font-medium">
                      <ShieldCheckIcon className="w-3.5 h-3.5 text-accent" />
                      Passport: {traveler.passportNumber.slice(0, 2)}••••{traveler.passportNumber.slice(-2)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
