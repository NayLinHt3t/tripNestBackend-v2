import { SentimentJob } from "./sentiment.entity";

export interface SentimentJobRepository {
  create(reviewId: string): Promise<SentimentJob>;
  findById(id: string): Promise<SentimentJob | null>;
  findByReviewId(reviewId: string): Promise<SentimentJob | null>;
  findPendingJobs(limit?: number): Promise<SentimentJob[]>;
  markProcessing(id: string): Promise<SentimentJob | null>;
  markDone(id: string): Promise<SentimentJob | null>;
  markFailed(id: string, error: string): Promise<SentimentJob | null>;
  incrementAttempts(id: string): Promise<SentimentJob | null>;
}
