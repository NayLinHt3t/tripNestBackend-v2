import { Router, Response } from "express";
import { OrganizerService } from "./organizer.service.js";
import { AuthenticatedRequest } from "../auth/auth.middleware.js";
import { OrganizerProfile, ApprovalStatus } from "./organizer.entity.js";

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
async function isAdmin(req: AuthenticatedRequest): Promise<boolean> {
  const userRole = (req.user as any)?.role;
  return userRole === "ADMIN";
}

export function createOrganizerRouter(
  organizerService: OrganizerService,
): Router {
  const router = Router();

  // Get current user's organizer profile
  router.get("/me", async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const profile = await organizerService.getProfileByUserId(userId);
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }
      res.status(200).json(profileToResponse(profile));
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Internal error",
      });
    }
  });

  // Get organizer profile by ID
  router.get("/:id", async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const profile = await organizerService.getProfileById(id);
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }
      res.status(200).json(profileToResponse(profile));
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Internal error",
      });
    }
  });

  // Create organizer profile - requires all fields
  router.post("/", async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { organizationName, contactNumber, address } = req.body;

      const profile = await organizerService.createProfile(
        userId,
        organizationName,
        contactNumber,
        address,
      );
      res.status(201).json(profileToResponse(profile));
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Internal error",
      });
    }
  });

  // Update current user's organizer profile
  router.patch("/me", async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

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
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({
          error: error.message,
        });
      }
      res.status(400).json({
        error: error instanceof Error ? error.message : "Internal error",
      });
    }
  });

  // Update organizer profile by ID (admin function)
  router.patch("/:id", async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const { organizationName, contactNumber, address } = req.body;

      const profile = await organizerService.updateProfile(
        id,
        organizationName,
        contactNumber,
        address,
      );
      res.status(200).json(profileToResponse(profile));
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({
          error: error.message,
        });
      }
      res.status(400).json({
        error: error instanceof Error ? error.message : "Internal error",
      });
    }
  });

  // Delete organizer profile
  router.delete("/:id", async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const deleted = await organizerService.deleteProfile(id);
      if (!deleted) {
        return res.status(404).json({ error: "Profile not found" });
      }
      res.status(200).json({ message: "Profile deleted successfully" });
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({
          error: error.message,
        });
      }
      res.status(400).json({
        error: error instanceof Error ? error.message : "Internal error",
      });
    }
  });

  // ========== ADMIN FUNCTIONS ==========

  // Get all organizer profiles with optional status filter (admin only)
  router.get("/admin/all", async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!(await isAdmin(req))) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { status } = req.query as { status?: string };
      const profiles = await organizerService.getAllProfiles(
        status as ApprovalStatus,
      );

      res.status(200).json(profiles.map((p) => profileToResponse(p)));
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Internal error",
      });
    }
  });

  // Get pending organizer approvals (admin only)
  router.get(
    "/admin/pending",
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        if (!(await isAdmin(req))) {
          return res.status(403).json({ error: "Admin access required" });
        }

        const profiles = await organizerService.getPendingApprovals();
        res.status(200).json(profiles.map((p) => profileToResponse(p)));
      } catch (error) {
        res.status(400).json({
          error: error instanceof Error ? error.message : "Internal error",
        });
      }
    },
  );

  // Approve organizer profile (admin only)
  router.post(
    "/admin/:id/approve",
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        if (!(await isAdmin(req))) {
          return res.status(403).json({ error: "Admin access required" });
        }

        const { id } = req.params as { id: string };
        const profile = await organizerService.approveProfile(id);

        if (!profile) {
          return res.status(404).json({ error: "Profile not found" });
        }

        res.status(200).json({
          message: "Organizer profile approved successfully",
          profile: profileToResponse(profile),
        });
      } catch (error) {
        if (error instanceof Error && error.message.includes("not found")) {
          return res.status(404).json({
            error: error.message,
          });
        }
        res.status(400).json({
          error: error instanceof Error ? error.message : "Internal error",
        });
      }
    },
  );

  // Reject organizer profile (admin only)
  router.post(
    "/admin/:id/reject",
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        if (!(await isAdmin(req))) {
          return res.status(403).json({ error: "Admin access required" });
        }

        const { id } = req.params as { id: string };
        const { reason, code } = req.body;

        const profile = await organizerService.rejectProfile(id, reason, code);

        if (!profile) {
          return res.status(404).json({ error: "Profile not found" });
        }

        res.status(200).json({
          message: "Organizer profile rejected successfully",
          profile: profileToResponse(profile),
        });
      } catch (error) {
        if (error instanceof Error && error.message.includes("not found")) {
          return res.status(404).json({
            error: error.message,
          });
        }
        res.status(400).json({
          error: error instanceof Error ? error.message : "Internal error",
        });
      }
    },
  );

  return router;
}
