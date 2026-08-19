export const ROLE_NAMES = ["SUPER_ADMIN", "ADMIN", "DOCTOR", "MANAGER"] as const;
export type RoleName = (typeof ROLE_NAMES)[number];

export const QUEUE_STATUSES = [
  "WAITING",
  "IN_CONSULTATION",
  "COMPLETED",
  "CANCELLED",
] as const;
export type QueueStatus = (typeof QUEUE_STATUSES)[number];

export const USER_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const NOTIFICATION_TYPES = [
  "NEW_PATIENT_QUEUED",
  "PATIENT_SKIPPED",
  "PATIENT_RETURNED",
  "SYSTEM",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
