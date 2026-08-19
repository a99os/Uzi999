"use client";

import { use } from "react";
import { Topbar } from "@/components/layout/topbar";
import { PatientProfileView } from "@/components/patients/patient-profile";

export default function PatientProfilePage({
  params,
}: PageProps<"/patients/[id]">) {
  const { id } = use(params);
  return (
    <>
      <Topbar title="Patient Profile" showBack />
      <div className="p-8">
        <PatientProfileView patientId={id} />
      </div>
    </>
  );
}
