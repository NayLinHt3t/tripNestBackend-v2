# TripNest API

A RESTful API for event booking and review management built with Express.js, TypeScript, and Prisma.

## Features

- 🔐 **Authentication** - JWT-based authentication with register, login, and logout
- 📅 **Events** - Create, read, update, delete events
- 🎫 **Bookings** - Book events, confirm/cancel bookings
- ⭐ **Reviews** - Rate and review events

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** PostgreSQL (Prisma Postgres)
- **ORM:** Prisma
- **Authentication:** JWT (jsonwebtoken)
- **Password Hashing:** bcrypt

## Getting Started

### Prerequisites

- Node.js >= 18
- PostgreSQL database (or Prisma Postgres)

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd tripNest
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env
# Edit .env with your database URL and JWT secret
```

4. Run database migrations:

```bash
npx prisma migrate dev
```

5. Start the development server:

```bash
npm run dev
```

The server will start on `http://localhost:3000`

## Environment Variables

| Variable       | Description                  | Default           |
| -------------- | ---------------------------- | ----------------- |
| `DATABASE_URL` | PostgreSQL connection string | -                 |
| `JWT_SECRET`   | Secret key for JWT tokens    | `your-secret-key` |
| `PORT`         | Server port                  | `3000`            |

---

# API Documentation

## Base URL

```
http://localhost:3000/api
```

## Authentication

All protected routes require a Bearer token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

---

## Auth Endpoints

### Register

Create a new user account.

```
POST /api/auth/register
```

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

**Response:** `201 Created`

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "userId": "uuid",
  "email": "user@example.com",
  "expiresIn": "24h",
  "message": "Registration successful"
}
```

---

### Login

Authenticate and get a JWT token.

```
POST /api/auth/login
```

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:** `200 OK`

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "userId": "uuid",
  "email": "user@example.com",
  "expiresIn": "24h",
  "message": "Login successful"
}
```

---

### Logout

Invalidate the current token.

```
POST /api/auth/logout
```

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`

```json
{
  "message": "Logout successful"
}
```

---

## Event Endpoints

### Get All Events

```
GET /api/events
```

**Response:** `200 OK`

```json
[
  {
    "id": "uuid",
    "title": "Summer Music Festival",
    "description": "A 3-day outdoor music festival",
    "date": "2026-07-15T18:00:00.000Z",
    "location": "Central Park, New York",
    "capacity": 5000,
    "price": 149.99,
    "createdAt": "2026-01-16T10:00:00.000Z"
  }
]
```

---

### Get Upcoming Events

```
GET /api/events/upcoming
```

**Response:** `200 OK` - Array of events with date >= now

---

### Search Events by Location

```
GET /api/events/search?location=New York
```

**Response:** `200 OK` - Array of matching events

---

### Get Event by ID

```
GET /api/events/:id
```

**Response:** `200 OK`

```json
{
  "id": "uuid",
  "title": "Summer Music Festival",
  "description": "A 3-day outdoor music festival",
  "date": "2026-07-15T18:00:00.000Z",
  "location": "Central Park, New York",
  "capacity": 5000,
  "price": 149.99,
  "createdAt": "2026-01-16T10:00:00.000Z"
}
```

---

### Create Event

```
POST /api/events
```

**Request Body:**

```json
{
  "title": "Summer Music Festival",
  "description": "A 3-day outdoor music festival",
  "date": "2026-07-15T18:00:00.000Z",
  "location": "Central Park, New York",
  "capacity": 5000,
  "price": 149.99
}
```

**Response:** `201 Created`

---

### Update Event

```
PATCH /api/events/:id
```

**Request Body:** (all fields optional)

```json
{
  "title": "Updated Title",
  "price": 199.99
}
```

**Response:** `200 OK`

---

### Delete Event

```
DELETE /api/events/:id
```

**Response:** `200 OK`

```json
{
  "message": "Event deleted successfully"
}
```

---

## Booking Endpoints

> ⚠️ All booking endpoints require authentication

### Create Booking

```
POST /api/bookings
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**

```json
{
  "eventId": "event-uuid",
  "ticketCounts": 2
}
```

**Response:** `201 Created`

```json
{
  "id": "uuid",
  "userId": "user-uuid",
  "eventId": "event-uuid",
  "ticketCounts": 2,
  "status": "PENDING"
}
```

---

### Get Booking by ID

```
GET /api/bookings/:id
```

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`

---

### Confirm Booking

```
PATCH /api/bookings/:id/confirm
```

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK` - Booking with status `CONFIRMED`

---

### Cancel Booking

```
PATCH /api/bookings/:id/cancel
```

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK` - Booking with status `CANCELLED`

---

### Update Booking

```
PATCH /api/bookings/:id
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**

```json
{
  "ticketCounts": 3
}
```

**Response:** `200 OK`

---

## Review Endpoints

> ⚠️ All review endpoints require authentication

### Get Reviews for Event

```
GET /api/reviews/event/:eventId
```

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`

```json
[
  {
    "id": "uuid",
    "userId": "user-uuid",
    "eventId": "event-uuid",
    "rating": 5,
    "comment": "Amazing event!",
    "createdAt": "2026-01-16T10:00:00.000Z"
  }
]
```

---

### Get Average Rating for Event

```
GET /api/reviews/event/:eventId/rating
```

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`

```json
{
  "eventId": "event-uuid",
  "averageRating": 4.5
}
```

---

### Get My Reviews

```
GET /api/reviews/my
```

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK` - Array of user's reviews

---

### Create Review

```
POST /api/reviews
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**

```json
{
  "eventId": "event-uuid",
  "rating": 5,
  "comment": "Amazing event!"
}
```

**Response:** `201 Created`

> Note: Users can only submit one review per event. Rating must be 1-5.

---

### Update Review

```
PATCH /api/reviews/:id
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**

```json
{
  "rating": 4,
  "comment": "Updated comment"
}
```

**Response:** `200 OK`

> Note: Users can only update their own reviews.

---

### Delete Review

```
DELETE /api/reviews/:id
```

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`

```json
{
  "message": "Review deleted successfully"
}
```

> Note: Users can only delete their own reviews.

---

## Status Codes

| Code  | Description                               |
| ----- | ----------------------------------------- |
| `200` | Success                                   |
| `201` | Created                                   |
| `400` | Bad Request - Invalid input               |
| `401` | Unauthorized - Missing or invalid token   |
| `403` | Forbidden - Not allowed to perform action |
| `404` | Not Found                                 |
| `409` | Conflict - Resource already exists        |
| `500` | Internal Server Error                     |

---

## Booking Status Values

| Status      | Description                            |
| ----------- | -------------------------------------- |
| `PENDING`   | Booking created, awaiting confirmation |
| `CONFIRMED` | Booking confirmed                      |
| `CANCELLED` | Booking cancelled                      |

---

## License

MIT
