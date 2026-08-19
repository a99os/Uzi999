"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Search, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { useConfirm } from "@/components/providers/confirm-provider";

interface PatientRow {
  id: string;
  firstName: string;
  lastName: string;
  birthYear: number;
  phone: string | null;
}

export function PatientsList() {
  const t = useTranslations("patients");
  const tCommon = useTranslations("common");
  const user = useAuthStore((s) => s.user);
  const confirm = useConfirm();
  const canDelete = user?.roles.some((r) => r === "SUPER_ADMIN" || r === "ADMIN" || r === "MANAGER") ?? false;
  const [query, setQuery] = useState("");
  const [patients, setPatients] = useState<PatientRow[]>([]);

  useEffect(() => {
    const handle = setTimeout(() => {
      apiFetch<PatientRow[]>(`/patients?q=${encodeURIComponent(query)}`).then(setPatients);
    }, 200);
    return () => clearTimeout(handle);
  }, [query]);

  async function deletePatient(p: PatientRow) {
    const ok = await confirm({
      title: t("deleteConfirmTitle", { name: `${p.lastName} ${p.firstName}` }),
      description: tCommon("cannotUndo"),
      confirmLabel: tCommon("delete"),
      destructive: true,
    });
    if (!ok) return;
    try {
      await apiFetch(`/patients/${p.id}`, { method: "DELETE" });
      setPatients((prev) => prev.filter((x) => x.id !== p.id));
    } catch (err) {
      if (err instanceof ApiError) window.alert(err.message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t("searchPlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>
      <Card>
        <CardContent className="divide-y p-0">
          {patients.map((p) => (
            <div key={p.id} className="flex items-center justify-between px-4 py-3">
              <Link
                href={`/patients/${p.id}`}
                className="flex flex-1 items-center justify-between transition-colors hover:opacity-80"
              >
                <div>
                  <p className="text-sm font-medium">
                    {p.lastName} {p.firstName}
                  </p>
                  <p className="text-xs text-muted-foreground">{tCommon("bornYear", { year: p.birthYear })}</p>
                </div>
                {p.phone && <p className="text-sm text-muted-foreground">{p.phone}</p>}
              </Link>
              {canDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  title={tCommon("delete")}
                  className="ml-2 text-destructive"
                  onClick={() => deletePatient(p)}
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          ))}
          {patients.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">{t("noPatientsFound")}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
