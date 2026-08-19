"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { QueueEntrySummary } from "@anora/shared-types";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getServiceIcon } from "@/lib/icon-map";
import { useConfirm } from "@/components/providers/confirm-provider";
import { PatientVisitHistory } from "@/components/patients/patient-visit-history";
import { Clock, Play, SkipForward, RotateCcw, CheckCircle2, Loader2 } from "lucide-react";
import { format } from "date-fns";

export function CurrentPatientCard({
  entry,
  onChanged,
}: {
  entry: QueueEntrySummary | null;
  onChanged: () => void;
}) {
  const router = useRouter();
  const t = useTranslations("doctorDashboard");
  const confirm = useConfirm();
  const [busy, setBusy] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  async function run(
    action: string,
    confirmOptions: { title: string; description?: string; confirmLabel: string; destructive?: boolean },
    fn: () => Promise<unknown>,
  ) {
    const ok = await confirm(confirmOptions);
    if (!ok) return;
    setBusy(action);
    try {
      await fn();
      onChanged();
    } catch (err) {
      console.error(err instanceof ApiError ? err.message : err);
    } finally {
      setBusy(null);
    }
  }

  if (!entry) {
    return (
      <Card className="flex min-h-72 flex-col items-center justify-center border-dashed text-center">
        <CardContent className="pt-6">
          <p className="text-lg font-medium text-muted-foreground">{t("noPatientsWaiting")}</p>
          <p className="text-sm text-muted-foreground">{t("noPatientsWaitingDesc")}</p>
        </CardContent>
      </Card>
    );
  }

  const Icon = getServiceIcon(entry.services[0]?.icon ?? null);
  const waitingMinutes = Math.max(
    0,
    Math.round((now - new Date(entry.registeredAt).getTime()) / 60000),
  );
  const inConsultation = entry.status === "IN_CONSULTATION";

  return (
    <Card className="overflow-hidden border-2 border-primary/20 shadow-md">
      <div className="flex items-center justify-between bg-primary/5 px-6 py-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-primary">
          {t("currentPatient")}
        </span>
        <Badge
          className={
            inConsultation
              ? "bg-status-consultation-bg text-status-consultation"
              : "bg-status-waiting-bg text-status-waiting"
          }
        >
          {inConsultation ? t("statusInConsultation") : t("statusWaiting")}
        </Badge>
      </div>
      <CardContent className="grid gap-6 pt-6 sm:grid-cols-[auto_1fr]">
        <div className="text-6xl font-bold text-primary sm:text-7xl">#{entry.queueNumber}</div>
        <div className="space-y-3">
          <div>
            <p className="text-2xl font-semibold leading-tight">
              {entry.patient.lastName} {entry.patient.firstName}
            </p>
            <p className="text-muted-foreground">{entry.patient.birthYear}</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-foreground">
            {/* Icon is a stable lookup from a static map, not created during render. */}
            {/* eslint-disable-next-line react-hooks/static-components */}
            <Icon className="size-4 text-muted-foreground" />
            {entry.services.map((s) => s.name).join(", ")}
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="size-3.5" />
              {t("waitingTime", { minutes: waitingMinutes })}
            </span>
            <span>{t("registeredAt", { time: format(new Date(entry.registeredAt), "HH:mm") })}</span>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {!inConsultation && (
              <>
                <Button
                  onClick={() =>
                    run(
                      "start",
                      {
                        title: t("startConfirmTitle", {
                          name: `${entry.patient.firstName} ${entry.patient.lastName}`,
                        }),
                        confirmLabel: t("startConfirmLabel"),
                      },
                      () => apiFetch(`/queue/${entry.id}/start`, { method: "POST" }),
                    )
                  }
                  disabled={busy !== null}
                >
                  {busy === "start" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Play className="size-4" />
                  )}
                  {t("startConsultation")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    run(
                      "skip",
                      {
                        title: t("skipConfirmTitle", {
                          name: `${entry.patient.firstName} ${entry.patient.lastName}`,
                        }),
                        description: t("skipConfirmDesc"),
                        confirmLabel: t("skipConfirmLabel"),
                      },
                      () => apiFetch(`/queue/${entry.id}/skip`, { method: "POST" }),
                    )
                  }
                  disabled={busy !== null}
                >
                  <SkipForward className="size-4" />
                  {t("skip")}
                </Button>
              </>
            )}
            {inConsultation && (
              <>
                <Button onClick={() => router.push(`/consultation/${entry.id}`)}>
                  {t("openConsultation")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    run(
                      "return",
                      {
                        title: t("returnConfirmTitle", {
                          name: `${entry.patient.firstName} ${entry.patient.lastName}`,
                        }),
                        description: t("returnConfirmDesc"),
                        confirmLabel: t("returnConfirmLabel"),
                      },
                      () => apiFetch(`/queue/${entry.id}/return`, { method: "POST" }),
                    )
                  }
                  disabled={busy !== null}
                >
                  <RotateCcw className="size-4" />
                  {t("returnToQueue")}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() =>
                    run(
                      "complete",
                      {
                        title: t("completeConfirmTitle", {
                          name: `${entry.patient.firstName} ${entry.patient.lastName}`,
                        }),
                        confirmLabel: t("completeConfirmLabel"),
                      },
                      () => apiFetch(`/queue/${entry.id}/complete`, { method: "POST" }),
                    )
                  }
                  disabled={busy !== null}
                >
                  {busy === "complete" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-4" />
                  )}
                  {t("completeConsultation")}
                </Button>
              </>
            )}
          </div>

          <div className="border-t pt-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("previousVisits")}
            </p>
            <PatientVisitHistory
              patientId={entry.patient.id}
              excludeQueueEntryId={entry.id}
              limit={3}
              compact
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
