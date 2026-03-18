import { PrismaClient } from "../database/prisma.js";
import { OrganizerProfile, ApprovalStatus } from "./organizer.entity.js";
import { OrganizerRepository } from "./organizer.repository.js";

export class PrismaOrganizerRepository implements OrganizerRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<OrganizerProfile | null> {
    const profile = await this.prisma.organizerProfile.findUnique({
      where: { id },
    });
    return profile
      ? new OrganizerProfile(
          profile.id,
          profile.userId,
          profile.organizationName ?? undefined,
          profile.contactNumber ?? undefined,
          profile.address ?? undefined,
          profile.status as ApprovalStatus,
          profile.rejectionReason ?? undefined,
          profile.rejectionCode ?? undefined,
          profile.createdAt,
        )
      : null;
  }

  async findByUserId(userId: string): Promise<OrganizerProfile | null> {
    const profile = await this.prisma.organizerProfile.findUnique({
      where: { userId },
    });
    return profile
      ? new OrganizerProfile(
          profile.id,
          profile.userId,
          profile.organizationName ?? undefined,
          profile.contactNumber ?? undefined,
          profile.address ?? undefined,
          profile.status as ApprovalStatus,
          profile.rejectionReason ?? undefined,
          profile.rejectionCode ?? undefined,
          profile.createdAt,
        )
      : null;
  }

  async findAll(status?: ApprovalStatus): Promise<OrganizerProfile[]> {
    const profiles = await this.prisma.organizerProfile.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
    });
    return profiles.map(
      (profile) =>
        new OrganizerProfile(
          profile.id,
          profile.userId,
          profile.organizationName ?? undefined,
          profile.contactNumber ?? undefined,
          profile.address ?? undefined,
          profile.status as ApprovalStatus,
          profile.rejectionReason ?? undefined,
          profile.rejectionCode ?? undefined,
          profile.createdAt,
        ),
    );
  }

  async findPending(): Promise<OrganizerProfile[]> {
    return this.findAll(ApprovalStatus.PENDING);
  }

  async save(profile: OrganizerProfile): Promise<OrganizerProfile> {
    const savedProfile = await this.prisma.organizerProfile.create({
      data: {
        userId: profile.userId,
        organizationName: profile.organizationName,
        contactNumber: profile.contactNumber,
        address: profile.address,
        status: profile.status || ApprovalStatus.PENDING,
      },
    });

    return new OrganizerProfile(
      savedProfile.id,
      savedProfile.userId,
      savedProfile.organizationName ?? undefined,
      savedProfile.contactNumber ?? undefined,
      savedProfile.address ?? undefined,
      savedProfile.status as ApprovalStatus,
      savedProfile.rejectionReason ?? undefined,
      savedProfile.rejectionCode ?? undefined,
      savedProfile.createdAt,
    );
  }

  async update(
    id: string,
    profile: Partial<OrganizerProfile>,
  ): Promise<OrganizerProfile | null> {
    const updatedProfile = await this.prisma.organizerProfile.update({
      where: { id },
      data: {
        organizationName: profile.organizationName,
        contactNumber: profile.contactNumber,
        address: profile.address,
      },
    });

    return new OrganizerProfile(
      updatedProfile.id,
      updatedProfile.userId,
      updatedProfile.organizationName ?? undefined,
      updatedProfile.contactNumber ?? undefined,
      updatedProfile.address ?? undefined,
      updatedProfile.status as ApprovalStatus,
      updatedProfile.rejectionReason ?? undefined,
      updatedProfile.rejectionCode ?? undefined,
      updatedProfile.createdAt,
    );
  }

  async approve(id: string): Promise<OrganizerProfile | null> {
    const updatedProfile = await this.prisma.organizerProfile.update({
      where: { id },
      data: {
        status: "APPROVED",
        rejectionReason: null,
        rejectionCode: null,
      },
    });

    return new OrganizerProfile(
      updatedProfile.id,
      updatedProfile.userId,
      updatedProfile.organizationName ?? undefined,
      updatedProfile.contactNumber ?? undefined,
      updatedProfile.address ?? undefined,
      updatedProfile.status as ApprovalStatus,
      updatedProfile.rejectionReason ?? undefined,
      updatedProfile.rejectionCode ?? undefined,
      updatedProfile.createdAt,
    );
  }

  async reject(
    id: string,
    reason: string,
    code?: string,
  ): Promise<OrganizerProfile | null> {
    const updatedProfile = await this.prisma.organizerProfile.update({
      where: { id },
      data: {
        status: "REJECTED",
        rejectionReason: reason,
        rejectionCode: code || null,
      },
    });

    return new OrganizerProfile(
      updatedProfile.id,
      updatedProfile.userId,
      updatedProfile.organizationName ?? undefined,
      updatedProfile.contactNumber ?? undefined,
      updatedProfile.address ?? undefined,
      updatedProfile.status as ApprovalStatus,
      updatedProfile.rejectionReason ?? undefined,
      updatedProfile.rejectionCode ?? undefined,
      updatedProfile.createdAt,
    );
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.prisma.organizerProfile.delete({
      where: { id },
    });
    return !!result;
  }
}
