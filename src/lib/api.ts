import { Platform } from "react-native";
import { authClient } from "./auth-client";
import { notify } from "./notify";

const BASE = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/$/, "");

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// On a phone the session cookie lives in SecureStore and must be sent by hand.
// In a browser the cookie is sent automatically (credentials: "include").
function sessionCookie(): string {
  const client = authClient as unknown as { getCookie?: () => string };
  return client.getCookie?.() ?? "";
}

let handlingExpiry = false;
async function handleExpiredSession() {
  if (handlingExpiry) return;
  handlingExpiry = true;
  try {
    await authClient.signOut(); // clears the local session; the root layout then shows the login screen
  } catch {}
  notify("Session expired", "Please log in again.");
  setTimeout(() => (handlingExpiry = false), 2000);
}

interface Options {
  method?: string;
  body?: unknown;
  deviceToken?: string; // patient device calls use a bearer token instead of the family session
}

export async function api<T = any>(path: string, opts: Options = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const hasBody = opts.body !== undefined;
  if (hasBody) headers["Content-Type"] = "application/json";

  const init: RequestInit = { method: opts.method ?? (hasBody ? "POST" : "GET"), headers };
  if (hasBody) init.body = JSON.stringify(opts.body);

  if (opts.deviceToken) {
    headers.Authorization = `Bearer ${opts.deviceToken}`;
  } else if (Platform.OS === "web") {
    init.credentials = "include";
  } else {
    const cookie = sessionCookie();
    if (cookie) headers.Cookie = cookie;
    init.credentials = "omit";
  }

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, init);
  } catch {
    throw new ApiError("Can't reach the server. Check your connection and that the backend is running.", 0, "NETWORK");
  }

  let data: any = null;
  try {
    data = await res.json();
  } catch {}

  if (!res.ok) {
    if (res.status === 401 && !opts.deviceToken) await handleExpiredSession();
    throw new ApiError(data?.error || data?.message || `Request failed (${res.status})`, res.status, data?.code);
  }
  return data as T;
}

export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");
