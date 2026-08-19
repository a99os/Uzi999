import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/async-handler";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import * as servicesService from "./services.service";

export const servicesRouter = Router();
servicesRouter.use(authenticate);

servicesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const activeOnly = req.query.activeOnly === "true";
    const category = typeof req.query.category === "string" ? req.query.category : undefined;
    res.json(await servicesService.listServices({ activeOnly, category }));
  }),
);

const createServiceSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  price: z.number().nonnegative(),
  icon: z.string().optional(),
});

servicesRouter.post(
  "/",
  authorize("SUPER_ADMIN", "ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const input = createServiceSchema.parse(req.body);
    res.status(201).json(await servicesService.createService(input));
  }),
);

const generalEditSchema = createServiceSchema.partial();

servicesRouter.patch(
  "/:id",
  authorize("SUPER_ADMIN", "ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const input = generalEditSchema.parse(req.body);
    res.json(await servicesService.updateService(req.params.id, input));
  }),
);

const activeSchema = z.object({ isActive: z.boolean() });

servicesRouter.patch(
  "/:id/active",
  authorize("SUPER_ADMIN", "ADMIN"),
  asyncHandler(async (req, res) => {
    const { isActive } = activeSchema.parse(req.body);
    res.json(await servicesService.updateService(req.params.id, { isActive }));
  }),
);

servicesRouter.delete(
  "/:id",
  authorize("SUPER_ADMIN", "ADMIN"),
  asyncHandler(async (req, res) => {
    await servicesService.deleteService(req.params.id);
    res.status(204).end();
  }),
);
