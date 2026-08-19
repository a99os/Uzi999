import { Router } from "express";
import { z } from "zod";
import {
  CLINIC_ROOM,
  roomForDoctor,
  roomForUser,
  SOCKET_EVENTS,
} from "@anora/shared-types";
import { asyncHandler } from "../../lib/async-handler";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { HttpError } from "../../middleware/error-handler";
import { getIO } from "../../realtime/socket-server";
import { prisma } from "../../db/prisma";
import * as queueService from "./queue.service";
import { entryInclude } from "./queue.service";
import { toQueueEntrySummary } from "./queue.mapper";

export const queueRouter = Router();
queueRouter.use(authenticate);

queueRouter.get(
  "/doctor/:doctorProfileId",
  asyncHandler(async (req, res) => {
    res.json(await queueService.getQueueForDoctor(req.params.doctorProfileId));
  }),
);

queueRouter.get(
  "/registered-today",
  authorize("SUPER_ADMIN", "ADMIN", "MANAGER"),
  asyncHandler(async (_req, res) => {
    res.json(await queueService.getRegisteredToday());
  }),
);

queueRouter.get(
  "/doctor/:doctorProfileId/completed-today",
  asyncHandler(async (req, res) => {
    res.json(await queueService.getCompletedToday(req.params.doctorProfileId));
  }),
);

const registerSchema = z.object({
  patientId: z.string().min(1),
  serviceIds: z.array(z.string().min(1)).min(1),
  doctorProfileId: z.string().min(1),
});

queueRouter.post(
  "/",
  authorize("ADMIN", "MANAGER", "DOCTOR"),
  asyncHandler(async (req, res) => {
    const input = registerSchema.parse(req.body);

    // A caller who is only a Doctor (no Admin/Manager privilege) may only
    // register patients into their own queue, enforced server-side.
    const roles = req.user!.roles;
    const isPrivileged = roles.includes("ADMIN") || roles.includes("MANAGER");
    if (!isPrivileged) {
      const myProfile = await prisma.doctorProfile.findUnique({
        where: { userId: req.user!.sub },
      });
      if (!myProfile || myProfile.id !== input.doctorProfileId) {
        throw new HttpError(403, "Doctors can only register patients for themselves");
      }
    }

    const { entry, doctorUserId, doctorName, notification } =
      await queueService.registerPatient({ ...input, registeredById: req.user!.sub });

    const io = getIO();
    io.to(roomForDoctor(input.doctorProfileId)).emit(SOCKET_EVENTS.PATIENT_REGISTERED, entry);
    const refreshed = await queueService.getQueueForDoctor(input.doctorProfileId);
    io.to(roomForDoctor(input.doctorProfileId)).emit(SOCKET_EVENTS.QUEUE_UPDATED, {
      doctorProfileId: input.doctorProfileId,
      entries: refreshed,
    });
    io.to(roomForUser(doctorUserId)).emit(SOCKET_EVENTS.NOTIFICATION_NEW, {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      data: notification.data as Record<string, unknown> | null,
      isRead: notification.isRead,
      createdAt: notification.createdAt.toISOString(),
    });
    io.to(CLINIC_ROOM).emit(SOCKET_EVENTS.CLINIC_ACTIVITY, {
      type: "REGISTERED",
      doctorName,
      patientName: `${entry.patient.firstName} ${entry.patient.lastName}`,
      serviceName: entry.services.map((s) => s.name).join(", "),
      at: entry.registeredAt,
    });

    res.status(201).json(entry);
  }),
);

async function assertOwnsEntry(userId: string, queueEntryId: string) {
  const entry = await prisma.queueEntry.findUnique({
    where: { id: queueEntryId },
    select: { doctorProfileId: true },
  });
  if (!entry) throw new HttpError(404, "Queue entry not found");
  const myProfile = await prisma.doctorProfile.findUnique({ where: { userId } });
  if (!myProfile || myProfile.id !== entry.doctorProfileId) {
    throw new HttpError(403, "You can only manage your own queue");
  }
}

