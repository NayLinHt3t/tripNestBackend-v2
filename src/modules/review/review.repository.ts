import { Review, CreateReviewDto, UpdateReviewDto } from "./review.entity.js";

export interface ReviewRepository {
  findById(id: string): Promise<Review | null>;
  findByEventId(eventId: string): Promise<Review[]>;
  findByUserId(userId: string): Promise<Review[]>;
  findByUserAndEvent(userId: string, eventId: string): Promise<Review | null>;
  create(userId: string, data: CreateReviewDto): Promise<Review>;
  update(id: string, data: UpdateReviewDto): Promise<Review | null>;
  delete(id: string): Promise<boolean>;
  getAverageRating(eventId: string): Promise<number | null>;
}
