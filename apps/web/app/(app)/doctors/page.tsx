"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api-client";
import type { DoctorSummary } from "@anora/shared-types";

export default function DoctorsPage() {
  const t = useTranslations("doctorsPage");
  const [doctors, setDoctors] = useState<DoctorSummary[]>([]);

  useEffect(() => {
    apiFetch<DoctorSummary[]>("/doctors").then(setDoctors);
  }, []);

  return (
    <>
      <Topbar title={t("title")} subtitle={t("subtitle")} />
      <div className="grid gap-4 p-8 sm:grid-cols-2 lg:grid-cols-3">
        {doctors.map((d) => {
          const initials = `${d.firstName[0]}${d.lastName[0]}`.toUpperCase();
          return (
            <Card key={d.id}>
              <CardContent className="flex items-center gap-3 pt-6">
                <Avatar className="size-12">
                  <AvatarFallback className="bg-primary/10 text-primary">{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    Dr. {d.firstName} {d.lastName}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">{d.specialization}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("queueLabel", { count: d.waitingCount })}
                  </p>
                </div>
                <Badge
                  className={
                    d.isBusy
                      ? "bg-status-cancelled-bg text-status-cancelled"
                      : "bg-status-completed-bg text-status-completed"
                  }
                >
                  {d.isBusy ? t("busy") : t("available")}
                </Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
