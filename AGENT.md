# AGENT.md

## NON-NEGOTIABLE ENGINEERING RULES

These rules are mandatory for every AI agent, developer, contributor, automation process, or tool interacting with this project.

Violation of these rules is considered a task failure.

---

# 1. NO PATCHWORK FIXES

Never apply temporary fixes, hacks, workarounds, band-aids, quick fixes, or superficial solutions.

Always identify and fix the root cause.

Before modifying code:

- Understand the complete execution flow.
- Identify why the issue exists.
- Verify all affected components.
- Design a proper long-term solution.

Forbidden:

- "This should work for now"
- "Temporary fix"
- "Quick workaround"
- "Hotfix without root-cause analysis"
- Adding code only to silence errors

Required:

- Root-cause investigation
- Structural correction
- Durable solution

---

# 2. QUALITY OVER SPEED

Never rush to finish a task.

Never optimize for task completion metrics.

Never prioritize speed over correctness.

The goal is not to finish quickly.

The goal is to finish correctly.

Required:

- Full understanding before implementation
- Careful analysis
- Proper architecture decisions
- Validation of assumptions

Forbidden:

- Guessing
- Blind coding
- Rushing implementation
- Making assumptions without verification

---

# 3. STRICT TYPE SAFETY

Usage of `any` is prohibited.

Usage of `as any` is prohibited.

Usage of type suppression is prohibited.

Forbidden:

```ts
any
as any
@ts-ignore
@ts-expect-error
```

Required:

- Precise TypeScript types
- Proper interfaces
- Proper generics
- Proper unions
- Proper discriminated unions
- Proper type guards
- Proper runtime validation where needed

Every value must have an accurate type.

Never sacrifice type safety for convenience.

---

# 4. PRODUCTION-FIRST DEVELOPMENT

This project is NOT:

- A prototype
- A proof of concept
- A demo
- A temporary experiment
- A mock implementation

Treat every line of code as production code.

Every implementation must be:

- Production ready
- Scalable
- Maintainable
- Reliable
- Observable
- Secure

Never implement code with the assumption:

> "We can fix it later."

---

# 5. NO MOCK DATA

Do not create:

- Mock data
- Fake data
- Placeholder data
- Temporary seed data
- Simulated responses

Unless explicitly requested by the project owner.

Forbidden:

```ts
const fakeUser = ...
const mockResponse = ...
const dummyData = ...
```

Required:

- Real integrations
- Real implementation
- Real business logic
- Real persistence layer

---

# 6. TERMINAL EXECUTION RESTRICTIONS

Do not execute build, test, migration, deployment, generation, installation, or destructive commands without explicit approval.

Forbidden without approval:

```bash
npm run build
npm run test
npm run dev
npm run start
npm run lint
npm run typecheck
pnpm *
yarn *
bun *
docker *
kubectl *
terraform *
payload generate:types
payload migrate
```

Before executing any command:

1. Explain why it is needed.
2. Explain expected effects.
3. Explain possible risks.
4. Wait for approval.

No exceptions.

---

# 7. ARCHITECTURAL RESPONSIBILITY

Every modification must consider:

- Scalability
- Reliability
- Maintainability
- Security
- Extensibility
- Performance
- Future development

Before introducing code:

Ask:

- Will this scale?
- Will this remain maintainable in 2 years?
- Can this fail unexpectedly?
- Can this introduce technical debt?
- Can another developer understand it?

If any answer is uncertain:

Re-evaluate the implementation.

---

# 8. TECHNICAL DEBT IS A BUG

Creating technical debt is equivalent to creating a bug.

Never:

- Duplicate logic
- Create hidden coupling
- Introduce magic values
- Create unclear abstractions
- Ignore architectural boundaries

Required:

- Clean architecture
- Clear ownership
- Single responsibility
- Explicit dependencies
- Consistent patterns

---

# 9. VERIFY, DON'T ASSUME

Never assume:

- API responses
- Database schemas
- Runtime behavior
- Library behavior
- Existing code intentions

Always verify from source code.

Required:

- Read implementation
- Trace execution flow
- Validate assumptions

Forbidden:

> "It probably works like this"

---

# 10. FAIL LOUDLY, NOT SILENTLY

Do not hide errors.

Do not swallow exceptions.

Do not return misleading success states.

Forbidden:

```ts
catch (e) {
  return null;
}
```

```ts
catch {}
```

Required:

- Explicit handling
- Structured logging
- Meaningful errors
- Actionable diagnostics

---

# 11. SECURITY IS MANDATORY

Every change must consider:

- Authentication
- Authorization
- Input validation
- Data integrity
- Sensitive data exposure
- Privilege escalation risks

