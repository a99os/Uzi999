import { create } from "zustand";
import type { RoleName } from "@anora/shared-types";

export interface SessionUser {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string | null;
  roles: RoleName[];
  soundEnabled: boolean;
  customSoundUrl: string | null;
  doctorProfile?: { id: string; specialization: string } | null;
}

interface AuthState {
  accessToken: string | null;
  user: SessionUser | null;
  status: "loading" | "authenticated" | "unauthenticated";
  setSession: (accessToken: string, user: SessionUser) => void;
  setSoundEnabled: (enabled: boolean) => void;
  updateSelf: (patch: Partial<Pick<SessionUser, "firstName" | "lastName" | "customSoundUrl">>) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  status: "loading",
  setSession: (accessToken, user) =>
    set({ accessToken, user, status: "authenticated" }),
  setSoundEnabled: (enabled) =>
    set((state) => ({
      user: state.user ? { ...state.user, soundEnabled: enabled } : state.user,
    })),
  updateSelf: (patch) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...patch } : state.user,
    })),
  clear: () => set({ accessToken: null, user: null, status: "unauthenticated" }),
}));
