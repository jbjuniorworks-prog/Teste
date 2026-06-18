export type Permission =
  | "users:get_all"
  | "users:get"
  | "users:create"
  | "users:update"
  | "users:delete"
  | "roles:get_all";

export interface Role {
  id: string;
  name: string;
  permissions: Permission[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface TokenInfo {
  prefix: string;
  created_at: string;
}

export interface IssuedToken {
  token: string;
  prefix: string;
  created_at: string;
}

export interface ChatSummary {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatEvent {
  seq: number;
  type: string;
  owner: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string | null;
  status: string | null;
  error: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
  completed_at: string | null;
  events: ChatEvent[];
}

export interface ChatDetail {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
  messages: ChatMessage[];
}

export interface SendMessageResult {
  chat_id: string;
  run_id: string;
  stream_url: string;
}

// Mirrors the API's error envelope: { error: { code, message } }.
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
