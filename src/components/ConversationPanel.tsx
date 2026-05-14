"use client";

import { useEffect, useState, useRef } from "react";
import { MessageBubble } from "./MessageBubble";
import { ModeToggle } from "./ModeToggle";

export function ConversationPanel({ 
  conversationId, 
  onDeleted 
}: { 
  conversationId: number;
  onDeleted: () => void;
}) {
  const [messages, setMessages] = useState<any[]>([]);
  const [convo, setConvo] = useState<any>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error24h, setError24h] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    const res = await fetch(`/api/messages/${conversationId}`);
    if (res.ok) setMessages(await res.json());
  };

  const fetchConvo = async () => {
    // Para simplificar, buscamos la info desde la API general
    const res = await fetch('/api/conversations');
    if (res.ok) {
      const all = await res.json();
      const curr = all.find((c: any) => c.id === conversationId);
      if (curr) setConvo(curr);
    }
  };

  useEffect(() => {
    fetchMessages();
    fetchConvo();
    const iv = setInterval(() => {
      fetchMessages();
      fetchConvo();
    }, 2000);
    return () => clearInterval(iv);
  }, [conversationId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleToggle = async (mode: 'AI' | 'HUMAN') => {
    await fetch(`/api/mode/${conversationId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode })
    });
    fetchConvo();
  };

  const handleDelete = async () => {
    if (!confirm("¿Seguro que quieres borrar toda la conversación?")) return;
    await fetch(`/api/conversations/${conversationId}`, { method: 'DELETE' });
    onDeleted();
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setError24h("");
    setSending(true);
    
    // Optimistic UI insert
    const tempMsg = { id: Date.now(), role: 'human', content: text, wa_message_id: 'pending' };
    setMessages(prev => [...prev, tempMsg]);
    setText("");

    const res = await fetch(`/api/messages/${conversationId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: tempMsg.content })
    });
    
    setSending(false);
    if (!res.ok) {
      const data = await res.json();
      if (data.error?.includes("131047") || data.error?.includes("window")) {
        setError24h("Fuera de la ventana de 24h. No se puede enviar texto libre.");
      } else {
        setError24h(data.error || "Error al enviar mensaje");
      }
      fetchMessages(); // re-fetch to see the failed message state
    }
  };

  if (!convo) return <div className="flex-1 bg-gray-50 flex items-center justify-center">Cargando...</div>;

  const isHuman = convo.mode === 'HUMAN';

  return (
    <div className="flex-1 flex flex-col h-full bg-[#E5DDD5]">
      {/* Header */}
      <div className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between shrink-0">
        <div className="font-medium text-gray-800">
          {convo.name || `+${convo.phone}`}
        </div>
        <div className="flex items-center gap-4">
          <ModeToggle mode={convo.mode} onToggle={handleToggle} />
          <button onClick={handleDelete} className="text-red-500 hover:text-red-700 text-sm font-medium">
            Borrar
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
        {messages.map(m => <MessageBubble key={m.id} msg={m} />)}
        <div ref={endRef} />
      </div>

      {/* Error alert */}
      {error24h && (
        <div className="bg-red-500 text-white text-xs py-2 px-4 text-center font-medium">
          {error24h}
        </div>
      )}

      {/* Input */}
      <div className="bg-gray-100 p-4 shrink-0">
        <form onSubmit={handleSend} className="flex gap-2 max-w-4xl mx-auto">
          <input
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            disabled={!isHuman || sending}
            placeholder={isHuman ? "Escribe un mensaje..." : "Cambia a modo manual para escribir"}
            className="flex-1 rounded-lg border-none px-4 py-3 shadow-sm focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:bg-gray-200 outline-none"
          />
          <button 
            type="submit" 
            disabled={!isHuman || !text.trim() || sending}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
}
