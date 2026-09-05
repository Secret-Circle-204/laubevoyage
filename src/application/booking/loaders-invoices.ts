import { getDomainServices } from '@/domains/factory'
import { BookingStatus } from '@/types'
import type { BookingAggregate, BookingUserFilter, PaymentAttempt } from '@/domains/booking/types'
import type { ConvertedPrice } from '@/domains/currency/types'
import type { ExperienceType, DepartureSlotEntity } from '@/domains/experience/types'
import type { CustomerInvoicesPortalDTO, CustomerInvoiceItemDTO, PaymentReceiptDTO } from './dto-invoices'

export class CustomerInvoicesLoader {
  static async load(
    customerId: number,
    options?: {
      page?: number
      limit?: number
      status?: string
      locale?: string
      currency?: string
    },
  ): Promise<CustomerInvoicesPortalDTO> {
    try {
      const { booking, experience, destination, localization } = await getDomainServices()
      const ctx = await localization.buildContext({
        cookieLocale: options?.locale,
        cookieCurrency: options?.currency,
      })

      // 1. Strict Pagination Limits: Page >= 1, Limit clamped between 1 and 20 (default 10)
      const page = Math.max(1, Number(options?.page) || 1)
      const limit = Math.min(20, Math.max(1, Number(options?.limit) || 10))

      // 2. Map presentation status filter to authoritative database query filter (Orthogonal Axes)
      const rawStatus = options?.status?.toLowerCase().trim()
      let repoFilter: BookingUserFilter | undefined = undefined

      if (rawStatus === 'paid') {
        // Only fully paid records
        repoFilter = { paymentStatus: 'paid' }
      } else if (
        rawStatus === 'pending_payment' ||
        rawStatus === 'outstanding' ||
        rawStatus === 'partial'
      ) {
        // Outstanding/partial records: includes CONFIRMED, COMPLETED, PENDING_PAYMENT with partially_paid/unpaid
        repoFilter = {
          paymentStatus: ['partially_paid', 'unpaid'],
          statusNotIn: [BookingStatus.CANCELLED, BookingStatus.REFUNDED],
          paymentStatusNotIn: ['refunded', 'partially_refunded'],
        }
      } else if (rawStatus === 'cancelled' || rawStatus === 'refunded') {
        // Operational cancellation/refund OR financial refunded/partially_refunded
        repoFilter = {
          or: [
            { status: { in: [BookingStatus.CANCELLED, BookingStatus.REFUNDED] } },
            { paymentStatus: { in: ['refunded', 'partially_refunded'] } },
          ],
        }
      }

      // 3. Native Database Server-Side Pagination Query ($O(1) Memory)
      const bookingsResult = await booking.getUserBookings(customerId, page, limit, repoFilter)
      const paginatedBookings = bookingsResult.data || []
      const total = bookingsResult.total || 0
      const totalPages = bookingsResult.totalPages || 1

      if (paginatedBookings.length === 0) {
        return {
          invoices: [],
          total,
          page,
          totalPages,
          limit,
          currentStatus: rawStatus,
        }
      }

      // 4. Batch-Resolve matching experiences (Single Query - Eliminates N+1)
      const uniqueExperienceIds = Array.from(
        new Set(
          paginatedBookings
            .map((b: BookingAggregate) => b.experienceId)
            .filter((id: number | undefined): id is number => typeof id === 'number'),
        ),
      )
      const experiences =
        uniqueExperienceIds.length > 0 ? await experience.getManyByIds(uniqueExperienceIds) : []
      const experiencesMap = new Map(experiences.map((e) => [e.id, e]))

      // 5. Batch-Resolve matching departure slots for fixed-date/package departures (Single Query)
      const uniqueSlotIds = Array.from(
        new Set(
          paginatedBookings
            .map((b: BookingAggregate) => b.departureSlot)
            .filter((id: number | undefined): id is number => typeof id === 'number'),
        ),
      )
      const slotsList =
        uniqueSlotIds.length > 0 ? await experience.getDepartureSlotsByIds(uniqueSlotIds) : []
      const slotsMap = new Map(
        slotsList
          .filter((s): s is DepartureSlotEntity => s !== null && s !== undefined)
          .map((s) => [Number(s.id), s]),
      )

      // 6. Batch-Resolve matching cities from Destination Domain (Single Query)
      const uniqueCityIds = Array.from(
        new Set(
          Array.from(experiencesMap.values())
            .map((e) => e.cityId)
            .filter((id: number | undefined): id is number => typeof id === 'number' && id > 0),
        ),
      )
      const citiesList =
        uniqueCityIds.length > 0 ? await destination.getCitiesByIds(uniqueCityIds) : []
      const citiesMap = new Map(
        citiesList
          .filter((c): c is NonNullable<typeof c> => c !== null && c !== undefined)
          .map((c) => [Number(c.id), c]),
      )

      // 7. Map Booking Aggregates to Enriched Customer Financial Document DTOs
      const invoiceItems: CustomerInvoiceItemDTO[] = await Promise.all(
        paginatedBookings.map(async (b: BookingAggregate) => {
          const exp = experiencesMap.get(b.experienceId)
          const snap = b.pricingSnapshot
          const isCancelled = b.status === BookingStatus.CANCELLED
          const rate = snap?.exchangeRate || 1

          // Service / Product Type and Labels (Zero Invented Defaults)
          let productType: ExperienceType | undefined = undefined
          let productTypeLabel: string | undefined = undefined
          if (exp?.type) {
            productType = exp.type
            productTypeLabel =
              exp.type === 'package'
                ? localization.translateUiKey('catalog.packageLabel', ctx)
                : localization.translateUiKey('catalog.dailyTourLabel', ctx)
          }

          // Authoritative Destination City Resolution via Destination Domain
          let destinationCity: string | undefined = undefined
          if (exp?.cityId && citiesMap.has(exp.cityId)) {
            const cityDoc = citiesMap.get(exp.cityId)
            if (cityDoc) {
              const cityName = String(cityDoc.name || '')
              const countryObj = cityDoc.country
              const countryName =
                countryObj && typeof countryObj === 'object' && 'name' in countryObj && countryObj.name
                  ? String(countryObj.name)
                  : ''
              destinationCity =
                cityName && countryName ? `${cityName}, ${countryName}` : (cityName || countryName || undefined)
            }
          }

          // Duration (Zero Invented Defaults)
          let durationText: string | undefined = undefined
          if (exp?.type === 'package' && exp.duration?.days) {
            const days = exp.duration.days
            const nights = exp.duration.nights
            durationText = nights !== undefined ? `${days} Days / ${nights} Nights` : `${days} Days`
          } else if (exp?.type === 'daily_tour' && exp.duration?.durationMinutes) {
            const mins = exp.duration.durationMinutes
            const hours = mins / 60
            durationText = Number.isInteger(hours) ? `${hours} Hours` : `${mins} Mins`
          }

          // Authoritative Departure Time Resolution (Slot Precedence > Schedule > Undefined)
          let departureTime: string | undefined = undefined
          if (b.departureSlot && slotsMap.has(b.departureSlot)) {
            departureTime = slotsMap.get(b.departureSlot)?.startTime
          } else if (exp?.schedules && exp.schedules.length > 0 && exp.schedules[0].startTime) {
            departureTime = exp.schedules[0].startTime
          }

          // Lead Traveler Name
          const leadTraveler = b.travelers?.[0]
          const leadTravelerName = leadTraveler
            ? `${leadTraveler.firstName} ${leadTraveler.lastName}`.trim()
            : 'Lead Passenger'

          // Price and Discount Formatting (Follows BookingDetailsLoader / LocalizationSSOT Contract)
          const baseEGP = snap?.basePriceEGP || 0
          const loyaltyDiscountEGP = snap?.loyaltyDiscountEGP || 0
          const promoDiscountEGP = snap?.promotionDiscountEGP || 0
          const totalEGP = snap?.totalAmountEGP || snap?.subtotalEGP || snap?.basePriceEGP || 0
          const paidEGP = b.amountPaid ?? 0
          const outstandingEGP = isCancelled ? 0 : (b.outstandingBalance ?? 0)

          let formattedBasePrice: ConvertedPrice
          let formattedLoyaltyDiscount: ConvertedPrice | undefined = undefined
          let formattedPromoDiscount: ConvertedPrice | undefined = undefined
          let formattedTotal: ConvertedPrice
          let formattedPaid: ConvertedPrice
          let formattedOutstanding: ConvertedPrice

          if (snap && snap.displayAmount !== undefined && snap.displayCurrency) {
            formattedBasePrice = await localization.formatAlreadyConvertedPrice(
              baseEGP * rate,
              baseEGP,
              snap.displayCurrency,
              rate,
              ctx,
            )
            if (loyaltyDiscountEGP > 0) {
              formattedLoyaltyDiscount = await localization.formatAlreadyConvertedPrice(
                loyaltyDiscountEGP * rate,
                loyaltyDiscountEGP,
                snap.displayCurrency,
                rate,
                ctx,
              )
            }
            if (promoDiscountEGP > 0) {
              formattedPromoDiscount = await localization.formatAlreadyConvertedPrice(
                promoDiscountEGP * rate,
                promoDiscountEGP,
                snap.displayCurrency,
                rate,
                ctx,
              )
            }
            const displayPaid =
              snap.totalAmountEGP && paidEGP === snap.totalAmountEGP && snap.displayAmount !== undefined
                ? snap.displayAmount
                : paidEGP * rate
            const displayOutstanding =
              isCancelled || outstandingEGP === 0
                ? 0
                : snap.totalAmountEGP && outstandingEGP === snap.totalAmountEGP && snap.displayAmount !== undefined
                ? snap.displayAmount
                : outstandingEGP * rate

            formattedTotal = await localization.formatAlreadyConvertedPrice(
              snap.displayAmount,
              totalEGP,
              snap.displayCurrency,
              rate,
              ctx,
            )
            formattedPaid = await localization.formatAlreadyConvertedPrice(
              displayPaid,
              paidEGP,
              snap.displayCurrency,
              rate,
              ctx,
            )
            formattedOutstanding =
              isCancelled || outstandingEGP === 0
                ? await localization.formatAlreadyConvertedPrice(
                    0,
                    0,
                    snap.displayCurrency,
                    rate,
                    ctx,
                  )
                : await localization.formatAlreadyConvertedPrice(
                    displayOutstanding,
                    outstandingEGP,
                    snap.displayCurrency,
                    rate,
                    ctx,
                  )
          } else {
            formattedBasePrice = await localization.formatPrice(baseEGP, ctx)
            if (loyaltyDiscountEGP > 0) {
              formattedLoyaltyDiscount = await localization.formatPrice(loyaltyDiscountEGP, ctx)
            }
            if (promoDiscountEGP > 0) {
              formattedPromoDiscount = await localization.formatPrice(promoDiscountEGP, ctx)
            }
            formattedTotal = await localization.formatPrice(totalEGP, ctx)
            formattedPaid = await localization.formatPrice(paidEGP, ctx)
            formattedOutstanding = await localization.formatPrice(isCancelled ? 0 : outstandingEGP, ctx)
          }

          // Format individual successful payment attempts into receipts
          const successfulAttempts = (b.paymentAttempts || []).filter((a) => a.status === 'successful')
          const receipts: PaymentReceiptDTO[] = await Promise.all(
            successfulAttempts.map(async (att: PaymentAttempt) => {
              const attAmount = att.amount || 0
              let receiptAmount: ConvertedPrice
              if (snap && snap.displayCurrency && attAmount === totalEGP && snap.displayAmount !== undefined) {
                receiptAmount = await localization.formatAlreadyConvertedPrice(
                  snap.displayAmount,
                  attAmount,
                  snap.displayCurrency,
                  rate,
                  ctx,
                )
              } else if (snap && snap.displayCurrency && rate) {
                receiptAmount = await localization.formatAlreadyConvertedPrice(
                  attAmount * rate,
                  attAmount,
                  snap.displayCurrency,
                  rate,
                  ctx,
                )
              } else {
                receiptAmount = await localization.formatPrice(attAmount, ctx)
              }

              const receiptDate = att.timestamp
                ? localization.formatDate(att.timestamp, ctx)
                : localization.formatDate(b.createdAt, ctx)

              let providerLabel = 'Direct Payment'
              if (att.provider === 'stripe') {
                providerLabel = 'Credit / Debit Card (Stripe)'
              } else if (att.provider === 'bnpl') {
                providerLabel = 'Installments (BNPL)'
              } else if (att.provider === 'manual') {
                providerLabel = 'Direct / Bank Transfer'
              } else if (att.provider === 'points') {
                providerLabel = 'Loyalty Points Redemption'
              }

              return {
                attemptId: att.attemptId,
                attemptNumber: att.attemptNumber,
                amount: receiptAmount,
                provider: providerLabel,
                status: att.status,
                transactionReference: att.transactionReference,
                date: receiptDate,
              }
            }),
          )

          // Determine payment financing method cleanly from payment attempts
          let paymentPlan = 'Direct Payment'
          if (b.paymentAttempts?.some((a) => a.provider === 'bnpl')) {
            paymentPlan = 'Buy Now Pay Later (BNPL)'
          } else if (b.paymentAttempts?.some((a) => a.provider === 'stripe')) {
            paymentPlan = 'Credit / Debit Card (Stripe)'
          } else if (b.paymentAttempts?.some((a) => a.provider === 'manual')) {
            paymentPlan = 'Direct / Bank Transfer'
          } else if (b.paymentAttempts?.some((a) => a.provider === 'points')) {
            paymentPlan = 'Loyalty Points Redemption'
          } else if (b.paymentStatus === 'unpaid') {
            paymentPlan = 'Pending Payment'
          }

          const formattedDate = localization.formatDate(b.createdAt, ctx)

          return {
            id: b.bookingNumber,
            bookingNumber: b.bookingNumber,
            bookingId: b.id,
            title: exp?.title || `Trip #${b.bookingNumber}`,
            productType,
            productTypeLabel,
            destinationCity,
            durationText,
            departureDate: b.startDate,
            departureTime,
            endDate: b.endDate !== b.startDate ? b.endDate : undefined,
            destinationTimezone: b.destinationTimezone,
            leadTravelerName,
            passengersCount: b.travelers?.length || 1,
            bookingStatus: b.status,
            paymentStatus: b.paymentStatus || 'unpaid',
            basePrice: formattedBasePrice,
            loyaltyDiscount: formattedLoyaltyDiscount,
            promoDiscount: formattedPromoDiscount,
            totalAmount: formattedTotal,
            paidAmount: formattedPaid,
            outstandingBalance: formattedOutstanding,
            isCancelled,
            paymentPlan,
            receipts,
            date: formattedDate,
          }
        }),
      )

      return {
        invoices: invoiceItems,
        total,
        page,
        totalPages,
        limit,
        currentStatus: rawStatus,
      }
    } catch (err) {
      console.error(`[CustomerInvoicesLoader] Failed loading invoices for customer #${customerId}:`, err)
      throw err
    }
  }
}
