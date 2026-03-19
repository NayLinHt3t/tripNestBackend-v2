import {
  OrganizerProfile,
  ApprovalStatus,
  CreateOrganizerDto,
} from "./organizer.entity.js";
import { OrganizerRepository } from "./organizer.repository.js";
import { PrismaClient } from "../database/prisma.js";

export class OrganizerService {
  constructor(
    private organizerRepository: OrganizerRepository,
    private prisma: PrismaClient,
  ) {}

  private async ensureUserRole(
    userId: string,
    roleName: "USER" | "ORGANIZER" | "ADMIN",
  ) {
    const role = await this.prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
    });

    await this.prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId,
          roleId: role.id,
        },
      },
      update: {},
      create: {
        userId,
        roleId: role.id,
      },
    });
      try {
        await this.prisma.$executeRaw`
          INSERT INTO "Role" (id, name)
          VALUES (gen_random_uuid()::text, ${roleName})
          ON CONFLICT (name) DO NOTHING
        `;

        await this.prisma.$executeRaw`
          INSERT INTO "UserRole" ("userId", "roleId")
          SELECT ${userId}, r.id
          FROM "Role" r
          WHERE r.name = ${roleName}
          ON CONFLICT ("userId", "roleId") DO NOTHING
        `;
      } catch {
        await this.prisma.user.update({
          where: { id: userId },
          data: { role: roleName },
        });
      }
  }

  async getProfileById(id: string): Promise<OrganizerProfile | null> {
    if (!id) {
      throw new Error("Profile ID is required");
    }
    return this.organizerRepository.findById(id);
  }

  async getProfileByUserId(userId: string): Promise<OrganizerProfile | null> {
    if (!userId) {
      throw new Error("User ID is required");
    }
    return this.organizerRepository.findByUserId(userId);
  }

  /**
   * Create an organizer profile with validation
   * Checks if user exists and doesn't already have an organizer profile
   */
  async createProfile(
    userId: string,
    organizationName: string,
    contactNumber: string,
    address: string,
  ): Promise<OrganizerProfile> {
    if (!userId) {
      throw new Error("User ID is required");
    }

    // Validate required fields
    if (!organizationName?.trim()) {
      throw new Error("Organization name is required");
    }
    if (!contactNumber?.trim()) {
      throw new Error("Contact number is required");
    }
    if (!address?.trim()) {
      throw new Error("Address is required");
    }

    // Verify user exists and get user details
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { userProfile: true },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Check if profile already exists
    const existingProfile = await this.organizerRepository.findByUserId(userId);
    if (existingProfile && existingProfile.id) {
      throw new Error("Organizer profile already exists for this user");
    }

    // Validate contact number format (basic validation)
    if (!/^\d{7,}$/.test(contactNumber.replace(/\s|-/g, ""))) {
      throw new Error("Invalid contact number format");
    }

    // Create new organizer profile with PENDING status
    const profile = new OrganizerProfile(
      undefined,
      userId,
      organizationName.trim(),
      contactNumber.trim(),
      address.trim(),
      ApprovalStatus.PENDING,
    );

    return this.organizerRepository.save(profile);
  }

  /**
   * Update organizer profile details (not status)
   */
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

    // Cannot update a rejected profile
    if (profile.status === ApprovalStatus.REJECTED) {
      throw new Error("Cannot update a rejected organizer profile");
    }

    if (contactNumber && !/^\d{7,}$/.test(contactNumber.replace(/\s|-/g, ""))) {
      throw new Error("Invalid contact number format");
    }

    const updatedProfile = new OrganizerProfile(
      id,
      profile.userId,
      organizationName?.trim() ?? profile.organizationName,
      contactNumber?.trim() ?? profile.contactNumber,
      address?.trim() ?? profile.address,
      profile.status,
      profile.rejectionReason,
      profile.rejectionCode,
    );

    return this.organizerRepository.update(id, updatedProfile);
  }

  /**
   * Get all organizer profiles (admin function)
   */
  async getAllProfiles(status?: ApprovalStatus): Promise<OrganizerProfile[]> {
    return this.organizerRepository.findAll(status);
  }

  /**
   * Get pending organizer approvals (admin function)
   */
  async getPendingApprovals(): Promise<OrganizerProfile[]> {
    return this.organizerRepository.findPending();
  }

  /**
   * Approve an organizer profile (admin function)
   */
  async approveProfile(
    id: string,
    adminId: string,
  ): Promise<OrganizerProfile | null> {
    if (!id) {
      throw new Error("Profile ID is required");
    }
    if (!adminId) {
      throw new Error("Admin ID is required");
    }

    const profile = await this.organizerRepository.findById(id);
    if (!profile) {
      throw new Error("Organizer profile not found");
    }

    if (profile.status !== ApprovalStatus.PENDING) {
      throw new Error(
        `Cannot approve a ${profile.status.toLowerCase()} profile`,
      );
    }

    const approvedProfile = await this.organizerRepository.approve(id, adminId);
    await this.ensureUserRole(profile.userId, "ORGANIZER");
    return approvedProfile;
  }

  /**
   * Reject an organizer profile (admin function)
   */
  async rejectProfile(
    id: string,
    reason: string,
    adminId: string,
    code?: string,
  ): Promise<OrganizerProfile | null> {
    if (!adminId) {
      throw new Error("Admin ID is required");
    }

    if (!id) {
      throw new Error("Profile ID is required");
    }

    if (!reason?.trim()) {
      throw new Error("Rejection reason is required");
    }

    const profile = await this.organizerRepository.findById(id);
    if (!profile) {
      throw new Error("Organizer profile not found");
    }

    if (profile.status !== ApprovalStatus.PENDING) {
      throw new Error(
        `Cannot reject a ${profile.status.toLowerCase()} profile`,
      );
    }

    return this.organizerRepository.reject(id, reason.trim(), adminId, code);
  }

  /**
   * Delete organizer profile (only if PENDING or REJECTED)
   */
  async deleteProfile(id: string): Promise<boolean> {
    if (!id) {
      throw new Error("Profile ID is required");
    }

    const profile = await this.organizerRepository.findById(id);
    if (!profile) {
      throw new Error("Profile not found");
    }

    // Check if the organizer has any events
    const eventCount = await this.prisma.event.count({
      where: { organizerId: id },
    });

    if (eventCount > 0) {
      throw new Error(
        "Cannot delete organizer profile with existing events. Please delete all events first.",
      );
    }

    return this.organizerRepository.delete(id);
  }
}
