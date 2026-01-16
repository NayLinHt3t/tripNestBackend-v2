import { Booking } from "./booking.entity";
export interface BookingRepository {
  findById(id: string): Promise<Booking | null>;
  save(booking: Booking): Promise<Booking>;
}
