# TripNest — Task Backlog

Prioritized backlog of known gaps, improvements, and follow-up work. Each item has an ID (e.g. C1, S2) so it can be referenced in commits and PRs.

---

## Critical — must fix before stable release

| ID | Task | Detail |
|----|------|--------|
| C1 | Run Prisma migration `add-token-tables` on the live database | Creates `InvalidatedToken` and `PasswordResetToken` tables. Without this, logout and password-reset flows will fail in production. Command: `npx prisma migrate deploy` |
| C2 | Rate limiting on auth endpoints | Apply per-IP limits to `POST /api/auth/login` (5/min), `POST /api/auth/register` (3/min), `POST /api/auth/forgot-password` (3/min). Use `express-rate-limit`; back with Redis when available. |
| C3 | Pagination on `GET /api/events` | Currently returns every event with no limit. Add `limit` + `offset` query params, cap at 100, return `X-Total-Count` header. Apply the same to `GET /api/events/upcoming`. |
| C4 | `InvalidatedToken` cleanup job | Blacklisted tokens accumulate forever. Add a scheduled task (e.g. `node-cron`) that deletes rows whose JWT `exp` has passed. Run daily. |

---

## Security Hardening

| ID | Task | Detail |
|----|------|--------|
| S1 | Input sanitization middleware | Strip HTML/script tags from user-supplied string fields (event title/description, review comment, profile fields). Use `xss` or `sanitize-html`. |
| S2 | Add Helmet.js | Adds `X-Frame-Options`, `X-Content-Type-Options`, CSP, and other security headers. Drop-in middleware before route registration. |
| S3 | HTTPS + HSTS enforcement in production | Redirect HTTP → HTTPS at the reverse proxy or via `express-sslify`. Emit `Strict-Transport-Security` via Helmet. |
| S4 | Validate `JWT_SECRET` at startup | Fail fast with a clear error if `JWT_SECRET` is missing or shorter than 32 characters. Add check in `src/index.ts` before any service is instantiated. |
| S5 | Password strength enforcement | On `register` and `change-password`, require minimum 8 characters, at least one uppercase letter, one digit. Validate with `zod` or `joi`. |
| S6 | Admin endpoint hardening | Add an optional IP allowlist or require a secondary `X-Admin-Secret` header on `/api/admin/*` routes, separate from the user JWT. |
| S7 | Audit error responses for PII leakage | Confirm that stack traces, raw Prisma errors, and email addresses are never returned in production error payloads. The global `sendError` in `shared/http.ts` already handles this for `AppError`, but verify uncaught paths. |

---

## Concurrency and Race Conditions

| ID | Task | Detail |
|----|------|--------|
| R1 | Atomic booking capacity check | `BookingService.createBooking` reads capacity and inserts in two separate queries — two concurrent requests for the last seat can both pass. Wrap in `prisma.$transaction` with `Serializable` isolation, or use `SELECT ... FOR UPDATE` on the event row. |
| R2 | Wrap organizer approval in a transaction | `OrganizerService.approveProfile` updates the status and assigns the role in two queries. A partial failure leaves the DB in an inconsistent state. Wrap both in `$transaction`. |
| R3 | Prevent duplicate sentiment job pickup on multi-instance | `SentimentWorker.findPendingJobs` can return the same row to two workers on separate instances. Use `UPDATE ... WHERE status = 'PENDING' RETURNING` (compare-and-swap), or `SELECT ... FOR UPDATE SKIP LOCKED`. |
| R4 | Re-check capacity on `updateBooking` | Increasing ticket count on an existing booking bypasses the capacity guard in `createBooking`. Apply the same `countConfirmedTickets` check before saving. |

---

## Caching

| ID | Task | Detail |
|----|------|--------|
| K1 | Event listing cache | Cache responses for `GET /api/events` and `GET /api/events/upcoming` with a 60-second TTL. Invalidate on event create, approve, or cancel. Use `lru-cache` or `node-cache`. |
| K2 | Dashboard summary cache | `DashboardService.getSummary` is called three times per dashboard page load (once per stat endpoint). Add a per-organizer in-memory cache with a 30-second TTL. |
| K3 | Sentiment summary cache | Cache `getEventSentimentSummary` per `eventId` with a 5-minute TTL. Sentiment jobs run async so a short stale window is acceptable. |
| K4 | Admin stats cache | `getAdminStats` runs 8 parallel `COUNT` queries per request. Cache the result with a 2-minute TTL. |
| K5 | Redis migration path | Introduce Redis as a shared cache and token-blacklist store to support horizontal scaling. Hide both in-memory and Redis drivers behind a `Cache` interface so callers do not change when the driver swaps. |

---

## Business Logic Gaps

| ID | Task | Detail |
|----|------|--------|
| B1 | Organizer re-application flow | Rejected organizers cannot currently edit their profile (`updateProfile` throws on REJECTED status). Allow edits and reset status to `PENDING` on save so they can re-submit for approval. |
| B2 | Consolidate event cancellation | `AdminService.cancelEvent` calls `prisma.event.update` directly, bypassing `EventService.cancelEvent`. Delegate to the service so future side-effects (notifications, etc.) stay in one place. |
| B3 | Structured moderation metadata | `ModerationAction.details` is defined in the entity but silently dropped because `ModerationLog` has no column for it. Add a `metadata Json?` column and persist rejection codes and structured context. |
| B4 | Booking cancellation notifications | When a booking is cancelled, email the organizer and offer a refund acknowledgement to the user. |
| B5 | Event cancellation notifications | When an event is cancelled by admin or organizer, email all users with a confirmed booking. |
| B6 | Gate reviews on confirmed bookings | Currently any authenticated user can review any event. Only users with a `CONFIRMED` booking for that event (past its date) should be allowed. Add this check in `ReviewService.createReview`. |
| B7 | Graceful handling of empty review comments | Skip sentiment job creation when the review comment is null or blank instead of enqueueing a job that will fail in the worker. |

---

## Developer Experience and Observability

| ID | Task | Detail |
|----|------|--------|
| D1 | Structured logging | Replace all `console.log` / `console.error` calls with `pino` or `winston`. Include request IDs, module context, and log levels. Disable verbose logs in production. |
| D2 | Health check endpoint | Add `GET /health` returning DB connectivity status, sentiment worker heartbeat, uptime, and app version. Used by load balancers and monitoring. |
| D3 | Auto-generated OpenAPI docs | The current `/` page serves a hand-authored HTML file. Adopt `tsoa` or `swagger-jsdoc` + `swagger-ui-express` to generate docs from route and DTO definitions. |
| D4 | Booking flow integration tests | Add Vitest integration tests for the full create → confirm → cancel booking cycle using a dedicated test database. |
| D5 | Sentiment worker backoff | The worker polls every 5 seconds even when there are no jobs. Add exponential backoff (up to 60 seconds) when the queue is empty; reset the interval when a job is found. |
| D6 | Pagination total counts on admin lists | `GET /api/admin/users` and `GET /api/admin/organizers/all` accept `limit`/`offset` but return no total count. Return `X-Total-Count` or include `{ data, total }` in the response. |
