// src/lib/chatUtils.ts
import type { ChatSession } from '../types/chat'; // ØªØ£ÙƒØ¯ Ù…Ù† ØªØµØ¯ÙŠØ± Ø§Ù„Ù€ Type Ù…Ù† Dashboard Ø£Ùˆ Ø¶Ø¹Ù‡ Ù‡Ù†Ø§

const CHATS_KEY = "accessmate_chats";

// Ø¯Ø§Ù„Ø© Ù„Ù‚Ø±Ø§Ø¡Ø© Ø§Ù„Ø´Ø§ØªØ§Øª
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

// Ø§Ù„Ø¯Ø§Ù„Ø© Ø§Ù„Ø³Ø­Ø±ÙŠØ©: ØªÙ‚ÙˆÙ… Ø¨Ø§Ù„ØªØ­Ø¯ÙŠØ«ØŒ Ø§Ù„Ø­ÙØ¸ØŒ ÙˆØ¥Ø±Ø³Ø§Ù„ Ø§Ù„Ø¥Ø´Ø§Ø±Ø©
export function updateChatArchiveStatus(chatId: string, archived: boolean) {
  const currentChats = loadChats();

  const nextChats = currentChats.map((chat) =>
    chat.id === chatId
      ? {
          ...chat,
          archived,
          updatedAt: new Date().toISOString(),
        }
      : chat
  );

  // 1. ØªØ­Ø¯ÙŠØ« Ø§Ù„Ù€ LocalStorage
  localStorage.setItem(CHATS_KEY, JSON.stringify(nextChats));

  // 2. Ø¥Ø±Ø³Ø§Ù„ Ø¥Ø´Ø§Ø±Ø© Ù„ÙƒÙ„ Ø§Ù„Ù…ÙƒÙˆÙ†Ø§Øª Ø§Ù„Ù…Ø´ØªØ±ÙƒØ© (Ø­ØªÙ‰ ÙŠØªÙ… Ø§Ù„ØªØ­Ø¯ÙŠØ« ÙÙˆØ±Ø§Ù‹)
  window.dispatchEvent(new Event("accessmate-chats-updated"));

  return nextChats; // Ù†Ø±Ø¬Ø¹ Ø§Ù„Ù…ØµÙÙˆÙØ© Ø§Ù„Ø¬Ø¯ÙŠØ¯Ø© Ù„Ø§Ø³ØªØ®Ø¯Ø§Ù…Ù‡Ø§ ÙÙŠ Ø§Ù„Ù€ setState Ø§Ù„Ù…Ø­Ù„ÙŠ
}

// Ø¯Ø§Ù„Ø© Ø§Ù„Ø­Ø°Ù (Ù…Ø¹ Ø§Ù„ØªØ£ÙƒÙŠØ¯)
export function deleteChatPermanently(chatId: string): boolean {
  if (!window.confirm("Are you sure you want to permanently delete this chat?")) {
    return false;
  }

  const currentChats = loadChats();
  const nextChats = currentChats.filter((chat) => chat.id !== chatId);

  localStorage.setItem(CHATS_KEY, JSON.stringify(nextChats));
  window.dispatchEvent(new Event("accessmate-chats-updated"));

  return true;
}
