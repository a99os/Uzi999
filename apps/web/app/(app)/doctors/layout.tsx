import { RequireRole } from "@/components/auth/require-role";

export default function DoctorsLayout({ children }: { children: React.ReactNode }) {
  return <RequireRole roles={["SUPER_ADMIN", "ADMIN"]}>{children}</RequireRole>;
}
