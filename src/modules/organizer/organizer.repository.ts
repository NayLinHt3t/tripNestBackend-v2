import { OrganizerProfile } from "./organizer.entity.js";

export interface OrganizerRepository {
  findById(id: string): Promise<OrganizerProfile | null>;
  findByUserId(userId: string): Promise<OrganizerProfile | null>;
  save(profile: OrganizerProfile): Promise<OrganizerProfile>;
  update(
    id: string,
    profile: Partial<OrganizerProfile>,
  ): Promise<OrganizerProfile | null>;
  delete(id: string): Promise<boolean>;
}
