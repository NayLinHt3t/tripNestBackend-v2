import { Booking } from "./booking.entity.js";

export interface EventInfo {
  id: string;
  price: number;
  status: string;
  capacity: number;
}

export interface BookingRepository {
  findById(id: string): Promise<Booking | null>;
  findByUserId(userId: string): Promise<Booking[]>;
  findEventById(eventId: string): Promise<EventInfo | null>;
  countConfirmedTickets(eventId: string): Promise<number>;
  save(booking: Booking): Promise<Booking>;
}
