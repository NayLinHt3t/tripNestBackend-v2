# TripNest — Architecture

## Overview

TripNest is an Express + TypeScript REST API that powers an event-booking platform. Three actor types interact with the system:

- **Users** — browse and book events, chat with other attendees after confirming a booking, and leave reviews.
- **Organizers** — apply for an organizer account, create and manage events, confirm bookings, and view dashboard analytics and sentiment summaries of their reviews.
- **Admins** — approve organizer applications and events, moderate reviews, ban users, and monitor platform-wide statistics via an admin dashboard.

Long-running work (AI sentiment analysis of reviews) is handled by an in-process background worker. Real-time chat is served over Socket.io on the same HTTP server as the REST API.

---

## Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Language | TypeScript | ^5.9.3 |
| HTTP framework | Express | ^5.2.1 |
| ORM | Prisma | ^7.2.0 |
| Database | PostgreSQL | (managed) |
| Auth | jsonwebtoken | ^9.0.3 |
| Password hashing | bcrypt | ^6.0.0 |
| Real-time | socket.io | ^4.8.3 |
| Image uploads | cloudinary + multer | ^2.9.0 + ^2.0.2 |
| Email | nodemailer | ^8.0.0 |
| CORS | cors | ^2.8.6 |
| Config | dotenv | ^17.2.3 |
| Testing | vitest | ^4.1.1 |

---

## Module Map

| Module | Owns | Key Service Methods | Depends On |
|--------|------|---------------------|------------|
| `auth` | Registration, login, logout, password change/reset, DB-backed token blacklist | `register`, `login`, `logout`, `changePassword`, `forgotPassword`, `resetPassword`, `verifyToken` | `UserRepository`, `InvalidatedToken`, `PasswordResetToken` (Prisma) |
| `profile` | User profile CRUD (name, phone, DOB, gender, picture) | `getProfile`, `updateProfile` | Cloudinary (profile pictures) |
| `organizer` | Organizer profile CRUD, application + approval workflow, role assignment | `createProfile`, `updateProfile`, `approveProfile`, `rejectProfile`, `getPendingApprovals` | `prisma.role`, `prisma.userRole` (assigns ORGANIZER role on approval) |
| `event` | Event CRUD, image uploads, approval workflow (PENDING → CONFIRMED), ownership checks | `createEvent`, `updateEvent`, `deleteEvent`, `approveEvent`, `cancelEvent`, `searchEvents` | `OrganizerService`, Cloudinary, `ChatService` |
| `booking` | Booking lifecycle (PENDING → CONFIRMED → CANCELLED), capacity enforcement, ticket updates | `createBooking`, `confirmBooking`, `cancelBooking`, `updateBooking` | `BookingRepository`, `ChatService` (auto-join on confirm) |
| `review` | Review CRUD, duplicate check, average rating | `createReview`, `updateReview`, `deleteReview`, `getReviewsByEvent`, `getEventAverageRating` | `SentimentService` (job trigger on create) |
| `sentiment` | Async AI sentiment analysis via background worker, per-event summary for organizers | `createSentimentJob`, `processJob`, `getEventSentimentSummary`, `getEventSentiments` | External AI API (`AI_API` env var), `SentimentJob`, `SentimentResult` |
| `chat` | Real-time chat, one room per event, access gated by confirmed bookings | `ensureRoomForEvent`, `getOrCreateRoomForEvent`, `sendMessage`, `getMessages`, `leaveRoom` | `ChatRepository`, Socket.io (in `server.ts`) |
| `dashboard` | Organizer revenue and booking analytics | `getSummary`, `getEventRevenue`, `getRevenueTotals` | `DashboardRepository` |
| `admin` | Platform stats, organizer/event moderation, user ban/unban, moderation logging | `getAdminStats`, `approveOrganizer`, `rejectOrganizer`, `approveEvent`, `cancelEvent`, `banUser`, `unbanUser`, `getModerationLogs` | `OrganizerService`, `EventService`, `prisma` (direct for user ops) |

---

## Data Model Summary

