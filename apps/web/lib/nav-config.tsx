import type { RoleName } from "@anora/shared-types";
import {
  LayoutDashboard,
  Users,
  Ticket,
  Stethoscope,
  UserCog,
  ClipboardList,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  labelKey: string;
  href: string;
  icon: LucideIcon;
  roles: RoleName[];
}

export const NAV_ITEMS: NavItem[] = [
  { labelKey: "dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["SUPER_ADMIN", "ADMIN", "MANAGER", "DOCTOR"] },
  { labelKey: "patients", href: "/patients", icon: Users, roles: ["SUPER_ADMIN", "ADMIN", "MANAGER", "DOCTOR"] },
  { labelKey: "queue", href: "/queue", icon: Ticket, roles: ["SUPER_ADMIN", "ADMIN", "MANAGER", "DOCTOR"] },
  { labelKey: "doctors", href: "/doctors", icon: Stethoscope, roles: ["SUPER_ADMIN", "ADMIN"] },
  { labelKey: "users", href: "/users", icon: UserCog, roles: ["SUPER_ADMIN", "ADMIN"] },
  { labelKey: "services", href: "/services", icon: ClipboardList, roles: ["SUPER_ADMIN", "ADMIN", "MANAGER", "DOCTOR"] },
  { labelKey: "settings", href: "/settings", icon: Settings, roles: ["SUPER_ADMIN", "ADMIN", "MANAGER", "DOCTOR"] },
];

export const ROLE_LABEL: Record<RoleName, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  MANAGER: "Manager",
  DOCTOR: "Doctor",
};

export function navForRoles(roles: RoleName[]): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.some((r) => roles.includes(r)));
}

export function homeForRoles(roles: RoleName[]): string {
  return roles.length > 0 ? "/dashboard" : "/login";
}
