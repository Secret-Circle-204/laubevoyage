'use client'

import React from 'react'
import { Card } from '@/components/ui'
import { JsonTranslationDictionary } from '@/domains/translation/dictionary'
import type { CheckoutPageDTO } from '@/application/booking/dto-checkout'

const dict = new JsonTranslationDictionary()

interface PaymentGatewaySectionProps {
  gateways: CheckoutPageDTO['gateways']
  selectedGateway: string
  onSelectGateway: (id: string) => void
  locale: string
}

export function PaymentGatewaySection({
  gateways,
  selectedGateway,
  onSelectGateway,
  locale,
}: PaymentGatewaySectionProps) {
  const paymentMethodTitle = dict.get(locale, 'checkout.paymentMethod') || 'Payment & Reservation Method'

  return (
    <Card variant="flat" padding="lg" className="border border-border/80 bg-card rounded-2xl shadow-xs">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3 pb-4 border-b border-border/60">
        <div className="flex items-center gap-3.5">
          <span className="w-9 h-9 rounded-full bg-secondary text-background text-sm font-hornbill font-bold flex items-center justify-center shrink-0 shadow-xs">
            04
          </span>
          <div>
            <span className="text-[10px] text-secondary uppercase font-semibold block">
              SETTLEMENT CHOICE
            </span>
            <h2 className="text-xl sm:text-2xl font-hornbill font-light text-foreground tracking-tight">
              {paymentMethodTitle}
            </h2>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3.5">
        {gateways.map((gw) => {
          const isSelected = selectedGateway === gw.id
          const isStripe = gw.id === 'stripe'
          const isBnpl = gw.id === 'bnpl'

          return (
            <button
              key={gw.id}
              type="button"
              onClick={() => onSelectGateway(gw.id)}
              className={`p-4 sm:p-5 rounded-2xl border text-left flex items-center justify-between transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'border-secondary bg-secondary/5 ring-1 ring-secondary/40 shadow-xs'
                  : 'border-border/80 bg-card-elevated/70 hover:border-secondary/40'
              }`}
            >
              <div className="flex items-center gap-3.5">
                {/* Radio indicator */}
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                    isSelected ? 'border-secondary bg-secondary' : 'border-muted-foreground/40 bg-transparent'
                  }`}
                >
                  {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-background" />}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-hornbill font-semibold text-sm sm:text-base text-foreground">
                      {isStripe ? 'Secure Online Payment' : isBnpl ? 'Reservation Request' : gw.name}
                    </span>
                    {gw.icon && <span className="text-base">{gw.icon}</span>}
                  </div>
                  <span className="text-xs text-muted-foreground block mt-0.5">
                    {isStripe
                      ? 'Pay securely by card through our payment provider.'
                      : isBnpl
                        ? 'Submit your reservation for administrative review.'
                        : gw.name}
                  </span>
                </div>
              </div>

              <div className="text-right flex-shrink-0 ml-3">
                <span
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                    isSelected ? 'text-secondary bg-secondary/10 border border-secondary/25' : 'text-muted-foreground bg-card'
                  }`}
                >
                  {isSelected ? 'SELECTED' : 'SELECT'}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </Card>
  )
}
