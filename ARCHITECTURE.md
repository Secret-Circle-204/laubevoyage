# L'Aube Voyage - Architecture Documentation

## Architecture Philosophy

This project follows **Clean Architecture** principles with strict **Domain-Driven Design**.

### Core Principles

1. **Single Source of Truth**: Every business rule exists in exactly ONE location
2. **Domain Isolation**: Each domain is independent and self-contained
3. **No Business Logic in UI**: Pages, components, and API routes contain ZERO business logic
4. **Service-Oriented**: All operations flow through domain services

## Project Structure

```
src/
├── domains/              # Business Logic Layer (Core)
│   ├── booking/         # Booking lifecycle management
│   ├── currency/        # Currency conversion
│   ├── destination/     # Countries, Cities, Experiences
│   ├── loyalty/         # Points and tier management
│   ├── user/           # User lifecycle
│   ├── payment/        # Payment processing (TODO)
│   ├── notification/   # Multi-channel notifications (TODO)
│   └── index.ts        # Service factory
├── collections/         # Payload CMS collections (Data Layer)
├── app/                # Next.js routes (Presentation Layer)
│   ├── api/           # API endpoints (thin layer)
│   └── (frontend)/    # Frontend pages (thin layer)
└── types/             # Shared TypeScript types
```

## Domain Architecture

### 1. Destination Domain

**Hierarchy:**
```
Destination
  └── Country
      └── City
          └── Experience
              ├── Package
              └── Daily Tour
```

**Services:**
- `getCountries()` - List all active countries
- `getCity()` - Get city by slug
- `getExperiencesByCity()` - Filter experiences by city
- `searchExperiences()` - Full-text search
- `getFeaturedExperiences()` - Homepage featured items

**Data:**
- Countries (name, slug, hero, gallery, SEO)
- Cities (name, country relation, hero, gallery)
- Experiences (title, type, price in EGP, duration, included/excluded)

### 2. Booking Domain

**The Most Critical Domain**

**Status Flow:**
```
DRAFT → PENDING_PAYMENT → PAID → CONFIRMED → COMPLETED
                ↓                    ↓
            CANCELLED            CANCELLED
                ↓                    ↓
            REFUNDED             REFUNDED
```

**CRITICAL RULE:** Only `BookingService` can change booking status

**Services:**
- `create()` - Create draft booking
- `confirm()` - Confirm after payment
- `cancel()` - Cancel and handle refunds
- `complete()` - Mark trip as completed

**Business Rules:**
- Points redemption calculated at creation
- Points earned only on confirmation
- Cancellation triggers point refund/reversal
- No direct status updates allowed

### 3. Loyalty Domain

**Point Ledger System** (Immutable)

**Source of Truth:** `PointLedger` collection (not `User.loyalty.points`)

**Transaction Types:**
- `earned` - From completed bookings
- `redeemed` - Used for booking discounts
- `refunded` - Restored after cancellation
- `reversed` - Earned points reversed
- `bonus` - Manual grants
- `tier_upgrade` - Tier achievement bonus
- `welcome_bonus` - New user bonus (100 points)

**Tier System:**
```
Explorer  → 0 EGP      → 100 bonus  → 1.0x earn rate
Voyager   → 5,000 EGP  → 500 bonus  → 1.2x earn rate
Elite     → 15,000 EGP → 1,000 bonus → 1.5x earn rate
```

**Services:**
- `earn()` - Add points (single entry point)
- `redeem()` - Spend points
- `refund()` - Restore points
- `reverse()` - Remove earned points
- `evaluateTier()` - Check and upgrade tier
- `getBalance()` - Calculate from ledger

**Critical Rule:** NO direct database writes. Only through `LoyaltyService`.

### 4. Currency Domain

**Base Currency:** EGP (Egyptian Pound)

All prices stored in EGP, converted on-demand.

**Supported Currencies:**
- EGP (base)
- USD
- EUR
- AED
- SAR

**Services:**
- `convert()` - Currency conversion
- `getRate()` - Fetch exchange rate (cached 1 hour)
- `pointsToCurrency()` - Convert points to money (1 point = 0.5 EGP)

### 5. User / Customer Domain

This domain is architecturally separated into two distinct collections:
1. **Customers** (slug: `'customers'`): Traveler profiles with loyalty points, preferences, bookings, reviews, and post-create registration hooks.
2. **Users** (slug: `'users'`): Admin/Staff members who manage the portal via Payload Admin panel with administrative roles (`admin`, `super_admin`). They do not have loyalty records or personal bookings.

**Customer Journey:**
```
Register → Verify Email (Hook: Grant Welcome Bonus) → Active
```

**Services:**
- `UserService.register()` - Create customer profile
- `UserService.verifyEmail()` - Activate customer account
- `UserService.getProfile()` - Get customer with real-time points
- `UserService.updateProfile()` - Update customer preferences

**Customer Data:**
- Basic info (name, email, phone)
- Status (active, suspended, pending_verification)
- Loyalty (tier, points cache, total spent)
- Preferences (locale, currency, notifications)

## Data Flow Rules

### Example: Booking Confirmation Flow

```
1. PaymentService receives webhook
2. PaymentService calls BookingService.markAsPaid()
3. BookingService transitions to PAID
4. BookingService calls BookingService.confirm()
5. BookingService:
   - Validates status transition
   - Calls LoyaltyService.redeem() if points used
   - Calculates earned points
   - Calls LoyaltyService.earn()
   - Updates User.loyalty.totalSpent
   - Calls LoyaltyService.evaluateTier()
   - Updates booking status to CONFIRMED
6. NotificationService sends confirmation email
```

### Critical Rules

❌ **NEVER:**
- Update `Bookings` status directly
- Update `PointLedger` directly
- Update `User.loyalty.points` directly
- Put business logic in API routes
- Put business logic in React components
- Copy logic between services

✅ **ALWAYS:**
- Use domain services for ALL operations
- Validate state transitions
- Use Point Ledger as source of truth
- Keep API routes thin (just call services)
- Keep UI components logic-free

## API Layer

API routes are **thin wrappers** around domain services:

```typescript
// ❌ BAD - Business logic in API route
export async function POST(request: NextRequest) {
  const booking = await payload.update({
    collection: 'bookings',
    id: bookingId,
    data: { status: 'confirmed' } // WRONG!
  })
}

// ✅ GOOD - Delegate to service
export async function POST(request: NextRequest) {
  const services = getDomainServices(payload)
  await services.booking.confirm(bookingId, paymentId)
}
```

## Testing Strategy

1. **Unit Tests**: Test each service method independently
2. **Integration Tests**: Test service interactions
3. **E2E Tests**: Test complete user flows

## Future Domains

- **Payment Domain**: Stripe, BNPL integration
- **Notification Domain**: Email, SMS, Push, WhatsApp
- **Translation Domain**: Auto-translate with caching
- **Dashboard Domain**: Customer portal
- **Maintenance Domain**: Cron jobs, cleanup
- **Administration Domain**: Admin operations

## Technology Stack

- **Framework**: Next.js 15 (App Router)
- **CMS**: Payload CMS 3.0
- **Database**: PostgreSQL
- **Language**: TypeScript (strict mode)
- **Auth**: Payload Auth + JWT

## Development Commands

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Generate types
pnpm generate:types

# Run tests
pnpm test
```

## Environment Variables

```env
DATABASE_URL=postgresql://...
PAYLOAD_SECRET=...
NEXT_PUBLIC_SERVER_URL=http://localhost:3000
```
