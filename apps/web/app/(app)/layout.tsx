import { RequireRole } from "@/components/auth/require-role";
import { AppShell } from "@/components/layout/app-shell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole roles={["SUPER_ADMIN", "ADMIN", "MANAGER", "DOCTOR"]}>
      <AppShell>{children}</AppShell>
    </RequireRole>
  );
}
