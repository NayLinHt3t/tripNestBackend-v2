import { SentimentJobRepository } from "./sentiment.repository.js";
import { SentimentAnalyzer } from "./sentiment.analyzer.js";
import { SentimentAnalysisResult, SentimentJob } from "./sentiment.entity.js";
import { PrismaClient } from "../database/prisma.js";

export class SentimentService {
  constructor(
    private sentimentJobRepository: SentimentJobRepository,
    private sentimentAnalyzer: SentimentAnalyzer,
    private prisma: PrismaClient,
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
    reviewId: string,
  ): Promise<{ label: string | null; score: number | null } | null> {
    const sentiment = await this.prisma.sentimentResult.findUnique({
      where: { reviewId },
      select: {
        sentimentLabel: true,
        sentimentScore: true,
      },
    });

    if (sentiment) {
      return {
        label: sentiment.sentimentLabel,
        score: sentiment.sentimentScore,
      };
    }

    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      select: {
        sentimentLabel: true,
        sentimentScore: true,
      },
    });

    if (!review) return null;

    return {
      label: review.sentimentLabel,
      score: review.sentimentScore,
    };
  }

  async analyzeReview(reviewId: string): Promise<SentimentAnalysisResult> {
    if (!reviewId) {
      throw new Error("Review ID is required");
    }

    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      select: {
        id: true,
        comment: true,
      },
    });

    if (!review) {
      throw new Error("Review not found");
    }

    const result = await this.sentimentAnalyzer.analyze(review.comment || "");
    const sentimentClass = this.mapLabelToClass(result.label);

    const stored = await this.prisma.sentimentResult.upsert({
      where: { reviewId },
      update: {
        class: sentimentClass,
        sentimentLabel: result.label,
        sentimentScore: result.score,
        negative_summary: result.negativeSummary,
      },
      create: {
        reviewId,
        class: sentimentClass,
        sentimentLabel: result.label,
        sentimentScore: result.score,
        negative_summary: result.negativeSummary,
      },
      select: {
        reviewId: true,
        class: true,
        sentimentLabel: true,
        sentimentScore: true,
        negative_summary: true,
      },
    });

    await this.prisma.review.update({
      where: { id: reviewId },
      data: {
        sentimentStatus: "ANALYZED",
        sentimentLabel: result.label,
        sentimentScore: result.score,
      },
    });

    return {
      reviewId: stored.reviewId,
      class: stored.class,
      label: stored.sentimentLabel,
      score: stored.sentimentScore,
    };
  }

  async getEventSentimentSummary(
    organizerId: string,
    eventId: string,
  ): Promise<{
    eventId: string;
    totalReviews: number;
    analyzedCount: number;
    positiveCount: number;
    negativeCount: number;
    neutralCount: number;
    averageScore: number | null;
  }> {
    if (!organizerId) {
      throw new Error("Organizer ID is required");
    }
    if (!eventId) {
      throw new Error("Event ID is required");
    }

    await this.assertOrganizerOwnsEvent(organizerId, eventId);

    const [totalReviews, sentimentResults] = await Promise.all([
      this.prisma.review.count({ where: { eventId } }),
      this.prisma.sentimentResult.findMany({
        where: { review: { eventId } },
        select: {
          sentimentScore: true,
          class: true,
        },
      }),
    ]);

    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;
    let scoreSum = 0;

    for (const result of sentimentResults) {
      if (result.class === 1) positiveCount += 1;
      else if (result.class === -1) negativeCount += 1;
      else neutralCount += 1;
      scoreSum += result.sentimentScore;
    }

    const analyzedCount = sentimentResults.length;
    const averageScore = analyzedCount > 0 ? scoreSum / analyzedCount : null;

    return {
      eventId,
      totalReviews,
      analyzedCount,
      positiveCount,
      negativeCount,
      neutralCount,
      averageScore,
    };
  }

  async getEventSentiments(
    organizerId: string,
    eventId: string,
  ): Promise<
    {
      reviewId: string;
      label: string;
      score: number;
      class: number;
    }[]
  > {
    if (!organizerId) {
      throw new Error("Organizer ID is required");
    }
    if (!eventId) {
      throw new Error("Event ID is required");
    }

    await this.assertOrganizerOwnsEvent(organizerId, eventId);

    const sentiments = await this.prisma.sentimentResult.findMany({
      where: { review: { eventId } },
      select: {
        reviewId: true,
        sentimentLabel: true,
        sentimentScore: true,
        class: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return sentiments.map((item) => ({
      reviewId: item.reviewId,
      label: item.sentimentLabel,
      score: item.sentimentScore,
      class: item.class,
    }));
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
          "Review not found",
        );
        return;
      }

      // Analyze sentiment and store result
      const result = await this.sentimentAnalyzer.analyze(review.comment || "");
      const sentimentClass = this.mapLabelToClass(result.label);

      await this.prisma.sentimentResult.upsert({
        where: { reviewId: job.reviewId },
        update: {
          class: sentimentClass,
          sentimentLabel: result.label,
          sentimentScore: result.score,
          negative_summary: result.negativeSummary,
        },
        create: {
          reviewId: job.reviewId,
          class: sentimentClass,
          sentimentLabel: result.label,
          sentimentScore: result.score,
          negative_summary: result.negativeSummary,
        },
      });

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
        `✅ Processed sentiment for review ${job.reviewId}: ${result.label}`,
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

  private mapLabelToClass(label: string): number {
    const normalized = label.toUpperCase();
    if (normalized === "POSITIVE") return 1;
    if (normalized === "NEGATIVE") return -1;
    return 0;
  }

  private async assertOrganizerOwnsEvent(
    organizerId: string,
    eventId: string,
  ): Promise<void> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { organizerId: true },
    });

    if (!event) {
      throw new Error("Event not found");
    }

    if (!event.organizerId || event.organizerId !== organizerId) {
      throw new Error("Forbidden");
    }
  }
}
