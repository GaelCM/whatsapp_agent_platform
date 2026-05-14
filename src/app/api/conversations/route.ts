import { NextResponse } from "next/server";
import { listConversations } from "@/lib/db";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const convos = listConversations();
    return NextResponse.json(convos);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
