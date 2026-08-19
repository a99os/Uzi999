"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { KpiCard } from "@/components/admin/kpi-card";
import { PatientTrafficChart } from "@/components/admin/patient-traffic-chart";
import { LiveActivityFeed } from "@/components/admin/live-activity-feed";
import { DoctorPerformanceTable } from "@/components/dashboard/doctor-performance-table";
import { apiFetch } from "@/lib/api-client";
import { formatSom } from "@/lib/currency";
import { Users, Clock, Stethoscope, DollarSign } from "lucide-react";
import type { DoctorSummary } from "@anora/shared-types";

interface Overview {
  totalPatients: number;
  waitingPatients: number;
  revenue: number;
}

export function AdminOverviewSection() {
  const t = useTranslations("adminDashboard");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [doctors, setDoctors] = useState<DoctorSummary[] | null>(null);

  useEffect(() => {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date();
    apiFetch<Overview>(`/statistics/overview?from=${from.toISOString()}&to=${to.toISOString()}`).then(
      setOverview,
    );
    apiFetch<DoctorSummary[]>("/doctors").then(setDoctors);
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label={t("todaysPatients")} value={overview?.totalPatients ?? "—"} icon={Users} tone="primary" />
        <KpiCard
          label={t("currentlyWaiting")}
          value={overview?.waitingPatients ?? "—"}
          icon={Clock}
          tone="turquoise"
        />
        <KpiCard
          label={t("doctorsWorking")}
          value={doctors?.length ?? "—"}
          icon={Stethoscope}
          tone="neutral"
        />
        <KpiCard
          label={t("todaysRevenue")}
          value={overview ? formatSom(overview.revenue) : "—"}
          icon={DollarSign}
          tone="green"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <PatientTrafficChart />
        <LiveActivityFeed />
      </div>

      <DoctorPerformanceTable />
    </div>
  );
}
