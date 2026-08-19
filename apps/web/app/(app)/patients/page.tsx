"use client";

import { useTranslations } from "next-intl";
import { Topbar } from "@/components/layout/topbar";
import { PatientsList } from "@/components/patients/patients-list";

export default function PatientsPage() {
  const t = useTranslations("patients");
  return (
    <>
      <Topbar title={t("title")} subtitle={t("subtitle")} />
      <div className="p-8">
        <PatientsList />
      </div>
    </>
  );
}
