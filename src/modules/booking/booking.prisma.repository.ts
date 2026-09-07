import { PrismaClient } from "../database/prisma.js";
import { Booking } from "./booking.entity.js";
import { BookingRepository, BookingWithDetails, EventInfo } from "./booking.repository.js";

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
          booking.unitPrice ?? undefined,
          booking.totalPrice ?? undefined,
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
          booking.unitPrice ?? undefined,
          booking.totalPrice ?? undefined,
        ),
    );
  }

  async findByOrganizerUserId(userId: string, status?: string): Promise<BookingWithDetails[]> {
    return this.prisma.booking.findMany({
      where: {
        event: { organizer: { userId } },
        ...(status ? { status } : {}),
      },
      select: {
        id: true,
        status: true,
        ticketCounts: true,
        unitPrice: true,
        totalPrice: true,
        createdAt: true,
        event: { select: { id: true, title: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findEventById(eventId: string): Promise<EventInfo | null> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, price: true, status: true, capacity: true, bookingType: true },
    });
    return event;
  }

  async countConfirmedTickets(eventId: string): Promise<number> {
    const result = await this.prisma.booking.aggregate({
      where: { eventId, status: { in: ["CONFIRMED", "PENDING"] } },
      _sum: { ticketCounts: true },
    });
    return result._sum.ticketCounts ?? 0;
  }

  async save(booking: Booking): Promise<Booking> {
    // If ID exists, update; otherwise create new
    if (booking.id) {
      const savedBooking = await this.prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: booking.status,
          ticketCounts: booking.ticketCounts,
          unitPrice: booking.unitPrice,
          totalPrice: booking.totalPrice,
        },
      });
      return new Booking(
        savedBooking.id,
        savedBooking.userId,
        savedBooking.eventId,
        savedBooking.ticketCounts,
        savedBooking.status as any,
        savedBooking.unitPrice ?? undefined,
        savedBooking.totalPrice ?? undefined,
      );
    }

    // Create new booking - Prisma auto-generates ID
    const savedBooking = await this.prisma.booking.create({
      data: {
        userId: booking.userId,
        eventId: booking.eventId,
        ticketCounts: booking.ticketCounts,
        status: booking.status,
        unitPrice: booking.unitPrice,
        totalPrice: booking.totalPrice,
      },
    });

    return new Booking(
      savedBooking.id,
      savedBooking.userId,
      savedBooking.eventId,
      savedBooking.ticketCounts,
      savedBooking.status as any,
      savedBooking.unitPrice ?? undefined,
      savedBooking.totalPrice ?? undefined,
    );
  }
}
