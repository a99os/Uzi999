"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
          {mode === "create" ? "Add Diagnosis / Service" : "Edit Diagnosis / Service"}
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Name</Label>
          <Input {...register("name")} />
        </div>
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Input placeholder="Consultation, Diagnostics, Lab…" {...register("category")} />
        </div>
        <div className="space-y-1.5">
          <Label>Price (so&apos;m)</Label>
          <Input type="number" step="0.01" {...register("price", { valueAsNumber: true })} />
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          Save Service
        </Button>
      </form>
    </DialogContent>
  );
}

export function ServicesManager() {
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
      title: `${checked ? "Activate" : "Deactivate"} ${service.name}?`,
      description: checked
        ? "It will become selectable again during registration."
        : "It will no longer be selectable during registration.",
      confirmLabel: checked ? "Activate" : "Deactivate",
      destructive: !checked,
    });
    if (!ok) return;
    await apiFetch(`/services/${service.id}/active`, { method: "PATCH", body: { isActive: checked } });
    load();
  }

  async function deleteService(service: ServiceSummary) {
    const ok = await confirm({
      title: `Delete ${service.name}?`,
      description: "This cannot be undone.",
      confirmLabel: "Delete",
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
            placeholder="Search services…"
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
            All
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
            Add Service
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
                      {service.isActive ? "Active" : "Inactive"}
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Edit"
                  onClick={() => setEditing(service)}
                >
                  <Pencil className="size-4" />
                </Button>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Delete"
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
