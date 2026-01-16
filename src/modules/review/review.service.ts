import { Review, CreateReviewDto, UpdateReviewDto } from "./review.entity";
import { ReviewRepository } from "./review.repository";

export class ReviewService {
  constructor(private reviewRepository: ReviewRepository) {}

  async getReview(id: string): Promise<Review | null> {
    if (!id) {
      throw new Error("Review ID is required");
    }
    return this.reviewRepository.findById(id);
  }

  async getReviewsByEvent(eventId: string): Promise<Review[]> {
    if (!eventId) {
      throw new Error("Event ID is required");
    }
    return this.reviewRepository.findByEventId(eventId);
  }

  async getReviewsByUser(userId: string): Promise<Review[]> {
    if (!userId) {
      throw new Error("User ID is required");
    }
    return this.reviewRepository.findByUserId(userId);
  }

  async getEventAverageRating(eventId: string): Promise<number | null> {
    if (!eventId) {
      throw new Error("Event ID is required");
    }
    return this.reviewRepository.getAverageRating(eventId);
  }

  async createReview(userId: string, data: CreateReviewDto): Promise<Review> {
    if (!userId) {
      throw new Error("User ID is required");
    }

    if (!data.eventId) {
      throw new Error("Event ID is required");
    }

    if (data.rating < 1 || data.rating > 5) {
      throw new Error("Rating must be between 1 and 5");
    }

    // Check if user already reviewed this event
    const existingReview = await this.reviewRepository.findByUserAndEvent(
      userId,
      data.eventId
    );
    if (existingReview) {
      throw new Error("You have already reviewed this event");
    }

    return this.reviewRepository.create(userId, data);
  }

  async updateReview(
    id: string,
    userId: string,
    data: UpdateReviewDto
  ): Promise<Review | null> {
    if (!id) {
      throw new Error("Review ID is required");
    }

    const existing = await this.reviewRepository.findById(id);
    if (!existing) {
      throw new Error("Review not found");
    }

    // Check ownership
    if (existing.userId !== userId) {
      throw new Error("You can only update your own reviews");
    }

    if (data.rating !== undefined && (data.rating < 1 || data.rating > 5)) {
      throw new Error("Rating must be between 1 and 5");
    }

    return this.reviewRepository.update(id, data);
  }

  async deleteReview(id: string, userId: string): Promise<boolean> {
    if (!id) {
      throw new Error("Review ID is required");
    }

    const existing = await this.reviewRepository.findById(id);
    if (!existing) {
      throw new Error("Review not found");
    }

    // Check ownership
    if (existing.userId !== userId) {
      throw new Error("You can only delete your own reviews");
    }

    return this.reviewRepository.delete(id);
  }
}
