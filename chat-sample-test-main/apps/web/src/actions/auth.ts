"use server";

import { redirect } from "next/navigation";

import { apiLogout } from "@/lib/api";
import { setSessionId, clearSessionId } from "@/lib/session";

const API_URL = process.env.API_URL ?? "http://127.0.0.1:8000";

export type LoginState = { error?: string };

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": crypto.randomUUID(),  // API requires it on every write
    },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    return { error: data?.error?.message ?? "Login failed" };
  }

  // Extracts the session_id from the API's Set-Cookie and rewrites it as a Next cookie.
  const setCookies = res.headers.getSetCookie?.() ?? [];
  const sessionCookie = setCookies.find((c) => c.startsWith("session_id="));
  const value = sessionCookie?.split(";")[0]?.split("=")[1];

  if (!value) {
    return { error: "Session not returned by the API" };
  }

  await setSessionId(value);
  redirect("/users");
}

export async function logoutAction(): Promise<void> {
  try {
    await apiLogout();
  } catch {
    // even if the API fails, we clear the local cookie and proceed to login
  }
  await clearSessionId();
  redirect("/login");
}
