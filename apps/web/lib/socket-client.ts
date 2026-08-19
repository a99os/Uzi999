import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@anora/shared-types";
import { API_URL } from "./api-client";

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;

export function connectSocket(accessToken: string): AppSocket {
  if (socket) {
    socket.disconnect();
  }
  socket = io(API_URL, {
    auth: { token: accessToken },
    withCredentials: true,
    transports: ["websocket", "polling"],
  });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export function getSocket(): AppSocket | null {
  return socket;
}
