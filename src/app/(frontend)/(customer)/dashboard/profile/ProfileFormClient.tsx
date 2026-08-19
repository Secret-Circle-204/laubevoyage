'use client'

import React, { useState } from 'react'
import { Card, Input, Button, Badge } from '@/components/ui'
import { useToast } from '@/providers'
import { updateCustomerProfileAction } from '@/application/actions/customer-actions'
import type { CustomerProfileDataDTO } from '@/application/customer/dto'

interface ProfileFormClientProps {
  initialData: CustomerProfileDataDTO
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
      <Card variant="flat" padding="lg" className="flex flex-col gap-6">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white">Personal Account Information</h2>
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
        className="w-fit font-semibold"
        isLoading={isSaving}
        onClick={handleSave}
      >
        Save Profile Details
      </Button>
    </Card>

    {/* Companion Travelers Presentation Section */}
    <Card variant="flat" padding="lg" className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Companion Travelers</h2>
          <p className="text-xs text-slate-500 mt-1">Family members and companions registered with your customer account.</p>
        </div>
        <Badge variant="primary" size="sm">
          {initialData.travelers?.length || 0} Saved
        </Badge>
      </div>

      {(!initialData.travelers || initialData.travelers.length === 0) ? (
        <div className="text-center py-8 px-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
          <span className="text-3xl mb-2 block">👥</span>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No companion travelers registered yet</p>
          <p className="text-xs text-slate-500 mt-1">Travelers added to your bookings will automatically appear here for expedited future checkouts.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {initialData.travelers.map((traveler) => (
            <div
              key={traveler.id}
              className="flex flex-col gap-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-900 dark:text-white">
                  {traveler.firstName} {traveler.lastName}
                </span>
                <Badge variant="accent" size="sm" className="capitalize text-[10px]">
                  {traveler.relationship}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                {traveler.dateOfBirth && (
                  <span>🎂 {new Date(traveler.dateOfBirth).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                )}
                {traveler.passportNumber && (
                  <span>🛂 Passport: {traveler.passportNumber.slice(0, 2)}••••{traveler.passportNumber.slice(-2)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>

    {/* Saved Addresses Presentation Section */}
    <Card variant="flat" padding="lg" className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Saved Addresses</h2>
          <p className="text-xs text-slate-500 mt-1">Billing and residential addresses associated with your account.</p>
        </div>
        <Badge variant="primary" size="sm">
          {initialData.addresses?.length || 0} Saved
        </Badge>
      </div>

      {(!initialData.addresses || initialData.addresses.length === 0) ? (
        <div className="text-center py-8 px-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
          <span className="text-3xl mb-2 block">📍</span>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No saved addresses on file</p>
          <p className="text-xs text-slate-500 mt-1">Addresses added during checkout or billing will appear here for one-click reuse.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {initialData.addresses.map((address) => (
            <div
              key={address.id}
              className="flex flex-col gap-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-900 dark:text-white capitalize">
                  {address.type} Address
                </span>
                <div className="flex items-center gap-2">
                  {address.isDefault && (
                    <Badge variant="success" size="sm" className="text-[10px]">Default</Badge>
                  )}
                  <Badge variant="accent" size="sm" className="capitalize text-[10px]">
                    {address.type}
                  </Badge>
                </div>
              </div>

              <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                <p className="font-medium">{address.street}</p>
                <p>{address.city}, {address.country} {address.postalCode ? `• ${address.postalCode}` : ''}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
    </div>
  )
}
