import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/async-handler";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import * as patientsService from "./patients.service";

export const patientsRouter = Router();
patientsRouter.use(authenticate);

patientsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    res.json(await patientsService.listPatients(q));
  }),
);

patientsRouter.get(
  "/search",
  asyncHandler(async (req, res) => {
    const q = typeof req.query.q === "string" ? req.query.q : "";
    res.json(await patientsService.searchPatients(q));
  }),
);

const createPatientSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  birthYear: z.number().int().min(1900).max(new Date().getFullYear()),
  phone: z.string().optional(),
  force: z.boolean().optional(),
});

patientsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const { force, ...input } = createPatientSchema.parse(req.body);
    const patient = await patientsService.createPatient(input, { force });
    res.status(201).json(patient);
  }),
);

patientsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    res.json(await patientsService.getPatientProfile(req.params.id));
  }),
);

patientsRouter.delete(
  "/:id",
  authorize("SUPER_ADMIN", "ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    await patientsService.deletePatient(req.params.id);
    res.status(204).end();
  }),
);
