import { PrismaClient } from "../database/prisma.js";
import {
  DashboardRepository,
  BookingWithEvent,
} from "./dashboard.repository.js";

export class PrismaDashboardRepository implements DashboardRepository {
  constructor(private prisma: PrismaClient) {}

  async getBookingsWithEvent(organizerId: string): Promise<BookingWithEvent[]> {
    return this.prisma.booking.findMany({
      where: {
        event: {
          organizerId,
        },
      },
      select: {
        id: true,
        status: true,
        ticketCounts: true,
        unitPrice: true,
        totalPrice: true,
        event: {
          select: {
            id: true,
            title: true,
            price: true,
          },
        },
      },
    });
  }
}
