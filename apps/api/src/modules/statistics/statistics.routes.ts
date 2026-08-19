import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/async-handler";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { prisma } from "../../db/prisma";
import * as statisticsService from "./statistics.service";

export const statisticsRouter = Router();
statisticsRouter.use(authenticate);

statisticsRouter.get(
  "/my-overview",
  authorize("DOCTOR"),
  asyncHandler(async (req, res) => {
    const doctor = await prisma.doctorProfile.findUnique({ where: { userId: req.user!.sub } });
    if (!doctor) return res.json({ totalPatients: 0, completedVisits: 0, waitingPatients: 0, cancelledVisits: 0, revenue: 0, avgWaitMinutes: 0 });
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date();
    res.json(await statisticsService.getOverview({ from, to, doctorProfileId: doctor.id }));
  }),
);

statisticsRouter.get(
  "/my-by-service",
  authorize("DOCTOR"),
  asyncHandler(async (req, res) => {
    const doctor = await prisma.doctorProfile.findUnique({ where: { userId: req.user!.sub } });
    if (!doctor) return res.json([]);
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date();
    res.json(await statisticsService.getByService({ from, to, doctorProfileId: doctor.id }));
  }),
);

statisticsRouter.use(authorize("SUPER_ADMIN", "ADMIN", "MANAGER"));

const rangeSchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
  doctorProfileId: z.string().optional(),
  serviceId: z.string().optional(),
});

function parseRange(query: unknown) {
  const { from, to, doctorProfileId, serviceId } = rangeSchema.parse(query);
  return { from: new Date(from), to: new Date(to), doctorProfileId, serviceId };
}

statisticsRouter.get(
  "/overview",
  asyncHandler(async (req, res) => {
    res.json(await statisticsService.getOverview(parseRange(req.query)));
  }),
);

statisticsRouter.get(
  "/patients-by-day",
  asyncHandler(async (req, res) => {
    res.json(await statisticsService.getPatientsByDay(parseRange(req.query)));
  }),
);

statisticsRouter.get(
  "/recent-activity",
  asyncHandler(async (_req, res) => {
    res.json(await statisticsService.getRecentActivity());
  }),
);

statisticsRouter.get(
  "/by-doctor",
  asyncHandler(async (req, res) => {
    res.json(await statisticsService.getByDoctor(parseRange(req.query)));
  }),
);

statisticsRouter.get(
  "/by-service",
  asyncHandler(async (req, res) => {
    res.json(await statisticsService.getByService(parseRange(req.query)));
  }),
);
