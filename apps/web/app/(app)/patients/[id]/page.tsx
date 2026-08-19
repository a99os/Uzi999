"use client";

import { use } from "react";
import { useTranslations } from "next-intl";
import { Topbar } from "@/components/layout/topbar";
import { PatientProfileView } from "@/components/patients/patient-profile";

export default function PatientProfilePage({
  params,
}: PageProps<"/patients/[id]">) {
  const { id } = use(params);
  const t = useTranslations("patients");
  return (
    <>
      <Topbar title={t("profileTitle")} showBack />
      <div className="p-8">
        <PatientProfileView patientId={id} />
      </div>
    </>
  );
}
