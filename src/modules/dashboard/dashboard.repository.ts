import { Status } from "../../../generated/prisma/enums.js";

export interface BookingWithEvent {
  id: string;
  status: Status;
  ticketCounts: number;
  unitPrice: number | null;
  totalPrice: number | null;
  event: {
    id: string;
    title: string;
    price: number;
  } | null;
}

export interface DashboardRepository {
  getBookingsWithEvent(organizerId: string): Promise<BookingWithEvent[]>;
  getOrganizerEvents(organizerId: string): Promise<
    Array<{
      id: string;
      title: string;
      price: number;
    }>
  >;
}
