# TripNest — Task Backlog

Prioritized backlog of completed work, known gaps, and planned features. Each item has an ID so it can be referenced in commits and PRs.

---

## ✅ Completed

| ID | Task |
|----|------|
| C1 | Migrate `InvalidatedToken` and `PasswordResetToken` to DB — logout and password-reset now persist across restarts |
| C2 | Rate limiting — `express-rate-limit` on `/register` (3/min), `/login` (5/min), `/forgot-password` (3/min) |
| C3 | Pagination — `?page=&limit=` (default 20, cap 100) on `/events`, `/upcoming`, `/search`; `X-Total-Count` header |
| C4 | Token cleanup job — `node-cron` daily at 02:00 deletes `InvalidatedToken` rows older than 7 days |
| C5 | Review booking gate — `createReview` requires a CONFIRMED booking for the event; returns 403 otherwise |
| C6 | Capacity re-check on `updateBooking` — correctly accounts for the booking's own existing count |
| FIX1 | DB-backed token blacklist in `AuthService` — `logout`, `verifyToken`, `isTokenBlacklisted` are now async and DB-backed |
| FIX2 | Booking capacity check — `createBooking` validates remaining capacity before insert; status starts as `PENDING` |
| FIX3 | Chat room join gated on confirmation — room is created/joined in `confirmBooking`, not `createBooking` |
| FIX4 | Auth middleware required everywhere — removed all `if (authMiddleware)` conditionals in event and review controllers |
| FIX5 | Public review GET routes — `GET /event/:eventId`, `/event/:eventId/rating`, `/:id` require no auth |
| FIX6 | Sentiment class mapping — POSITIVE→1, NEUTRAL→0, NEGATIVE→−1 |
| FIX7 | CORS locked to allowed origins — Socket.io and Express both use the same `allowedOrigins` list |
| MOOD1 | Mood auto-categorizer — keyword scoring across 10 categories assigns mood on event creation |
| MOOD2 | `UserMoodPreference` table + migration — per-user mood scores stored and updated automatically |
| MOOD3 | `GET /api/events/recommended` — returns CONFIRMED future events matching user's top moods |
| MOOD4 | Preference signals wired — booking confirm (+1.0), review ≥4 stars (+0.5), review ≤2 stars (−0.3) |
| SEARCH1 | Status filter pushed to DB — `findAll`, `findUpcoming`, `findByQuery`, `getEventsWithAvailableTickets` now filter `status=CONFIRMED` at query level |
| DOC1 | `docs/TASKS.md` and `docs/ARCHITECTURE.md` created |
| DOC2 | `docs/api.html` updated to reflect all API changes |
| DOC3 | Build script copies docs into dist so the deployed server serves them |

---

## 🔴 Critical — must fix before stable release

| ID | Task | Detail |
|----|------|--------|
| ~~C2~~ | ~~Rate limiting on auth endpoints~~ | ✅ Done — `express-rate-limit` on `/register` (3/min), `/login` (5/min), `/forgot-password` (3/min) |
| ~~C3~~ | ~~Pagination on event list endpoints~~ | ✅ Done — `?page=&limit=` (default 20, cap 100) on `/events`, `/upcoming`, `/search`; `X-Total-Count` header on every response |
| ~~C4~~ | ~~`InvalidatedToken` cleanup job~~ | ✅ Done — `node-cron` daily job at 02:00 deletes tokens older than 7 days |
| ~~C5~~ | ~~Gate reviews on confirmed bookings~~ | ✅ Done — `ReviewService.createReview` checks for a CONFIRMED booking; returns 403 if none found |
| ~~C6~~ | ~~Re-check capacity on `updateBooking`~~ | ✅ Done — subtracts booking's own current count before validating new ticket count against capacity |

---

## 🗺️ Map Integration

| ID | Task | Detail |
|----|------|--------|
| M1 | Add `latitude` and `longitude` to Event schema | `latitude Float?`, `longitude Float?` in `prisma/schema.prisma`. Migration required. |
| M2 | Auto-geocode on event creation | Call a geocoding API after `eventRepository.create`. Store returned lat/lng. Use **Nominatim** (free, no key) for now; swap to Mapbox for production accuracy. Fire-and-forget — don't fail the request if geocoding is unavailable. |
| M3 | `GET /api/events/nearby` endpoint | Query params: `lat`, `lng`, `radius` (km, default 10). Use Haversine formula in a `$queryRaw` to compute distance and filter. Return events sorted by distance ascending. |
| M4 | Expose coordinates in Event responses | Add `latitude` and `longitude` to the `Event` entity and all relevant API responses so the frontend can pin events on a map without a second lookup. |
| M5 | PostGIS for production geo queries | Enable the PostGIS extension on the PostgreSQL instance, add a `GEOGRAPHY` column, and replace the raw Haversine query with a proper `ST_DWithin` index scan. Significant performance gain at scale. |
| M6 | Geocode existing events via migration script | One-off script to back-fill lat/lng for events already in the DB by geocoding their `location` string. |

---

## 💳 Payment Integration

