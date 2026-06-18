"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, Loader2, Paperclip, Plus, Send, Users, Wrench, X } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { sendMessageAction } from "@/actions/chat";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ChatMessage, ChatSummary } from "@/lib/types";

// Style of the markdown rendered in the bubbles (no typography plugin).
const MD_CLASS =
  "text-sm leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 " +
  "[&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 " +
  "[&_li]:my-0.5 [&_strong]:font-semibold [&_a]:underline " +
  "[&_h1]:font-heading [&_h2]:font-heading [&_h3]:font-heading [&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold " +
  "[&_code]:rounded [&_code]:bg-foreground/10 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs " +
  "[&_pre]:my-2 [&_pre]:overflow-auto [&_pre]:rounded [&_pre]:bg-foreground/5 [&_pre]:p-3 " +
  "[&_pre_code]:bg-transparent [&_pre_code]:p-0";

type Block =
  | { kind: "user"; text: string; attachments?: string[] }
  | { kind: "assistant"; text: string; error?: string | null }
  | { kind: "tool"; name: string; args: unknown; result?: unknown; done: boolean }
  | { kind: "subagent"; task: string; result?: string; done: boolean }
  | { kind: "file"; name: string; href: string };

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

// Hides sensitive fields (e.g. password) when showing the tool args.
function redact(value: unknown): unknown {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) =>
        k === "password" ? [k, "•••"] : [k, v],
      ),
    );
  }
  return value;
}

function fmt(value: unknown, n = 800): string {
  const s = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return truncate(s ?? "", n);
}

function argsInline(args: unknown): string {
  const r = redact(args);
  if (r && typeof r === "object" && Object.keys(r).length === 0) return "";
  return truncate(typeof r === "string" ? r : JSON.stringify(r), 60);
}

function tryParse(s: unknown): unknown {
  if (typeof s !== "string") return s;
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}

// The MCP tool result comes as blocks [{type:"text", text:"<json>"}].
// Unwraps and parses it: becomes an object/list (JSON) or string (raw).
function parseToolResult(result: unknown): unknown {
  if (
    Array.isArray(result) &&
    result.length > 0 &&
    result.every(
      (b) => b !== null && typeof b === "object" && "text" in (b as object),
    )
  ) {
    const parsed = (result as { text: unknown }[]).map((b) => tryParse(b.text));
    return parsed.length === 1 ? parsed[0] : parsed;
  }
  return tryParse(result);
}

function JsonPrimitive({ value }: { value: unknown }) {
  if (value === null) return <span className="text-muted-foreground">null</span>;
  if (typeof value === "string")
    return <span className="text-emerald-600 dark:text-emerald-400">&quot;{value}&quot;</span>;
  return <span className="text-foreground/80">{String(value)}</span>;
}

