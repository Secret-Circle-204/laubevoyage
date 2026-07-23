export class DomainException extends Error {
  public readonly code: string
  public readonly statusCode: number

  constructor(message: string, code: string = 'DOMAIN_ERROR', statusCode: number = 400) {
    super(message)
    this.name = 'DomainException'
    this.code = code
    this.statusCode = statusCode
  }
}

export class BookingNotFoundException extends DomainException {
  constructor(bookingId: number | string) {
    super(`Booking #${bookingId} was not found.`, 'BOOKING_NOT_FOUND', 404)
  }
}

export class InsufficientPointsException extends DomainException {
  constructor(required: number, available: number) {
    super(`Insufficient loyalty points. Required: ${required}, Available: ${available}.`, 'INSUFFICIENT_POINTS', 400)
  }
}

export class UnauthorizedDomainException extends DomainException {
  constructor(reason: string = 'Unauthorized domain operation.') {
    super(reason, 'UNAUTHORIZED', 403)
  }
}
