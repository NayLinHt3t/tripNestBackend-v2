import {
  Event,
  CreateEventDto,
  UpdateEventDto,
  EventWithAvailableTickets,
  EventsTicketResponse,
} from "./event.entity.js";

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedEvents {
  events: Event[];
  total: number;
}

export interface EventRepository {
  findById(id: string): Promise<Event | null>;
  findAll(pagination: PaginationOptions): Promise<PaginatedEvents>;
  findByLocation(location: string): Promise<Event[]>;
  findByQuery(
    query: { location?: string; keyword?: string; mood?: string },
    pagination: PaginationOptions,
  ): Promise<PaginatedEvents>;
  findByMoods(moods: string[], excludeEventIds?: string[]): Promise<Event[]>;
  findUpcoming(pagination: PaginationOptions): Promise<PaginatedEvents>;
  getEventsWithAvailableTickets(): Promise<EventsTicketResponse>;
  create(data: CreateEventDto): Promise<Event>;
  update(id: string, data: UpdateEventDto): Promise<Event | null>;
  delete(id: string): Promise<boolean>;
}
