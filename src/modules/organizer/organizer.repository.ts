import { OrganizerProfile, ApprovalStatus } from "./organizer.entity.js";

export interface OrganizerRepository {
  findById(id: string): Promise<OrganizerProfile | null>;
  findByUserId(userId: string): Promise<OrganizerProfile | null>;
  findAll(status?: ApprovalStatus): Promise<OrganizerProfile[]>;
  findPending(): Promise<OrganizerProfile[]>;
  save(profile: OrganizerProfile): Promise<OrganizerProfile>;
  update(
    id: string,
    profile: Partial<OrganizerProfile>,
  ): Promise<OrganizerProfile | null>;
  approve(id: string): Promise<OrganizerProfile | null>;
  reject(
    id: string,
    reason: string,
    code?: string,
  ): Promise<OrganizerProfile | null>;
  delete(id: string): Promise<boolean>;
}