| Model | Purpose | Key Relationships |
|-------|---------|-------------------|
| `User` | Core identity: email, password hash, ban flag | 1–1 `UserProfile`, 1–1 `OrganizerProfile`, 1–N `Booking`, 1–N `Review`, N–M `Role` via `UserRole` |
| `Role` / `UserRole` | Named roles (USER, ORGANIZER, ADMIN) in a join table | Roles are checked at runtime via `req.user.roles` in middleware |
| `UserProfile` | Personal details: full name, phone, date of birth, gender, profile picture URL | Belongs to `User` |
| `OrganizerProfile` | Organizer application data, status (PENDING / APPROVED / REJECTED), rejection reason and code, approval metadata | Belongs to `User`; owns `Event`s |
| `Event` | Event: title, description, date, location, capacity, price, mood, status (PENDING / CONFIRMED / CANCELLED) | Owned by `OrganizerProfile`; 1–N `EventImages`, `Booking`, `Review`; 1–1 `ChatRoom` |
| `EventImages` | Cloudinary image URLs attached to an event | Belongs to `Event` |
| `Booking` | A user's booking: ticket count, unit/total price, status (PENDING / CONFIRMED / CANCELLED) | Belongs to `User` and `Event` |
| `Review` | Rating (1–5) and optional comment for an event | Belongs to `User` and `Event`; triggers `SentimentJob` |
| `SentimentJob` | Queue entry for async sentiment processing; tracks attempts and status | 1–1 `Review`; produces `SentimentResult` |
| `SentimentResult` | Final AI output: sentiment class (1/0/−1), label, score, negative summary | 1–1 `Review` |
| `ChatRoom` | One room per event | Belongs to `Event`; N–M `User` via `ChatMember`; 1–N `ChatMessage` |
| `ChatMember` | Membership join table controlling access to a room | User + ChatRoom, unique constraint |
| `ChatMessage` | Persisted chat message | Belongs to `ChatRoom` and sender `User` |
| `ModerationLog` | Audit trail of all admin actions: entity type, entity ID, action, actor, reason | Written on every approve/reject/ban/flag action |
| `InvalidatedToken` | DB-backed JWT blacklist for logged-out tokens | Keyed by token string; cleaned up by a scheduled job (task C4) |
| `PasswordResetToken` | Single-use, time-limited password reset tokens | Keyed by random hex token; deleted on use |

---

## Request Flows

### 1. User books an event

```
POST /api/auth/register        → User created, USER role assigned
POST /api/auth/login           → JWT issued
GET  /api/events               → Browse CONFIRMED events
POST /api/bookings             → Booking created (status: PENDING)
                                  Capacity check: confirmedTickets + ticketCounts <= event.capacity
PATCH /api/bookings/:id/confirm  → (ORGANIZER or ADMIN)
                                  Status → CONFIRMED
                                  User added to ChatRoom via ChatMember
WS   socket.io connect         → User joins the event chat room
```

### 2. Organizer creates and publishes an event

```
POST /api/auth/register            → User created
POST /api/organizers               → OrganizerProfile created (status: PENDING)
PATCH /api/admin/organizers/:id/approve → (ADMIN)
                                        Status → APPROVED
                                        ORGANIZER role assigned to user
POST /api/events (multipart/form)  → Event created (status: PENDING), images uploaded to Cloudinary
PATCH /api/admin/events/:id/approve → (ADMIN)
                                      Status → CONFIRMED (event visible to users)
                                      ChatRoom created for the event
```

### 3. Review submission and sentiment analysis

```
POST /api/reviews               → Review created; SentimentJob enqueued (status: PENDING)
                                  [background: SentimentWorker polls every 5s]
SentimentWorker.processJob      → Calls external AI_API with review comment
                                  Result written to SentimentResult
                                  Review.sentimentStatus → ANALYZED
                                  SentimentJob.status   → DONE
GET /api/sentiment/:eventId/summary → Organizer views aggregate: positive/negative/neutral counts,
                                      average score
```

---

## Authentication and Authorization

**Token lifecycle:**
1. `POST /api/auth/login` verifies credentials, signs a 7-day JWT containing `userId`, `email`, and `roles`.
2. Every protected route passes through `authMiddleware`, which extracts the `Authorization: Bearer` token, verifies the signature, and checks that the token is not in `InvalidatedToken`. On success it attaches the payload to `req.user`.
3. `POST /api/auth/logout` inserts the current token into `InvalidatedToken`.

**Roles:**
- Stored in the `Role` table and joined to users via `UserRole` (many-to-many). A user can hold multiple roles simultaneously (e.g. USER + ORGANIZER).
- Guards are applied with `requireRoles('ADMIN')` or `hasRole(req, ['ORGANIZER', 'ADMIN'])` at the route or service layer.

**Ownership enforcement:**
- Booking read/cancel/update: `booking.userId === req.user.userId` (403 otherwise).
- Event update/delete: `organizer.userId === req.user.userId || isAdmin`.
- Review update/delete: `review.userId === req.user.userId`.
- Sentiment endpoints: `event.organizerId === req.user`'s organizer profile ID.

