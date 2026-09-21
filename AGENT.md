# AGENT.md

## NON-NEGOTIABLE ENGINEERING RULES

These rules are mandatory for every AI agent, developer, contributor, automation process, or tool interacting with this project.

Violation of these rules is considered a task failure.

---

قاعدة مراجعة الكود والتدقيق المعماري في بيئة الإنتاج:
إذا كان الهدف من جميع المراجعات المعمارية هو تقييم المشروع بوصفه **نظاماً إنتاجياً (Production Environment)**، فيجب الالتزام بالقواعد التالية أثناء جميع عمليات التدقيق:

- اعتبار المشروع يعمل وفق إعدادات الإنتاج الفعلية فقط.
- عدم إدخال أو مناقشة سيناريوهات **Mock** أو **Unit Tests** أو بيئات الاختبار، ما لم يكن التدقيق موجهاً إليها صراحة.
- عدم اعتبار الفروع الاحتياطية (Fallback Paths) أو الشيفرات المخصصة للتوافق مع بيئات أخرى جزءاً من مسار التنفيذ الإنتاجي، ما لم توجد أدلة تثبت استخدامها في بيئة الإنتاج الحالية.
- عدم إدخال احتمالات مستقبلية أو فرضيات تتعلق بتغيير قاعدة البيانات أو الـ Adapters أو البنية التشغيلية، إلا إذا كانت جزءاً من المشروع الحالي.

وبناءً على ذلك، يجب أن تعتمد جميع الاستنتاجات على **مسار التنفيذ الفعلي في بيئة الإنتاج** كما تحدده إعدادات المشروع الحالية، وليس على وجود فروع احتياطية داخل الكود لم تُستخدم في التشغيل الإنتاجي.

وبعبارة أخرى:

> **يُراجع الكود وفق إعدادات الإنتاج الفعلية للمشروع، وليس وفق الفروع الاحتياطية أو البيئات الاختبارية أو السيناريوهات الافتراضية، ما لم يكن نطاق التدقيق ينص صراحةً على مراجعة تلك البيئات.**

---

قاعدة حظر القيم الافتراضية لقواعد الأعمال (Fail Fast Policy):
يُحظر تماماً استخدام أي قيم افتراضية (Defaults) أو فروع احتياطية (Fallbacks) لقواعد الأعمال (Business Rules) داخل شيفرة التطبيق التنفيذية. أي إعدادات عمل (Business Configuration) مفقودة أو غير صالحة في قاعدة البيانات يجب أن تؤدي فوراً إلى الفشل السريع (Fail Fast) وإطلاق استثناء صريح (`LoyaltyProgramConfigurationException`)، ولا يجوز للكود تعويض البيانات المفقودة بقيم ثابتة مدمجة داخل الكود (Hardcoded Numbers).
تُطبق هذه القاعدة بشكل صارم على جميع النطاقات: الولاء (Loyalty)، التسعير (Pricing)، العملات (Currency)، وسياسات الحجز (Booking Policies).

---

أهم قاعدة حظر مخرجات وتكرار الكود (Strict Non-Duplication Rule):

> **⚠️ لا يجوز أبداً أبداً إنشاء أي ملف أو مجلد أو سطر كود أو دالة جديدة، إلا بعد الفحص الجاد والتدقيق الشامل للتأكد من أنها غير موجودة بالفعل في المشروع، أو موجودة ببيئات/أنماط/مسميات أخرى من صنع الوكلاء السابقين (مثل DTOs أو Loaders أو Widgets أو Helpers أو Projections). يجب إعادة استخدام وتوسيع الملفات والأكواد الحالية المعتمدة دائماً بدلاً من إعادة ابتكارها.**

---

قاعدة حظر إدخال طبقات تجريد مكررة (Universal Abstraction Non-Duplication Rule):
يُحظر تماماً إنشاء أي طبقة تجريد (Abstraction) جديدة أو نمط موازٍ إذا كان المشروع يحتوي بالفعل على طبقة تجريد تؤدي نفس المسؤولية المعمارية داخل النظام.

- إذا كان المشروع يحتوي على `Loader` ──► يُحظر إنشاء `Query` موازٍ.
- إذا كان المشروع يحتوي على `DTO` ──► يُحظر إنشاء `ViewModel` موازٍ.
- إذا كان المشروع يحتوي على `Factory` ──► يُحظر إنشاء `ServiceLocator` موازٍ.
  تُطبق هذه القاعدة بشكل كلي ومجرد لمنع التكرار المعماري وضمان الاعتماد على الأنماط القائمة المعتمدة في المشروع بصرف النظر عن المسميات.

---

قاعدة التدقيق المعماري وتفضيل التوسيع على الموازاة (Architectural Audit & Extension Over Parallel Structures Rule):

