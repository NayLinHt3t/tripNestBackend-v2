import { Booking } from "./booking.entity.js";
export interface BookingRepository {
  findById(id: string): Promise<Booking | null>;
  findByUserId(userId: string): Promise<Booking[]>;
  save(booking: Booking): Promise<Booking>;
}
