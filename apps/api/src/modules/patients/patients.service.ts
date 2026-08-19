import { prisma } from "../../db/prisma";
import { HttpError } from "../../middleware/error-handler";

export async function searchPatients(query: string) {
  if (!query.trim()) return [];
  const parts = query.trim().split(/\s+/);
  const yearPart = parts.find((p) => /^\d{4}$/.test(p));
  const nameParts = parts.filter((p) => p !== yearPart);

  return prisma.patient.findMany({
    where: {
      AND: [
        yearPart ? { birthYear: Number(yearPart) } : {},
        nameParts.length
          ? {
              OR: nameParts.flatMap((p) => [
                { firstName: { contains: p, mode: "insensitive" as const } },
                { lastName: { contains: p, mode: "insensitive" as const } },
              ]),
            }
          : {},
      ],
    },
    orderBy: { updatedAt: "desc" },
    take: 10,
    include: {
      queueEntries: {
        orderBy: { registeredAt: "desc" },
        take: 1,
        select: { registeredAt: true },
      },
    },
  });
}

export async function createPatient(
  input: { firstName: string; lastName: string; birthYear: number; phone?: string },
  opts: { force?: boolean } = {},
) {
  if (!opts.force) {
    const existing = await prisma.patient.findFirst({
      where: {
        firstName: { equals: input.firstName, mode: "insensitive" },
        lastName: { equals: input.lastName, mode: "insensitive" },
        birthYear: input.birthYear,
      },
    });
    if (existing) {
      throw new HttpError(409, "A patient with this name and birth year already exists", {
        possibleDuplicate: existing,
      });
    }
  }
  return prisma.patient.create({ data: input });
}

export async function getPatientProfile(id: string) {
  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      queueEntries: {
        orderBy: { registeredAt: "desc" },
        include: {
          services: { include: { service: true } },
          doctor: { include: { user: true } },
          consultation: true,
        },
      },
    },
  });
  if (!patient) throw new HttpError(404, "Patient not found");
  return patient;
}

export async function listPatients(query?: string) {
  if (!query?.trim()) {
    return prisma.patient.findMany({ orderBy: { updatedAt: "desc" }, take: 50 });
  }
  return searchPatients(query);
}

export async function deletePatient(id: string) {
  const patient = await prisma.patient.findUnique({ where: { id } });
  if (!patient) throw new HttpError(404, "Patient not found");
  const entries = await prisma.queueEntry.findMany({
    where: { patientId: id },
    select: { id: true },
  });
  const entryIds = entries.map((e) => e.id);
  // Consultation and QueueEntryService both reference QueueEntry; QueueEntryService
  // cascades automatically, Consultation doesn't, so it must go first.
  await prisma.$transaction([
    prisma.consultation.deleteMany({ where: { queueEntryId: { in: entryIds } } }),
    prisma.queueEntry.deleteMany({ where: { patientId: id } }),
    prisma.patient.delete({ where: { id } }),
  ]);
}
