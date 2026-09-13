import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getLocaleContext } from '@/lib/get-locale-context'
import { notFound, redirect } from 'next/navigation'
import { Card, Badge, CurrencyDisplay } from '@/components/ui'
import { BookingDetailsLoader } from '@/application/dashboard/loaders'
import { SessionResolver } from '@/application/auth/session-resolver'
import { PrintReservationButton } from '@/components/features/dashboard/PrintReservationButton'

export const metadata: Metadata = {
  title: "Reservation Confirmation | L'Aube Voyage Customer Portal",
  description:
    'View official reservation confirmation, passenger manifest, stays breakdown, and print travel dossier for your luxury trip.',
}

// SVG Icons
function UsersIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  )
}

function CrownIcon({ className = 'w-3 h-3' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 19.5h16.5m-16.5 0a2.25 2.25 0 01-2.25-2.25V9a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 9v8.25a2.25 2.25 0 01-2.25 2.25m-16.5 0l3-7.5 4.5 4.5 4.5-4.5 3 7.5" />
    </svg>
  )
}

function MailIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  )
}

function PhoneIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
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

function BuildingIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
    </svg>
  )
}

function BedIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.25v-2.625a3.375 3.375 0 00-3.375-3.375H7.125a3.375 3.375 0 00-3.375 3.375v2.625m16.5 0A2.25 2.25 0 0118 16.5H6a2.25 2.25 0 01-2.25-2.25m16.5 0v3.75m-16.5-3.75v3.75M3 20.25h18" />
    </svg>
  )
}

function PinIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  )
}

