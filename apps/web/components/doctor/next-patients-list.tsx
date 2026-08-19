"use client";

import type { QueueEntrySummary } from "@anora/shared-types";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getServiceIcon } from "@/lib/icon-map";
import { apiFetch } from "@/lib/api-client";
import { useConfirm } from "@/components/providers/confirm-provider";
import { SkipForward } from "lucide-react";

export function NextPatientsList({
  entries,
  onChanged,
}: {
  entries: QueueEntrySummary[];
  onChanged: () => void;
}) {
  const t = useTranslations("doctorDashboard");
  const confirm = useConfirm();

  async function skip(entry: QueueEntrySummary) {
    const ok = await confirm({
      title: t("skipConfirmTitle", { name: `${entry.patient.firstName} ${entry.patient.lastName}` }),
      description: t("skipConfirmDesc"),
      confirmLabel: t("skipConfirmLabel"),
    });
    if (!ok) return;
    await apiFetch(`/queue/${entry.id}/skip`, { method: "POST" });
    onChanged();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("nextPatients")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {entries.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("queueEmpty")}</p>
        )}
        {entries.map((entry) => {
          const Icon = getServiceIcon(entry.services[0]?.icon ?? null);
          return (
            <div
              key={entry.id}
              className="flex items-center gap-3 rounded-xl border border-border p-3"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-status-waiting-bg text-sm font-bold text-status-waiting">
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
              <Button size="icon" variant="ghost" title={t("skip")} onClick={() => skip(entry)}>
                <SkipForward className="size-4" />
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
