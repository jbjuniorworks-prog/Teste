import { notFound } from "next/navigation";

import { getChatHistory, getChats } from "@/lib/api";
import { ChatView } from "../chat-view";

export default async function ChatDetailPage({
  params,
}: {
  params: Promise<{ chatId: string }>;
}) {
  const { chatId } = await params;
  const [chats, detail] = await Promise.all([
    getChats(),
    getChatHistory(chatId).catch(() => null),
  ]);
  if (!detail) notFound();

  return (
    <ChatView
      key={chatId}
      initialChats={chats}
      chatId={chatId}
      initialMessages={detail.messages}
    />
  );
}
