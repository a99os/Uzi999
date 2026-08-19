"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { ROLE_NAMES, type RoleName } from "@anora/shared-types";
import { apiFetch, ApiError } from "@/lib/api-client";
import { ROLE_LABEL } from "@/lib/nav-config";
import { useAuthStore } from "@/lib/auth-store";
import { useConfirm } from "@/components/providers/confirm-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2, Pencil } from "lucide-react";

interface UserRow {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string | null;
  status: "ACTIVE" | "INACTIVE";
  lastActiveAt: string | null;
  roles: { role: { name: RoleName } }[];
  doctorProfile: { specialization: string } | null;
  createdById: string | null;
}

function buildCreateSchema(t: (key: string) => string) {
  return z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    username: z.string().min(3, t("atLeast3Chars")),
    email: z.string().email().optional().or(z.literal("")),
    password: z.string().min(8, t("atLeast8Chars")),
    roles: z.array(z.enum(ROLE_NAMES)).min(1, t("selectAtLeastOneRole")),
    specialization: z.string().optional(),
  });
}
type CreateForm = z.infer<ReturnType<typeof buildCreateSchema>>;

function buildEditSchema(t: (key: string) => string) {
  return z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    username: z.string().min(3, t("atLeast3Chars")),
    roles: z.array(z.enum(ROLE_NAMES)).min(1, t("selectAtLeastOneRole")),
    specialization: z.string().optional(),
    newPassword: z.string().min(8, t("atLeast8Chars")).optional().or(z.literal("")),
  });
}
type EditForm = z.infer<ReturnType<typeof buildEditSchema>>;

function RoleCheckboxes({
  roles,
  onChange,
  availableRoles,
}: {
  roles: RoleName[];
  onChange: (roles: RoleName[]) => void;
  availableRoles: readonly RoleName[];
}) {
  return (
    <div className="flex flex-wrap gap-4">
      {availableRoles.map((role) => (
        <label key={role} className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={roles.includes(role)}
            onCheckedChange={(checked) => {
              onChange(checked ? [...roles, role] : roles.filter((r) => r !== role));
            }}
          />
          {ROLE_LABEL[role]}
        </label>
      ))}
    </div>
  );
}

