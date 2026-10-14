import { Platform } from "react-native";
import { authClient } from "./auth-client";
import { notify } from "./notify";
import { API_BASE as BASE } from "./config";

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
async function sessionCookie(): Promise<string> {
  const client = authClient as unknown as {
    getCookie?: () => Promise<string> | string;
  };

  return (await client.getCookie?.()) ?? "";
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
  faceSession?: string; // proof of the face check, needed for most patient calls
}

export async function api<T = any>(path: string, opts: Options = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const hasBody = opts.body !== undefined;
  if (hasBody) headers["Content-Type"] = "application/json";

  const init: RequestInit = { method: opts.method ?? (hasBody ? "POST" : "GET"), headers };
  if (hasBody) init.body = JSON.stringify(opts.body);

    if (opts.deviceToken) {
    headers.Authorization = `Bearer ${opts.deviceToken}`;
    if (opts.faceSession) headers["X-Patient-Session"] = opts.faceSession;
  } else if (Platform.OS === "web") {
  } 
  else {
    const cookie = await sessionCookie();

if (cookie) {
  headers.Cookie = cookie;
}

init.credentials = "omit";
  }

    let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, init);
  } catch (err) {
    console.log("[api] fetch failed:", `${BASE}${path}`, String(err));
    console.log("[api] has cookie:", Boolean(headers.Cookie), "cookie length:", headers.Cookie?.length);
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
