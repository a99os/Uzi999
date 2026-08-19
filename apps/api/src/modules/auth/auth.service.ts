import bcrypt from "bcryptjs";
import type { RoleName } from "@anora/shared-types";
import { prisma } from "../../db/prisma";
import { HttpError } from "../../middleware/error-handler";
import {
  generateRefreshToken,
  hashRefreshToken,
  signAccessToken,
} from "./jwt";

async function loadUserWithRoles(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { roles: { include: { role: true } } },
  });
  if (!user) throw new HttpError(401, "User not found");
  const roles = user.roles.map((r) => r.role.name as RoleName);
  return { user, roles };
}

function issueTokens(userId: string, roles: RoleName[]) {
  const accessToken = signAccessToken({ sub: userId, roles });
  const refresh = generateRefreshToken();
  return { accessToken, refresh };
}

export async function login(username: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { username },
    include: { roles: { include: { role: true } } },
  });
  if (!user || user.status !== "ACTIVE") {
    throw new HttpError(401, "Invalid username or password");
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new HttpError(401, "Invalid username or password");

  const roles = user.roles.map((r) => r.role.name as RoleName);
  if (roles.length === 0) throw new HttpError(403, "User has no assigned roles");

  const { accessToken, refresh } = issueTokens(user.id, roles);
  await prisma.refreshToken.create({
    data: { userId: user.id, tokenHash: refresh.hash, expiresAt: refresh.expiresAt },
  });
  await prisma.user.update({
    where: { id: user.id },
    data: { lastActiveAt: new Date() },
  });

  return {
    accessToken,
    refreshToken: refresh.token,
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      roles,
      soundEnabled: user.soundEnabled,
    },
  };
}

export async function refresh(refreshToken: string) {
  const hash = hashRefreshToken(refreshToken);
  const stored = await prisma.refreshToken.findFirst({
    where: { tokenHash: hash, revokedAt: null },
  });
  if (!stored || stored.expiresAt < new Date()) {
    throw new HttpError(401, "Invalid or expired refresh token");
  }

  const { roles } = await loadUserWithRoles(stored.userId);
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  const { accessToken, refresh: newRefresh } = issueTokens(stored.userId, roles);
  await prisma.refreshToken.create({
    data: {
      userId: stored.userId,
      tokenHash: newRefresh.hash,
      expiresAt: newRefresh.expiresAt,
    },
  });

  return { accessToken, refreshToken: newRefresh.token };
}

export async function logout(refreshToken: string) {
  const hash = hashRefreshToken(refreshToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
