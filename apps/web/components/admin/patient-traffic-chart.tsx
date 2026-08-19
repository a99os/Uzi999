"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { format } from "date-fns";

export function PatientTrafficChart() {
  const t = useTranslations("adminDashboard");
  const [data, setData] = useState<{ date: string; count: number }[] | null>(null);

  useEffect(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 6);
    from.setHours(0, 0, 0, 0);
    apiFetch<{ date: string; count: number }[]>(
      `/statistics/patients-by-day?from=${from.toISOString()}&to=${to.toISOString()}`,
    ).then(setData);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("patientTraffic")}</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        {data && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="date"
                tickFormatter={(d) => format(new Date(d), "EEE")}
                tickLine={false}
                axisLine={false}
                fontSize={12}
              />
              <YAxis tickLine={false} axisLine={false} fontSize={12} width={28} />
              <Tooltip
                labelFormatter={(d) => format(new Date(d as string), "d MMM yyyy")}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--popover)",
                }}
              />
              <Bar dataKey="count" fill="var(--primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
