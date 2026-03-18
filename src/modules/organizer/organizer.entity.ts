export enum ApprovalStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export class OrganizerProfile {
  constructor(
    public id: string | undefined,
    public userId: string,
    public organizationName?: string,
    public contactNumber?: string,
    public address?: string,
    public status: ApprovalStatus = ApprovalStatus.PENDING,
    public rejectionReason?: string,
    public rejectionCode?: string,
    public createdAt?: Date,
  ) {}
}

export interface CreateOrganizerDto {
  userId: string;
  organizationName: string;
  contactNumber: string;
  address: string;
}

export interface UpdateOrganizerDto {
  organizationName?: string;
  contactNumber?: string;
  address?: string;
}

export interface ApproveOrganizerDto {
  organizerId: string;
  adminId: string;
}

export interface RejectOrganizerDto {
  organizerId: string;
  adminId: string;
  reason: string;
  code?: string;
}
