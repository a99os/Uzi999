"use client";

import { Search, Bell, LifeBuoy } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useTranslations, useLocale } from "next-intl";
import { ru, enUS, uz } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotificationsStore } from "@/lib/stores/notifications-store";
import { apiFetch } from "@/lib/api-client";
import { BackButton } from "@/components/layout/back-button";
import { LanguageSwitcher } from "@/components/layout/language-switcher";

const DATE_FNS_LOCALE = { uz, ru, en: enUS };

interface TopbarProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  showBack?: boolean;
}

export function Topbar({ title, subtitle, action, showBack }: TopbarProps) {
  const t = useTranslations("common");
  const locale = useLocale() as keyof typeof DATE_FNS_LOCALE;
  const items = useNotificationsStore((s) => s.items);
  const unreadCount = useNotificationsStore((s) => s.unreadCount);
  const markRead = useNotificationsStore((s) => s.markRead);
  const markAllRead = useNotificationsStore((s) => s.markAllRead);

  async function handleOpenChange(open: boolean) {
    if (open && unreadCount > 0) {
      await apiFetch("/notifications/read-all", { method: "POST" }).catch(() => {});
      markAllRead();
    }
  }

  return (
    <header className="flex items-center justify-between gap-4 border-b border-border bg-background/80 px-8 py-5 backdrop-blur">
      <div className="flex items-center gap-3">
        {showBack && <BackButton />}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder={t("searchPlaceholder")} className="w-72 rounded-full pl-9" />
        </div>

        <Button variant="ghost" size="sm" className="hidden gap-2 rounded-full sm:flex">
          <LifeBuoy className="size-4" />
          {t("support")}
        </Button>

        <LanguageSwitcher />

        <DropdownMenu onOpenChange={handleOpenChange}>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="icon" className="relative rounded-full" />}
          >
            <Bell className="size-5" />
            {unreadCount > 0 && (
              <Badge className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-destructive p-0 text-[10px] text-white">
                {unreadCount}
              </Badge>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuGroup>
              <DropdownMenuLabel>{t("notifications")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {items.length === 0 && (
                <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                  {t("allCaughtUp")}
                </p>
              )}
              {items.slice(0, 8).map((n) => (
                <DropdownMenuItem
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className="flex-col items-start gap-0.5 whitespace-normal"
                >
                  <span className="text-sm font-medium">{n.title}</span>
                  <span className="text-xs text-muted-foreground">{n.body}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {formatDistanceToNow(new Date(n.createdAt), {
                      addSuffix: true,
                      locale: DATE_FNS_LOCALE[locale],
                    })}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {action}
      </div>
    </header>
  );
}
