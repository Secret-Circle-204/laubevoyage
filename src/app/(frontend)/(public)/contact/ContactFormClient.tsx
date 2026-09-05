'use client'

import React, { useState } from 'react'
import { Card, Input, Button } from '@/components/ui'
import { useToast, useLocale } from '@/providers'
import { submitContactRequestAction } from '@/application/actions/contact-actions'
import { JsonTranslationDictionary } from '@/domains/translation/dictionary'

const dict = new JsonTranslationDictionary()

export function ContactFormClient() {
  const { addToast } = useToast()
  const { locale } = useLocale()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const nameLabel = dict.get(locale, 'contact.fullName')
  const emailLabel = dict.get(locale, 'contact.emailLabel')
  const subjectLabel = dict.get(locale, 'contact.subject')
  const messageLabel = dict.get(locale, 'contact.message')
  const sendButton = dict.get(locale, 'contact.sendMessage')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      addToast({
        type: 'error',
        title: 'Validation Error',
        description: 'All fields are required.',
      })
      return
    }

    if (!email.includes('@')) {
      addToast({
        type: 'error',
        title: 'Invalid Email',
        description: 'Please enter a valid email address.',
      })
      return
    }

    setIsSubmitting(true)
    try {
      const res = await submitContactRequestAction({
        name: name.trim(),
        email: email.trim(),
        subject: subject.trim(),
        message: message.trim(),
      })

      if (res.success) {
        setIsSubmitted(true)
        addToast({
          type: 'success',
          title: 'Message Sent',
          description: 'Your request has been received. Our concierge will contact you shortly.',
        })
      } else {
        addToast({
          type: 'error',
          title: 'Submission Failed',
          description: res.error || 'Failed to send message.',
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
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <Card variant="flat" padding="lg" className="flex flex-col items-center justify-center text-center py-12 gap-4">
        <span className="text-5xl">✉️</span>
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Thank You!</h3>
        <p className="text-slate-600 dark:text-slate-400 max-w-md">
          Your message has been sent successfully. One of our luxury travel concierge specialists will email you within the next 2 hours.
        </p>
        <Button variant="outline" size="sm" onClick={() => setIsSubmitted(false)} className="mt-4">
          Send Another Message
        </Button>
      </Card>
    )
  }

  return (
    <Card variant="flat" padding="lg" className="lg:col-span-2">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              {nameLabel} *
            </label>
            <Input
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              className="bg-white dark:bg-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              {emailLabel} *
            </label>
            <Input
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com"
              className="bg-white dark:bg-slate-900"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            {subjectLabel} *
          </label>
          <Input
            name="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Custom 5-Day Cairo & Luxor Trip"
            className="bg-white dark:bg-slate-900"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            {messageLabel} *
          </label>
          <textarea
            name="message"
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tell us about your travel dates, number of guests, and special requests..."
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#00aeef] focus:outline-none text-slate-900 dark:text-white"
          />
        </div>

        <Button
          variant="primary"
          type="submit"
          size="lg"
          className="w-full font-semibold"
          isLoading={isSubmitting}
        >
          {sendButton} →
        </Button>
      </form>
    </Card>
  )
}