> **Before introducing any new architectural abstraction (folder, file, service, helper, DTO, loader, query, builder, mapper, registry, hook, provider, utility, or component), an architectural audit must first prove that no equivalent abstraction already exists anywhere in the project. Preference must always be given to extending the existing architecture over introducing parallel structures.**
>
> (قبل تقديم أي تجريد معماري جديد — سواء كان مجلداً، ملفاً، خدمة، دالة مساعدة، DTO، Loader، Query، Builder، Mapper، Registry، Hook، Provider، Utility، أو Component — يجب أولاً إجراء تدقيق معماري يثبت عدم وجود تجريد مكافئ بالفعل في أي مكان بالمشروع. يجب دائماً إعطاء الأولوية القصوى لتوسيع البنية المعمارية القائمة بدلاً من إدخال هياكل موازية).

---

قاعدة حسم عملة العرض المفضلة للغة (Preferred Display Currency Resolution Rule):
تعتبر عملة العرض المفضلة للغة (`preferredDisplayCurrency`) خيار عرض تسويقي واختيار منتج (Merchandising/Product Preference) فقط لتسهيل العرض لزوار المرة الأولى، ولا تمثل حقيقة لغوية أو جغرافية أو عملة محاسبية ثابتة. غياب هذا الإعداد لأي لغة لا يعتبر خطأ قاتلاً يوقف النظام، بل يتم تخطيه تلقائياً لمواصلة تسلسل الحسم (Cascade) نحو عملة الدولة ثم عملة المنصة الافتراضية.

---

قاعدة استدامة قرار المستخدم (Decision Persistence Rule):
يتم استخدام `preferredDisplayCurrency` للزيارة الأولى للمستخدم فقط (First-time visit fallback). بمجرد أن يقوم المستخدم بتغيير العملة بشكل صريح في الواجهة، تصبح قيمة الكوكيز (`Cookie Currency`) هي مصدر الحقيقة الأوحد والنهائي (SSOT)، ولا يجوز بأي حال من الأحوال إعادة فرض أو تغطيتها بالعملة المفضلة للغة مرة أخرى عند تحديث الصفحة أو التصفح.

قبل أي تعديل أو إنشاء أو حذف أو نقل لأي سطر كود:

أجرِ Reconnaissance كامل للبنية الحالية.
حدد الـDomain والـApplication والـInfrastructure والـPresentation ownership للقاعدة محل التحقيق.
ابحث عن جميع implementations الحالية لنفس الـbusiness rule.
تحقق من الـDTOs والـrepositories والـservices والـpolicies والـworkflows والـevents والـtests والـloaders المرتبطة.
تحقق من عدم وجود implementation قائم يمكن إعادة استخدامه.
لا تنشئ helper/service/policy جديدة إذا كان هناك مالك معماري قائم للقاعدة.
لا تنقل business rule إلى Layer أخرى لمجرد أن ذلك أسهل.
لا تلمس الكود قبل عرض Findings + Root Cause + Proposed Change + Exact Files + Ownership + سبب وضع التعديل في ذلك المكان والحصول على إذن صريح.
أثناء التحقيق: Read/Inspect/Search only. No Code Changes.
نجاح الاختبارات وحده لا يُعتبر إثباتًا لصحة السلوك؛ يجب التحقق من السلوك الفعلي عبر Domain → DB → Admin → Customer.

DATA RETRIEVAL & SCALABILITY CONTRACT

All potentially-large or unbounded datasets MUST use bounded, server-side, demand-driven data retrieval.

Collections MUST be treated as potentially large regardless of their current record count.

The application MUST NOT load an entire collection into application memory merely to display, search, filter, sort, or paginate a subset of records.

The database query MUST retrieve only the records required for the current operation, using server-side filtering, sorting, and bounded pagination or another bounded retrieval strategy appropriate to the use case.

The bound applies to each individual retrieval operation, not to the total dataset.

The existence of a limit MUST NOT be used as an arbitrary maximum dataset size that causes remaining records to become inaccessible.

If the dataset contains more records than the current page, the remaining records MUST remain accessible through subsequent server-side retrieval operations.

No implementation may use pagination: false, unbounded collection reads, or equivalent mechanisms for potentially-large collections unless an explicit architectural audit proves that the dataset is permanently bounded and the unbounded read is safe.

Never replace pagination with an arbitrary hardcoded limit such as 100, 500, or 1000.

The system MUST preserve complete dataset accessibility while preventing unnecessary database, network, and application-memory consumption.

Before implementing any new Collection → Backend → UI data flow, the agent MUST determine whether the dataset can grow beyond a small bounded size. If it can, the agent MUST NOT design the retrieval layer around loading the entire dataset. The agent MUST first identify the existing pagination/bounded-retrieval abstraction in the project and extend/reuse it rather than creating a parallel mechanism.

Every individual retrieval must be bounded. Page size must be determined by the legitimate use case/UI contract or existing architectural convention, not by an arbitrary global hardcoded maximum.

