import { Router, Request, Response } from "express";
import multer from "multer";
import { ProfileService } from "./profile.service.js";
import { UserProfile } from "./profile.entity.js";
import { uploadImageBuffer } from "../utils/cloudinary.js";
import { AuthenticatedRequest } from "../auth/auth.middleware.js";
import { asyncHandler, getUserId } from "../../shared/http.js";
import { ValidationError } from "../../shared/errors.js";

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

// Upload the request's profile picture (if any) and return its URL.
// A failed upload surfaces as a 400 (ValidationError), matching prior behavior.
async function uploadProfilePicture(
  req: Request,
): Promise<string | undefined> {
  if (!req.file) return undefined;
  try {
    const uploadResult = await uploadImageBuffer(req.file.buffer, {
      folder: "tripnest/profiles",
      resource_type: "auto",
    });
    return uploadResult.secure_url;
  } catch (uploadError) {
    throw new ValidationError(
      uploadError instanceof Error
        ? uploadError.message
        : "Failed to upload image",
    );
  }
}

export function createProfileRouter(profileService: ProfileService): Router {
  const router = Router();

  // Get current user's profile
  router.get(
    "/me",
    asyncHandler(async (req: Request, res: Response) => {
      const userId = getUserId(req);
      const email = (req as AuthenticatedRequest).user?.email;
      const profile = await profileService.getProfileByUserId(userId);
      res.status(200).json(profileToResponse(profile, email));
    }),
  );

  // Get profile by ID
  router.get(
    "/:id",
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params as { id: string };
      const email = (req as AuthenticatedRequest).user?.email;
      const profile = await profileService.getProfileById(id);
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }
      res.status(200).json(profileToResponse(profile, email));
    }),
  );

  // Create profile
  router.post(
    "/",
    upload.single("profilePicture"),
    asyncHandler(async (req: Request, res: Response) => {
      const userId = getUserId(req);
      const email = (req as AuthenticatedRequest).user?.email;
      const { fullName, phone, dateOfBirth, gender } = req.body;
      const profilePictureUrl = await uploadProfilePicture(req);

      const profile = await profileService.createProfile(
        userId,
        fullName,
        phone,
        dateOfBirth ? new Date(dateOfBirth) : undefined,
        gender,
        profilePictureUrl,
      );
      res.status(201).json(profileToResponse(profile, email));
    }),
  );

  // Update current user's profile (must be before /:id route)
  router.patch(
    "/me",
    upload.single("profilePicture"),
    asyncHandler(async (req: Request, res: Response) => {
      const userId = getUserId(req);
      const email = (req as AuthenticatedRequest).user?.email;
      const { fullName, phone, dateOfBirth, gender } = req.body;
      const profilePictureUrl = await uploadProfilePicture(req);

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
    }),
  );

  // Update profile
  router.patch(
    "/:id",
    upload.single("profilePicture"),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params as { id: string };
      const email = (req as AuthenticatedRequest).user?.email;
      const { fullName, phone, dateOfBirth, gender } = req.body;
      const profilePictureUrl = await uploadProfilePicture(req);

      const profile = await profileService.updateProfile(
        id,
        fullName,
        phone,
        dateOfBirth ? new Date(dateOfBirth) : undefined,
        gender,
        profilePictureUrl,
      );
      res.status(200).json(profileToResponse(profile, email));
    }),
  );

  // Delete profile
  router.delete(
    "/:id",
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params as { id: string };
      const deleted = await profileService.deleteProfile(id);
      if (!deleted) {
        return res.status(404).json({ error: "Profile not found" });
      }
      res.status(200).json({ message: "Profile deleted successfully" });
    }),
  );

  return router;
}