Never trust user input.

Always validate externally supplied data.

---

# 12. CONSISTENCY OVER PERSONAL PREFERENCE

Follow existing project standards.

Do not introduce new patterns without strong justification.

Required:

- Existing architecture
- Existing conventions
- Existing naming strategy
- Existing folder structure

Unless a documented architectural improvement is approved.

---

# 13. COMPLETE IMPACT ANALYSIS

Before changing code:

Identify:

- Direct impact
- Indirect impact
- Side effects
- Runtime implications
- Database implications
- API implications
- UI implications

Never modify a file in isolation without understanding surrounding systems.

---

# 14. OWNERSHIP MINDSET

Act as if:

- The system serves real users.
- Downtime costs money.
- Bugs impact customers.
- Every deployment matters.

Do not code merely to satisfy the current task.

Build solutions that remain correct, maintainable, and reliable over time.

---

15. SINGLE SOURCE OF TRUTH

Every business rule must have exactly one implementation.

Forbidden:

Recalculating prices in multiple places.
Multiple loyalty point formulas.
Multiple booking state transitions.
Duplicate email sending logic.
Duplicate Stripe validation logic.

Every business rule must live in exactly one service.

Other modules may consume it but never duplicate it.

16. EVENT OWNERSHIP

Every business event has exactly one owner.

Example:

Booking Confirmed

Owner:

Booking Lifecycle Service

Allowed responsibilities:

update booking status
award loyalty points
send confirmation email
generate invoice
emit audit log

No other component may perform these actions independently.

17. NO BUSINESS LOGIC INSIDE ROUTES

Routes must never contain business logic.

Allowed:

authentication
authorization
input validation
calling services
formatting responses

Forbidden:

POST /checkout

calculate price

calculate loyalty

update booking

send email

award points

Routes orchestrate.

Services decide.

18. DOMAIN-DRIVEN MODULES

Business logic must be grouped by domain.

Example:

Booking Domain

BookingService

BookingLifecycle

BookingRepository

BookingPolicies

BookingEvents

NOT

helpers.ts

utils.ts

misc.ts

common.ts 19. TRANSACTIONS ARE MANDATORY

Any operation affecting:

payment
booking
loyalty
invoice

must be atomic.

If one step fails:

Everything rolls back.

Never allow partial success.

20. IDEMPOTENCY

Every external callback must be idempotent.

Especially:

Stripe Webhook

Cron Jobs

Payment Confirmation

Retry Requests

Running the same request twice must never duplicate:

bookings
points
invoices
emails 21. NO HIDDEN SIDE EFFECTS

Functions must not secretly perform unrelated work.

Example:

Bad

confirmBooking()

↓

send email

↓

award points

↓

update balance

↓

create invoice

unless explicitly documented.

Every side effect must be visible and documented.

22. AUDITABILITY

Every important action must leave an audit trail.

Including:

Booking Created

Booking Paid

Booking Cancelled

Points Awarded

Points Redeemed

Points Refunded

Status Changed

Invoice Generated

Every audit record includes:

timestamp
actor
source
reason
previous state
new state 23. IMMUTABLE LEDGER

Loyalty points must never be edited.

Never update an existing point transaction.

Only append new transactions.

Balance is derived from ledger integrity.

24. SERVER IS THE AUTHORITY

The client never decides:

prices
discounts
loyalty values
booking status
payment success

The client only requests.

The server decides.

25. EVERY QUERY HAS A PURPOSE

Never fetch data "just in case".

Every query must document:

why
consumer
required fields

Always minimize:

depth
select
payload size 26. OBSERVABILITY

Critical flows must expose structured logs.

Including:

Booking Flow

Payment Flow

Dashboard

Loyalty

Cron

Every log must include:

duration
affected user
booking id
database queries
cache status 27. CACHE IS EXPLICIT

Every cached query must define:

cache owner
cache tag
invalidation event
revalidation trigger

No hidden cache behavior.

28. SECURITY BEFORE CONVENIENCE

Never expose:

booking data
invoices
user balances
payment sessions

without ownership verification.

Authorization is required even when using Local API.

29. PERFORMANCE BUDGET

Every feature must define expected limits.

Example:

Dashboard

TTFB < 300ms

Booking Creation

<500ms

Payment Confirmation

<800ms

Database Queries

<5

If exceeded:

Investigate before merge.

30. ARCHITECTURE CANNOT BE MODIFIED WITHOUT DOCUMENTATION

Any architectural change must update:

Architecture Specification

Business Rules

Sequence Diagrams

Data Flow

No undocumented architecture changes.

# FINAL DIRECTIVE

