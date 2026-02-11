import { PrismaClient } from "../database/prisma.js";
import {
  DashboardRepository,
  BookingWithEvent,
} from "./dashboard.repository.js";
import { Event } from "../event/event.entity.js";

export class PrismaDashboardRepository implements DashboardRepository {
  constructor(private prisma: PrismaClient) {}

  async getBookingsWithEvent(organizerId: string): Promise<BookingWithEvent[]> {
    return this.prisma.booking.findMany({
      where: {
        event: {
          organizerId,
        },
      },
      select: {
        id: true,
        status: true,
        ticketCounts: true,
        unitPrice: true,
        totalPrice: true,
        event: {
          select: {
            id: true,
            title: true,
            price: true,
            images: {
              select: {
                id: true,
                imageUrl: true,
              },
            },
          },
        },
      },
    });
  }

  async getOrganizerEvents(organizerId: string): Promise<
    Array<{
      id: string;
      title: string;
      price: number;
      images: Array<{ id: string; imageUrl: string }>;
    }>
  > {
    return this.prisma.event.findMany({
      where: {
        organizerId,
      },
      select: {
        id: true,
        title: true,
        price: true,
        images: {
          select: {
            id: true,
            imageUrl: true,
          },
        },
      },
    });
  }

  async getOrganizerFullEvents(organizerId: string): Promise<Event[]> {
    const events = await this.prisma.event.findMany({
      where: {
        organizerId,
      },
      include: {
        images: {
          select: {
            id: true,
            imageUrl: true,
          },
        },
      },
    });

    return events.map((event) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      date: event.date,
      location: event.location,
      capacity: event.capacity,
      price: event.price,
      mood: event.mood,
      organizerId: event.organizerId,
      createdAt: event.createdAt,
      images: event.images,
    }));
  }
}
