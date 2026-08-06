import { PrismaClient } from "../database/prisma.js";
import { AdminAction, AdminStats, ModerationAction } from "./admin.entity.js";
import { ApprovalStatus } from "../organizer/organizer.entity.js";
import { OrganizerService } from "../organizer/organizer.service.js";
import { EventService } from "../event/event.service.js";
import { ValidationError, NotFoundError } from "../../shared/errors.js";

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
      adminId,
      action: AdminAction.APPROVE_ORGANIZER,
      reason: "Approved by admin",
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
      adminId,
      action: AdminAction.REJECT_ORGANIZER,
      reason,
      details: code ? { rejectionCode: code } : undefined,
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
      adminId,
      action: AdminAction.APPROVE_EVENT,
      reason: "Event approved by admin",
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
      throw new NotFoundError("Event not found");
    }

    if (event.status === "CANCELLED") {
      throw new ValidationError("Event is already cancelled");
    }

    const cancelled = await this.prisma.event.update({
      where: { id: eventId },
      data: { status: "CANCELLED" },
      include: { images: true },
    });

    await this.logModerationAction({
      entityType: "EVENT",
      entityId: eventId,
      adminId,
      action: AdminAction.ARCHIVE_EVENT,
      reason: reason || "Cancelled by admin",
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
      throw new NotFoundError("Event not found");
    }

    // Check for confirmed bookings
    const confirmedBookings = event.bookings.filter(
      (b) => b.status === "CONFIRMED",
    );

    if (confirmedBookings.length > 0) {
      throw new ValidationError(
        `Cannot delete event with ${confirmedBookings.length} confirmed bookings. Processing refunds would be required.`,
      );
    }

    const result = await this.prisma.event.delete({ where: { id: eventId } });

    await this.logModerationAction({
      entityType: "EVENT",
      entityId: eventId,
      adminId,
      action: AdminAction.DELETE_EVENT,
      reason: reason || "Deleted by admin",
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
      throw new NotFoundError("Review not found");
    }

    await this.logModerationAction({
      entityType: "REVIEW",
      entityId: reviewId,
      adminId,
      action: AdminAction.FLAG_REVIEW,
      reason,
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
   * Get organizer detail for approval decisions
   */
  async getOrganizerDetail(organizerId: string): Promise<any> {
    if (!organizerId) {
      throw new ValidationError("Organizer ID is required");
    }

    const organizer = await this.prisma.organizerProfile.findUnique({
      where: { id: organizerId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
            role: {
              include: {
                role: {
                  select: { name: true },
                },
              },
            },
          },
        },
        events: {
          select: {
            id: true,
            title: true,
            status: true,
            date: true,
            createdAt: true,
            _count: {
              select: {
                bookings: true,
                reviews: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!organizer) {
      throw new NotFoundError("Organizer not found");
    }

    const moderationLogs = await this.prisma.moderationLog.findMany({
      where: {
        entityType: "ORGANIZER",
        entityId: organizerId,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return {
      ...organizer,
      moderationLogs,
      eventCount: organizer.events.length,
      userRoles: organizer.user.role.map((item) => item.role.name),
    };
  }

  /**
   * Get event detail for approval decisions
   */
  async getEventDetail(eventId: string): Promise<any> {
    if (!eventId) {
      throw new ValidationError("Event ID is required");
    }

    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        images: true,
        organizer: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        bookings: {
          select: {
            id: true,
            status: true,
            ticketCounts: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
        reviews: {
          select: {
            id: true,
            rating: true,
            sentimentStatus: true,
            sentimentLabel: true,
            sentimentScore: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!event) {
      throw new NotFoundError("Event not found");
    }

    const moderationLogs = await this.prisma.moderationLog.findMany({
      where: {
        entityType: "EVENT",
        entityId: eventId,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const confirmedBookings = event.bookings.filter(
      (booking) => booking.status === "CONFIRMED",
    );
    const pendingBookings = event.bookings.filter(
      (booking) => booking.status === "PENDING",
    );
    const cancelledBookings = event.bookings.filter(
      (booking) => booking.status === "CANCELLED",
    );

    return {
      ...event,
      moderationLogs,
      metrics: {
        totalBookings: event.bookings.length,
        confirmedBookings: confirmedBookings.length,
        pendingBookings: pendingBookings.length,
        cancelledBookings: cancelledBookings.length,
        totalTicketsSold: confirmedBookings.reduce(
          (sum, booking) => sum + booking.ticketCounts,
          0,
        ),
        reviewCount: event.reviews.length,
      },
    };
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
   * Get moderation logs with filters, resolving entityId to a
   * human-readable organizer/event name for display
   */
  async getModerationLogs(
    entityType?: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<any[]> {
    const logs = await this.prisma.moderationLog.findMany({
      where: entityType ? { entityType } : undefined,
      take: limit,
      skip: offset,
      orderBy: { createdAt: "desc" },
    });

    const organizerIds = logs
      .filter((log) => log.entityType === "ORGANIZER")
      .map((log) => log.entityId);
    const eventIds = logs
      .filter((log) => log.entityType === "EVENT")
      .map((log) => log.entityId);

    const [organizers, events] = await Promise.all([
      organizerIds.length
        ? this.prisma.organizerProfile.findMany({
            where: { id: { in: organizerIds } },
            select: { id: true, organizationName: true },
          })
        : [],
      eventIds.length
        ? this.prisma.event.findMany({
            where: { id: { in: eventIds } },
            select: { id: true, title: true },
          })
        : [],
    ]);

    const organizerNameById = new Map(
      organizers.map((org) => [org.id, org.organizationName]),
    );
    const eventNameById = new Map(events.map((event) => [event.id, event.title]));

    return logs.map((log) => {
      const entityName =
        log.entityType === "ORGANIZER"
          ? (organizerNameById.get(log.entityId) ?? null)
          : log.entityType === "EVENT"
            ? (eventNameById.get(log.entityId) ?? null)
            : null;

      return { ...log, entityName };
    });
  }

  /**
   * Log a moderation action
   */
  private async logModerationAction(action: ModerationAction): Promise<any> {
    return this.prisma.moderationLog.create({
      data: {
        entityType: action.entityType,
        entityId: action.entityId,
        adminId: action.adminId,
        action: action.action,
        reason: action.reason,
      },
    });
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
