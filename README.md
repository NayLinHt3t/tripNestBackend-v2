# TripNest API

A RESTful API for event booking and review management built with Express.js, TypeScript, and Prisma.

## Features

- 🔐 **Authentication** - JWT-based authentication with register, login, and logout
- 📅 **Events** - Create, read, update, delete events
- 🎫 **Bookings** - Book events, confirm/cancel bookings
- ⭐ **Reviews** - Rate and review events
- 🧠 **Sentiment Analysis** - AI-powered sentiment analysis of review comments with fallback chain:
  1. Custom AI API (primary)
  2. OpenAI API (backup)
  3. Mock analyzer (fallback)

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** PostgreSQL (Prisma Postgres)
- **ORM:** Prisma
- **Authentication:** JWT (jsonwebtoken)
- **Password Hashing:** bcrypt
- **AI Integration:** Custom AI API / OpenAI API

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

| Variable         | Description                           | Required |
| ---------------- | ------------------------------------- | -------- |
| `DATABASE_URL`   | PostgreSQL connection string          | Yes      |
| `JWT_SECRET`     | Secret key for JWT tokens             | Yes      |
| `PORT`           | Server port (default: 3000)           | No       |
| `AI_API`         | Custom AI sentiment analysis endpoint | No       |
| `OPENAI_API_KEY` | OpenAI API key (fallback)             | No       |

## API Documentation

📖 **Interactive API Documentation:** Open [docs/api.html](docs/api.html) in your browser for detailed API documentation with examples.

### Quick Reference

#### Base URL

```
http://localhost:3000/api
```

#### Authentication

All protected routes require a Bearer token:

```
Authorization: Bearer <your-jwt-token>
```

### Endpoints Overview

| Method | Endpoint                             | Auth | Description                 |
| ------ | ------------------------------------ | ---- | --------------------------- |
| POST   | `/api/auth/register`                 | No   | Create new account          |
| POST   | `/api/auth/login`                    | No   | Login and get token         |
| POST   | `/api/auth/logout`                   | No   | Invalidate token            |
| GET    | `/api/events`                        | No   | Get all events              |
| GET    | `/api/events/upcoming`               | No   | Get upcoming events         |
| GET    | `/api/events/search?location=`       | No   | Search events by location   |
| GET    | `/api/events/:id`                    | No   | Get event by ID             |
| POST   | `/api/events`                        | No   | Create event                |
| PATCH  | `/api/events/:id`                    | No   | Update event                |
| DELETE | `/api/events/:id`                    | No   | Delete event                |
| GET    | `/api/bookings/:id`                  | Yes  | Get booking by ID           |
| POST   | `/api/bookings`                      | Yes  | Create booking              |
| PATCH  | `/api/bookings/:id`                  | Yes  | Update booking              |
| PATCH  | `/api/bookings/:id/confirm`          | Yes  | Confirm booking             |
| PATCH  | `/api/bookings/:id/cancel`           | Yes  | Cancel booking              |
| GET    | `/api/reviews/event/:eventId`        | Yes  | Get reviews for event       |
| GET    | `/api/reviews/event/:eventId/rating` | Yes  | Get event average rating    |
| GET    | `/api/reviews/my`                    | Yes  | Get user's reviews          |
| GET    | `/api/reviews/:id`                   | Yes  | Get review by ID            |
| POST   | `/api/reviews`                       | Yes  | Create review (triggers AI) |
| PATCH  | `/api/reviews/:id`                   | Yes  | Update review               |
| DELETE | `/api/reviews/:id`                   | Yes  | Delete review               |
| GET    | `/api/sentiment/review/:reviewId`    | Yes  | Get sentiment for review    |
| GET    | `/api/sentiment/worker/status`       | Yes  | Get worker status           |
| POST   | `/api/sentiment/worker/start`        | Yes  | Start sentiment worker      |
| POST   | `/api/sentiment/worker/stop`         | Yes  | Stop sentiment worker       |

## Sentiment Analysis

The API includes AI-powered sentiment analysis for review comments. When a review is created, a background job analyzes the comment and assigns:

- **Label:** `POSITIVE`, `NEGATIVE`, or `NEUTRAL`
- **Score:** A number from -1 (most negative) to 1 (most positive)

### Analyzer Priority Chain

1. **Custom AI API** (`AI_API` env var) - Your own sentiment analysis endpoint
2. **OpenAI API** (`OPENAI_API_KEY` env var) - Falls back to OpenAI if custom API fails
3. **Mock Analyzer** - Keyword-based fallback if both APIs are unavailable

### Custom AI API Contract

If using a custom AI API, it should:

**Request:**

```json
POST /your-endpoint
Content-Type: application/json

{ "text": "Review comment to analyze" }
```

**Response:**

```json
{
  "label": "POSITIVE",
  "score": 0.85
}
```

## Project Structure

```
tripNest/
├── src/
│   ├── index.ts              # Application entry point
│   └── modules/
│       ├── auth/             # Authentication module
│       ├── booking/          # Booking management
│       ├── database/         # Prisma client
│       ├── event/            # Event management
│       ├── review/           # Review management
│       └── sentiment/        # AI sentiment analysis
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── migrations/           # Database migrations
├── docs/
│   └── api.html              # Interactive API documentation
└── generated/                # Prisma generated types
```

## Scripts

| Script                    | Description              |
| ------------------------- | ------------------------ |
| `npm run dev`             | Start development server |
| `npm run build`           | Build for production     |
| `npm start`               | Start production server  |
| `npm run prisma:generate` | Generate Prisma client   |
| `npm run prisma:migrate`  | Run database migrations  |
| `npm run prisma:studio`   | Open Prisma Studio       |

## License

ISC
POST /api/auth/register

````

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
````

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

## Sentiment Analysis Endpoints

> ⚠️ All sentiment endpoints require authentication

Sentiment analysis runs automatically when a review with a comment is created. A background worker processes sentiment jobs asynchronously.

### How It Works

1. **Create Review** → Review created with `sentimentStatus: PENDING`
2. **Job Created** → `SentimentJob` queued for processing
3. **Worker Processes** → Background worker analyzes comment sentiment
4. **Review Updated** → `sentimentLabel`, `sentimentScore`, and `sentimentStatus: ANALYZED`

---

### Get Sentiment for Review

```
GET /api/sentiment/review/:reviewId
```

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`

```json
{
  "reviewId": "uuid",
  "label": "POSITIVE",
  "score": 0.85,
  "status": "ANALYZED"
}
```

---

### Get Worker Status

```
GET /api/sentiment/worker/status
```

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`

```json
{
  "running": true
}
```

---

### Start Worker

```
POST /api/sentiment/worker/start
```

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`

```json
{
  "message": "Worker started"
}
```

---

### Stop Worker

```
POST /api/sentiment/worker/stop
```

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`

```json
{
  "message": "Worker stopped"
}
```

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

## Sentiment Status Values

| Status     | Description                       |
| ---------- | --------------------------------- |
| `PENDING`  | Review created, awaiting analysis |
| `ANALYZED` | Sentiment analysis completed      |
| `FAILED`   | Sentiment analysis failed         |

---

## Sentiment Labels

| Label      | Description                 |
| ---------- | --------------------------- |
| `POSITIVE` | Positive sentiment detected |
| `NEGATIVE` | Negative sentiment detected |
| `NEUTRAL`  | Neutral sentiment detected  |

---
