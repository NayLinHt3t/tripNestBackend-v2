import { SentimentJobRepository } from "./sentiment.repository";
import { SentimentAnalyzer } from "./sentiment.analyzer";
import { SentimentJob, SentimentResult } from "./sentiment.entity";
import { PrismaClient } from "../database/prisma";

export class SentimentService {
  constructor(
    private sentimentJobRepository: SentimentJobRepository,
    private sentimentAnalyzer: SentimentAnalyzer,
    private prisma: PrismaClient
  ) {}

  // Called when a review is created
  async createSentimentJob(reviewId: string): Promise<SentimentJob> {
    return this.sentimentJobRepository.create(reviewId);
  }

  // Get job status
  async getJobStatus(reviewId: string): Promise<SentimentJob | null> {
    return this.sentimentJobRepository.findByReviewId(reviewId);
  }

  // Get sentiment result for a review
  async getSentimentForReview(
    reviewId: string
  ): Promise<{ label: string | null; score: number | null } | null> {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      select: {
        sentimentLabel: true,
        sentimentScore: true,
        sentimentStatus: true,
      },
    });

    if (!review) return null;

    return {
      label: review.sentimentLabel,
      score: review.sentimentScore,
    };
  }

  // Process a single job (called by worker)
  async processJob(job: SentimentJob): Promise<void> {
    const MAX_ATTEMPTS = 3;

    try {
      // Mark as processing
      await this.sentimentJobRepository.markProcessing(job.id);
      await this.sentimentJobRepository.incrementAttempts(job.id);

      // Get the review
      const review = await this.prisma.review.findUnique({
        where: { id: job.reviewId },
      });

      if (!review) {
        await this.sentimentJobRepository.markFailed(
          job.id,
          "Review not found"
        );
        return;
      }

      // Analyze sentiment
      const result = await this.sentimentAnalyzer.analyze(review.comment || "");

      // Update review with sentiment
      await this.prisma.review.update({
        where: { id: job.reviewId },
        data: {
          sentimentLabel: result.label,
          sentimentScore: result.score,
          sentimentStatus: "ANALYZED",
        },
      });

      // Mark job as done
      await this.sentimentJobRepository.markDone(job.id);

      console.log(
        `✅ Processed sentiment for review ${job.reviewId}: ${result.label}`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`❌ Failed to process job ${job.id}:`, errorMessage);

      // Check attempts
      const updatedJob = await this.sentimentJobRepository.findById(job.id);
      if (updatedJob && updatedJob.attempts >= MAX_ATTEMPTS) {
        await this.sentimentJobRepository.markFailed(job.id, errorMessage);
        await this.prisma.review.update({
          where: { id: job.reviewId },
          data: { sentimentStatus: "FAILED" },
        });
      } else {
        // Reset to pending for retry
        await this.prisma.sentimentJob.update({
          where: { id: job.id },
          data: { status: "PENDING" },
        });
      }
    }
  }
}
