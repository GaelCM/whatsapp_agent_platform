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

    const tools: any[] = [
      {
        type: "function",
        function: {
          name: "buscarProductosLLM",
          description: "Busca productos en el inventario por nombre y devuelve detalles como precio, stock y sucursal. Útil cuando el cliente pregunta por el precio o disponibilidad de un producto.",
          parameters: {
            type: "object",
            properties: {
              textoBusqueda: {
                type: "string",
                description: "El nombre del producto a buscar (ej. 'laptop', 'cemento')",
              },
              idSucursal: {
                type: "number",
                description: "Opcional. ID de la sucursal para filtrar inventario.",
              }
            },
            required: ["textoBusqueda"],
          },
        },
      }
    ];

    const startTime = Date.now();
    let completion = await openai.chat.completions.create({
      model: model,
      messages: messages,
      tools: tools,
    });

    let responseMessage = completion.choices[0]?.message;

    // Si el modelo decide llamar a una herramienta
    if (responseMessage?.tool_calls) {
      messages.push(responseMessage); // Agregamos el mensaje del assistant con los tool_calls

      for (const toolCall of responseMessage.tool_calls) {
        if (toolCall.function.name === "buscarProductosLLM") {
          const args = JSON.parse(toolCall.function.arguments);
          console.log(`[webhook] Ejecutando tool buscarProductosLLM con args:`, args);

          try {
            // Reemplaza esta URL con la ruta real de tu backend si es distinta
            const apiUrl = 'https://elamigos-elamigosapi.xj7zln.easypanel.host';
            const queryParams = new URLSearchParams({ textoBusqueda: args.textoBusqueda });
            if (args.idSucursal) queryParams.append('idSucursal', args.idSucursal.toString());

            // Endpoint hipotético basado en el repositorio que me mostraste
            // Deberás ajustar la ruta si no es /api/productos/llm
            const res = await fetch(`${apiUrl}/api/productos/buscarLLM?${queryParams.toString()}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NywiaWF0IjoxNzc4ODYyNDM1fQ.F5LCAIsHw2PKlJVnaXNlAX5mDhUicLvACopOvqkxbnE`
              }
            });
            let toolResult = "";

            if (res.ok) {
              const data = await res.json();
              console.log(`[webhook] API OK (Status ${res.status}). Datos recibidos:`, JSON.stringify(data).substring(0, 300) + '...');
              toolResult = JSON.stringify(data);
            } else {
              const errorText = await res.text();
              console.error(`[webhook] API ERROR (Status ${res.status}):`, errorText);
              toolResult = JSON.stringify({ error: "No se pudieron encontrar productos" });
            }

            // Agregamos el resultado al historial de la conversación
            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: toolResult,
            });

          } catch (e) {
            console.error("[webhook] Error ejecutando tool fetch:", e);
            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify({ error: "Error de conexión con la API" }),
            });
          }
        }
      }

      // Segunda llamada a OpenAI con los resultados de las herramientas
      completion = await openai.chat.completions.create({
        model: model,
        messages: messages,
      });
      responseMessage = completion.choices[0]?.message;
    }

    const reply = responseMessage?.content || "Lo siento, ocurrió un error procesando tu solicitud.";
    console.log(`[webhook] LLM respondió en ${Date.now() - startTime}ms`);

    const localMsgId = insertMessage(convo.id, 'assistant', reply, null);

    const { wa_message_id } = await sendTextMessage(phone, reply);
    updateMessageWaId(localMsgId, wa_message_id);
    console.log(`[webhook] enviado a ${phone} (wamid: ${wa_message_id})`);

  } catch (error) {
    console.error("[webhook] Error procesando mensaje AI:", error);
  }
}
