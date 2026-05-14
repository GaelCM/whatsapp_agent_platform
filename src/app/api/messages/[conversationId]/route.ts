import { NextResponse, type NextRequest } from "next/server";
import { getMessages, getConversationById, insertMessage, updateMessageWaId } from "@/lib/db";
import { sendTextMessage } from "@/lib/meta/client";

interface Ctx { params: Promise<{ conversationId: string }>; }
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { conversationId } = await params;
  try {
    const msgs = getMessages(Number(conversationId));
    return NextResponse.json(msgs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { conversationId } = await params;
  const id = Number(conversationId);
  const convo = getConversationById(id);
  
  if (!convo) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { content } = await req.json();
  if (!content) return NextResponse.json({ error: "content required" }, { status: 400 });

  const messageId = insertMessage(convo.id, "human", content, null);

  try {
    const { wa_message_id } = await sendTextMessage(convo.phone, content);
    updateMessageWaId(messageId, wa_message_id);
    return NextResponse.json({ ok: true, messageId });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, messageId, error: String(err?.message ?? err) },
      { status: 502 }
    );
  }
}
