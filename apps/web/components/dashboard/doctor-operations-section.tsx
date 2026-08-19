"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { ru, enUS, uz } from "date-fns/locale";
import { useTranslations, useLocale } from "next-intl";
import type { QueueEntrySummary } from "@anora/shared-types";
import { useAuthStore } from "@/lib/auth-store";
import { useQueueStore } from "@/lib/stores/queue-store";
import { apiFetch } from "@/lib/api-client";
import { CurrentPatientCard } from "@/components/doctor/current-patient-card";
import { NextPatientsList } from "@/components/doctor/next-patients-list";
import { TodayStats } from "@/components/doctor/today-stats";
import { CompletedPatientsList } from "@/components/doctor/completed-patients-list";
import { ServiceBreakdownChart } from "@/components/doctor/service-breakdown-chart";

const DATE_FNS_LOCALE = { uz, ru, en: enUS };

export function DoctorOperationsSection() {
  const t = useTranslations("doctorDashboard");
  const locale = useLocale() as keyof typeof DATE_FNS_LOCALE;
  const user = useAuthStore((s) => s.user);
  const entries = useQueueStore((s) => s.entries);
  const setQueue = useQueueStore((s) => s.setQueue);
  const [completed, setCompleted] = useState<QueueEntrySummary[]>([]);

  const refresh = useCallback(() => {
    if (!user?.doctorProfile) return;
    apiFetch(`/queue/doctor/${user.doctorProfile.id}`).then((data) =>
      setQueue(user.doctorProfile!.id, data as never),
    );
    apiFetch<QueueEntrySummary[]>(`/queue/doctor/${user.doctorProfile.id}/completed-today`).then(
      setCompleted,
    );
  }, [user, setQueue]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!user?.doctorProfile) return null;

  const current = entries.find((e) => e.status === "IN_CONSULTATION") ?? entries[0] ?? null;
  const next = entries.filter((e) => e.id !== current?.id);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? t("greetingMorning") : hour < 18 ? t("greetingAfternoon") : t("greetingEvening");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {greeting}, Dr. {user.lastName} 👋
        </h1>
        <p className="text-muted-foreground">
          {format(new Date(), "EEEE, MMMM d", { locale: DATE_FNS_LOCALE[locale] })}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <CurrentPatientCard entry={current} onChanged={refresh} />
        <div className="space-y-6">
          <TodayStats />
          <NextPatientsList entries={next} onChanged={refresh} />
          <CompletedPatientsList entries={completed} />
        </div>
      </div>

      <ServiceBreakdownChart />
    </div>
  );
}
