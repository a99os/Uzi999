"use client";

import { useTranslations } from "next-intl";
import { Topbar } from "@/components/layout/topbar";
import { QueueRegisterSection } from "@/components/queue/queue-register-section";

export default function QueuePage() {
  const t = useTranslations("queuePage");
  return (
    <>
      <Topbar title={t("title")} subtitle={t("subtitle")} />
      <QueueRegisterSection />
    </>
  );
}
