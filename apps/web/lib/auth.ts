import { apiFetch, refreshAccessToken } from "./api-client";
import { useAuthStore, type SessionUser } from "./auth-store";
import { clearStoredRefreshToken, setStoredRefreshToken } from "./refresh-token-storage";

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

// The login response's own `user` field is intentionally not trusted here —
// it doesn't include doctorProfile (only /me does), which silently broke
// every doctorProfile-gated fetch (queue prefetch, socket room join) right
// after a fresh login, until a full page reload ran hydrateSession()/`/me`.
// Always resolving through fetchMe() keeps login and hydration on one path.
export async function login(username: string, password: string) {
  const res = await apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: { username, password },
    skipAuth: true,
  });
  setStoredRefreshToken(res.refreshToken);
  const user = await fetchMe(res.accessToken);
  useAuthStore.getState().setSession(res.accessToken, user);
  return user;
}

export async function logout() {
  await apiFetch("/auth/logout", { method: "POST" }).catch(() => {});
  clearStoredRefreshToken();
  useAuthStore.getState().clear();
}

export async function fetchMe(accessToken: string): Promise<SessionUser> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/me`,
    { headers: { Authorization: `Bearer ${accessToken}` }, credentials: "include" },
  );
  if (!res.ok) throw new Error("Failed to load profile");
  return res.json();
}

export async function hydrateSession(): Promise<SessionUser | null> {
  const token = await refreshAccessToken();
  if (!token) return null;
  try {
    const user = await fetchMe(token);
    useAuthStore.getState().setSession(token, user);
    return user;
  } catch {
    return null;
  }
}
