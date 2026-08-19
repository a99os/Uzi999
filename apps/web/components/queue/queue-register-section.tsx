"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { useAuthStore } from "@/lib/auth-store";
import { RegisterPatientPage } from "@/components/registration/register-patient-page";
import {
  TodayRegistrations,
  type TodayRegistrationsHandle,
} from "@/components/registration/today-registrations";
import { LiveQueueBoard } from "@/components/queue/live-queue-board";
import type { DoctorSummary } from "@anora/shared-types";

export function QueueRegisterSection() {
  const t = useTranslations("registration");
  const user = useAuthStore((s) => s.user);
  const todayRef = useRef<TodayRegistrationsHandle>(null);

  if (!user) return null;

  const isAdminLike = user.roles.some(
    (r) => r === "SUPER_ADMIN" || r === "ADMIN" || r === "MANAGER",
  );
  const isDoctor = user.roles.includes("DOCTOR");
  if (!isAdminLike && !(isDoctor && user.doctorProfile)) return null;

  const mode = isAdminLike ? "any-doctor" : "self-only";
  const selfDoctor: DoctorSummary | undefined =
    !isAdminLike && user.doctorProfile
      ? {
          id: user.doctorProfile.id,
          userId: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          specialization: user.doctorProfile.specialization,
          avatarUrl: null,
          isBusy: false,
          waitingCount: 0,
        }
      : undefined;

  return (
    <div className="space-y-3 p-8 pb-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {t("title")}
      </h2>
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <RegisterPatientPage
            mode={mode}
            selfDoctor={selfDoctor}
            hideHeader
            onRegistered={() => todayRef.current?.refresh()}
          />
          <LiveQueueBoard />
        </div>
        <TodayRegistrations
          ref={todayRef}
          mode={mode}
          selfDoctorProfileId={mode === "self-only" ? selfDoctor?.id : undefined}
        />
      </div>
    </div>
  );
}
