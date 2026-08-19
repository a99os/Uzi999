"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { RoleName } from "@anora/shared-types";
import { useAuthStore } from "@/lib/auth-store";
import { homeForRoles } from "@/lib/nav-config";
import { Loader2 } from "lucide-react";

export function RequireRole({
  roles,
  children,
}: {
  roles: RoleName[];
  children: React.ReactNode;
}) {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  const allowed = user ? user.roles.some((r) => roles.includes(r)) : false;

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }
    if (status === "authenticated" && user && !allowed) {
      router.replace(homeForRoles(user.roles));
    }
  }, [status, user, allowed, router]);

  if (status === "loading" || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!allowed) return null;

  return <>{children}</>;
}
