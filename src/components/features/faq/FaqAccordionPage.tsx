'use client'

import React from 'react'
import { useState } from 'react'
import { Badge, Card } from '@/components/ui'
import type { FaqPageDTO } from '@/application/blog/dto'

export function FaqAccordionPage({ data }: { data: FaqPageDTO }) {
  const [openId, setOpenId] = useState<number | null>(data.items[0]?.id || null)

  return (
    <div className="py-16 bg-slate-50 dark:bg-slate-950 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <Badge variant="primary" className="mb-3">
            Help & Guidance
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Frequently Asked Questions
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-3 text-base">
            Everything you need to know about booking, private transfers, customized itineraries, and travel policies.
          </p>
        </div>

        {/* FAQ Accordion List */}
        <div className="flex flex-col gap-4">
          {data.items.map((item) => {
            const isOpen = openId === item.id

            return (
              <Card
                key={item.id}
                variant="flat"
                className="cursor-pointer transition-all duration-200"
                onClick={() => setOpenId(isOpen ? null : item.id)}
              >
                <div className="p-6 flex items-center justify-between gap-4">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {item.question}
                  </h3>
                  <span className="text-xl font-bold text-[#00aeef]">{isOpen ? '−' : '+'}</span>
                </div>

                {isOpen && (
                  <div className="px-6 pb-6 pt-0 text-sm text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 leading-relaxed">
                    <p className="mt-4">{item.answer}</p>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
