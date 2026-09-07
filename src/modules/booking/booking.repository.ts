import { Booking } from "./booking.entity.js";

export interface EventInfo {
  id: string;
  price: number;
  status: string;
  capacity: number;
  bookingType: string;
}

export interface BookingWithDetails {
  id: string;
  status: string;
  ticketCounts: number;
  unitPrice: number | null;
  totalPrice: number | null;
  createdAt: Date;
  event: { id: string; title: string } | null;
  user: { id: string; name: string; email: string } | null;
}

export interface BookingRepository {
  findById(id: string): Promise<Booking | null>;
  findByUserId(userId: string): Promise<Booking[]>;
  findByOrganizerUserId(userId: string, status?: string): Promise<BookingWithDetails[]>;
  findEventById(eventId: string): Promise<EventInfo | null>;
  countConfirmedTickets(eventId: string): Promise<number>;
  save(booking: Booking): Promise<Booking>;
}
