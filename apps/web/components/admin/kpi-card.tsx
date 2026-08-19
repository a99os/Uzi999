import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function KpiCard({
  label,
  value,
  icon: Icon,
  tone = "primary",
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: "primary" | "turquoise" | "green" | "neutral";
}) {
  const toneClasses: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    turquoise: "bg-brand-turquoise-bg text-brand-turquoise",
    green: "bg-status-completed-bg text-status-completed",
    neutral: "bg-muted text-muted-foreground",
  };

  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-6">
        <div className={cn("flex size-11 items-center justify-center rounded-xl", toneClasses[tone])}>
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
