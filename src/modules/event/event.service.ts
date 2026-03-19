import {
  Event,
  CreateEventDto,
  UpdateEventDto,
  EventsTicketResponse,
  EventStatus,
} from "./event.entity.js";
import { EventRepository } from "./event.repository.js";
import { PrismaClient } from "../database/prisma.js";

export class EventService {
  constructor(
    private eventRepository: EventRepository,
    private prisma?: PrismaClient,
  ) {}

  async getEvent(id: string): Promise<Event | null> {
    if (!id) {
      throw new Error("Event ID is required");
    }
    return this.eventRepository.findById(id);
  }

  async getAllEvents(): Promise<Event[]> {
    return this.eventRepository.findAll();
  }

  async getUpcomingEvents(): Promise<Event[]> {
    return this.eventRepository.findUpcoming();
  }

  async getEventsWithAvailableTickets(): Promise<EventsTicketResponse> {
    return this.eventRepository.getEventsWithAvailableTickets();
  }

  async searchByLocation(location: string): Promise<Event[]> {
    if (!location) {
      throw new Error("Location is required");
    }
    return this.eventRepository.findByLocation(location);
  }

  async searchEvents(query: {
    location?: string;
    keyword?: string;
    mood?: string;
  }): Promise<Event[]> {
    if (!query.location && !query.keyword && !query.mood) {
      throw new Error("Location, keyword, or mood is required");
    }

    return this.eventRepository.findByQuery(query);
  }

  /**
   * Create a new event with comprehensive validation
   * Requires organizer to be APPROVED status
   */
  async createEvent(data: CreateEventDto): Promise<Event> {
    // Validate required fields
    if (!data.title?.trim()) {
      throw new Error("Event title is required");
    }
    if (!data.description?.trim()) {
      throw new Error("Event description is required");
    }
    if (!data.date) {
      throw new Error("Event date is required");
    }
    if (!data.location?.trim()) {
      throw new Error("Event location is required");
    }

    // Validate date is in the future
    if (new Date(data.date) <= new Date()) {
      throw new Error("Event date must be in the future");
    }

    // Validate capacity
    if (!data.capacity || data.capacity <= 0) {
      throw new Error("Capacity must be a positive number");
    }
    if (data.capacity > 100000) {
      throw new Error("Capacity cannot exceed 100,000");
    }

    // Validate price
    if (data.price === undefined || data.price === null) {
      throw new Error("Price is required");
    }
    if (data.price < 0) {
      throw new Error("Price cannot be negative");
    }
    if (data.price > 1000000) {
      throw new Error("Price cannot exceed 1,000,000");
    }

    // Validate organizer exists and is approved
    if (!data.organizerId) {
      throw new Error("Organizer profile is required to create an event");
    }

    if (this.prisma) {
      const organizer = await this.prisma.organizerProfile.findUnique({
        where: { id: data.organizerId },
      });

      if (!organizer) {
        throw new Error("Organizer profile not found");
      }

      // Only APPROVED organizers can create events
      if (organizer.status !== "APPROVED") {
        throw new Error(
          `Organizer must be approved to create events. Current status: ${organizer.status}`,
        );
      }
    }

    // Validate title length
    if (data.title.length > 255) {
      throw new Error("Event title cannot exceed 255 characters");
    }

    // Validate description length
    if (data.description.length > 5000) {
      throw new Error("Event description cannot exceed 5,000 characters");
    }

    // Validate location length
    if (data.location.length > 255) {
      throw new Error("Event location cannot exceed 255 characters");
    }

    return this.eventRepository.create(data);
  }

