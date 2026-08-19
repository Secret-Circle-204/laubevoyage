'use client'

import React, { useState } from 'react'
import { Card, Button, Badge } from '@/components/ui'
import { useToast } from '@/providers'
import { updateCustomerPreferencesAction } from '@/application/actions/customer-actions'
import type { CustomerSettingsDataDTO } from '@/application/customer/dto'

interface SettingsFormClientProps {
  initialData: CustomerSettingsDataDTO
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
    <div className="flex flex-col gap-6">
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

      {/* Active Device Sessions Presentation Section */}
      <Card variant="flat" padding="lg" className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Active Device Sessions</h2>
            <p className="text-xs text-slate-500 mt-1">Manage and audit devices authorized to access your customer account.</p>
          </div>
          <Badge variant="primary" size="sm">
            {initialData.activeSessions?.length || 0} Active
          </Badge>
        </div>

        {(!initialData.activeSessions || initialData.activeSessions.length === 0) ? (
          <div className="text-center py-8 px-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            <span className="text-3xl mb-2 block">🔒</span>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No secondary device sessions recorded</p>
            <p className="text-xs text-slate-500 mt-1">Your current browser session is actively authenticated and secured.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {initialData.activeSessions.map((session) => (
              <div
                key={session.sessionId}
                className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">💻</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {session.deviceName || 'Web Browser'}
                      </span>
                      <Badge variant="success" size="sm" className="text-[10px]">
                        Active
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                      <span>IP: {session.ipAddress ? `${session.ipAddress.split('.').slice(0, 2).join('.')}.•.•` : 'Protected'}</span>
                      <span>•</span>
                      <span>Last Active: {new Date(session.lastActiveAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
