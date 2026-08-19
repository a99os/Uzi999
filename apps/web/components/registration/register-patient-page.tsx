"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Topbar } from "@/components/layout/topbar";
import { PatientStep, type PatientResult } from "./patient-step";
import { ServiceStep } from "./service-step";
import { DoctorStep } from "./doctor-step";
import { ConfirmStep } from "./confirm-step";
import { SuccessCard } from "./success-card";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import type { DoctorSummary, ServiceSummary } from "@anora/shared-types";

interface RegistrationResult {
  id: string;
  queueNumber: number;
  estimatedWaitMinutes: number | null;
}

export function RegisterPatientPage({
  mode,
  selfDoctor,
  hideHeader,
  onRegistered,
}: {
  mode: "any-doctor" | "self-only";
  selfDoctor?: DoctorSummary | null;
  hideHeader?: boolean;
  onRegistered?: () => void;
}) {
  const t = useTranslations("registration");
  const [patient, setPatient] = useState<PatientResult | null>(null);
  const [services, setServices] = useState<ServiceSummary[]>([]);
  const [doctor, setDoctor] = useState<DoctorSummary | null>(mode === "self-only" ? selfDoctor ?? null : null);
  const [result, setResult] = useState<RegistrationResult | null>(null);

  const steps =
    mode === "self-only"
      ? ([
          { key: "patient", label: t("stepPatient") },
          { key: "service", label: t("stepService") },
          { key: "confirmation", label: t("stepConfirmation") },
        ] as const)
      : ([
          { key: "patient", label: t("stepPatient") },
          { key: "service-doctor", label: t("stepServiceDoctor") },
          { key: "confirmation", label: t("stepConfirmation") },
        ] as const);

  const readyForConfirm = services.length > 0 && doctor;
  const stepIndex = result ? steps.length : !patient ? 0 : !readyForConfirm ? 1 : 2;

  function reset() {
    setPatient(null);
    setServices([]);
    setDoctor(mode === "self-only" ? selfDoctor ?? null : null);
    setResult(null);
  }

  function handleConfirmed(r: RegistrationResult) {
    setResult(r);
    onRegistered?.();
  }

  return (
    <>
      {!hideHeader && <Topbar title={t("title")} subtitle={t("subtitle")} />}
      <div className={cn("mx-auto w-full max-w-3xl space-y-6", !hideHeader && "p-8")}>
          {!result && (
            <ol className="flex items-center gap-4">
              {steps.map((step, i) => (
                <li key={step.key} className="flex flex-1 items-center gap-3">
                  <div
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                      i < stepIndex
                        ? "bg-status-completed text-white"
                        : i === stepIndex
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {i < stepIndex ? <Check className="size-4" /> : i + 1}
                  </div>
                  <span
                    className={cn(
                      "text-sm font-medium",
                      i === stepIndex ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {step.label}
                  </span>
                  {i < steps.length - 1 && <div className="h-px flex-1 bg-border" />}
                </li>
              ))}
            </ol>
          )}

          {result && patient && doctor ? (
            <SuccessCard
              patient={patient}
              services={services}
              doctor={doctor}
              queueNumber={result.queueNumber}
              estimatedWaitMinutes={result.estimatedWaitMinutes}
              onRegisterAnother={reset}
            />
          ) : !patient ? (
            <PatientStep onSelect={setPatient} />
          ) : !readyForConfirm ? (
            <Card>
              <CardContent
                className={cn(
                  "grid gap-6 pt-6",
                  mode === "any-doctor" && "md:grid-cols-[1fr_320px]",
                )}
              >
                <ServiceStep selected={services} onChange={setServices} />
                {mode === "any-doctor" && (
                  <DoctorStep selectedServices={services} selected={doctor} onSelect={setDoctor} />
                )}
              </CardContent>
            </Card>
          ) : (
            doctor && (
              <ConfirmStep
                patient={patient}
                services={services}
                doctor={doctor}
                onBack={() => (mode === "any-doctor" ? setDoctor(null) : setServices([]))}
                onConfirmed={handleConfirmed}
              />
            )
          )}
      </div>
    </>
  );
}
