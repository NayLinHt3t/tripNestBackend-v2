import { describe, it, expect, vi } from "vitest";
import { DashboardService } from "./dashboard.service.js";
import type { DashboardRepository, BookingWithEvent } from "./dashboard.repository.js";
import { Status } from "../../../generated/prisma/enums.js";

const makeEvent = (id = "event-1", title = "Concert", price = 500) => ({
  id,
  title,
  price,
  images: [],
});

const makeBooking = (
  overrides: Partial<BookingWithEvent> = {},
): BookingWithEvent => ({
  id: "booking-1",
  status: Status.CONFIRMED,
  ticketCounts: 2,
  unitPrice: 500,
  totalPrice: 1000,
  event: makeEvent(),
  ...overrides,
});

const makeRepo = (bookings: BookingWithEvent[]): DashboardRepository => ({
  getBookingsWithEvent: vi.fn().mockResolvedValue(bookings),
  getOrganizerEvents: vi.fn().mockResolvedValue([makeEvent()]),
});

describe("DashboardService", () => {
  describe("getSummary", () => {
    it("counts confirmed booking revenue correctly", async () => {
      const repo = makeRepo([makeBooking()]);
      const service = new DashboardService(repo);

      const summary = await service.getSummary("organizer-1");

      expect(summary.totalRevenue).toBe(1000);
      expect(summary.totalBookings).toBe(1);
      expect(summary.totalTickets).toBe(2);
    });

    it("does not count PENDING booking toward revenue or totals", async () => {
      const repo = makeRepo([makeBooking({ status: Status.PENDING })]);
      const service = new DashboardService(repo);

      const summary = await service.getSummary("organizer-1");

      expect(summary.totalRevenue).toBe(0);
      expect(summary.totalBookings).toBe(0);
      expect(summary.totalTickets).toBe(0);
      expect(summary.bookingStatus.PENDING).toBe(1);
    });

    it("does not count CANCELLED booking toward revenue or totals", async () => {
      const repo = makeRepo([makeBooking({ status: Status.CANCELLED })]);
      const service = new DashboardService(repo);

      const summary = await service.getSummary("organizer-1");

      expect(summary.totalRevenue).toBe(0);
      expect(summary.totalBookings).toBe(0);
      expect(summary.totalTickets).toBe(0);
      expect(summary.bookingStatus.CANCELLED).toBe(1);
    });

    it("revenue increases when booking is confirmed — not before", async () => {
      const pendingBooking = makeBooking({ status: Status.PENDING });
      const confirmedBooking = makeBooking({ status: Status.CONFIRMED });

      const pendingRepo = makeRepo([pendingBooking]);
      const confirmedRepo = makeRepo([confirmedBooking]);

      const pendingSummary = await new DashboardService(pendingRepo).getSummary("organizer-1");
      const confirmedSummary = await new DashboardService(confirmedRepo).getSummary("organizer-1");

      expect(pendingSummary.totalRevenue).toBe(0);
      expect(confirmedSummary.totalRevenue).toBe(1000);
    });

    it("falls back to event price when unitPrice is missing", async () => {
      const booking = makeBooking({ unitPrice: null, totalPrice: null });
      const repo = makeRepo([booking]);
      const service = new DashboardService(repo);

      const summary = await service.getSummary("organizer-1");

      // event.price=500 × ticketCounts=2
      expect(summary.totalRevenue).toBe(1000);
    });

    it("aggregates revenue across multiple confirmed bookings", async () => {
      const repo = makeRepo([
        makeBooking({ id: "b-1", ticketCounts: 2, totalPrice: 1000 }),
        makeBooking({ id: "b-2", ticketCounts: 3, totalPrice: 1500 }),
        makeBooking({ id: "b-3", status: Status.PENDING, totalPrice: 500 }),
      ]);
      const service = new DashboardService(repo);

      const summary = await service.getSummary("organizer-1");

      expect(summary.totalRevenue).toBe(2500);
      expect(summary.totalBookings).toBe(2);
      expect(summary.totalTickets).toBe(5);
      expect(summary.bookingStatus.CONFIRMED).toBe(2);
      expect(summary.bookingStatus.PENDING).toBe(1);
    });

    it("tracks per-event revenue separately", async () => {
      const repo: DashboardRepository = {
        getBookingsWithEvent: vi.fn().mockResolvedValue([
          makeBooking({ id: "b-1", event: makeEvent("ev-1", "Concert", 500), totalPrice: 1000 }),
          makeBooking({ id: "b-2", event: makeEvent("ev-2", "Workshop", 200), totalPrice: 400 }),
        ]),
        getOrganizerEvents: vi.fn().mockResolvedValue([
          makeEvent("ev-1", "Concert", 500),
          makeEvent("ev-2", "Workshop", 200),
        ]),
      };
      const service = new DashboardService(repo);

      const summary = await service.getSummary("organizer-1");

      const concert = summary.events.find((e) => e.eventId === "ev-1");
      const workshop = summary.events.find((e) => e.eventId === "ev-2");

      expect(concert?.totalRevenue).toBe(1000);
      expect(workshop?.totalRevenue).toBe(400);
      expect(summary.totalRevenue).toBe(1400);
    });
  });
});
