import { cache } from "react";

import { getSessionId } from "@/lib/session";
import {
  ApiError,
  type ChatDetail,
  type ChatSummary,
  type IssuedToken,
  type Role,
  type SendMessageResult,
  type TokenInfo,
  type User,
} from "@/lib/types";

const API_URL = process.env.API_URL ?? "http://127.0.0.1:8000";

// Server-side client (BFF): injects the session cookie and talks to the API.
// The browser never calls the API directly.
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");

  // The API requires Idempotency-Key on every write. A UUID per request satisfies the
  // contract (real retry-idempotency would require reusing the key per intent).
  const method = (init?.method ?? "GET").toUpperCase();
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    headers.set("Idempotency-Key", crypto.randomUUID());
  }

  const sessionId = await getSessionId();
  if (sessionId) {
    headers.set("Cookie", `session_id=${sessionId}`);
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const error = data?.error;
    throw new ApiError(
      error?.code ?? "HTTP_ERROR",
      error?.message ?? res.statusText,
      res.status,
    );
  }

  return data as T;
}

// cache() deduplicates calls within the same request (layout + page call getMe).
export const getMe = cache((): Promise<User> => request<User>("/auth/me"));

export const getUsers = (): Promise<User[]> => request<User[]>("/users");

export const getUser = (id: string): Promise<User> =>
  request<User>(`/users/${id}`);

export const updateUser = (
  id: string,
  body: { name?: string; email?: string; role_id?: string },
): Promise<User> =>
  request<User>(`/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

export const getRoles = (): Promise<Role[]> => request<Role[]>("/roles");

export const apiLogout = (): Promise<void> =>
  request<void>("/auth/logout", { method: "POST" });

export const getMyToken = (): Promise<TokenInfo | null> =>
  request<TokenInfo | null>("/tokens");

export const issueToken = (): Promise<IssuedToken> =>
  request<IssuedToken>("/tokens", { method: "POST" });

export const deleteMyToken = (): Promise<void> =>
  request<void>("/tokens", { method: "DELETE" });

// --- chat ---

export const getChats = (): Promise<ChatSummary[]> =>
  request<ChatSummary[]>("/chats");

export const getChatHistory = (id: string): Promise<ChatDetail> =>
  request<ChatDetail>(`/chats/${id}`);

export const sendChatMessage = (body: {
  chat_id?: string;
  message: string;
  attachment_ids?: string[];
}): Promise<SendMessageResult> =>
  request<SendMessageResult>("/chat", {
    method: "POST",
    body: JSON.stringify(body),
  });
