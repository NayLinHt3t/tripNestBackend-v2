import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventService } from "./event.service.js";
import type { EventRepository } from "./event.repository.js";
import { EventStatus, type Event, type CreateEventDto } from "./event.entity.js";

// ── helpers ───────────────────────────────────────────────────────────────────

const future = () => new Date(Date.now() + 86_400_000); // tomorrow

const makeEvent = (overrides?: Partial<Event>): Event => ({
  id: "event-1",
  title: "Test Concert",
  description: "A great concert",
  date: future(),
  images: [],
  location: "Yangon",
  capacity: 100,
  price: 5000,
  organizerId: "org-1",
  status: EventStatus.CONFIRMED,
  createdAt: new Date(),
  ...overrides,
});

const makeCreateDto = (overrides?: Partial<CreateEventDto>): CreateEventDto => ({
  title: "Test Concert",
  description: "A great concert",
  date: future(),
  location: "Yangon",
  capacity: 100,
  price: 5000,
  organizerId: "org-1",
  ...overrides,
});

const makeRepo = (overrides?: Partial<EventRepository>): EventRepository => ({
  findById: vi.fn().mockResolvedValue(null),
  findAll: vi.fn().mockResolvedValue([]),
  findByLocation: vi.fn().mockResolvedValue([]),
  findByQuery: vi.fn().mockResolvedValue([]),
  findUpcoming: vi.fn().mockResolvedValue([]),
  getEventsWithAvailableTickets: vi.fn().mockResolvedValue({
    eventsSortedByAvailability: [],
    fullyBookedEvents: [],
  }),
  create: vi.fn().mockResolvedValue(makeEvent()),
  update: vi.fn().mockResolvedValue(makeEvent()),
  delete: vi.fn().mockResolvedValue(true),
  ...overrides,
});

const makePrisma = (orgStatus = "APPROVED", bookingCount = 0) => ({
  organizerProfile: {
    findUnique: vi.fn().mockResolvedValue({ id: "org-1", status: orgStatus }),
  },
  booking: {
    count: vi.fn().mockResolvedValue(bookingCount),
  },
  event: {
    findUnique: vi.fn().mockResolvedValue(makeEvent()),
    update: vi.fn().mockResolvedValue({ ...makeEvent(), images: [] }),
    findMany: vi.fn().mockResolvedValue([makeEvent()]),
  },
});

// ── tests ─────────────────────────────────────────────────────────────────────

