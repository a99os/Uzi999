import { Router } from "express";
import { z } from "zod";
import { ROLE_NAMES, USER_STATUSES } from "@anora/shared-types";
import { asyncHandler } from "../../lib/async-handler";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { HttpError } from "../../middleware/error-handler";
import { prisma } from "../../db/prisma";
import * as usersService from "./users.service";

export const usersRouter = Router();
usersRouter.use(authenticate, authorize("SUPER_ADMIN", "ADMIN"));

function assertCanGrantRoles(callerRoles: string[], targetRoles: string[]) {
  if (targetRoles.includes("SUPER_ADMIN") && !callerRoles.includes("SUPER_ADMIN")) {
    throw new HttpError(403, "Only a Super Admin can grant the Super Admin role");
  }
}

async function assertCanManageTarget(callerRoles: string[], callerId: string, targetUserId: string) {
  if (callerRoles.includes("SUPER_ADMIN")) return;
  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    include: { roles: { include: { role: true } } },
  });
  if (!target) throw new HttpError(404, "User not found");
  const targetRoles = target.roles.map((r) => r.role.name);
  if (targetRoles.includes("SUPER_ADMIN")) {
    throw new HttpError(403, "Only a Super Admin can manage Super Admin accounts");
  }
  if (
    targetRoles.includes("ADMIN") &&
    target.createdById !== null &&
    target.createdById !== callerId
  ) {
    throw new HttpError(403, "You can only manage Admin accounts you created yourself");
  }
}

usersRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json(await usersService.listUsers());
  }),
);

const createUserSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  username: z.string().min(3),
  email: z.string().email().optional(),
  password: z.string().min(8),
  roles: z.array(z.enum(ROLE_NAMES)).min(1),
  specialization: z.string().optional(),
  workingSchedule: z.record(z.string(), z.unknown()).optional(),
});

usersRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = createUserSchema.parse(req.body);
    assertCanGrantRoles(req.user!.roles, input.roles);
    res.status(201).json(await usersService.createUser({ ...input, createdById: req.user!.sub }));
  }),
);

const updateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  username: z.string().min(3).optional(),
  password: z.string().min(8).optional(),
  status: z.enum(USER_STATUSES).optional(),
  roles: z.array(z.enum(ROLE_NAMES)).min(1).optional(),
  specialization: z.string().optional(),
  workingSchedule: z.record(z.string(), z.unknown()).optional(),
});

usersRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const input = updateUserSchema.parse(req.body);
    await assertCanManageTarget(req.user!.roles, req.user!.sub, req.params.id);
    if (input.roles) assertCanGrantRoles(req.user!.roles, input.roles);
    res.json(await usersService.updateUser(req.params.id, input));
  }),
);

usersRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await assertCanManageTarget(req.user!.roles, req.user!.sub, req.params.id);
    await usersService.deactivateUser(req.params.id);
    res.status(204).end();
  }),
);
