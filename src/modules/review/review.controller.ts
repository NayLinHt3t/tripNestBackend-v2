import { Router, Response } from "express";
import { ReviewService } from "./review.service.js";
import { AuthenticatedRequest } from "../auth/auth.middleware.js";

export function createReviewRouter(reviewService: ReviewService): Router {
  const router = Router();

  // Get reviews by event (public)
  router.get(
    "/event/:eventId",
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { eventId } = req.params as { eventId: string };
        const reviews = await reviewService.getReviewsByEvent(eventId);
        res.status(200).json(reviews);
      } catch (error) {
        res.status(400).json({
          error: error instanceof Error ? error.message : "Internal error",
        });
      }
    }
  );

  // Get average rating for event (public)
  router.get(
    "/event/:eventId/rating",
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { eventId } = req.params as { eventId: string };
        const averageRating = await reviewService.getEventAverageRating(
          eventId
        );
        res.status(200).json({ eventId, averageRating });
      } catch (error) {
        res.status(400).json({
          error: error instanceof Error ? error.message : "Internal error",
        });
      }
    }
  );

  // Get my reviews (authenticated)
  router.get("/my", async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const reviews = await reviewService.getReviewsByUser(userId);
      res.status(200).json(reviews);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Internal error",
      });
    }
  });

  // Get review by ID
  router.get("/:id", async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const review = await reviewService.getReview(id);

      if (!review) {
        return res.status(404).json({ error: "Review not found" });
      }

      res.status(200).json(review);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Internal error",
      });
    }
  });

  // Create review (authenticated)
  router.post("/", async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { eventId, rating, comment } = req.body;

      const review = await reviewService.createReview(userId, {
        eventId,
        rating,
        comment,
      });

      res.status(201).json(review);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("already reviewed")
      ) {
        return res.status(409).json({ error: error.message });
      }
      res.status(400).json({
        error: error instanceof Error ? error.message : "Internal error",
      });
    }
  });

  // Update review (authenticated, owner only)
  router.patch("/:id", async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { id } = req.params as { id: string };
      const { rating, comment } = req.body;

      const review = await reviewService.updateReview(id, userId, {
        rating,
        comment,
      });

      res.status(200).json(review);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ error: error.message });
      }
      if (error instanceof Error && error.message.includes("only")) {
        return res.status(403).json({ error: error.message });
      }
      res.status(400).json({
        error: error instanceof Error ? error.message : "Internal error",
      });
    }
  });

  // Delete review (authenticated, owner only)
  router.delete("/:id", async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { id } = req.params as { id: string };
      await reviewService.deleteReview(id, userId);

      res.status(200).json({ message: "Review deleted successfully" });
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ error: error.message });
      }
      if (error instanceof Error && error.message.includes("only")) {
        return res.status(403).json({ error: error.message });
      }
      res.status(400).json({
        error: error instanceof Error ? error.message : "Internal error",
      });
    }
  });

  return router;
}
