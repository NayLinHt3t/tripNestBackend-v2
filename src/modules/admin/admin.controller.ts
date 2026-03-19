import { Router, Response } from "express";
import { AdminService } from "./admin.service.js";
import { ApprovalStatus } from "../organizer/organizer.entity.js";
import { AuthenticatedRequest, hasRole } from "../auth/auth.middleware.js";

// Helper to check admin access
async function requireAdmin(req: AuthenticatedRequest): Promise<boolean> {
  return hasRole(req, ["ADMIN"]);
}

export function createAdminRouter(adminService: AdminService): Router {
  const router = Router();

  // Middleware to check admin access for all routes
  router.use(async (req: AuthenticatedRequest, res: Response, next) => {
    if (!(await requireAdmin(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    next();
  });

  // ========== DASHBOARD ==========

  // Get admin dashboard stats
  router.get(
    "/dashboard/stats",
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const stats = await adminService.getAdminStats();
        res.status(200).json(stats);
      } catch (error) {
        res.status(400).json({
          error: error instanceof Error ? error.message : "Internal error",
        });
      }
    },
  );

  // Get organizer statistics
  router.get(
    "/stats/organizers",
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const stats = await adminService.getOrganizerStats();
        res.status(200).json(stats);
      } catch (error) {
        res.status(400).json({
          error: error instanceof Error ? error.message : "Internal error",
        });
      }
    },
  );

  // Get event statistics
  router.get(
    "/stats/events",
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const stats = await adminService.getEventStats();
        res.status(200).json(stats);
      } catch (error) {
        res.status(400).json({
          error: error instanceof Error ? error.message : "Internal error",
        });
      }
    },
  );

  // Get booking statistics
  router.get(
    "/stats/bookings",
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const stats = await adminService.getBookingStats();
        res.status(200).json(stats);
      } catch (error) {
        res.status(400).json({
          error: error instanceof Error ? error.message : "Internal error",
        });
      }
    },
  );

  // ========== ORGANIZER MANAGEMENT ==========

  // Get all organizer applications
  router.get(
    "/organizers/all",
    async (req: AuthenticatedRequest, res: Response) => {
      try {
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
      } catch (error) {
        res.status(400).json({
          error: error instanceof Error ? error.message : "Internal error",
        });
      }
    },
  );

  // Get top organizers
  router.get(
    "/organizers/top",
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { limit = "10" } = req.query;
        const topOrganizers = await adminService.getTopOrganizers(
          Number(limit),
        );
        res.status(200).json(topOrganizers);
      } catch (error) {
        res.status(400).json({
          error: error instanceof Error ? error.message : "Internal error",
        });
      }
    },
  );

  // Approve organizer
  router.post(
    "/organizers/:id/approve",
    async (req: AuthenticatedRequest, res: Response) => {
      try {
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
      } catch (error) {
        if (error instanceof Error && error.message.includes("not found")) {
          return res.status(404).json({ error: error.message });
        }
        res.status(400).json({
          error: error instanceof Error ? error.message : "Internal error",
        });
      }
    },
  );

  // Reject organizer
  router.post(
    "/organizers/:id/reject",
    async (req: AuthenticatedRequest, res: Response) => {
      try {
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
      } catch (error) {
        if (error instanceof Error && error.message.includes("not found")) {
          return res.status(404).json({ error: error.message });
        }
        res.status(400).json({
          error: error instanceof Error ? error.message : "Internal error",
        });
      }
    },
  );

  // ========== EVENT MANAGEMENT ==========

  // Get top events
  router.get(
    "/events/top",
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { limit = "10" } = req.query;
        const topEvents = await adminService.getTopEvents(Number(limit));
        res.status(200).json(topEvents);
      } catch (error) {
        res.status(400).json({
          error: error instanceof Error ? error.message : "Internal error",
        });
      }
    },
  );

  // Cancel event
  router.post(
    "/events/:id/approve",
    async (req: AuthenticatedRequest, res: Response) => {
      try {
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
      } catch (error) {
        if (error instanceof Error && error.message.includes("not found")) {
          return res.status(404).json({ error: error.message });
        }
        res.status(400).json({
          error: error instanceof Error ? error.message : "Internal error",
        });
      }
    },
  );

  // Cancel event
  router.post(
    "/events/:id/cancel",
    async (req: AuthenticatedRequest, res: Response) => {
      try {
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
      } catch (error) {
        if (error instanceof Error && error.message.includes("not found")) {
          return res.status(404).json({ error: error.message });
        }
        res.status(400).json({
          error: error instanceof Error ? error.message : "Internal error",
        });
      }
    },
  );

  // Delete event as admin
  router.delete(
    "/events/:id",
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { id } = req.params as { id: string };
        const { reason } = req.body;
        const adminId = req.user?.userId;

        if (!adminId) {
          return res.status(401).json({ error: "Admin ID not found" });
        }

        const deleted = await adminService.deleteEventAsAdmin(
          id,
          adminId,
          reason,
        );

        res.status(200).json({
          message: "Event deleted successfully",
          deleted,
        });
      } catch (error) {
        if (error instanceof Error && error.message.includes("not found")) {
          return res.status(404).json({ error: error.message });
        }
        res.status(400).json({
          error: error instanceof Error ? error.message : "Internal error",
        });
      }
    },
  );

  // ========== REVIEW MANAGEMENT ==========

  // Get suspicious reviews
  router.get(
    "/reviews/suspicious",
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { limit = "20" } = req.query;
        const reviews = await adminService.getSuspiciousReviews(Number(limit));
        res.status(200).json(reviews);
      } catch (error) {
        res.status(400).json({
          error: error instanceof Error ? error.message : "Internal error",
        });
      }
    },
  );

  // Flag review for moderation
  router.post(
    "/reviews/:id/flag",
    async (req: AuthenticatedRequest, res: Response) => {
      try {
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
      } catch (error) {
        if (error instanceof Error && error.message.includes("not found")) {
          return res.status(404).json({ error: error.message });
        }
        res.status(400).json({
          error: error instanceof Error ? error.message : "Internal error",
        });
      }
    },
  );

  // ========== MODERATION LOGS ==========

  // Get moderation logs
  router.get(
    "/logs/moderation",
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { entityType, limit = "50", offset = "0" } = req.query;
        const logs = await adminService.getModerationLogs(
          typeof entityType === "string" ? entityType : undefined,
          Number(limit),
          Number(offset),
        );
        res.status(200).json(logs);
      } catch (error) {
        res.status(400).json({
          error: error instanceof Error ? error.message : "Internal error",
        });
      }
    },
  );

  return router;
}
