"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { useConfirm } from "@/components/providers/confirm-provider";
import { PatientVisitHistory } from "@/components/patients/patient-visit-history";
import { Trash2 } from "lucide-react";

interface PatientProfile {
  id: string;
  firstName: string;
  lastName: string;
  birthYear: number;
  phone: string | null;
  notes: string | null;
  queueEntries: { id: string }[];
}

export function PatientProfileView({ patientId }: { patientId: string }) {
  const router = useRouter();
  const t = useTranslations("patients");
  const tCommon = useTranslations("common");
  const confirm = useConfirm();
  const user = useAuthStore((s) => s.user);
  const canDelete = user?.roles.some((r) => r === "SUPER_ADMIN" || r === "ADMIN" || r === "MANAGER") ?? false;
  const [patient, setPatient] = useState<PatientProfile | null>(null);

  useEffect(() => {
    apiFetch<PatientProfile>(`/patients/${patientId}`).then(setPatient);
  }, [patientId]);

  if (!patient) return <p className="text-sm text-muted-foreground">{tCommon("loading")}</p>;

  const hasVisits = patient.queueEntries.length > 0;

  async function handleDelete() {
    if (!patient) return;
    const ok = await confirm({
      title: t("deleteConfirmTitle", { name: `${patient.lastName} ${patient.firstName}` }),
      description: tCommon("cannotUndo"),
      confirmLabel: tCommon("delete"),
      destructive: true,
    });
    if (!ok) return;
    try {
      await apiFetch(`/patients/${patient.id}`, { method: "DELETE" });
      router.push("/patients");
    } catch (err) {
      if (err instanceof ApiError) window.alert(err.message);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <CardTitle className="text-base">{t("personalInformation")}</CardTitle>
          {canDelete && (
            <Button
              variant="ghost"
              size="icon"
              title={hasVisits ? t("cannotDeleteHasHistory") : tCommon("delete")}
              className="text-destructive"
              disabled={hasVisits}
              onClick={handleDelete}
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-lg font-semibold">
            {patient.lastName} {patient.firstName}
          </p>
          <p className="text-muted-foreground">{tCommon("bornYear", { year: patient.birthYear })}</p>
          {patient.phone && <p className="text-muted-foreground">{patient.phone}</p>}
          {patient.notes && <p className="text-muted-foreground">{patient.notes}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("visitHistory")}</CardTitle>
        </CardHeader>
        <CardContent>
          <PatientVisitHistory patientId={patientId} />
        </CardContent>
      </Card>
    </div>
  );
}