إذن عندما تريد شرحها لوكيل جديد، قل له باختصار:

We use Bounded, Server-Side, Demand-Driven Data Retrieval.

Never load potentially-large collections in full.

Bound each database read, not the dataset itself.

Use server-side filtering/sorting and pagination (or an appropriate bounded retrieval strategy) so the UI receives only the records required for the current view.

Subsequent records must remain accessible through subsequent requests.

Never use an arbitrary hardcoded limit as a substitute for pagination.

Never use pagination: false for potentially-large collections unless an architectural audit explicitly proves the dataset is permanently bounded and the unbounded read is safe.

The goal is not to show only the first N records. The goal is to make the entire dataset accessible without loading the entire dataset at once.

Before implementing a new data flow, inspect the existing project architecture and reuse/extend its established bounded-retrieval/pagination mechanism. Do not create a parallel abstraction.

---

Server-Side Pagination

أو:

Paginated Data Retrieval

أي:

جلب البيانات على صفحات من الخادم، وليس جلب المجموعة كاملة دفعة واحدة.

لكن في حالتك أنت تريد شيئًا أوسع قليلًا من مجرد Pagination.

المبدأ الكامل الذي تريد اعتماده هو:

Bounded, Server-Side, Demand-Driven Data Retrieval

أي:
4
جلب بيانات محدود الحجم، من جهة الخادم، حسب الطلب، مع Pagination، دون تحميل المجموعة كاملة إلى الذاكرة.

وهذا أدق بكثير لما تريد تحقيقه.

الفرق المهم جدًا

أنت لا تقول:

"ضع limit: 50 لكل شيء."

هذا ليس المبدأ.

لأن 50 مجرد رقم اعتباطي وقد يكون 20 أو 30 أو 100 حسب الـUI والـuse case.

أنت تقول:

لا تفترض أن حجم الـdataset صغير. تعامل دائمًا مع الـcollection على أنها potentially large/unbounded، ولذلك لا يجوز تحميل المجموعة كاملة عندما تكون قابلة للتصفح أو العرض الجزئي.

ثم:

Database
│
│ requested page
▼
Page 1 → 20 records
│
▼
User asks next
│
▼
Page 2 → next 20
│
▼
User asks next
│
▼
Page 3 → next 20

وليس:

Database
│
▼
10,000 records
│
▼
Node.js
│
▼
UI
وهناك مصطلح آخر مهم: Bounded Reads

الجزء الذي كنا نصلحه في Gate 3.2 تحديدًا يسمى:

Bounded Data Access / Bounded Reads

أي أن كل عملية قراءة لها حد معروف.

مثلاً:

limit: 20

أو:

limit: 50

أو:

limit: 1

بحسب الغرض.

ولهذا كان:

pagination: false

مشكلة معمارية عندما تكون collection قابلة لأن تصبح كبيرة.

لأنه يحول القراءة إلى:

Unbounded Read

بينما القاعدة التي تريدها هي:

No Unbounded Collection Reads.

لكن هناك شيء أعمق

أنت لا تريد فقط Pagination.

أنت تريد أن تقول:

البيانات قد تكون 10

أو:

10,000

أو:

10,000,000

والـUI لا يجب أن يتغير تصميمها أو يفشل بسبب حجم البيانات.

لذلك:
Dataset
↓
Query
↓
Filtering
↓
Sorting
↓
Pagination / Bounded Retrieval
↓
Requested Slice
↓
UI

وليس:

Dataset
↓
Load Everything
↓
Filter in Node
↓
Take first 50
↓
UI

والفرق هنا هندسي ضخم.
"Use bounded, server-side, demand-driven data retrieval with server-side pagination. Never load an entire potentially-large collection merely to display a subset."

ثم أضف:

"The dataset must be treated as potentially unbounded. The UI requests only the page/slice required for the current view. Subsequent pages are fetched independently on demand. Do not impose arbitrary hardcoded dataset limits such as limit: 100 as a substitute for pagination."

وهذه الجملة الأخيرة مهمة جدًا.

لأن:

limit: 100

ليست Pagination حقيقية إذا كانت تعني:

"هات أول 100 وانتهينا."

والأهم: لا نريد Data Truncation

وهذا بالضبط الشيء الذي كنت أسألك عنه في الرد السابق.

القاعدة يجب أن تكون:

Bound the individual read, not the dataset.

أي:

نحدد حجم القراءة الواحدة، وليس حجم البيانات الموجودة في النظام.

مثلاً عندك:

50,000 slots

نحن لا نقول:

LIMIT 100

ثم نعرض أول 100 ونختفي الباقي.

بل:

Total dataset = 50,000

Page size = 20

Page 1 → 1–20
Page 2 → 21–40
Page 3 → 41–60
...
Page 2,500 → 49,981–50,000

إذن:

لا توجد بيانات مختزلة.

