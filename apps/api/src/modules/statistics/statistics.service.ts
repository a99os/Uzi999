import { prisma } from "../../db/prisma";

interface RangeInput {
  from: Date;
  to: Date;
  doctorProfileId?: string;
  serviceId?: string;
}

export async function getOverview({ from, to, doctorProfileId, serviceId }: RangeInput) {
  const where = {
    registeredAt: { gte: from, lte: to },
    ...(doctorProfileId ? { doctorProfileId } : {}),
    ...(serviceId ? { services: { some: { serviceId } } } : {}),
  };

  const [total, completed, waiting, cancelled, revenue, completedEntries] = await Promise.all([
    prisma.queueEntry.count({ where }),
    prisma.queueEntry.count({ where: { ...where, status: "COMPLETED" } }),
    prisma.queueEntry.count({ where: { ...where, status: "WAITING" } }),
    prisma.queueEntry.count({ where: { ...where, status: "CANCELLED" } }),
    prisma.queueEntry.aggregate({
      where: { ...where, status: "COMPLETED" },
      _sum: { totalPrice: true },
    }),
    prisma.queueEntry.findMany({
      where: { ...where, status: "COMPLETED", startedAt: { not: null }, completedAt: { not: null } },
      select: { startedAt: true, completedAt: true },
    }),
  ]);

  const avgWaitMinutes =
    completedEntries.length === 0
      ? 0
      : Math.round(
          completedEntries.reduce(
            (sum, e) => sum + (e.completedAt!.getTime() - e.startedAt!.getTime()) / 60000,
            0,
          ) / completedEntries.length,
        );

  return {
    totalPatients: total,
    completedVisits: completed,
    waitingPatients: waiting,
    cancelledVisits: cancelled,
    revenue: Number(revenue._sum.totalPrice ?? 0),
    avgWaitMinutes,
  };
}

export async function getPatientsByDay({ from, to }: RangeInput) {
  const entries = await prisma.queueEntry.findMany({
    where: { registeredAt: { gte: from, lte: to } },
    select: { registeredAt: true },
  });
  const byDay = new Map<string, number>();
  for (const e of entries) {
    const key = e.registeredAt.toISOString().slice(0, 10);
    byDay.set(key, (byDay.get(key) ?? 0) + 1);
  }
  return Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));
}

export async function getByDoctor({ from, to }: RangeInput) {
  const [grouped, revenueGrouped] = await Promise.all([
    prisma.queueEntry.groupBy({
      by: ["doctorProfileId"],
      where: { registeredAt: { gte: from, lte: to } },
      _count: { _all: true },
    }),
    // Revenue only counts completed visits, matching getOverview's semantics.
    prisma.queueEntry.groupBy({
      by: ["doctorProfileId"],
      where: { registeredAt: { gte: from, lte: to }, status: "COMPLETED" },
      _sum: { totalPrice: true },
    }),
  ]);
  const doctors = await prisma.doctorProfile.findMany({
    where: { id: { in: grouped.map((g) => g.doctorProfileId) } },
    include: { user: true },
  });
  return grouped.map((g) => {
    const doctor = doctors.find((d) => d.id === g.doctorProfileId);
    const rev = revenueGrouped.find((r) => r.doctorProfileId === g.doctorProfileId);
    return {
      doctorProfileId: g.doctorProfileId,
      doctorName: doctor ? `Dr. ${doctor.user.firstName} ${doctor.user.lastName}` : "Unknown",
      patients: g._count._all,
      revenue: Number(rev?._sum.totalPrice ?? 0),
    };
  });
}

export async function getRecentActivity(limit = 20) {
  const entries = await prisma.queueEntry.findMany({
    orderBy: { registeredAt: "desc" },
    take: limit,
    include: {
      patient: true,
      services: { include: { service: true } },
      doctor: { include: { user: true } },
    },
  });
  return entries.map((e) => ({
    type: e.status === "COMPLETED" ? "COMPLETED" : e.status === "IN_CONSULTATION" ? "STARTED" : "REGISTERED",
    doctorName: `Dr. ${e.doctor.user.firstName} ${e.doctor.user.lastName}`,
    patientName: `${e.patient.firstName} ${e.patient.lastName}`,
    serviceName: e.services.map((s) => s.service.name).join(", "),
    at: (e.completedAt ?? e.startedAt ?? e.registeredAt).toISOString(),
  }));
}

export async function getByService({ from, to, doctorProfileId }: RangeInput) {
  const grouped = await prisma.queueEntryService.groupBy({
    by: ["serviceId"],
    where: {
      queueEntry: {
        registeredAt: { gte: from, lte: to },
        ...(doctorProfileId ? { doctorProfileId } : {}),
      },
    },
    _count: { _all: true },
  });
  const services = await prisma.service.findMany({
    where: { id: { in: grouped.map((g) => g.serviceId) } },
  });
  return grouped.map((g) => {
    const service = services.find((s) => s.id === g.serviceId);
    return { serviceId: g.serviceId, serviceName: service?.name ?? "Unknown", patients: g._count._all };
  });
}
