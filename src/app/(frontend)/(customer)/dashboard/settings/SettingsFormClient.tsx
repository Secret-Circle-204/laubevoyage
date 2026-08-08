'use client'

import React, { useState } from 'react'
import { Card, Button } from '@/components/ui'
import { useToast } from '@/providers'
import { updateCustomerPreferencesAction } from '@/application/actions/customer-actions'

interface SettingsFormClientProps {
  initialData: {
    email: boolean
    sms: boolean
    push: boolean
  }
}

export function SettingsFormClient({ initialData }: SettingsFormClientProps) {
  const { addToast } = useToast()
  const [email, setEmail] = useState(initialData.email)
  const [sms, setSms] = useState(initialData.sms)
  const [push, setPush] = useState(initialData.push)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const res = await updateCustomerPreferencesAction({
        notifications: { email, sms, push },
      })

      if (res.success) {
        addToast({
          type: 'success',
          title: 'Preferences Saved',
          description: 'Your communication settings have been saved successfully.',
        })
      } else {
        addToast({
          type: 'error',
          title: 'Save Failed',
          description: res.error || 'Failed to save communication preferences.',
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
      <h2 className="text-xl font-bold text-slate-900 dark:text-white">Communication Preferences</h2>
      <div className="flex flex-col gap-4 text-sm text-slate-700 dark:text-slate-300">
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={email}
            onChange={(e) => setEmail(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 dark:border-slate-800 text-[#00aeef] focus:ring-[#00aeef]"
          />
          <div>
            <span className="font-semibold block">Email Alerts</span>
            <span className="text-xs text-slate-500 block">Receive transaction receipts, itinerary updates, and news deals.</span>
          </div>
        </label>

        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={sms}
            onChange={(e) => setSms(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 dark:border-slate-800 text-[#00aeef] focus:ring-[#00aeef]"
          />
          <div>
            <span className="font-semibold block">SMS Alerts</span>
            <span className="text-xs text-slate-500 block">Get instant text alerts for flight delay checkouts or voucher confirmations.</span>
          </div>
        </label>

        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={push}
            onChange={(e) => setPush(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 dark:border-slate-800 text-[#00aeef] focus:ring-[#00aeef]"
          />
          <div>
            <span className="font-semibold block">Browser Push Notifications</span>
            <span className="text-xs text-slate-500 block">Allow push banners in browser for real-time customer support replies.</span>
          </div>
        </label>
      </div>

      <Button
        variant="primary"
        size="md"
        className="w-fit font-semibold mt-2"
        isLoading={isSaving}
        onClick={handleSave}
      >
        Save Settings
      </Button>
    </Card>
  )
}
