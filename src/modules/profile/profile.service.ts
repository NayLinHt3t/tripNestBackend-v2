import { UserProfile } from "./profile.entity.js";
import { ProfileRepository } from "./profile.repository.js";
import { PrismaClient } from "../database/prisma.js";

export class ProfileService {
  constructor(
    private profileRepository: ProfileRepository,
    private prisma: PrismaClient,
  ) {}

  // Helper method to create a default/placeholder profile
  private createDefaultProfile(userId: string): UserProfile {
    return new UserProfile(
      undefined,
      userId,
      "Not Set",
      "Not Set",
      undefined,
      "Not Set",
      "https://via.placeholder.com/200?text=Profile+Picture",
    );
  }

  async getProfileById(id: string): Promise<UserProfile | null> {
    if (!id) {
      throw new Error("Profile ID is required");
    }
    return this.profileRepository.findById(id);
  }

  async getProfileByUserId(userId: string): Promise<UserProfile> {
    if (!userId) {
      throw new Error("User ID is required");
    }
    const profile = await this.profileRepository.findByUserId(userId);
    // Return default profile if no profile exists for user
    return profile || this.createDefaultProfile(userId);
  }

  async createProfile(
    userId: string,
    fullName?: string,
    phone?: string,
    dateOfBirth?: Date,
    gender?: string,
    profilePictureUrl?: string,
  ): Promise<UserProfile> {
    if (!userId) {
      throw new Error("User ID is required");
    }

    // Check if profile already exists in database
    const existingProfile = await this.profileRepository.findByUserId(userId);
    if (existingProfile && existingProfile.id) {
      throw new Error("Profile already exists for this user");
    }

    // Check if user exists (only if we're being strict)
    // This validation is optional since auth middleware should ensure user exists
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      if (!user) {
        throw new Error("User not found");
      }
    } catch (error) {
      if (error instanceof Error && error.message === "User not found") {
        throw error;
      }
      // If there's a database connection error, we'll let it propagate
      throw error;
    }

    const profile = new UserProfile(
      undefined,
      userId,
      fullName,
      phone,
      dateOfBirth,
      gender,
      profilePictureUrl,
    );

    return this.profileRepository.save(profile);
  }

  async updateProfile(
    id: string,
    fullName?: string,
    phone?: string,
    dateOfBirth?: Date,
    gender?: string,
    profilePictureUrl?: string,
  ): Promise<UserProfile | null> {
    if (!id) {
      throw new Error("Profile ID is required");
    }

    const profile = await this.profileRepository.findById(id);
    if (!profile) {
      throw new Error("Profile not found");
    }

    const updatedProfile = new UserProfile(
      id,
      profile.userId,
      fullName ?? profile.fullName,
      phone ?? profile.phone,
      dateOfBirth ?? profile.dateOfBirth,
      gender ?? profile.gender,
      profilePictureUrl ?? profile.profilePictureUrl,
    );

    return this.profileRepository.update(id, updatedProfile);
  }

  async deleteProfile(id: string): Promise<boolean> {
    if (!id) {
      throw new Error("Profile ID is required");
    }

    const profile = await this.profileRepository.findById(id);
    if (!profile) {
      throw new Error("Profile not found");
    }

    return this.profileRepository.delete(id);
  }
}
