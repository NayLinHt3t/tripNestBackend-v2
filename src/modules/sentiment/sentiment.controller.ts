import { Router, Request, Response } from "express";
import { SentimentService } from "./sentiment.service.js";
import { OrganizerService } from "../organizer/organizer.service.js";
import { asyncHandler, getUserId } from "../../shared/http.js";
import { ValidationError } from "../../shared/errors.js";

export function createSentimentRouter(
  sentimentService: SentimentService,
  organizerService: OrganizerService,
): Router {
  const router = Router();

  const resolveOrganizer = async (req: Request) => {
    const userId = getUserId(req);
    const organizerProfile = await organizerService.getProfileByUserId(userId);
    if (!organizerProfile || !organizerProfile.id) {
      throw new ValidationError("Organizer profile is required");
    }
    return organizerProfile.id;
  };

  router.post(
    "/review/:reviewId",
    asyncHandler(async (req: Request, res: Response) => {
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
    }),
  );

  router.get(
    "/organizer/events/:eventId/summary",
    asyncHandler(async (req: Request, res: Response) => {
      const { eventId } = req.params as { eventId: string };
      const organizerId = await resolveOrganizer(req);
      const summary = await sentimentService.getEventSentimentSummary(
        organizerId,
        eventId,
      );
      res.status(200).json(summary);
    }),
  );

  router.get(
    "/organizer/events/:eventId/reviews",
    asyncHandler(async (req: Request, res: Response) => {
      const { eventId } = req.params as { eventId: string };
      const organizerId = await resolveOrganizer(req);
      const sentiments = await sentimentService.getEventSentiments(
        organizerId,
        eventId,
      );
      res.status(200).json({ eventId, sentiments });
    }),
  );

  return router;
}
