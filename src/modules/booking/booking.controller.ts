import { Router, Response, Request } from "express";
import { BookingService } from "./booking.service.js";
import { asyncHandler, getUserId } from "../../shared/http.js";

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
      const { id } = req.params as { id: string };
      const booking = await bookingService.getBooking(id);
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

  // Confirm booking
  router.patch(
    "/:id/confirm",
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params as { id: string };
      const booking = await bookingService.confirmBooking(id);
      res.status(200).json(booking);
    }),
  );

  // Cancel booking
  router.patch(
    "/:id/cancel",
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params as { id: string };
      const booking = await bookingService.cancelBooking(id);
      res.status(200).json(booking);
    }),
  );

  // Update booking (ticket count)
  router.patch(
    "/:id",
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params as { id: string };
      const { ticketCounts } = req.body;

      const booking = await bookingService.updateBooking(id, ticketCounts);
      res.status(200).json(booking);
    }),
  );

  return router;
}