كل البيانات متاحة.

لكن لا يتم تحميلها كلها في نفس اللحظة.

وهذه بالضبط الفكرة التي تبحث عنها.

والأفضل تقنيًا: Cursor Pagination عندما يكون الحجم كبيرًا جدًا

هناك مستويان:

Offset/Page Pagination
page=1
limit=20

page=2
limit=20

page=3
limit=20

وهي مناسبة جدًا للواجهات التقليدية.

Cursor-Based Pagination

مثل:

cursor = lastSeenId
limit = 20

ثم:

nextCursor

وهذه غالبًا أفضل عندما تصبح datasets ضخمة جدًا، لأنها تتجنب مشاكل OFFSET الكبيرة.

لكن لا أريد أن نسجل الآن أن المشروع يجب أن يستخدم Cursor Pagination في كل مكان.

لأن هذا سيكون تحويلًا من قاعدة صحيحة إلى Implementation Rule غير مبررة.

القاعدة المعمارية الأفضل هي:

Server-side bounded pagination is mandatory for potentially-large collections; the pagination strategy (page/offset or cursor) must be selected according to the query/use case and existing project architecture.

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

---

# 24. PRODUCTION ARCHITECTURAL INVARIANT – PROCESS INDEPENDENCE

The architecture must not assume or depend on the existence of a single Node.js process, a single application instance, or a single server.

Every background component, coordination mechanism, lifecycle, and state transition must remain correct regardless of deployment topology, including:

- Single-process development environments
- Multiple Node.js processes
- PM2 cluster mode
- Multiple application instances
- Containerized deployments
- Future horizontal scaling

No business correctness may rely on:

- In-memory state
- Module scope
- Singleton lifetime
- Process-local caches
- Process-local locks
- Symbol.for(...)
- Static variables
- Startup ordering
- Request routing affinity

Process-local memory may be used exclusively as an implementation optimization (cache, buffering, throttling, batching, etc.), but never as the authoritative source of business state or execution ownership.

Whenever exclusive ownership, coordination, recovery, scheduling, or synchronization is required, it must rely on durable shared infrastructure capable of coordinating all running processes.

---

# 25. PRODUCTION ARCHITECTURAL INVARIANT – BUSINESS CORRECTNESS BEFORE THROUGHPUT

The primary objective of the production architecture is business correctness, not execution speed.

Every optimization must preserve deterministic business behavior under concurrency, retries, failures, duplicate delivery, process restarts, and horizontal scaling.

No optimization may introduce ambiguity regarding ownership, execution order, or business state consistency.

Performance improvements must always be implemented after correctness guarantees are established and must never weaken those guarantees.

---

# 26. ARCHITECTURAL REQUIREMENT – IDEMPOTENT BACKGROUND EXECUTION

Every background operation must be designed to be safely executable more than once.

Background workers must assume that duplicate execution, retries, process restarts, and concurrent scheduling are possible production scenarios.

Business operations must therefore be idempotent whenever possible, ensuring that repeated execution produces the same final business state without duplication or corruption.

Exclusive ownership mechanisms reduce duplicate execution but must not be considered the sole correctness guarantee. System correctness must be preserved even if a background operation runs multiple times.

---

# 27. PRODUCTION-ONLY ARCHITECTURAL AUDIT & REVIEW PROTOCOL

إذا كان الهدف من جميع المراجعات المعمارية هو تقييم المشروع بوصفه **نظاماً إنتاجياً (Production Environment)**، فيجب الالتزام بالقواعد التالية أثناء جميع عمليات التدقيق:

- اعتبار المشروع يعمل وفق إعدادات الإنتاج الفعلية فقط.
- عدم إدخال أو مناقشة سيناريوهات **Mock** أو **Unit Tests** أو بيئات الاختبار، ما لم يكن التدقيق موجهاً إليها صراحة.
- عدم اعتبار الفروع الاحتياطية (Fallback Paths) أو الشيفرات المخصصة للتوافق مع بيئات أخرى جزءاً من مسار التنفيذ الإنتاجي، ما لم توجد أدلة تثبت استخدامها في بيئة الإنتاج الحالية.
- عدم إدخال احتمالات مستقبلية أو فرضيات تتعلق بتغيير قاعدة البيانات أو الـ Adapters أو البنية التشغيلية، إلا إذا كانت جزءاً من المشروع الحالي.

وبناءً على ذلك، يجب أن تعتمد جميع الاستنتاجات على **مسار التنفيذ الفعلي في بيئة الإنتاج** كما تحدده إعدادات المشروع الحالية، وليس على وجود فروع احتياطية داخل الكود لم تُستخدم في التشغيل الإنتاجي.

وبعبارة أخرى:

> **يُراجع الكود وفق إعدادات الإنتاج الفعلية للمشروع، وليس وفق الفروع الاحتياطية أو البيئات الاختبارية أو السيناريوهات الافتراضية، ما لم يكن نطاق التدقيق ينص صراحةً على مراجعة تلك البيئات.**

