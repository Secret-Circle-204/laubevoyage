# Development Guide

## Getting Started

### 1. First Time Setup

```bash
# Clone and install
pnpm install

# Setup environment
cp .env.example .env
# Edit .env with your PostgreSQL credentials

# Generate types
pnpm generate:types

# Run migrations
# pnpm db:migrate

# Seed database
pnpm seed

# Start dev server
pnpm dev
```

Visit `http://localhost:3000/admin` and login with:

- Email: `admin@laubevoyage.com`
- Password: `Admin@123`

### 2. Daily Development Workflow

```bash
# Start development
pnpm dev

# In another terminal, watch for type changes
pnpm generate:types --watch

# Run tests while developing
pnpm test --watch
```

## Architecture Rules

### ❌ NEVER DO THIS

```typescript
// ❌ Business logic in API route
export async function POST(request: NextRequest) {
  const booking = await payload.update({
    collection: 'bookings',
    id: bookingId,
    data: { status: 'confirmed' },
  })

  // Update points directly
  await payload.update({
    collection: 'users',
    id: userId,
    data: { loyalty: { points: newPoints } },
  })
}

// ❌ Business logic in React component
function BookingButton() {
  const handleBook = async () => {
    // Direct database update
    await fetch('/api/bookings', {
      method: 'POST',
      body: JSON.stringify({ status: 'confirmed' }),
    })
  }
}
```

### ✅ ALWAYS DO THIS

```typescript
// ✅ Use domain services
import { getDomainServices } from '@/domains'

export async function POST(request: NextRequest) {
  const payload = await getPayload({ config })
  const services = getDomainServices(payload)

  // Let the service handle all business logic
  await services.booking.confirm(bookingId, paymentId)
}

// ✅ Components call APIs, APIs call services
function BookingButton() {
  const handleBook = async () => {
    await fetch('/api/bookings/confirm', {
      method: 'POST',
      body: JSON.stringify({ bookingId, paymentId }),
    })
  }
}
```

## Adding New Features

### Adding a New Domain

1. Create domain folder: `src/domains/my-domain/`
2. Create service: `src/domains/my-domain/service.ts`
3. Export from index: `src/domains/index.ts`
4. Add types to: `src/types/index.ts`

Example:

```typescript
// src/domains/review/service.ts
export class ReviewService {
  private payload: Payload

  constructor(payload: Payload) {
    this.payload = payload
  }

  async create(data: CreateReviewData) {
    // Validation
    // Business logic
    // Database operation
    return review
  }
}

// src/domains/index.ts
export class DomainServices {
  public readonly review: ReviewService

  constructor(payload: Payload) {
    this.review = new ReviewService(payload)
  }
}
```

### Adding a New Collection

1. Create collection: `src/collections/MyCollection.ts`
2. Add to config: `src/payload.config.ts`
3. Generate types: `pnpm generate:types`
4. Create service method in appropriate domain

### Adding an API Endpoint

1. Create route: `src/app/api/my-endpoint/route.ts`
2. Use domain services (never direct database access)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getDomainServices } from '@/domains'

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const services = getDomainServices(payload)

    const body = await request.json()
    const result = await services.myDomain.myMethod(body)

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

## Testing

### Unit Tests (Domain Services)

```typescript
// src/domains/booking/__tests__/service.test.ts
import { describe, it, expect } from 'vitest'
import { BookingService } from '../service'

describe('BookingService', () => {
  it('should create booking in draft state', async () => {
    const service = new BookingService(mockPayload)
    const bookingId = await service.create(mockData)
    expect(bookingId).toBeDefined()
  })

  it('should not allow invalid state transition', async () => {
    await expect(service.confirm('draft-booking-id', 'payment-id')).rejects.toThrow(
      'Invalid transition',
    )
  })
})
```

### Integration Tests

```typescript
// __tests__/integration/booking-flow.test.ts
import { describe, it, expect } from 'vitest'

describe('Booking Flow', () => {
  it('should complete full booking cycle', async () => {
    // Create → Pay → Confirm → Complete
  })
})
```

## Common Tasks

### Reset Database

```bash
pnpm db:reset
pnpm db:migrate
pnpm seed
```

### Add New Currency

```typescript
// Update src/types/index.ts
export enum CurrencyCode {
  // ... existing
  GBP = 'GBP', // Add new currency
}

// Add exchange rate via admin or API
await services.currency.updateRate(CurrencyCode.EGP, CurrencyCode.GBP, 0.025)
```

### Debug Domain Services

```typescript
// Add logging to service methods
async confirm(bookingId: string, paymentId: string) {
  console.log('[BookingService] Confirming booking:', { bookingId, paymentId })

  // ... rest of logic

  console.log('[BookingService] Booking confirmed successfully')
}
```

## Troubleshooting

### Types Not Updating

```bash
pnpm generate:types
# Restart TypeScript server in VSCode
```

### Database Migration Issues

```bash
# Reset and start fresh
pnpm db:reset
pnpm db:migrate
pnpm seed
```

### Port Already in Use

```bash
# Kill process on port 3000
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux:
lsof -ti:3000 | xargs kill -9
```

## Code Style

### Naming Conventions

- Collections: PascalCase (Users, Bookings)
- Services: PascalCase (BookingService)
- Methods: camelCase (createBooking, getBalance)
- Types/Enums: PascalCase (BookingStatus, CurrencyCode)
- Files: kebab-case (booking-service.ts)

### File Organization

```
src/
├── domains/
│   └── booking/
│       ├── service.ts           # Main service
│       ├── types.ts            # Domain-specific types
│       ├── utils.ts            # Domain utilities
│       └── __tests__/          # Tests
│           └── service.test.ts
```

## Performance

### Database Queries

```typescript
// ❌ N+1 queries
for (const booking of bookings) {
  const user = await payload.findByID({
    collection: 'users',
    id: booking.user,
  })
}

// ✅ Use depth parameter
const bookings = await payload.find({
  collection: 'bookings',
  depth: 2, // Populates relations
})
```

### Caching

```typescript
// Currency rates are cached for 1 hour
// See: src/domains/currency/service.ts

private rateCache: Map<string, ExchangeRate> = new Map()
private cacheExpiry = 1000 * 60 * 60 // 1 hour
```

## Resources

- [Payload CMS Docs](https://payloadcms.com/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html)
