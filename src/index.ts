import "dotenv/config";
import express from "express";
import { createBookingRouter } from "./modules/booking/booking.controller";
import { BookingService } from "./modules/booking/booking.service";
import { PrismaBookingRepository } from "./modules/booking/booking.prisma.repository";
import { AuthService } from "./modules/auth/auth.service";
import { createAuthRouter } from "./modules/auth/auth.controller";
import { createAuthMiddleware } from "./modules/auth/auth.middleware";
import { PrismaUserRepository } from "./modules/auth/user.prisma.repository";
import { createPrismaClient } from "./modules/database/prisma";
import { createEventRouter } from "./modules/event/event.controller";
import { EventService } from "./modules/event/event.service";
import { PrismaEventRepository } from "./modules/event/event.prisma.repository";
import { createReviewRouter } from "./modules/review/review.controller";
import { ReviewService } from "./modules/review/review.service";
import { PrismaReviewRepository } from "./modules/review/review.prisma.repository";

const app = express();
const port = process.env.PORT || 3000;
app.use(express.json());

// Initialize Prisma, services, and repositories
const prisma = createPrismaClient();
const bookingRepository = new PrismaBookingRepository(prisma);
const bookingService = new BookingService(bookingRepository);
const userRepository = new PrismaUserRepository(prisma);
const authService = new AuthService(userRepository);
const authMiddleware = createAuthMiddleware(authService);
const eventRepository = new PrismaEventRepository(prisma);
const eventService = new EventService(eventRepository);
const reviewRepository = new PrismaReviewRepository(prisma);
const reviewService = new ReviewService(reviewRepository);

// Mount auth routes (public)
app.use("/api/auth", createAuthRouter(authService));

// Mount event routes (public - anyone can view events)
app.use("/api/events", createEventRouter(eventService));

// Mount review routes (mixed - some public, some protected)
app.use("/api/reviews", authMiddleware, createReviewRouter(reviewService));

// Mount booking routes (protected)
app.use("/api/bookings", authMiddleware, createBookingRouter(bookingService));

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
