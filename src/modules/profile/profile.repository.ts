import { UserProfile } from "./profile.entity.js";

export interface ProfileRepository {
  findById(id: string): Promise<UserProfile | null>;
  findByUserId(userId: string): Promise<UserProfile | null>;
  save(profile: UserProfile): Promise<UserProfile>;
  update(
    id: string,
    profile: Partial<UserProfile>,
  ): Promise<UserProfile | null>;
  delete(id: string): Promise<boolean>;
}
