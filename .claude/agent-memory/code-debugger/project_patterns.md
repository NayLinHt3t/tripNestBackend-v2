---
name: project-patterns
description: Recurring bug patterns, architectural quirks, and applied fixes in the TripNest backend
metadata:
  type: project
---

## Applied fixes (2026-09-03)

### Auth service: verifyToken and logout are now async
`AuthService.verifyToken` was changed from sync to `async Promise<AuthPayload | null>` because `isTokenBlacklisted` now does a DB lookup. `logout` is also async. All callers must `await` both. `auth.middleware.ts` was updated accordingly.

**Why:** Token blacklist and password reset tokens were module-level in-memory globals wiped on restart; moved to `InvalidatedToken` and `PasswordResetToken` Prisma models.

### Prisma schema requires `generate` after schema changes
Two new models added but migration couldn't run (DB unreachable in dev). `npx prisma generate` was run separately to regenerate the client. The migration (`add-token-tables`) still needs to be applied against the live DB.

### Booking status default: PENDING not CONFIRMED
Bookings now start as `Status.PENDING`. `Status.CONFIRMED` is set only by the `confirmBooking` flow. Chat room join (`ensureRoomForEvent`) was moved out of `createBooking` and kept only in `confirmBooking`.

### Booking ownership: always check `booking.userId === userId`
`GET /:id`, `PATCH /:id/cancel`, `PATCH /:id` in booking controller all require ownership check after fetch. Use `getUserId(req)` then compare. `PATCH /:id/confirm` is restricted to ORGANIZER or ADMIN role via `hasRole`.

### Capacity check: `countConfirmedTickets` must be called before creating a booking
Added to `BookingRepository` interface and `PrismaBookingRepository`. Uses `prisma.booking.aggregate` with `_sum.ticketCounts`.

### Router factory authMiddleware pattern
`createEventRouter` had optional `authMiddleware?: RequestHandler` with `if (authMiddleware)` branches — changed to required. `createReviewRouter` was changed to accept a required `authMiddleware` parameter and removed from the global mount in `index.ts`.

### Sentiment: mapLabelToClass must return 0 for NEUTRAL
The original returned `-1` for anything that wasn't "POSITIVE", making NEUTRAL reviews count as negative. `getEventSentimentSummary` counts `class === 0` as neutral, so the fix is to explicitly return `0` for non-POSITIVE, non-NEGATIVE labels.

### allowedOrigins must be exported from index.ts for use in server.ts
Socket.io previously used `cors: { origin: "*" }`. Fixed by exporting `allowedOrigins` from `index.ts` and importing it in `server.ts`.
