import { describe, it, expect, vi, beforeEach } from "vitest";
import { ReviewService } from "./review.service.js";
import type { ReviewRepository } from "./review.repository.js";
import type { Review, CreateReviewDto } from "./review.entity.js";
import type { SentimentService } from "../sentiment/sentiment.service.js";

// ── helpers ───────────────────────────────────────────────────────────────────

const makeReview = (overrides?: Partial<Review>): Review => ({
  id: "review-1",
  userId: "user-1",
  eventId: "event-1",
  rating: 4,
  comment: "Great event!",
  sentimentStatus: "pending",
  sentimentLabel: null,
  sentimentScore: null,
  createdAt: new Date(),
  ...overrides,
});

const makeCreateDto = (
  overrides?: Partial<CreateReviewDto>,
): CreateReviewDto => ({
  eventId: "event-1",
  rating: 4,
  comment: "Great event!",
  ...overrides,
});

const makeRepo = (overrides?: Partial<ReviewRepository>): ReviewRepository => ({
  findById: vi.fn().mockResolvedValue(null),
  findByEventId: vi.fn().mockResolvedValue([]),
  findByUserId: vi.fn().mockResolvedValue([]),
  findByUserAndEvent: vi.fn().mockResolvedValue(null),
  create: vi.fn().mockResolvedValue(makeReview()),
  update: vi.fn().mockResolvedValue(makeReview()),
  delete: vi.fn().mockResolvedValue(true),
  getAverageRating: vi.fn().mockResolvedValue(4.2),
  ...overrides,
});

const makeSentimentService = (): Pick<
  SentimentService,
  "createSentimentJob"
> => ({
  createSentimentJob: vi.fn().mockResolvedValue(undefined),
});

// ── tests ─────────────────────────────────────────────────────────────────────

