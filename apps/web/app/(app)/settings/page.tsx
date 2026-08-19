"use client";

import { useTranslations } from "next-intl";
import { Topbar } from "@/components/layout/topbar";
import { SettingsForm } from "@/components/settings/settings-form";

export default function SettingsPage() {
  const tNav = useTranslations("nav");
  const tSettings = useTranslations("settingsPage");
  return (
    <>
      <Topbar title={tNav("settings")} subtitle={tSettings("subtitle")} />
      <div className="p-8">
        <SettingsForm />
      </div>
    </>
  );
}
