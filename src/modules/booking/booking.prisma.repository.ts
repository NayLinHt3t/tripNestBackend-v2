import { PrismaClient } from "../database/prisma";
import { Booking } from "./booking.entity";
import { BookingRepository } from "./booking.repository";

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
          booking.status as any
        )
      : null;
  }

  async save(booking: Booking): Promise<Booking> {
    const savedBooking = await this.prisma.booking.upsert({
      where: { id: String(booking.id) },
      update: {
        status: booking.status,
        ticketCounts: booking.ticketCounts,
      },
      create: {
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
      savedBooking.status as any
    );
  }
}