  /**
   * Update an event with validation
   */
  async updateEvent(id: string, data: UpdateEventDto): Promise<Event | null> {
    if (!id) {
      throw new Error("Event ID is required");
    }

    const existing = await this.eventRepository.findById(id);
    if (!existing) {
      throw new Error("Event not found");
    }

    // Cannot update cancelled events
    if (existing.status === EventStatus.CANCELLED) {
      throw new Error("Cannot update a cancelled event");
    }

    // Validate date if provided
    if (data.date && new Date(data.date) <= new Date()) {
      throw new Error("Event date must be in the future");
    }

    // Validate capacity if provided
    if (data.capacity !== undefined) {
      if (data.capacity <= 0) {
        throw new Error("Capacity must be greater than 0");
      }
      if (data.capacity > 100000) {
        throw new Error("Capacity cannot exceed 100,000");
      }
    }

    // Validate price if provided
    if (data.price !== undefined) {
      if (data.price < 0) {
        throw new Error("Price cannot be negative");
      }
      if (data.price > 1000000) {
        throw new Error("Price cannot exceed 1,000,000");
      }
    }

    // Validate title length if provided
    if (data.title && data.title.length > 255) {
      throw new Error("Event title cannot exceed 255 characters");
    }

    // Validate description length if provided
    if (data.description && data.description.length > 5000) {
      throw new Error("Event description cannot exceed 5,000 characters");
    }

    // Validate location length if provided
    if (data.location && data.location.length > 255) {
      throw new Error("Event location cannot exceed 255 characters");
    }

    return this.eventRepository.update(id, data);
  }

  /**
   * Delete an event
   * Only pending or confirmed events can be deleted
   */
  async deleteEvent(id: string): Promise<boolean> {
    if (!id) {
      throw new Error("Event ID is required");
    }

    const existing = await this.eventRepository.findById(id);
    if (!existing) {
      throw new Error("Event not found");
    }

    // Check for active bookings
    if (this.prisma) {
      const bookingCount = await this.prisma.booking.count({
        where: {
          eventId: id,
          status: "CONFIRMED",
        },
      });

      if (bookingCount > 0) {
        throw new Error(
          "Cannot delete event with confirmed bookings. Cancel bookings first.",
        );
      }
    }

    return this.eventRepository.delete(id);
  }

  /**
   * Cancel an event
   */
  async cancelEvent(id: string): Promise<Event | null> {
    if (!id) {
      throw new Error("Event ID is required");
    }

    const existing = await this.eventRepository.findById(id);
    if (!existing) {
      throw new Error("Event not found");
    }

    if (existing.status === EventStatus.CANCELLED) {
      throw new Error("Event is already cancelled");
    }

    if (!this.prisma) {
      throw new Error("Prisma client not available");
    }

    const cancelled = await this.prisma.event.update({
      where: { id },
      data: { status: "CANCELLED" },
      include: { images: true },
    });

    return {
      ...cancelled,
      status: cancelled.status as EventStatus,
      images: cancelled.images ?? [],
    };
  }

  async approveEvent(id: string, adminId: string): Promise<Event> {
    if (!id) {
      throw new Error("Event ID is required");
    }
    if (!adminId) {
      throw new Error("Admin ID is required");
    }
    if (!this.prisma) {
      throw new Error("Prisma client not available");
    }

    const event = await this.prisma.event.findUnique({
      where: { id },
      include: { images: true },
    });

    if (!event) {
      throw new Error("Event not found");
    }

    if (event.status !== "PENDING") {
      throw new Error(`Cannot approve event with status ${event.status}`);
    }

    if (!event.organizerId) {
      throw new Error("Event must belong to an organizer");
    }

    const organizer = await this.prisma.organizerProfile.findUnique({
      where: { id: event.organizerId },
    });

    if (!organizer || organizer.status !== "APPROVED") {
      throw new Error("Only approved organizers can have approved events");
    }

    const approved = await this.prisma.event.update({
      where: { id },
      data: {
        status: "CONFIRMED",
        approvedBy: adminId,
        approvedAt: new Date(),
      },
      include: { images: true },
    });

    return {
      ...approved,
      status: approved.status as EventStatus,
      images: approved.images ?? [],
    };
  }

  /**
   * Get events by organizer
   */
  async getEventsByOrganizer(organizerId: string): Promise<Event[]> {
    if (!organizerId) {
      throw new Error("Organizer ID is required");
    }

    if (!this.prisma) {
      throw new Error("Prisma client not available");
    }

    const events = await this.prisma.event.findMany({
      where: { organizerId },
      include: { images: true },
      orderBy: { date: "asc" },
    });

    return events.map((event) => ({
      ...event,
      status: event.status as EventStatus,
      images: event.images ?? [],
    }));
  }
}
