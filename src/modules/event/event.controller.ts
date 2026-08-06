import { Router, Request, Response, RequestHandler } from "express";
import multer from "multer";
import { EventService } from "./event.service.js";
import { uploadImageBuffer } from "../utils/cloudinary.js";
import { AuthenticatedRequest, hasRole } from "../auth/auth.middleware.js";
import { OrganizerService } from "../organizer/organizer.service.js";
import { ChatService } from "../chatting/chatting.service.js";
import { asyncHandler, getUserId } from "../../shared/http.js";

export function createEventRouter(
  eventService: EventService,
  authMiddleware?: RequestHandler,
  organizerService?: OrganizerService,
  chatService?: ChatService,
): Router {
  const router = Router();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
  });

  // Get all events
  router.get(
    "/",
    asyncHandler(async (req: Request, res: Response) => {
      const events = await eventService.getAllEvents();
      const visibleEvents = events.filter(
        (event) => event.status === "CONFIRMED",
      );
      res.status(200).json(visibleEvents);
    }),
  );

  // Get upcoming events
  router.get(
    "/upcoming",
    asyncHandler(async (req: Request, res: Response) => {
      const events = await eventService.getUpcomingEvents();
      const visibleEvents = events.filter(
        (event) => event.status === "CONFIRMED",
      );
      res.status(200).json(visibleEvents);
    }),
  );

  // Get events arranged by available tickets and list fully booked events
  router.get(
    "/tickets/availability",
    asyncHandler(async (req: Request, res: Response) => {
      const result = await eventService.getEventsWithAvailableTickets();
      res.status(200).json({
        eventsSortedByAvailability: result.eventsSortedByAvailability.filter(
          (event) => event.status === "CONFIRMED",
        ),
        fullyBookedEvents: result.fullyBookedEvents.filter(
          (event) => event.status === "CONFIRMED",
        ),
      });
    }),
  );

  // Search events by location, keyword, or mood
  router.get(
    "/search",
    asyncHandler(async (req: Request, res: Response) => {
      const { location, keyword, mood } = req.query;

      const locationValue =
        typeof location === "string" && location.trim()
          ? location.trim()
          : undefined;
      const keywordValue =
        typeof keyword === "string" && keyword.trim()
          ? keyword.trim()
          : undefined;
      const moodValue =
        typeof mood === "string" && mood.trim() ? mood.trim() : undefined;

      if (!locationValue && !keywordValue && !moodValue) {
        return res.status(400).json({
          error: "Location, keyword, or mood query parameter is required",
        });
      }

      const events = await eventService.searchEvents({
        location: locationValue,
        keyword: keywordValue,
        mood: moodValue,
      });
      const visibleEvents = events.filter(
        (event) => event.status === "CONFIRMED",
      );
      res.status(200).json(visibleEvents);
    }),
  );

  // Get event by ID
  router.get(
    "/:id",
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params as { id: string };
      const event = await eventService.getEvent(id);

      if (!event || event.status !== "CONFIRMED") {
        return res.status(404).json({ error: "Event not found" });
      }

      res.status(200).json(event);
    }),
  );

  // Create new event
  const createHandler = asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);
    if (!hasRole(req as AuthenticatedRequest, ["ORGANIZER"])) {
      return res.status(403).json({
        error: "Only organizer accounts can create events",
      });
    }
    if (!organizerService) {
      return res.status(500).json({ error: "Organizer service unavailable" });
    }

    // Get organizer profile for this user
    const organizerProfile = await organizerService.getProfileByUserId(userId);

    if (!organizerProfile || !organizerProfile.id) {
      return res.status(400).json({
        error: "Organizer profile is required to create an event",
      });
    }

    // Check if organizer is approved
    if (organizerProfile.status !== "APPROVED") {
      return res.status(403).json({
        error: `Your organizer profile must be approved to create events. Current status: ${organizerProfile.status}`,
      });
    }

    const { title, description, date, location, capacity, price, mood } =
      req.body;
    const files = Array.isArray(req.files) ? req.files : [];

    const imageUrls = files.length
      ? await Promise.all(
          files.map(async (file) => {
            const uploaded = await uploadImageBuffer(file.buffer, {
              folder: "tripnest/events",
              resource_type: "image",
            });
            return uploaded.secure_url;
          }),
        )
      : [];

    const parsedCapacity = capacity !== undefined ? Number(capacity) : capacity;
    const parsedPrice = price !== undefined ? Number(price) : price;
    const parsedDate = date ? new Date(date) : date;

    const event = await eventService.createEvent({
      title,
      description,
      date: parsedDate,
      location,
      capacity: parsedCapacity,
      price: parsedPrice,
      mood,
      imageUrls,
      organizerId: organizerProfile.id,
    });

    if (chatService) {
      await chatService.ensureOrganizerRoomForEvent(event.id!);
    }

    res.status(201).json(event);
  });

  if (authMiddleware) {
    router.post("/", authMiddleware, upload.array("images", 5), createHandler);
  } else {
    router.post("/", upload.array("images", 5), createHandler);
  }

  // Update event - only organizer or admin can update
  const updateHandler = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    const userId = getUserId(req);
    const isAdmin = hasRole(req as AuthenticatedRequest, ["ADMIN"]);

    // Get event to check ownership
    const event = await eventService.getEvent(id);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Check if user is the organizer or admin
    let isOwner = false;
    if (event.organizerId && organizerService) {
      const organizer = await organizerService.getProfileById(
        event.organizerId,
      );
      isOwner = organizer?.userId === userId;
    }

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        error: "You can only update your own events",
      });
    }

    const { title, description, date, location, capacity, price, mood } =
      req.body;

    const updatedEvent = await eventService.updateEvent(id, {
      title,
      description,
      date,
      location,
      capacity,
      price,
      mood,
    });

    res.status(200).json(updatedEvent);
  });

  if (authMiddleware) {
    router.patch("/:id", authMiddleware, updateHandler);
  } else {
    router.patch("/:id", updateHandler);
  }

  // Delete event - only organizer or admin can delete
  const deleteHandler = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    const userId = getUserId(req);
    const isAdmin = hasRole(req as AuthenticatedRequest, ["ADMIN"]);

    // Get event to check ownership
    const event = await eventService.getEvent(id);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Check if user is the organizer or admin
    let isOwner = false;
    if (event.organizerId && organizerService) {
      const organizer = await organizerService.getProfileById(
        event.organizerId,
      );
      isOwner = organizer?.userId === userId;
    }

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        error: "You can only delete your own events",
      });
    }

    await eventService.deleteEvent(id);
    res.status(200).json({ message: "Event deleted successfully" });
  });

  if (authMiddleware) {
    router.delete("/:id", authMiddleware, deleteHandler);
  } else {
    router.delete("/:id", deleteHandler);
  }

  return router;
}
