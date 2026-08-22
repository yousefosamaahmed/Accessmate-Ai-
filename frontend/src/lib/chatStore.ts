// src/lib/chatStore.ts
import type { ChatSession } from '../types/chat';

const CHATS_KEY = "accessmate_chats";

// يمكن استخدامها كـ كاش أو Fallback
export function loadChats(): ChatSession[] {
  try {
    const raw = localStorage.getItem(CHATS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveChatsToLocal(nextChats: ChatSession[]) {
  localStorage.setItem(CHATS_KEY, JSON.stringify(nextChats));
  window.dispatchEvent(new Event("accessmate-chats-updated"));
}

export function createChatId() {
  return `chat_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function cleanTitle(value: string) {
  return String(value || "New chat").replaceAll("\n", "");
}

export function makeTitle(text: string, fileName?: string) {
  const base = cleanTitle(text || fileName || "New chat");
  return base.length > 38 ? `${base.slice(0, 38)}...` : base;
}
