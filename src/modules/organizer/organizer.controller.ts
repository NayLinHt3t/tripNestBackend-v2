import { Router, Request, Response } from "express";
import { OrganizerService } from "./organizer.service.js";
import { AuthenticatedRequest, hasRole } from "../auth/auth.middleware.js";
import { OrganizerProfile, ApprovalStatus } from "./organizer.entity.js";
import { asyncHandler, getUserId } from "../../shared/http.js";

// Helper function to convert OrganizerProfile entity to response DTO
function profileToResponse(profile: OrganizerProfile | null) {
  if (!profile) return null;
  return {
    id: profile.id,
    userId: profile.userId,
    organizationName: profile.organizationName,
    contactNumber: profile.contactNumber,
    address: profile.address,
    status: profile.status,
    rejectionReason: profile.rejectionReason,
    rejectionCode: profile.rejectionCode,
    createdAt: profile.createdAt,
  };
}

// Helper to check if user is admin
function isAdmin(req: Request): boolean {
  return hasRole(req as AuthenticatedRequest, ["ADMIN"]);
}

export function createOrganizerRouter(
  organizerService: OrganizerService,
): Router {
  const router = Router();

  // Get current user's organizer profile
  router.get(
    "/me",
    asyncHandler(async (req: Request, res: Response) => {
      const userId = getUserId(req);
      const profile = await organizerService.getProfileByUserId(userId);
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }
      res.status(200).json(profileToResponse(profile));
    }),
  );

  // Get organizer profile by ID
  router.get(
    "/:id",
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params as { id: string };
      const profile = await organizerService.getProfileById(id);
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }
      res.status(200).json(profileToResponse(profile));
    }),
  );

  // Create organizer profile - requires all fields
  router.post(
    "/",
    asyncHandler(async (req: Request, res: Response) => {
      const userId = getUserId(req);
      const { organizationName, contactNumber, address } = req.body;

      const profile = await organizerService.createProfile(
        userId,
        organizationName,
        contactNumber,
        address,
      );
      res.status(201).json(profileToResponse(profile));
    }),
  );

  // Update current user's organizer profile
  router.patch(
    "/me",
    asyncHandler(async (req: Request, res: Response) => {
      const userId = getUserId(req);
      const { organizationName, contactNumber, address } = req.body;

      const existingProfile = await organizerService.getProfileByUserId(userId);
      if (!existingProfile) {
        return res.status(404).json({ error: "Profile not found" });
      }

      const profile = await organizerService.updateProfile(
        existingProfile.id!,
        organizationName,
        contactNumber,
        address,
      );
      res.status(200).json(profileToResponse(profile));
    }),
  );

  // Update organizer profile by ID (admin function)
  router.patch(
    "/:id",
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params as { id: string };
      const { organizationName, contactNumber, address } = req.body;

      const profile = await organizerService.updateProfile(
        id,
        organizationName,
        contactNumber,
        address,
      );
      res.status(200).json(profileToResponse(profile));
    }),
  );

  // Delete organizer profile
  router.delete(
    "/:id",
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params as { id: string };
      const deleted = await organizerService.deleteProfile(id);
      if (!deleted) {
        return res.status(404).json({ error: "Profile not found" });
      }
      res.status(200).json({ message: "Profile deleted successfully" });
    }),
  );

  // ========== ADMIN FUNCTIONS ==========

  // Get all organizer profiles with optional status filter (admin only)
  router.get(
    "/admin/all",
    asyncHandler(async (req: Request, res: Response) => {
      if (!isAdmin(req)) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { status } = req.query as { status?: string };
      const profiles = await organizerService.getAllProfiles(
        status as ApprovalStatus,
      );

      res.status(200).json(profiles.map((p) => profileToResponse(p)));
    }),
  );

  // Get pending organizer approvals (admin only)
  router.get(
    "/admin/pending",
    asyncHandler(async (req: Request, res: Response) => {
      if (!isAdmin(req)) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const profiles = await organizerService.getPendingApprovals();
      res.status(200).json(profiles.map((p) => profileToResponse(p)));
    }),
  );

  // Approve organizer profile (admin only)
  router.post(
    "/admin/:id/approve",
    asyncHandler(async (req: Request, res: Response) => {
      if (!isAdmin(req)) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { id } = req.params as { id: string };
      const adminId = getUserId(req);
      const profile = await organizerService.approveProfile(id, adminId);

      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }

      res.status(200).json({
        message: "Organizer profile approved successfully",
        profile: profileToResponse(profile),
      });
    }),
  );

  // Reject organizer profile (admin only)
  router.post(
    "/admin/:id/reject",
    asyncHandler(async (req: Request, res: Response) => {
      if (!isAdmin(req)) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { id } = req.params as { id: string };
      const { reason, code } = req.body;
      const adminId = getUserId(req);

      const profile = await organizerService.rejectProfile(
        id,
        reason,
        adminId,
        code,
      );

      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }

      res.status(200).json({
        message: "Organizer profile rejected successfully",
        profile: profileToResponse(profile),
      });
    }),
  );

  return router;
}
