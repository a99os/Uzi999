import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { authenticate } from "../../middleware/authenticate";
import * as notificationsService from "./notifications.service";

export const notificationsRouter = Router();
notificationsRouter.use(authenticate);

notificationsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json(await notificationsService.listNotifications(req.user!.sub));
  }),
);

notificationsRouter.post(
  "/:id/read",
  asyncHandler(async (req, res) => {
    await notificationsService.markAsRead(req.user!.sub, req.params.id);
    res.status(204).end();
  }),
);

notificationsRouter.post(
  "/read-all",
  asyncHandler(async (req, res) => {
    await notificationsService.markAllAsRead(req.user!.sub);
    res.status(204).end();
  }),
);
