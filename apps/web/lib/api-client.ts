import { useAuthStore } from "./auth-store";
import {
  clearStoredRefreshToken,
  getStoredRefreshToken,
  setStoredRefreshToken,
} from "./refresh-token-storage";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public payload?: Record<string, unknown>,
  ) {
    super(message);
  }
}

let refreshPromise: Promise<string | null> | null = null;

// The refresh token is also sent explicitly in the request body (not just
// relied on as a cookie) because the frontend and API can be on different
// origins, where a SameSite=Lax cookie is not sent on cross-site fetches.
async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    const stored = getStoredRefreshToken();
    refreshPromise = fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(stored ? { refreshToken: stored } : {}),
    })
      .then(async (res) => {
        if (!res.ok) {
          clearStoredRefreshToken();
          return null;
        }
        const data = await res.json();
        if (data.refreshToken) setStoredRefreshToken(data.refreshToken);
        return data.accessToken as string;
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  skipAuth?: boolean;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, skipAuth, headers, ...rest } = options;
  const token = useAuthStore.getState().accessToken;

  const doFetch = async (accessToken: string | null) =>
    fetch(`${API_URL}${path}`, {
      ...rest,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken && !skipAuth ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

  let res = await doFetch(token);

  if (res.status === 401 && !skipAuth) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      const { user, setSession, clear } = useAuthStore.getState();
      if (user) setSession(newToken, user);
      else clear();
      res = await doFetch(newToken);
    } else {
      useAuthStore.getState().clear();
    }
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: res.statusText }));
    const { error: message, ...payload } = data;
    throw new ApiError(res.status, message ?? "Request failed", payload);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export async function apiUpload<T>(path: string, file: File): Promise<T> {
  const form = new FormData();
  form.append("file", file);

  const doUpload = async (accessToken: string | null) =>
    fetch(`${API_URL}${path}`, {
      method: "POST",
      credentials: "include",
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      body: form,
    });

  let res = await doUpload(useAuthStore.getState().accessToken);

  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      const { user, setSession, clear } = useAuthStore.getState();
      if (user) setSession(newToken, user);
      else clear();
      res = await doUpload(newToken);
    } else {
      useAuthStore.getState().clear();
    }
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: res.statusText }));
    const { error: message, ...payload } = data;
    throw new ApiError(res.status, message ?? "Upload failed", payload);
  }
  return res.json();
}

export { refreshAccessToken, API_URL };
