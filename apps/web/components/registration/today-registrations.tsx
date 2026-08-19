"use client";

import { useCallback, useEffect, useImperativeHandle } from "react";
import { useState, forwardRef } from "react";
import { format } from "date-fns";
import { useTranslations } from "next-intl";
import { SOCKET_EVENTS, type QueueEntrySummary } from "@anora/shared-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api-client";
import { getSocket } from "@/lib/socket-client";
import { cn } from "@/lib/utils";

type EntryWithDoctor = QueueEntrySummary & { doctorName?: string };

export interface TodayRegistrationsHandle {
  refresh: () => void;
}

const STATUS_TONE: Record<string, string> = {
  WAITING: "bg-status-waiting-bg text-status-waiting",
  IN_CONSULTATION: "bg-status-consultation-bg text-status-consultation",
  COMPLETED: "bg-status-completed-bg text-status-completed",
};

export const TodayRegistrations = forwardRef<
  TodayRegistrationsHandle,
  { mode: "any-doctor" | "self-only"; selfDoctorProfileId?: string }
>(function TodayRegistrations({ mode, selfDoctorProfileId }, ref) {
  const t = useTranslations("registration");
  const STATUS_LABEL: Record<string, string> = {
    WAITING: t("statusWaiting"),
    IN_CONSULTATION: t("statusInConsultation"),
    COMPLETED: t("statusCompleted"),
  };
  const [entries, setEntries] = useState<EntryWithDoctor[]>([]);

  const load = useCallback(async () => {
    if (mode === "any-doctor") {
      const data = await apiFetch<EntryWithDoctor[]>("/queue/registered-today");
      setEntries(data);
    } else if (selfDoctorProfileId) {
      const [active, completed] = await Promise.all([
        apiFetch<QueueEntrySummary[]>(`/queue/doctor/${selfDoctorProfileId}`),
        apiFetch<QueueEntrySummary[]>(`/queue/doctor/${selfDoctorProfileId}/completed-today`),
      ]);
      setEntries(
        [...active, ...completed].sort(
          (a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime(),
        ),
      );
    }
  }, [mode, selfDoctorProfileId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handler = (updated: EntryWithDoctor) => {
      setEntries((prev) => {
        const idx = prev.findIndex((e) => e.id === updated.id);
        if (idx === -1) return prev;
        const next = [...prev];
        next[idx] = updated;
        return next;
      });
    };
    socket.on(SOCKET_EVENTS.QUEUE_ENTRY_UPDATED, handler);
    return () => {
      socket.off(SOCKET_EVENTS.QUEUE_ENTRY_UPDATED, handler);
    };
  }, []);

  useImperativeHandle(ref, () => ({ refresh: load }), [load]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("todayRegistrations")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {entries.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("noneToday")}</p>
        )}
        {entries.map((entry) => (
          <div key={entry.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-bold">
              #{entry.queueNumber}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {entry.patient.lastName} {entry.patient.firstName}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {entry.services.map((s) => s.name).join(", ")}
                {entry.doctorName && ` · ${entry.doctorName}`}
              </p>
            </div>
            <div className="text-right">
              <Badge className={cn("text-[11px]", STATUS_TONE[entry.status])}>
                {STATUS_LABEL[entry.status]}
              </Badge>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {format(new Date(entry.registeredAt), "HH:mm")}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
});
