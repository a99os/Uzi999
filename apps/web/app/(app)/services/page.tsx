"use client";

import { useTranslations } from "next-intl";
import { Topbar } from "@/components/layout/topbar";
import { ServicesManager } from "@/components/services/services-manager";

export default function ServicesPage() {
  const t = useTranslations("servicesPage");
  return (
    <>
      <Topbar title={t("title")} subtitle={t("subtitle")} />
      <div className="p-8">
        <ServicesManager />
      </div>
    </>
  );
}
