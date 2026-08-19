"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api-client";
import type { DoctorSummary, QueueEntrySummary } from "@anora/shared-types";
import { cn } from "@/lib/utils";

const STATUS_TONE: Record<string, string> = {
  WAITING: "bg-status-waiting-bg text-status-waiting",
  IN_CONSULTATION: "bg-status-consultation-bg text-status-consultation",
};

export function LiveQueueBoard({ compact }: { compact?: boolean } = {}) {
  const [doctors, setDoctors] = useState<DoctorSummary[]>([]);
  const [queues, setQueues] = useState<Record<string, QueueEntrySummary[]>>({});

  useEffect(() => {
    apiFetch<DoctorSummary[]>("/doctors").then(async (list) => {
      setDoctors(list);
      const entries = await Promise.all(
        list.map((d) => apiFetch<QueueEntrySummary[]>(`/queue/doctor/${d.id}`)),
      );
      const map: Record<string, QueueEntrySummary[]> = {};
      list.forEach((d, i) => (map[d.id] = entries[i]));
      setQueues(map);
    });
  }, []);

  return (
    <div
      className={cn(
        "grid gap-4",
        compact ? "grid-cols-1" : "md:grid-cols-2 xl:grid-cols-3",
      )}
    >
      {doctors.map((d) => (
        <Card key={d.id}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span>
                Dr. {d.firstName} {d.lastName}
              </span>
              <Badge variant="secondary">{queues[d.id]?.length ?? 0}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(queues[d.id] ?? []).map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 rounded-lg border border-border p-2"
              >
                <span className="text-lg font-bold text-primary">#{entry.queueNumber}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {entry.patient.lastName} {entry.patient.firstName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {entry.services.map((s) => s.name).join(", ")}
                  </p>
                </div>
                <Badge className={cn("text-[11px]", STATUS_TONE[entry.status])}>
                  {entry.status === "IN_CONSULTATION" ? "In consultation" : "Waiting"}
                </Badge>
              </div>
            ))}
            {(queues[d.id]?.length ?? 0) === 0 && (
              <p className="py-3 text-center text-xs text-muted-foreground">Queue empty</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
