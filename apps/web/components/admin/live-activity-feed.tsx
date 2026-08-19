"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { SOCKET_EVENTS, type ClinicActivityEvent } from "@anora/shared-types";
import { getSocket } from "@/lib/socket-client";
import { cn } from "@/lib/utils";

const DOT_TONE: Record<ClinicActivityEvent["type"], string> = {
  REGISTERED: "bg-status-waiting",
  STARTED: "bg-status-consultation",
  COMPLETED: "bg-status-completed",
  CANCELLED: "bg-status-cancelled",
};

export function LiveActivityFeed() {
  const t = useTranslations("adminDashboard");
  const LABEL: Record<ClinicActivityEvent["type"], string> = {
    REGISTERED: t("activityRegistered"),
    STARTED: t("activityStarted"),
    COMPLETED: t("activityCompleted"),
    CANCELLED: t("activityCancelled"),
  };
  const [events, setEvents] = useState<ClinicActivityEvent[]>([]);

  useEffect(() => {
    apiFetch<ClinicActivityEvent[]>("/statistics/recent-activity").then(setEvents);
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handler = (event: ClinicActivityEvent) => setEvents((prev) => [event, ...prev].slice(0, 20));
    socket.on(SOCKET_EVENTS.CLINIC_ACTIVITY, handler);
    return () => {
      socket.off(SOCKET_EVENTS.CLINIC_ACTIVITY, handler);
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("liveClinicActivity")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {events.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("noActivityToday")}</p>
        )}
        {events.map((event, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", DOT_TONE[event.type])} />
            <div className="min-w-0">
              <p className="text-sm">
                <span className="font-medium">{event.patientName}</span> {LABEL[event.type]}
                {event.type !== "REGISTERED" ? "" : ` — ${event.serviceName}`}
              </p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(event.at), "HH:mm")} · {event.doctorName}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