| ID | Task | Detail |
|----|------|--------|
| P1 | Choose payment provider | **Stripe** recommended — excellent Node SDK, webhook support, test mode, and handles PCI compliance. Needs a Stripe account and `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` env vars. |
| P2 | Add payment fields to Booking schema | `paymentIntentId String?`, `paymentStatus String?` (UNPAID / PAID / REFUNDED) on the `Booking` model. Migration required. |
| P3 | Create payment intent on booking | When `createBooking` is called, create a Stripe `PaymentIntent` for `totalPrice`. Return `clientSecret` in the response so the frontend can render the Stripe payment form. |
| P4 | Webhook handler for payment events | `POST /api/payments/webhook` (public, signature-verified). On `payment_intent.succeeded` → confirm the booking automatically. On `payment_intent.payment_failed` → cancel the booking. |
| P5 | Refund on booking cancellation | When `cancelBooking` is called and `paymentStatus === PAID`, issue a Stripe refund via `stripe.refunds.create`. Update `paymentStatus` to `REFUNDED`. |
| P6 | Payment dashboard for organizers | Surface per-event revenue and payout status in `GET /api/dashboard/summary`. |

---

## 🧠 AI Mood Classification (Option B)

*Option A (keyword scoring) is live. Option B uses an AI classifier for higher accuracy.*

| ID | Task | Detail |
|----|------|--------|
| A1 | Integrate AI classifier endpoint for mood | Call the same AI API used for sentiment analysis, with a prompt that maps event title + description to one of the 10 mood categories. Return the label and a confidence score. |
| A2 | Background mood classification job | Add `MoodJob` table (similar to `SentimentJob`). On event creation, enqueue a job. Worker calls the classifier and updates `Event.mood` with the AI-predicted value. |
| A3 | Confidence threshold fallback | If AI confidence < 0.6, fall back to the existing keyword scorer (Option A). Log the disagreement for future training data. |
| A4 | Admin mood override | Allow admin to manually correct an event's mood via `PATCH /api/admin/events/:id/mood`. Log the override in `ModerationLog`. |
| A5 | Feedback loop from sentiment | When sentiment analysis yields a strong signal (score > 0.8 POSITIVE or < −0.8 NEGATIVE), factor it into mood preference scores automatically. |

---

## 🔒 Security Hardening

| ID | Task | Detail |
|----|------|--------|
| S1 | Input sanitization middleware | Strip HTML/script tags from user-supplied string fields (event title/description, review comment, profile fields). Use `xss` or `sanitize-html`. |
| S2 | Add Helmet.js | Adds `X-Frame-Options`, `X-Content-Type-Options`, CSP, and other security headers in one line. |
| S3 | HTTPS + HSTS enforcement in production | Redirect HTTP → HTTPS at the reverse proxy or via `express-sslify`. Emit `Strict-Transport-Security` via Helmet. |
| S4 | Validate `JWT_SECRET` at startup | Fail fast if `JWT_SECRET` is missing or shorter than 32 characters. Add check in `src/index.ts` before any service is instantiated. |
| S5 | Password strength enforcement | On `register` and `change-password`, require minimum 8 characters, at least one uppercase letter, one digit. Validate with `zod`. |
| S6 | Admin endpoint hardening | Add an optional IP allowlist or require a secondary `X-Admin-Secret` header on `/api/admin/*` routes, separate from the user JWT. |
| S7 | Audit error responses for PII leakage | Confirm that stack traces, raw Prisma errors, and email addresses are never returned in production error payloads. |
| S8 | CSRF protection for cookie-based flows | If the API ever moves to cookie-based auth (e.g. for the admin dashboard), add `csurf` or `csrf-csrf` middleware. |
| S9 | Dependency vulnerability scan | Add `npm audit --audit-level=high` to CI. Pin critical packages. Set up Dependabot alerts on the repo. |

---

## ⚡ Caching

| ID | Task | Detail |
|----|------|--------|
| K1 | Event listing cache | Cache responses for `GET /api/events` and `GET /api/events/upcoming` with a 60-second TTL. Invalidate on event create, approve, or cancel. Use `lru-cache` for now. |
| K2 | Dashboard summary cache | `DashboardService.getSummary` runs several aggregate queries per page load. Add per-organizer in-memory cache with a 30-second TTL. |
| K3 | Sentiment summary cache | Cache `getEventSentimentSummary` per `eventId` with a 5-minute TTL. |
| K4 | Admin stats cache | `getAdminStats` runs 8 parallel `COUNT` queries per request. Cache with a 2-minute TTL. |
| K5 | Redis as shared cache | Introduce Redis as a shared cache and token-blacklist store to support horizontal scaling. Hide both in-memory and Redis drivers behind a `Cache` interface so callers do not change when the driver swaps. |
| K6 | Cache mood recommendations | `getRecommendedEvents` runs multiple DB queries per request. Cache per-user with a 5-minute TTL; invalidate on booking confirm or new review. |

---

## 📬 Job Queue

