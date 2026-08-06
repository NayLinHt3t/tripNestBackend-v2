import { Review, CreateReviewDto, UpdateReviewDto } from "./review.entity.js";
import { ReviewRepository } from "./review.repository.js";
import { SentimentService } from "../sentiment/sentiment.service.js";
import {
  ValidationError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from "../../shared/errors.js";

export class ReviewService {
  private sentimentService?: SentimentService;

  constructor(private reviewRepository: ReviewRepository) {}

  setSentimentService(sentimentService: SentimentService): void {
    this.sentimentService = sentimentService;
  }

  async getReview(id: string): Promise<Review | null> {
    if (!id) {
      throw new ValidationError("Review ID is required");
    }
    return this.reviewRepository.findById(id);
  }

  async getReviewsByEvent(eventId: string): Promise<Review[]> {
    if (!eventId) {
      throw new ValidationError("Event ID is required");
    }
    return this.reviewRepository.findByEventId(eventId);
  }

  async getReviewsByUser(userId: string): Promise<Review[]> {
    if (!userId) {
      throw new ValidationError("User ID is required");
    }
    return this.reviewRepository.findByUserId(userId);
  }

  async getEventAverageRating(eventId: string): Promise<number | null> {
    if (!eventId) {
      throw new ValidationError("Event ID is required");
    }
    return this.reviewRepository.getAverageRating(eventId);
  }

  async createReview(userId: string, data: CreateReviewDto): Promise<Review> {
    if (!userId) {
      throw new ValidationError("User ID is required");
    }

    if (!data.eventId) {
      throw new ValidationError("Event ID is required");
    }

    if (data.rating < 1 || data.rating > 5) {
      throw new ValidationError("Rating must be between 1 and 5");
    }

    // Check if user already reviewed this event
    const existingReview = await this.reviewRepository.findByUserAndEvent(
      userId,
      data.eventId
    );
    if (existingReview) {
      throw new ConflictError("You have already reviewed this event");
    }

    const review = await this.reviewRepository.create(userId, data);

    // Create sentiment job if comment exists and sentiment service is available
    if (review.comment && this.sentimentService) {
      try {
        await this.sentimentService.createSentimentJob(review.id);
      } catch (error) {
        console.error("Failed to create sentiment job:", error);
        // Don't fail the review creation if sentiment job fails
      }
    }

    return review;
  }

  async updateReview(
    id: string,
    userId: string,
    data: UpdateReviewDto
  ): Promise<Review | null> {
    if (!id) {
      throw new ValidationError("Review ID is required");
    }

    const existing = await this.reviewRepository.findById(id);
    if (!existing) {
      throw new NotFoundError("Review not found");
    }

    // Check ownership
    if (existing.userId !== userId) {
      throw new ForbiddenError("You can only update your own reviews");
    }

    if (data.rating !== undefined && (data.rating < 1 || data.rating > 5)) {
      throw new ValidationError("Rating must be between 1 and 5");
    }

    return this.reviewRepository.update(id, data);
  }

  async deleteReview(id: string, userId: string): Promise<boolean> {
    if (!id) {
      throw new ValidationError("Review ID is required");
    }

    const existing = await this.reviewRepository.findById(id);
    if (!existing) {
      throw new NotFoundError("Review not found");
    }

    // Check ownership
    if (existing.userId !== userId) {
      throw new ForbiddenError("You can only delete your own reviews");
    }

    return this.reviewRepository.delete(id);
  }
}
