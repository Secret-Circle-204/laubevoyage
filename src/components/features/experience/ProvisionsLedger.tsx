'use client'

import React from 'react'
import { JsonTranslationDictionary } from '@/domains/translation/dictionary'

const dict = new JsonTranslationDictionary()

function CheckIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}

function CrossIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

export interface ProvisionsLedgerProps {
  includedServices?: string[]
  excludedServices?: string[]
  policiesHtml?: string
  locale: string
}

export function ProvisionsLedger({
  includedServices,
  excludedServices,
  policiesHtml,
  locale,
}: ProvisionsLedgerProps) {
  const hasServices =
    (includedServices && includedServices.length > 0) ||
    (excludedServices && excludedServices.length > 0)

  if (!hasServices && !policiesHtml) return null

  return (
    <>
      {/* SERVICES & POLICIES LEDGER */}
      {hasServices && (
        <section className="animate-editorial-reveal">
          <div className="flex flex-col mb-8 pb-3 border-b border-border/60">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-secondary" />
              <span className="text-xs uppercase font-bold text-secondary">
                Provisions & Protocol
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-hornbill font-light text-foreground mt-1">
              {dict.get(locale, 'experience.servicesTitle')}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {includedServices && includedServices.length > 0 && (
              <div className="p-7 rounded-2xl border border-border/80 bg-card shadow-xs">
                <h3 className="text-sm font-bold uppercase mb-4 text-secondary flex items-center gap-2">
                  <CheckIcon className="w-4 h-4 text-secondary" />
                  <span>{dict.get(locale, 'experience.whatsIncluded')}</span>
                </h3>
                <ul className="space-y-3">
                  {includedServices.map((service, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-sm text-foreground/80 leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary mt-2 shrink-0" />
                      <span>{service}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {excludedServices && excludedServices.length > 0 && (
              <div className="p-7 rounded-2xl border border-border/80 bg-card shadow-xs">
                <h3 className="text-sm font-bold uppercase mb-4 text-muted-foreground flex items-center gap-2">
                  <CrossIcon className="w-4 h-4 text-muted-foreground" />
                  <span>{dict.get(locale, 'experience.whatsExcluded')}</span>
                </h3>
                <ul className="space-y-3">
                  {excludedServices.map((service, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-sm text-muted-foreground leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 mt-2 shrink-0" />
                      <span>{service}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Policies Chronicle */}
      {policiesHtml && (
        <section className="animate-editorial-reveal">
          <div className="p-7 sm:p-8 rounded-2xl border border-border/80 bg-card shadow-xs">
            <h3 className="text-lg font-hornbill font-light text-foreground mb-3">
              {dict.get(locale, 'experience.policiesTitle')}
            </h3>
            <div
              className="prose dark:prose-invert max-w-none text-sm text-foreground/75 leading-relaxed font-normal"
              dangerouslySetInnerHTML={{ __html: policiesHtml }}
            />
          </div>
        </section>
      )}
    </>
  )
}
