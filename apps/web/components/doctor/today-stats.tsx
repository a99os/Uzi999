"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { formatSom } from "@/lib/currency";
import { Users, CheckCircle2, Clock, DollarSign } from "lucide-react";

interface Overview {
  totalPatients: number;
  completedVisits: number;
  waitingPatients: number;
  revenue: number;
  avgWaitMinutes: number;
}

export function TodayStats() {
  const t = useTranslations("doctorDashboard");
  const [overview, setOverview] = useState<Overview | null>(null);

  useEffect(() => {
    apiFetch<Overview>("/statistics/my-overview").then(setOverview).catch(() => {});
  }, []);

  const items = [
    { label: t("patientsToday"), value: overview?.totalPatients ?? "—", icon: Users },
    { label: t("completed"), value: overview?.completedVisits ?? "—", icon: CheckCircle2 },
    { label: t("avgWait"), value: overview ? `${overview.avgWaitMinutes}m` : "—", icon: Clock },
    { label: t("revenue"), value: overview ? formatSom(overview.revenue) : "—", icon: DollarSign },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("todayStats")}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        {items.map((item) => (
          <div key={item.label} className="rounded-xl bg-muted p-3">
            <item.icon className="mb-1 size-4 text-muted-foreground" />
            <p className="text-lg font-semibold">{item.value}</p>
            <p className="text-xs text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
