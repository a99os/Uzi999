"use client";

import type { QueueEntrySummary } from "@anora/shared-types";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServiceIcon } from "@/lib/icon-map";
import { format } from "date-fns";

export function CompletedPatientsList({ entries }: { entries: QueueEntrySummary[] }) {
  const t = useTranslations("doctorDashboard");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("completedToday")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {entries.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t("noCompletedToday")}
          </p>
        )}
        {entries.map((entry) => {
          const Icon = getServiceIcon(entry.services[0]?.icon ?? null);
          return (
            <div
              key={entry.id}
              className="flex items-center gap-3 rounded-xl border border-border p-3 opacity-80"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-status-completed-bg text-sm font-bold text-status-completed">
                #{entry.queueNumber}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {entry.patient.lastName} {entry.patient.firstName}
                  <span className="ml-1.5 font-normal text-muted-foreground">
                    {entry.patient.birthYear}
                  </span>
                </p>
                <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                  <Icon className="size-3.5" />
                  {entry.services.map((s) => s.name).join(", ")}
                </p>
              </div>
              {entry.completedAt && (
                <span className="text-xs text-muted-foreground">
                  {format(new Date(entry.completedAt), "HH:mm")}
                </span>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