// Swagger-style tree node: object/list start collapsed ("Object"/"Array[n]")
// and expand level by level on click, until the user opens everything.
function JsonNode({ name, value }: { name?: string; value: unknown }) {
  const [open, setOpen] = useState(false);
  const isObj = value !== null && typeof value === "object";
  const label =
    name !== undefined ? (
      <>
        <span className="text-sky-700 dark:text-sky-400">{name}</span>
        <span className="text-muted-foreground">: </span>
      </>
    ) : null;

  if (!isObj) {
    return (
      <div>
        {label}
        <JsonPrimitive value={value} />
      </div>
    );
  }

  const arr = Array.isArray(value);
  const entries: [string, unknown][] = arr
    ? (value as unknown[]).map((v, i) => [String(i), v])
    : Object.entries(value as Record<string, unknown>);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 hover:text-foreground"
      >
        <span className="text-muted-foreground">{open ? "▾" : "▸"}</span>
        {label}
        <span className="font-medium text-foreground/80">
          {arr ? `Array[${entries.length}]` : "Object"}
        </span>
      </button>
      {open ? (
        <div className="ml-1.5 border-l border-border pl-3">
          {entries.map(([k, v]) => (
            <JsonNode key={k} name={k} value={v} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ToolResult({ result }: { result: unknown }) {
  const parsed = parseToolResult(result);
  if (parsed !== null && typeof parsed === "object") {
    return <JsonNode value={parsed} />;
  }
  return <span className="whitespace-pre-wrap">{fmt(parsed)}</span>;
}


// Reducer shared by live stream AND history: applies an event to the list.
function applyEvent(blocks: Block[], type: string, payload: Record<string, unknown>): Block[] {
  const last = blocks[blocks.length - 1];
  switch (type) {
    case "token": {
      const text = (payload.text as string) ?? "";
      if (last?.kind === "assistant") {
        return [...blocks.slice(0, -1), { ...last, text: last.text + text }];
      }
      return [...blocks, { kind: "assistant", text }];
    }
    case "tool_call":
      return [...blocks, { kind: "tool", name: payload.name as string, args: payload.args, done: false }];
    case "tool_result": {
      const i = lastIndexOf(blocks, (b) => b.kind === "tool" && !b.done && b.name === payload.name);
      if (i < 0) return blocks;
      const copy = [...blocks];
      const toolBlock = copy[i] as Extract<Block, { kind: "tool" }>;
      copy[i] = { ...toolBlock, result: payload.content, done: true };
      // generate_user_report -> pushes a file bubble (attachment) right after.
      if (payload.name === "generate_user_report") {
        const parsed = parseToolResult(payload.content);
        const id =
          parsed && typeof parsed === "object"
            ? (parsed as { id?: string }).id
            : undefined;
        if (id) {
          const args = toolBlock.args as { title?: string } | undefined;
          const title = args?.title || "User Report";
          copy.push({ kind: "file", name: `${title}.pdf`, href: `/api/documents/${id}` });
        }
      }
      return copy;
    }
    case "subagent_start":
      return [...blocks, { kind: "subagent", task: (payload.task as string) ?? "", done: false }];
    case "subagent_result": {
      const i = lastIndexOf(blocks, (b) => b.kind === "subagent" && !b.done);
      if (i < 0) return blocks;
      const copy = [...blocks];
      copy[i] = { ...(copy[i] as Extract<Block, { kind: "subagent" }>), result: payload.result as string, done: true };
      return copy;
    }
    case "assistant_final": {
      const text = (payload.text as string) ?? "";
      if (last?.kind === "assistant") {
        return [...blocks.slice(0, -1), { ...last, text }];
      }
      return [...blocks, { kind: "assistant", text }];
    }
    default:
      return blocks; // assistant_step etc.
  }
}

function lastIndexOf(blocks: Block[], pred: (b: Block) => boolean): number {
  for (let i = blocks.length - 1; i >= 0; i--) if (pred(blocks[i])) return i;
  return -1;
}

function historyToBlocks(messages: ChatMessage[]): Block[] {
  let blocks: Block[] = [];
  for (const m of messages) {
    if (m.role === "user") {
      const ids = (m.meta?.attachment_ids as string[] | undefined) ?? [];
      blocks.push({
        kind: "user",
        text: m.content ?? "",
        attachments: ids.length ? ids.map(() => "Document attached") : undefined,
      });
      continue;
    }
    for (const e of m.events) blocks = applyEvent(blocks, e.type, e.payload);
    if (m.content) blocks.push({ kind: "assistant", text: m.content, error: m.error });
    else if (m.error) blocks.push({ kind: "assistant", text: "", error: m.error });
  }
  return blocks;
}

function chatLabel(c: ChatSummary): string {
  return c.title ?? "New Chat";
}

export function ChatView({
  initialChats,
  chatId,
  initialMessages,
}: {
  initialChats: ChatSummary[];
  chatId: string | null;
  initialMessages: ChatMessage[];
}) {
  const router = useRouter();
  const [chats, setChats] = useState<ChatSummary[]>(initialChats);
  const [activeId, setActiveId] = useState<string | null>(chatId);
  const [blocks, setBlocks] = useState<Block[]>(() => historyToBlocks(initialMessages));
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  // current attachment (PoC: 1 per message). Uploaded to the BFF before sending the message.
  const [attachment, setAttachment] = useState<{ id: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const esRef = useRef<EventSource | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function closeStream() {
    esRef.current?.close();
    esRef.current = null;
  }

  useEffect(() => closeStream, []);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [blocks, busy]);

  // textarea grows with the content (up to a cap), then scrolls.
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [input]);

  function push(type: string, payload: Record<string, unknown>) {
    setBlocks((prev) => applyEvent(prev, type, payload));
  }

  function selectChat(id: string) {
    if (id === activeId) return;
    closeStream();
    router.push(`/chat/${id}`); // a server page loads the history
  }

  function newChat() {
    closeStream();
    router.push("/chat");
  }

  function openStream(runId: string, streamChatId: string) {
    const es = new EventSource(`/api/chat/${runId}/stream`);
    esRef.current = es;
    const on =
      (type: string) =>
      (e: Event) => {
        const data = (e as MessageEvent).data;
        if (!data) return;
        const ev = JSON.parse(data);
        // Internal subagent events (tokens/tools with owner != supervisor) do NOT
        // enter the thread — the subagent is a black box (start -> result), like the
        // persisted history. Otherwise its internal list_users would leak as a bubble.
        if (ev.owner && ev.owner !== "supervisor") return;
        push(type, ev.payload ?? {});
      };

    for (const t of ["token", "tool_call", "tool_result", "subagent_start", "subagent_result", "assistant_final"]) {
      es.addEventListener(t, on(t));
    }
    // title generated by the backend -> updates the conversation label live
    es.addEventListener("title", (e) => {
      const data = (e as MessageEvent).data;
      if (!data) return;
      const title = JSON.parse(data).payload?.title;
      if (title) {
        setChats((prev) =>
          prev.map((c) => (c.id === streamChatId ? { ...c, title } : c)),
        );
      }
    });
    es.addEventListener("done", () => {
      closeStream();
      setBusy(false);
    });
    es.addEventListener("error", (e) => {
      const data = (e as MessageEvent).data;
      if (!data) return; // connection blip -> EventSource reconnects (Last-Event-ID)
      let message = "Processing error";
      try {
        message = JSON.parse(data).payload?.message ?? message;
      } catch {
        /* ignore */
      }
      setBlocks((prev) => {
        const last = prev[prev.length - 1];
        if (last?.kind === "assistant") {
          return [...prev.slice(0, -1), { ...last, error: message }];
        }
        return [...prev, { kind: "assistant", text: "", error: message }];
      });
      closeStream();
      setBusy(false);
    });
  }

  async function uploadFile(file: File) {
    setUploadError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: form });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setUploadError(data?.error?.message ?? "Upload failed");
        return;
      }
      setAttachment({ id: data.id, name: data.filename });
    } catch {
      setUploadError("Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function send() {
    const text = input.trim();
    if ((!text && !attachment) || busy) return;
    const sentAttachment = attachment;
    setInput("");
    setAttachment(null);
    setBusy(true);
    setBlocks((prev) => [
      ...prev,
      { kind: "user", text, attachments: sentAttachment ? [sentAttachment.name] : undefined },
    ]);

    const res = await sendMessageAction({
      chatId: activeId,
      message: text,
      attachmentIds: sentAttachment ? [sentAttachment.id] : undefined,
    });
    if (!res.ok) {
      setBlocks((prev) => [...prev, { kind: "assistant", text: "", error: res.error }]);
      setBusy(false);
      return;
    }
    if (!activeId) {
      setActiveId(res.chatId);
      // Updates the URL to /chat/[id] WITHOUT navigating (replaceState does not remount
      // the component -> the ongoing stream stays alive). On reload, the dynamic
      // page loads this chat's history.
      window.history.replaceState(null, "", `/chat/${res.chatId}`);
      const now = new Date().toISOString();
      setChats((prev) => [
        { id: res.chatId, title: "New Chat", created_at: now, updated_at: now },
        ...prev,
      ]);
    }
    openStream(res.runId, res.chatId);
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-4">
      <div className="flex w-72 flex-col rounded-lg border bg-card">
        <div className="border-b p-3">
          <Button onClick={newChat} variant="outline" className="w-full justify-start">
            <Plus className="size-4" />
            New chat
          </Button>
        </div>
        <div className="flex-1 space-y-1 overflow-y-auto p-2">
          {chats.length === 0 ? (
            <p className="p-2 text-sm text-muted-foreground">No conversations yet.</p>
          ) : (
            chats.map((c) => (
              <button
                key={c.id}
                onClick={() => selectChat(c.id)}
                className={cn(
                  "w-full truncate rounded-md px-3 py-2 text-left text-sm transition-colors",
                  c.id === activeId
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {chatLabel(c)}
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col rounded-lg border bg-card">
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
          {blocks.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
              <Bot className="size-8" />
              <p className="text-sm">Send a message to get started.</p>
              <p className="text-xs">E.g.: “how many users are there?”</p>
            </div>
          ) : (
            <>
              {blocks.map((b, i) => (
                <BlockView key={i} block={b} />
              ))}
              {busy ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" />
                  agent working…
                </div>
              ) : null}
            </>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="p-3"
        >
          <div className="flex flex-col gap-2 rounded-2xl border bg-background p-2 shadow-sm transition focus-within:ring-1 focus-within:ring-ring">
            {attachment || uploading || uploadError ? (
              <div className="flex items-center gap-2 px-1">
                {uploading ? (
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="size-3 animate-spin" />
                    uploading document…
                  </span>
                ) : uploadError ? (
                  <span className="text-xs font-medium text-destructive">⚠ {uploadError}</span>
                ) : attachment ? (
                  <span className="flex items-center gap-2 rounded-md border bg-muted px-2 py-1 text-xs">
                    <Paperclip className="size-3" />
                    <span className="max-w-[14rem] truncate">{attachment.name}</span>
                    <button
                      type="button"
                      onClick={() => setAttachment(null)}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Remove attachment"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ) : null}
              </div>
            ) : null}
            <textarea
              ref={taRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Ask the agent something..."
              rows={1}
              disabled={busy}
              autoFocus
              className="max-h-40 w-full resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-60"
            />
            <div className="flex items-center justify-between">
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadFile(file);
                }}
              />
              <Button
                type="button"
                variant="ghost"
                onClick={() => fileRef.current?.click()}
                disabled={busy || uploading}
                className="size-9 rounded-full p-0 text-muted-foreground"
                aria-label="Attach PDF"
              >
                <Paperclip className="size-4" />
              </Button>
              <Button
                type="submit"
                disabled={busy || uploading || (!input.trim() && !attachment)}
                className="size-9 rounded-full p-0"
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function BlockView({ block }: { block: Block }) {
  if (block.kind === "user") {
    return (
      <div className="flex flex-col items-end gap-1">
        {block.attachments?.map((name, i) => (
          <span
            key={i}
            className="flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-xs text-muted-foreground"
          >
            <Paperclip className="size-3" />
            <span className="max-w-[16rem] truncate">{name}</span>
          </span>
        ))}
        {block.text ? (
          <div className={cn(MD_CLASS, "max-w-[80%] rounded-lg bg-primary px-4 py-2 text-primary-foreground")}>
            <Markdown remarkPlugins={[remarkGfm]}>{block.text}</Markdown>
          </div>
        ) : null}
      </div>
    );
  }

  if (block.kind === "assistant") {
    return (
      <div className="flex justify-start">
        <div className="max-w-[80%] space-y-1 rounded-lg bg-muted px-4 py-2 text-sm">
          {block.text ? (
            <div className={MD_CLASS}>
              <Markdown remarkPlugins={[remarkGfm]}>{block.text}</Markdown>
            </div>
          ) : null}
          {block.error ? (
            <p className="text-xs font-medium text-destructive">⚠ {block.error}</p>
          ) : null}
        </div>
      </div>
    );
  }

  if (block.kind === "file") {
    return (
      <div className="flex justify-start">
        <a
          href={block.href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex max-w-[85%] items-center gap-3 rounded-lg border bg-background px-3 py-2 no-underline transition-colors hover:bg-accent/40"
        >
          <span className="text-xl">📄</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{block.name}</p>
            <p className="text-xs text-muted-foreground">PDF · click to open</p>
          </div>
        </a>
      </div>
    );
  }

  if (block.kind === "tool") {
    return (
      <div className="flex justify-start">
        <div className="max-w-[85%] overflow-hidden rounded-lg border bg-background text-xs">
          <div className="flex items-center gap-2 bg-muted px-3 py-1.5 font-mono font-medium">
            <Wrench className="size-3.5 shrink-0" />
            <span className="truncate">
              {block.name}({argsInline(block.args)})
            </span>
          </div>
          <div className="max-h-64 overflow-auto border-t px-3 py-2 font-mono text-muted-foreground">
            {block.done ? (
              block.name === "generate_user_report" ? (
                <span className="text-muted-foreground">Document generated ✓</span>
              ) : (
                <ToolResult result={block.result} />
              )
            ) : (
              <span className="flex items-center gap-2">
                <Loader2 className="size-3 animate-spin" />
                running…
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // subagent
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] overflow-hidden rounded-lg border border-l-2 border-l-primary bg-background text-xs">
        <div className="flex items-center gap-2 bg-muted px-3 py-1.5 font-medium">
          <Users className="size-3.5 shrink-0" />
          <span className="truncate">Subagent — {truncate(block.task, 70)}</span>
        </div>
        <div className="max-h-48 overflow-auto whitespace-pre-wrap border-t px-3 py-2 text-muted-foreground">
          {block.done ? (
            block.result
          ) : (
            <span className="flex items-center gap-2">
              <Loader2 className="size-3 animate-spin" />
              working…
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