No page, API route, hook, webhook, or component may contain business logic. All business rules must be within a single Services/Domain, ensuring that each operation has a single source of truth, and that the same logic is not duplicated.

Never optimize for:

- Speed
- Convenience
- Task completion metrics
- Short-term success

Always optimize for:

- Correctness
- Reliability
- Maintainability
- Type safety
- Security
- Scalability
- Long-term system health

When in doubt:
STOP.
Analyze.
Understand.
Then implement the root-cause solution.

---

# 20. ARCHITECTURAL SEPARATION OF CUSTOMERS & STAFF

- **Staff / Admins**: Reside in the `users` collection. This is used exclusively for Payload CMS Admin Dashboard access. They have roles (`admin`, `super_admin`) but have zero customer fields (no loyalty points, no tier caching, no welcome point hooks, and no booking relationships).
- **Customers / Travelers**: Reside in the `customers` collection. This is used exclusively for the customer facing web application, profile preferences, bookings, reviews, and loyalty ledger tracking. They have NO administrative access or roles.

---

# 21. CROSS-CUTTING INFRASTRUCTURE LAYER & DOMAIN AGNOSTICISM

- **The Golden Rule of Domains**: NO Domain (Booking, Package, Destination) is allowed to know about Localization, Translation, or Currency conversion. They are strictly forbidden from calling ranslate() or convertCurrency().
- **Internal Storage**: All core domains MUST store and operate on **EGP** and **English** exclusively. They must return raw DTOs.
- **The Localization Layer**: The Localization Layer (Presentation Gateway) is the ONLY layer that intercepts the DTO, translates fields, converts currencies, and formats dates/numbers based on the LocaleContext before returning the final response to the Frontend.

---

# 22. FINANCIAL IMMUTABILITY

- **Zero Recalculation**: Financial data is strictly immutable. Invoices, Receipts, Payments, and Booking Prices (Pricing Snapshot) are NEVER recalculated after creation.
- **Immutable Snapshots**: A Booking Pricing Snapshot represents a historical financial record and cannot be changed, even if exchange rates, base prices, or currency catalogs are altered later.

---

# 23. PAYMENT ADAPTER INDEPENDENCE

- **Zero Knowledge Adapters**: Payment Adapters (e.g., Stripe, PayPal) must have Zero Knowledge of exchange rates or currency conversions.
- **Execution Only**: They only receive the finalized PricingSnapshot amounts and execute the transaction.

# IMPLEMENTATION PROTOCOL

Every implementation MUST begin by following PRE-IMPLEMENTATION INVESTIGATION PROTOCOL. Skipping this protocol is considered an architectural violation and task failure.

## Mandatory Engineering Investigation Before Writing Any Code

### Mission

You are working inside **L'Aube Voyage**, an enterprise application built on a strict Clean Architecture and Domain-Driven Design.

Your primary responsibility is **NOT writing code**.

Your primary responsibility is understanding the existing architecture before making any modification.

**Writing new code is always the last step, never the first.**

---

# Rule Zero (Non-Negotiable)

Before creating:

- any class
- any function
- any interface
- any DTO
- any loader
- any repository
- any service
- any hook
- any utility
- any provider
- any helper
- any translation logic
- any currency logic
- any mapper

You MUST first prove that an equivalent implementation does not already exist.

If you skip this investigation, the task is considered failed.

---

# Phase 1 — Architecture Investigation (Mandatory)

Before writing a single line of code you MUST investigate the project.

Search the entire codebase for:

- existing services
- existing domain methods
- repositories
- DTOs
- mappers
- loaders
- localization services
- translation engine
- translation providers
- currency services
- utility helpers
- middleware
- shared abstractions
- interfaces
- factories
- existing business rules

Do NOT assume something does not exist.

Search first.

---

# Phase 2 — Read The Architecture Documents

Before implementation you MUST read and understand:

- AGENT.md
- LOCALIZATION_ARCHITECTURE.md
- PROJECT_ARCHITECTURE.md
- Domain contracts
- Application contracts

If the requested implementation conflicts with the architecture documents:

STOP.

Do not write code.

Explain the conflict.

Propose the architectural solution.

Wait for approval.

---

# Phase 3 — Translation Investigation (Mandatory)

Whenever the requested task touches:

- localization
- translations
- languages
- currencies
- DTOs
- pages
- loaders
- presentation

You MUST inspect the complete translation system before writing anything.

At minimum investigate:

- Translation Domain
- Localization Domain
- Translation Engine
- Translation Repository
- Translation Providers
- Translation Factory
- Localization Profiles
- Application Loaders
- DTO Localization Pipeline
- Translation Cache
- Translation Collection
- Existing translateBatch()
- Existing translateFields()
- Existing localizeDTO()

