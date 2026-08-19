import { Topbar } from "@/components/layout/topbar";
import { SettingsForm } from "@/components/settings/settings-form";

export default function SettingsPage() {
  return (
    <>
      <Topbar title="Settings" subtitle="Manage your account" />
      <div className="p-8">
        <SettingsForm />
      </div>
    </>
  );
}
