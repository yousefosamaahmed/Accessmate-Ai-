// src/services/chat.service.ts
import { api, unwrapResponse } from "../lib/api";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface SendMessageData {
  message: string;
  chat_id?: string;
  file_id?: string;
}

export const chatService = {
  sendMessage: async (data: SendMessageData) => {
    const response = await api.post("/ai/chat", {
      message: data.message,
      chat_id: data.chat_id,
      file_id: data.file_id,
    });
    return unwrapResponse(response);
  },

  getChats: async () => {
    const response = await api.get("/chats");
    return unwrapResponse(response);
  },

  getChatHistory: async (chatId: string) => {
    const response = await api.get(`/chats/${chatId}`);
    return unwrapResponse(response);
  },

  createChat: async () => {
    const response = await api.post("/chats");
    return unwrapResponse(response);
  },

  deleteChat: async (chatId: string) => {
    const response = await api.delete(`/chats/${chatId}`);
    return unwrapResponse(response);
  },

  archiveChat: async (chatId: string) => {
    const response = await api.post(`/chats/${chatId}/archive`);
    return unwrapResponse(response);
  },

  uploadFile: async (file: File, type: string) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);
    const response = await api.post("/files/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return unwrapResponse(response);
  },
};