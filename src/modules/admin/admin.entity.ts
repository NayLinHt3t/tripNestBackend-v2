export enum AdminAction {
  APPROVE_ORGANIZER = "APPROVE_ORGANIZER",
  APPROVE_EVENT = "APPROVE_EVENT",
  REJECT_ORGANIZER = "REJECT_ORGANIZER",
  SUSPEND_ORGANIZER = "SUSPEND_ORGANIZER",
  ARCHIVE_EVENT = "ARCHIVE_EVENT",
  DELETE_EVENT = "DELETE_EVENT",
  FLAG_REVIEW = "FLAG_REVIEW",
  APPROVE_REVIEW = "APPROVE_REVIEW",
  BAN_USER = "BAN_USER",
  UNBAN_USER = "UNBAN_USER",
}

export interface ModerationAction {
  entityType: string; // "ORGANIZER" | "EVENT" | "REVIEW" | "USER"
  entityId: string;
  action: AdminAction;
  reason?: string;
  details?: Record<string, any>;
}

export interface AdminStats {
  totalOrganizers: number;
  pendingOrganizers: number;
  approvedOrganizers: number;
  rejectedOrganizers: number;
  totalEvents: number;
  totalUsers: number;
  totalReviews: number;
  moderationLogsCount: number;
}
