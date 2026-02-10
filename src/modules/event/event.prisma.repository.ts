import { PrismaClient } from "../database/prisma.js";
import { Prisma } from "../../../generated/prisma/client.js";
import { Event, CreateEventDto, UpdateEventDto } from "./event.entity.js";
import { EventRepository } from "./event.repository.js";

type EventWithImages = Prisma.EventGetPayload<{ include: { images: true } }>;

const toEvent = (event: EventWithImages): Event => ({
  ...event,
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

  async findAll(): Promise<Event[]> {
    const events = await this.prisma.event.findMany({
      orderBy: { date: "asc" },
      include: { images: true },
    });
    return events.map(toEvent);
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

  async findByQuery(query: {
    location?: string;
    keyword?: string;
    mood?: string;
  }): Promise<Event[]> {
    const filters = [] as Array<
      | { location: { contains: string; mode: "insensitive" } }
      | {
          OR: Array<
            | { title: { contains: string; mode: "insensitive" } }
            | { description: { contains: string; mode: "insensitive" } }
          >;
        }
      | { mood: { contains: string; mode: "insensitive" } }
    >;

    if (query.location) {
      filters.push({
        location: { contains: query.location, mode: "insensitive" },
      });
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

    const events = await this.prisma.event.findMany({
      where: filters.length ? { AND: filters } : undefined,
      orderBy: { date: "asc" },
      include: { images: true },
    });
    return events.map(toEvent);
  }

  async findUpcoming(): Promise<Event[]> {
    const events = await this.prisma.event.findMany({
      where: {
        date: {
          gte: new Date(),
        },
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
