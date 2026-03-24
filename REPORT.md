# TripNest — Project Report

**Project:** TripNest Backend API
**Date:** March 2026
**Stack:** Node.js · TypeScript · Express.js · PostgreSQL · Prisma ORM
**Status:** Feature-complete core; production-hardening in progress

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Objectives](#2-objectives)
3. [Tech Stack & Rationale](#3-tech-stack--rationale)
4. [System Architecture](#4-system-architecture)
5. [Database Design](#5-database-design)
6. [Module Breakdown](#6-module-breakdown)
7. [API Reference Summary](#7-api-reference-summary)
8. [Security Design](#8-security-design)
9. [Sentiment Analysis Pipeline](#9-sentiment-analysis-pipeline)
10. [Testing](#10-testing)
11. [Project Structure](#11-project-structure)
12. [Setup & Running](#12-setup--running)
13. [Known Issues & Future Work](#13-known-issues--future-work)

---

## 1. Project Overview

TripNest is a RESTful backend API for an event booking platform. It enables users to discover and book events, leave reviews, and communicate in event chat rooms. Organizers can manage their events and track revenue via a dashboard. Administrators moderate organizers and events through an approval workflow. Review comments are automatically analyzed for sentiment using an AI pipeline.

The system is designed around a service-repository pattern with clearly separated modules, making each domain feature independently maintainable and testable.

---

## 2. Objectives

| # | Objective |
|---|-----------|
| 1 | Provide secure user authentication with role-based access control |
| 2 | Allow organizers to create and manage events with an admin approval workflow |
| 3 | Enable users to book tickets, confirm, and cancel bookings |
| 4 | Allow users to review events with automatic AI sentiment analysis |
| 5 | Provide organizers with revenue and booking analytics via a dashboard |
| 6 | Support real-time chat for event participants |
| 7 | Give administrators tools to moderate organizers and events |

---

## 3. Tech Stack & Rationale

| Component | Technology | Reason |
|-----------|-----------|--------|
| Runtime | Node.js 18+ | Non-blocking I/O, large ecosystem |
| Language | TypeScript 5.9 | Type safety, better DX, fewer runtime errors |
| Framework | Express.js 5 | Minimal, flexible, well-understood |
| Database | PostgreSQL | Relational data with complex joins and integrity constraints |
| ORM | Prisma 7 | Type-safe queries, auto-generated migrations, Prisma Studio |
| Auth | JWT (jsonwebtoken) | Stateless, scalable, 7-day expiry |
| Password Hashing | bcrypt | Resistant to brute-force; industry standard |
| File Upload | Cloudinary | Managed image hosting with CDN |
| Real-time | Socket.io 4 | Bidirectional events for chat |
| Email | Nodemailer | Password reset emails |
| Testing | Vitest | Native ESM support, fast, TypeScript-first |
| Module System | ESM (Node16) | Modern module resolution, tree-shakeable |

---

## 4. System Architecture

TripNest follows a layered architecture with three primary layers:

```
HTTP Request
     │
     ▼
┌─────────────┐
│  Controller  │  ← Parses request, calls service, sends response
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Service    │  ← Business logic, validation, domain rules
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Repository  │  ← Data access abstraction (interface + Prisma impl)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  PostgreSQL  │
└─────────────┘
```

### Key Architectural Decisions

**Repository Pattern**
Each module defines an interface (e.g., `EventRepository`) with a concrete `PrismaEventRepository` implementation. This decouples business logic from the database, making services independently unit-testable by swapping in mock repositories.

**Dependency Injection via Constructor**
Services and repositories are wired together in `src/index.ts` (the composition root). No IoC container is used — plain constructor injection keeps the setup transparent and straightforward.

**Background Job Worker**
Sentiment analysis runs in a background worker (`SentimentWorker`) that polls for `PENDING` jobs every 5 seconds. This keeps review creation non-blocking.

**Role-Based Access Control (RBAC)**
Three roles — `USER`, `ORGANIZER`, `ADMIN` — are enforced by middleware on each route. Organizers must also have `APPROVED` status before they can create events.

---

## 5. Database Design

The database consists of 15 models across five domains.

### Entity Relationship Overview

```
User ──────────── UserProfile        (1:1)
User ──────────── OrganizerProfile   (1:1)
User ──────────── Booking[]          (1:N)
User ──────────── Review[]           (1:N)
OrganizerProfile ─── Event[]         (1:N)
Event ─────────── Booking[]          (1:N)
Event ─────────── Review[]           (1:N)
Event ─────────── ChatRoom           (1:1)
Review ────────── SentimentJob       (1:1)
Review ────────── SentimentResult[]  (1:N)
ChatRoom ──────── ChatMember[]       (1:N)
ChatRoom ──────── ChatMessage[]      (1:N)
```

### Core Models

| Model | Key Fields |
|-------|-----------|
| `User` | id, email (unique), name, password, roles |
| `UserProfile` | fullName, phone, dateOfBirth, gender, profilePictureUrl |
| `OrganizerProfile` | organizationName, contactNumber, status (PENDING/APPROVED/REJECTED) |
| `Event` | title, description, date, location, capacity, price, mood, status |
| `Booking` | userId, eventId, ticketCounts, unitPrice, totalPrice, status |
| `Review` | userId, eventId, rating (1–5), comment, sentimentStatus |
| `SentimentJob` | reviewId, status (PENDING/PROCESSING/DONE/FAILED), attempts |
| `SentimentResult` | reviewId, class, sentimentLabel, sentimentScore |
| `ChatRoom` | eventId (unique) |
| `ChatMessage` | chatRoomId, senderId, content |
| `ModerationLog` | entityType, entityId, adminId, action, reason |

### Enums

| Enum | Values |
|------|--------|
| `Status` | PENDING, CONFIRMED, CANCELLED |
| `ApprovalStatus` | PENDING, APPROVED, REJECTED |
| `RoleType` | USER, ORGANIZER, ADMIN |
| `SentimentStatus` | PENDING, ANALYZED, FAILED |
| `JobStatus` | PENDING, PROCESSING, DONE, FAILED |

---

## 6. Module Breakdown

The codebase is organized into 12 feature modules under `src/modules/`.

### Auth
Handles user registration, login, logout, password change, and password reset via email token.
- JWT tokens expire in 7 days
- Passwords hashed with bcrypt (salt rounds: 10)
- Forgot/reset password flow uses a time-limited (1 hour) token sent via email

### Event
Full event lifecycle management.
- Events start in `PENDING` status; admin must approve them to `CONFIRMED`
- Only `APPROVED` organizers can create events
- Validated fields: title (≤255 chars), description (≤5000 chars), date (must be future), capacity (1–100,000), price (0–1,000,000)
- Events with confirmed bookings cannot be deleted

### Booking
Ticket purchasing system with price calculation.
- Only `CONFIRMED` events can be booked
- Price calculated as `ticketCounts × event.price`
- Creating a booking also adds the user to the event's chat room
- Booking statuses: PENDING → CONFIRMED → CANCELLED

### Review
User reviews for events.
- One review per user per event (enforced in service layer)
- Rating must be between 1 and 5
- Creating a review with a comment automatically queues a sentiment analysis job
- Sentiment job failures do not prevent review creation

### Sentiment
AI-powered background analysis of review comments.
- Polled every 5 seconds by a background worker
- Fallback chain: Custom AI API → OpenAI API → Mock keyword analyzer
- Results stored in `SentimentResult` with label (POSITIVE/NEGATIVE/NEUTRAL) and score (−1 to 1)
- Maximum 3 retry attempts per job

### Admin
Moderation tools for platform administrators.
- Approve or reject organizer profiles (with optional reason)
- Approve or reject events
- All actions logged to `ModerationLog`

### Dashboard
Analytics for organizers.
- Total revenue, booking counts, and per-event summaries
- Restricted to the organizer's own events

### Organizer
Organizer profile management.
- Create and update organizer profile
- View approval status and rejection reason

### Profile
User profile management.
- Optional fields: full name, phone, date of birth, gender, profile picture (Cloudinary)

### Chatting
Real-time event chat powered by Socket.io.
- One chat room per event
- Users are added to the room when their booking is confirmed
- Messages stored in `ChatMessage`

### Utils
- `cloudinary.ts` — Image upload helper
- `email.ts` — Nodemailer password reset email sender

---

## 7. API Reference Summary

**Base URL:** `http://localhost:3000/api`

**Authentication:** `Authorization: Bearer <token>`

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | No | Create account |
| POST | `/auth/login` | No | Login, receive JWT |
| POST | `/auth/logout` | No | Blacklist token |
| POST | `/auth/change-password` | Yes | Change password |
| POST | `/auth/forgot-password` | No | Send reset email |
| POST | `/auth/reset-password` | No | Reset with token |

### Events

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/events` | No | All confirmed events |
| GET | `/events/upcoming` | No | Upcoming events |
| GET | `/events/search` | No | Search by location/keyword/mood |
| GET | `/events/tickets/availability` | No | Sorted by availability |
| GET | `/events/:id` | No | Single event |
| POST | `/events` | ORGANIZER | Create event |
| PATCH | `/events/:id` | ORGANIZER/ADMIN | Update event |
| DELETE | `/events/:id` | ORGANIZER/ADMIN | Delete event |

### Bookings

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/bookings/me` | Yes | My bookings |
| GET | `/bookings/:id` | Yes | Single booking |
| POST | `/bookings` | Yes | Create booking |
| PATCH | `/bookings/:id` | Yes | Update ticket count |
| PATCH | `/bookings/:id/confirm` | Yes | Confirm booking |
| PATCH | `/bookings/:id/cancel` | Yes | Cancel booking |

### Reviews

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/reviews/event/:eventId` | Yes | Event reviews |
| GET | `/reviews/event/:eventId/rating` | Yes | Average rating |
| GET | `/reviews/my` | Yes | My reviews |
| GET | `/reviews/:id` | Yes | Single review |
| POST | `/reviews` | Yes | Create review |
| PATCH | `/reviews/:id` | Yes | Update review |
| DELETE | `/reviews/:id` | Yes | Delete review |

### Sentiment

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/sentiment/review/:reviewId` | Yes | Sentiment result |
| GET | `/sentiment/worker/status` | Yes | Worker running state |
| POST | `/sentiment/worker/start` | Yes | Start worker |
| POST | `/sentiment/worker/stop` | Yes | Stop worker |

### Organizer

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/organizers/me` | ORGANIZER | My profile |
| POST | `/organizers` | Yes | Create profile |
| PATCH | `/organizers/me` | ORGANIZER | Update profile |

### Dashboard

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/dashboard` | ORGANIZER | Revenue & booking summary |

### Admin

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/admin/organizers` | ADMIN | List all organizers |
| PATCH | `/admin/organizers/:id/approve` | ADMIN | Approve organizer |
| PATCH | `/admin/organizers/:id/reject` | ADMIN | Reject organizer |
| GET | `/admin/events` | ADMIN | List all events |
| PATCH | `/admin/events/:id/approve` | ADMIN | Approve event |
| PATCH | `/admin/events/:id/reject` | ADMIN | Reject event |

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK |
| 201 | Created |
| 400 | Bad Request — invalid input |
| 401 | Unauthorized — missing or invalid token |
| 403 | Forbidden — insufficient role |
| 404 | Not Found |
| 409 | Conflict — e.g., duplicate email or review |
| 500 | Internal Server Error |

---

## 8. Security Design

| Concern | Implementation |
|---------|---------------|
| Password storage | bcrypt with 10 salt rounds |
| Authentication | JWT (HS256), 7-day expiry |
| Token revocation | In-memory blacklist on logout |
| Role enforcement | `hasRole()` middleware per route |
| Organizer gating | APPROVED status check before event creation |
| Email enumeration | `forgotPassword` always returns success |
| Password reset | Cryptographically random 32-byte hex token, 1-hour expiry, single-use |

> **Note:** Token blacklist and reset tokens are currently stored in memory. They are lost on server restart. For production, these should be persisted to Redis or the database.

---

## 9. Sentiment Analysis Pipeline

When a user creates a review with a comment, the following pipeline runs asynchronously:

```
Review Created
      │
      ▼
SentimentJob created (status: PENDING)
      │
      ▼ (every 5 seconds)
SentimentWorker picks up job
      │
      ├── Try: Custom AI API  (AI_API env var)
      ├── Fallback: OpenAI API  (OPENAI_API_KEY env var)
      └── Fallback: Mock keyword analyzer
      │
      ▼
SentimentResult saved
(label: POSITIVE | NEGATIVE | NEUTRAL, score: -1.0 to 1.0)
      │
      ▼
Review sentimentStatus updated to ANALYZED
```

Jobs that fail are retried up to 3 times before being marked `FAILED`.

---

## 10. Testing

Unit tests were written using **Vitest** to cover the core business logic layer (services and the `Booking` entity).

### Test Summary

| File | Tests | Coverage |
|------|-------|---------|
| `booking/booking.entity.test.ts` | 7 | `calculateTotalPrice`, `updateTicketCounts`, `comfirmBooking` |
| `auth/auth.service.test.ts` | 25 | register, login, token lifecycle, password change, reset flow |
| `event/event.service.test.ts` | 30 | All validation rules, organizer approval, cancel, delete guards |
| `booking/booking.service.test.ts` | 21 | Create with pricing, confirm, cancel, update, chat integration |
| `review/review.service.test.ts` | 22 | CRUD, ownership checks, sentiment job trigger and failure isolation |
| **Total** | **105** | **All passing** |

### Running Tests

```bash
npm run test          # watch mode
npm run test:run      # single run (CI)
npm run test:coverage # with coverage report
```

### Testing Approach

- Services accept repository **interfaces** as constructor arguments, so mock repositories are plain objects with `vi.fn()` — no mocking framework needed.
- External side effects (email sending) use `vi.mock()`.
- No database is required to run any test.

---

## 11. Project Structure

```
tripNest/
├── src/
│   ├── index.ts                  # App bootstrap & dependency wiring
│   ├── server.ts                 # HTTP server entry point
│   └── modules/
│       ├── auth/                 # Registration, login, JWT, password reset
│       ├── event/                # Event CRUD and approval workflow
│       ├── booking/              # Booking lifecycle and pricing
│       ├── review/               # Reviews and sentiment job creation
│       ├── sentiment/            # AI analysis worker and results
│       ├── organizer/            # Organizer profile management
│       ├── profile/              # User profile management
│       ├── admin/                # Admin moderation actions
│       ├── dashboard/            # Organizer analytics
│       ├── chatting/             # Chat rooms and messages
│       ├── database/             # Prisma client singleton
│       └── utils/                # Cloudinary, email helpers
├── prisma/
│   ├── schema.prisma             # Database schema
│   └── migrations/               # Migration history
├── generated/
│   └── prisma/                   # Auto-generated Prisma types
├── docs/
│   └── api.html                  # Interactive API documentation
├── scripts/                      # Utility scripts (e.g., add admin)
├── vitest.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## 12. Setup & Running

### Prerequisites

- Node.js >= 18
- PostgreSQL database

### Installation

```bash
# 1. Clone and install
git clone <repository-url>
cd tripNest
npm install

# 2. Configure environment
cp .env.example .env
# Fill in DATABASE_URL, JWT_SECRET, and optional AI keys

# 3. Run migrations and generate Prisma client
npx prisma migrate dev
npm run prisma:generate

# 4. Start development server
npm run dev
```

Server runs at `http://localhost:3000`.

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | Secret for signing JWTs | Yes |
| `PORT` | Server port (default: 3000) | No |
| `AI_API` | Custom sentiment analysis endpoint | No |
| `OPENAI_API_KEY` | OpenAI fallback for sentiment | No |
| `CLOUDINARY_*` | Cloudinary credentials for image upload | No |
| `EMAIL_*` | SMTP credentials for password reset emails | No |

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (tsx) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled production server |
| `npm run test` | Run tests in watch mode |
| `npm run test:run` | Run tests once (CI) |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run prisma:generate` | Regenerate Prisma client |
| `npm run prisma:migrate` | Run pending migrations |
| `npm run prisma:studio` | Open Prisma Studio GUI |

---

## 13. Known Issues & Future Work

### Known Issues

| Issue | Severity | Description |
|-------|----------|-------------|
| In-memory token blacklist | High | Logout tokens are lost on restart; revoked tokens become valid again |
| In-memory password reset tokens | High | Reset links become invalid after server restart |
| Sentiment label mismatch | Medium | `SentimentResult.class` integer values may not map correctly to string labels in summary queries |
| Default booking status | Low | Was temporarily set to CONFIRMED for testing — should be reverted to PENDING for production |

### Recommended Improvements

1. **Persist token blacklist** — Move to Redis or a `BlacklistedToken` DB table with TTL cleanup
2. **Persist reset tokens** — Store in a `PasswordResetToken` DB table with `expiresAt` and `usedAt` columns
3. **Request validation middleware** — Add Zod or Joi schemas at the controller layer to validate all incoming payloads
4. **Rate limiting** — Apply `express-rate-limit` to auth endpoints (register, login, forgot-password)
5. **Pagination** — Add cursor or offset pagination to list endpoints (`/events`, `/reviews`, etc.)
6. **Integration tests** — Add tests that hit a real (test) database to cover repository implementations
7. **Chat end-to-end verification** — Confirm Socket.io real-time events work with the REST booking flow
8. **Sentiment worker efficiency** — Replace polling with a queue (e.g., BullMQ + Redis) for more responsive processing
9. **HTTPS enforcement** — Add HSTS and redirect HTTP → HTTPS in production
10. **Structured logging** — Replace `console.log` with a structured logger (e.g., Pino)

---

*Generated: March 2026*