describe("ReviewService", () => {
  let repo: ReviewRepository;
  let service: ReviewService;

  beforeEach(() => {
    repo = makeRepo();
    service = new ReviewService(repo);
  });

  // ── getReview ─────────────────────────────────────────────────────────────────

  describe("getReview", () => {
    it("returns review when found", async () => {
      vi.mocked(repo.findById).mockResolvedValue(makeReview());

      const result = await service.getReview("review-1");

      expect(result?.id).toBe("review-1");
    });

    it("throws when id is empty", async () => {
      await expect(service.getReview("")).rejects.toThrow(
        "Review ID is required",
      );
    });
  });

  // ── getReviewsByEvent ─────────────────────────────────────────────────────────

  describe("getReviewsByEvent", () => {
    it("returns reviews for an event", async () => {
      vi.mocked(repo.findByEventId).mockResolvedValue([makeReview()]);

      const result = await service.getReviewsByEvent("event-1");

      expect(result).toHaveLength(1);
    });

    it("throws when eventId is empty", async () => {
      await expect(service.getReviewsByEvent("")).rejects.toThrow(
        "Event ID is required",
      );
    });
  });

  // ── getEventAverageRating ─────────────────────────────────────────────────────

  describe("getEventAverageRating", () => {
    it("returns the average rating", async () => {
      const result = await service.getEventAverageRating("event-1");

      expect(result).toBe(4.2);
    });

    it("throws when eventId is empty", async () => {
      await expect(service.getEventAverageRating("")).rejects.toThrow(
        "Event ID is required",
      );
    });
  });

  // ── createReview ──────────────────────────────────────────────────────────────

  describe("createReview", () => {
    it("creates a review successfully", async () => {
      const result = await service.createReview("user-1", makeCreateDto());

      expect(repo.create).toHaveBeenCalledWith("user-1", makeCreateDto());
      expect(result.id).toBe("review-1");
    });

    it("throws when userId is empty", async () => {
      await expect(service.createReview("", makeCreateDto())).rejects.toThrow(
        "User ID is required",
      );
    });

    it("throws when eventId is missing", async () => {
      await expect(
        service.createReview("user-1", makeCreateDto({ eventId: "" })),
      ).rejects.toThrow("Event ID is required");
    });

    it("throws when rating is below 1", async () => {
      await expect(
        service.createReview("user-1", makeCreateDto({ rating: 0 })),
      ).rejects.toThrow("Rating must be between 1 and 5");
    });

    it("throws when rating is above 5", async () => {
      await expect(
        service.createReview("user-1", makeCreateDto({ rating: 6 })),
      ).rejects.toThrow("Rating must be between 1 and 5");
    });

    it("throws when user already reviewed this event", async () => {
      vi.mocked(repo.findByUserAndEvent).mockResolvedValue(makeReview());

      await expect(
        service.createReview("user-1", makeCreateDto()),
      ).rejects.toThrow("You have already reviewed this event");
    });

    it("creates a sentiment job when comment is present and service is set", async () => {
      const sentiment = makeSentimentService() as SentimentService;
      service.setSentimentService(sentiment);

      await service.createReview(
        "user-1",
        makeCreateDto({ comment: "Amazing!" }),
      );

      expect(sentiment.createSentimentJob).toHaveBeenCalledWith("review-1");
    });

    it("does not create a sentiment job when comment is absent", async () => {
      const sentiment = makeSentimentService() as SentimentService;
      service.setSentimentService(sentiment);
      vi.mocked(repo.create).mockResolvedValue(
        makeReview({ comment: undefined }),
      );

      await service.createReview(
        "user-1",
        makeCreateDto({ comment: undefined }),
      );

      expect(sentiment.createSentimentJob).not.toHaveBeenCalled();
    });

    it("does not fail review creation when sentiment job throws", async () => {
      const sentiment = makeSentimentService() as SentimentService;
      vi.mocked(sentiment.createSentimentJob).mockRejectedValue(
        new Error("AI down"),
      );
      service.setSentimentService(sentiment);

      // Should resolve without throwing
      await expect(
        service.createReview("user-1", makeCreateDto()),
      ).resolves.toBeDefined();
    });
  });

  // ── updateReview ──────────────────────────────────────────────────────────────

  describe("updateReview", () => {
    it("updates a review owned by the user", async () => {
      vi.mocked(repo.findById).mockResolvedValue(
        makeReview({ userId: "user-1" }),
      );

      const result = await service.updateReview("review-1", "user-1", {
        rating: 5,
      });

      expect(repo.update).toHaveBeenCalledWith("review-1", { rating: 5 });
      expect(result).toBeDefined();
    });

    it("throws when review is not found", async () => {
      vi.mocked(repo.findById).mockResolvedValue(null);

      await expect(
        service.updateReview("ghost", "user-1", { rating: 3 }),
      ).rejects.toThrow("Review not found");
    });

    it("throws when user does not own the review", async () => {
      vi.mocked(repo.findById).mockResolvedValue(
        makeReview({ userId: "other-user" }),
      );

      await expect(
        service.updateReview("review-1", "user-1", { rating: 3 }),
      ).rejects.toThrow("You can only update your own reviews");
    });

    it("throws when updated rating is out of range", async () => {
      vi.mocked(repo.findById).mockResolvedValue(
        makeReview({ userId: "user-1" }),
      );

      await expect(
        service.updateReview("review-1", "user-1", { rating: 0 }),
      ).rejects.toThrow("Rating must be between 1 and 5");
    });
  });

  // ── deleteReview ──────────────────────────────────────────────────────────────

  describe("deleteReview", () => {
    it("deletes a review owned by the user", async () => {
      vi.mocked(repo.findById).mockResolvedValue(
        makeReview({ userId: "user-1" }),
      );

      const result = await service.deleteReview("review-1", "user-1");

      expect(result).toBe(true);
      expect(repo.delete).toHaveBeenCalledWith("review-1");
    });

    it("throws when review is not found", async () => {
      vi.mocked(repo.findById).mockResolvedValue(null);

      await expect(service.deleteReview("ghost", "user-1")).rejects.toThrow(
        "Review not found",
      );
    });

    it("throws when user does not own the review", async () => {
      vi.mocked(repo.findById).mockResolvedValue(
        makeReview({ userId: "other-user" }),
      );

      await expect(service.deleteReview("review-1", "user-1")).rejects.toThrow(
        "You can only delete your own reviews",
      );
    });

    it("throws when id is empty", async () => {
      await expect(service.deleteReview("", "user-1")).rejects.toThrow(
        "Review ID is required",
      );
    });
  });
});
