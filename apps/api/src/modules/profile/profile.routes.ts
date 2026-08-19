import fs from "node:fs";
import path from "node:path";
import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { parseFile } from "music-metadata";
import type { RoleName } from "@anora/shared-types";
import { asyncHandler } from "../../lib/async-handler";
import { authenticate } from "../../middleware/authenticate";
import { prisma } from "../../db/prisma";
import { HttpError } from "../../middleware/error-handler";
import { soundUpload } from "./sound-upload.middleware";

export const profileRouter = Router();
profileRouter.use(authenticate);

profileRouter.get(
  "/me",
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.sub },
      include: { roles: { include: { role: true } }, doctorProfile: true },
    });
    if (!user) throw new HttpError(404, "User not found");
    res.json({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      email: user.email,
      soundEnabled: user.soundEnabled,
      customSoundUrl: user.customSoundUrl,
      roles: user.roles.map((r) => r.role.name as RoleName),
      doctorProfile: user.doctorProfile,
    });
  }),
);

const nameSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

profileRouter.patch(
  "/me/name",
  asyncHandler(async (req, res) => {
    const { firstName, lastName } = nameSchema.parse(req.body);
    await prisma.user.update({ where: { id: req.user!.sub }, data: { firstName, lastName } });
    res.status(204).end();
  }),
);

const soundSchema = z.object({ soundEnabled: z.boolean() });

profileRouter.patch(
  "/me/sound",
  asyncHandler(async (req, res) => {
    const { soundEnabled } = soundSchema.parse(req.body);
    await prisma.user.update({ where: { id: req.user!.sub }, data: { soundEnabled } });
    res.status(204).end();
  }),
);

async function deleteExistingSoundFile(url: string | null) {
  if (!url) return;
  const filePath = path.resolve(process.cwd(), url.replace(/^\//, ""));
  await fs.promises.unlink(filePath).catch(() => {});
}

profileRouter.post(
  "/me/sound-upload",
  soundUpload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new HttpError(400, "No file uploaded");
    const metadata = await parseFile(req.file.path);
    const durationSec = metadata.format.duration ?? 0;
    if (durationSec > 5.5) {
      await fs.promises.unlink(req.file.path).catch(() => {});
      throw new HttpError(400, "Sound must be 5 seconds or shorter");
    }
    const url = `/uploads/sounds/${req.file.filename}`;
    const existing = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.sub } });
    await deleteExistingSoundFile(existing.customSoundUrl);
    await prisma.user.update({ where: { id: req.user!.sub }, data: { customSoundUrl: url } });
    res.status(200).json({ customSoundUrl: url });
  }),
);

profileRouter.delete(
  "/me/sound-upload",
  asyncHandler(async (req, res) => {
    const existing = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.sub } });
    await deleteExistingSoundFile(existing.customSoundUrl);
    await prisma.user.update({ where: { id: req.user!.sub }, data: { customSoundUrl: null } });
    res.status(204).end();
  }),
);

const usernameSchema = z.object({ username: z.string().min(3) });

profileRouter.patch(
  "/me/username",
  asyncHandler(async (req, res) => {
    const { username } = usernameSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing && existing.id !== req.user!.sub) {
      throw new HttpError(409, "Username already taken");
    }
    await prisma.user.update({ where: { id: req.user!.sub }, data: { username } });
    res.status(204).end();
  }),
);

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

profileRouter.patch(
  "/me/password",
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = passwordSchema.parse(req.body);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.sub } });
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new HttpError(401, "Current password is incorrect");
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: req.user!.sub }, data: { passwordHash } });
    res.status(204).end();
  }),
);
