"use client";

export function MessageBubble({ msg }: { msg: any }) {
  const isSelf = msg.role === "assistant" || msg.role === "human";
  const bgColor = 
    msg.role === "user" ? "bg-white text-gray-800 border border-gray-200" :
    msg.role === "assistant" ? "bg-emerald-100 text-emerald-900" :
    "bg-amber-100 text-amber-900"; // human

  const align = isSelf ? "self-end" : "self-start";
  
  // Si role es nuestro y wa_message_id es nulo, significa que falló el envío (o está pendiente).
  const hasError = isSelf && msg.wa_message_id === null;

  return (
    <div className={`max-w-[75%] rounded-2xl px-4 py-2 flex flex-col ${bgColor} ${align}`}>
      <span className="whitespace-pre-wrap text-sm">{msg.content}</span>
      <div className="flex justify-end items-center gap-1 mt-1">
        <span className="text-[10px] opacity-60 font-medium uppercase tracking-wide">
          {msg.role}
        </span>
        {hasError && (
          <span className="text-[10px] text-red-500 font-bold ml-1" title="Error al enviar">
            ⚠️
          </span>
        )}
      </div>
    </div>
  );
}
