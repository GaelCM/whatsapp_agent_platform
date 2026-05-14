import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'messages.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT UNIQUE NOT NULL,
  name TEXT,
  mode TEXT CHECK(mode IN ('AI','HUMAN')) NOT NULL DEFAULT 'AI',
  last_message_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id),
  role TEXT CHECK(role IN ('user','assistant','human')) NOT NULL,
  content TEXT NOT NULL,
  wa_message_id TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_wa_id ON messages(wa_message_id) WHERE wa_message_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS processed_webhook_messages (
  wa_message_id TEXT PRIMARY KEY,
  processed_at INTEGER NOT NULL DEFAULT (unixepoch())
);
`);

export interface Conversation {
  id: number;
  phone: string;
  name: string | null;
  mode: 'AI' | 'HUMAN';
  last_message_at: number | null;
  created_at: number;
}

export interface Message {
  id: number;
  conversation_id: number;
  role: 'user' | 'assistant' | 'human';
  content: string;
  wa_message_id: string | null;
  created_at: number;
}

export function getOrCreateConversation(phone: string, name?: string | null): Conversation {
  const existing = db.prepare('SELECT * FROM conversations WHERE phone = ?').get(phone) as Conversation | undefined;
  if (existing) {
    if (name && existing.name !== name) {
      db.prepare('UPDATE conversations SET name = ? WHERE id = ?').run(name, existing.id);
      return { ...existing, name };
    }
    return existing;
  }
  const result = db.prepare('INSERT INTO conversations (phone, name) VALUES (?, ?)').run(phone, name ?? null);
  return db.prepare('SELECT * FROM conversations WHERE id = ?').get(result.lastInsertRowid) as Conversation;
}

export function getConversationById(id: number): Conversation | undefined {
  return db.prepare('SELECT * FROM conversations WHERE id = ?').get(id) as Conversation | undefined;
}

export const insertMessage = db.transaction((conversationId: number, role: 'user' | 'assistant' | 'human', content: string, waMessageId?: string | null) => {
  const result = db.prepare(`
    INSERT INTO messages (conversation_id, role, content, wa_message_id)
    VALUES (?, ?, ?, ?)
  `).run(conversationId, role, content, waMessageId ?? null);
  
  db.prepare('UPDATE conversations SET last_message_at = unixepoch() WHERE id = ?').run(conversationId);
  return result.lastInsertRowid as number;
});

export function updateMessageWaId(messageId: number, waMessageId: string) {
  db.prepare('UPDATE messages SET wa_message_id = ? WHERE id = ?').run(waMessageId, messageId);
}

export function getMessages(conversationId: number, limit = 50): Message[] {
  return db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT ?').all(conversationId, limit) as Message[];
}

export function getRecentHistory(conversationId: number, limit = 20): Message[] {
  const msgs = db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT ?').all(conversationId, limit) as Message[];
  return msgs.reverse();
}

export function setMode(conversationId: number, mode: 'AI' | 'HUMAN') {
  db.prepare('UPDATE conversations SET mode = ? WHERE id = ?').run(mode, conversationId);
}

export interface ConversationListItem extends Conversation {
  last_message_preview: string | null;
}

export function listConversations(): ConversationListItem[] {
  return db.prepare(`
    SELECT c.*,
           (SELECT content FROM messages m WHERE m.conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_preview
    FROM conversations c
    ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC
  `).all() as ConversationListItem[];
}

export const deleteConversation = db.transaction((id: number) => {
  db.prepare('DELETE FROM messages WHERE conversation_id = ?').run(id);
  db.prepare('DELETE FROM conversations WHERE id = ?').run(id);
});

export function wasMessageProcessed(waMessageId: string): boolean {
  const row = db.prepare('SELECT 1 FROM processed_webhook_messages WHERE wa_message_id = ?').get(waMessageId);
  return !!row;
}

export function markMessageProcessed(waMessageId: string) {
  db.prepare('INSERT OR IGNORE INTO processed_webhook_messages (wa_message_id) VALUES (?)').run(waMessageId);
}
