import { Router, Request, Response } from "express";
import { SentimentService } from "./sentiment.service";
import { SentimentWorker } from "./sentiment.worker";

export function createSentimentRouter(
  sentimentService: SentimentService,
  sentimentWorker: SentimentWorker
): Router {
  const router = Router();

  // Get sentiment status for a review
  router.get("/review/:reviewId", async (req: Request, res: Response) => {
    try {
      const { reviewId } = req.params as { reviewId: string };

      const sentiment = await sentimentService.getSentimentForReview(reviewId);
      if (!sentiment) {
        return res.status(404).json({ error: "Review not found" });
      }

      const job = await sentimentService.getJobStatus(reviewId);

      res.status(200).json({
        reviewId,
        sentiment: {
          label: sentiment.label,
          score: sentiment.score,
        },
        job: job
          ? {
              status: job.status,
              attempts: job.attempts,
              error: job.error,
            }
          : null,
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Internal error",
      });
    }
  });

  // Get worker status
  router.get("/worker/status", (req: Request, res: Response) => {
    res.status(200).json({
      isRunning: sentimentWorker.isActive(),
    });
  });

  // Start worker (admin only in production)
  router.post("/worker/start", (req: Request, res: Response) => {
    sentimentWorker.start();
    res.status(200).json({ message: "Worker started" });
  });

  // Stop worker (admin only in production)
  router.post("/worker/stop", (req: Request, res: Response) => {
    sentimentWorker.stop();
    res.status(200).json({ message: "Worker stopped" });
  });

  return router;
}
