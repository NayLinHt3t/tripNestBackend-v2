import { describe, it, expect, vi, beforeEach } from "vitest";
import { BookingService } from "./booking.service.js";
import type { BookingRepository } from "./booking.repository.js";
import { Booking } from "./booking.entity.js";
import { Status } from "../../../generated/prisma/enums.js";
import type { ChatService } from "../chatting/chatting.service.js";

// ── helpers ───────────────────────────────────────────────────────────────────

const makeBooking = (overrides?: Partial<Booking>): Booking =>
  Object.assign(
    new Booking("booking-1", "user-1", "event-1", 2, Status.CONFIRMED, 1000, 2000),
    overrides,
  );

const makeRepo = (overrides?: Partial<BookingRepository>): BookingRepository => ({
  findById: vi.fn().mockResolvedValue(makeBooking()),
  findByUserId: vi.fn().mockResolvedValue([makeBooking()]),
  findEventById: vi.fn().mockResolvedValue({ id: "event-1", price: 1000, status: "CONFIRMED" }),
  save: vi.fn().mockImplementation(async (b: Booking) => b),
  ...overrides,
});

const makeChatService = (): Pick<ChatService, "ensureRoomForEvent"> => ({
  ensureRoomForEvent: vi.fn().mockResolvedValue({ id: "room-1" }),
});

// ── tests ─────────────────────────────────────────────────────────────────────

describe("BookingService", () => {
  let repo: BookingRepository;
  let service: BookingService;

  beforeEach(() => {
    repo = makeRepo();
    service = new BookingService(repo);
  });

  // ── getBooking ────────────────────────────────────────────────────────────────

  describe("getBooking", () => {
    it("returns the booking when found", async () => {
      const result = await service.getBooking("booking-1");

      expect(result?.id).toBe("booking-1");
    });

    it("throws when id is empty", async () => {
      await expect(service.getBooking("")).rejects.toThrow("Booking ID is required");
    });

    it("back-fills prices when they are missing", async () => {
      const incomplete = makeBooking({ unitPrice: undefined, totalPrice: undefined });
      vi.mocked(repo.findById).mockResolvedValue(incomplete);

      await service.getBooking("booking-1");

      expect(repo.save).toHaveBeenCalled();
      expect(incomplete.unitPrice).toBe(1000);
      expect(incomplete.totalPrice).toBe(2000);
    });
  });

  // ── getBookingsByUser ─────────────────────────────────────────────────────────

  describe("getBookingsByUser", () => {
    it("returns user bookings", async () => {
      const result = await service.getBookingsByUser("user-1");

      expect(result).toHaveLength(1);
    });

    it("throws when userId is empty", async () => {
      await expect(service.getBookingsByUser("")).rejects.toThrow("User ID is required");
    });
  });

  // ── createBooking ─────────────────────────────────────────────────────────────

  describe("createBooking", () => {
    it("creates a booking and calculates prices", async () => {
      vi.mocked(repo.findById).mockResolvedValue(makeBooking());

      const { booking } = await service.createBooking("user-1", "event-1", 3);

      expect(repo.save).toHaveBeenCalled();
      expect(booking.ticketCounts).toBe(3);
      expect(booking.unitPrice).toBe(1000);
      expect(booking.totalPrice).toBe(3000);
    });

    it("throws when ticket count is zero", async () => {
      await expect(service.createBooking("user-1", "event-1", 0)).rejects.toThrow(
        "Missing required fields",
      );
    });

    it("throws when ticket count is negative", async () => {
      await expect(service.createBooking("user-1", "event-1", -1)).rejects.toThrow(
        "Ticket count must be greater than 0",
      );
    });

    it("throws when event is not found", async () => {
      vi.mocked(repo.findEventById).mockResolvedValue(null);

      await expect(service.createBooking("user-1", "event-1", 2)).rejects.toThrow(
        "Event not found",
      );
    });

    it("throws when event is not CONFIRMED", async () => {
      vi.mocked(repo.findEventById).mockResolvedValue({
        id: "event-1",
        price: 1000,
        status: "PENDING",
      });

      await expect(service.createBooking("user-1", "event-1", 2)).rejects.toThrow(
        "Only confirmed events can be booked",
      );
    });

    it("returns chatRoomId when chat service is available", async () => {
      const chatService = makeChatService() as ChatService;
      const serviceWithChat = new BookingService(repo, chatService);

      const { chatRoomId } = await serviceWithChat.createBooking("user-1", "event-1", 1);

      expect(chatRoomId).toBe("room-1");
    });
  });

  // ── confirmBooking ────────────────────────────────────────────────────────────

  describe("confirmBooking", () => {
    it("confirms a pending booking", async () => {
      const booking = makeBooking({ status: Status.PENDING });
      vi.mocked(repo.findById).mockResolvedValue(booking);

      const result = await service.confirmBooking("booking-1");

      expect(result?.status).toBe(Status.CONFIRMED);
    });

    it("throws when booking is not found", async () => {
      vi.mocked(repo.findById).mockResolvedValue(null);

      await expect(service.confirmBooking("ghost")).rejects.toThrow("Booking not found");
    });

    it("throws when id is empty", async () => {
      await expect(service.confirmBooking("")).rejects.toThrow("Booking ID is required");
    });
  });

  // ── cancelBooking ─────────────────────────────────────────────────────────────

  describe("cancelBooking", () => {
    it("cancels a booking", async () => {
      const result = await service.cancelBooking("booking-1");

      expect(result?.status).toBe(Status.CANCELLED);
    });

    it("throws when booking is not found", async () => {
      vi.mocked(repo.findById).mockResolvedValue(null);

      await expect(service.cancelBooking("ghost")).rejects.toThrow("Booking not found");
    });

    it("throws when id is empty", async () => {
      await expect(service.cancelBooking("")).rejects.toThrow("Booking ID is required");
    });
  });

  // ── updateBooking ─────────────────────────────────────────────────────────────

  describe("updateBooking", () => {
    it("updates ticket count and recalculates price", async () => {
      const booking = makeBooking({ ticketCounts: 2, unitPrice: 1000, totalPrice: 2000 });
      vi.mocked(repo.findById).mockResolvedValue(booking);

      await service.updateBooking("booking-1", 5);

      expect(booking.ticketCounts).toBe(5);
      expect(booking.totalPrice).toBe(5000);
    });

    it("throws when ticket count is zero", async () => {
      await expect(service.updateBooking("booking-1", 0)).rejects.toThrow(
        "Ticket count must be greater than 0",
      );
    });

    it("throws when booking is not found", async () => {
      vi.mocked(repo.findById).mockResolvedValue(null);

      await expect(service.updateBooking("ghost", 2)).rejects.toThrow("Booking not found");
    });
  });
});
