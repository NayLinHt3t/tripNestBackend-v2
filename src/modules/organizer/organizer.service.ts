import { OrganizerProfile } from "./organizer.entity.js";
import { OrganizerRepository } from "./organizer.repository.js";
import { PrismaClient } from "../database/prisma.js";

export class OrganizerService {
  constructor(
    private organizerRepository: OrganizerRepository,
    private prisma: PrismaClient,
  ) {}

  // Helper method to create a default/placeholder organizer profile
  private createDefaultProfile(userId: string): OrganizerProfile {
    return new OrganizerProfile(
      undefined,
      userId,
      "Not Set",
      "Not Set",
      "Not Set",
    );
  }

  async getProfileById(id: string): Promise<OrganizerProfile | null> {
    if (!id) {
      throw new Error("Profile ID is required");
    }
    return this.organizerRepository.findById(id);
  }

  async getProfileByUserId(userId: string): Promise<OrganizerProfile> {
    if (!userId) {
      throw new Error("User ID is required");
    }
    const profile = await this.organizerRepository.findByUserId(userId);
    // Return default profile if no profile exists for user
    return profile || this.createDefaultProfile(userId);
  }

  async createProfile(
    userId: string,
    organizationName?: string,
    contactNumber?: string,
    address?: string,
  ): Promise<OrganizerProfile> {
    if (!userId) {
      throw new Error("User ID is required");
    }

    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new Error("User not found");
    }

    // Check if profile already exists in database
    const existingProfile = await this.organizerRepository.findByUserId(userId);
    if (existingProfile && existingProfile.id) {
      throw new Error("Organizer profile already exists for this user");
    }

    const profile = new OrganizerProfile(
      undefined,
      userId,
      organizationName,
      contactNumber,
      address,
    );

    return this.organizerRepository.save(profile);
  }

  async updateProfile(
    id: string,
    organizationName?: string,
    contactNumber?: string,
    address?: string,
  ): Promise<OrganizerProfile | null> {
    if (!id) {
      throw new Error("Profile ID is required");
    }

    const profile = await this.organizerRepository.findById(id);
    if (!profile) {
      throw new Error("Profile not found");
    }

    const updatedProfile = new OrganizerProfile(
      id,
      profile.userId,
      organizationName ?? profile.organizationName,
      contactNumber ?? profile.contactNumber,
      address ?? profile.address,
    );

    return this.organizerRepository.update(id, updatedProfile);
  }

  async deleteProfile(id: string): Promise<boolean> {
    if (!id) {
      throw new Error("Profile ID is required");
    }

    const profile = await this.organizerRepository.findById(id);
    if (!profile) {
      throw new Error("Profile not found");
    }

    return this.organizerRepository.delete(id);
  }
}
