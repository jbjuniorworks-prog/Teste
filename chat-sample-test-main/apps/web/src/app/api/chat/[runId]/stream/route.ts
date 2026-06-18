import { NextRequest } from "next/server";

import { getSessionId } from "@/lib/session";

const API_URL = process.env.API_URL ?? "http://127.0.0.1:8000";

// SSE proxy: the browser (EventSource) talks to Next, which injects the session
// cookie and forwards the API stream. Keeps the BFF — the browser never touches the API.
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
): Promise<Response> {
  const { runId } = await params;
  const sessionId = await getSessionId();

  const headers: Record<string, string> = { Accept: "text/event-stream" };
  if (sessionId) headers["Cookie"] = `session_id=${sessionId}`;
  // Native resume: the EventSource resends Last-Event-ID when reconnecting.
  const lastEventId = req.headers.get("last-event-id");
  if (lastEventId) headers["Last-Event-ID"] = lastEventId;

  const upstream = await fetch(`${API_URL}/chat/${runId}/stream`, {
    headers,
    cache: "no-store",
    signal: req.signal,
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
