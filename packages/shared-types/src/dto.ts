import type { NotificationType, QueueStatus } from "./enums";

export interface PatientSummary {
  id: string;
  firstName: string;
  lastName: string;
  birthYear: number;
  phone: string | null;
}

export interface ServiceSummary {
  id: string;
  name: string;
  category: string;
  price: string;
  icon: string | null;
  isActive: boolean;
}

export interface DoctorSummary {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  specialization: string;
  avatarUrl: string | null;
  isBusy: boolean;
  waitingCount: number;
}

export interface QueueEntrySummary {
  id: string;
  queueNumber: number;
  status: QueueStatus;
  patient: PatientSummary;
  services: ServiceSummary[];
  totalPrice: string;
  doctorProfileId: string;
  registeredAt: string;
  startedAt: string | null;
  completedAt: string | null;
  estimatedWaitMinutes: number | null;
}

export interface NotificationDto {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
}

export interface ClinicActivityEvent {
  type: "REGISTERED" | "STARTED" | "COMPLETED" | "CANCELLED";
  doctorName: string;
  patientName: string;
  serviceName: string;
  at: string;
}
