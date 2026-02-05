import { Router, Response } from "express";
import { OrganizerService } from "./organizer.service.js";
import { AuthenticatedRequest } from "../auth/auth.middleware.js";
import { OrganizerProfile } from "./organizer.entity.js";

// Helper function to convert OrganizerProfile entity to response DTO
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

  // Create organizer profile
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

  // Update current user's organizer profile (must be before /:id)
  router.patch("/me", async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { organizationName, contactNumber, address } = req.body;

      const existingProfile = await organizerService.getProfileByUserId(userId);

      // If profile has no ID, it's a default profile (not created yet), so create it
      if (!existingProfile.id) {
        const newProfile = await organizerService.createProfile(
          userId,
          organizationName,
          contactNumber,
          address,
        );
        return res.status(201).json(profileToResponse(newProfile));
      }

      // Otherwise, update existing profile
      const profile = await organizerService.updateProfile(
        existingProfile.id,
        organizationName,
        contactNumber,
        address,
      );
      res.status(200).json(profileToResponse(profile));
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Internal error",
      });
    }
  });

  // Update organizer profile
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

  return router;
}
