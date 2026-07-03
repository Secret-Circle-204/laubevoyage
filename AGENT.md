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

