"use client";

import { useTranslations } from "next-intl";
import { Topbar } from "@/components/layout/topbar";
import { useAuthStore } from "@/lib/auth-store";
import { AdminOverviewSection } from "@/components/dashboard/admin-overview-section";
import { DoctorOperationsSection } from "@/components/dashboard/doctor-operations-section";

function isAdminLike(roles: string[]) {
  return roles.some((r) => r === "SUPER_ADMIN" || r === "ADMIN" || r === "MANAGER");
}

export function UnifiedDashboard() {
  const t = useTranslations("adminDashboard");
  const user = useAuthStore((s) => s.user);
  if (!user) return null;

  const adminSection = isAdminLike(user.roles);
  const doctorSection = user.roles.includes("DOCTOR");

  return (
    <>
      <Topbar title={t("dashboardTitle")} />
      <div className="space-y-8 p-8">
        {doctorSection && <DoctorOperationsSection />}
        {adminSection && <AdminOverviewSection />}
      </div>
    </>
  );
}