async function emitQueueUpdate(doctorProfileId: string) {
  const io = getIO();
  const entries = await queueService.getQueueForDoctor(doctorProfileId);
  io.to(roomForDoctor(doctorProfileId)).emit(SOCKET_EVENTS.QUEUE_UPDATED, {
    doctorProfileId,
    entries,
  });
  return entries;
}

// Lightweight row-patch signal for admin/manager "Today's Registrations"
// views, which only join CLINIC_ROOM — QUEUE_UPDATED above never reaches
// them since it's scoped to the doctor's own room.
async function emitEntryUpdate(queueEntryId: string) {
  const entry = await prisma.queueEntry.findUniqueOrThrow({
    where: { id: queueEntryId },
    include: { ...entryInclude, doctor: { include: { user: true } } },
  });
  const summary = {
    ...toQueueEntrySummary(entry),
    doctorName: `Dr. ${entry.doctor.user.firstName} ${entry.doctor.user.lastName}`,
  };
  const io = getIO();
  io.to(roomForDoctor(entry.doctorProfileId)).emit(SOCKET_EVENTS.QUEUE_ENTRY_UPDATED, summary);
  io.to(CLINIC_ROOM).emit(SOCKET_EVENTS.QUEUE_ENTRY_UPDATED, summary);
  return summary;
}

queueRouter.post(
  "/:id/start",
  authorize("DOCTOR"),
  asyncHandler(async (req, res) => {
    await assertOwnsEntry(req.user!.sub, req.params.id);
    const entry = await queueService.startConsultation(req.params.id);
    const io = getIO();
    io.to(roomForDoctor(entry.doctorProfileId)).emit(SOCKET_EVENTS.CONSULTATION_STARTED, {
      queueEntryId: entry.id,
      startedAt: entry.startedAt!.toISOString(),
    });
    await emitQueueUpdate(entry.doctorProfileId);
    const summary = await emitEntryUpdate(entry.id);
    io.to(CLINIC_ROOM).emit(SOCKET_EVENTS.CLINIC_ACTIVITY, {
      type: "STARTED",
      doctorName: summary.doctorName,
      patientName: `${summary.patient.firstName} ${summary.patient.lastName}`,
      serviceName: summary.services.map((s) => s.name).join(", "),
      at: summary.startedAt ?? new Date().toISOString(),
    });
    res.json(entry);
  }),
);

queueRouter.post(
  "/:id/skip",
  authorize("DOCTOR"),
  asyncHandler(async (req, res) => {
    await assertOwnsEntry(req.user!.sub, req.params.id);
    const entry = await queueService.skipPatient(req.params.id);
    await emitQueueUpdate(entry.doctorProfileId);
    await emitEntryUpdate(entry.id);
    res.json(entry);
  }),
);

queueRouter.post(
  "/:id/return",
  authorize("DOCTOR"),
  asyncHandler(async (req, res) => {
    await assertOwnsEntry(req.user!.sub, req.params.id);
    const entry = await queueService.returnToQueue(req.params.id);
    await emitQueueUpdate(entry.doctorProfileId);
    await emitEntryUpdate(entry.id);
    res.json(entry);
  }),
);

queueRouter.post(
  "/:id/complete",
  authorize("DOCTOR"),
  asyncHandler(async (req, res) => {
    await assertOwnsEntry(req.user!.sub, req.params.id);
    const { doctorProfileId, nextCurrentEntryId } = await queueService.completeConsultation(
      req.params.id,
    );
    const io = getIO();
    io.to(roomForDoctor(doctorProfileId)).emit(SOCKET_EVENTS.CONSULTATION_COMPLETED, {
      queueEntryId: req.params.id,
      completedAt: new Date().toISOString(),
      nextCurrentEntryId,
    });
    const summary = await emitEntryUpdate(req.params.id);
    io.to(CLINIC_ROOM).emit(SOCKET_EVENTS.CLINIC_ACTIVITY, {
      type: "COMPLETED",
      doctorName: summary.doctorName,
      patientName: `${summary.patient.firstName} ${summary.patient.lastName}`,
      serviceName: summary.services.map((s) => s.name).join(", "),
      at: summary.completedAt ?? new Date().toISOString(),
    });
    await emitQueueUpdate(doctorProfileId);
    res.json({ nextCurrentEntryId });
  }),
);