---

# 28. CONSTITUTIONAL ARCHITECTURAL DIRECTIVE — ZERO SYNTHETIC DYNAMIC DATA

From this point forward, and for all batches, features, and modules in this project, the following rules are non-negotiable architectural mandates:

### 1. ZERO HARDCODED BUSINESS DATA

No static literal representing dynamic business data may exist in React Components, Pages, Loaders, Actions, Application Services, Domain Services, or Repositories.
Forbidden: `20` as default capacity, `1` as default ID, `'Egypt'` as default country/city, `5` as default rating, fake prices, fake dates/times, fake UUIDs, or fake states. Dynamic business data must originate from the authoritative Database or Domain Contract.

### 2. ZERO FALLBACKS FOR DYNAMIC BUSINESS DATA

No `value || fallback`, `value ?? fallback`, or `condition ? real : fake` to mask missing business data (`id || 1`, `capacity || 20`, `duration || 1`, `rating || 5`, `country || 'Egypt'`, `image || '/default.jpg'`, `price || somePrice`, `slotId || 1`).
The only exception is pure Presentation/UI Invariants (e.g. `page = requestedPage ?? 1` for pagination). When in doubt: **FAIL-FAST OVER FALLBACK**.

### 3. MISSING DATA ≠ DEFAULT DATA

Strictly distinguish between "Value does not exist" vs "Value exists and equals X". A legitimate absence must remain an absence (`images: []`, `defaultSlotId: null`, `policiesHtml: undefined`). Never convert missing truth into a fake truth.

### 4. FAIL-FAST FOR CORRUPTED REQUIRED DATA

If data is marked Required in the Schema or Domain Contract and arrives missing or invalid, the system must throw an explicit error immediately.

### 5. ZERO SYNTHETIC IDs

Never invent `id: 1`, `id: 0`, `slotId: 1`, or `departureId: ''`. If a real ID does not exist, return `null` / `undefined` / `throw Error`. Concrete entities must be created via Domain/Application workflows with real database persistence.

### 6. SERVER IS THE AUTHORITY

All business decisions (Pricing, Currency Conversion, Availability, Capacity, Default Slot, Departure Creation, Eligibility, Discounts, Taxes, Statuses, Rules) are resolved exclusively on the server in Domain/Application/Action layers, never in React.

### 7. UI MUST NEVER INVENT DATA

React is a presentation consumer only. If data is not provided by the DTO, the UI displays a clean empty state or handles the error; it never invents data.

### 8. EMPTY STATE IS NOT A FALLBACK

An Empty State representing legitimate absence (`images: []` -> empty media view, `defaultSlotId: null` -> no upcoming departures available) is an authentic presentation of truth, not a fallback.

### 9. NO SILENT ERROR SWALLOWING

Never write `try { ... } catch { return null / [] }` when the cause is corrupted data, schema mismatch, or broken relations. Null is allowed only when an entity legitimately does not exist, not when an entity exists but is corrupted.

### 10. MANDATORY FORBIDDEN-PATTERN SCAN FOR EVERY BATCH

Before completing any batch, perform a mandatory scan across modified files, consumers, loaders, actions, pages, components, and mappers for all forbidden patterns.

### 11. DATABASE SCHEMA IS THE FIRST SOURCE OF TRUTH

When assumptions conflict with the Database/Payload Schema, the Schema wins. The single required direction is:
$$\text{Database / Payload Schema} \longrightarrow \text{Repository} \longrightarrow \text{Domain} \longrightarrow \text{Application Use Cases} \longrightarrow \text{DTO} \longrightarrow \text{Loader / Action} \longrightarrow \text{UI}$$

### 12. TESTS MUST PROTECT THESE RULES

Every resolved fallback, hardcode, synthetic ID, or UI business logic leak must be accompanied by automated regression tests preventing silent reintroduction.

قاعدة مراجعة الكود والتدقيق المعماري في بيئة الإنتاج:
إذا كان الهدف من جميع المراجعات المعمارية هو تقييم المشروع بوصفه **نظاماً إنتاجياً (Production Environment)**، فيجب الالتزام بالقواعد التالية أثناء جميع عمليات التدقيق:

- اعتبار المشروع يعمل وفق إعدادات الإنتاج الفعلية فقط.
- عدم إدخال أو مناقشة سيناريوهات **Mock** أو **Unit Tests** أو بيئات الاختبار، ما لم يكن التدقيق موجهاً إليها صراحة.
- عدم اعتبار الفروع الاحتياطية (Fallback Paths) أو الشيفرات المخصصة للتوافق مع بيئات أخرى جزءاً من مسار التنفيذ الإنتاجي، ما لم توجد أدلة تثبت استخدامها في بيئة الإنتاج الحالية.
- عدم إدخال احتمالات مستقبلية أو فرضيات تتعلق بتغيير قاعدة البيانات أو الـ Adapters أو البنية التشغيلية، إلا إذا كانت جزءاً من المشروع الحالي.

