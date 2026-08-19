"use client";

import type { DoctorSummary, ServiceSummary } from "@anora/shared-types";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import type { PatientResult } from "./patient-step";

export function SuccessCard({
  patient,
  services,
  doctor,
  queueNumber,
  estimatedWaitMinutes,
  onRegisterAnother,
}: {
  patient: PatientResult;
  services: ServiceSummary[];
  doctor: DoctorSummary;
  queueNumber: number;
  estimatedWaitMinutes: number | null;
  onRegisterAnother: () => void;
}) {
  const t = useTranslations("registration");
  return (
    <Card className="mx-auto max-w-md animate-in fade-in zoom-in-95">
      <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-status-completed-bg text-status-completed">
          <CheckCircle2 className="size-8" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("patientRegistered")}
          </p>
          <p className="mt-1 text-xl font-semibold">
            {patient.lastName} {patient.firstName}
          </p>
          <p className="text-sm text-muted-foreground">{patient.birthYear}</p>
        </div>

        <div className="w-full rounded-xl bg-muted p-4 text-sm">
          <p className="font-medium">{services.map((s) => s.name).join(", ")}</p>
          <p className="text-muted-foreground">
            Dr. {doctor.firstName} {doctor.lastName}
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("queueNumber")}
          </p>
          <p className="text-5xl font-bold text-primary">#{queueNumber}</p>
        </div>

        {estimatedWaitMinutes !== null && (
          <p className="text-sm text-muted-foreground">
            {t("estimatedWait", { minutes: estimatedWaitMinutes })}
          </p>
        )}

        <Button className="w-full" onClick={onRegisterAnother}>
          {t("registerAnother")}
        </Button>
      </CardContent>
    </Card>
  );
}
