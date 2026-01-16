import { Router, Request, Response } from "express";
import { EventService } from "./event.service";

export function createEventRouter(eventService: EventService): Router {
  const router = Router();

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

  // Search events by location
  router.get("/search", async (req: Request, res: Response) => {
    try {
      const { location } = req.query;

      if (!location || typeof location !== "string") {
        return res.status(400).json({
          error: "Location query parameter is required",
        });
      }

      const events = await eventService.searchByLocation(location);
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
  router.post("/", async (req: Request, res: Response) => {
    try {
      const { title, description, date, location, capacity, price } = req.body;

      const event = await eventService.createEvent({
        title,
        description,
        date,
        location,
        capacity,
        price,
      });

      res.status(201).json(event);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Internal error",
      });
    }
  });

  // Update event
  router.patch("/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const { title, description, date, location, capacity, price } = req.body;

      const event = await eventService.updateEvent(id, {
        title,
        description,
        date,
        location,
        capacity,
        price,
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
  });

  // Delete event
  router.delete("/:id", async (req: Request, res: Response) => {
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
  });

  return router;
}
