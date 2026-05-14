import { NextResponse, type NextRequest } from "next/server";
import { setMode } from "@/lib/db";

interface Ctx { params: Promise<{ conversationId: string }>; }

export async function POST(req: NextRequest, { params }: Ctx) {
  const { conversationId } = await params;
  try {
    const { mode } = await req.json();
    if (mode !== 'AI' && mode !== 'HUMAN') {
      return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
    }
    setMode(Number(conversationId), mode);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
