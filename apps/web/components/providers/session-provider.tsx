"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { SOCKET_EVENTS } from "@anora/shared-types";
import { useAuthStore } from "@/lib/auth-store";
import { hydrateSession } from "@/lib/auth";
import { apiFetch } from "@/lib/api-client";
import { connectSocket, disconnectSocket } from "@/lib/socket-client";
import { useNotificationsStore } from "@/lib/stores/notifications-store";
import { useQueueStore } from "@/lib/stores/queue-store";
import { playNotificationDing } from "@/lib/notification-sound";

const SESSION_COOKIE = "anora_has_session";

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const status = useAuthStore((s) => s.status);
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    hydrateSession().finally(() => {
      if (useAuthStore.getState().status === "loading") {
        useAuthStore.getState().clear();
      }
    });
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      document.cookie = `${SESSION_COOKIE}=1; path=/; SameSite=Lax`;
    } else if (status === "unauthenticated") {
      document.cookie = `${SESSION_COOKIE}=; path=/; Max-Age=0`;
    }
  }, [status]);

  useEffect(() => {
    if (!accessToken || !user) return;

    const socket = connectSocket(accessToken);

    apiFetch("/notifications").then((items) => {
      useNotificationsStore.getState().setAll(items as never);
    });

    if (user.roles.includes("DOCTOR") && user.doctorProfile) {
      apiFetch(`/queue/doctor/${user.doctorProfile.id}`).then((entries) => {
        useQueueStore.getState().setQueue(user.doctorProfile!.id, entries as never);
      });
    }

    socket.on(SOCKET_EVENTS.NOTIFICATION_NEW, (payload) => {
      useNotificationsStore.getState().add(payload);
      toast.success(payload.title, { description: payload.body });
      if (user.soundEnabled) playNotificationDing(user.customSoundUrl);
    });

    socket.on(SOCKET_EVENTS.QUEUE_UPDATED, (payload) => {
      if (user.doctorProfile && payload.doctorProfileId === user.doctorProfile.id) {
        useQueueStore.getState().setQueue(payload.doctorProfileId, payload.entries);
      }
    });

    socket.on(SOCKET_EVENTS.PATIENT_REGISTERED, (payload) => {
      useQueueStore.getState().flagJustRegistered(payload.id);
    });

    return () => {
      disconnectSocket();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  return <>{children}</>;
}
