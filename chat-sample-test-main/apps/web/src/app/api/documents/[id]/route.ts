import { NextRequest } from "next/server";

import { getSessionId } from "@/lib/session";

const API_URL = process.env.API_URL ?? "http://127.0.0.1:8000";

// PDF proxy: the browser downloads via Next (which injects the session cookie). In a
// real app with GCS, the download would go directly through the signed URL (no proxy).
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const sessionId = await getSessionId();
  const headers: Record<string, string> = {};
  if (sessionId) headers["Cookie"] = `session_id=${sessionId}`;

  const upstream = await fetch(`${API_URL}/documents/${id}`, {
    headers,
    cache: "no-store",
    signal: req.signal,
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "application/pdf",
      "Content-Disposition":
        upstream.headers.get("content-disposition") ?? `inline; filename="${id}.pdf"`,
    },
  });
}
