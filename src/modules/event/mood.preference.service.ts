import { PrismaClient } from "../database/prisma.js";

export class MoodPreferenceService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Increment (or decrement) a user's preference score for the mood of a
   * given event. Looks up the event's mood internally — callers only need
   * to supply userId, eventId, and the delta.
   */
  async incrementFromEvent(
    userId: string,
    eventId: string,
    delta: number,
  ): Promise<void> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { mood: true },
    });
    if (!event?.mood) return;
    await this.increment(userId, event.mood, delta);
  }

  async increment(userId: string, mood: string, delta: number): Promise<void> {
    await this.prisma.userMoodPreference.upsert({
      where: { userId_mood: { userId, mood } },
      update: { score: { increment: delta } },
      create: { userId, mood, score: delta },
    });
  }

  /** Returns the user's top moods ordered by score descending. */
  async getTopMoods(userId: string, limit: number = 3): Promise<string[]> {
    const prefs = await this.prisma.userMoodPreference.findMany({
      where: { userId, score: { gt: 0 } },
      orderBy: { score: "desc" },
      take: limit,
    });
    return prefs.map((p) => p.mood);
  }
}
