import { Router, Request, Response, RequestHandler } from "express";
import multer from "multer";
import { EventService } from "./event.service.js";
import { uploadImageBuffer } from "../utils/cloudinary.js";
import { AuthenticatedRequest } from "../auth/auth.middleware.js";
import { OrganizerService } from "../organizer/organizer.service.js";

export function createEventRouter(
  eventService: EventService,
  authMiddleware?: RequestHandler,
  organizerService?: OrganizerService,
): Router {
  const router = Router();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
  });

  // Get all events
  router.get("/", async (req: Request, res: Response) => {
    try {
      const events = await eventService.getAllEvents();
      res.status(200).json(events);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Internal error",
      });
    }
  });

  // Get upcoming events
  router.get("/upcoming", async (req: Request, res: Response) => {
    try {
      const events = await eventService.getUpcomingEvents();
      res.status(200).json(events);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Internal error",
      });
    }
  });

  // Search events by location, keyword, or mood
  router.get("/search", async (req: Request, res: Response) => {
    try {
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
      res.status(200).json(events);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Internal error",
      });
    }
  });

  // Get event by ID
  router.get("/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const event = await eventService.getEvent(id);

      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      res.status(200).json(event);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Internal error",
      });
    }
  });

  // Create new event
  const createHandler = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      if (!organizerService) {
        return res.status(500).json({ error: "Organizer service unavailable" });
      }
      const organizerProfile =
        await organizerService.getProfileByUserId(userId);
      if (!organizerProfile.id) {
        return res.status(400).json({
          error: "Organizer profile is required to create an event",
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

      const parsedCapacity =
        capacity !== undefined ? Number(capacity) : capacity;
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

      res.status(201).json(event);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Internal error",
      });
    }
  };

  if (authMiddleware) {
    router.post("/", authMiddleware, upload.array("images", 5), createHandler);
  } else {
    router.post("/", upload.array("images", 5), createHandler);
  }

  // Update event
  const updateHandler = async (req: Request, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const { title, description, date, location, capacity, price, mood } =
        req.body;

      const event = await eventService.updateEvent(id, {
        title,
        description,
        date,
        location,
        capacity,
        price,
        mood,
      });

      res.status(200).json(event);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ error: error.message });
      }
      res.status(400).json({
        error: error instanceof Error ? error.message : "Internal error",
      });
    }
  };

  if (authMiddleware) {
    router.patch("/:id", authMiddleware, updateHandler);
  } else {
    router.patch("/:id", updateHandler);
  }

  // Delete event
  const deleteHandler = async (req: Request, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      await eventService.deleteEvent(id);
      res.status(200).json({ message: "Event deleted successfully" });
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ error: error.message });
      }
      res.status(400).json({
        error: error instanceof Error ? error.message : "Internal error",
      });
    }
  };

  if (authMiddleware) {
    router.delete("/:id", authMiddleware, deleteHandler);
  } else {
    router.delete("/:id", deleteHandler);
  }

  return router;
}
