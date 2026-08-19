import type {
  ClinicActivityEvent,
  NotificationDto,
  QueueEntrySummary,
} from "./dto";

export const SOCKET_EVENTS = {
  PATIENT_REGISTERED: "queue:patient_registered",
  QUEUE_UPDATED: "queue:updated",
  QUEUE_ENTRY_UPDATED: "queue:entry_updated",
  CONSULTATION_STARTED: "queue:consultation_started",
  CONSULTATION_COMPLETED: "queue:consultation_completed",
  NOTIFICATION_NEW: "notification:new",
  CLINIC_ACTIVITY: "clinic:activity",
} as const;

export interface ServerToClientEvents {
  [SOCKET_EVENTS.PATIENT_REGISTERED]: (payload: QueueEntrySummary) => void;
  [SOCKET_EVENTS.QUEUE_UPDATED]: (payload: {
    doctorProfileId: string;
    entries: QueueEntrySummary[];
  }) => void;
  [SOCKET_EVENTS.QUEUE_ENTRY_UPDATED]: (
    payload: QueueEntrySummary & { doctorName: string },
  ) => void;
  [SOCKET_EVENTS.CONSULTATION_STARTED]: (payload: {
    queueEntryId: string;
    startedAt: string;
  }) => void;
  [SOCKET_EVENTS.CONSULTATION_COMPLETED]: (payload: {
    queueEntryId: string;
    completedAt: string;
    nextCurrentEntryId: string | null;
  }) => void;
  [SOCKET_EVENTS.NOTIFICATION_NEW]: (payload: NotificationDto) => void;
  [SOCKET_EVENTS.CLINIC_ACTIVITY]: (payload: ClinicActivityEvent) => void;
}

// Sockets carry no client-emitted events in this app — all writes go
// through REST; the server pushes state via the events above.
export type ClientToServerEvents = Record<string, never>;

export function roomForDoctor(doctorProfileId: string): string {
  return `doctor:${doctorProfileId}`;
}

export function roomForUser(userId: string): string {
  return `user:${userId}`;
}

export const CLINIC_ROOM = "clinic:main";
