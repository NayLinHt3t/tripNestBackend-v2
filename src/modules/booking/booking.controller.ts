import { Router, Response, Request } from "express";
import { BookingService } from "./booking.service.js";
import { asyncHandler, getUserId } from "../../shared/http.js";
import { AuthenticatedRequest, hasRole } from "../auth/auth.middleware.js";
import { ForbiddenError } from "../../shared/errors.js";

export function createBookingRouter(bookingService: BookingService): Router {
  const router = Router();

  router.get(
    "/me",
    asyncHandler(async (req: Request, res: Response) => {
      const userId = getUserId(req);
      const bookings = await bookingService.getBookingsByUser(userId);
      res.status(200).json(bookings);
    }),
  );

  // Get booking by ID
  router.get(
    "/:id",
    asyncHandler(async (req: Request, res: Response) => {
      const userId = getUserId(req);
      const { id } = req.params as { id: string };
      const booking = await bookingService.getBooking(id);
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }
      if (booking.userId !== userId) {
        throw new ForbiddenError("You do not have access to this booking");
      }
      res.status(200).json(booking);
    }),
  );

  // Create booking
  router.post(
    "/",
    asyncHandler(async (req: Request, res: Response) => {
      const userId = getUserId(req);
      const { eventId, ticketCounts } = req.body;

      const result = await bookingService.createBooking(
        userId,
        eventId,
        ticketCounts,
      );
      res.status(201).json(result);
    }),
  );

  // Confirm booking — restricted to ORGANIZER or ADMIN
  router.patch(
    "/:id/confirm",
    asyncHandler(async (req: Request, res: Response) => {
      if (!hasRole(req as AuthenticatedRequest, ["ORGANIZER", "ADMIN"])) {
        throw new ForbiddenError("Only organizers or admins can confirm bookings");
      }
      const { id } = req.params as { id: string };
      const booking = await bookingService.confirmBooking(id);
      res.status(200).json(booking);
    }),
  );

  // Cancel booking
  router.patch(
    "/:id/cancel",
    asyncHandler(async (req: Request, res: Response) => {
      const userId = getUserId(req);
      const { id } = req.params as { id: string };
      const booking = await bookingService.getBooking(id);
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }
      if (booking.userId !== userId) {
        throw new ForbiddenError("You do not have access to this booking");
      }
      const updated = await bookingService.cancelBooking(id);
      res.status(200).json(updated);
    }),
  );

  // Update booking (ticket count)
  router.patch(
    "/:id",
    asyncHandler(async (req: Request, res: Response) => {
      const userId = getUserId(req);
      const { id } = req.params as { id: string };
      const { ticketCounts } = req.body;

      const booking = await bookingService.getBooking(id);
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }
      if (booking.userId !== userId) {
        throw new ForbiddenError("You do not have access to this booking");
      }

      const updated = await bookingService.updateBooking(id, ticketCounts);
      res.status(200).json(updated);
    }),
  );

  return router;
}
