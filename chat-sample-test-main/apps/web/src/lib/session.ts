import { cookies } from "next/headers";

// BFF session cookie (Next domain). Same name the API uses.
const COOKIE_NAME = "session_id";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days (absolute session cap on the API)

export async function getSessionId(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value;
}

export async function setSessionId(value: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSessionId(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
