import "dotenv/config";
import express from "express";
import { createBookingRouter } from "./modules/booking/booking.controller.js";
import { BookingService } from "./modules/booking/booking.service.js";
import { PrismaBookingRepository } from "./modules/booking/booking.prisma.repository.js";
import { AuthService } from "./modules/auth/auth.service.js";
import { createAuthRouter } from "./modules/auth/auth.controller.js";
import { createAuthMiddleware } from "./modules/auth/auth.middleware.js";
import { PrismaUserRepository } from "./modules/auth/user.prisma.repository.js";
import { createPrismaClient } from "./modules/database/prisma.js";
import { createEventRouter } from "./modules/event/event.controller.js";
import { EventService } from "./modules/event/event.service.js";
import { PrismaEventRepository } from "./modules/event/event.prisma.repository.js";
import { createReviewRouter } from "./modules/review/review.controller.js";
import { ReviewService } from "./modules/review/review.service.js";
import { PrismaReviewRepository } from "./modules/review/review.prisma.repository.js";
import { createSentimentRouter } from "./modules/sentiment/sentiment.controller.js";
import { SentimentService } from "./modules/sentiment/sentiment.service.js";
import { PrismaSentimentJobRepository } from "./modules/sentiment/sentiment.prisma.repository.js";
import { createSentimentAnalyzer } from "./modules/sentiment/sentiment.analyzer.js";
import { SentimentWorker } from "./modules/sentiment/sentiment.worker.js";

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

// Initialize sentiment module
const sentimentJobRepository = new PrismaSentimentJobRepository(prisma);
const sentimentAnalyzer = createSentimentAnalyzer();
const sentimentService = new SentimentService(
  sentimentJobRepository,
  sentimentAnalyzer,
  prisma,
);
const sentimentWorker = new SentimentWorker(
  sentimentService,
  sentimentJobRepository,
);

// Wire up review service with sentiment service
reviewService.setSentimentService(sentimentService);

// Mount auth routes (public)
app.use("/api/auth", createAuthRouter(authService));

// Mount event routes (public - anyone can view events)
app.use("/api/events", createEventRouter(eventService));

// Mount review routes (mixed - some public, some protected)
app.use("/api/reviews", authMiddleware, createReviewRouter(reviewService));

// Mount sentiment routes (protected)
app.use(
  "/api/sentiment",
  authMiddleware,
  createSentimentRouter(sentimentService, sentimentWorker),
);

// Mount booking routes (protected)
app.use("/api/bookings", authMiddleware, createBookingRouter(bookingService));

// Start sentiment worker
sentimentWorker.start();

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