وبناءً على ذلك، يجب أن تعتمد جميع الاستنتاجات على **مسار التنفيذ الفعلي في بيئة الإنتاج** كما تحدده إعدادات المشروع الحالية، وليس على وجود فروع احتياطية داخل الكود لم تُستخدم في التشغيل الإنتاجي.

وبعبارة أخرى:

> **يُراجع الكود وفق إعدادات الإنتاج الفعلية للمشروع، وليس وفق الفروع الاحتياطية أو البيئات الاختبارية أو السيناريوهات الافتراضية، ما لم يكن نطاق التدقيق ينص صراحةً على مراجعة تلك البيئات.**

---

قاعدة حظر القيم الافتراضية لقواعد الأعمال (Fail Fast Policy):
يُحظر تماماً استخدام أي قيم افتراضية (Defaults) أو فروع احتياطية (Fallbacks) لقواعد الأعمال (Business Rules) داخل شيفرة التطبيق التنفيذية. أي إعدادات عمل (Business Configuration) مفقودة أو غير صالحة في قاعدة البيانات يجب أن تؤدي فوراً إلى الفشل السريع (Fail Fast) وإطلاق استثناء صريح (`LoyaltyProgramConfigurationException`)، ولا يجوز للكود تعويض البيانات المفقودة بقيم ثابتة مدمجة داخل الكود (Hardcoded Numbers).
تُطبق هذه القاعدة بشكل صارم على جميع النطاقات: الولاء (Loyalty)، التسعير (Pricing)، العملات (Currency)، وسياسات الحجز (Booking Policies).

---

أهم قاعدة حظر مخرجات وتكرار الكود (Strict Non-Duplication Rule):

> **⚠️ لا يجوز أبداً أبداً إنشاء أي ملف أو مجلد أو سطر كود أو دالة جديدة، إلا بعد الفحص الجاد والتدقيق الشامل للتأكد من أنها غير موجودة بالفعل في المشروع، أو موجودة ببيئات/أنماط/مسميات أخرى من صنع الوكلاء السابقين (مثل DTOs أو Loaders أو Widgets أو Helpers أو Projections). يجب إعادة استخدام وتوسيع الملفات والأكواد الحالية المعتمدة دائماً بدلاً من إعادة ابتكارها.**

---

قاعدة حظر إدخال طبقات تجريد مكررة (Universal Abstraction Non-Duplication Rule):
يُحظر تماماً إنشاء أي طبقة تجريد (Abstraction) جديدة أو نمط موازٍ إذا كان المشروع يحتوي بالفعل على طبقة تجريد تؤدي نفس المسؤولية المعمارية داخل النظام.

- إذا كان المشروع يحتوي على `Loader` ──► يُحظر إنشاء `Query` موازٍ.
- إذا كان المشروع يحتوي على `DTO` ──► يُحظر إنشاء `ViewModel` موازٍ.
- إذا كان المشروع يحتوي على `Factory` ──► يُحظر إنشاء `ServiceLocator` موازٍ.
  تُطبق هذه القاعدة بشكل كلي ومجرد لمنع التكرار المعماري وضمان الاعتماد على الأنماط القائمة المعتمدة في المشروع بصرف النظر عن المسميات.

---

قاعدة التدقيق المعماري وتفضيل التوسيع على الموازاة (Architectural Audit & Extension Over Parallel Structures Rule):

> **Before introducing any new architectural abstraction (folder, file, service, helper, DTO, loader, query, builder, mapper, registry, hook, provider, utility, or component), an architectural audit must first prove that no equivalent abstraction already exists anywhere in the project. Preference must always be given to extending the existing architecture over introducing parallel structures.**
>
> (قبل تقديم أي تجريد معماري جديد — سواء كان مجلداً، ملفاً، خدمة، دالة مساعدة، DTO، Loader، Query، Builder، Mapper، Registry، Hook، Provider، Utility، أو Component — يجب أولاً إجراء تدقيق معماري يثبت عدم وجود تجريد مكافئ بالفعل في أي مكان بالمشروع. يجب دائماً إعطاء الأولوية القصوى لتوسيع البنية المعمارية القائمة بدلاً من إدخال هياكل موازية).

---

قاعدة حسم عملة العرض المفضلة للغة (Preferred Display Currency Resolution Rule):
تعتبر عملة العرض المفضلة للغة (`preferredDisplayCurrency`) خيار عرض تسويقي واختيار منتج (Merchandising/Product Preference) فقط لتسهيل العرض لزوار المرة الأولى، ولا تمثل حقيقة لغوية أو جغرافية أو عملة محاسبية ثابتة. غياب هذا الإعداد لأي لغة لا يعتبر خطأ قاتلاً يوقف النظام، بل يتم تخطيه تلقائياً لمواصلة تسلسل الحسم (Cascade) نحو عملة الدولة ثم عملة المنصة الافتراضية.

