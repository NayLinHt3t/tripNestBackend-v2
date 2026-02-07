import { Booking } from "./booking.entity.js";
import { BookingRepository } from "./booking.repository.js";
import { Status } from "../../../generated/prisma/enums.js";
import { ChatService } from "../chatting/chatting.service.js";

export class BookingService {
  constructor(
    private bookingRepository: BookingRepository,
    private chatService?: ChatService,
  ) {}

  async getBooking(bookingId: string): Promise<Booking | null> {
    if (!bookingId) {
      throw new Error("Booking ID is required");
    }
    const booking = await this.bookingRepository.findById(bookingId);

    // If prices are missing, calculate them
    if (booking && (!booking.unitPrice || !booking.totalPrice)) {
      const event = await this.bookingRepository.findEventById(booking.eventId);
      if (event) {
        booking.calculateTotalPrice(event.price);
        await this.bookingRepository.save(booking);
      }
    }

    return booking;
  }
  async getBookingsByUser(userId: string): Promise<Booking[]> {
    if (!userId) {
      throw new Error("User ID is required");
    }
    const bookings = await this.bookingRepository.findByUserId(userId);

    // Calculate missing prices for all bookings
    for (const booking of bookings) {
      if (!booking.unitPrice || !booking.totalPrice) {
        const event = await this.bookingRepository.findEventById(
          booking.eventId,
        );
        if (event) {
          booking.calculateTotalPrice(event.price);
          await this.bookingRepository.save(booking);
        }
      }
    }

    return bookings;
  }

  async createBooking(
    userId: string,
    eventId: string,
    ticketCounts: number,
  ): Promise<{ booking: Booking; chatRoomId?: string }> {
    // Validate inputs
    if (!userId || !eventId || !ticketCounts) {
      throw new Error("Missing required fields: userId, eventId, ticketCounts");
    }

    if (ticketCounts <= 0) {
      throw new Error("Ticket count must be greater than 0");
    }

    // Get event price
    const event = await this.bookingRepository.findEventById(eventId);

    if (!event) {
      throw new Error("Event not found");
    }

    const booking = new Booking(
      undefined, // Let Prisma auto-generate the ID
      userId,
      eventId,
      ticketCounts,
      Status.PENDING,
      undefined,
      undefined,
    );

    // Calculate prices before saving
    booking.calculateTotalPrice(event.price);

    const savedBooking = await this.bookingRepository.save(booking);

    let chatRoomId: string | undefined;
    if (this.chatService) {
      const room = await this.chatService.ensureRoomForEvent(
        savedBooking.eventId,
        savedBooking.userId,
      );
      chatRoomId = room.id;
    }

    return { booking: savedBooking, chatRoomId };
  }

  async confirmBooking(bookingId: string): Promise<Booking | null> {
    if (!bookingId) {
      throw new Error("Booking ID is required");
    }

    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) {
      throw new Error("Booking not found");
    }

    // If prices are not set, calculate them
    if (!booking.unitPrice || !booking.totalPrice) {
      const event = await this.bookingRepository.findEventById(booking.eventId);
      if (!event) {
        throw new Error("Event not found");
      }
      booking.calculateTotalPrice(event.price);
    }

    booking.comfirmBooking();
    const saved = await this.bookingRepository.save(booking);

    return saved;
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

    // Update ticket counts and recalculate total price
    booking.updateTicketCounts(ticketCounts);
    return this.bookingRepository.save(booking);
  }
}
