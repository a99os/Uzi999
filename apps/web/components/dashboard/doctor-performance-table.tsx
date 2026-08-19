"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { formatSom } from "@/lib/currency";

interface DoctorStat {
  doctorProfileId: string;
  doctorName: string;
  patients: number;
  revenue: number;
}

export function DoctorPerformanceTable() {
  const t = useTranslations("adminDashboard");
  const [stats, setStats] = useState<DoctorStat[] | null>(null);

  useEffect(() => {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date();
    apiFetch<DoctorStat[]>(
      `/statistics/by-doctor?from=${from.toISOString()}&to=${to.toISOString()}`,
    ).then((data) => setStats([...data].sort((a, b) => b.patients - a.patients)));
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("doctorPerformanceToday")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {stats?.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("noVisitsYet")}</p>
        )}
        {stats?.map((s) => (
          <div
            key={s.doctorProfileId}
            className="flex items-center justify-between rounded-xl border border-border p-3 text-sm"
          >
            <span className="font-medium">{s.doctorName}</span>
            <div className="flex items-center gap-4 text-muted-foreground">
              <span>{t("patientsCount", { count: s.patients })}</span>
              <span className="font-medium text-primary">{formatSom(s.revenue)}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
