"use client";

import { useEffect, useState } from "react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";

interface ServiceBreakdown {
  serviceId: string;
  serviceName: string;
  patients: number;
}

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function ServiceBreakdownChart() {
  const t = useTranslations("doctorDashboard");
  const [data, setData] = useState<ServiceBreakdown[] | null>(null);

  useEffect(() => {
    apiFetch<ServiceBreakdown[]>("/statistics/my-by-service").then(setData).catch(() => {});
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("serviceBreakdown")}</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        {data && data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="patients"
                nameKey="serviceName"
                innerRadius="55%"
                outerRadius="80%"
                paddingAngle={2}
              >
                {data.map((entry, i) => (
                  <Cell key={entry.serviceId} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--popover)",
                }}
              />
              <Legend
                layout="vertical"
                verticalAlign="middle"
                align="right"
                wrapperStyle={{ fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            {t("noServiceData")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
