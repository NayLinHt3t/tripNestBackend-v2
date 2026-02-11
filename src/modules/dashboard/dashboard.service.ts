import { Status } from "../../../generated/prisma/enums.js";
import { DashboardRepository } from "./dashboard.repository.js";
import { DashboardSummary, EventRevenueSummary } from "./dashboard.entity.js";

export class DashboardService {
  constructor(private dashboardRepository: DashboardRepository) {}

  async getSummary(organizerId: string): Promise<DashboardSummary> {
    const [bookings, allEvents] = await Promise.all([
      this.dashboardRepository.getBookingsWithEvent(organizerId),
      this.dashboardRepository.getOrganizerEvents(organizerId),
    ]);

    const bookingStatus: Record<Status, number> = {
      PENDING: 0,
      CONFIRMED: 0,
      CANCELLED: 0,
    };

    const eventRevenueMap = new Map<string, EventRevenueSummary>();

    // Initialize all organizer events with zero stats
    for (const event of allEvents) {
      eventRevenueMap.set(event.id, {
        eventId: event.id,
        title: event.title,
        images: event.images,
        totalRevenue: 0,
        totalBookings: 0,
        totalTickets: 0,
      });
    }

    let totalRevenue = 0;
    let totalBookings = 0;
    let totalTickets = 0;

    for (const booking of bookings) {
      bookingStatus[booking.status] += 1;
      totalBookings += 1;
      totalTickets += booking.ticketCounts;

      if (!booking.event) {
        continue;
      }

      const unitPrice = booking.unitPrice ?? booking.event.price ?? 0;
      const computedTotalPrice =
        booking.totalPrice ?? unitPrice * booking.ticketCounts;

      const eventKey = booking.event.id;
      const existing = eventRevenueMap.get(eventKey) ?? {
        eventId: booking.event.id,
        title: booking.event.title,
        images: booking.event.images,
        totalRevenue: 0,
        totalBookings: 0,
        totalTickets: 0,
      };

      existing.totalBookings += 1;
      existing.totalTickets += booking.ticketCounts;

      if (booking.status === Status.CONFIRMED) {
        existing.totalRevenue += computedTotalPrice;
        totalRevenue += computedTotalPrice;
      }

      eventRevenueMap.set(eventKey, existing);
    }

    const events = Array.from(eventRevenueMap.values()).sort((a, b) =>
      b.totalRevenue === a.totalRevenue
        ? a.title.localeCompare(b.title)
        : b.totalRevenue - a.totalRevenue,
    );

    return {
      bookingStatus,
      events,
      totalRevenue,
      totalBookings,
      totalTickets,
    };
  }

  async getEventRevenue(organizerId: string): Promise<EventRevenueSummary[]> {
    const summary = await this.getSummary(organizerId);
    return summary.events;
  }

  async getRevenueTotals(organizerId: string): Promise<{
    totalRevenue: number;
    totalBookings: number;
    totalTickets: number;
  }> {
    const summary = await this.getSummary(organizerId);
    return {
      totalRevenue: summary.totalRevenue,
      totalBookings: summary.totalBookings,
      totalTickets: summary.totalTickets,
    };
  }
}
