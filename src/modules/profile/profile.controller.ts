import { Router, Response } from "express";
import multer from "multer";
import { ProfileService } from "./profile.service.js";
import { AuthenticatedRequest } from "../auth/auth.middleware.js";
import { UserProfile } from "./profile.entity.js";
import { uploadImageBuffer } from "../utils/cloudinary.js";

// Configure multer for file uploads (memory storage)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// Helper function to convert UserProfile entity to response DTO
function profileToResponse(profile: UserProfile | null, email?: string) {
  if (!profile) return null;
  return {
    id: profile.id,
    userId: profile.userId,
    email: email || null,
    fullName: profile.fullName,
    phone: profile.phone,
    dateOfBirth: profile.dateOfBirth || null,
    gender: profile.gender,
    profilePictureUrl: profile.profilePictureUrl,
  };
}

export function createProfileRouter(profileService: ProfileService): Router {
  const router = Router();

  // Get current user's profile
  router.get("/me", async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      const email = req.user?.email;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const profile = await profileService.getProfileByUserId(userId);
      res.status(200).json(profileToResponse(profile, email));
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Internal error",
      });
    }
  });

  // Get profile by ID
  router.get("/:id", async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const email = req.user?.email;
      const profile = await profileService.getProfileById(id);
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }
      res.status(200).json(profileToResponse(profile, email));
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Internal error",
      });
    }
  });

  // Create profile
  router.post(
    "/",
    upload.single("profilePicture"),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.user?.userId;
        const email = req.user?.email;
        if (!userId) {
          return res.status(401).json({ error: "Unauthorized" });
        }

        const { fullName, phone, dateOfBirth, gender } = req.body;
        let profilePictureUrl = undefined;

        // Upload image to Cloudinary if provided
        if (req.file) {
          try {
            const uploadResult = await uploadImageBuffer(req.file.buffer, {
              folder: "tripnest/profiles",
              resource_type: "auto",
            });
            profilePictureUrl = uploadResult.secure_url;
          } catch (uploadError) {
            return res.status(400).json({
              error:
                uploadError instanceof Error
                  ? uploadError.message
                  : "Failed to upload image",
            });
          }
        }

        const profile = await profileService.createProfile(
          userId,
          fullName,
          phone,
          dateOfBirth ? new Date(dateOfBirth) : undefined,
          gender,
          profilePictureUrl,
        );
        res.status(201).json(profileToResponse(profile, email));
      } catch (error) {
        res.status(400).json({
          error: error instanceof Error ? error.message : "Internal error",
        });
      }
    },
  );

  // Update current user's profile (must be before /:id route)
  router.patch(
    "/me",
    upload.single("profilePicture"),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.user?.userId;
        const email = req.user?.email;
        if (!userId) {
          return res.status(401).json({ error: "Unauthorized" });
        }

        const { fullName, phone, dateOfBirth, gender } = req.body;
        let profilePictureUrl = undefined;

        // Upload image to Cloudinary if provided
        if (req.file) {
          try {
            const uploadResult = await uploadImageBuffer(req.file.buffer, {
              folder: "tripnest/profiles",
              resource_type: "auto",
            });
            profilePictureUrl = uploadResult.secure_url;
          } catch (uploadError) {
            return res.status(400).json({
              error:
                uploadError instanceof Error
                  ? uploadError.message
                  : "Failed to upload image",
            });
          }
        }

        const existingProfile = await profileService.getProfileByUserId(userId);

        // If profile has no ID, it's a default profile (not created yet), so create it
        if (!existingProfile.id) {
          const newProfile = await profileService.createProfile(
            userId,
            fullName,
            phone,
            dateOfBirth ? new Date(dateOfBirth) : undefined,
            gender,
            profilePictureUrl,
          );
          return res.status(201).json(profileToResponse(newProfile, email));
        }

        // Otherwise, update existing profile
        const profile = await profileService.updateProfile(
          existingProfile.id,
          fullName,
          phone,
          dateOfBirth ? new Date(dateOfBirth) : undefined,
          gender,
          profilePictureUrl,
        );
        res.status(200).json(profileToResponse(profile, email));
      } catch (error) {
        res.status(400).json({
          error: error instanceof Error ? error.message : "Internal error",
        });
      }
    },
  );

  // Update profile
  router.patch(
    "/:id",
    upload.single("profilePicture"),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { id } = req.params as { id: string };
        const email = req.user?.email;
        const { fullName, phone, dateOfBirth, gender } = req.body;
        let profilePictureUrl = undefined;

        // Upload image to Cloudinary if provided
        if (req.file) {
          try {
            const uploadResult = await uploadImageBuffer(req.file.buffer, {
              folder: "tripnest/profiles",
              resource_type: "auto",
            });
            profilePictureUrl = uploadResult.secure_url;
          } catch (uploadError) {
            return res.status(400).json({
              error:
                uploadError instanceof Error
                  ? uploadError.message
                  : "Failed to upload image",
            });
          }
        }

        const profile = await profileService.updateProfile(
          id,
          fullName,
          phone,
          dateOfBirth ? new Date(dateOfBirth) : undefined,
          gender,
          profilePictureUrl,
        );
        res.status(200).json(profileToResponse(profile, email));
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

  // Delete profile
  router.delete("/:id", async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const deleted = await profileService.deleteProfile(id);
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
