import { describe, it, expect } from "vitest";
import { Booking } from "./booking.entity.js";
import { Status } from "../../../generated/prisma/enums.js";

const makeBooking = (
  ticketCounts = 2,
  status: Status = Status.PENDING,
  unitPrice?: number,
  totalPrice?: number,
) => new Booking("booking-1", "user-1", "event-1", ticketCounts, status, unitPrice, totalPrice);

describe("Booking entity", () => {
  describe("calculateTotalPrice", () => {
    it("sets unitPrice and calculates totalPrice correctly", () => {
      const booking = makeBooking(3);
      booking.calculateTotalPrice(100);

      expect(booking.unitPrice).toBe(100);
      expect(booking.totalPrice).toBe(300);
    });

    it("works with a single ticket", () => {
      const booking = makeBooking(1);
      booking.calculateTotalPrice(50);

      expect(booking.unitPrice).toBe(50);
      expect(booking.totalPrice).toBe(50);
    });

    it("works with a free event (price = 0)", () => {
      const booking = makeBooking(5);
      booking.calculateTotalPrice(0);

      expect(booking.unitPrice).toBe(0);
      expect(booking.totalPrice).toBe(0);
    });
  });

  describe("updateTicketCounts", () => {
    it("updates count and recalculates total when unitPrice is already set", () => {
      const booking = makeBooking(2, Status.PENDING, 100, 200);
      booking.updateTicketCounts(4);

      expect(booking.ticketCounts).toBe(4);
      expect(booking.totalPrice).toBe(400);
    });

    it("updates count without recalculating when unitPrice is not set", () => {
      const booking = makeBooking(2);
      booking.updateTicketCounts(5);

      expect(booking.ticketCounts).toBe(5);
      expect(booking.totalPrice).toBeUndefined();
    });
  });

  describe("comfirmBooking", () => {
    it("sets status to CONFIRMED", () => {
      const booking = makeBooking(1, Status.PENDING);
      booking.comfirmBooking();

      expect(booking.status).toBe(Status.CONFIRMED);
    });

    it("is idempotent when already CONFIRMED", () => {
      const booking = makeBooking(1, Status.CONFIRMED);
      booking.comfirmBooking();

      expect(booking.status).toBe(Status.CONFIRMED);
    });
  });
});
