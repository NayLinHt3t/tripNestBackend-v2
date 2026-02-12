import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
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
import { createProfileRouter } from "./modules/profile/profile.controller.js";
import { ProfileService } from "./modules/profile/profile.service.js";
import { PrismaProfileRepository } from "./modules/profile/profile.prisma.repository.js";
import { createOrganizerRouter } from "./modules/organizer/organizer.controller.js";
import { OrganizerService } from "./modules/organizer/organizer.service.js";
import { PrismaOrganizerRepository } from "./modules/organizer/organizer.prisma.repository.js";
import { createChatRouter } from "./modules/chatting/chatting.controller.js";
import { ChatService } from "./modules/chatting/chatting.service.js";
import { PrismaChatRepository } from "./modules/chatting/chatting.prisma.repository.js";
import { createDashboardRouter } from "./modules/dashboard/dashboard.controller.js";
import { DashboardService } from "./modules/dashboard/dashboard.service.js";
import { PrismaDashboardRepository } from "./modules/dashboard/dashboard.prisma.repository.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Initialize Prisma, services, and repositories
const prisma = createPrismaClient();
const chatRepository = new PrismaChatRepository(prisma);
const chatService = new ChatService(chatRepository);
const bookingRepository = new PrismaBookingRepository(prisma);
const bookingService = new BookingService(bookingRepository, chatService);
const userRepository = new PrismaUserRepository(prisma);
const authService = new AuthService(userRepository);
const authMiddleware = createAuthMiddleware(authService);
const eventRepository = new PrismaEventRepository(prisma);
const eventService = new EventService(eventRepository);
const reviewRepository = new PrismaReviewRepository(prisma);
const reviewService = new ReviewService(reviewRepository);
const profileRepository = new PrismaProfileRepository(prisma);
const profileService = new ProfileService(profileRepository, prisma);
const organizerRepository = new PrismaOrganizerRepository(prisma);
const organizerService = new OrganizerService(organizerRepository, prisma);
const dashboardRepository = new PrismaDashboardRepository(prisma);
const dashboardService = new DashboardService(dashboardRepository);

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

// Serve API documentation at root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "docs", "api.html"));
});

// Mount auth routes (public, but change-password requires auth)
app.use("/api/auth", createAuthRouter(authService, authMiddleware));

// Mount event routes (public read, protected write)
app.use(
  "/api/events",
  createEventRouter(
    eventService,
    authMiddleware,
    organizerService,
    chatService,
  ),
);

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

// Mount profile routes (protected)
app.use("/api/profile", authMiddleware, createProfileRouter(profileService));
app.use(
  "/api/organizers",
  authMiddleware,
  createOrganizerRouter(organizerService),
);

// Mount chat routes (protected)
app.use("/api/chat", authMiddleware, createChatRouter(chatService));

// Mount dashboard routes (protected)
app.use(
  "/api/dashboard",
  authMiddleware,
  createDashboardRouter(dashboardService, organizerService),
);

// Start sentiment worker
sentimentWorker.start();

export default app;
