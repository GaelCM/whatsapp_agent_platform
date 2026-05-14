"use client";

export function ConversationList({ 
  conversations, 
  activeId, 
  onSelect 
}: { 
  conversations: any[]; 
  activeId: number | null;
  onSelect: (id: number) => void;
}) {
  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full overflow-y-auto">
      <div className="p-4 border-b border-gray-100 font-semibold text-gray-700">
        Conversaciones ({conversations.length})
      </div>
      <div className="flex-1">
        {conversations.map(c => {
          const isActive = activeId === c.id;
          return (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={`w-full text-left p-4 border-b border-gray-100 transition-colors flex flex-col gap-1 ${
                isActive ? "bg-emerald-50" : "hover:bg-gray-50"
              }`}
            >
              <div className="flex justify-between items-center w-full">
                <span className="font-medium text-gray-800 truncate pr-2">
                  {c.name || `+${c.phone}`}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-sm font-bold tracking-wider ${
                  c.mode === 'AI' 
                    ? "bg-emerald-100 text-emerald-700" 
                    : "bg-amber-100 text-amber-700"
                }`}>
                  {c.mode}
                </span>
              </div>
              <span className="text-xs text-gray-500 truncate w-full">
                {c.last_message_preview || "Sin mensajes"}
              </span>
            </button>
          );
        })}
        {conversations.length === 0 && (
          <div className="p-4 text-sm text-gray-500 text-center mt-4">
            No hay conversaciones aún.
          </div>
        )}
      </div>
    </div>
  );
}
