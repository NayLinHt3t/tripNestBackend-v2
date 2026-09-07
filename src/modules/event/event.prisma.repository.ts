import { PrismaClient } from "../database/prisma.js";
import { Prisma, Status } from "../../../generated/prisma/client.js";
import {
  Event,
  CreateEventDto,
  UpdateEventDto,
  EventWithAvailableTickets,
  EventsTicketResponse,
  EventStatus,
} from "./event.entity.js";
import { EventRepository, PaginationOptions, PaginatedEvents } from "./event.repository.js";

type EventWithImages = Prisma.EventGetPayload<{ include: { images: true } }>;

const toEvent = (event: EventWithImages): Event => ({
  ...event,
  status: event.status as EventStatus,
  images: event.images ?? [],
});

export class PrismaEventRepository implements EventRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<Event | null> {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: { images: true },
    });
    return event ? toEvent(event) : null;
  }

  async findAll({ page, limit }: PaginationOptions): Promise<PaginatedEvents> {
    const skip = (page - 1) * limit;
    const where = { status: "CONFIRMED" } as const;
    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        orderBy: { date: "asc" },
        include: { images: true },
        skip,
        take: limit,
      }),
      this.prisma.event.count({ where }),
    ]);
    return { events: events.map(toEvent), total };
  }

  async findByLocation(location: string): Promise<Event[]> {
    const events = await this.prisma.event.findMany({
      where: {
        location: {
          contains: location,
          mode: "insensitive",
        },
      },
      orderBy: { date: "asc" },
      include: { images: true },
    });
    return events.map(toEvent);
  }

  async findByQuery(
    query: { location?: string; keyword?: string; mood?: string },
    { page, limit }: PaginationOptions,
  ): Promise<PaginatedEvents> {
    const skip = (page - 1) * limit;
    const filters: Prisma.EventWhereInput[] = [];

    if (query.location) {
      filters.push({ location: { contains: query.location, mode: "insensitive" } });
    }
    if (query.keyword) {
      filters.push({
        OR: [
          { title: { contains: query.keyword, mode: "insensitive" } },
          { description: { contains: query.keyword, mode: "insensitive" } },
        ],
      });
    }
    if (query.mood) {
      filters.push({ mood: { contains: query.mood, mode: "insensitive" } });
    }

    const where: Prisma.EventWhereInput = {
      status: Status.CONFIRMED,
      ...(filters.length ? { AND: filters } : {}),
    };

    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        orderBy: { date: "asc" },
        include: { images: true },
        skip,
        take: limit,
      }),
      this.prisma.event.count({ where }),
    ]);
    return { events: events.map(toEvent), total };
  }

  async findUpcoming({ page, limit }: PaginationOptions): Promise<PaginatedEvents> {
    const skip = (page - 1) * limit;
    const where = { status: "CONFIRMED", date: { gte: new Date() } } as const;
    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        orderBy: { date: "asc" },
        include: { images: true },
        skip,
        take: limit,
      }),
      this.prisma.event.count({ where }),
    ]);
    return { events: events.map(toEvent), total };
  }

  async getEventsWithAvailableTickets(): Promise<EventsTicketResponse> {
    const events = await this.prisma.event.findMany({
      where: { status: "CONFIRMED" },
      include: {
        images: true,
        bookings: {
          select: { ticketCounts: true, status: true },
        },
      },
      orderBy: { date: "asc" },
    });

    const eventsWithTickets: EventWithAvailableTickets[] = events.map(
      (event) => {
        // Calculate booked tickets (count all confirmed bookings)
        const bookedTickets = event.bookings
          .filter((booking) => booking.status === "CONFIRMED")
          .reduce((sum, booking) => sum + booking.ticketCounts, 0);

        const availableTickets = event.capacity - bookedTickets;
        const isFullyBooked = availableTickets <= 0;

        return {
          ...toEvent(event),
          bookedTickets,
          availableTickets,
          isFullyBooked: isFullyBooked,
        } as any;
      },
    );

    // Separate fully booked and available events
    const fullyBookedEvents = eventsWithTickets
      .filter((event) => (event as any).isFullyBooked)
      .map((event) => {
        const { bookedTickets, availableTickets, ...eventData } = event as any;
        return eventData;
      });

    const eventsSortedByAvailability = eventsWithTickets
      .filter((event) => !(event as any).isFullyBooked)
      .sort((a, b) => a.availableTickets - b.availableTickets)
      .map((event) => {
        const { isFullyBooked, ...eventData } = event as any;
        return eventData;
      });

    return {
      eventsSortedByAvailability,
      fullyBookedEvents,
    };
  }

  async findByMoods(moods: string[], excludeEventIds: string[] = []): Promise<Event[]> {
    const events = await this.prisma.event.findMany({
      where: {
        mood: { in: moods },
        status: "CONFIRMED",
        date: { gte: new Date() },
        ...(excludeEventIds.length ? { id: { notIn: excludeEventIds } } : {}),
      },
      orderBy: { date: "asc" },
      include: { images: true },
    });
    return events.map(toEvent);
  }

  async create(data: CreateEventDto): Promise<Event> {
    const event = await this.prisma.event.create({
      data: {
        title: data.title,
        description: data.description,
        date: new Date(data.date),
        location: data.location,
        capacity: data.capacity,
        price: data.price,
        mood: data.mood ?? undefined,
        organizerId: data.organizerId,
        bookingType: data.bookingType ?? "MANUAL",
        ...(data.imageUrls && data.imageUrls.length
          ? {
              images: {
                create: data.imageUrls.map((imageUrl) => ({ imageUrl })),
              },
            }
          : {}),
      },
      include: { images: true },
    });
    return toEvent(event);
  }

  async update(id: string, data: UpdateEventDto): Promise<Event | null> {
    try {
      const event = await this.prisma.event.update({
        where: { id },
        data: {
          ...(data.title && { title: data.title }),
          ...(data.description && { description: data.description }),
          ...(data.date && { date: new Date(data.date) }),
          ...(data.location && { location: data.location }),
          ...(data.capacity && { capacity: data.capacity }),
          ...(data.price && { price: data.price }),
          ...(data.mood !== undefined && { mood: data.mood }),
        },
        include: { images: true },
      });
      return toEvent(event);
    } catch {
      return null;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.event.delete({
        where: { id },
      });
      return true;
    } catch {
      return false;
    }
  }
}
