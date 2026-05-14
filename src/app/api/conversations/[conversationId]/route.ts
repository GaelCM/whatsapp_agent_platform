import { NextResponse, type NextRequest } from "next/server";
import { deleteConversation } from "@/lib/db";

interface Ctx { params: Promise<{ conversationId: string }>; }

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { conversationId } = await params;
  try {
    deleteConversation(Number(conversationId));
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
