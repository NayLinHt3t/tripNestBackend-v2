import { Router, Response, Request } from "express";
import { BookingService } from "./booking.service.js";
import { AuthenticatedRequest } from "../auth/auth.middleware.js";
import { Booking } from "./booking.entity.js";

// Helper function to convert Booking entity to response DTO

export function createBookingRouter(bookingService: BookingService): Router {
  const router = Router();
  router.get("/me", async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const bookings = await bookingService.getBookingsByUser(userId);
      res.status(200).json(bookings);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Internal error",
      });
    }
  });

  // Get booking by ID
  router.get("/:id", async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const booking = await bookingService.getBooking(id);
      res.status(200).json(booking);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({
          error: error.message,
        });
      }
      res.status(400).json({
        error: error instanceof Error ? error.message : "Internal error",
      });
    }
  });

  // Create booking
  router.post("/", async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { eventId, ticketCounts } = req.body;
      const userId = req.user?.userId;

      const result = await bookingService.createBooking(
        userId || "",
        eventId,
        ticketCounts,
      );
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Internal error",
      });
    }
  });

  // Confirm booking
  router.patch(
    "/:id/confirm",
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { id } = req.params as { id: string };
        const booking = await bookingService.confirmBooking(id);
        res.status(200).json(booking);
      } catch (error) {
        if (error instanceof Error && error.message.includes("not found")) {
          return res.status(404).json({
            error: error.message,
          });
        }
        res.status(400).json({
          error: error instanceof Error ? error.message : "Internal error",
        });
      }
    },
  );

  // Cancel booking
  router.patch(
    "/:id/cancel",
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { id } = req.params as { id: string };
        const booking = await bookingService.cancelBooking(id);
        res.status(200).json(booking);
      } catch (error) {
        if (error instanceof Error && error.message.includes("not found")) {
          return res.status(404).json({
            error: error.message,
          });
        }
        res.status(400).json({
          error: error instanceof Error ? error.message : "Internal error",
        });
      }
    },
  );

  // Update booking (ticket count)
  router.patch("/:id", async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const { ticketCounts } = req.body;

      const booking = await bookingService.updateBooking(id, ticketCounts);
      res.status(200).json(booking);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({
          error: error.message,
        });
      }
      res.status(400).json({
        error: error instanceof Error ? error.message : "Internal error",
      });
    }
  });

  return router;
}