export function UsersManager() {
  const t = useTranslations("usersPage");
  const tCommon = useTranslations("common");
  const currentUser = useAuthStore((s) => s.user);
  const confirm = useConfirm();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const isSuperAdmin = currentUser?.roles.includes("SUPER_ADMIN") ?? false;
  const availableRoles = isSuperAdmin ? ROLE_NAMES : ROLE_NAMES.filter((r) => r !== "SUPER_ADMIN");

  function load() {
    apiFetch<UserRow[]>("/users").then(setUsers);
  }
  useEffect(load, []);

  const createForm = useForm<CreateForm>({
    resolver: zodResolver(buildCreateSchema(t)),
    defaultValues: { roles: [] },
  });
  const createRoles = createForm.watch("roles");

  async function onCreate(values: CreateForm) {
    setFormError(null);
    try {
      await apiFetch("/users", {
        method: "POST",
        body: { ...values, email: values.email || undefined },
      });
      createForm.reset({ roles: [] });
      setCreateOpen(false);
      load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : t("failedToCreate"));
    }
  }

  const editForm = useForm<EditForm>({ resolver: zodResolver(buildEditSchema(t)) });
  const editRoles = editForm.watch("roles");

  function openEdit(user: UserRow) {
    setFormError(null);
    editForm.reset({
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      roles: user.roles.map((r) => r.role.name),
      specialization: user.doctorProfile?.specialization ?? "",
      newPassword: "",
    });
    setEditing(user);
  }

  async function onEdit(values: EditForm) {
    if (!editing) return;
    setFormError(null);
    try {
      await apiFetch(`/users/${editing.id}`, {
        method: "PATCH",
        body: {
          firstName: values.firstName,
          lastName: values.lastName,
          username: values.username,
          roles: values.roles,
          specialization: values.specialization || undefined,
          ...(values.newPassword ? { password: values.newPassword } : {}),
        },
      });
      setEditing(null);
      load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : t("failedToUpdate"));
    }
  }

  async function deleteUser(user: UserRow) {
    const ok = await confirm({
      title: t("deleteConfirmTitle", { name: `${user.firstName} ${user.lastName}` }),
      description: t("deleteConfirmDesc"),
      confirmLabel: tCommon("delete"),
      destructive: true,
    });
    if (!ok) return;
    await apiFetch(`/users/${user.id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="size-4" />
            {t("addUser")}
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("addUser")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={createForm.handleSubmit(onCreate)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>{t("firstName")}</Label>
                  <Input {...createForm.register("firstName")} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("lastName")}</Label>
                  <Input {...createForm.register("lastName")} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t("username")}</Label>
                <Input {...createForm.register("username")} />
                {createForm.formState.errors.username && (
                  <p className="text-xs text-destructive">
                    {createForm.formState.errors.username.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>{t("emailOptional")}</Label>
                <Input type="email" {...createForm.register("email")} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("temporaryPassword")}</Label>
                <Input type="password" {...createForm.register("password")} />
                {createForm.formState.errors.password && (
                  <p className="text-xs text-destructive">
                    {createForm.formState.errors.password.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>{t("rolesLabel")}</Label>
                <Controller
                  control={createForm.control}
                  name="roles"
                  render={({ field }) => (
                    <RoleCheckboxes
                      roles={field.value ?? []}
                      onChange={field.onChange}
                      availableRoles={availableRoles}
                    />
                  )}
                />
                {createForm.formState.errors.roles && (
                  <p className="text-xs text-destructive">
                    {createForm.formState.errors.roles.message}
                  </p>
                )}
              </div>
              {createRoles?.includes("DOCTOR") && (
                <div className="space-y-1.5">
                  <Label>{t("specialization")}</Label>
                  <Input placeholder={t("specializationPlaceholder")} {...createForm.register("specialization")} />
                </div>
              )}
              {formError && <p className="text-sm text-destructive">{formError}</p>}
              <Button type="submit" className="w-full" disabled={createForm.formState.isSubmitting}>
                {t("createUser")}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="divide-y p-0">
          {users.map((u) => {
            const initials = `${u.firstName[0]}${u.lastName[0]}`.toUpperCase();
            const targetIsSuperAdmin = u.roles.some((r) => r.role.name === "SUPER_ADMIN");
            const targetIsAdmin = u.roles.some((r) => r.role.name === "ADMIN");
            const canManage =
              isSuperAdmin ||
              (!targetIsSuperAdmin &&
                (!targetIsAdmin || u.createdById === null || u.createdById === currentUser?.id));
            return (
              <div key={u.id} className="flex items-center gap-4 px-4 py-3">
                <Avatar>
                  <AvatarFallback className="bg-primary/10 text-primary">{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {u.firstName} {u.lastName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">@{u.username}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {u.roles.map((r) => (
                    <Badge key={r.role.name} variant="secondary">
                      {ROLE_LABEL[r.role.name]}
                    </Badge>
                  ))}
                </div>
                <Badge
                  className={
                    u.status === "ACTIVE"
                      ? "bg-status-completed-bg text-status-completed"
                      : "bg-status-cancelled-bg text-status-cancelled"
                  }
                >
                  {u.status === "ACTIVE" ? tCommon("active") : tCommon("inactive")}
                </Badge>
                {canManage && (
                  <Button variant="ghost" size="icon" onClick={() => openEdit(u)} title={tCommon("edit")}>
                    <Pencil className="size-4" />
                  </Button>
                )}
                {canManage && u.status === "ACTIVE" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteUser(u)}
                    title={tCommon("delete")}
                    className="text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("editUserTitle", { name: `${editing?.firstName ?? ""} ${editing?.lastName ?? ""}` })}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(onEdit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t("firstName")}</Label>
                <Input {...editForm.register("firstName")} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("lastName")}</Label>
                <Input {...editForm.register("lastName")} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("username")}</Label>
              <Input {...editForm.register("username")} />
              {editForm.formState.errors.username && (
                <p className="text-xs text-destructive">
                  {editForm.formState.errors.username.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t("rolesLabel")}</Label>
              <Controller
                control={editForm.control}
                name="roles"
                render={({ field }) => (
                  <RoleCheckboxes
                    roles={field.value ?? []}
                    onChange={field.onChange}
                    availableRoles={availableRoles}
                  />
                )}
              />
            </div>
            {editRoles?.includes("DOCTOR") && (
              <div className="space-y-1.5">
                <Label>{t("specialization")}</Label>
                <Input placeholder={t("specializationPlaceholder")} {...editForm.register("specialization")} />
              </div>
            )}
            <div className="space-y-1.5 border-t pt-4">
              <Label>{t("resetPasswordOptional")}</Label>
              <Input type="password" placeholder={t("leaveBlankPassword")} {...editForm.register("newPassword")} />
              {editForm.formState.errors.newPassword && (
                <p className="text-xs text-destructive">
                  {editForm.formState.errors.newPassword.message}
                </p>
              )}
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <Button type="submit" className="w-full" disabled={editForm.formState.isSubmitting}>
              {t("saveChanges")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