**Password reset:**
- `forgotPassword` generates a random token, stores it in `PasswordResetToken` with a 1-hour expiry, and emails a link.
- `resetPassword` validates and deletes the token, then updates the password hash.

---

## Concurrency Model

**Sentiment worker:**
- Single in-process instance (`SentimentWorker`) started in `index.ts`.
- Polls `SentimentJob` every 5 seconds, fetches up to 5 `PENDING` jobs per tick.
- Retries up to 3 times on failure; marks the job `FAILED` and the review `sentimentStatus: FAILED` after exhausting retries.
- Not safe for multi-instance deployments until task R3 (duplicate-pickup guard) is implemented.

**Known race condition — booking capacity (task R1):**
The capacity check in `createBooking` reads confirmed ticket totals and then inserts in two separate queries. Two concurrent requests for the last seat can both pass. Fix: wrap in `prisma.$transaction` with `Serializable` isolation, or use `SELECT ... FOR UPDATE` on the event row.

**Known race condition — organizer approval (task R2):**
`approveProfile` updates `OrganizerProfile.status` and calls `ensureUserRole` in sequence. A server failure between the two leaves the organizer marked APPROVED but without the ORGANIZER role. Fix: wrap in `$transaction`.

---

## Caching Strategy (Planned)

No caching is implemented yet. The plan below is tracked in `TASKS.md` (K1–K5).

| Cache target | Scope | TTL | Invalidation trigger |
|--------------|-------|-----|----------------------|
| `GET /api/events`, `GET /api/events/upcoming` | Global | 60 s | Event create, approve, cancel |
| `DashboardService.getSummary` | Per organizer | 30 s | New booking, booking status change |
| `getEventSentimentSummary` | Per event | 5 min | Time-based (sentiment is async) |
| Admin stats (`getAdminStats`) | Global | 2 min | Time-based |

**Implementation path:**
1. Phase 1: `lru-cache` in-process — simple, zero dependencies.
2. Phase 2: Replace with Redis behind a `Cache` interface — required once a second instance is deployed. The same Redis instance will also serve as the JWT blacklist store, removing the DB round-trip from every authenticated request.

---

## Security Measures

### Currently in place

| Measure | Implementation |
|---------|----------------|
| JWT authentication | Signed with `JWT_SECRET`, verified on every protected request |
| DB-backed token blacklist | Logged-out tokens stored in `InvalidatedToken`; checked on `verifyToken` |
| Password hashing | bcrypt with salt rounds = 10 |
| CORS allowlist | Explicit origins in `index.ts`; applied to both Express and Socket.io |
| Role-based access control | `requireRoles` middleware + service-layer `hasRole` checks |
| Ownership enforcement | Booking, review, and event mutations validate caller identity |
| Admin route isolation | `hasRole(['ADMIN'])` middleware applied before all `/api/admin/*` handlers |
| Moderation logging | Every admin action written to `ModerationLog` with actor, target, and reason |
| Single-use reset tokens | `PasswordResetToken` rows are deleted immediately on use |

### Planned (see TASKS.md)

- Rate limiting on auth endpoints (C2)
- Input sanitization middleware (S1)
- Helmet.js security headers (S2)
- HTTPS + HSTS enforcement (S3)
- `JWT_SECRET` length validation at startup (S4)
- Password strength requirements (S5)
- Admin IP allowlist or secondary secret header (S6)

---

## Deployment Notes

**Build and start:**
```bash
npm run build   # tsc + copies docs/ into dist/
npm start       # node dist/src/server.js
```

**Database:**
```bash
npx prisma migrate deploy   # run all pending migrations (including add-token-tables)
npx prisma generate         # regenerate client after schema changes
```

**Required environment variables:**

| Variable | Purpose | Notes |
|----------|---------|-------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `JWT_SECRET` | Token signing key | Must be ≥ 32 chars (validation pending — task S4) |
| `AI_API` | External sentiment analysis endpoint URL | App throws at startup if missing (graceful fallback pending) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary account | Required for image uploads |
| `CLOUDINARY_API_KEY` | Cloudinary API key | Required |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | Required |
| `SMTP_HOST` / `SMTP_*` | Nodemailer config | Required for password reset and notification emails |
| `FRONTEND_URL` | Main frontend origin | Added to CORS allowlist |
| `ADMIN_DASHBOARD_URL` | Admin dashboard origin | Added to CORS allowlist |

**Runtime notes:**
- Socket.io runs on the same HTTP server as Express — no separate port required.
- The sentiment worker starts automatically when the server starts and runs in the same Node.js process.
- The worker is not safe for multi-instance deployments until task R3 (distributed job lock) is implemented.
