import { prisma } from "../../db/prisma";
import { HttpError } from "../../middleware/error-handler";
import { toQueueEntrySummary } from "./queue.mapper";
import type { QueueEntrySummary } from "@anora/shared-types";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export const entryInclude = { patient: true, services: { include: { service: true } } } as const;

export async function getQueueForDoctor(
  doctorProfileId: string,
  options: { includeCompleted?: boolean } = {},
): Promise<QueueEntrySummary[]> {
  const statuses = options.includeCompleted
    ? (["WAITING", "IN_CONSULTATION", "COMPLETED"] as const)
    : (["WAITING", "IN_CONSULTATION"] as const);

  const entries = await prisma.queueEntry.findMany({
    where: {
      doctorProfileId,
      status: { in: [...statuses] },
      registeredAt: { gte: startOfToday() },
    },
    include: entryInclude,
    orderBy: { queueNumber: "asc" },
  });

  let waitingIndex = 0;
  return entries.map((entry) => {
    const summary = toQueueEntrySummary(entry, entry.status === "WAITING" ? waitingIndex : 0);
    if (entry.status === "WAITING") waitingIndex += 1;
    return summary;
  });
}

export async function getCompletedToday(doctorProfileId: string): Promise<QueueEntrySummary[]> {
  const entries = await prisma.queueEntry.findMany({
    where: {
      doctorProfileId,
      status: "COMPLETED",
      registeredAt: { gte: startOfToday() },
    },
    include: entryInclude,
    orderBy: { completedAt: "desc" },
  });
  return entries.map((entry) => toQueueEntrySummary(entry));
}

export async function getRegisteredToday(limit = 50) {
  const entries = await prisma.queueEntry.findMany({
    where: { registeredAt: { gte: startOfToday() } },
    include: { ...entryInclude, doctor: { include: { user: true } } },
    orderBy: { registeredAt: "desc" },
    take: limit,
  });
  return entries.map((entry) => ({
    ...toQueueEntrySummary(entry),
    doctorName: `Dr. ${entry.doctor.user.firstName} ${entry.doctor.user.lastName}`,
  }));
}

export async function registerPatient(input: {
  patientId: string;
  serviceIds: string[];
  doctorProfileId: string;
  registeredById: string;
}) {
  return prisma.$transaction(async (tx) => {
    const services = await tx.service.findMany({ where: { id: { in: input.serviceIds } } });
    if (services.length !== input.serviceIds.length) {
      throw new HttpError(400, "One or more selected services were not found");
    }
    const doctor = await tx.doctorProfile.findUniqueOrThrow({
      where: { id: input.doctorProfileId },
      include: { user: true },
    });

    const totalPrice = services.reduce((sum, s) => sum + Number(s.price), 0);

    const last = await tx.queueEntry.findFirst({
      where: { doctorProfileId: input.doctorProfileId, registeredAt: { gte: startOfToday() } },
      orderBy: { queueNumber: "desc" },
      select: { queueNumber: true },
    });
    const queueNumber = (last?.queueNumber ?? 0) + 1;

    const created = await tx.queueEntry.create({
      data: {
        queueNumber,
        patientId: input.patientId,
        doctorProfileId: input.doctorProfileId,
        registeredById: input.registeredById,
        totalPrice,
        services: {
          create: services.map((s) => ({ serviceId: s.id, price: s.price })),
        },
      },
    });

    const entry = await tx.queueEntry.findUniqueOrThrow({
      where: { id: created.id },
      include: entryInclude,
    });

    const waitingCountBefore = await tx.queueEntry.count({
      where: {
        doctorProfileId: input.doctorProfileId,
        status: "WAITING",
        queueNumber: { lt: queueNumber },
        registeredAt: { gte: startOfToday() },
      },
    });

    const serviceNames = services.map((s) => s.name).join(", ");
    const notification = await tx.notification.create({
      data: {
        userId: doctor.userId,
        type: "NEW_PATIENT_QUEUED",
        title: "New patient in your queue",
        body: `${entry.patient.firstName} ${entry.patient.lastName} — ${serviceNames}, queue #${queueNumber}`,
        data: { queueEntryId: entry.id, patientId: entry.patientId },
      },
    });

    return {
      entry: toQueueEntrySummary(entry, waitingCountBefore),
      doctorUserId: doctor.userId,
      doctorName: `Dr. ${doctor.user.firstName} ${doctor.user.lastName}`,
      notification,
    };
  });
}

export async function startConsultation(queueEntryId: string) {
  const entry = await prisma.queueEntry.findUnique({ where: { id: queueEntryId } });
  if (!entry) throw new HttpError(404, "Queue entry not found");
  if (entry.status !== "WAITING") throw new HttpError(409, "Patient is not waiting");

  const alreadyInConsultation = await prisma.queueEntry.findFirst({
    where: { doctorProfileId: entry.doctorProfileId, status: "IN_CONSULTATION" },
  });
  if (alreadyInConsultation) {
    throw new HttpError(409, "Doctor already has a patient in consultation");
  }

  return prisma.queueEntry.update({
    where: { id: queueEntryId },
    data: { status: "IN_CONSULTATION", startedAt: new Date() },
  });
}

export async function skipPatient(queueEntryId: string) {
  const entry = await prisma.queueEntry.findUnique({ where: { id: queueEntryId } });
  if (!entry || entry.status !== "WAITING") throw new HttpError(409, "Patient is not waiting");

  const next = await prisma.queueEntry.findFirst({
    where: {
      doctorProfileId: entry.doctorProfileId,
      status: "WAITING",
      queueNumber: { gt: entry.queueNumber },
      registeredAt: { gte: startOfToday() },
    },
    orderBy: { queueNumber: "asc" },
  });
  if (!next) return entry; // already last in line

  await prisma.$transaction([
    prisma.queueEntry.update({ where: { id: entry.id }, data: { queueNumber: next.queueNumber } }),
    prisma.queueEntry.update({ where: { id: next.id }, data: { queueNumber: entry.queueNumber } }),
  ]);
  return entry;
}

export async function cancelEntry(queueEntryId: string) {
  const entry = await prisma.queueEntry.findUnique({ where: { id: queueEntryId } });
  if (!entry || entry.status !== "WAITING") throw new HttpError(409, "Patient is not waiting");

  return prisma.queueEntry.update({
    where: { id: queueEntryId },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });
}

export async function returnToQueue(queueEntryId: string) {
  const entry = await prisma.queueEntry.findUnique({ where: { id: queueEntryId } });
  if (!entry || entry.status !== "IN_CONSULTATION") {
    throw new HttpError(409, "Patient is not in consultation");
  }
  return prisma.queueEntry.update({
    where: { id: queueEntryId },
    data: { status: "WAITING", startedAt: null },
  });
}

export async function completeConsultation(queueEntryId: string) {
  const entry = await prisma.queueEntry.findUnique({ where: { id: queueEntryId } });
  if (!entry || entry.status !== "IN_CONSULTATION") {
    throw new HttpError(409, "Patient is not in consultation");
  }

  await prisma.queueEntry.update({
    where: { id: queueEntryId },
    data: { status: "COMPLETED", completedAt: new Date() },
  });

  const next = await prisma.queueEntry.findFirst({
    where: {
      doctorProfileId: entry.doctorProfileId,
      status: "WAITING",
      registeredAt: { gte: startOfToday() },
    },
    orderBy: { queueNumber: "asc" },
  });

  return { doctorProfileId: entry.doctorProfileId, nextCurrentEntryId: next?.id ?? null };
}
