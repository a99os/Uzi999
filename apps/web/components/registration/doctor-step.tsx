"use client";

import { useEffect, useState } from "react";
import type { DoctorSummary, ServiceSummary } from "@anora/shared-types";
import { useTranslations } from "next-intl";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

export function DoctorStep({
  selectedServices,
  selected,
  onSelect,
}: {
  selectedServices: ServiceSummary[];
  selected: DoctorSummary | null;
  onSelect: (doctor: DoctorSummary) => void;
}) {
  const t = useTranslations("registration");
  const [doctors, setDoctors] = useState<DoctorSummary[] | null>(null);

  useEffect(() => {
    apiFetch<DoctorSummary[]>("/doctors").then(setDoctors);
  }, []);

  const categories = selectedServices.map((s) => s.category.toLowerCase());
  const relevant = doctors?.filter(
    (d) =>
      categories.length === 0 ||
      categories.includes("consultation") ||
      categories.some((c) => d.specialization.toLowerCase().includes(c)),
  );
  const list = relevant && relevant.length > 0 ? relevant : doctors;

  return (
    <div>
      <h2 className="mb-1 text-sm font-semibold text-muted-foreground">{t("assignDoctor")}</h2>
      <div className="space-y-2">
        {!list && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        {list?.map((doctor) => {
          const active = selected?.id === doctor.id;
          const initials = `${doctor.firstName[0]}${doctor.lastName[0]}`.toUpperCase();
          return (
            <button
              key={doctor.id}
              onClick={() => onSelect(doctor)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition-colors",
                active ? "border-primary bg-secondary" : "border-border hover:bg-accent",
              )}
            >
              <Avatar>
                <AvatarFallback className="bg-primary/10 text-primary">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  Dr. {doctor.firstName} {doctor.lastName}
                </p>
                <p className="truncate text-xs text-muted-foreground">{doctor.specialization}</p>
              </div>
              <div className="text-right">
                <span
                  className={cn(
                    "flex items-center gap-1 text-xs font-medium",
                    doctor.isBusy ? "text-status-cancelled" : "text-status-completed",
                  )}
                >
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      doctor.isBusy ? "bg-status-cancelled" : "bg-status-completed",
                    )}
                  />
                  {doctor.isBusy ? t("busy") : t("available")}
                </span>
                <p className="text-[11px] text-muted-foreground">
                  {t("queuePersons", { count: doctor.waitingCount })}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
