import { RequireRole } from "@/components/auth/require-role";

export default function ConsultationLayout({ children }: { children: React.ReactNode }) {
  return <RequireRole roles={["DOCTOR"]}>{children}</RequireRole>;
}
