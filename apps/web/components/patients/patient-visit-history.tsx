"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api-client";
import { formatSom } from "@/lib/currency";

interface VisitEntry {
  id: string;
  registeredAt: string;
  status: string;
  totalPrice: string;
  services: { service: { name: string } }[];
  doctor: { user: { firstName: string; lastName: string } };
  consultation: { diagnosis: string | null } | null;
}

interface PatientWithVisits {
  queueEntries: VisitEntry[];
}

export function PatientVisitHistory({
  patientId,
  excludeQueueEntryId,
  limit,
  compact,
  onlyWithConsultation,
}: {
  patientId: string;
  excludeQueueEntryId?: string;
  limit?: number;
  compact?: boolean;
  onlyWithConsultation?: boolean;
}) {
  const [patient, setPatient] = useState<PatientWithVisits | null>(null);

  useEffect(() => {
    apiFetch<PatientWithVisits>(`/patients/${patientId}`).then(setPatient);
  }, [patientId]);

  if (!patient) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  const visits = patient.queueEntries
    .filter((e) => e.id !== excludeQueueEntryId)
    .filter((e) => !onlyWithConsultation || e.consultation)
    .slice(0, limit ?? Infinity);

  if (visits.length === 0) {
    return <p className="text-sm text-muted-foreground">No previous visits.</p>;
  }

  return (
    <div className={compact ? "space-y-3" : "space-y-5"}>
      {visits.map((entry) => (
        <div key={entry.id} className="relative border-l-2 border-border pl-4">
          {!compact && <div className="absolute -left-[5px] top-1 size-2 rounded-full bg-primary" />}
          <p className="text-xs text-muted-foreground">
            {format(new Date(entry.registeredAt), "d MMM yyyy")}
          </p>
          <p className="text-sm font-medium">
            {entry.services.map((s) => s.service.name).join(", ")}
          </p>
          <p className="text-xs text-muted-foreground">
            Dr. {entry.doctor.user.firstName} {entry.doctor.user.lastName}
            {!compact && ` · ${formatSom(entry.totalPrice)}`}
          </p>
          {!compact && entry.consultation?.diagnosis && (
            <p className="mt-1 text-xs text-muted-foreground">
              Diagnosis: {entry.consultation.diagnosis}
            </p>
          )}
          {!compact && (
            <Badge variant="secondary" className="mt-1">
              {entry.status.replace("_", " ")}
            </Badge>
          )}
        </div>
      ))}
    </div>
  );
}