---

قاعدة استدامة قرار المستخدم (Decision Persistence Rule):
يتم استخدام `preferredDisplayCurrency` للزيارة الأولى للمستخدم فقط (First-time visit fallback). بمجرد أن يقوم المستخدم بتغيير العملة بشكل صريح في الواجهة، تصبح قيمة الكوكيز (`Cookie Currency`) هي مصدر الحقيقة الأوحد والنهائي (SSOT)، ولا يجوز بأي حال من الأحوال إعادة فرض أو تغطيتها بالعملة المفضلة للغة مرة أخرى عند تحديث الصفحة أو التصفح.

قبل أي تعديل أو إنشاء أو حذف أو نقل لأي سطر كود:

أجرِ Reconnaissance كامل للبنية الحالية.
حدد الـDomain والـApplication والـInfrastructure والـPresentation ownership للقاعدة محل التحقيق.
ابحث عن جميع implementations الحالية لنفس الـbusiness rule.
تحقق من الـDTOs والـrepositories والـservices والـpolicies والـworkflows والـevents والـtests والـloaders المرتبطة.
تحقق من عدم وجود implementation قائم يمكن إعادة استخدامه.
لا تنشئ helper/service/policy جديدة إذا كان هناك مالك معماري قائم للقاعدة.
لا تنقل business rule إلى Layer أخرى لمجرد أن ذلك أسهل.
لا تلمس الكود قبل عرض Findings + Root Cause + Proposed Change + Exact Files + Ownership + سبب وضع التعديل في ذلك المكان والحصول على إذن صريح.
أثناء التحقيق: Read/Inspect/Search only. No Code Changes.
نجاح الاختبارات وحده لا يُعتبر إثباتًا لصحة السلوك؛ يجب التحقق من السلوك الفعلي عبر Domain → DB → Admin → Customer.

DATA RETRIEVAL & SCALABILITY CONTRACT

All potentially-large or unbounded datasets MUST use bounded, server-side, demand-driven data retrieval.

Collections MUST be treated as potentially large regardless of their current record count.

The application MUST NOT load an entire collection into application memory merely to display, search, filter, sort, or paginate a subset of records.

The database query MUST retrieve only the records required for the current operation, using server-side filtering, sorting, and bounded pagination or another bounded retrieval strategy appropriate to the use case.

The bound applies to each individual retrieval operation, not to the total dataset.

The existence of a limit MUST NOT be used as an arbitrary maximum dataset size that causes remaining records to become inaccessible.

If the dataset contains more records than the current page, the remaining records MUST remain accessible through subsequent server-side retrieval operations.

No implementation may use pagination: false, unbounded collection reads, or equivalent mechanisms for potentially-large collections unless an explicit architectural audit proves that the dataset is permanently bounded and the unbounded read is safe.

Never replace pagination with an arbitrary hardcoded limit such as 100, 500, or 1000.

The system MUST preserve complete dataset accessibility while preventing unnecessary database, network, and application-memory consumption.

Before implementing any new Collection → Backend → UI data flow, the agent MUST determine whether the dataset can grow beyond a small bounded size. If it can, the agent MUST NOT design the retrieval layer around loading the entire dataset. The agent MUST first identify the existing pagination/bounded-retrieval abstraction in the project and extend/reuse it rather than creating a parallel mechanism.

Every individual retrieval must be bounded. Page size must be determined by the legitimate use case/UI contract or existing architectural convention, not by an arbitrary global hardcoded maximum.

إذن عندما تريد شرحها لوكيل جديد، قل له باختصار:

We use Bounded, Server-Side, Demand-Driven Data Retrieval.

Never load potentially-large collections in full.

Bound each database read, not the dataset itself.

Use server-side filtering/sorting and pagination (or an appropriate bounded retrieval strategy) so the UI receives only the records required for the current view.

Subsequent records must remain accessible through subsequent requests.

Never use an arbitrary hardcoded limit as a substitute for pagination.

Never use pagination: false for potentially-large collections unless an architectural audit explicitly proves the dataset is permanently bounded and the unbounded read is safe.

The goal is not to show only the first N records. The goal is to make the entire dataset accessible without loading the entire dataset at once.

Before implementing a new data flow, inspect the existing project architecture and reuse/extend its established bounded-retrieval/pagination mechanism. Do not create a parallel abstraction.

---

Server-Side Pagination

أو:

Paginated Data Retrieval

أي:

جلب البيانات على صفحات من الخادم، وليس جلب المجموعة كاملة دفعة واحدة.

لكن في حالتك أنت تريد شيئًا أوسع قليلًا من مجرد Pagination.

