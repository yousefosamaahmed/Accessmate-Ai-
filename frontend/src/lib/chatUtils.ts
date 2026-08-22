// src/lib/chatUtils.ts
import type { ChatSession } from '../types/chat'; // تأكد من تصدير الـ Type من Dashboard أو ضعه هنا

const CHATS_KEY = "accessmate_chats";

// دالة لقراءة الشاتات
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

// الدالة السحرية: تقوم بالتحديث، الحفظ، وإرسال الإشارة
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

  // 1. تحديث الـ LocalStorage
  localStorage.setItem(CHATS_KEY, JSON.stringify(nextChats));

  // 2. إرسال إشارة لكل المكونات المشتركة (حتى يتم التحديث فوراً)
  window.dispatchEvent(new Event("accessmate-chats-updated"));

  return nextChats; // نرجع المصفوفة الجديدة لاستخدامها في الـ setState المحلي
}

// دالة الحذف (مع التأكيد)
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