export default async function BookingDetailPage(props: { params: Promise<{ id: string }> }) {
  const session = await SessionResolver.resolve()
  if (!session.isAuthenticated || !session.customerId) {
    redirect('/login')
  }

  const params = await props.params
  const bookingId = params.id

  const localeCtx = await getLocaleContext()

  const data = await BookingDetailsLoader.loadByNumber(bookingId, session.customerId, {
    locale: localeCtx.language,
    currency: localeCtx.currency,
  })
  if (!data) {
    notFound()
  }

  const { getDomainServices } = await import('@/domains/factory')
  const { localization } = await getDomainServices()
  const ctx = await localization.buildContext({
    cookieLocale: localeCtx.language,
    cookieCurrency: localeCtx.currency,
  })

  const printLabel = localization.translateUiKey('bookingConfirmation.printConfirmation', ctx)
  const backLabel = localization.translateUiKey('bookingConfirmation.backToBookings', ctx)
  const dossierTitle = localization.translateUiKey('bookingConfirmation.reservationDossier', ctx)

  return (
    <div className="flex flex-col gap-6 flex-grow print:gap-4 print:p-0">
      {/* Official Printable Header (Visible exclusively in print / PDF save) */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-2">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-2xl font-black text-slate-900 uppercase">
              L&apos;Aube Voyage
            </div>
            <p className="text-xs text-slate-600 uppercase mt-0.5 font-medium">
              Official Reservation Confirmation and Travel Dossier
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold text-slate-900">
              #LV-{data.bookingNumber.padStart(5, '0')}
            </div>
            <div className="text-[11px] text-slate-600 mt-0.5 uppercase font-semibold">
              Status: {data.status.replace(/_/g, ' ').toUpperCase()}
              {data.paymentStatus === 'paid'
                ? ' (PAID)'
                : data.paymentStatus === 'partially_paid'
                  ? ' (PARTIALLY PAID)'
                  : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Screen Header Row with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <Link
            href="/dashboard/bookings"
            className="text-xs font-bold text-slate-500 hover:text-[#00aeef] transition-colors mb-1 block"
          >
            ← {backLabel}
          </Link>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
            {dossierTitle} #{data.bookingNumber}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Badge
              variant={
                data.status === 'confirmed' || data.status === 'paid' || data.status === 'completed'
                  ? 'success'
                  : data.status === 'pending_admin_review'
                    ? 'warning'
                    : 'secondary'
              }
              size="md"
            >
              {data.status.replace(/_/g, ' ').toUpperCase()}
            </Badge>

            {data.paymentStatus === 'partially_paid' && (
              <Badge
                variant="warning"
                size="md"
                className="bg-amber-500/10 text-amber-500 border border-amber-500/20"
              >
                PARTIALLY PAID
              </Badge>
            )}
            {data.paymentStatus === 'paid' && (
              <Badge variant="outline" size="md" className="text-emerald-500 border-emerald-500/30">
                PAID
              </Badge>
            )}
          </div>

          <PrintReservationButton label={printLabel} />
        </div>
      </div>

      <Card
        variant="flat"
        padding="lg"
        className="space-y-6 print:border-0 print:shadow-none print:p-0 print:m-0 print:bg-white print:text-black"
      >
        {/* Reservation Overview Header */}
        <div className="border-b border-slate-100 dark:border-slate-800 print:border-slate-200 pb-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white print:text-slate-900">
            {data.experienceTitle}
          </h2>
          <span className="text-xs text-slate-500 print:text-slate-600 mt-1 block">
            Departure Date: {data.departureDate}
            {data.endDate && ` • Return: ${data.endDate}`}
            {` • ${data.passengersCount} Passengers`}
            {data.experienceType === 'daily_tour' ? ' • Daily Tour' : ' • Package Tour'}
          </span>
        </div>

        {/* Passenger Manifest Dossier */}
        {data.travelers && data.travelers.length > 0 && (
          <div className="pt-2 border-b border-slate-100 dark:border-slate-800 print:border-slate-200 pb-6 print:pb-4">
            <h3 className="font-bold text-slate-900 dark:text-white print:text-slate-900 uppercase text-xs mb-3 flex items-center gap-2">
              <UsersIcon className="w-4 h-4 text-primary" />
              <span>Passenger Manifest ({data.travelers.length}{' '}
              {data.travelers.length === 1 ? 'Traveler' : 'Travelers'})</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 print:grid-cols-2">
              {data.travelers.map((traveler, idx) => (
                <div
                  key={`traveler-${idx}`}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 print:bg-slate-50 border border-slate-200/80 dark:border-slate-800 print:border-slate-200 flex flex-col justify-between gap-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 print:bg-slate-200 text-slate-700 dark:text-slate-300 print:text-slate-800 text-xs flex items-center justify-center font-bold">
                        {idx + 1}
                      </span>
                      <div>
                        <span className="font-bold text-sm text-slate-900 dark:text-white print:text-slate-900 block">
                          {traveler.firstName} {traveler.lastName}
                        </span>
                        {traveler.nationality && (
                          <span className="text-[11px] text-slate-500 print:text-slate-600 block">
                            Nationality: {traveler.nationality}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {traveler.isLead && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#00aeef]/15 text-[#00aeef] border border-[#00aeef]/30 print:border-slate-300 print:text-slate-800 print:bg-slate-100">
                          <CrownIcon className="w-3 h-3" />
                          Lead
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-200 dark:bg-slate-800 print:bg-slate-200 text-slate-700 dark:text-slate-300 print:text-slate-800">
                        {traveler.type.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Lead Traveler Contact or Masked Passport info */}
                  {(traveler.email || traveler.phone || traveler.passportMasked) && (
                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 print:border-slate-200 text-xs text-slate-600 dark:text-slate-400 print:text-slate-700 flex flex-wrap gap-x-4 gap-y-1">
                      {traveler.email && (
                        <span className="inline-flex items-center gap-1">
                          <MailIcon className="w-3 h-3 opacity-70" />
                          {traveler.email}
                        </span>
                      )}
                      {traveler.phone && (
                        <span className="inline-flex items-center gap-1">
                          <PhoneIcon className="w-3 h-3 opacity-70" />
                          {traveler.phone}
                        </span>
                      )}
                      {traveler.passportMasked && (
                        <span className="inline-flex items-center gap-1">
                          <ShieldCheckIcon className="w-3 h-3 opacity-70" />
                          Passport: {traveler.passportMasked}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Accommodations and Stays (Immutable Snapshot) */}
        {data.stays && data.stays.length > 0 && (
          <div className="pt-2 border-b border-slate-100 dark:border-slate-800 print:border-slate-200 pb-6 print:pb-4">
            <h3 className="font-bold text-slate-900 dark:text-white print:text-slate-900 uppercase text-xs mb-3 flex items-center gap-2">
              <BuildingIcon className="w-4 h-4 text-primary" />
              <span>Hotel Stays and Accommodations</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 print:grid-cols-2">
              {data.stays.map((stay, idx) => (
                <div
                  key={`stay-${idx}`}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 print:bg-slate-50 border border-slate-200/80 dark:border-slate-800 print:border-slate-200 flex items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <BuildingIcon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="truncate">
                      <span className="font-bold text-sm text-slate-900 dark:text-white print:text-slate-900 block truncate">
                        {stay.propertyName}
                      </span>
                      {stay.roomCategory && (
                        <span className="text-xs text-slate-500 dark:text-slate-400 print:text-slate-600 block mt-0.5">
                          Category: {stay.roomCategory}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 print:text-slate-800 print:bg-slate-100 border border-amber-500/20 print:border-slate-300 whitespace-nowrap flex-shrink-0">
                    {stay.nights} {stay.nights === 1 ? 'Night' : 'Nights'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Room Allocation & Layout (Immutable Snapshot) */}
        {data.roomAllocation && data.roomAllocation.length > 0 && (
          <div className="pt-2 border-b border-slate-100 dark:border-slate-800 print:border-slate-200 pb-6 print:pb-4">
            <h3 className="font-bold text-slate-900 dark:text-white print:text-slate-900 uppercase text-xs mb-3 flex items-center gap-2">
              <BedIcon className="w-4 h-4 text-primary" />
              <span>Room Configuration and Layout ({data.roomAllocation.length}{' '}
              {data.roomAllocation.length === 1 ? 'Room' : 'Rooms'})</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 print:grid-cols-3">
              {data.roomAllocation.map((room) => (
                <div
                  key={`room-${room.roomIndex}`}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 print:bg-slate-50 border border-slate-200/80 dark:border-slate-800 print:border-slate-200 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 dark:text-white print:text-slate-900">
                      Room #{room.roomIndex}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 print:bg-slate-100 text-[#00aeef] print:text-slate-800 uppercase">
                      {room.occupancy}
                    </span>
                  </div>
                  <span className="text-xs text-slate-600 dark:text-slate-400 print:text-slate-700">
                    {room.adults} {room.adults === 1 ? 'Adult' : 'Adults'}
                    {room.children > 0 &&
                      ` • ${room.children} ${room.children === 1 ? 'Child' : 'Children'}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Price and Loyalty Summaries */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2 text-sm">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white print:text-slate-900 uppercase text-xs mb-2">
              Price Summary
            </h3>
            <div className="space-y-2 text-slate-600 dark:text-slate-400 print:text-slate-700">
              <div className="flex justify-between items-center">
                <span>Base Price:</span>
                <CurrencyDisplay price={data.basePrice} size="sm" />
              </div>
              {data.loyaltySummary.discountPrice && (
                <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 print:text-emerald-800">
                  <span>Loyalty Discount:</span>
                  <span className="font-bold">-{data.loyaltySummary.discountPrice.formatted}</span>
                </div>
              )}
              <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-800 print:border-slate-200 pt-2 font-semibold text-slate-900 dark:text-white print:text-slate-900">
                <span>Total Cost:</span>
                <CurrencyDisplay price={data.totalCost} size="sm" />
              </div>
              {data.rawPaidAmount > 0 && (
                <div className="flex justify-between items-center">
                  <span>Amount Paid:</span>
                  <CurrencyDisplay price={data.paidAmount} size="sm" />
                </div>
              )}
              {data.rawOutstandingBalance > 0 && (
                <div className="flex justify-between items-center text-amber-600 dark:text-amber-500 print:text-amber-800 font-semibold pt-1">
                  <span>Outstanding Balance:</span>
                  <CurrencyDisplay price={data.outstandingBalance} size="sm" />
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="font-bold text-slate-900 dark:text-white print:text-slate-900 uppercase text-xs mb-2">
              Loyalty Summary
            </h3>
            <div className="space-y-2 text-slate-600 dark:text-slate-400 print:text-slate-700">
              {/* 1. Earning Details */}
              <div className="flex justify-between items-center">
                <span>Points Earned:</span>
                <span className="font-bold text-[#f58220] print:text-slate-800">
                  +{data.loyaltySummary.pointsEarned} pts
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Earning Status:</span>
                <Badge
                  variant={
                    data.loyaltySummary.earningStatus === 'credited'
                      ? 'success'
                      : data.loyaltySummary.earningStatus === 'reversed'
                        ? 'error'
                        : data.loyaltySummary.earningStatus === 'partially_reversed'
                          ? 'warning'
                          : data.loyaltySummary.earningStatus === 'pending'
                            ? 'warning'
                            : 'outline'
                  }
                  size="sm"
                >
                  {data.loyaltySummary.earningStatus.replace(/_/g, ' ').toUpperCase()}
                </Badge>
              </div>

              {/* 2. Redemption Details (if applicable) */}
              {(data.loyaltySummary.pointsRedeemed > 0 ||
                data.loyaltySummary.redemptionStatus !== 'none') && (
                <>
                  <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-800 print:border-slate-200 pt-2">
                    <span>Points Redeemed:</span>
                    <span className="font-bold text-slate-900 dark:text-white print:text-slate-900">
                      -{data.loyaltySummary.pointsRedeemed} pts
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Redemption Status:</span>
                    <Badge
                      variant={
                        data.loyaltySummary.redemptionStatus === 'redeemed'
                          ? 'success'
                          : data.loyaltySummary.redemptionStatus === 'refunded'
                            ? 'outline'
                            : data.loyaltySummary.redemptionStatus === 'partially_refunded'
                              ? 'warning'
                              : data.loyaltySummary.redemptionStatus === 'held'
                                ? 'warning'
                                : 'secondary'
                      }
                      size="sm"
                    >
                      {data.loyaltySummary.redemptionStatus.replace(/_/g, ' ').toUpperCase()}
                    </Badge>
                  </div>
                  {data.loyaltySummary.discountPrice && (
                    <div className="flex justify-between items-center">
                      <span>Loyalty Discount:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 print:text-emerald-800">
                        -{data.loyaltySummary.discountPrice.formatted}
                      </span>
                    </div>
                  )}
                </>
              )}

              {/* 3. Active Hold Details (if hold is active) */}
              {data.loyaltySummary.heldPoints > 0 && (
                <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-800 print:border-slate-200 pt-2 text-amber-600 dark:text-amber-500 print:text-amber-800 font-semibold">
                  <span>Active Points Held:</span>
                  <span>{data.loyaltySummary.heldPoints} pts</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pickup and Meeting Location */}
        {data.pickupLocation && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 print:border-slate-200">
            <h3 className="font-bold text-slate-900 dark:text-white print:text-slate-900 uppercase text-xs mb-2 flex items-center gap-1.5">
              <PinIcon className="w-4 h-4 text-primary" />
              <span>Pickup and Meeting Location</span>
            </h3>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 print:bg-slate-50 border border-slate-200/80 dark:border-slate-800 print:border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
              <div>
                <span className="font-bold text-slate-900 dark:text-white print:text-slate-900 block">
                  {data.pickupLocation.label}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 print:text-slate-600 block mt-0.5">
                  {data.pickupLocation.address}
                </span>
                {data.pickupLocation.instructions && (
                  <p className="text-xs text-amber-700 dark:text-amber-400 print:text-amber-900 bg-amber-50 dark:bg-amber-950/40 print:bg-amber-50 px-2.5 py-1 rounded-md mt-2 border border-amber-200/50 dark:border-amber-800/40 print:border-amber-200">
                    <span className="font-semibold">Driver Note:</span>{' '}
                    {data.pickupLocation.instructions}
                  </p>
                )}
              </div>
              {data.pickupLocation.latitude && data.pickupLocation.longitude && (
                <a
                  href={`https://www.google.com/maps?q=${data.pickupLocation.latitude},${data.pickupLocation.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-[#00aeef] hover:underline whitespace-nowrap self-start sm:self-center print:text-slate-600"
                >
                  View on Map ↗
                </a>
              )}
            </div>
          </div>
        )}

        {/* Print Reservation Confirmation Action */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 print:hidden">
          <PrintReservationButton label={printLabel} />
        </div>
      </Card>
    </div>
  )
}
