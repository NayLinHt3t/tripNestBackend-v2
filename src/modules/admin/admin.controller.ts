import { Router, Response } from "express";
import { AdminService } from "./admin.service.js";
import { ApprovalStatus } from "../organizer/organizer.entity.js";
import { AuthenticatedRequest, hasRole } from "../auth/auth.middleware.js";
import { asyncHandler } from "../../shared/http.js";

export function createAdminRouter(adminService: AdminService): Router {
  const router = Router();

  // Middleware to check admin access for all routes
  router.use((req: AuthenticatedRequest, res: Response, next) => {
    if (!hasRole(req, ["ADMIN"])) {
      return res.status(403).json({ error: "Admin access required" });
    }
    next();
  });

  // ========== DASHBOARD ==========

  // Get admin dashboard stats
  router.get(
    "/dashboard/stats",
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const stats = await adminService.getAdminStats();
      res.status(200).json(stats);
    }),
  );

  // Get organizer statistics
  router.get(
    "/stats/organizers",
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const stats = await adminService.getOrganizerStats();
      res.status(200).json(stats);
    }),
  );

  // Get event statistics
  router.get(
    "/stats/events",
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const stats = await adminService.getEventStats();
      res.status(200).json(stats);
    }),
  );

  // Get booking statistics
  router.get(
    "/stats/bookings",
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const stats = await adminService.getBookingStats();
      res.status(200).json(stats);
    }),
  );

  // ========== ORGANIZER MANAGEMENT ==========

  // Get all organizer applications
  router.get(
    "/organizers/all",
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const { status } = req.query;
      let statusFilter: ApprovalStatus | undefined;

      if (typeof status === "string") {
        // Validate that status is a valid ApprovalStatus enum value
        if (
          status === ApprovalStatus.PENDING ||
          status === ApprovalStatus.APPROVED ||
          status === ApprovalStatus.REJECTED
        ) {
          statusFilter = status as ApprovalStatus;
        } else {
          return res.status(400).json({
            error: `Invalid status. Must be one of: ${Object.values(ApprovalStatus).join(", ")}`,
          });
        }
      }

      const applications =
        await adminService.getOrganizerApplications(statusFilter);
      res.status(200).json(applications);
    }),
  );

  // Get top organizers
  router.get(
    "/organizers/top",
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const { limit = "10" } = req.query;
      const topOrganizers = await adminService.getTopOrganizers(Number(limit));
      res.status(200).json(topOrganizers);
    }),
  );

  // Get organizer detail
  router.get(
    "/organizers/:id/detail",
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const { id } = req.params as { id: string };
      const detail = await adminService.getOrganizerDetail(id);
      res.status(200).json(detail);
    }),
  );

  // Approve organizer
  router.post(
    "/organizers/:id/approve",
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const { id } = req.params as { id: string };
      const adminId = req.user?.userId;

      if (!adminId) {
        return res.status(401).json({ error: "Admin ID not found" });
      }

      const profile = await adminService.approveOrganizer(id, adminId);

      res.status(200).json({
        message: "Organizer approved successfully",
        profile,
      });
    }),
  );

  // Reject organizer
  router.post(
    "/organizers/:id/reject",
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const { id } = req.params as { id: string };
      const { reason, code } = req.body;
      const adminId = req.user?.userId;

      if (!adminId) {
        return res.status(401).json({ error: "Admin ID not found" });
      }

      if (!reason) {
        return res.status(400).json({ error: "Rejection reason required" });
      }

      const profile = await adminService.rejectOrganizer(
        id,
        adminId,
        reason,
        code,
      );

      res.status(200).json({
        message: "Organizer rejected successfully",
        profile,
      });
    }),
  );

  // ========== EVENT MANAGEMENT ==========

  // Get top events
  router.get(
    "/events/top",
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const { limit = "10" } = req.query;
      const topEvents = await adminService.getTopEvents(Number(limit));
      res.status(200).json(topEvents);
    }),
  );

  // Get event detail
  router.get(
    "/events/:id/detail",
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const { id } = req.params as { id: string };
      const detail = await adminService.getEventDetail(id);
      res.status(200).json(detail);
    }),
  );

  // Approve event
  router.post(
    "/events/:id/approve",
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const { id } = req.params as { id: string };
      const adminId = req.user?.userId;

      if (!adminId) {
        return res.status(401).json({ error: "Admin ID not found" });
      }

      const event = await adminService.approveEvent(id, adminId);

      res.status(200).json({
        message: "Event approved successfully",
        event,
      });
    }),
  );

  // Cancel event
  router.post(
    "/events/:id/cancel",
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const { id } = req.params as { id: string };
      const { reason } = req.body;
      const adminId = req.user?.userId;

      if (!adminId) {
        return res.status(401).json({ error: "Admin ID not found" });
      }

      const event = await adminService.cancelEvent(id, adminId, reason);

      res.status(200).json({
        message: "Event cancelled successfully",
        event,
      });
    }),
  );

  // Delete event as admin
  router.delete(
    "/events/:id",
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const { id } = req.params as { id: string };
      const { reason } = req.body;
      const adminId = req.user?.userId;

      if (!adminId) {
        return res.status(401).json({ error: "Admin ID not found" });
      }

      const deleted = await adminService.deleteEventAsAdmin(id, adminId, reason);

      res.status(200).json({
        message: "Event deleted successfully",
        deleted,
      });
    }),
  );

  // ========== REVIEW MANAGEMENT ==========

  // Get suspicious reviews
  router.get(
    "/reviews/suspicious",
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const { limit = "20" } = req.query;
      const reviews = await adminService.getSuspiciousReviews(Number(limit));
      res.status(200).json(reviews);
    }),
  );

  // Flag review for moderation
  router.post(
    "/reviews/:id/flag",
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const { id } = req.params as { id: string };
      const { reason } = req.body;
      const adminId = req.user?.userId;

      if (!adminId) {
        return res.status(401).json({ error: "Admin ID not found" });
      }

      if (!reason) {
        return res.status(400).json({ error: "Flag reason required" });
      }

      const review = await adminService.flagReview(id, adminId, reason);

      res.status(200).json({
        message: "Review flagged for moderation",
        review,
      });
    }),
  );

  // ========== MODERATION LOGS ==========

  // Get moderation logs
  router.get(
    "/logs/moderation",
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const { entityType, limit = "50", offset = "0" } = req.query;
      const logs = await adminService.getModerationLogs(
        typeof entityType === "string" ? entityType : undefined,
        Number(limit),
        Number(offset),
      );
      res.status(200).json(logs);
    }),
  );

  // ========== USER MANAGEMENT ==========

  // Get all users
  router.get(
    "/users",
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const { limit = "50", offset = "0" } = req.query;
      const users = await adminService.getAllUsers(
        Number(limit),
        Number(offset),
      );
      res.status(200).json(users);
    }),
  );

  // Get user detail
  router.get(
    "/users/:id/detail",
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const { id } = req.params as { id: string };
      const detail = await adminService.getUserDetail(id);
      res.status(200).json(detail);
    }),
  );

  // Ban a user
  router.post(
    "/users/:id/ban",
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const { id } = req.params as { id: string };
      const { reason } = req.body;
      const adminId = req.user?.userId;

      if (!adminId) {
        return res.status(401).json({ error: "Admin ID not found" });
      }

      if (!reason) {
        return res.status(400).json({ error: "Ban reason required" });
      }

      const user = await adminService.banUser(id, adminId, reason);

      res.status(200).json({
        message: "User banned successfully",
        user,
      });
    }),
  );

  // Unban a user
  router.post(
    "/users/:id/unban",
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const { id } = req.params as { id: string };
      const adminId = req.user?.userId;

      if (!adminId) {
        return res.status(401).json({ error: "Admin ID not found" });
      }

      const user = await adminService.unbanUser(id, adminId);

      res.status(200).json({
        message: "User unbanned successfully",
        user,
      });
    }),
  );

  return router;
}
