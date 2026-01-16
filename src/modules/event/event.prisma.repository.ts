import { PrismaClient } from "../database/prisma.js";
import { Event, CreateEventDto, UpdateEventDto } from "./event.entity.js";
import { EventRepository } from "./event.repository.js";

export class PrismaEventRepository implements EventRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<Event | null> {
    return this.prisma.event.findUnique({
      where: { id },
    });
  }

  async findAll(): Promise<Event[]> {
    return this.prisma.event.findMany({
      orderBy: { date: "asc" },
    });
  }

  async findByLocation(location: string): Promise<Event[]> {
    return this.prisma.event.findMany({
      where: {
        location: {
          contains: location,
          mode: "insensitive",
        },
      },
      orderBy: { date: "asc" },
    });
  }

  async findUpcoming(): Promise<Event[]> {
    return this.prisma.event.findMany({
      where: {
        date: {
          gte: new Date(),
        },
      },
      orderBy: { date: "asc" },
    });
  }

  async create(data: CreateEventDto): Promise<Event> {
    return this.prisma.event.create({
      data: {
        title: data.title,
        description: data.description,
        date: new Date(data.date),
        location: data.location,
        capacity: data.capacity,
        price: data.price,
      },
    });
  }

  async update(id: string, data: UpdateEventDto): Promise<Event | null> {
    try {
      return await this.prisma.event.update({
        where: { id },
        data: {
          ...(data.title && { title: data.title }),
          ...(data.description && { description: data.description }),
          ...(data.date && { date: new Date(data.date) }),
          ...(data.location && { location: data.location }),
          ...(data.capacity && { capacity: data.capacity }),
          ...(data.price && { price: data.price }),
        },
      });
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
