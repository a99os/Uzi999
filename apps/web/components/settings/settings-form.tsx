"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/auth-store";
import { apiFetch, apiUpload, API_URL, ApiError } from "@/lib/api-client";
import { Loader2 } from "lucide-react";

function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(audio.src);
      resolve(audio.duration);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(audio.src);
      reject(new Error("Could not read audio file"));
    };
    audio.src = URL.createObjectURL(file);
  });
}

const nameSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});
type NameForm = z.infer<typeof nameSchema>;

const usernameSchema = z.object({ username: z.string().min(3) });
type UsernameForm = z.infer<typeof usernameSchema>;

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8, "At least 8 characters"),
    confirmPassword: z.string().min(1),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
type PasswordForm = z.infer<typeof passwordSchema>;

export function SettingsForm() {
  const user = useAuthStore((s) => s.user);
  const showSound = user?.roles.includes("DOCTOR") ?? false;
  const isAdminLike = user?.roles.some((r) => r === "SUPER_ADMIN" || r === "ADMIN") ?? false;
  const setSoundEnabled = useAuthStore((s) => s.setSoundEnabled);
  const updateSelf = useAuthStore((s) => s.updateSelf);
  const [nameMsg, setNameMsg] = useState<string | null>(null);
  const [usernameMsg, setUsernameMsg] = useState<string | null>(null);
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [soundUploadError, setSoundUploadError] = useState<string | null>(null);
  const [soundUploading, setSoundUploading] = useState(false);

  async function toggleSound(enabled: boolean) {
    setSoundEnabled(enabled);
    await apiFetch("/me/sound", { method: "PATCH", body: { soundEnabled: enabled } });
  }

  async function handleSoundFile(file: File) {
    setSoundUploadError(null);
    const duration = await getAudioDuration(file).catch(() => null);
    if (duration !== null && duration > 5) {
      setSoundUploadError("Sound must be 5 seconds or shorter.");
      return;
    }
    setSoundUploading(true);
    try {
      const { customSoundUrl } = await apiUpload<{ customSoundUrl: string }>(
        "/me/sound-upload",
        file,
      );
      updateSelf({ customSoundUrl });
    } catch (err) {
      setSoundUploadError(err instanceof ApiError ? err.message : "Failed to upload sound");
    } finally {
      setSoundUploading(false);
    }
  }

  async function removeCustomSound() {
    await apiFetch("/me/sound-upload", { method: "DELETE" });
    updateSelf({ customSoundUrl: null });
  }

  const nameForm = useForm<NameForm>({
    resolver: zodResolver(nameSchema),
    values: { firstName: user?.firstName ?? "", lastName: user?.lastName ?? "" },
  });

  async function onNameSubmit(values: NameForm) {
    setNameMsg(null);
    try {
      await apiFetch("/me/name", { method: "PATCH", body: values });
      updateSelf(values);
      setNameMsg("Name updated.");
    } catch (err) {
      setNameMsg(err instanceof ApiError ? err.message : "Failed to update name");
    }
  }

  const usernameForm = useForm<UsernameForm>({
    resolver: zodResolver(usernameSchema),
    values: { username: user?.username ?? "" },
  });

  async function onUsernameSubmit(values: UsernameForm) {
    setUsernameMsg(null);
    try {
      await apiFetch("/me/username", { method: "PATCH", body: values });
      setUsernameMsg("Username updated.");
    } catch (err) {
      setUsernameMsg(err instanceof ApiError ? err.message : "Failed to update username");
    }
  }

  const passwordForm = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

  async function onPasswordSubmit(values: PasswordForm) {
    setPasswordMsg(null);
    try {
      await apiFetch("/me/password", {
        method: "PATCH",
        body: { currentPassword: values.currentPassword, newPassword: values.newPassword },
      });
      setPasswordMsg("Password updated.");
      passwordForm.reset();
    } catch (err) {
      setPasswordMsg(err instanceof ApiError ? err.message : "Failed to update password");
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      {isAdminLike && (
        <Card>
          <CardHeader>
            <CardTitle>Anora Med Farm</CardTitle>
            <CardDescription>
              Clinic-wide settings (branding, working hours, integrations) will live here.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Manage staff in <strong>Users</strong> and pricing in <strong>Services &amp; Diagnoses</strong>.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Name</CardTitle>
          <CardDescription>Your display name across the app.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={nameForm.handleSubmit(onNameSubmit)} className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>First name</Label>
              <Input {...nameForm.register("firstName")} />
              {nameForm.formState.errors.firstName && (
                <p className="text-xs text-destructive">
                  {nameForm.formState.errors.firstName.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Last name</Label>
              <Input {...nameForm.register("lastName")} />
              {nameForm.formState.errors.lastName && (
                <p className="text-xs text-destructive">
                  {nameForm.formState.errors.lastName.message}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3 sm:col-span-2">
              <Button type="submit" disabled={nameForm.formState.isSubmitting}>
                {nameForm.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />}
                Save
              </Button>
              {nameMsg && <p className="text-sm text-muted-foreground">{nameMsg}</p>}
            </div>
          </form>
        </CardContent>
      </Card>

      {showSound && (
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>
              Play a sound when a new patient is registered to your queue.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border p-4">
              <Label htmlFor="sound-toggle" className="text-sm font-medium">
                Sound notifications
              </Label>
              <Switch
                id="sound-toggle"
                checked={user?.soundEnabled ?? true}
                onCheckedChange={toggleSound}
              />
            </div>

            <div className="space-y-2">
              <Label>Custom notification sound (max 5 seconds)</Label>
              {user?.customSoundUrl ? (
                <div className="flex items-center gap-3">
                  <audio controls src={`${API_URL}${user.customSoundUrl}`} className="h-9 flex-1" />
                  <Button type="button" variant="outline" size="sm" onClick={removeCustomSound}>
                    Remove
                  </Button>
                </div>
              ) : (
                <Input
                  type="file"
                  accept="audio/*"
                  disabled={soundUploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleSoundFile(file);
                  }}
                />
              )}
              {soundUploading && <p className="text-xs text-muted-foreground">Uploading…</p>}
              {soundUploadError && <p className="text-xs text-destructive">{soundUploadError}</p>}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Username</CardTitle>
          <CardDescription>This is what you use to sign in.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={usernameForm.handleSubmit(onUsernameSubmit)}
            className="flex items-end gap-3"
          >
            <div className="flex-1 space-y-1.5">
              <Label>Username</Label>
              <Input {...usernameForm.register("username")} />
              {usernameForm.formState.errors.username && (
                <p className="text-xs text-destructive">
                  {usernameForm.formState.errors.username.message}
                </p>
              )}
            </div>
            <Button type="submit" disabled={usernameForm.formState.isSubmitting}>
              {usernameForm.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />}
              Save
            </Button>
          </form>
          {usernameMsg && <p className="mt-2 text-sm text-muted-foreground">{usernameMsg}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Current password</Label>
              <Input type="password" {...passwordForm.register("currentPassword")} />
              {passwordForm.formState.errors.currentPassword && (
                <p className="text-xs text-destructive">
                  {passwordForm.formState.errors.currentPassword.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>New password</Label>
              <Input type="password" {...passwordForm.register("newPassword")} />
              {passwordForm.formState.errors.newPassword && (
                <p className="text-xs text-destructive">
                  {passwordForm.formState.errors.newPassword.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Confirm new password</Label>
              <Input type="password" {...passwordForm.register("confirmPassword")} />
              {passwordForm.formState.errors.confirmPassword && (
                <p className="text-xs text-destructive">
                  {passwordForm.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>
            {passwordMsg && <p className="text-sm text-muted-foreground">{passwordMsg}</p>}
            <Button type="submit" disabled={passwordForm.formState.isSubmitting}>
              {passwordForm.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />}
              Update Password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
