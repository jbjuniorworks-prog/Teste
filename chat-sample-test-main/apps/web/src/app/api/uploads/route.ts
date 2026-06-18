import { NextRequest } from "next/server";

import { getSessionId } from "@/lib/session";

const API_URL = process.env.API_URL ?? "http://127.0.0.1:8000";

// Upload proxy (multipart): the browser sends the PDF here; Next injects the session
// cookie + Idempotency-Key and forwards it to the API. In a real app with GCS, you could
// upload directly via a signed URL, but the BFF pattern keeps auth server-side.
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<Response> {
  const sessionId = await getSessionId();
  const headers: Record<string, string> = {
    "Idempotency-Key": crypto.randomUUID(),
  };
  if (sessionId) headers["Cookie"] = `session_id=${sessionId}`;

  // Forwards the multipart body as-is (without setting Content-Type: fetch reuses the
  // boundary from the FormData rebuilt from the request).
  const form = await req.formData();

  const upstream = await fetch(`${API_URL}/uploads`, {
    method: "POST",
    headers,
    body: form,
    cache: "no-store",
  });

  const body = await upstream.text();
  return new Response(body, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "application/json",
    },
  });
}
