import type { Payload } from 'payload'
import { EventBus } from '../event-bus'
import type { TierUpgradedEvent, LoyaltyEarnedEvent } from '../loyalty-events'
import { CustomerRepository } from '../../customer/repository'
import { NotificationService } from '../../notification/service'
import { PayloadInboxRepository } from '../repositories/payload-inbox-repository'
import type { CustomerService } from '../../customer/service'
import type { LoyaltyService } from '../../loyalty/service'
import type { PricingFacade } from '../../currency/facade'
import { PointCalculationPolicy } from '../../loyalty/points-calculation-policy'

/**
 * Loyalty Notification Subscriber
 * Listens to TierUpgradedEvent and LoyaltyEarnedEvent to enqueue notification jobs idempotently.
 * Atomic Inbox Guard protected for Exactly-Once processing & Fail-Fast recipient validation.
 */
export function registerLoyaltyNotificationSubscriber(
  payload: Payload,
  customerService: CustomerService,
  notificationService: NotificationService,
  loyaltyService?: LoyaltyService,
  pricingFacade?: PricingFacade,
): void {
  const eventBus = EventBus.getInstance()
  const inboxRepo = new PayloadInboxRepository(payload)
  const customerRepository = new CustomerRepository(payload)

  // 1. TIER_UPGRADED Event -> Enqueue tier upgrade notification
  eventBus.subscribe<TierUpgradedEvent>(
    'TIER_UPGRADED',
    'LoyaltyNotificationSubscriber.enqueueTierUpgradeNotification',
    async (event) => {
      const subscriberName = 'LoyaltyNotificationSubscriber.enqueueTierUpgradeNotification'
      if (!event.eventId) {
        throw new Error('[LoyaltyNotificationSubscriber] TierUpgradedEvent missing required eventId.')
      }

      const transactionID = await payload.db.beginTransaction()
      const req = { transactionID } as any
      try {
        const acquired = await inboxRepo.tryAcquire(event.eventId, subscriberName, req)
        if (!acquired) {
          if (transactionID) await payload.db.rollbackTransaction(transactionID)
          return
        }

        const customer = await customerRepository.findById(Number(event.customerId), req)
        if (!customer || !customer.email) {
          throw new Error(
            `[LoyaltyNotificationSubscriber] Customer #${event.customerId} not found or missing email for tier upgrade notification.`,
          )
        }

        await notificationService.enqueueNotification(
          {
            referenceType: 'LOYALTY_TIER',
            referenceId: `${event.customerId}_${event.newTier}`,
            recipient: customer.email,
            channel: 'email',
            category: 'loyalty',
            priority: 'normal',
            templateId: 'tier_upgraded',
            translationKey: 'loyalty.tier_upgraded',
            templateData: {
              customerId: event.customerId,
              newTier: event.newTier,
              bonusGranted: event.bonusGranted,
            },
          },
          req,
        )

        if (transactionID) await payload.db.commitTransaction(transactionID)
      } catch (err: unknown) {
        if (transactionID) await payload.db.rollbackTransaction(transactionID)
        console.error(
          `[LoyaltyNotificationSubscriber] TIER_UPGRADED transaction failed for event ${event.eventId}:`,
          err,
        )
        throw err
      }
    },
  )

  // 2. LOYALTY_EARNED Event -> Enqueue points earned notification (Email #2 in 2-Email Customer Model)
  eventBus.subscribe<LoyaltyEarnedEvent>(
    'LOYALTY_EARNED',
    'LoyaltyNotificationSubscriber.enqueueLoyaltyEarnedNotification',
    async (event) => {
      const subscriberName = 'LoyaltyNotificationSubscriber.enqueueLoyaltyEarnedNotification'
      if (!event.eventId) {
        throw new Error('[LoyaltyNotificationSubscriber] LoyaltyEarnedEvent missing required eventId.')
      }

      // Welcome bonus points are communicated in the consolidated Welcome Email
      if (event.source === 'welcome_bonus') {
        return
      }

      const transactionID = await payload.db.beginTransaction()
      const req = { transactionID } as any
      try {
        const acquired = await inboxRepo.tryAcquire(event.eventId, subscriberName, req)
        if (!acquired) {
          if (transactionID) await payload.db.rollbackTransaction(transactionID)
          return
        }

        const customer = await customerRepository.findById(Number(event.customerId), req)
        if (!customer || !customer.email) {
          throw new Error(
            `[LoyaltyNotificationSubscriber] Customer #${event.customerId} not found or missing email for loyalty points notification.`,
          )
        }

        // 1. Resolve customer localization preferences
        const preferredLanguage = customer.preferredLanguage || 'en'
        const preferredCurrency = customer.preferredCurrency || 'EGP'

        // 2. Resolve booking reference if available
        let bookingNumber: string | undefined
        if (event.bookingId) {
          try {
            const bookingDoc = (await payload.findByID({
              collection: 'bookings',
              id: event.bookingId,
              depth: 0,
              req,
            })) as any
            if (bookingDoc?.bookingNumber) {
              bookingNumber = bookingDoc.bookingNumber
            }
          } catch (bErr) {
            console.warn(
              `[LoyaltyNotificationSubscriber] Could not resolve bookingNumber for bookingId #${event.bookingId}:`,
              bErr,
            )
          }
        }

        // 3. Resolve authoritative monetary equivalent using Loyalty + Currency architecture
        let baseValueEGP = 0
        if (loyaltyService) {
          try {
            baseValueEGP = await loyaltyService.calculatePointValueInEGP(event.points)
          } catch {
            baseValueEGP = PointCalculationPolicy.calculatePointsValueEGP(event.points, {
              redemptionPointsUnit: 100,
              redemptionValueEGP: 10,
            } as any)
          }
        } else {
          baseValueEGP = PointCalculationPolicy.calculatePointsValueEGP(event.points, {
            redemptionPointsUnit: 100,
            redemptionValueEGP: 10,
          } as any)
        }

        let monetaryValueFormatted: string | undefined
        if (pricingFacade && baseValueEGP > 0) {
          try {
            const converted = await pricingFacade.getConvertedPrice(
              baseValueEGP,
              preferredCurrency,
              preferredLanguage,
            )
            monetaryValueFormatted = converted.formatted
          } catch {
            monetaryValueFormatted = `${baseValueEGP.toLocaleString()} EGP`
          }
        } else if (baseValueEGP > 0) {
          monetaryValueFormatted = `${baseValueEGP.toLocaleString()} EGP`
        }

        // 4. Actionable CTA URL to Member Rewards Vault
        const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL?.replace(/\/$/, '') || 'https://laubevoyage.com'
        const ctaUrl = `${serverUrl}/dashboard/loyalty`

        await notificationService.enqueueNotification(
          {
            referenceType: 'LOYALTY_EARN',
            referenceId: event.eventId,
            recipient: customer.email,
            channel: 'email',
            category: 'loyalty',
            priority: 'normal',
            templateId: 'loyalty_earned',
            translationKey: 'loyalty.points_earned',
            templateData: {
              customerId: event.customerId,
              customerName: customer.fullName || 'Valued Member',
              locale: preferredLanguage,
              currency: preferredCurrency,
              points: event.points,
              balance: event.balance,
              bookingId: event.bookingId,
              bookingNumber,
              monetaryValueFormatted,
              ctaUrl,
            },
          },
          req,
        )

        if (transactionID) await payload.db.commitTransaction(transactionID)
      } catch (err: unknown) {
        if (transactionID) await payload.db.rollbackTransaction(transactionID)
        console.error(
          `[LoyaltyNotificationSubscriber] LOYALTY_EARNED transaction failed for event ${event.eventId}:`,
          err,
        )
        throw err
      }
    },
  )
}
