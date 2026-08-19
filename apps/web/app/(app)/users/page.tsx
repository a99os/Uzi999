import { Topbar } from "@/components/layout/topbar";
import { UsersManager } from "@/components/users/users-manager";

export default function UsersPage() {
  return (
    <>
      <Topbar title="Users" subtitle="Manage staff accounts and role assignments" />
      <div className="p-8">
        <UsersManager />
      </div>
    </>
  );
}
