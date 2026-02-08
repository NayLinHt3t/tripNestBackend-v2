import { Event, CreateEventDto, UpdateEventDto } from "./event.entity.js";
import { EventRepository } from "./event.repository.js";

export class EventService {
  constructor(private eventRepository: EventRepository) {}

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

  async createEvent(data: CreateEventDto): Promise<Event> {
    if (!data.title || !data.description || !data.date || !data.location) {
      throw new Error(
        "Missing required fields: title, description, date, location",
      );
    }

    if (data.capacity <= 0) {
      throw new Error("Capacity must be greater than 0");
    }

    if (data.price < 0) {
      throw new Error("Price cannot be negative");
    }

    return this.eventRepository.create(data);
  }

  async updateEvent(id: string, data: UpdateEventDto): Promise<Event | null> {
    if (!id) {
      throw new Error("Event ID is required");
    }

    const existing = await this.eventRepository.findById(id);
    if (!existing) {
      throw new Error("Event not found");
    }

    if (data.capacity !== undefined && data.capacity <= 0) {
      throw new Error("Capacity must be greater than 0");
    }

    if (data.price !== undefined && data.price < 0) {
      throw new Error("Price cannot be negative");
    }

    return this.eventRepository.update(id, data);
  }

  async deleteEvent(id: string): Promise<boolean> {
    if (!id) {
      throw new Error("Event ID is required");
    }

    const existing = await this.eventRepository.findById(id);
    if (!existing) {
      throw new Error("Event not found");
    }

    return this.eventRepository.delete(id);
  }
}
