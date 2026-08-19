import { Topbar } from "@/components/layout/topbar";
import { PatientsList } from "@/components/patients/patients-list";

export default function PatientsPage() {
  return (
    <>
      <Topbar title="Patients" subtitle="Search the patient database" />
      <div className="p-8">
        <PatientsList />
      </div>
    </>
  );
}