describe("EventService", () => {
  let repo: EventRepository;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prisma: any;
  let service: EventService;

  beforeEach(() => {
    repo = makeRepo();
    prisma = makePrisma();
    service = new EventService(repo, prisma);
  });

  // ── getEvent ─────────────────────────────────────────────────────────────────

  describe("getEvent", () => {
    it("returns event when found", async () => {
      vi.mocked(repo.findById).mockResolvedValue(makeEvent());

      const result = await service.getEvent("event-1");

      expect(result?.id).toBe("event-1");
    });

    it("throws when id is empty", async () => {
      await expect(service.getEvent("")).rejects.toThrow("Event ID is required");
    });
  });

  // ── searchEvents ─────────────────────────────────────────────────────────────

  describe("searchEvents", () => {
    it("delegates to repository when valid query is provided", async () => {
      await service.searchEvents({ keyword: "concert" });

      expect(repo.findByQuery).toHaveBeenCalledWith({ keyword: "concert" });
    });

    it("throws when no search criteria are provided", async () => {
      await expect(service.searchEvents({})).rejects.toThrow(
        "Location, keyword, or mood is required",
      );
    });
  });

  // ── createEvent ───────────────────────────────────────────────────────────────

  describe("createEvent", () => {
    it("creates an event successfully with valid data", async () => {
      const result = await service.createEvent(makeCreateDto());

      expect(repo.create).toHaveBeenCalled();
      expect(result.id).toBe("event-1");
    });

    it("throws when title is missing", async () => {
      await expect(
        service.createEvent(makeCreateDto({ title: "" })),
      ).rejects.toThrow("Event title is required");
    });

    it("throws when description is missing", async () => {
      await expect(
        service.createEvent(makeCreateDto({ description: "" })),
      ).rejects.toThrow("Event description is required");
    });

    it("throws when location is missing", async () => {
      await expect(
        service.createEvent(makeCreateDto({ location: "" })),
      ).rejects.toThrow("Event location is required");
    });

    it("throws when date is in the past", async () => {
      const pastDate = new Date(Date.now() - 86_400_000);
      await expect(
        service.createEvent(makeCreateDto({ date: pastDate })),
      ).rejects.toThrow("Event date must be in the future");
    });

    it("throws when capacity is zero or negative", async () => {
      await expect(
        service.createEvent(makeCreateDto({ capacity: 0 })),
      ).rejects.toThrow("Capacity must be a positive number");
    });

    it("throws when capacity exceeds 100,000", async () => {
      await expect(
        service.createEvent(makeCreateDto({ capacity: 100_001 })),
      ).rejects.toThrow("Capacity cannot exceed 100,000");
    });

    it("throws when price is negative", async () => {
      await expect(
        service.createEvent(makeCreateDto({ price: -1 })),
      ).rejects.toThrow("Price cannot be negative");
    });

    it("throws when price exceeds 1,000,000", async () => {
      await expect(
        service.createEvent(makeCreateDto({ price: 1_000_001 })),
      ).rejects.toThrow("Price cannot exceed 1,000,000");
    });

    it("throws when title exceeds 255 characters", async () => {
      await expect(
        service.createEvent(makeCreateDto({ title: "a".repeat(256) })),
      ).rejects.toThrow("Event title cannot exceed 255 characters");
    });

    it("throws when description exceeds 5,000 characters", async () => {
      await expect(
        service.createEvent(makeCreateDto({ description: "a".repeat(5001) })),
      ).rejects.toThrow("Event description cannot exceed 5,000 characters");
    });

    it("throws when organizer is not APPROVED", async () => {
      prisma.organizerProfile.findUnique.mockResolvedValue({
        id: "org-1",
        status: "PENDING",
      });

      await expect(service.createEvent(makeCreateDto())).rejects.toThrow(
        "Organizer must be approved to create events",
      );
    });

    it("throws when organizer profile does not exist", async () => {
      prisma.organizerProfile.findUnique.mockResolvedValue(null);

      await expect(service.createEvent(makeCreateDto())).rejects.toThrow(
        "Organizer profile not found",
      );
    });
  });

  // ── updateEvent ───────────────────────────────────────────────────────────────

  describe("updateEvent", () => {
    it("updates a confirmed event successfully", async () => {
      vi.mocked(repo.findById).mockResolvedValue(makeEvent());

      const result = await service.updateEvent("event-1", { title: "Updated" });

      expect(repo.update).toHaveBeenCalledWith("event-1", { title: "Updated" });
      expect(result).toBeDefined();
    });

    it("throws when event is not found", async () => {
      vi.mocked(repo.findById).mockResolvedValue(null);

      await expect(service.updateEvent("ghost", {})).rejects.toThrow("Event not found");
    });

    it("throws when event is CANCELLED", async () => {
      vi.mocked(repo.findById).mockResolvedValue(
        makeEvent({ status: EventStatus.CANCELLED }),
      );

      await expect(service.updateEvent("event-1", {})).rejects.toThrow(
        "Cannot update a cancelled event",
      );
    });

    it("throws when updated date is in the past", async () => {
      vi.mocked(repo.findById).mockResolvedValue(makeEvent());
      const past = new Date(Date.now() - 86_400_000);

      await expect(service.updateEvent("event-1", { date: past })).rejects.toThrow(
        "Event date must be in the future",
      );
    });

    it("throws when updated capacity is zero", async () => {
      vi.mocked(repo.findById).mockResolvedValue(makeEvent());

      await expect(service.updateEvent("event-1", { capacity: 0 })).rejects.toThrow(
        "Capacity must be greater than 0",
      );
    });

    it("throws when updated price is negative", async () => {
      vi.mocked(repo.findById).mockResolvedValue(makeEvent());

      await expect(service.updateEvent("event-1", { price: -10 })).rejects.toThrow(
        "Price cannot be negative",
      );
    });
  });

  // ── deleteEvent ───────────────────────────────────────────────────────────────

  describe("deleteEvent", () => {
    it("deletes an event with no confirmed bookings", async () => {
      vi.mocked(repo.findById).mockResolvedValue(makeEvent());

      const result = await service.deleteEvent("event-1");

      expect(result).toBe(true);
      expect(repo.delete).toHaveBeenCalledWith("event-1");
    });

    it("throws when event is not found", async () => {
      vi.mocked(repo.findById).mockResolvedValue(null);

      await expect(service.deleteEvent("ghost")).rejects.toThrow("Event not found");
    });

    it("throws when event has confirmed bookings", async () => {
      vi.mocked(repo.findById).mockResolvedValue(makeEvent());
      prisma.booking.count.mockResolvedValue(3);

      await expect(service.deleteEvent("event-1")).rejects.toThrow(
        "Cannot delete event with confirmed bookings",
      );
    });

    it("throws when id is empty", async () => {
      await expect(service.deleteEvent("")).rejects.toThrow("Event ID is required");
    });
  });

  // ── cancelEvent ───────────────────────────────────────────────────────────────

  describe("cancelEvent", () => {
    it("cancels a confirmed event", async () => {
      vi.mocked(repo.findById).mockResolvedValue(makeEvent());
      prisma.event.update.mockResolvedValue({
        ...makeEvent(),
        status: "CANCELLED",
        images: [],
      });

      const result = await service.cancelEvent("event-1");

      expect(result?.status).toBe(EventStatus.CANCELLED);
    });

    it("throws when event is already cancelled", async () => {
      vi.mocked(repo.findById).mockResolvedValue(
        makeEvent({ status: EventStatus.CANCELLED }),
      );

      await expect(service.cancelEvent("event-1")).rejects.toThrow(
        "Event is already cancelled",
      );
    });

    it("throws when event is not found", async () => {
      vi.mocked(repo.findById).mockResolvedValue(null);

      await expect(service.cancelEvent("ghost")).rejects.toThrow("Event not found");
    });
  });
});
