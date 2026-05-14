import { NextResponse, type NextRequest } from "next/server";
import { verifySignature } from "@/lib/meta/verify";
import { processWebhookPayload } from "@/lib/meta/handler";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.META_VERIFY_TOKEN) {
    // IMPORTANTE: devolver el challenge como text/plain RAW, no JSON.
    return new NextResponse(challenge ?? "", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }
  return new NextResponse("forbidden", { status: 403 });
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const sig = req.headers.get("x-hub-signature-256");
  const ok = verifySignature(raw, sig, process.env.META_APP_SECRET!);
  if (!ok) return new NextResponse("invalid signature", { status: 401 });

  let payload: unknown;
  try { 
    payload = JSON.parse(raw); 
  } catch { 
    return new NextResponse("bad json", { status: 400 }); 
  }

  // Despachar PROCESAMIENTO async, responder 200 ya.
  void processWebhookPayload(payload).catch((err) =>
    console.error("[webhook] error procesando:", err)
  );
  
  return NextResponse.json({ ok: true });
}
