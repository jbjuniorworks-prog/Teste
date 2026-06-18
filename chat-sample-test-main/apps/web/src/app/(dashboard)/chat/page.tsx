import { getChats } from "@/lib/api";
import { ChatView } from "./chat-view";

export default async function ChatPage() {
  const chats = await getChats();
  return <ChatView key="new" initialChats={chats} chatId={null} initialMessages={[]} />;
}
