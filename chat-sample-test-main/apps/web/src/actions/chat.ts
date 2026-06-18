"use server";

import { getChatHistory, sendChatMessage } from "@/lib/api";
import { ApiError, type ChatDetail } from "@/lib/types";

export type SendResult =
  | { ok: true; chatId: string; runId: string }
  | { ok: false; error: string };

export async function sendMessageAction(input: {
  chatId: string | null;
  message: string;
  attachmentIds?: string[];
}): Promise<SendResult> {
  try {
    const res = await sendChatMessage({
      chat_id: input.chatId ?? undefined,
      message: input.message,
      attachment_ids: input.attachmentIds,
    });
    return { ok: true, chatId: res.chat_id, runId: res.run_id };
  } catch (e) {
    return { ok: false, error: e instanceof ApiError ? e.message : "Failed to send" };
  }
}

export type HistoryResult =
  | { ok: true; detail: ChatDetail }
  | { ok: false; error: string };

export async function loadHistoryAction(chatId: string): Promise<HistoryResult> {
  try {
    return { ok: true, detail: await getChatHistory(chatId) };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof ApiError ? e.message : "Failed to load history",
    };
  }
}