| ID | Task | Detail |
|----|------|--------|
| Q1 | Migrate sentiment worker to BullMQ | Replace the 5-second polling loop with a proper BullMQ queue backed by Redis. Jobs are pushed on review creation; workers pull them. Supports retries, backoff, and concurrency. |
| Q2 | Email notification queue | Queue all outbound emails (booking confirmation, event cancellation, password reset) through BullMQ so the HTTP request returns immediately and delivery is retried on failure. |
| Q3 | Geocoding queue | Enqueue geocoding jobs on event creation so the HTTP response is not blocked on the geocoding API call. |
| Q4 | Mood classification queue | Enqueue AI mood classification jobs (Option B) on event creation via BullMQ. |
| Q5 | Dead letter queue and retry policy | Configure a DLQ for failed jobs after 3 attempts. Expose a `GET /api/admin/queue/failed` endpoint so admins can inspect and replay failed jobs. |
| Q6 | Bull Board dashboard | Mount `@bull-board/express` at `/admin/queues` (behind admin auth) for a visual queue inspector. |

---

## 🚀 Deployment

| ID | Task | Detail |
|----|------|--------|
| DEP1 | Dockerfile | Multi-stage build: `node:20-alpine` builder → slim runtime image. Copy only `dist/`, `generated/`, `package.json`, and `node_modules --production`. |
| DEP2 | Docker Compose for local dev | Services: `app`, `postgres`, `redis`. Mount `src/` as a volume with `ts-node-dev` for hot reload. |
| DEP3 | GitHub Actions CI pipeline | On every PR: install deps → `tsc` type-check → `npm test` → `npm run build`. Block merge on failure. |
| DEP4 | GitHub Actions CD pipeline | On merge to `main`: build Docker image → push to registry (GHCR or Docker Hub) → deploy to server via SSH or a platform hook (Render, Railway, Fly.io). |
| DEP5 | Prisma migrate deploy in CI | Run `npx prisma migrate deploy` as part of the deployment step before the new image starts. Never run `migrate dev` in production. |
| DEP6 | Environment config management | Use a secrets manager (Doppler, AWS SSM, or GitHub Secrets) instead of `.env` files committed to the repo. Validate all required env vars at startup with `zod`. |
| DEP7 | Health check endpoint | `GET /health` returns DB connectivity, Redis connectivity, sentiment worker heartbeat, uptime, and app version. Used by load balancers. |
| DEP8 | Horizontal scaling readiness | Ensure no in-process state (token blacklist, job locks) blocks running multiple instances. Requires K5 (Redis cache) and Q1 (BullMQ) first. |

---

## 🔧 Concurrency and Race Conditions

| ID | Task | Detail |
|----|------|--------|
| R1 | Atomic booking capacity check | `createBooking` reads capacity and inserts in two queries — two concurrent requests for the last seat can both pass. Wrap in `prisma.$transaction` with `Serializable` isolation. |
| R2 | Wrap organizer approval in a transaction | `approveProfile` updates status and assigns the role in two queries. Partial failure leaves the DB inconsistent. Wrap in `$transaction`. |
| R3 | Prevent duplicate sentiment job pickup | `SentimentWorker.findPendingJobs` can return the same row to two workers. Use `SELECT ... FOR UPDATE SKIP LOCKED` or compare-and-swap. Resolved by Q1. |
| R4 | Organizer re-application flow | Rejected organizers cannot edit their profile. Allow edits and reset status to `PENDING` on save so they can re-submit for approval. |

---

## 🧹 Business Logic Gaps

| ID | Task | Detail |
|----|------|--------|
| B1 | Consolidate event cancellation | `AdminService.cancelEvent` calls `prisma.event.update` directly, bypassing `EventService.cancelEvent`. Delegate to the service. |
| B2 | Structured moderation metadata | `ModerationLog` has no `metadata` column. Add `metadata Json?` and persist rejection codes and structured context. |
| B3 | Booking cancellation notifications | When a booking is cancelled, email the organizer and user. Depends on Q2. |
| B4 | Event cancellation notifications | When an event is cancelled, email all users with a confirmed booking. Depends on Q2. |
| B5 | Graceful handling of empty review comments | Skip sentiment job creation when the review comment is null or blank. |
| B6 | Organizer dashboard booking management | Organizers should be able to view and confirm/reject bookings for their own events from a dedicated endpoint without going through admin. |

---

## 🛠️ Developer Experience and Observability

| ID | Task | Detail |
|----|------|--------|
| D1 | Structured logging | Replace all `console.log` / `console.error` with `pino`. Include request IDs, module context, and log levels. |
| D2 | Auto-generated OpenAPI docs | Adopt `swagger-jsdoc` + `swagger-ui-express` to generate docs from route and DTO definitions instead of a hand-authored HTML file. |
| D3 | Booking flow integration tests | Vitest integration tests for the full create → confirm → cancel booking cycle using a test database. |
| D4 | Sentiment worker backoff | Add exponential backoff (up to 60 seconds) when the queue is empty. Resolved by Q1. |
| D5 | Pagination total counts on admin lists | `GET /api/admin/users` and `GET /api/admin/organizers/all` return no total count. Add `{ data, total, page, limit }` envelope. |
| D6 | Request ID tracing | Generate a `X-Request-ID` header per request, thread it through all log lines, and return it in error responses for easier debugging. |
