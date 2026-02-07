import { Event, CreateEventDto, UpdateEventDto } from "./event.entity.js";

export interface EventRepository {
  findById(id: string): Promise<Event | null>;
  findAll(): Promise<Event[]>;
  findByLocation(location: string): Promise<Event[]>;
  findByQuery(query: { location?: string; keyword?: string }): Promise<Event[]>;
  findUpcoming(): Promise<Event[]>;
  create(data: CreateEventDto): Promise<Event>;
  update(id: string, data: UpdateEventDto): Promise<Event | null>;
  delete(id: string): Promise<boolean>;
}
