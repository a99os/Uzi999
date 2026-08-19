"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import type { ServiceSummary } from "@anora/shared-types";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getServiceIcon } from "@/lib/icon-map";
import { useConfirm } from "@/components/providers/confirm-provider";
import { useAuthStore } from "@/lib/auth-store";
import { formatSom } from "@/lib/currency";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";

const serviceSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  price: z.number().nonnegative(),
});
type ServiceForm = z.infer<typeof serviceSchema>;

function ServiceFormContent({
  mode,
  service,
  onOpenChange,
  onSaved,
}: {
  mode: "create" | "edit";
  service?: ServiceSummary;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const t = useTranslations("servicesPage");
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<ServiceForm>({
    resolver: zodResolver(serviceSchema),
    values: service
      ? { name: service.name, category: service.category, price: Number(service.price) }
      : undefined,
  });

  async function onSubmit(values: ServiceForm) {
    if (mode === "create") {
      await apiFetch("/services", { method: "POST", body: values });
      reset();
    } else if (service) {
      await apiFetch(`/services/${service.id}`, { method: "PATCH", body: values });
    }
    onOpenChange(false);
    onSaved();
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>
          {mode === "create" ? t("addServiceTitle") : t("editServiceTitle")}
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label>{t("name")}</Label>
          <Input {...register("name")} />
        </div>
        <div className="space-y-1.5">
          <Label>{t("category")}</Label>
          <Input placeholder={t("categoryPlaceholder")} {...register("category")} />
        </div>
        <div className="space-y-1.5">
          <Label>{t("price")}</Label>
          <Input type="number" step="0.01" {...register("price", { valueAsNumber: true })} />
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {t("saveService")}
        </Button>
      </form>
    </DialogContent>
  );
}

export function ServicesManager() {
  const t = useTranslations("servicesPage");
  const tCommon = useTranslations("common");
  const confirm = useConfirm();
  const currentUser = useAuthStore((s) => s.user);
  const isAdmin = currentUser?.roles.some((r) => r === "SUPER_ADMIN" || r === "ADMIN") ?? false;
  const [services, setServices] = useState<ServiceSummary[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceSummary | null>(null);

  function load() {
    apiFetch<ServiceSummary[]>("/services").then(setServices);
  }

  useEffect(load, []);

  async function toggleActive(service: ServiceSummary, checked: boolean) {
    const ok = await confirm({
      title: checked
        ? t("activateConfirmTitle", { name: service.name })
        : t("deactivateConfirmTitle", { name: service.name }),
      description: checked ? t("activateConfirmDesc") : t("deactivateConfirmDesc"),
      confirmLabel: checked ? t("activateLabel") : t("deactivateLabel"),
      destructive: !checked,
    });
    if (!ok) return;
    await apiFetch(`/services/${service.id}/active`, { method: "PATCH", body: { isActive: checked } });
    load();
  }

  async function deleteService(service: ServiceSummary) {
    const ok = await confirm({
      title: t("deleteConfirmTitle", { name: service.name }),
      description: tCommon("cannotUndo"),
      confirmLabel: tCommon("delete"),
      destructive: true,
    });
    if (!ok) return;
    try {
      await apiFetch(`/services/${service.id}`, { method: "DELETE" });
      load();
    } catch (err) {
      if (err instanceof ApiError) window.alert(err.message);
    }
  }

  const categories = Array.from(new Set(services.map((s) => s.category)));
  const filtered = services.filter(
    (s) =>
      s.name.toLowerCase().includes(query.toLowerCase()) &&
      (!category || s.category === category),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-56">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={category === null ? "default" : "secondary"}
            className="cursor-pointer"
            onClick={() => setCategory(null)}
          >
            {t("all")}
          </Badge>
          {categories.map((c) => (
            <Badge
              key={c}
              variant={category === c ? "default" : "secondary"}
              className="cursor-pointer"
              onClick={() => setCategory(c)}
            >
              {c}
            </Badge>
          ))}
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button className="ml-auto" />}>
            <Plus className="size-4" />
            {t("addService")}
          </DialogTrigger>
          <ServiceFormContent mode="create" onOpenChange={setCreateOpen} onSaved={load} />
        </Dialog>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((service) => {
          const Icon = getServiceIcon(service.icon);
          return (
            <Card key={service.id}>
              <CardContent className="flex items-center gap-3 pt-6">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{service.name}</p>
                  <p className="text-xs text-muted-foreground">{service.category}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <p className="font-semibold text-primary">{formatSom(service.price)}</p>
                  {isAdmin ? (
                    <Switch
                      checked={service.isActive}
                      onCheckedChange={(checked) => toggleActive(service, checked)}
                    />
                  ) : (
                    <Badge variant={service.isActive ? "secondary" : "outline"}>
                      {service.isActive ? tCommon("active") : tCommon("inactive")}
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  title={tCommon("edit")}
                  onClick={() => setEditing(service)}
                >
                  <Pencil className="size-4" />
                </Button>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="icon"
                    title={tCommon("delete")}
                    className="text-destructive"
                    onClick={() => deleteService(service)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        {editing && (
          <ServiceFormContent
            mode="edit"
            service={editing}
            onOpenChange={(open) => !open && setEditing(null)}
            onSaved={load}
          />
        )}
      </Dialog>
    </div>
  );
}
