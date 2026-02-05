import { PrismaClient } from "../database/prisma.js";
import { OrganizerProfile } from "./organizer.entity.js";
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
        )
      : null;
  }

  async save(profile: OrganizerProfile): Promise<OrganizerProfile> {
    const savedProfile = await this.prisma.organizerProfile.create({
      data: {
        userId: profile.userId,
        organizationName: profile.organizationName,
        contactNumber: profile.contactNumber,
        address: profile.address,
      },
    });

    return new OrganizerProfile(
      savedProfile.id,
      savedProfile.userId,
      savedProfile.organizationName ?? undefined,
      savedProfile.contactNumber ?? undefined,
      savedProfile.address ?? undefined,
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
    );
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.prisma.organizerProfile.delete({
      where: { id },
    });
    return !!result;
  }
}