Never recreate functionality that already exists.

Never bypass the localization pipeline.

Never duplicate translation logic.

---

# Phase 4 — Layer Ownership Verification

Before implementation identify which architectural layer owns the requested responsibility.

Only one layer may own a responsibility.

Examples:

Presentation Layer

- Rendering only.

Application Layer

- DTO orchestration.
- Calls domains.
- Calls localization.

Core Domain

- Business rules only.

Localization Domain

- Translation.
- Currency conversion.
- Formatting.

Infrastructure

- Persistence.
- External APIs.
- Cache.

If ownership is unclear:

STOP.

Explain the conflict.

Do not implement.

---

# Phase 5 — Existing Code Reuse

Always prefer:

1. Extend
2. Reuse
3. Compose

Only if impossible:

4. Create

Never duplicate existing logic.

Never create parallel implementations.

Never create "temporary" helpers.

Never introduce a second way to solve an existing problem.

---

# Phase 6 — Duplication Investigation

Before adding any code answer internally:

Does this already exist?

Can an existing service be extended?

Can an existing interface be reused?

Can an existing DTO be expanded?

Can an existing loader call it?

Can an existing domain own this?

Can an existing mapper perform this?

Can an existing localization helper perform this?

If the answer is YES,

reuse it.

Do not create another implementation.

---

# Phase 7 — Architecture Validation

Before implementation verify:

✓ No Business Logic inside Components

✓ No Business Logic inside Pages

✓ No Translation inside UI

✓ No Currency Conversion inside UI

✓ No Translation inside Core Domains

✓ No HTTP logic inside Domains

✓ No Repository calling Localization

✓ No duplicate services

✓ No duplicate DTOs

✓ No duplicate providers

✓ No duplicate utilities

✓ Single Source of Truth preserved

---

# Phase 8 — Explain Before Coding

Before modifying files you MUST explain:

1. What already exists.

2. Which files already solve part of the problem.

3. Which existing services will be reused.

4. Which files will actually change.

5. Why new code is necessary.

If you cannot justify new code,

do not write it.

---

# Golden Rule

The best implementation is not the one that writes the most code.

The best implementation is the one that integrates perfectly into the existing architecture while introducing the least amount of new code.

Every new file, function, service, helper or abstraction increases long-term maintenance cost.

Minimize code.

Maximize reuse.

Protect the architecture.

Never violate the constitutional architecture documents.

---

# ZERO FALLBACK ENGINEERING POLICY (MANDATORY)

This project follows a strict Fail-Fast Architecture.

The purpose is to expose architectural defects immediately instead of hiding them.

## ABSOLUTELY FORBIDDEN

Never introduce fallback values that hide missing data or invalid state.

Forbidden examples include (but are not limited to):
- `value || 'USD'`
- `value ?? 'USD'`
- `provider || 'stripe'`
- `env || ''`
- `env || 'development'`
- `session.url || undefined`
- `array || []`
- `object || {}`
- `Number(value) || 0`
- `Boolean(value) || false`

or any similar fallback that allows execution to continue silently.

## REQUIRED BEHAVIOR

Whenever required business data or configuration is missing:
1. Throw an explicit `Error` or `DomainException` immediately.
2. Stop execution cleanly and loudly.
3. Expose the exact root cause in error diagnostics.

Never silently recover or invent data.

### Examples:

**BAD:**
```ts
const currency = locale.currency || 'USD'
```

**GOOD:**
```ts
if (!locale.currency) {
  throw new Error('[LocalizationService] Missing required currency in locale context.')
}
const currency = locale.currency
```

**BAD:**
```ts
const secret = process.env.STRIPE_SECRET_KEY || ''
```

**GOOD:**
```ts
const secret = process.env.STRIPE_SECRET_KEY
if (!secret) {
  throw new Error('[Stripe] Missing required STRIPE_SECRET_KEY environment variable.')
}
```

**BAD:**
```ts
return session.url || undefined
```

**GOOD:**
```ts
if (!session.url) {
  throw new Error('[StripePaymentAdapter] Stripe Checkout Session did not return a hosted URL.')
}
return session.url
```

## MANDATORY FALLBACK AUDIT DIRECTIVE

Before finishing any implementation, perform a "Fallback Audit" over every modified file. Reject the implementation if you find any `||`, `??`, default parameter, empty string fallback, empty array fallback, default object fallback, fake value, mock value, guessed value, inferred business value, or silent catch that hides an error. Replace every occurrence with explicit validation and fail-fast behavior. The task is not complete until zero business fallbacks remain.


