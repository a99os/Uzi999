import type { Prisma } from "@prisma/client";
import type { QueueEntrySummary } from "@anora/shared-types";

const queueEntryWithRelations = {
  include: { patient: true, services: { include: { service: true } } },
} satisfies Prisma.QueueEntryDefaultArgs;

export type QueueEntryWithRelations = Prisma.QueueEntryGetPayload<
  typeof queueEntryWithRelations
>;

const AVG_CONSULTATION_MINUTES = 15;

export function toQueueEntrySummary(
  entry: QueueEntryWithRelations,
  positionInWaitingLine = 0,
): QueueEntrySummary {
  return {
    id: entry.id,
    queueNumber: entry.queueNumber,
    status: entry.status,
    patient: {
      id: entry.patient.id,
      firstName: entry.patient.firstName,
      lastName: entry.patient.lastName,
      birthYear: entry.patient.birthYear,
      phone: entry.patient.phone,
    },
    services: entry.services.map((es) => ({
      id: es.service.id,
      name: es.service.name,
      category: es.service.category,
      price: es.price.toString(),
      icon: es.service.icon,
      isActive: es.service.isActive,
    })),
    totalPrice: entry.totalPrice.toString(),
    doctorProfileId: entry.doctorProfileId,
    registeredAt: entry.registeredAt.toISOString(),
    startedAt: entry.startedAt?.toISOString() ?? null,
    completedAt: entry.completedAt?.toISOString() ?? null,
    estimatedWaitMinutes:
      entry.status === "WAITING" ? positionInWaitingLine * AVG_CONSULTATION_MINUTES : null,
  };
}
