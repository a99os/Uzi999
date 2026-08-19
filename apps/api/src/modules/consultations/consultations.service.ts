import { prisma } from "../../db/prisma";
import { HttpError } from "../../middleware/error-handler";

export async function getConsultation(queueEntryId: string) {
  return prisma.consultation.findUnique({ where: { queueEntryId } });
}

export async function upsertConsultation(
  queueEntryId: string,
  doctorUserId: string,
  fields: {
    diagnosis?: string;
    medicalNotes?: string;
    prescription?: string;
    recommendations?: string;
    followUpDate?: Date | null;
  },
) {
  const entry = await prisma.queueEntry.findUnique({ where: { id: queueEntryId } });
  if (!entry) throw new HttpError(404, "Queue entry not found");

  const myProfile = await prisma.doctorProfile.findUnique({ where: { userId: doctorUserId } });
  if (!myProfile || myProfile.id !== entry.doctorProfileId) {
    throw new HttpError(403, "You can only edit consultations for your own patients");
  }

  return prisma.consultation.upsert({
    where: { queueEntryId },
    create: {
      queueEntryId,
      doctorProfileId: entry.doctorProfileId,
      doctorUserId,
      ...fields,
    },
    update: fields,
  });
}
