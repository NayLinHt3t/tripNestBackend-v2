export { Mood, MOOD_VALUES, isValidMood } from "./mood.categorizer.js";

export enum EventStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  CANCELLED = "CANCELLED",
}

export type BookingType = "INSTANT" | "MANUAL";

export interface EventImages {
  id: string;
  eventId: string;
  imageUrl: string;
  createdAt: Date;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: Date;
  images: EventImages[];
  location: string;
  capacity: number;
  price: number;
  mood?: string | null;
  organizerId?: string | null;
  status?: EventStatus;
  bookingType?: BookingType;
  isArchived?: boolean;
  createdAt: Date;
}

export interface CreateEventDto {
  title: string;
  description: string;
  date: Date;
  location: string;
  capacity: number;
  price: number;
  mood?: string | null;
  imageUrls?: string[];
  organizerId: string;
  bookingType?: BookingType;
}

export interface UpdateEventDto {
  title?: string;
  description?: string;
  date?: Date;
  location?: string;
  capacity?: number;
  price?: number;
  mood?: string | null;
}

export interface EventWithAvailableTickets extends Event {
  bookedTickets: number;
  availableTickets: number;
}

export interface EventsTicketResponse {
  eventsSortedByAvailability: EventWithAvailableTickets[];
  fullyBookedEvents: Event[];
}
