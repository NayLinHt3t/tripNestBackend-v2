import { Booking } from "./booking.entity.js";
export interface BookingRepository {
  findById(id: string): Promise<Booking | null>;
  save(booking: Booking): Promise<Booking>;
}