المبدأ الكامل الذي تريد اعتماده هو:

Bounded, Server-Side, Demand-Driven Data Retrieval

أي:
4
جلب بيانات محدود الحجم، من جهة الخادم، حسب الطلب، مع Pagination، دون تحميل المجموعة كاملة إلى الذاكرة.

وهذا أدق بكثير لما تريد تحقيقه.

الفرق المهم جدًا

أنت لا تقول:

"ضع limit: 50 لكل شيء."

هذا ليس المبدأ.

لأن 50 مجرد رقم اعتباطي وقد يكون 20 أو 30 أو 100 حسب الـUI والـuse case.

أنت تقول:

لا تفترض أن حجم الـdataset صغير. تعامل دائمًا مع الـcollection على أنها potentially large/unbounded، ولذلك لا يجوز تحميل المجموعة كاملة عندما تكون قابلة للتصفح أو العرض الجزئي.

ثم:

Database
│
│ requested page
▼
Page 1 → 20 records
│
▼
User asks next
│
▼
Page 2 → next 20
│
▼
User asks next
│
▼
Page 3 → next 20

وليس:

Database
│
▼
10,000 records
│
▼
Node.js
│
▼
UI
وهناك مصطلح آخر مهم: Bounded Reads

الجزء الذي كنا نصلحه في Gate 3.2 تحديدًا يسمى:

Bounded Data Access / Bounded Reads

أي أن كل عملية قراءة لها حد معروف.

مثلاً:

limit: 20

أو:

limit: 50

أو:

limit: 1

بحسب الغرض.

ولهذا كان:

pagination: false

مشكلة معمارية عندما تكون collection قابلة لأن تصبح كبيرة.

لأنه يحول القراءة إلى:

Unbounded Read

بينما القاعدة التي تريدها هي:

No Unbounded Collection Reads.

لكن هناك شيء أعمق

أنت لا تريد فقط Pagination.

أنت تريد أن تقول:

البيانات قد تكون 10

أو:

10,000

أو:

10,000,000

والـUI لا يجب أن يتغير تصميمها أو يفشل بسبب حجم البيانات.

لذلك:
Dataset
↓
Query
↓
Filtering
↓
Sorting
↓
Pagination / Bounded Retrieval
↓
Requested Slice
↓
UI

وليس:

Dataset
↓
Load Everything
↓
Filter in Node
↓
Take first 50
↓
UI

والفرق هنا هندسي ضخم.
"Use bounded, server-side, demand-driven data retrieval with server-side pagination. Never load an entire potentially-large collection merely to display a subset."

ثم أضف:

"The dataset must be treated as potentially unbounded. The UI requests only the page/slice required for the current view. Subsequent pages are fetched independently on demand. Do not impose arbitrary hardcoded dataset limits such as limit: 100 as a substitute for pagination."

وهذه الجملة الأخيرة مهمة جدًا.

لأن:

limit: 100

ليست Pagination حقيقية إذا كانت تعني:

"هات أول 100 وانتهينا."

والأهم: لا نريد Data Truncation

وهذا بالضبط الشيء الذي كنت أسألك عنه في الرد السابق.

القاعدة يجب أن تكون:

Bound the individual read, not the dataset.

أي:

نحدد حجم القراءة الواحدة، وليس حجم البيانات الموجودة في النظام.

مثلاً عندك:

50,000 slots

نحن لا نقول:

LIMIT 100

ثم نعرض أول 100 ونختفي الباقي.

بل:

Total dataset = 50,000

Page size = 20

Page 1 → 1–20
Page 2 → 21–40
Page 3 → 41–60
...
Page 2,500 → 49,981–50,000

إذن:

لا توجد بيانات مختزلة.

كل البيانات متاحة.

لكن لا يتم تحميلها كلها في نفس اللحظة.

وهذه بالضبط الفكرة التي تبحث عنها.

والأفضل تقنيًا: Cursor Pagination عندما يكون الحجم كبيرًا جدًا

هناك مستويان:

Offset/Page Pagination
page=1
limit=20

page=2
limit=20

page=3
limit=20

وهي مناسبة جدًا للواجهات التقليدية.

Cursor-Based Pagination

مثل:

cursor = lastSeenId
limit = 20

ثم:

nextCursor

وهذه غالبًا أفضل عندما تصبح datasets ضخمة جدًا، لأنها تتجنب مشاكل OFFSET الكبيرة.

لكن لا أريد أن نسجل الآن أن المشروع يجب أن يستخدم Cursor Pagination في كل مكان.

لأن هذا سيكون تحويلًا من قاعدة صحيحة إلى Implementation Rule غير مبررة.

القاعدة المعمارية الأفضل هي:

Server-side bounded pagination is mandatory for potentially-large collections; the pagination strategy (page/offset or cursor) must be selected according to the query/use case and existing project architecture.
