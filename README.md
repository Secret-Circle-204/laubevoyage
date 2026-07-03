# L'Aube Voyage - Travel Platform

Modern travel booking platform built with **Clean Architecture** and **Domain-Driven Design**.

## 🏗️ Architecture

- **Framework**: Next.js 15 (App Router)
- **CMS**: Payload CMS 3.0
- **Database**: PostgreSQL
- **Language**: TypeScript (strict mode)

## 📁 Project Structure

```
src/
├── domains/              # Business Logic (Core)
│   ├── booking/         # Booking lifecycle
│   ├── currency/        # Currency conversion
│   ├── destination/     # Countries, Cities, Experiences
│   ├── loyalty/         # Points & tiers
│   ├── user/           # User management
│   ├── payment/        # Payment processing
│   └── notification/   # Multi-channel notifications
├── collections/         # Payload CMS collections
├── app/                # Next.js routes
│   ├── api/           # API endpoints
│   └── (frontend)/    # Frontend pages
└── types/             # TypeScript types
```

## 🚀 Getting Started

### Prerequisites

- Node.js >= 20.9.0
- pnpm >= 9
- PostgreSQL

### Installation

```bash
# Install dependencies
pnpm install

# Setup environment variables
cp .env.example .env
# Edit .env with your database credentials

# Generate TypeScript types
pnpm generate:types

# Run migrations
pnpm db:migrate

# Seed database
pnpm seed

# Start development server
pnpm dev
```

### Default Admin Credentials

After seeding:
- Email: `admin@laubevoyage.com`
- Password: `Admin@123`

## 📚 Key Concepts

### Domain Services

All business logic flows through domain services:

```typescript
import { getDomainServices } from '@/domains'

const services = getDomainServices(payload)

// Create booking
const bookingId = await services.booking.create({
  userId,
  experienceId,
  travelers,
  startDate,
  endDate,
})

// Confirm booking
await services.booking.confirm(bookingId, paymentId)

// Check loyalty points
const balance = await services.loyalty.getBalance(userId)
```

### Core Principles

1. **Single Source of Truth**: Each business rule exists in ONE place
2. **No Business Logic in UI**: Pages/components are thin wrappers
3. **Service-Oriented**: All operations go through domain services
4. **Immutable Ledger**: Point transactions are append-only

### Booking Flow

```
DRAFT → PENDING_PAYMENT → PAID → CONFIRMED → COMPLETED
```

### Loyalty System

- **Explorer**: 0 EGP spent → 100 points bonus → 1.0x earn rate
- **Voyager**: 5,000 EGP spent → 500 points bonus → 1.2x earn rate
- **Elite**: 15,000 EGP spent → 1,000 points bonus → 1.5x earn rate

## 🛠️ Development Commands

```bash
# Development
pnpm dev                 # Start dev server
pnpm build              # Build for production
pnpm start              # Start production server

# Database
pnpm db:migrate         # Run migrations
pnpm db:reset           # Reset database
pnpm seed               # Seed with sample data

# Code Quality
pnpm lint               # Run ESLint
pnpm generate:types     # Generate Payload types

# Testing
pnpm test               # Run all tests
pnpm test:int           # Run integration tests
pnpm test:e2e           # Run E2E tests
```

## 📖 Documentation

- [Architecture Details](./ARCHITECTURE.md)
- [Agent Instructions](./AGENT.md)

## 🔐 Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/laube_voyage

# Payload
PAYLOAD_SECRET=your-secret-key
NEXT_PUBLIC_SERVER_URL=http://localhost:3000

# Optional: Payment Integration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## 📦 Tech Stack

- **Backend**: Payload CMS, PostgreSQL
- **Frontend**: Next.js, React 19
- **Styling**: TBD (Tailwind CSS recommended)
- **Payment**: Stripe (planned)
- **Email**: TBD (Resend recommended)

## 🎯 Roadmap

- [x] Core domain architecture
- [x] Booking system
- [x] Loyalty program
- [x] Currency conversion
- [ ] Payment integration (Stripe)
- [ ] Email notifications
- [ ] Frontend UI
- [ ] Customer dashboard
- [ ] Admin panel
- [ ] Search & filters
- [ ] Reviews system
- [ ] Multi-language support

## 📝 License

MIT

## 👥 Team

L'Aube Voyage Development Team
