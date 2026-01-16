import { PrismaClient } from "../database/prisma.js";
import { SentimentJob, JobStatus } from "./sentiment.entity.js";
import { SentimentJobRepository } from "./sentiment.repository.js";

export class PrismaSentimentJobRepository implements SentimentJobRepository {
  constructor(private prisma: PrismaClient) {}

  async create(reviewId: string): Promise<SentimentJob> {
    const job = await this.prisma.sentimentJob.create({
      data: { reviewId },
    });
    return this.mapToEntity(job);
  }

  async findById(id: string): Promise<SentimentJob | null> {
    const job = await this.prisma.sentimentJob.findUnique({
      where: { id },
    });
    return job ? this.mapToEntity(job) : null;
  }

  async findByReviewId(reviewId: string): Promise<SentimentJob | null> {
    const job = await this.prisma.sentimentJob.findUnique({
      where: { reviewId },
    });
    return job ? this.mapToEntity(job) : null;
  }

  async findPendingJobs(limit: number = 10): Promise<SentimentJob[]> {
    const jobs = await this.prisma.sentimentJob.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
    return jobs.map((job: Parameters<typeof this.mapToEntity>[0]) =>
      this.mapToEntity(job)
    );
  }

  async markProcessing(id: string): Promise<SentimentJob | null> {
    try {
      const job = await this.prisma.sentimentJob.update({
        where: { id },
        data: { status: "PROCESSING" },
      });
      return this.mapToEntity(job);
    } catch {
      return null;
    }
  }

  async markDone(id: string): Promise<SentimentJob | null> {
    try {
      const job = await this.prisma.sentimentJob.update({
        where: { id },
        data: { status: "DONE" },
      });
      return this.mapToEntity(job);
    } catch {
      return null;
    }
  }

  async markFailed(id: string, error: string): Promise<SentimentJob | null> {
    try {
      const job = await this.prisma.sentimentJob.update({
        where: { id },
        data: { status: "FAILED", error },
      });
      return this.mapToEntity(job);
    } catch {
      return null;
    }
  }

  async incrementAttempts(id: string): Promise<SentimentJob | null> {
    try {
      const job = await this.prisma.sentimentJob.update({
        where: { id },
        data: { attempts: { increment: 1 } },
      });
      return this.mapToEntity(job);
    } catch {
      return null;
    }
  }

  private mapToEntity(job: {
    id: string;
    reviewId: string;
    status: string;
    attempts: number;
    error: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): SentimentJob {
    return {
      id: job.id,
      reviewId: job.reviewId,
      status: job.status as JobStatus,
      attempts: job.attempts,
      error: job.error,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }
}
