"use client";

import { useState } from "react";
import type { DoctorSummary, QueueEntrySummary, ServiceSummary } from "@anora/shared-types";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiFetch, ApiError } from "@/lib/api-client";
import { formatSom } from "@/lib/currency";
import { Loader2, UserRound } from "lucide-react";
import type { PatientResult } from "./patient-step";

export function ConfirmStep({
  patient,
  services,
  doctor,
  onBack,
  onConfirmed,
}: {
  patient: PatientResult;
  services: ServiceSummary[];
  doctor: DoctorSummary;
  onBack: () => void;
  onConfirmed: (result: {
    id: string;
    queueNumber: number;
    estimatedWaitMinutes: number | null;
  }) => void;
}) {
  const t = useTranslations("registration");
  const tCommon = useTranslations("common");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = services.reduce((sum, s) => sum + Number(s.price), 0);

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    try {
      const entry = await apiFetch<QueueEntrySummary>("/queue", {
        method: "POST",
        body: {
          patientId: patient.id,
          serviceIds: services.map((s) => s.id),
          doctorProfileId: doctor.id,
        },
      });
      onConfirmed({
        id: entry.id,
        queueNumber: entry.queueNumber,
        estimatedWaitMinutes: entry.estimatedWaitMinutes,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("registrationFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserRound className="size-4" />
            {t("selectedPatient")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-semibold">
            {patient.lastName} {patient.firstName}
          </p>
          <p className="text-sm text-muted-foreground">{patient.birthYear}</p>
        </CardContent>
      </Card>

      <Card className="flex flex-col justify-between">
        <CardHeader>
          <CardTitle className="text-base">{t("confirmationTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 space-y-3">
          <div className="space-y-1.5">
            <span className="text-sm text-muted-foreground">{t("serviceLabel")}</span>
            <div className="flex flex-wrap gap-1.5">
              {services.map((s) => (
                <Badge key={s.id} variant="secondary">
                  {s.name}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t("doctorLabel")}</span>
            <span className="font-medium">
              Dr. {doctor.firstName} {doctor.lastName}
            </span>
          </div>
          <div className="flex items-center justify-between border-t pt-3 text-sm font-semibold">
            <span>{t("totalDue")}</span>
            <span className="text-lg text-primary">{formatSom(total)}</span>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
        <CardContent className="flex gap-2 pt-0">
          <Button variant="outline" onClick={onBack} disabled={submitting}>
            {tCommon("back")}
          </Button>
          <Button className="flex-1" onClick={handleConfirm} disabled={submitting}>
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {t("confirmRegistration")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
