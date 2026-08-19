"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BackButton() {
  const router = useRouter();
  const t = useTranslations("common");
  return (
    <Button variant="ghost" size="icon" onClick={() => router.back()} title={t("back")}>
      <ArrowLeft className="size-5" />
    </Button>
  );
}
