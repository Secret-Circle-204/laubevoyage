import type { BookingAggregate, Actor } from '../booking/types'

export interface BookingCreatedEvent {
  type: 'BOOKING_CREATED'
  booking: BookingAggregate
  actor: Actor
  timestamp: string
}

export interface BookingPaidEvent {
  type: 'BOOKING_PAID'
  booking: BookingAggregate
  actor: Actor
  timestamp: string
}

export interface BookingConfirmedEvent {
  type: 'BOOKING_CONFIRMED'
  booking: BookingAggregate
  actor: Actor
  timestamp: string
}

export interface BookingCancelledEvent {
  type: 'BOOKING_CANCELLED'
  booking: BookingAggregate
  actor: Actor
  reason: string
  timestamp: string
}

export interface BookingCompletedEvent {
  type: 'BOOKING_COMPLETED'
  booking: BookingAggregate
  actor: Actor
  timestamp: string
}

export interface BookingExpiredEvent {
  type: 'BOOKING_EXPIRED'
  booking: BookingAggregate
  reason: string
  timestamp: string
}

export type DomainEvent =
  | BookingCreatedEvent
  | BookingPaidEvent
  | BookingConfirmedEvent
  | BookingCancelledEvent
  | BookingCompletedEvent
  | BookingExpiredEvent
