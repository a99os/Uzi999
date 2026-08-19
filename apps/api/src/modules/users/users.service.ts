import bcrypt from "bcryptjs";
import type { RoleName } from "@anora/shared-types";
import { prisma } from "../../db/prisma";
import { HttpError } from "../../middleware/error-handler";

export async function listUsers() {
  return prisma.user.findMany({
    // Super Admin is a hidden oversight account — it never appears in the
    // regular Users management list, even to other Super Admins.
    where: { roles: { none: { role: { name: "SUPER_ADMIN" } } } },
    include: { roles: { include: { role: true } }, doctorProfile: true },
    orderBy: { firstName: "asc" },
  });
}

async function ensureRoles(names: RoleName[]) {
  const roles = await prisma.role.findMany({ where: { name: { in: names } } });
  if (roles.length !== names.length) throw new HttpError(400, "Unknown role");
  return roles;
}

export async function createUser(input: {
  firstName: string;
  lastName: string;
  username: string;
  email?: string;
  password: string;
  roles: RoleName[];
  specialization?: string;
  workingSchedule?: unknown;
  createdById: string;
}) {
  if (input.roles.length === 0) throw new HttpError(400, "At least one role is required");
  const roles = await ensureRoles(input.roles);

  const existingUsername = await prisma.user.findUnique({ where: { username: input.username } });
  if (existingUsername) throw new HttpError(409, "Username already taken");

  const passwordHash = await bcrypt.hash(input.password, 12);

  return prisma.user.create({
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      username: input.username,
      email: input.email,
      passwordHash,
      createdById: input.createdById,
      roles: { create: roles.map((r) => ({ roleId: r.id })) },
      doctorProfile: input.roles.includes("DOCTOR")
        ? {
            create: {
              specialization: input.specialization ?? "General Practice",
              workingSchedule: (input.workingSchedule ?? null) as never,
            },
          }
        : undefined,
    },
    include: { roles: { include: { role: true } }, doctorProfile: true },
  });
}

export async function updateUser(
  id: string,
  input: Partial<{
    firstName: string;
    lastName: string;
    username: string;
    password: string;
    status: "ACTIVE" | "INACTIVE";
    roles: RoleName[];
    specialization: string;
    workingSchedule: unknown;
  }>,
) {
  const user = await prisma.user.findUnique({ where: { id }, include: { doctorProfile: true } });
  if (!user) throw new HttpError(404, "User not found");

  if (input.username && input.username !== user.username) {
    const existing = await prisma.user.findUnique({ where: { username: input.username } });
    if (existing) throw new HttpError(409, "Username already taken");
  }

  if (input.roles) {
    const roles = await ensureRoles(input.roles);
    await prisma.userRole.deleteMany({ where: { userId: id } });
    await prisma.userRole.createMany({ data: roles.map((r) => ({ userId: id, roleId: r.id })) });

    if (input.roles.includes("DOCTOR") && !user.doctorProfile) {
      await prisma.doctorProfile.create({
        data: { userId: id, specialization: input.specialization ?? "General Practice" },
      });
    }
  }

  if ((input.specialization || input.workingSchedule) && user.doctorProfile) {
    await prisma.doctorProfile.update({
      where: { userId: id },
      data: {
        ...(input.specialization ? { specialization: input.specialization } : {}),
        ...(input.workingSchedule ? { workingSchedule: input.workingSchedule as never } : {}),
      },
    });
  }

  const passwordHash = input.password ? await bcrypt.hash(input.password, 12) : undefined;

  return prisma.user.update({
    where: { id },
    data: {
      ...(input.firstName ? { firstName: input.firstName } : {}),
      ...(input.lastName ? { lastName: input.lastName } : {}),
      ...(input.username ? { username: input.username } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(passwordHash ? { passwordHash } : {}),
    },
    include: { roles: { include: { role: true } }, doctorProfile: true },
  });
}

export async function deactivateUser(id: string) {
  return prisma.user.update({ where: { id }, data: { status: "INACTIVE" } });
}
