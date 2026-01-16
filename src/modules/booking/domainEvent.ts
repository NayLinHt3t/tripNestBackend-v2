export enum BookingEventType {
  BOOKING_CREATED = "BOOKING_CREATED",
  BOOKING_CONFIRMED = "BOOKING_CONFIRMED",
  BOOKING_CANCELLED = "BOOKING_CANCELLED",
  BOOKING_UPDATED = "BOOKING_UPDATED",
}

export interface BookingEvent {
  type: BookingEventType;
  bookingId: string;
  userId: string;
  eventId: string;
  ticketCounts: number;
  status: string;
  timestamp: Date;
  payload?: Record<string, unknown>;
}
