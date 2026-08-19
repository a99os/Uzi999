import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import {
  CLINIC_ROOM,
  roomForDoctor,
  roomForUser,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from "@anora/shared-types";
import { verifyAccessToken } from "../modules/auth/jwt";
import { prisma } from "../db/prisma";
import { env } from "../config/env";

export type AppIO = Server<ClientToServerEvents, ServerToClientEvents>;

let io: AppIO | null = null;

export function initSocketServer(httpServer: HttpServer): AppIO {
  io = new Server(httpServer, {
    cors: { origin: env.corsOrigin, credentials: true },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) return next(new Error("Missing token"));
      const payload = verifyAccessToken(token);
      socket.data.user = payload;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", async (socket) => {
    const user = socket.data.user as ReturnType<typeof verifyAccessToken>;
    socket.join(roomForUser(user.sub));

    if (user.roles.includes("DOCTOR")) {
      const profile = await prisma.doctorProfile.findUnique({
        where: { userId: user.sub },
        select: { id: true },
      });
      if (profile) socket.join(roomForDoctor(profile.id));
    }

    if (user.roles.includes("ADMIN") || user.roles.includes("MANAGER")) {
      socket.join(CLINIC_ROOM);
    }
  });

  return io;
}

export function getIO(): AppIO {
  if (!io) throw new Error("Socket.io server not initialized");
  return io;
}
