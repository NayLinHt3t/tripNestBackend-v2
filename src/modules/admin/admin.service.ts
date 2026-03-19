import { PrismaClient } from "../database/prisma.js";
import { AdminAction, AdminStats, ModerationAction } from "./admin.entity.js";
import { ApprovalStatus } from "../organizer/organizer.entity.js";
import { OrganizerService } from "../organizer/organizer.service.js";
import { EventService } from "../event/event.service.js";

export class AdminService {
  constructor(
    private prisma: PrismaClient,
    private organizerService: OrganizerService,
    private eventService: EventService,
  ) {}

  /**
   * Get dashboard statistics
   */
  async getAdminStats(): Promise<AdminStats> {
    const [
      totalOrganizers,
      pendingOrganizers,
      approvedOrganizers,
      rejectedOrganizers,
      totalEvents,
      totalUsers,
      totalReviews,
      moderationLogsCount,
    ] = await Promise.all([
      this.prisma.organizerProfile.count(),
      this.prisma.organizerProfile.count({ where: { status: "PENDING" } }),
      this.prisma.organizerProfile.count({ where: { status: "APPROVED" } }),
      this.prisma.organizerProfile.count({ where: { status: "REJECTED" } }),
      this.prisma.event.count(),
      this.prisma.user.count(),
      this.prisma.review.count(),
      this.prisma.moderationLog.count(),
    ]);

    return {
      totalOrganizers,
      pendingOrganizers,
      approvedOrganizers,
      rejectedOrganizers,
      totalEvents,
      totalUsers,
      totalReviews,
      moderationLogsCount,
    };
  }

  /**
   * Approve organizer and log action
   */
  async approveOrganizer(organizerId: string, adminId: string): Promise<any> {
    const approved = await this.organizerService.approveProfile(
      organizerId,
      adminId,
    );

    // Log moderation action
    await this.logModerationAction({
      entityType: "ORGANIZER",
      entityId: organizerId,
      action: AdminAction.APPROVE_ORGANIZER,
      reason: "Approved by admin",
      details: { approverAdminId: adminId },
    });

    return approved;
  }

  /**
   * Reject organizer and log action
   */
  async rejectOrganizer(
    organizerId: string,
    adminId: string,
    reason: string,
    code?: string,
  ): Promise<any> {
    const rejected = await this.organizerService.rejectProfile(
      organizerId,
      reason,
      adminId,
      code,
    );

    // Log moderation action
    await this.logModerationAction({
      entityType: "ORGANIZER",
      entityId: organizerId,
      action: AdminAction.REJECT_ORGANIZER,
      reason,
      details: { rejectionCode: code, adminId },
    });

    return rejected;
  }

  /**
   * Approve an event (admin action)
   */
  async approveEvent(eventId: string, adminId: string): Promise<any> {
    const approved = await this.eventService.approveEvent(eventId, adminId);

    await this.logModerationAction({
      entityType: "EVENT",
      entityId: eventId,
      action: AdminAction.APPROVE_EVENT,
      reason: "Event approved by admin",
      details: { approverAdminId: adminId },
    });

    return approved;
  }

