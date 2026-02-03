import { PrismaClient } from "../database/prisma.js";
import { UserProfile } from "./profile.entity.js";
import { ProfileRepository } from "./profile.repository.js";

export class PrismaProfileRepository implements ProfileRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<UserProfile | null> {
    const profile = await this.prisma.userProfile.findUnique({
      where: { id },
    });
    return profile
      ? new UserProfile(
          profile.id,
          profile.userId,
          profile.fullName ?? undefined,
          profile.phone ?? undefined,
          profile.dateOfBirth ?? undefined,
          profile.gender ?? undefined,
          profile.profilePictureUrl ?? undefined,
        )
      : null;
  }

  async findByUserId(userId: string): Promise<UserProfile | null> {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });
    return profile
      ? new UserProfile(
          profile.id,
          profile.userId,
          profile.fullName ?? undefined,
          profile.phone ?? undefined,
          profile.dateOfBirth ?? undefined,
          profile.gender ?? undefined,
          profile.profilePictureUrl ?? undefined,
        )
      : null;
  }

  async save(profile: UserProfile): Promise<UserProfile> {
    const savedProfile = await this.prisma.userProfile.create({
      data: {
        userId: profile.userId,
        fullName: profile.fullName,
        phone: profile.phone,
        dateOfBirth: profile.dateOfBirth,
        gender: profile.gender,
        profilePictureUrl: profile.profilePictureUrl,
      },
    });

    return new UserProfile(
      savedProfile.id,
      savedProfile.userId,
      savedProfile.fullName ?? undefined,
      savedProfile.phone ?? undefined,
      savedProfile.dateOfBirth ?? undefined,
      savedProfile.gender ?? undefined,
      savedProfile.profilePictureUrl ?? undefined,
    );
  }

  async update(
    id: string,
    profile: Partial<UserProfile>,
  ): Promise<UserProfile | null> {
    const updatedProfile = await this.prisma.userProfile.update({
      where: { id },
      data: {
        fullName: profile.fullName,
        phone: profile.phone,
        dateOfBirth: profile.dateOfBirth,
        gender: profile.gender,
        profilePictureUrl: profile.profilePictureUrl,
      },
    });

    return new UserProfile(
      updatedProfile.id,
      updatedProfile.userId,
      updatedProfile.fullName ?? undefined,
      updatedProfile.phone ?? undefined,
      updatedProfile.dateOfBirth ?? undefined,
      updatedProfile.gender ?? undefined,
      updatedProfile.profilePictureUrl ?? undefined,
    );
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.prisma.userProfile.delete({
      where: { id },
    });
    return !!result;
  }
}
