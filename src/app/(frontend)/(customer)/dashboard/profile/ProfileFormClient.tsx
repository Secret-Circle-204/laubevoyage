'use client'

import React, { useState } from 'react'
import { Card, Input, Button } from '@/components/ui'
import { useToast } from '@/providers'
import { updateCustomerProfileAction } from '@/application/actions/customer-actions'

interface ProfileFormClientProps {
  initialData: {
    firstName: string
    lastName: string
    email: string
    phone?: string
    passportNumber?: string
    nationality?: string
  }
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
  )
}
