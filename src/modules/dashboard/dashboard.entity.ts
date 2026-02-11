import { Status } from "../../../generated/prisma/enums.js";

export interface BookingStatusSummary {
  status: Status;
  count: number;
}

export interface EventRevenueSummary {
  eventId: string;
  title: string;
  images: Array<{ id: string; imageUrl: string }>;
  totalRevenue: number;
  totalBookings: number;
  totalTickets: number;
}

export interface DashboardSummary {
  bookingStatus: Record<Status, number>;
  events: EventRevenueSummary[];
  totalRevenue: number;
  totalBookings: number;
  totalTickets: number;
}
