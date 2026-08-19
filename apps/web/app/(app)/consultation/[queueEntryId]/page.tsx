"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api-client";
import { useQueueStore } from "@/lib/stores/queue-store";
import { useConfirm } from "@/components/providers/confirm-provider";
import { PatientVisitHistory } from "@/components/patients/patient-visit-history";
import { Loader2, CheckCircle2 } from "lucide-react";

interface ConsultationDraft {
  diagnosis?: string;
  medicalNotes?: string;
  prescription?: string;
  recommendations?: string;
  followUpDate?: string | null;
}

export default function ConsultationPage({
  params,
}: PageProps<"/consultation/[queueEntryId]">) {
  const { queueEntryId } = use(params);
  const router = useRouter();
  const t = useTranslations("consultationPage");
  const tCommon = useTranslations("common");
  const confirm = useConfirm();
  const entries = useQueueStore((s) => s.entries);
  const entry = entries.find((e) => e.id === queueEntryId);

  const [draft, setDraft] = useState<ConsultationDraft>({});
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    apiFetch<ConsultationDraft | null>(`/consultations/${queueEntryId}`).then((c) => {
      if (c) setDraft(c);
    });
  }, [queueEntryId]);

  async function saveDraft() {
    setSaving(true);
    try {
      await apiFetch(`/consultations/${queueEntryId}`, { method: "PATCH", body: draft });
    } finally {
      setSaving(false);
    }
  }

  async function completeConsultation() {
    const ok = await confirm({
      title: t("completeConfirmTitle"),
      description: t("completeConfirmDesc"),
      confirmLabel: t("completeConfirmLabel"),
    });
    if (!ok) return;
    setCompleting(true);
    try {
      await apiFetch(`/consultations/${queueEntryId}`, { method: "PATCH", body: draft });
      await apiFetch(`/queue/${queueEntryId}/complete`, { method: "POST" });
      router.push("/dashboard");
    } finally {
      setCompleting(false);
    }
  }

  if (!entry) {
    return (
      <>
        <Topbar title={t("title")} />
        <div className="p-8 text-sm text-muted-foreground">
          {t("noLongerActive")}
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar
        title={`${entry.patient.lastName} ${entry.patient.firstName}`}
        subtitle={`${entry.patient.birthYear} · ${t("patientIdLabel", { id: entry.patient.id.slice(-6) })}${saving ? ` · ${t("saving")}` : ""}`}
        showBack
        action={
          <Button onClick={completeConsultation} disabled={completing}>
            {completing ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            {t("completeConsultation")}
          </Button>
        }
      />
      <div className="grid gap-6 p-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("diagnosis")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                rows={3}
                value={draft.diagnosis ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, diagnosis: e.target.value }))}
                onBlur={saveDraft}
                placeholder={t("diagnosisPlaceholder")}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("medicalNotes")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                rows={4}
                value={draft.medicalNotes ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, medicalNotes: e.target.value }))}
                onBlur={saveDraft}
                placeholder={t("medicalNotesPlaceholder")}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("prescription")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                rows={3}
                value={draft.prescription ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, prescription: e.target.value }))}
                onBlur={saveDraft}
                placeholder={t("prescriptionPlaceholder")}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("recommendations")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                rows={3}
                value={draft.recommendations ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, recommendations: e.target.value }))}
                onBlur={saveDraft}
                placeholder={t("recommendationsPlaceholder")}
              />
              <div className="space-y-1.5">
                <Label>{t("followUpDate")}</Label>
                <Input
                  type="date"
                  value={draft.followUpDate?.slice(0, 10) ?? ""}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      followUpDate: e.target.value ? new Date(e.target.value).toISOString() : null,
                    }))
                  }
                  onBlur={saveDraft}
                  className="w-48"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("patientInformation")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-medium">
                {entry.patient.lastName} {entry.patient.firstName}
              </p>
              <p className="text-muted-foreground">{tCommon("bornYear", { year: entry.patient.birthYear })}</p>
              {entry.patient.phone && <p className="text-muted-foreground">{entry.patient.phone}</p>}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {entry.services.map((s) => (
                  <Badge key={s.id} variant="secondary">
                    {s.name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("visitHistory")}</CardTitle>
            </CardHeader>
            <CardContent>
              <PatientVisitHistory
                patientId={entry.patient.id}
                excludeQueueEntryId={queueEntryId}
                onlyWithConsultation
                compact
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
