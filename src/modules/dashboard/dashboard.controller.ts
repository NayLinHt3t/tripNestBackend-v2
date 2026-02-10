import { Router, Response } from "express";
import { DashboardService } from "./dashboard.service.js";
import { OrganizerService } from "../organizer/organizer.service.js";
import { AuthenticatedRequest } from "../auth/auth.middleware.js";
import { OrganizerProfile } from "../organizer/organizer.entity.js";

function profileToResponse(profile: OrganizerProfile | null) {
  if (!profile) return null;
  return {
    id: profile.id,
    userId: profile.userId,
    organizationName: profile.organizationName,
    contactNumber: profile.contactNumber,
    address: profile.address,
  };
}

export function createDashboardRouter(
  dashboardService: DashboardService,
  organizerService: OrganizerService,
): Router {
  const router = Router();

  const resolveOrganizer = async (req: AuthenticatedRequest) => {
    const userId = req.user?.userId;
    if (!userId) {
      throw new Error("Unauthorized");
    }
    const organizerProfile = await organizerService.getProfileByUserId(userId);
    if (!organizerProfile.id) {
      throw new Error("Organizer profile is required");
    }
    return {
      organizerProfile,
      organizerId: organizerProfile.id,
    };
  };

  router.get("/summary", async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { organizerProfile, organizerId } = await resolveOrganizer(req);
      const summary = await dashboardService.getSummary(organizerId);
      res.status(200).json({
        ...summary,
        organizer: profileToResponse(organizerProfile),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal error";
      const status = message === "Unauthorized" ? 401 : 400;
      res.status(status).json({ error: message });
    }
  });

  router.get("/events", async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { organizerProfile, organizerId } = await resolveOrganizer(req);
      const events = await dashboardService.getEventRevenue(organizerId);
      res.status(200).json({
        events,
        organizer: profileToResponse(organizerProfile),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal error";
      const status = message === "Unauthorized" ? 401 : 400;
      res.status(status).json({ error: message });
    }
  });

  router.get("/revenue", async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { organizerProfile, organizerId } = await resolveOrganizer(req);
      const totals = await dashboardService.getRevenueTotals(organizerId);
      res.status(200).json({
        ...totals,
        organizer: profileToResponse(organizerProfile),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal error";
      const status = message === "Unauthorized" ? 401 : 400;
      res.status(status).json({ error: message });
    }
  });

  return router;
}
