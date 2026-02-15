import { Router, Request, Response } from "express";
import { SentimentService } from "./sentiment.service.js";
import { OrganizerService } from "../organizer/organizer.service.js";
import { AuthenticatedRequest } from "../auth/auth.middleware.js";
export function createSentimentRouter(
  sentimentService: SentimentService,
  organizerService: OrganizerService,
): Router {
  const router = Router();

  const resolveOrganizer = async (req: AuthenticatedRequest) => {
    const userId = req.user?.userId;
    if (!userId) {
      throw new Error("Unauthorized");
    }
    const organizerProfile = await organizerService.getProfileByUserId(userId);
    if (!organizerProfile.id) {
      throw new Error("Organizer profile is required");
    }
    return organizerProfile.id;
  };

  router.post("/review/:reviewId", async (req: Request, res: Response) => {
    try {
      const { reviewId } = req.params as { reviewId: string };
      const result = await sentimentService.analyzeReview(reviewId);
      res.status(200).json({
        reviewId: result.reviewId,
        sentiment: {
          label: result.label,
          score: result.score,
          class: result.class,
        },
      });
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Internal error",
      });
    }
  });

  router.get(
    "/organizer/events/:eventId/summary",
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { eventId } = req.params as { eventId: string };
        const organizerId = await resolveOrganizer(req);
        const summary = await sentimentService.getEventSentimentSummary(
          organizerId,
          eventId,
        );
        res.status(200).json(summary);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Internal error";
        const status = message === "Unauthorized" ? 401 : 400;
        res.status(status).json({ error: message });
      }
    },
  );

  router.get(
    "/organizer/events/:eventId/reviews",
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { eventId } = req.params as { eventId: string };
        const organizerId = await resolveOrganizer(req);
        const sentiments = await sentimentService.getEventSentiments(
          organizerId,
          eventId,
        );
        res.status(200).json({ eventId, sentiments });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Internal error";
        const status = message === "Unauthorized" ? 401 : 400;
        res.status(status).json({ error: message });
      }
    },
  );

  return router;
}
