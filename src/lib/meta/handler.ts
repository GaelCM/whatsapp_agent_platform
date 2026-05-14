import {
  wasMessageProcessed,
  markMessageProcessed,
  getOrCreateConversation,
  insertMessage,
  getConversationById,
  getRecentHistory,
  updateMessageWaId
} from "../db";
import { openai, model } from "../openrouter";
import { SYSTEM_PROMPT } from "../system-prompt";
import { sendTextMessage } from "./client";

export async function processWebhookPayload(payload: any): Promise<void> {
  if (payload?.object !== "whatsapp_business_account") return;
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages") continue;
      const value = change.value ?? {};
      // statuses: por ahora solo log
      for (const status of value.statuses ?? []) {
        console.log(`[webhook] status ${status.status} para ${status.id}`);
      }
      const contacts = value.contacts ?? [];
      const nameByPhone = new Map<string, string | null>(
        contacts.map((c: any) => [c.wa_id, c.profile?.name ?? null])
      );
      for (const msg of value.messages ?? []) {
        await handleIncomingMessage(msg, nameByPhone.get(msg.from) ?? null);
      }
    }
  }
}

async function handleIncomingMessage(msg: any, pushName: string | null) {
  if (msg.type !== "text") {
    console.log(`[webhook] tipo no soportado: ${msg.type}`);
    return;
  }
  
  const waMsgId = msg.id;
  if (wasMessageProcessed(waMsgId)) {
    console.log(`[webhook] mensaje ${waMsgId} ya procesado, ignorando`);
    return;
  }
  markMessageProcessed(waMsgId);
  
  const text = msg.text?.body;
  if (!text) return;

  const phone = msg.from;
  const convo = getOrCreateConversation(phone, pushName);
  
  insertMessage(convo.id, 'user', text, waMsgId);
  
  const fresh = getConversationById(convo.id);
  if (!fresh || fresh.mode !== 'AI') {
    return; // Modo manual, no responder
  }
  
  try {
    const history = getRecentHistory(fresh.id, 20);
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.map(m => ({
        role: m.role === 'human' ? 'assistant' : m.role,
        content: m.content
      }))
    ] as any[];
    
    const startTime = Date.now();
    const completion = await openai.chat.completions.create({
      model: model,
      messages: messages,
    });
    
    const reply = completion.choices[0]?.message?.content || "Lo siento, ocurrió un error procesando tu solicitud.";
    console.log(`[webhook] LLM respondió en ${Date.now() - startTime}ms`);
    
    const localMsgId = insertMessage(convo.id, 'assistant', reply, null);
    
    const { wa_message_id } = await sendTextMessage(phone, reply);
    updateMessageWaId(localMsgId, wa_message_id);
    console.log(`[webhook] enviado a ${phone} (wamid: ${wa_message_id})`);
    
  } catch (error) {
    console.error("[webhook] Error procesando mensaje AI:", error);
  }
}
