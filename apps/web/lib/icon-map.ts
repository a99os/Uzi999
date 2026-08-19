import {
  Stethoscope,
  HeartPulse,
  Brain,
  Radar,
  Activity,
  Droplet,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";

export const SERVICE_ICONS: Record<string, LucideIcon> = {
  stethoscope: Stethoscope,
  "heart-pulse": HeartPulse,
  brain: Brain,
  radar: Radar,
  activity: Activity,
  droplet: Droplet,
};

export function getServiceIcon(icon: string | null): LucideIcon {
  return (icon && SERVICE_ICONS[icon]) || ClipboardList;
}
