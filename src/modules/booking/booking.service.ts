import { Booking } from "./booking.entity.js";
import { BookingRepository } from "./booking.repository.js";
import { Status } from "../../../generated/prisma/enums.js";

export class BookingService {
  constructor(private bookingRepository: BookingRepository) {}

  async getBooking(bookingId: string): Promise<Booking | null> {
    if (!bookingId) {
      throw new Error("Booking ID is required");
    }
    return this.bookingRepository.findById(bookingId);
  }
  async getBookingsByUser(userId: string): Promise<Booking[]> {
    if (!userId) {
      throw new Error("User ID is required");
    }
    return this.bookingRepository.findByUserId(userId);
  }

  async createBooking(
    userId: string,
    eventId: string,
    ticketCounts: number,
  ): Promise<Booking> {
    // Validate inputs
    if (!userId || !eventId || !ticketCounts) {
      throw new Error("Missing required fields: userId, eventId, ticketCounts");
    }

    if (ticketCounts <= 0) {
      throw new Error("Ticket count must be greater than 0");
    }

    const booking = new Booking(
      undefined, // Let Prisma auto-generate the ID
      userId,
      eventId,
      ticketCounts,
      Status.PENDING,
    );
    return this.bookingRepository.save(booking);
  }

  async confirmBooking(bookingId: string): Promise<Booking | null> {
    if (!bookingId) {
      throw new Error("Booking ID is required");
    }

    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) {
      throw new Error("Booking not found");
    }

    booking.comfirmBooking();
    return this.bookingRepository.save(booking);
  }

  async cancelBooking(bookingId: string): Promise<Booking | null> {
    if (!bookingId) {
      throw new Error("Booking ID is required");
    }

    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) {
      throw new Error("Booking not found");
    }

    booking.status = Status.CANCELLED;
    return this.bookingRepository.save(booking);
  }

  async updateBooking(
    bookingId: string,
    ticketCounts: number,
  ): Promise<Booking | null> {
    if (!bookingId) {
      throw new Error("Booking ID is required");
    }

    if (!ticketCounts || ticketCounts <= 0) {
      throw new Error("Ticket count must be greater than 0");
    }

    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) {
      throw new Error("Booking not found");
    }

    booking.ticketCounts = ticketCounts;
    return this.bookingRepository.save(booking);
  }
}
