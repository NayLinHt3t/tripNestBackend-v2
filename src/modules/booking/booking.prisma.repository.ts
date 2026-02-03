import { PrismaClient } from "../database/prisma.js";
import { Booking } from "./booking.entity.js";
import { BookingRepository } from "./booking.repository.js";

export class PrismaBookingRepository implements BookingRepository {
  constructor(private prisma: PrismaClient) {} // Inject PrismaClient

  async findById(id: string): Promise<Booking | null> {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
    });
    return booking
      ? new Booking(
          booking.id,
          booking.userId,
          booking.eventId,
          booking.ticketCounts,
          booking.status as any,
        )
      : null;
  }
  async findByUserId(userId: string): Promise<Booking[]> {
    const bookings = await this.prisma.booking.findMany({
      where: { userId },
    });
    return bookings.map(
      (booking) =>
        new Booking(
          booking.id,
          booking.userId,
          booking.eventId,
          booking.ticketCounts,
          booking.status as any,
        ),
    );
  }

  async save(booking: Booking): Promise<Booking> {
    // If ID exists, update; otherwise create new
    if (booking.id) {
      const savedBooking = await this.prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: booking.status,
          ticketCounts: booking.ticketCounts,
        },
      });
      return new Booking(
        savedBooking.id,
        savedBooking.userId,
        savedBooking.eventId,
        savedBooking.ticketCounts,
        savedBooking.status as any,
      );
    }

    // Create new booking - Prisma auto-generates ID
    const savedBooking = await this.prisma.booking.create({
      data: {
        userId: booking.userId,
        eventId: booking.eventId,
        ticketCounts: booking.ticketCounts,
        status: booking.status,
      },
    });

    return new Booking(
      savedBooking.id,
      savedBooking.userId,
      savedBooking.eventId,
      savedBooking.ticketCounts,
      savedBooking.status as any,
    );
  }
}
