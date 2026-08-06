import { Router, Request, Response } from "express";
import { DashboardService } from "./dashboard.service.js";
import { OrganizerService } from "../organizer/organizer.service.js";
import { OrganizerProfile } from "../organizer/organizer.entity.js";
import { asyncHandler, getUserId } from "../../shared/http.js";
import { ValidationError } from "../../shared/errors.js";

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

  const resolveOrganizer = async (req: Request) => {
    const userId = getUserId(req);
    const organizerProfile = await organizerService.getProfileByUserId(userId);
    if (!organizerProfile || !organizerProfile.id) {
      throw new ValidationError("Organizer profile is required");
    }
    return {
      organizerProfile,
      organizerId: organizerProfile.id,
    };
  };

  router.get(
    "/summary",
    asyncHandler(async (req: Request, res: Response) => {
      const { organizerProfile, organizerId } = await resolveOrganizer(req);
      const summary = await dashboardService.getSummary(organizerId);
      res.status(200).json({
        ...summary,
        organizer: profileToResponse(organizerProfile),
      });
    }),
  );

  router.get(
    "/events",
    asyncHandler(async (req: Request, res: Response) => {
      const { organizerProfile, organizerId } = await resolveOrganizer(req);
      const events = await dashboardService.getEventRevenue(organizerId);
      res.status(200).json({
        events,
        organizer: profileToResponse(organizerProfile),
      });
    }),
  );

  router.get(
    "/revenue",
    asyncHandler(async (req: Request, res: Response) => {
      const { organizerProfile, organizerId } = await resolveOrganizer(req);
      const totals = await dashboardService.getRevenueTotals(organizerId);
      res.status(200).json({
        ...totals,
        organizer: profileToResponse(organizerProfile),
      });
    }),
  );

  return router;
}
