import { Router, Request, Response } from "express";
import { ReviewService } from "./review.service.js";
import { asyncHandler, getUserId } from "../../shared/http.js";

export function createReviewRouter(reviewService: ReviewService): Router {
  const router = Router();

  // Get reviews by event (public)
  router.get(
    "/event/:eventId",
    asyncHandler(async (req: Request, res: Response) => {
      const { eventId } = req.params as { eventId: string };
      const reviews = await reviewService.getReviewsByEvent(eventId);
      res.status(200).json(reviews);
    }),
  );

  // Get average rating for event (public)
  router.get(
    "/event/:eventId/rating",
    asyncHandler(async (req: Request, res: Response) => {
      const { eventId } = req.params as { eventId: string };
      const averageRating = await reviewService.getEventAverageRating(eventId);
      res.status(200).json({ eventId, averageRating });
    }),
  );

  // Get my reviews (authenticated)
  router.get(
    "/my",
    asyncHandler(async (req: Request, res: Response) => {
      const userId = getUserId(req);
      const reviews = await reviewService.getReviewsByUser(userId);
      res.status(200).json(reviews);
    }),
  );

  // Get review by ID
  router.get(
    "/:id",
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params as { id: string };
      const review = await reviewService.getReview(id);

      if (!review) {
        return res.status(404).json({ error: "Review not found" });
      }

      res.status(200).json(review);
    }),
  );

  // Create review (authenticated)
  router.post(
    "/",
    asyncHandler(async (req: Request, res: Response) => {
      const userId = getUserId(req);
      const { eventId, rating, comment } = req.body;

      const review = await reviewService.createReview(userId, {
        eventId,
        rating,
        comment,
      });

      res.status(201).json(review);
    }),
  );

  // Update review (authenticated, owner only)
  router.patch(
    "/:id",
    asyncHandler(async (req: Request, res: Response) => {
      const userId = getUserId(req);
      const { id } = req.params as { id: string };
      const { rating, comment } = req.body;

      const review = await reviewService.updateReview(id, userId, {
        rating,
        comment,
      });

      res.status(200).json(review);
    }),
  );

  // Delete review (authenticated, owner only)
  router.delete(
    "/:id",
    asyncHandler(async (req: Request, res: Response) => {
      const userId = getUserId(req);
      const { id } = req.params as { id: string };
      await reviewService.deleteReview(id, userId);

      res.status(200).json({ message: "Review deleted successfully" });
    }),
  );

  return router;
}
