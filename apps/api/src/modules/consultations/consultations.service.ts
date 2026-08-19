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
