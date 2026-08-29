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

export class AuthenticationFailedException extends DomainException {
  constructor(message: string = 'Invalid email or password', code: string = 'INVALID_CREDENTIALS', statusCode: number = 401) {
    super(message, code, statusCode)
  }
}

export class AccountLockedException extends DomainException {
  constructor(message: string = 'Account is temporarily locked. Please try again later.') {
    super(message, 'ACCOUNT_LOCKED', 429)
  }
}

export class AccountSuspendedException extends DomainException {
  constructor(message: string = 'Your account has been suspended. Please contact support.') {
    super(message, 'ACCOUNT_SUSPENDED', 403)
  }
}

export class AccountDeletedException extends DomainException {
  constructor(message: string = 'This account has been deleted.') {
    super(message, 'ACCOUNT_DELETED', 403)
  }
}

export class EmailNotVerifiedException extends DomainException {
  constructor(message: string = 'Please verify your email address before logging in.') {
    super(message, 'EMAIL_NOT_VERIFIED', 403)
  }
}

export class CustomerNotFoundException extends DomainException {
  constructor(messageOrId: number | string = 'Customer was not found.') {
    const msg = typeof messageOrId === 'number' || !isNaN(Number(messageOrId))
      ? `Customer #${messageOrId} was not found.`
      : String(messageOrId)
    super(msg, 'CUSTOMER_NOT_FOUND', 404)
  }
}

export class FinancialInvariantException extends DomainException {
  constructor(message: string = 'Financial invariant violation.') {
    super(message, 'FINANCIAL_INVARIANT_VIOLATION', 400)
  }
}



