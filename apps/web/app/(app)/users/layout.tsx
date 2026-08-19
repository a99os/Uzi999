import { RequireRole } from "@/components/auth/require-role";

export default function UsersLayout({ children }: { children: React.ReactNode }) {
  return <RequireRole roles={["SUPER_ADMIN", "ADMIN"]}>{children}</RequireRole>;
}
