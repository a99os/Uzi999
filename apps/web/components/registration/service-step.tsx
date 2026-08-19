"use client";

import { useEffect, useState } from "react";
import type { ServiceSummary } from "@anora/shared-types";
import { useTranslations } from "next-intl";
import { apiFetch } from "@/lib/api-client";
import { getServiceIcon } from "@/lib/icon-map";
import { formatSom } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Check } from "lucide-react";

export function ServiceStep({
  selected,
  onChange,
}: {
  selected: ServiceSummary[];
  onChange: (services: ServiceSummary[]) => void;
}) {
  const t = useTranslations("registration");
  const [services, setServices] = useState<ServiceSummary[] | null>(null);

  useEffect(() => {
    apiFetch<ServiceSummary[]>("/services?activeOnly=true").then(setServices);
  }, []);

  function toggle(service: ServiceSummary) {
    const isSelected = selected.some((s) => s.id === service.id);
    onChange(
      isSelected ? selected.filter((s) => s.id !== service.id) : [...selected, service],
    );
  }

  return (
    <div>
      <h2 className="mb-1 text-sm font-semibold text-muted-foreground">
        {t("chooseServices")}
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {!services &&
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        {services?.map((service) => {
          const Icon = getServiceIcon(service.icon);
          const active = selected.some((s) => s.id === service.id);
          return (
            <button
              key={service.id}
              onClick={() => toggle(service)}
              className={cn(
                "relative flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-colors",
                active ? "border-primary bg-secondary" : "border-border hover:bg-accent",
              )}
            >
              {active && (
                <span className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="size-3.5" />
                </span>
              )}
              <Icon className={cn("size-5", active ? "text-primary" : "text-muted-foreground")} />
              <span className="text-sm font-medium leading-tight">{service.name}</span>
              <span className="text-sm font-semibold text-primary">{formatSom(service.price)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
