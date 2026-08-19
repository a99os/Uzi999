"use client";

import { useTranslations } from "next-intl";
import { Topbar } from "@/components/layout/topbar";
import { UsersManager } from "@/components/users/users-manager";

export default function UsersPage() {
  const t = useTranslations("usersPage");
  return (
    <>
      <Topbar title={t("title")} subtitle={t("subtitle")} />
      <div className="p-8">
        <UsersManager />
      </div>
    </>
  );
}
