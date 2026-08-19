import { Topbar } from "@/components/layout/topbar";
import { ServicesManager } from "@/components/services/services-manager";

export default function ServicesPage() {
  return (
    <>
      <Topbar title="Services & Diagnoses" subtitle="Manage predefined services and pricing" />
      <div className="p-8">
        <ServicesManager />
      </div>
    </>
  );
}
