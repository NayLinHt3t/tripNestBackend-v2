# TripNest Admin Dashboard — Frontend

A web-based admin dashboard for managing the TripNest platform. Built to interface with the TripNest REST API.

## Overview

The admin dashboard gives platform administrators full control over:
- Organizer applications (approve/reject)
- Event moderation (approve/cancel/delete)
- Review flagging
- Platform-wide statistics
- Moderation audit logs

---

## Recommended Tech Stack

| Concern | Recommendation |
|---|---|
| Framework | React 18+ (Vite) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui or Radix UI |
| State / Data fetching | TanStack Query (React Query) |
| Routing | React Router v6 |
| Forms | React Hook Form + Zod |
| Charts | Recharts or Chart.js |
| HTTP Client | Axios or native fetch |
| Auth storage | `localStorage` (JWT token) |

---

## Getting Started

### Prerequisites

- Node.js >= 18
- TripNest API running at `http://localhost:3000` (or deployed URL)
- An admin account (see [Creating an Admin Account](#creating-an-admin-account))

### Installation

```bash
# Create project
npm create vite@latest tripnest-admin -- --template react-ts
cd tripnest-admin

# Install dependencies
npm install react-router-dom @tanstack/react-query axios react-hook-form zod recharts
npm install -D tailwindcss @tailwindcss/vite
```

### Environment Variables

Create a `.env` file:

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

---

## Creating an Admin Account

Use the provided script in the backend repo:

```bash
cd /path/to/tripNest
node scripts/createAdmin.js
```

Then log in via `POST /api/auth/login` with the admin credentials.

---

## Authentication

All admin routes require a JWT Bearer token in the `Authorization` header. The token is obtained from the login endpoint.

### Login Flow

```
POST /api/auth/login
Body: { "email": "admin@example.com", "password": "yourpassword" }
Response: { "token": "eyJ...", "userId": "...", "email": "..." }
```

Store the token in `localStorage` and attach it to every API request:

```ts
// src/lib/api.ts
import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 || err.response?.status === 403) {
      localStorage.removeItem("admin_token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);
```

---

## Pages & Routes

| Path | Page | Description |
|---|---|---|
| `/login` | Login | Admin sign-in |
| `/` | Dashboard | Overview stats & charts |
| `/organizers` | Organizers | List with status filter |
| `/organizers/:id` | Organizer Detail | Profile + approve/reject |
| `/events` | Events | Top events list |
| `/events/:id` | Event Detail | Event info + approve/cancel |
| `/reviews` | Reviews | Suspicious reviews list |
| `/logs` | Moderation Logs | Audit trail with filters |

---

## API Endpoints

All endpoints require `Authorization: Bearer <token>` and are prefixed with `/api/admin`.

### Dashboard Stats

```
GET /api/admin/dashboard/stats
GET /api/admin/stats/organizers
GET /api/admin/stats/events
GET /api/admin/stats/bookings
```

**Dashboard Stats response shape:**
```ts
interface AdminStats {
  totalOrganizers: number;
  pendingOrganizers: number;
  approvedOrganizers: number;
  rejectedOrganizers: number;
  totalEvents: number;
  totalUsers: number;
  totalReviews: number;
  moderationLogsCount: number;
}
```

---

### Organizer Management

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/organizers/all` | List all organizer applications |
| GET | `/api/admin/organizers/all?status=PENDING` | Filter by `PENDING` / `APPROVED` / `REJECTED` |
| GET | `/api/admin/organizers/top?limit=10` | Top organizers by activity |
| GET | `/api/admin/organizers/:id/detail` | Full organizer profile |
| POST | `/api/admin/organizers/:id/approve` | Approve an organizer |
| POST | `/api/admin/organizers/:id/reject` | Reject an organizer |

**Reject body:**
```json
{ "reason": "Incomplete documentation", "code": "INCOMPLETE_DOCS" }
```

---

### Event Management

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/events/top?limit=10` | Top events by bookings |
| GET | `/api/admin/events/:id/detail` | Full event details |
| POST | `/api/admin/events/:id/approve` | Approve a pending event |
| POST | `/api/admin/events/:id/cancel` | Cancel an event |
| DELETE | `/api/admin/events/:id` | Permanently delete an event |

**Cancel / Delete body:**
```json
{ "reason": "Violation of terms" }
```

---

### Review Management

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/reviews/suspicious?limit=20` | Reviews flagged as suspicious |
| POST | `/api/admin/reviews/:id/flag` | Flag a review for moderation |

**Flag body:**
```json
{ "reason": "Spam content" }
```

---

### Moderation Logs

```
GET /api/admin/logs/moderation
GET /api/admin/logs/moderation?entityType=ORGANIZER&limit=50&offset=0
```

**Entity type values:** `ORGANIZER`, `EVENT`, `REVIEW`, `USER`

---

## Component Structure

```
src/
├── lib/
│   ├── api.ts              # Axios instance with auth interceptor
│   └── auth.ts             # Login, logout, token helpers
├── hooks/
│   ├── useAdminStats.ts    # TanStack Query hooks for each endpoint
│   ├── useOrganizers.ts
│   ├── useEvents.ts
│   └── useLogs.ts
├── pages/
│   ├── Login.tsx
│   ├── Dashboard.tsx
│   ├── Organizers.tsx
│   ├── OrganizerDetail.tsx
│   ├── Events.tsx
│   ├── EventDetail.tsx
│   ├── Reviews.tsx
│   └── Logs.tsx
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   └── Header.tsx
│   ├── shared/
│   │   ├── StatCard.tsx    # Single metric card (e.g. "Total Events: 120")
│   │   ├── StatusBadge.tsx # Colored badge for PENDING/APPROVED/REJECTED
│   │   ├── DataTable.tsx   # Reusable table with pagination
│   │   └── ConfirmModal.tsx
│   └── charts/
│       └── BookingChart.tsx
└── App.tsx                 # Route definitions + QueryClientProvider
```

---

## Key UI Patterns

### Stat Cards (Dashboard)

Display these on the main dashboard page using data from `GET /api/admin/dashboard/stats`:

- Total Users
- Total Events
- Total Organizers (with breakdown: Pending / Approved / Rejected)
- Total Reviews
- Moderation Actions

### Status Badge

Use consistent color coding across all tables:

| Status | Color |
|---|---|
| `PENDING` | Yellow |
| `APPROVED` / `CONFIRMED` | Green |
| `REJECTED` / `CANCELLED` | Red |

### Approve/Reject Flow

1. Fetch organizer/event detail
2. Show a confirm modal with action and optional reason field
3. Call approve/reject endpoint
4. Invalidate the TanStack Query cache for the list
5. Show success/error toast

---

## Approval Status Values

| Value | Description |
|---|---|
| `PENDING` | Awaiting admin review |
| `APPROVED` | Approved and active |
| `REJECTED` | Rejected by admin |

## Event Status Values

| Value | Description |
|---|---|
| `PENDING` | Awaiting approval |
| `CONFIRMED` | Active and visible |
| `CANCELLED` | Cancelled by admin or organizer |

---

## Protected Routes

Wrap all dashboard routes in an auth guard:

```tsx
// src/components/ProtectedRoute.tsx
import { Navigate } from "react-router-dom";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("admin_token");
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
```

---

## Backend Base URL

| Environment | URL |
|---|---|
| Local dev | `http://localhost:3000` |
| Production | `https://travel-nest-nu.vercel.app` (or your deployment) |

---

## Notes

- The backend JWT token expires after **7 days**. Handle 401 responses by clearing the token and redirecting to login.
- The token blacklist (logout) is in-memory on the backend — tokens are re-validated on server restart in dev.
- All admin routes return `403` if the authenticated user does not have the `ADMIN` role.
- The `reason` field is required when rejecting an organizer or flagging a review.
