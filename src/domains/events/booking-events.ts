import type { BookingAggregate, Actor } from '../booking/types'
import type { BaseDomainEvent } from './event-bus'

export interface BookingCreatedEvent extends BaseDomainEvent {
  type: 'BOOKING_CREATED'
  booking: BookingAggregate
  actor: Actor
}

export interface BookingPaidEvent extends BaseDomainEvent {
  type: 'BOOKING_PAID'
  booking: BookingAggregate
  actor: Actor
}

export interface BookingConfirmedEvent extends BaseDomainEvent {
  type: 'BOOKING_CONFIRMED'
  booking: BookingAggregate
  actor: Actor
}

export interface BookingCancelledEvent extends BaseDomainEvent {
  type: 'BOOKING_CANCELLED'
  booking: BookingAggregate
  actor: Actor
  reason: string
}

export interface BookingCompletedEvent extends BaseDomainEvent {
  type: 'BOOKING_COMPLETED'
  booking: BookingAggregate
  actor: Actor
}

export interface BookingPendingAdminReviewEvent extends BaseDomainEvent {
  type: 'BOOKING_PENDING_ADMIN_REVIEW'
  booking: BookingAggregate
  actor: Actor
}

export type DomainEvent =
  | BookingCreatedEvent
  | BookingPaidEvent
  | BookingConfirmedEvent
  | BookingCancelledEvent
  | BookingCompletedEvent
  | BookingPendingAdminReviewEvent


