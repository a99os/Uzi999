import { prisma } from "../../db/prisma";
import type { DoctorSummary } from "@anora/shared-types";

export async function listDoctors(): Promise<DoctorSummary[]> {
  const doctors = await prisma.doctorProfile.findMany({
    include: {
      user: { include: { roles: { include: { role: true } } } },
      queueEntries: {
        where: { status: { in: ["WAITING", "IN_CONSULTATION"] } },
        select: { status: true },
      },
    },
    orderBy: { user: { firstName: "asc" } },
  });

  return doctors
    .filter(
      (d) =>
        d.user.status === "ACTIVE" &&
        d.user.roles.some((r) => r.role.name === "DOCTOR"),
    )
    .map((d) => ({
      id: d.id,
      userId: d.userId,
      firstName: d.user.firstName,
      lastName: d.user.lastName,
      specialization: d.specialization,
      avatarUrl: d.avatarUrl,
      isBusy: d.queueEntries.some((q) => q.status === "IN_CONSULTATION"),
      waitingCount: d.queueEntries.filter((q) => q.status === "WAITING").length,
    }));
}
