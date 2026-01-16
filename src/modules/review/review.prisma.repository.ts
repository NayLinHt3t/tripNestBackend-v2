import { PrismaClient } from "../database/prisma";
import { Review, CreateReviewDto, UpdateReviewDto } from "./review.entity";
import { ReviewRepository } from "./review.repository";

export class PrismaReviewRepository implements ReviewRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<Review | null> {
    return this.prisma.review.findUnique({
      where: { id },
    });
  }

  async findByEventId(eventId: string): Promise<Review[]> {
    return this.prisma.review.findMany({
      where: { eventId },
      orderBy: { createdAt: "desc" },
    });
  }

  async findByUserId(userId: string): Promise<Review[]> {
    return this.prisma.review.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async findByUserAndEvent(
    userId: string,
    eventId: string
  ): Promise<Review | null> {
    return this.prisma.review.findFirst({
      where: { userId, eventId },
    });
  }

  async create(userId: string, data: CreateReviewDto): Promise<Review> {
    return this.prisma.review.create({
      data: {
        userId,
        eventId: data.eventId,
        rating: data.rating,
        comment: data.comment || null,
        sentimentStatus: "PENDING",
      },
    });
  }

  async update(id: string, data: UpdateReviewDto): Promise<Review | null> {
    try {
      return await this.prisma.review.update({
        where: { id },
        data: {
          ...(data.rating !== undefined && { rating: data.rating }),
          ...(data.comment !== undefined && { comment: data.comment }),
        },
      });
    } catch {
      return null;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.review.delete({
        where: { id },
      });
      return true;
    } catch {
      return false;
    }
  }

  async getAverageRating(eventId: string): Promise<number | null> {
    const result = await this.prisma.review.aggregate({
      where: { eventId },
      _avg: { rating: true },
    });
    return result._avg.rating;
  }
}