  /**
   * Cancel an event (admin action)
   */
  async cancelEvent(
    eventId: string,
    adminId: string,
    reason?: string,
  ): Promise<any> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: { images: true },
    });

    if (!event) {
      throw new Error("Event not found");
    }

    if (event.status === "CANCELLED") {
      throw new Error("Event is already cancelled");
    }

    const cancelled = await this.prisma.event.update({
      where: { id: eventId },
      data: { status: "CANCELLED" },
      include: { images: true },
    });

    await this.logModerationAction({
      entityType: "EVENT",
      entityId: eventId,
      action: AdminAction.ARCHIVE_EVENT,
      reason: reason || "Cancelled by admin",
      details: { adminId },
    });

    return {
      ...cancelled,
      images: cancelled.images ?? [],
    };
  }

  /**
   * Delete an event (admin override)
   */
  async deleteEventAsAdmin(
    eventId: string,
    adminId: string,
    reason?: string,
  ): Promise<boolean> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: { bookings: true },
    });

    if (!event) {
      throw new Error("Event not found");
    }

    // Check for confirmed bookings
    const confirmedBookings = event.bookings.filter(
      (b) => b.status === "CONFIRMED",
    );

    if (confirmedBookings.length > 0) {
      throw new Error(
        `Cannot delete event with ${confirmedBookings.length} confirmed bookings. Processing refunds would be required.`,
      );
    }

    const result = await this.prisma.event.delete({ where: { id: eventId } });

    await this.logModerationAction({
      entityType: "EVENT",
      entityId: eventId,
      action: AdminAction.DELETE_EVENT,
      reason: reason || "Deleted by admin",
      details: { adminId },
    });

    return !!result;
  }

  /**
   * Flag a review for moderation
   */
  async flagReview(
    reviewId: string,
    adminId: string,
    reason: string,
  ): Promise<any> {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new Error("Review not found");
    }

    await this.logModerationAction({
      entityType: "REVIEW",
      entityId: reviewId,
      action: AdminAction.FLAG_REVIEW,
      reason,
      details: { adminId },
    });

    return review;
  }

  /**
   * Get suspicious reviews (low ratings or flagged)
   */
  async getSuspiciousReviews(limit: number = 20): Promise<any[]> {
    return this.prisma.review.findMany({
      where: {
        OR: [
          { rating: { lte: 1 } }, // Very low ratings
          {
            sentimentStatus: "FAILED",
          },
        ],
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        event: {
          select: { id: true, title: true },
        },
      },
      take: limit,
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Get all organizer applications with details
   */
  async getOrganizerApplications(status?: ApprovalStatus): Promise<any[]> {
    const applications = await this.prisma.organizerProfile.findMany({
      where: status ? { status: status as any } : undefined,
      include: {
        user: {
          select: { id: true, name: true, email: true, createdAt: true },
        },
        events: {
          select: { id: true, title: true, createdAt: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return applications.map((app) => ({
      ...app,
      eventCount: app.events.length,
    }));
  }

  /**
   * Get platform overview data
   */
  async getOrganizerStats(): Promise<any> {
    const [approved, pending, rejected, active] = await Promise.all([
      this.prisma.organizerProfile.count({ where: { status: "APPROVED" } }),
      this.prisma.organizerProfile.count({ where: { status: "PENDING" } }),
      this.prisma.organizerProfile.count({ where: { status: "REJECTED" } }),
      this.prisma.event.count({
        where: {
          date: { gte: new Date() },
          status: { not: "CANCELLED" },
        },
      }),
    ]);

    return {
      approvedOrganizers: approved,
      pendingOrganizers: pending,
      rejectedOrganizers: rejected,
      activeEvents: active,
    };
  }

  /**
   * Get event statistics
   */
  async getEventStats(): Promise<any> {
    const [total, active, cancelled] = await Promise.all([
      this.prisma.event.count(),
      this.prisma.event.count({
        where: {
          date: { gte: new Date() },
          status: "CONFIRMED",
        },
      }),
      this.prisma.event.count({ where: { status: "CANCELLED" } }),
    ]);

    return {
      totalEvents: total,
      activeEvents: active,
      cancelledEvents: cancelled,
    };
  }

  /**
   * Get booking statistics
   */
  async getBookingStats(): Promise<any> {
    const [total, confirmed, pending, cancelled] = await Promise.all([
      this.prisma.booking.count(),
      this.prisma.booking.count({ where: { status: "CONFIRMED" } }),
      this.prisma.booking.count({ where: { status: "PENDING" } }),
      this.prisma.booking.count({ where: { status: "CANCELLED" } }),
    ]);

    return {
      totalBookings: total,
      confirmedBookings: confirmed,
      pendingBookings: pending,
      cancelledBookings: cancelled,
    };
  }

  /**
   * Get moderation logs with filters
   */
  async getModerationLogs(
    entityType?: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<any[]> {
    return this.prisma.moderationLog.findMany({
      where: entityType ? { entityType } : undefined,
      take: limit,
      skip: offset,
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Log a moderation action
   */
  private async logModerationAction(action: ModerationAction): Promise<any> {
    // Implement logging to moderationLog table if available
    // This is a placeholder for future expansion
    console.log("Moderation action logged:", action);
  }

  /**
   * Get top organizers by event count
   */
  async getTopOrganizers(limit: number = 10): Promise<any[]> {
    const organizers = await this.prisma.organizerProfile.findMany({
      include: {
        _count: {
          select: { events: true },
        },
        user: {
          select: { name: true, email: true },
        },
      },
      take: limit,
    });

    return organizers
      .map((org) => ({
        ...org,
        eventCount: org._count.events,
      }))
      .sort((a, b) => b.eventCount - a.eventCount);
  }

  /**
   * Get top events by bookings
   */
  async getTopEvents(limit: number = 10): Promise<any[]> {
    const events = await this.prisma.event.findMany({
      include: {
        _count: {
          select: { bookings: true },
        },
        organizer: {
          select: {
            organizationName: true,
            user: { select: { name: true } },
          },
        },
      },
      take: limit,
      orderBy: { bookings: { _count: "desc" } },
    });

    return events.map((event) => ({
      ...event,
      bookingCount: event._count.bookings,
    }));
  }
}
