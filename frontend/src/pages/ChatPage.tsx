// src/pages/ChatPage.tsx

import React, {
  type ChangeEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";

import { motion } from "framer-motion";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import {
  Bot,
  File as FileIcon,
  Mic,
  Paperclip,
  Send,
  X,
} from "lucide-react";

import {
  api,
  getApiError,
  unwrapResponse,
} from "../lib/api";

import {
  getToken,
} from "../lib/storage";

import logoImage from "../assets/Logo.jpeg";


/* =========================================================
   TYPES
   ========================================================= */

type AttachmentContext = {
  id: string;

  name: string;

  mimeType: string;

  fileType: string;

  size?: number;
};


type ActiveContextKind =
  | "image"
  | "document"
  | null;


type Message = {
  id: string;

  role:
    | "user"
    | "assistant";

  content: string;

  timestamp?: string;

  fileName?: string;

  attachment?: AttachmentContext;
};


type BackendMessage = {
  id: string;

  conversation_id: string;

  role:
    | "user"
    | "assistant"
    | "system";

  content: string;

  assistant_language:
    | "ar"
    | "en";

  structured_response_json?:
    | Record<string, any>
    | null;

  audio_url?: string | null;

  created_at: string;
};


type BackendDocument = {
  id: string;

  user_id: string;

  original_file_name: string;

  stored_file_name: string;

  file_type: string;

  mime_type: string;

  file_size: number;

  file_path: string;

  status: string;

  extracted_text?: string | null;

  detected_language?: string | null;

  created_at: string;

  updated_at: string;
};


type DocumentPrepareResponse = {
  document_id: string;

  status: string;

  file_name: string;

  file_type: string;

  extracted_characters: number;

  chunks_created: number;

  chunks_embedded: number;

  embedding_provider: string;

  embedding_model: string;
};


type DocumentConversationTurn = {
  role:
    | "user"
    | "assistant";

  content: string;
};


type DocumentAskSource = {
  chunk_id: string;

  chunk_index: number;

  similarity_score:
    | number
    | null;

  content: string;
};


type DocumentAskResponse = {
  document_id: string;

  document_name: string;

  question: string;

  answer: string;

  language: string;

  mode:
    | "summary"
    | "rag";

  strategy: string;

  retrieval_query: string;

  used_conversation_history: boolean;

  retrieved_chunks: number;

  source_chunks_used: number;

  sources: DocumentAskSource[];

  provider: string;

  model: string;
};


type NavigationState = {
  backgroundProcessing?: boolean;

  documentId?:
    | string
    | null;
};


type HearingChunkResponse = {
  sequence: number;

  transcript: string;

  language: string;

  is_speech: boolean;

  provider: string;

  model: string;

  latency_ms: number;
};


type SendMessageOptions = {
  textOverride?: string;

  languageOverride?:
    | "ar"
    | "en";

  ignoreSelectedFile?: boolean;
};


/* =========================================================
   CONSTANTS
   ========================================================= */

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;


const DOCUMENT_HISTORY_LIMIT =
  6;


const GENERAL_CHAT_HISTORY_LIMIT =
  10;


/* =========================================================
   HELPERS
   ========================================================= */

function isValidConversationId(
  value?: string
) {
  if (!value) {
    return false;
  }

  return UUID_REGEX.test(
    value
  );
}


function createTemporaryId() {
  return `temp_${Date.now()}_${Math.random()
    .toString(16)
    .slice(2)}`;
}


function detectLanguage(
  value: string
): "ar" | "en" {
  return /[\u0600-\u06FF]/.test(
    value
  )
    ? "ar"
    : "en";
}


function normalizeProviderLanguage(
  value?: string | null
): "ar" | "en" | null {
  const normalized =
    String(
      value ??
        ""
    )
      .trim()
      .toLowerCase();


  if (
    normalized === "ar" ||
    normalized.startsWith("ar-") ||
    normalized.includes("arabic")
  ) {
    return "ar";
  }


  if (
    normalized === "en" ||
    normalized.startsWith("en-") ||
    normalized.includes("english")
  ) {
    return "en";
  }


  return null;
}


function resolveMessageLanguage(
  text: string,
  providerLanguage?: string | null
): "ar" | "en" {
  /*
   * For voice messages the speech provider knows the
   * ORIGINAL spoken language. Trust that before looking at
   * the transcript script because some Whisper-compatible
   * providers can occasionally return an English rendering
   * even when the detected source language is Arabic.
   */
  const provider =
    normalizeProviderLanguage(
      providerLanguage
    );


  if (provider) {
    return provider;
  }


  return detectLanguage(
    text
  );
}


function findLastPatternIndex(
  value: string,
  patterns: RegExp[]
) {
  let bestIndex = -1;


  for (const pattern of patterns) {
    const flags =
      pattern.flags.includes("g")
        ? pattern.flags
        : `${pattern.flags}g`;


    const globalPattern =
      new RegExp(
        pattern.source,
        flags
      );


    for (
      const match of value.matchAll(
        globalPattern
      )
    ) {
      bestIndex =
        Math.max(
          bestIndex,
          match.index ?? -1
        );
    }
  }


  return bestIndex;
}


function resolveRequestedResponseLanguage(
  text: string,
  fallbackLanguage?: "ar" | "en"
): "ar" | "en" {
  const normalized =
    text
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");


  const arabicOutputPatterns = [
    /بالعربي(?:ة)?/,
    /باللغة العربية/,
    /رد(?: عليا| عليّ| لي)? بالعربي(?:ة)?/,
    /جاوب(?:ني)? بالعربي(?:ة)?/,
    /قولي بالعربي(?:ة)?/,
    /قول(?:ها|ه)? بالعربي(?:ة)?/,
    /اكتب(?:ها)? بالعربي(?:ة)?/,
    /اشرح(?:ها|ه)? بالعربي(?:ة)?/,
    /حو(?:ل|ّل)(?:ها|ه)? (?:إلى|الى|ل) ?العربي(?:ة)?/,
    /ترجم(?:ها|ه)? (?:إلى|الى|ل) ?العربي(?:ة)?/,
    /\bin arabic\b/i,
    /\barabic please\b/i,
    /\banswer in arabic\b/i,
    /\brespond in arabic\b/i,
    /\breply in arabic\b/i,
    /\bexplain (?:it )?in arabic\b/i,
    /\btranslate (?:it )?(?:to|into) arabic\b/i,
  ];


  const englishOutputPatterns = [
    /بالانجليزي/,
    /بالإنجليزي/,
    /بالانجليزية/,
    /بالإنجليزية/,
    /باللغة الانجليزية/,
    /باللغة الإنجليزية/,
    /رد(?: عليا| عليّ| لي)? بالانجليزي/,
    /رد(?: عليا| عليّ| لي)? بالإنجليزي/,
    /جاوب(?:ني)? بالانجليزي/,
    /جاوب(?:ني)? بالإنجليزي/,
    /قولي بالانجليزي/,
    /قولي بالإنجليزي/,
    /اكتب(?:ها)? بالانجليزي/,
    /اكتب(?:ها)? بالإنجليزي/,
    /اشرح(?:ها|ه)? بالانجليزي/,
    /اشرح(?:ها|ه)? بالإنجليزي/,
    /\bin english\b/i,
    /\benglish please\b/i,
    /\banswer in english\b/i,
    /\brespond in english\b/i,
    /\breply in english\b/i,
    /\bexplain (?:it )?in english\b/i,
    /\btranslate (?:it )?(?:to|into) english\b/i,
  ];


  const arabicInstructionIndex =
    findLastPatternIndex(
      normalized,
      arabicOutputPatterns
    );


  const englishInstructionIndex =
    findLastPatternIndex(
      normalized,
      englishOutputPatterns
    );


  if (
    arabicInstructionIndex >= 0 ||
    englishInstructionIndex >= 0
  ) {
    return arabicInstructionIndex >
      englishInstructionIndex
      ? "ar"
      : "en";
  }


  /*
   * Default rule requested for AccessMate Chat:
   * current message controls the response language.
   * Arabic text wins for normal Arabic/English code-switching
   * (for example: "اشرح AI بالتفصيل").
   */
  if (/[\u0600-\u06FF]/.test(text)) {
    return "ar";
  }


  if (/[A-Za-z]/.test(text)) {
    return "en";
  }


  return fallbackLanguage ?? "en";
}


function normalizeDocumentQuestion(
  text: string
) {
  const value =
    text.trim();


  if (!value) {
    return (
      "Summarize the main points of this document."
    );
  }


  const normalized =
    value
      .toLowerCase()
      .replace(
        /\s+/g,
        " "
      )
      .trim();


  const genericAnalyzeCommands = [
    "analyze this file",
    "analyse this file",
    "analyze file",
    "analyse file",
    "analyze this document",
    "analyse this document",

    "حلل الملف",
    "حلل هذا الملف",
    "حلل المستند",
    "حلل هذا المستند",
  ];


  if (
    genericAnalyzeCommands.includes(
      normalized
    )
  ) {
    return (
      "Summarize and analyze the main points of this document."
    );
  }


  return value;
}


/* =========================================================
   GENERAL CHAT HISTORY
   ========================================================= */

function buildRecentGeneralHistory(
  messages: Message[]
): DocumentConversationTurn[] {
  return messages
    .filter(
      (message) =>
        (
          message.role === "user" ||
          message.role === "assistant"
        ) &&
        Boolean(
          message.content?.trim()
        )
    )
    .map(
      (message) => ({
        role: message.role,

        /*
         * Keep enough context for follow-up questions while
         * preventing one very long answer from dominating the
         * next request.
         */
        content:
          message.content
            .trim()
            .slice(0, 1800),
      })
    )
    .slice(
      -GENERAL_CHAT_HISTORY_LIMIT
    );
}


function buildGeneralChatPrompt(
  currentMessage: string,
  history: DocumentConversationTurn[],
  outputLanguage: "ar" | "en"
) {
  if (!history.length) {
    return currentMessage;
  }


  const historyText =
    history
      .map(
        (turn) =>
          `${turn.role === "user" ? "USER" : "ASSISTANT"}: ${turn.content}`
      )
      .join("\n\n");


  const languageName =
    outputLanguage === "ar"
      ? "Arabic"
      : "English";


  return `
<conversation_history>
${historyText}
</conversation_history>

<current_user_message>
${currentMessage}
</current_user_message>

Continue the SAME conversation.
Use the conversation history only to understand references and follow-up requests such as "tell me more", "give me more information", "اشرح أكتر", or "اديني معلومات أكتر".
Answer the CURRENT user message, not the history.
The response language for this turn is ${languageName}.
For informational questions, give a clear and detailed explanation rather than an overly short answer.
`.trim();
}


/* =========================================================
   DOCUMENT HISTORY
   ========================================================= */

function buildRecentDocumentHistory(
  messages: Message[]
): DocumentConversationTurn[] {
  /*
   * IMPORTANT:
   *
   * This is the history BEFORE the new user question.
   *
   * Backend uses this history only to resolve references:
   *
   * it
   * that
   * second one
   * this
   * دي
   * ده
   * التانية
   *
   * The document itself remains the factual source.
   */

  const usableMessages =
    messages
      .filter(
        (
          message
        ) =>
          (
            message.role ===
              "user" ||
            message.role ===
              "assistant"
          ) &&
          Boolean(
            message.content
              ?.trim()
          )
      )
      .map(
        (
          message
        ) => ({
          role:
            message.role,

          content:
            message.content
              .trim(),
        })
      );


  return usableMessages.slice(
    -DOCUMENT_HISTORY_LIMIT
  );
}


/* =========================================================
   API URL
   ========================================================= */

function buildApiUrl(
  path: string
) {
  const rawBase =
    import.meta.env
      .VITE_API_BASE_URL ||
    "http://127.0.0.1:8000";


  const base =
    String(rawBase)
      .replace(
        /\/+$/,
        ""
      )
      .replace(
        /\/api\/v1$/,
        ""
      );


  const normalizedPath =
    path.startsWith("/")
      ? path
      : `/${path}`;


  return `${base}/api/v1${normalizedPath}`;
}


/* =========================================================
   ATTACHMENT HELPERS
   ========================================================= */

function getAttachment(
  value:
    | Record<string, any>
    | null
    | undefined
): AttachmentContext | undefined {
  if (!value) {
    return undefined;
  }


  const attachment =
    value?.attachment;


  if (!attachment) {
    return undefined;
  }


  const id =
    String(
      attachment?.document_id ??
        attachment?.id ??
        ""
    );


  const name =
    String(
      attachment?.name ??
        attachment?.file_name ??
        ""
    );


  const mimeType =
    String(
      attachment?.mime_type ??
        ""
    );


  const fileType =
    String(
      attachment?.file_type ??
        ""
    );


  if (
    !name &&
    !id
  ) {
    return undefined;
  }


  return {
    id,

    name,

    mimeType,

    fileType,

    size:
      Number(
        attachment?.size ??
          0
      ) || undefined,
  };
}


function isImageAttachment(
  attachment:
    | AttachmentContext
    | undefined
) {
  if (!attachment) {
    return false;
  }


  const mime =
    attachment.mimeType
      .toLowerCase();


  const name =
    attachment.name
      .toLowerCase();


  const type =
    attachment.fileType
      .toLowerCase();


  return (
    mime.startsWith(
      "image/"
    ) ||
    [
      "png",
      "jpg",
      "jpeg",
      "webp",
      "gif",
      "bmp",
    ].includes(type) ||
    /\.(png|jpg|jpeg|webp|gif|bmp)$/i.test(
      name
    )
  );
}


function isDocumentAttachment(
  attachment:
    | AttachmentContext
    | undefined
) {
  if (!attachment) {
    return false;
  }


  const name =
    attachment.name
      .toLowerCase();


  const type =
    attachment.fileType
      .toLowerCase();


  const mime =
    attachment.mimeType
      .toLowerCase();


  return (
    [
      "pdf",
      "docx",
      "txt",
      "csv",
    ].includes(
      type
    ) ||
    /\.(pdf|docx|txt|csv)$/i.test(
      name
    ) ||
    mime ===
      "application/pdf" ||
    mime.includes(
      "wordprocessingml"
    ) ||
    mime ===
      "text/plain" ||
    mime ===
      "text/csv"
  );
}


function isImageFile(
  file: File
) {
  const type =
    file.type
      .toLowerCase();


  const name =
    file.name
      .toLowerCase();


  return (
    type.startsWith(
      "image/"
    ) ||
    /\.(png|jpg|jpeg|webp|gif|bmp)$/i.test(
      name
    )
  );
}


function isAudioFile(
  file: File
) {
  const type =
    file.type
      .toLowerCase();


  const name =
    file.name
      .toLowerCase();


  return (
    type.startsWith(
      "audio/"
    ) ||
    /\.(mp3|wav|m4a|webm|ogg|aac)$/i.test(
      name
    )
  );
}


function isDocumentFile(
  file: File
) {
  return /\.(pdf|docx|txt|csv)$/i.test(
    file.name
  );
}


/* =========================================================
   IMAGE FOLLOW-UP DETECTION
   ========================================================= */

function looksLikeImageFollowUp(
  text: string
) {
  const normalized =
    text
      .trim()
      .toLowerCase();


  if (!normalized) {
    return false;
  }


  const patterns = [
    /\bimage\b/,
    /\bphoto\b/,
    /\bpicture\b/,
    /\bscreenshot\b/,
    /\bdescribe\b/,
    /\bwhat is in the image\b/,
    /\bwhat is in this image\b/,
    /\bwhat does the image say\b/,
    /\bwhat is written in the image\b/,

    /الصورة/,
    /الصوره/,
    /اوصف الصورة/,
    /اوصف الصوره/,
    /وصف الصورة/,
    /وصف الصوره/,
    /اشرح الصورة/,
    /اشرح الصوره/,
    /في الصورة/,
    /في الصوره/,
    /مكتوب في الصورة/,
    /مكتوب في الصوره/,
  ];


  return patterns.some(
    (
      pattern
    ) =>
      pattern.test(
        normalized
      )
  );
}


/* =========================================================
   DOCUMENT FOLLOW-UP DETECTION
   ========================================================= */

function looksLikeDocumentFollowUp(
  text: string
) {
  const normalized =
    text
      .trim()
      .toLowerCase();


  if (!normalized) {
    return false;
  }


  const patterns = [
    /\bdocument\b/,
    /\bfile\b/,
    /\bpdf\b/,
    /\bpage\b/,
    /\bchapter\b/,
    /\bsection\b/,
    /\baccording to it\b/,
    /\baccording to this\b/,
    /\bwhat does it say\b/,
    /\bwhat does this say\b/,
    /\bin this document\b/,
    /\bin the document\b/,
    /\bin this file\b/,
    /\bin the file\b/,

    /المستند/,
    /الوثيقة/,
    /الملف/,
    /صفحة/,
    /الصفحة/,
    /الفصل/,
    /القسم/,
    /ماذا يقول/,
    /ماذا ذكر/,
    /ايه اللي فيه/,
    /ايه المكتوب/,
    /موجود في الملف/,
    /حسب الملف/,
  ];


  return patterns.some(
    (
      pattern
    ) =>
      pattern.test(
        normalized
      )
  );
}


/* =========================================================
   NORMALIZE MESSAGE
   ========================================================= */

function normalizeBackendMessage(
  message: BackendMessage
): Message {
  const attachment =
    getAttachment(
      message
        .structured_response_json
    );


  return {
    id:
      String(
        message.id
      ),

    role:
      message.role ===
      "user"
        ? "user"
        : "assistant",

    content:
      String(
        message.content ??
          ""
      ),

    timestamp:
      message.created_at,

    fileName:
      attachment?.name,

    attachment,
  };
}


function extractMessagesArray(
  payload: any
): BackendMessage[] {
  if (
    Array.isArray(
      payload
    )
  ) {
    return payload;
  }


  if (
    Array.isArray(
      payload?.messages
    )
  ) {
    return payload.messages;
  }


  if (
    Array.isArray(
      payload?.items
    )
  ) {
    return payload.items;
  }


  if (
    Array.isArray(
      payload?.data
    )
  ) {
    return payload.data;
  }


  return [];
}


function findLatestImageAttachment(
  messages: Message[]
): AttachmentContext | null {
  for (
    let index =
      messages.length - 1;
    index >= 0;
    index -= 1
  ) {
    const attachment =
      messages[index]
        .attachment;


    if (
      attachment &&
      isImageAttachment(
        attachment
      ) &&
      attachment.id
    ) {
      return attachment;
    }
  }


  return null;
}


function findLatestDocumentAttachment(
  messages: Message[]
): AttachmentContext | null {
  for (
    let index =
      messages.length - 1;
    index >= 0;
    index -= 1
  ) {
    const attachment =
      messages[index]
        .attachment;


    if (
      attachment &&
      isDocumentAttachment(
        attachment
      ) &&
      attachment.id
    ) {
      return attachment;
    }
  }


  return null;
}


function findLatestStoredContext(
  messages: Message[]
): {
  kind:
    | "image"
    | "document";

  attachment:
    AttachmentContext;
} | null {
  for (
    let index =
      messages.length - 1;
    index >= 0;
    index -= 1
  ) {
    const attachment =
      messages[index]
        .attachment;


    if (
      !attachment ||
      !attachment.id
    ) {
      continue;
    }


    if (
      isImageAttachment(
        attachment
      )
    ) {
      return {
        kind:
          "image",

        attachment,
      };
    }


    if (
      isDocumentAttachment(
        attachment
      )
    ) {
      return {
        kind:
          "document",

        attachment,
      };
    }
  }


  return null;
}


function dispatchConversationUpdate(
  conversationId?: string
) {
  window.dispatchEvent(
    new CustomEvent(
      "accessmate-chat-updated",
      {
        detail: {
          conversationId,
        },
      }
    )
  );


  window.dispatchEvent(
    new Event(
      "accessmate-conversations-updated"
    )
  );
}


function dispatchFilesUpdate() {
  window.dispatchEvent(
    new Event(
      "accessmate-files-updated"
    )
  );
}


/* =========================================================
   COMPONENT
   ========================================================= */

const ChatPage:
  React.FC = () => {
    const {
      chatId,
    } =
      useParams<{
        chatId: string;
      }>();


    const navigate =
      useNavigate();


    const location =
      useLocation();


    const navigationState =
      location.state as
        | NavigationState
        | null;


    /* =====================================================
       STATE
       ===================================================== */

    const [
      messages,
      setMessages,
    ] =
      useState<
        Message[]
      >([]);


    const [
      input,
      setInput,
    ] =
      useState("");


    const [
      selectedFile,
      setSelectedFile,
    ] =
      useState<
        File | null
      >(null);


    const [
      activeImageAttachment,
      setActiveImageAttachment,
    ] =
      useState<
        AttachmentContext | null
      >(null);


    const [
      activeDocumentAttachment,
      setActiveDocumentAttachment,
    ] =
      useState<
        AttachmentContext | null
      >(
        navigationState
          ?.documentId
          ? {
              id:
                navigationState
                  .documentId,

              name:
                "",

              mimeType:
                "",

              fileType:
                "",
            }
          : null
      );


    const [
      activeContextKind,
      setActiveContextKind,
    ] =
      useState<
        ActiveContextKind
      >(
        navigationState
          ?.documentId
          ? "document"
          : null
      );


    const [
      loading,
      setLoading,
    ] =
      useState(false);


    const [
      historyLoading,
      setHistoryLoading,
    ] =
      useState(true);


    const [
      externalProcessing,
      setExternalProcessing,
    ] =
      useState(
        Boolean(
          navigationState
            ?.backgroundProcessing
        )
      );


    const [
      isRecording,
      setIsRecording,
    ] =
      useState(false);


    const [
      recordingSeconds,
      setRecordingSeconds,
    ] =
      useState(0);


    const [
      isTranscribing,
      setIsTranscribing,
    ] =
      useState(false);


    /* =====================================================
       REFS
       ===================================================== */

    const messagesEndRef =
      useRef<HTMLDivElement | null>(
        null
      );


    const inputRef =
      useRef<HTMLTextAreaElement | null>(
        null
      );


    const fileInputRef =
      useRef<HTMLInputElement | null>(
        null
      );


    const mediaRecorderRef =
      useRef<MediaRecorder | null>(
        null
      );


    const audioChunksRef =
      useRef<Blob[]>([]);


    const recordingResolveRef =
      useRef<
        ((
          file: File | null
        ) => void) | null
      >(null);


    const recordingTimerRef =
      useRef<
        ReturnType<
          typeof setInterval
        > | null
      >(null);


    const sendingRef =
      useRef(false);


    /* =====================================================
       LOAD HISTORY
       ===================================================== */

    const loadHistory =
      useCallback(
        async (
          showMainLoader =
            false
        ) => {
          if (
            !chatId ||
            !isValidConversationId(
              chatId
            )
          ) {
            navigate(
              "/dashboard",
              {
                replace:
                  true,
              }
            );

            return;
          }


          if (
            showMainLoader
          ) {
            setHistoryLoading(
              true
            );
          }


          try {
            const response =
              await api.get(
                `/conversations/me/${chatId}/messages`
              );


            const payload =
              unwrapResponse<any>(
                response
              );


            const rows =
              extractMessagesArray(
                payload
              );


            const normalized =
              rows.map(
                normalizeBackendMessage
              );


            setMessages(
              normalized
            );


            const latestImage =
              findLatestImageAttachment(
                normalized
              );


            const latestDocument =
              findLatestDocumentAttachment(
                normalized
              );


            const latestContext =
              findLatestStoredContext(
                normalized
              );


            setActiveImageAttachment(
              latestImage
            );


            if (
              latestDocument
            ) {
              setActiveDocumentAttachment(
                latestDocument
              );
            } else if (
              navigationState
                ?.documentId
            ) {
              setActiveDocumentAttachment(
                {
                  id:
                    navigationState
                      .documentId,

                  name:
                    "",

                  mimeType:
                    "",

                  fileType:
                    "",
                }
              );
            } else {
              setActiveDocumentAttachment(
                null
              );
            }


            if (
              latestContext
            ) {
              setActiveContextKind(
                latestContext.kind
              );
            } else if (
              navigationState
                ?.documentId
            ) {
              setActiveContextKind(
                "document"
              );
            } else {
              setActiveContextKind(
                null
              );
            }


            const lastMessage =
              normalized[
                normalized.length -
                  1
              ];


            if (
              lastMessage?.role ===
              "assistant"
            ) {
              setExternalProcessing(
                false
              );
            }
          } catch (error) {
            console.error(
              "Failed to load chat history:",
              error
            );
          } finally {
            if (
              showMainLoader
            ) {
              setHistoryLoading(
                false
              );
            }
          }
        },
        [
          chatId,
          navigate,
          navigationState
            ?.documentId,
        ]
      );


    /* =====================================================
       INITIAL HISTORY
       ===================================================== */

    useEffect(() => {
      void loadHistory(
        true
      );
    }, [
      loadHistory,
    ]);


    /* =====================================================
       LIVE UPDATE FROM DASHBOARD
       ===================================================== */

    useEffect(() => {
      function handleChatUpdated(
        event: Event
      ) {
        const customEvent =
          event as CustomEvent<{
            conversationId?: string;
          }>;


        const conversationId =
          customEvent
            .detail
            ?.conversationId;


        if (
          !conversationId ||
          conversationId ===
            chatId
        ) {
          void loadHistory(
            false
          );
        }
      }


      window.addEventListener(
        "accessmate-chat-updated",
        handleChatUpdated
      );


      return () => {
        window.removeEventListener(
          "accessmate-chat-updated",
          handleChatUpdated
        );
      };
    }, [
      chatId,
      loadHistory,
    ]);


    /* =====================================================
       BACKGROUND ERROR EVENT
       ===================================================== */

    useEffect(() => {
      function handleProcessingError(
        event: Event
      ) {
        const customEvent =
          event as CustomEvent<{
            conversationId?: string;
            message?: string;
          }>;


        const conversationId =
          customEvent
            .detail
            ?.conversationId;


        if (
          conversationId !==
          chatId
        ) {
          return;
        }


        setExternalProcessing(
          false
        );


        const message =
          customEvent
            .detail
            ?.message;


        if (
          message
        ) {
          setMessages(
            (
              current
            ) => [
              ...current,
              {
                id:
                  createTemporaryId(),

                role:
                  "assistant",

                content:
                  message,

                timestamp:
                  new Date()
                    .toISOString(),
              },
            ]
          );
        }
      }


      window.addEventListener(
        "accessmate-chat-processing-error",
        handleProcessingError
      );


      return () => {
        window.removeEventListener(
          "accessmate-chat-processing-error",
          handleProcessingError
        );
      };
    }, [
      chatId,
    ]);


    /* =====================================================
       POLLING SAFETY NET
       ===================================================== */

    useEffect(() => {
      if (
        !externalProcessing
      ) {
        return;
      }


      const interval =
        window.setInterval(
          () => {
            void loadHistory(
              false
            );
          },
          1500
        );


      const timeout =
        window.setTimeout(
          () => {
            window.clearInterval(
              interval
            );

            setExternalProcessing(
              false
            );
          },
          90000
        );


      return () => {
        window.clearInterval(
          interval
        );

        window.clearTimeout(
          timeout
        );
      };
    }, [
      externalProcessing,
      loadHistory,
    ]);


    /* =====================================================
       SCROLL
       ===================================================== */

    useEffect(() => {
      messagesEndRef.current?.scrollIntoView(
        {
          behavior:
            "smooth",
        }
      );
    }, [
      messages,
      loading,
      externalProcessing,
    ]);


    /* =====================================================
       RECORDING TIMER
       ===================================================== */

    useEffect(() => {
      if (
        isRecording
      ) {
        recordingTimerRef.current =
          setInterval(
            () => {
              setRecordingSeconds(
                (
                  current
                ) =>
                  current +
                  1
              );
            },
            1000
          );
      } else if (
        recordingTimerRef.current
      ) {
        clearInterval(
          recordingTimerRef.current
        );

        recordingTimerRef.current =
          null;
      }


      return () => {
        if (
          recordingTimerRef.current
        ) {
          clearInterval(
            recordingTimerRef.current
          );

          recordingTimerRef.current =
            null;
        }
      };
    }, [
      isRecording,
    ]);


    /* =====================================================
       CLEANUP
       ===================================================== */

    useEffect(() => {
      return () => {
        const recorder =
          mediaRecorderRef.current;


        if (
          recorder
        ) {
          recorder.stream
            .getTracks()
            .forEach(
              (
                track
              ) =>
                track.stop()
            );
        }


        if (
          recordingResolveRef.current
        ) {
          recordingResolveRef.current(
            null
          );

          recordingResolveRef.current =
            null;
        }


        if (
          recordingTimerRef.current
        ) {
          clearInterval(
            recordingTimerRef.current
          );
        }
      };
    }, []);


    /* =====================================================
       RESPONSE HELPER
       ===================================================== */

    function extractTextFromResponse(
      payload: any
    ): string {
      const data =
        unwrapResponse<any>(
          payload
        );


      const value =
        data?.answer ||
        data?.response ||
        data?.message ||
        data?.text ||
        data?.extracted_text ||
        data?.explanation ||
        data?.transcript ||
        data?.description ||
        data?.content ||
        data?.result;


      if (
        typeof value ===
          "string" &&
        value.trim()
      ) {
        return value.trim();
      }


      if (
        typeof data ===
          "string" &&
        data.trim()
      ) {
        return data.trim();
      }


      return JSON.stringify(
        data,
        null,
        2
      );
    }


    /* =====================================================
       SAVE MESSAGE
       ===================================================== */

    async function saveMessage(
      role:
        | "user"
        | "assistant",

      content: string,

      language:
        | "ar"
        | "en",

      file?:
        | File
        | null,

      document?:
        | BackendDocument
        | null
    ) {
      if (
        !chatId ||
        !isValidConversationId(
          chatId
        )
      ) {
        throw new Error(
          "Invalid conversation ID."
        );
      }


      const structuredResponse =
        file
          ? {
              attachment: {
                id:
                  document?.id ??
                  null,

                document_id:
                  document?.id ??
                  null,

                name:
                  document
                    ?.original_file_name ||
                  file.name,

                stored_file_name:
                  document
                    ?.stored_file_name ??
                  null,

                file_type:
                  document
                    ?.file_type ??
                  null,

                mime_type:
                  document
                    ?.mime_type ||
                  file.type ||
                  null,

                size:
                  document
                    ?.file_size ??
                  file.size,
              },
            }
          : null;


      const response =
        await api.post(
          `/conversations/me/${chatId}/messages`,
          {
            role,

            content,

            assistant_language:
              language,

            structured_response_json:
              structuredResponse,

            audio_url:
              null,
          }
        );


      const saved =
        unwrapResponse<BackendMessage>(
          response
        );


      if (
        !saved?.id
      ) {
        throw new Error(
          "Failed to save message."
        );
      }


      return normalizeBackendMessage(
        saved
      );
    }


    /* =====================================================
       FILE → LIBRARY
       ===================================================== */

    async function uploadFileToLibrary(
      file: File
    ) {
      const formData =
        new FormData();


      formData.append(
        "file",
        file
      );


      const response =
        await api.post(
          "/files/upload",
          formData
        );


      const document =
        unwrapResponse<BackendDocument>(
          response
        );


      if (
        !document?.id
      ) {
        throw new Error(
          "File upload did not return an ID."
        );
      }


      dispatchFilesUpdate();


      return document;
    }


    /* =====================================================
       LOAD PREVIOUS IMAGE
       ===================================================== */

    async function loadStoredAttachmentAsFile(
      attachment:
        AttachmentContext
    ): Promise<File> {
      if (
        !attachment.id
      ) {
        throw new Error(
          "Previous image does not have a stored document ID."
        );
      }


      const token =
        getToken();


      if (!token) {
        throw new Error(
          "Authentication token not found."
        );
      }


      const response =
        await fetch(
          buildApiUrl(
            `/files/${attachment.id}/content`
          ),
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );


      if (
        !response.ok
      ) {
        let message =
          `Failed to load previous image (${response.status}).`;


        try {
          const payload =
            await response.json();


          if (
            payload?.detail
          ) {
            message =
              String(
                payload.detail
              );
          }
        } catch {
          // Ignore non-JSON response.
        }


        throw new Error(
          message
        );
      }


      const blob =
        await response.blob();


      return new File(
        [
          blob,
        ],
        attachment.name ||
          "previous-image",
        {
          type:
            attachment.mimeType ||
            blob.type ||
            "application/octet-stream",
        }
      );
    }


    /* =====================================================
       TEXT AI
       ===================================================== */

    async function callTextAI(
      text: string,
      language:
        | "ar"
        | "en",
      recentHistory:
        DocumentConversationTurn[] = []
    ) {
      const responseLanguage =
        resolveRequestedResponseLanguage(
          text,
          language
        );


      const contextualMessage =
        buildGeneralChatPrompt(
          text,
          recentHistory,
          responseLanguage
        );


      const response =
        await api.post(
          "/ai/chat",
          {
            message:
              contextualMessage,

            prompt:
              contextualMessage,

            question:
              text,

            language:
              responseLanguage,

            explanation_level:
              "detailed",

            voice_friendly:
              true,
          }
        );


      return extractTextFromResponse(
        response
      );
    }


    /* =====================================================
       IMAGE — FAST DIRECT ROUTING
       ===================================================== */

    type ImageTaskMode =
      | "ocr"
      | "describe"
      | "assist";


    function detectImageTaskMode(
      taskText: string
    ): ImageTaskMode {
      const normalized =
        taskText
          .trim()
          .toLowerCase()
          .replace(
            /\s+/g,
            " "
          );


      if (
        !normalized
      ) {
        return "describe";
      }


      const ocrPatterns = [
        /ocr/,
        /extract (the )?text/,
        /read (the )?text/,
        /what is written/,
        /transcribe (the )?(image|text)/,
        /استخرج النص/,
        /استخراج النص/,
        /استخرج الكلام/,
        /اقرأ النص/,
        /اقرا النص/,
        /اقرأ المكتوب/,
        /اقرا المكتوب/,
        /مكتوب ايه/,
        /مكتوب إيه/,
        /النص الموجود/,
        /الكلام الموجود/,
      ];


      if (
        ocrPatterns.some(
          (pattern) =>
            pattern.test(
              normalized
            )
        )
      ) {
        return "ocr";
      }


      const describePatterns = [
        /describe/,
        /describe (the|this) (image|photo|picture)/,
        /what is in (the|this) (image|photo|picture)/,
        /اوصف الصورة/,
        /اوصف الصوره/,
        /وصف الصورة/,
        /وصف الصوره/,
        /اشرح الصورة/,
        /اشرح الصوره/,
      ];


      if (
        describePatterns.some(
          (pattern) =>
            pattern.test(
              normalized
            )
        )
      ) {
        return "describe";
      }


      return "assist";
    }


    async function optimizeImageForAI(
      file: File,
      mode: ImageTaskMode
    ): Promise<File> {
      if (
        !file.type.startsWith(
          "image/"
        )
      ) {
        return file;
      }


      try {
        const bitmap =
          await createImageBitmap(
            file
          );


        const maxDimension =
          mode === "ocr"
            ? 2200
            : 1600;


        const longestSide =
          Math.max(
            bitmap.width,
            bitmap.height
          );


        const scale =
          Math.min(
            1,
            maxDimension /
              longestSide
          );


        const alreadyEfficient =
          scale === 1 &&
          file.size <=
            (
              mode === "ocr"
                ? 2_500_000
                : 1_500_000
            );


        if (
          alreadyEfficient
        ) {
          bitmap.close();

          return file;
        }


        const width =
          Math.max(
            1,
            Math.round(
              bitmap.width *
                scale
            )
          );


        const height =
          Math.max(
            1,
            Math.round(
              bitmap.height *
                scale
            )
          );


        const canvas =
          document.createElement(
            "canvas"
          );


        canvas.width =
          width;

        canvas.height =
          height;


        const context =
          canvas.getContext(
            "2d"
          );


        if (
          !context
        ) {
          bitmap.close();

          return file;
        }


        context.drawImage(
          bitmap,
          0,
          0,
          width,
          height
        );


        bitmap.close();


        const outputType =
          mode === "ocr"
            ? "image/webp"
            : "image/jpeg";


        const quality =
          mode === "ocr"
            ? 0.92
            : 0.82;


        const blob =
          await new Promise<
            Blob | null
          >(
            (resolve) =>
              canvas.toBlob(
                resolve,
                outputType,
                quality
              )
          );


        if (
          !blob ||
          blob.size >=
            file.size
        ) {
          return file;
        }


        const baseName =
          file.name.replace(
            /\.[^.]+$/,
            ""
          );


        const extension =
          outputType ===
          "image/webp"
            ? "webp"
            : "jpg";


        return new File(
          [
            blob,
          ],
          `${baseName}-ai.${extension}`,
          {
            type:
              outputType,
          }
        );

      } catch (error) {
        console.warn(
          "Image optimization skipped:",
          error
        );

        return file;
      }
    }


    async function callOCRService(
      file: File,
      language:
        | "ar"
        | "en"
    ) {
      const formData =
        new FormData();


      formData.append(
        "image_file",
        file
      );


      formData.append(
        "language",
        language
      );


      formData.append(
        "voice_friendly",
        "true"
      );


      const response =
        await api.post(
          "/ocr/extract",
          formData
        );


      return extractTextFromResponse(
        response
      );
    }


    async function callVisionDescribeService(
      file: File,
      language:
        | "ar"
        | "en"
    ) {
      const formData =
        new FormData();


      formData.append(
        "image_file",
        file
      );


      formData.append(
        "language",
        language
      );


      formData.append(
        "explanation_level",
        "simple"
      );


      formData.append(
        "voice_friendly",
        "true"
      );


      formData.append(
        "should_speak",
        "true"
      );


      const response =
        await api.post(
          "/vision/describe",
          formData
        );


      return extractTextFromResponse(
        response
      );
    }


    async function callVisionAssistService(
      file: File,
      taskText: string,
      language:
        | "ar"
        | "en"
    ) {
      const formData =
        new FormData();


      formData.append(
        "image_file",
        file
      );


      formData.append(
        "task",
        taskText.trim() ||
          "Describe this image clearly for accessibility."
      );


      formData.append(
        "language",
        language
      );


      formData.append(
        "explanation_level",
        "simple"
      );


      formData.append(
        "voice_friendly",
        "true"
      );


      formData.append(
        "should_speak",
        "true"
      );


      const response =
        await api.post(
          "/vision/assist",
          formData
        );


      return extractTextFromResponse(
        response
      );
    }


    async function callImageService(
      file: File,
      taskText: string
    ) {
      const language =
        detectLanguage(
          taskText ||
            file.name
        );


      const mode =
        detectImageTaskMode(
          taskText
        );


      const optimizedFile =
        await optimizeImageForAI(
          file,
          mode
        );


      if (
        mode === "ocr"
      ) {
        return callOCRService(
          optimizedFile,
          language
        );
      }


      if (
        mode === "describe"
      ) {
        return callVisionDescribeService(
          optimizedFile,
          language
        );
      }


      return callVisionAssistService(
        optimizedFile,
        taskText,
        language
      );
    }


    /* =====================================================
       AUDIO
       ===================================================== */

    async function transcribeRecordedVoice(
      file: File
    ) {
      const formData =
        new FormData();


      formData.append(
        "audio_file",
        file
      );


      /*
       * Important: do not force the UI language here.
       * The speech provider should detect whether the user
       * spoke Arabic or English.
       */
      formData.append(
        "language",
        "auto"
      );


      formData.append(
        "sequence",
        "0"
      );


      const response =
        await api.post(
          "/hearing/transcribe-chunk",
          formData
        );


      const result =
        unwrapResponse<HearingChunkResponse>(
          response
        );


      const transcript =
        String(
          result?.transcript ??
            ""
        ).trim();


      if (
        !result?.is_speech ||
        !transcript
      ) {
        throw new Error(
          "I couldn't detect clear speech in that recording. Please try again."
        );
      }


      return {
        transcript,

        language:
          resolveMessageLanguage(
            transcript,
            result.language
          ),
      };
    }


    async function callAudioService(
      file: File,
      taskText: string
    ) {
      const language =
        detectLanguage(
          taskText ||
            file.name
        );


      const audioFormData =
        new FormData();


      audioFormData.append(
        "audio_file",
        file
      );


      audioFormData.append(
        "language",
        language
      );


      audioFormData.append(
        "explanation_level",
        "simple"
      );


      audioFormData.append(
        "voice_friendly",
        "true"
      );


      audioFormData.append(
        "speak",
        "true"
      );


      try {
        const response =
          await api.post(
            "/voice/audio-ask",
            audioFormData
          );


        return extractTextFromResponse(
          response
        );
      } catch (
        audioError
      ) {
        console.warn(
          "Audio ask failed. Falling back to transcription:",
          audioError
        );


        const transcriptionFormData =
          new FormData();


        transcriptionFormData.append(
          "audio_file",
          file
        );


        transcriptionFormData.append(
          "language",
          language
        );


        const response =
          await api.post(
            "/voice/transcribe",
            transcriptionFormData
          );


        return extractTextFromResponse(
          response
        );
      }
    }


    /* =====================================================
       DOCUMENT PREPARE
       ===================================================== */

    async function prepareDocument(
      documentId: string
    ) {
      const response =
        await api.post(
          `/documents/me/${documentId}/prepare`,
          {}
        );


      const prepared =
        unwrapResponse<DocumentPrepareResponse>(
          response
        );


      if (
        !prepared?.document_id ||
        prepared.status !==
          "indexed"
      ) {
        throw new Error(
          "The document could not be prepared for analysis."
        );
      }


      return prepared;
    }


    /* =====================================================
       DOCUMENT ASK — CONVERSATION-AWARE RAG
       ===================================================== */

    async function askDocument(
      documentId: string,

      question: string,

      language:
        | "ar"
        | "en",

      recentHistory:
        DocumentConversationTurn[]
    ) {
      if (
        !documentId
      ) {
        throw new Error(
          "Document context is missing."
        );
      }


      const response =
        await api.post(
          `/documents/me/${documentId}/ask`,
          {
            question:
              normalizeDocumentQuestion(
                question
              ),

            language,

            explanation_level:
              "simple",

            voice_friendly:
              true,

            limit:
              5,

            mode:
              "auto",

            /*
             * New:
             *
             * Last conversation turns are sent to the
             * backend so it can resolve:
             *
             * "it"
             * "that"
             * "second one"
             * "دي"
             * "التانية"
             *
             * Backend does NOT use these as factual
             * document evidence.
             */
            recent_history:
              recentHistory,
          }
        );


      const result =
        unwrapResponse<DocumentAskResponse>(
          response
        );


      if (
        !result?.answer ||
        !result.answer.trim()
      ) {
        throw new Error(
          "Document AI returned an empty response."
        );
      }


      console.info(
        "Document follow-up:",
        {
          documentId:
            result.document_id,

          mode:
            result.mode,

          strategy:
            result.strategy,

          retrievalQuery:
            result.retrieval_query,

          usedConversationHistory:
            result
              .used_conversation_history,

          retrievedChunks:
            result.retrieved_chunks,

          sourceChunksUsed:
            result.source_chunks_used,
        }
      );


      return result.answer.trim();
    }


    /* =====================================================
       NEW DOCUMENT
       ===================================================== */

    async function callDocumentService(
      file: File,

      taskText: string,

      language:
        | "ar"
        | "en",

      document:
        BackendDocument
    ) {
      if (
        !document?.id
      ) {
        throw new Error(
          "Document ID is missing."
        );
      }


      if (
        !isDocumentFile(
          file
        )
      ) {
        throw new Error(
          `Document analysis is not supported for ${file.name}.`
        );
      }


      /*
       * New document:
       *
       * Prepare once.
       */
      await prepareDocument(
        document.id
      );


      /*
       * A newly uploaded document should start with
       * clean document context.
       *
       * We intentionally don't pass old conversation
       * history from another document here.
       */
      return askDocument(
        document.id,
        taskText,
        language,
        []
      );
    }


    /* =====================================================
       SEND
       ===================================================== */

    async function sendMessage(
      options: SendMessageOptions = {}
    ) {
      const text =
        (
          options.textOverride ??
          input
        ).trim();


      const currentFile =
        options.ignoreSelectedFile
          ? null
          : selectedFile;


      if (
        (
          !text &&
          !currentFile
        ) ||
        loading ||
        externalProcessing ||
        sendingRef.current
      ) {
        return;
      }


      if (
        !chatId ||
        !isValidConversationId(
          chatId
        )
      ) {
        navigate(
          "/dashboard",
          {
            replace:
              true,
          }
        );

        return;
      }


      sendingRef.current =
        true;


      setLoading(
        true
      );


      /*
       * Capture the conversation history BEFORE
       * saving the current user question.
       *
       * This prevents the current question from
       * appearing twice in recent_history.
       */
      const recentDocumentHistory =
        buildRecentDocumentHistory(
          messages
        );


      const recentGeneralHistory =
        buildRecentGeneralHistory(
          messages
        );


      const language =
        resolveRequestedResponseLanguage(
          text,
          options.languageOverride ??
            detectLanguage(
              text ||
                currentFile?.name ||
                ""
            )
        );


      const userContent =
        text ||
        (
          currentFile
            ? `Uploaded a file: ${currentFile.name}`
            : ""
        );


      let uploadedDocument:
        | BackendDocument
        | null =
        null;


      let earlyImageResultPromise:
        | Promise<{
            answer?: string;
            error?: unknown;
          }>
        | null =
        null;


      /*
       * Start image AI immediately.
       * The original file is uploaded to the Library at the same time.
       * This removes the old serial wait:
       * upload -> save -> vision/OCR.
       */
      if (
        currentFile &&
        isImageFile(
          currentFile
        )
      ) {
        earlyImageResultPromise =
          callImageService(
            currentFile,
            text
          ).then(
            (answer) => ({
              answer,
            }),
            (error) => ({
              error,
            })
          );
      }


      try {
        /* ===============================================
           FILE → LIBRARY
           =============================================== */

        if (
          currentFile
        ) {
          uploadedDocument =
            await uploadFileToLibrary(
              currentFile
            );
        }


        /* ===============================================
           SAVE USER MESSAGE
           =============================================== */

        const savedUserMessage =
          await saveMessage(
            "user",
            userContent,
            language,
            currentFile,
            uploadedDocument
          );


        setMessages(
          (
            current
          ) => [
            ...current,
            savedUserMessage,
          ]
        );


        /* ===============================================
           UPDATE STORED CONTEXT
           =============================================== */

        if (
          savedUserMessage
            .attachment &&
          isImageAttachment(
            savedUserMessage
              .attachment
          ) &&
          savedUserMessage
            .attachment.id
        ) {
          setActiveImageAttachment(
            savedUserMessage
              .attachment
          );


          setActiveContextKind(
            "image"
          );
        }


        if (
          savedUserMessage
            .attachment &&
          isDocumentAttachment(
            savedUserMessage
              .attachment
          ) &&
          savedUserMessage
            .attachment.id
        ) {
          setActiveDocumentAttachment(
            savedUserMessage
              .attachment
          );


          setActiveContextKind(
            "document"
          );
        }


        dispatchConversationUpdate(
          chatId
        );


        setInput("");

        setSelectedFile(
          null
        );


        /* ===============================================
           PROCESS
           =============================================== */

        let answer = "";


        if (
          currentFile
        ) {
          /* =============================================
             NEW IMAGE
             ============================================= */

          if (
            isImageFile(
              currentFile
            )
          ) {
            const imageResult =
              earlyImageResultPromise
                ? await earlyImageResultPromise
                : {
                    answer:
                      await callImageService(
                        currentFile,
                        text
                      ),
                  };


            if (
              imageResult.error
            ) {
              throw imageResult.error;
            }


            answer =
              imageResult.answer ||
              "";
          }

          /* =============================================
             NEW AUDIO
             ============================================= */

          else if (
            isAudioFile(
              currentFile
            )
          ) {
            answer =
              await callAudioService(
                currentFile,
                text
              );
          }

          /* =============================================
             NEW DOCUMENT
             ============================================= */

          else if (
            isDocumentFile(
              currentFile
            )
          ) {
            if (
              !uploadedDocument
            ) {
              throw new Error(
                "Document upload record is missing."
              );
            }


            answer =
              await callDocumentService(
                currentFile,
                text,
                language,
                uploadedDocument
              );
          }

          /* =============================================
             UNSUPPORTED
             ============================================= */

          else {
            throw new Error(
              `Unsupported file type: ${currentFile.name}`
            );
          }
        }

        /* ===============================================
           EXISTING DOCUMENT CONTEXT

           Main conversational RAG path.
           =============================================== */

        else if (
          activeContextKind ===
            "document" &&
          activeDocumentAttachment
            ?.id
        ) {
          answer =
            await askDocument(
              activeDocumentAttachment.id,
              text,
              language,
              recentDocumentHistory
            );
        }

        /* ===============================================
           EXPLICIT DOCUMENT REFERENCE

           Useful if both an image and a document have
           appeared in the same conversation.
           =============================================== */

        else if (
          activeDocumentAttachment
            ?.id &&
          looksLikeDocumentFollowUp(
            text
          )
        ) {
          answer =
            await askDocument(
              activeDocumentAttachment.id,
              text,
              language,
              recentDocumentHistory
            );


          setActiveContextKind(
            "document"
          );
        }

        /* ===============================================
           PREVIOUS IMAGE CONTEXT
           =============================================== */

        else if (
          activeImageAttachment &&
          looksLikeImageFollowUp(
            text
          )
        ) {
          const previousImage =
            await loadStoredAttachmentAsFile(
              activeImageAttachment
            );


          answer =
            await callImageService(
              previousImage,
              text
            );


          setActiveContextKind(
            "image"
          );
        }

        /* ===============================================
           GENERAL TEXT AI
           =============================================== */

        else {
          answer =
            await callTextAI(
              text,
              language,
              recentGeneralHistory
            );
        }


        if (
          !answer.trim()
        ) {
          throw new Error(
            "AccessMate returned an empty response."
          );
        }


        /* ===============================================
           ASSISTANT MESSAGE
           =============================================== */

        const savedAssistant =
          await saveMessage(
            "assistant",
            answer,
            language,
            null,
            null
          );


        setMessages(
          (
            current
          ) => [
            ...current,
            savedAssistant,
          ]
        );


        dispatchConversationUpdate(
          chatId
        );
      } catch (
        error
      ) {
        console.error(
          "Chat request failed:",
          error
        );


        setMessages(
          (
            current
          ) => [
            ...current,
            {
              id:
                createTemporaryId(),

              role:
                "assistant",

              content:
                getApiError(
                  error
                ),

              timestamp:
                new Date()
                  .toISOString(),
            },
          ]
        );
      } finally {
        sendingRef.current =
          false;


        setLoading(
          false
        );


        if (
          fileInputRef.current
        ) {
          fileInputRef.current.value =
            "";
        }


        window.setTimeout(
          () => {
            inputRef.current?.focus();
          },
          50
        );
      }
    }


    async function handleSend() {
      /*
       * ChatGPT-like voice send:
       *
       * While the microphone is still recording, the Send
       * button finalizes the recording, transcribes it, and
       * sends the transcript as a normal text message.
       *
       * The WebM file is never added to selectedFile, never
       * uploaded to the Library, and never shown as an
       * attachment bubble.
       */
      if (
        isRecording
      ) {
        if (
          loading ||
          externalProcessing ||
          historyLoading ||
          isTranscribing ||
          sendingRef.current
        ) {
          return;
        }


        setIsTranscribing(
          true
        );


        try {
          const audioFile =
            await stopRecordingAndGetFile();


          if (
            !audioFile ||
            audioFile.size ===
              0
          ) {
            throw new Error(
              "The voice recording was empty. Please try again."
            );
          }


          const {
            transcript,
            language,
          } =
            await transcribeRecordedVoice(
              audioFile
            );


          /*
           * Do NOT place the transcript in the composer.
           * Send it directly as the user's message so the
           * conversation looks exactly like a typed message.
           */
          await sendMessage(
            {
              textOverride:
                transcript,

              languageOverride:
                language,

              ignoreSelectedFile:
                true,
            }
          );
        } catch (error) {
          console.error(
            "Voice message failed:",
            error
          );


          setMessages(
            (current) => [
              ...current,
              {
                id:
                  createTemporaryId(),

                role:
                  "assistant",

                content:
                  getApiError(
                    error
                  ),

                timestamp:
                  new Date()
                    .toISOString(),
              },
            ]
          );
        } finally {
          setIsTranscribing(
            false
          );
        }


        return;
      }


      await sendMessage();
    }


    /* =====================================================
       ENTER
       ===================================================== */

    function handleKeyPress(
      event:
        React.KeyboardEvent<HTMLTextAreaElement>
    ) {
      if (
        event.key ===
          "Enter" &&
        !event.shiftKey
      ) {
        event.preventDefault();


        void handleSend();
      }
    }


    /* =====================================================
       FILE PICK
       ===================================================== */

    function handleFilePick(
      event:
        ChangeEvent<HTMLInputElement>
    ) {
      const file =
        event.target
          .files?.[0];


      if (!file) {
        return;
      }


      setSelectedFile(
        file
      );


      window.setTimeout(
        () => {
          inputRef.current?.focus();
        },
        50
      );
    }


    function removeSelectedFile() {
      setSelectedFile(
        null
      );


      if (
        fileInputRef.current
      ) {
        fileInputRef.current.value =
          "";
      }
    }


    /* =====================================================
       RECORDING
       ===================================================== */

    async function startRecording() {
      if (
        isRecording ||
        loading ||
        externalProcessing
      ) {
        return;
      }


      if (
        !navigator.mediaDevices
          ?.getUserMedia
      ) {
        setMessages(
          (
            current
          ) => [
            ...current,
            {
              id:
                createTemporaryId(),

              role:
                "assistant",

              content:
                "Microphone recording is not supported in this browser.",
            },
          ]
        );

        return;
      }


      try {
        const stream =
          await navigator.mediaDevices.getUserMedia(
            {
              audio:
                true,
            }
          );


        let mimeType =
          "audio/webm";


        if (
          typeof MediaRecorder
            .isTypeSupported ===
            "function" &&
          MediaRecorder.isTypeSupported(
            "audio/webm;codecs=opus"
          )
        ) {
          mimeType =
            "audio/webm;codecs=opus";
        }


        const recorder =
          new MediaRecorder(
            stream,
            {
              mimeType,
            }
          );


        audioChunksRef.current =
          [];


        recorder.ondataavailable =
          (
            event
          ) => {
            if (
              event.data.size >
              0
            ) {
              audioChunksRef.current.push(
                event.data
              );
            }
          };


        recorder.onstop =
          () => {
            const blob =
              new Blob(
                audioChunksRef.current,
                {
                  type:
                    "audio/webm",
                }
              );


            const audioFile =
              blob.size >
                0
                ? new File(
                    [
                      blob,
                    ],
                    `voice-recording-${Date.now()}.webm`,
                    {
                      type:
                        "audio/webm",
                    }
                  )
                : null;


            /*
             * Resolve the pending Send action. The recording
             * is intentionally NOT assigned to selectedFile.
             */
            if (
              recordingResolveRef.current
            ) {
              recordingResolveRef.current(
                audioFile
              );

              recordingResolveRef.current =
                null;
            }


            recorder.stream
              .getTracks()
              .forEach(
                (
                  track
                ) =>
                  track.stop()
              );


            audioChunksRef.current =
              [];


            mediaRecorderRef.current =
              null;


            setIsRecording(
              false
            );


            setRecordingSeconds(
              0
            );
          };


        recorder.onerror =
          (
            event
          ) => {
            console.error(
              "MediaRecorder error:",
              event
            );


            recorder.stream
              .getTracks()
              .forEach(
                (
                  track
                ) =>
                  track.stop()
              );


            mediaRecorderRef.current =
              null;


            setIsRecording(
              false
            );


            setRecordingSeconds(
              0
            );
          };


        mediaRecorderRef.current =
          recorder;


        setRecordingSeconds(
          0
        );


        setIsRecording(
          true
        );


        recorder.start(
          250
        );
      } catch (
        error
      ) {
        console.error(
          "Failed to start microphone:",
          error
        );


        setIsRecording(
          false
        );


        setRecordingSeconds(
          0
        );
      }
    }


    function stopRecordingAndGetFile():
      Promise<File | null> {
      const recorder =
        mediaRecorderRef.current;


      if (
        !recorder ||
        recorder.state ===
          "inactive"
      ) {
        return Promise.resolve(
          null
        );
      }


      return new Promise(
        (resolve) => {
          recordingResolveRef.current =
            resolve;

          recorder.stop();
        }
      );
    }


    function cancelRecording() {
      const recorder =
        mediaRecorderRef.current;


      /*
       * No pending resolver means onstop simply discards
       * the captured audio.
       */
      recordingResolveRef.current =
        null;


      if (
        recorder &&
        recorder.state !==
          "inactive"
      ) {
        recorder.stop();
      } else {
        setIsRecording(
          false
        );

        setRecordingSeconds(
          0
        );
      }
    }


    function toggleRecording() {
      if (
        isRecording
      ) {
        cancelRecording();
      } else {
        void startRecording();
      }
    }


    function formatRecordingTime(
      seconds: number
    ) {
      const minutes =
        Math.floor(
          seconds /
            60
        );


      const remainingSeconds =
        seconds %
        60;


      return `${String(
        minutes
      ).padStart(
        2,
        "0"
      )}:${String(
        remainingSeconds
      ).padStart(
        2,
        "0"
      )}`;
    }


    /* =====================================================
       UI
       ===================================================== */

    const assistantWorking =
      loading ||
      externalProcessing ||
      isTranscribing;


    function formatMessageTime(
      value?: string
    ) {
      if (!value) {
        return "";
      }

      const date =
        new Date(value);

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return "";
      }

      return date.toLocaleTimeString(
        [],
        {
          hour:
            "2-digit",

          minute:
            "2-digit",
        }
      );
    }


    return (
      <div
        className="
          chat-page
          flex
          h-full
          min-h-0
          flex-col
          overflow-hidden
          bg-[#000912]
          text-white
        "
      >
        {/* =================================================
            CHAT TOP BAR
            ================================================= */}

        <header
          className="
            flex
            h-[62px]
            shrink-0
            items-center
            justify-between
            border-b
            border-[#15313D]
            bg-[#020B14]
            px-5
          "
        >
          <div>
            <div className="flex items-center gap-2">
              <h1
                className="
                  text-[13px]
                  font-bold
                  text-[#E7EEF2]
                "
              >
                Conversation
              </h1>

              <span
                className="
                  h-1.5
                  w-1.5
                  rounded-full
                  bg-[#00D970]
                  shadow-[0_0_8px_rgba(0,217,112,0.75)]
                "
              />
            </div>

            <p
              className="
                mt-1
                text-[9px]
                font-medium
                text-[#7B8790]
              "
            >
              Online
            </p>
          </div>

          <div
            className="
              flex
              items-center
              gap-2
              rounded-[10px]
              border
              border-[#15313D]
              bg-[#061018]/80
              px-3
              py-2
            "
          >
            <span
              className="
                flex
                h-7
                w-7
                items-center
                justify-center
                rounded-full
                border
                border-[#0E3B50]
                bg-[#061722]
              "
            >
              <img
                src={logoImage}
                alt=""
                className="
                  h-6
                  w-6
                  rounded-full
                  object-cover
                "
                style={{
                  filter:
                    "grayscale(1) sepia(1) hue-rotate(142deg) saturate(6) brightness(1.08) contrast(1.12)",
                }}
              />
            </span>

            <span
              className="
                hidden
                text-[10px]
                font-bold
                text-[#DDE5E9]
                sm:inline
              "
            >
              AccessMate AI
            </span>
          </div>
        </header>


        {/* =================================================
            CHAT FRAME
            ================================================= */}

        <div
          className="
            min-h-0
            flex-1
            p-3
            lg:p-4
          "
        >
          <div
            className="
              mx-auto
              flex
              h-full
              min-h-0
              w-full
              max-w-[1280px]
              flex-col
              overflow-hidden
              rounded-[13px]
              border
              border-[#15313D]
              bg-[#020B14]/96
            "
          >

            {/* =============================================
                MESSAGES
                ============================================= */}

            <div
              className="
                chat-cyan-scroll
                min-h-0
                flex-1
                overflow-y-auto
                px-5
                py-4
                sm:px-7
                lg:px-8
              "
              style={{
                scrollbarGutter:
                  "stable",
              }}
            >
              <div
                className="
                  mx-auto
                  w-full
                  max-w-[1050px]
                "
              >
                <div
                  className="
                    mb-4
                    flex
                    flex-col
                    items-center
                    border-b
                    border-[#102832]
                    pb-4
                    text-center
                  "
                >
                  <span
                    className="
                      flex
                      h-[58px]
                      w-[58px]
                      items-center
                      justify-center
                      rounded-full
                      border
                      border-[#0E3B50]
                      bg-[#061722]
                      shadow-[0_0_24px_rgba(0,184,219,0.08)]
                    "
                  >
                    <img
                      src={logoImage}
                      alt="AccessMate AI"
                      className="
                        h-[46px]
                        w-[46px]
                        rounded-full
                        object-cover
                      "
                      style={{
                        filter:
                          "grayscale(1) sepia(1) hue-rotate(142deg) saturate(6) brightness(1.10) contrast(1.12)",
                      }}
                    />
                  </span>

                  <h2
                    className="
                      mt-2
                      text-[19px]
                      font-black
                      text-[#E7EEF2]
                    "
                  >
                    AccessMate{" "}
                    <span className="text-[#30AFDC]">
                      AI
                    </span>
                  </h2>

                  <p
                    className="
                      mt-0.5
                      text-[10px]
                      text-[#7C8992]
                    "
                  >
                    Your intelligent accessibility assistant
                  </p>

                  <span
                    className="
                      mt-3
                      rounded-full
                      border
                      border-[#15313D]
                      bg-[#061018]
                      px-3
                      py-1
                      text-[8px]
                      font-semibold
                      text-[#8A969E]
                    "
                  >
                    Today
                  </span>
                </div>


                {historyLoading ? (
                  <div
                    className="
                      flex
                      min-h-[280px]
                      items-center
                      justify-center
                    "
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 animate-bounce rounded-full bg-[#30AFDC]" />

                      <div
                        className="h-2 w-2 animate-bounce rounded-full bg-[#30AFDC]"
                        style={{
                          animationDelay:
                            "150ms",
                        }}
                      />

                      <div
                        className="h-2 w-2 animate-bounce rounded-full bg-[#30AFDC]"
                        style={{
                          animationDelay:
                            "300ms",
                        }}
                      />
                    </div>
                  </div>
                ) : messages.length ===
                  0 ? (
                  <div
                    className="
                      flex
                      min-h-[280px]
                      flex-col
                      items-center
                      justify-center
                      text-center
                    "
                  >
                    <Bot className="h-9 w-9 text-[#30AFDC]/70" />

                    <h3
                      className="
                        mt-3
                        text-[16px]
                        font-bold
                        text-[#DDE5E9]
                      "
                    >
                      How can I help you?
                    </h3>

                    <p
                      className="
                        mt-1
                        text-[10px]
                        text-[#74808A]
                      "
                    >
                      Start a conversation with AccessMate AI
                    </p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {messages.map(
                      (
                        message,
                        index
                      ) => (
                        <motion.div
                          key={message.id}
                          initial={{
                            opacity:
                              0,

                            y:
                              10,
                          }}
                          animate={{
                            opacity:
                              1,

                            y:
                              0,
                          }}
                          transition={{
                            duration:
                              0.25,

                            delay:
                              Math.min(
                                index *
                                  0.03,
                                0.2
                              ),
                          }}
                          className={`flex ${
                            message.role ===
                            "user"
                              ? "justify-end"
                              : "justify-start"
                          }`}
                        >
                          {message.role ===
                            "assistant" ? (
                            <div
                              className="
                                chat-assistant-row
                                flex
                                max-w-[88%]
                                items-start
                                gap-3
                              "
                            >
                              <span
                                className="
                                  mt-1
                                  flex
                                  h-8
                                  w-8
                                  shrink-0
                                  items-center
                                  justify-center
                                  rounded-full
                                  border
                                  border-[#0E3B50]
                                  bg-[#061722]
                                "
                              >
                                <img
                                  src={logoImage}
                                  alt=""
                                  className="
                                    h-6
                                    w-6
                                    rounded-full
                                    object-cover
                                  "
                                  style={{
                                    filter:
                                      "grayscale(1) sepia(1) hue-rotate(142deg) saturate(6) brightness(1.08) contrast(1.12)",
                                  }}
                                />
                              </span>

                              <div className="min-w-0">
                                <div
                                  className="
                                    mb-1
                                    flex
                                    items-center
                                    gap-2
                                  "
                                >
                                  <span
                                    className="
                                      text-[11px]
                                      font-black
                                      text-[#30AFDC]
                                    "
                                  >
                                    AccessMate AI
                                  </span>

                                  {message.timestamp && (
                                    <span
                                      className="
                                        text-[10px]
                                        text-[#71808A]
                                      "
                                    >
                                      {formatMessageTime(
                                        message.timestamp
                                      )}
                                    </span>
                                  )}
                                </div>

                                <div
                                  className="
                                    chat-assistant-bubble
                                    rounded-[16px]
                                    border
                                    border-[#1A3442]
                                    bg-[#0D1821]
                                    px-5
                                    py-4
                                    text-[#E5EEF3]
                                    shadow-[0_10px_30px_rgba(0,0,0,0.18)]
                                  "
                                >
                                  {message.fileName && (
                                    <div
                                      className="
                                        mb-3
                                        flex
                                        items-center
                                        gap-2
                                        text-[10px]
                                        text-[#91A6B1]
                                      "
                                    >
                                      <FileIcon className="h-3.5 w-3.5" />

                                      <span
                                        className="
                                          max-w-[420px]
                                          truncate
                                        "
                                      >
                                        {message.fileName}
                                      </span>
                                    </div>
                                  )}

                                  <div
                                    dir="auto"
                                    data-no-translate="true"
                                    className="chat-assistant-markdown"
                                  >
                                    <ReactMarkdown
                                      remarkPlugins={[remarkGfm]}
                                    >
                                      {message.content}
                                    </ReactMarkdown>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div
                              className="
                                chat-user-row
                                max-w-[72%]
                              "
                            >
                              <div
                                className="
                                  chat-user-bubble
                                  rounded-[16px]
                                  border
                                  border-[#0D5E8E]
                                  bg-[#082D4B]
                                  px-4
                                  py-3.5
                                  text-white
                                  shadow-[0_8px_24px_rgba(0,82,130,0.12)]
                                "
                              >
                                {message.fileName && (
                                  <div
                                    className="
                                      mb-2
                                      flex
                                      items-center
                                      gap-2
                                      text-[8px]
                                      text-cyan-100/75
                                    "
                                  >
                                    <FileIcon className="h-3.5 w-3.5" />

                                    <span
                                      className="
                                        max-w-[360px]
                                        truncate
                                      "
                                    >
                                      {message.fileName}
                                    </span>
                                  </div>
                                )}

                                <p
                                  dir="auto"
                                  data-no-translate="true"
                                  className="
                                    chat-user-text
                                    whitespace-pre-wrap
                                  "
                                >
                                  {message.content}
                                </p>

                                {message.timestamp && (
                                  <p
                                    className="
                                      mt-1
                                      text-right
                                      text-[10px]
                                      text-[#8CB9D5]
                                    "
                                  >
                                    {formatMessageTime(
                                      message.timestamp
                                    )}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )
                    )}


                    {assistantWorking && (
                      <div className="flex justify-start">
                        <div
                          className="
                            flex
                            max-w-[78%]
                            items-start
                            gap-3
                          "
                        >
                          <span
                            className="
                              mt-1
                              flex
                              h-8
                              w-8
                              items-center
                              justify-center
                              rounded-full
                              border
                              border-[#0E3B50]
                              bg-[#061722]
                            "
                          >
                            <img
                              src={logoImage}
                              alt=""
                              className="
                                h-6
                                w-6
                                rounded-full
                                object-cover
                              "
                              style={{
                                filter:
                                  "grayscale(1) sepia(1) hue-rotate(142deg) saturate(6) brightness(1.08) contrast(1.12)",
                              }}
                            />
                          </span>

                          <div>
                            <div
                              className="
                                mb-1
                                text-[9px]
                                font-black
                                text-[#30AFDC]
                              "
                            >
                              AccessMate AI
                            </div>

                            <div
                              className="
                                rounded-[11px]
                                border
                                border-[#1B2C37]
                                bg-[#101820]
                                px-4
                                py-3
                              "
                            >
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-2 animate-bounce rounded-full bg-[#30AFDC]" />

                                <div
                                  className="h-2 w-2 animate-bounce rounded-full bg-[#30AFDC]"
                                  style={{
                                    animationDelay:
                                      "150ms",
                                  }}
                                />

                                <div
                                  className="h-2 w-2 animate-bounce rounded-full bg-[#30AFDC]"
                                  style={{
                                    animationDelay:
                                      "300ms",
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}


                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>
            </div>


            {/* =============================================
                COMPOSER
                ============================================= */}

            <div
              className="
                shrink-0
                border-t
                border-[#102832]
                bg-[#020B14]
                px-5
                pb-4
                pt-3
                sm:px-7
                lg:px-8
              "
            >
              <div
                className="
                  mx-auto
                  w-full
                  max-w-[1050px]
                "
              >
                {isRecording && (
                  <div
                    className="
                      mb-2
                      flex
                      items-center
                      justify-center
                    "
                  >
                    <div
                      className="
                        flex
                        items-center
                        gap-2
                        rounded-full
                        border
                        border-red-500/30
                        bg-red-500/10
                        px-4
                        py-2
                        text-[9px]
                        font-medium
                        text-red-300
                      "
                    >
                      <span
                        className="
                          h-2
                          w-2
                          animate-pulse
                          rounded-full
                          bg-red-500
                        "
                      />

                      Recording

                      <span className="font-mono">
                        {formatRecordingTime(
                          recordingSeconds
                        )}
                      </span>

                      <span className="text-red-200/60">
                        • Press Send to transcribe & send
                      </span>
                    </div>
                  </div>
                )}


                {selectedFile && (
                  <div className="mb-2 flex">
                    <div
                      className="
                        flex
                        max-w-full
                        items-center
                        gap-2
                        rounded-[9px]
                        border
                        border-[#0E3B50]
                        bg-[#061722]
                        px-3
                        py-2
                        text-[9px]
                        text-[#A9D8E6]
                      "
                    >
                      <FileIcon className="h-4 w-4 shrink-0 text-[#30AFDC]" />

                      <span className="max-w-[480px] truncate">
                        {selectedFile.name}
                      </span>

                      <button
                        type="button"
                        onClick={removeSelectedFile}
                        disabled={
                          loading ||
                          externalProcessing
                        }
                        className="
                          ml-1
                          rounded-md
                          p-1
                          text-[#8DA0AA]
                          transition
                          hover:bg-white/10
                          hover:text-white
                        "
                        title="Remove file"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}


                <div
                  className={`
                    chat-composer
                    flex
                    items-center
                    gap-2
                    rounded-[16px]
                    border
                    px-3
                    py-2.5
                    transition
                    ${
                      isRecording
                        ? "border-red-500/40 bg-[#120617]/90"
                        : "border-[#16445B] bg-[#061018]"
                    }
                  `}
                >
                  <button
                    type="button"
                    onClick={() =>
                      fileInputRef.current?.click()
                    }
                    disabled={
                      loading ||
                      externalProcessing ||
                      isRecording
                    }
                    className="
                      flex
                      h-9
                      w-9
                      cursor-pointer
                      items-center
                      justify-center
                      rounded-[9px]
                      border
                      border-[#15313D]
                      bg-[#071722]
                      text-[#30AFDC]
                      transition
                      hover:border-[#00B8DB]/45
                      hover:bg-[#08202C]
                      disabled:cursor-not-allowed
                      disabled:opacity-40
                    "
                    title="Attach file"
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>


                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFilePick}
                    className="hidden"
                    accept="image/*,audio/*,.pdf,.docx,.txt,.csv,.mp3,.wav,.m4a,.webm,.ogg,.aac"
                  />


                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(event) =>
                      setInput(
                        event.target.value
                      )
                    }
                    onKeyDown={handleKeyPress}
                    placeholder={
                      isTranscribing
                        ? "Transcribing voice message..."
                        : externalProcessing
                        ? "AccessMate is processing your request..."
                        : isRecording
                        ? "Recording voice... Press Send when finished."
                        : selectedFile
                        ? "What do you want AccessMate to do with this file?"
                        : activeContextKind ===
                          "document"
                        ? "Ask anything about this document..."
                        : "Message AccessMate AI..."
                    }
                    disabled={
                      loading ||
                      externalProcessing ||
                      isRecording ||
                      isTranscribing ||
                      historyLoading
                    }
                    className="
                      chat-composer-textarea
                      min-w-0
                      flex-1
                      resize-none
                      border-0
                      bg-transparent
                      px-2
                      py-2.5
                      text-[15px]
                      leading-6
                      text-[#EDF6FA]
                      outline-none
                      placeholder:text-[#647985]
                      disabled:opacity-60
                    "
                    rows={1}
                    style={{
                      minHeight:
                        "46px",

                      maxHeight:
                        "140px",
                    }}
                  />


                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={toggleRecording}
                      disabled={
                        loading ||
                        externalProcessing ||
                        isTranscribing ||
                        historyLoading
                      }
                      title={
                        isRecording
                          ? "Cancel recording"
                          : "Start recording"
                      }
                      className={`relative flex h-9 w-9 items-center justify-center rounded-[9px] transition disabled:cursor-not-allowed disabled:opacity-40 ${
                        isRecording
                          ? "bg-red-500/20 text-red-400 ring-1 ring-red-500/40"
                          : "border border-[#15313D] bg-[#071722] text-[#93A0A8] hover:border-[#00B8DB]/45 hover:text-[#30AFDC]"
                      }`}
                    >
                      {isRecording && (
                        <span
                          className="
                            absolute
                            -right-1
                            -top-1
                            h-2.5
                            w-2.5
                            animate-ping
                            rounded-full
                            bg-red-500
                          "
                        />
                      )}

                      {isRecording ? (
                        <X className="h-4 w-4" />
                      ) : (
                        <Mic className="h-4 w-4" />
                      )}
                    </button>


                    <button
                      type="button"
                      onClick={() =>
                        void handleSend()
                      }
                      disabled={
                        loading ||
                        externalProcessing ||
                        historyLoading ||
                        isTranscribing ||
                        (
                          !isRecording &&
                          !input.trim() &&
                          !selectedFile
                        )
                      }
                      className="
                        flex
                        h-10
                        w-10
                        items-center
                        justify-center
                        rounded-[10px]
                        border
                        border-[#1689D4]
                        bg-[#087DF0]
                        text-white
                        shadow-[0_0_20px_rgba(8,125,240,0.18)]
                        transition
                        hover:bg-[#1590FF]
                        disabled:cursor-not-allowed
                        disabled:opacity-45
                      "
                      title={
                        isRecording
                          ? "Send voice message"
                          : "Send"
                      }
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </div>


                <div
                  className="
                    mt-2
                    flex
                    items-center
                    justify-center
                    gap-1.5
                    text-[8px]
                    text-[#65717A]
                  "
                >
                  <span
                    className="
                      inline-block
                      h-2.5
                      w-2.5
                      rounded-full
                      border
                      border-[#65717A]
                    "
                  />
                  Messages are secure and encrypted
                </div>
              </div>
            </div>
          </div>
        </div>


        <style>
          {`
          .chat-cyan-scroll {
            scrollbar-width: thin;
            scrollbar-color: rgba(0, 184, 219, 0.22) transparent;
          }

          .chat-cyan-scroll::-webkit-scrollbar {
            width: 6px;
          }

          .chat-cyan-scroll::-webkit-scrollbar-track {
            background: transparent;
          }

          .chat-cyan-scroll::-webkit-scrollbar-thumb {
            background: rgba(0, 184, 219, 0.18);
            border-radius: 999px;
          }

          .chat-cyan-scroll::-webkit-scrollbar-thumb:hover {
            background: rgba(48, 175, 220, 0.34);
          }

          /* =================================================
             MESSAGE READABILITY
             ================================================= */

          .chat-assistant-bubble {
            width: 100%;
          }

          .chat-assistant-markdown {
            color: #e5eef3;
            font-size: 15.5px;
            font-weight: 450;
            line-height: 1.78;
            letter-spacing: -0.005em;
            overflow-wrap: anywhere;
          }

          .chat-assistant-markdown > :first-child {
            margin-top: 0 !important;
          }

          .chat-assistant-markdown > :last-child {
            margin-bottom: 0 !important;
          }

          .chat-assistant-markdown p {
            margin: 0 0 14px;
          }

          .chat-assistant-markdown strong {
            color: #f8fcff;
            font-weight: 800;
          }

          .chat-assistant-markdown em {
            color: #d7e8f1;
          }

          .chat-assistant-markdown h1,
          .chat-assistant-markdown h2,
          .chat-assistant-markdown h3,
          .chat-assistant-markdown h4 {
            color: #f8fcff;
            font-weight: 800;
            line-height: 1.35;
            margin: 20px 0 10px;
          }

          .chat-assistant-markdown h1 {
            font-size: 23px;
          }

          .chat-assistant-markdown h2 {
            font-size: 20px;
          }

          .chat-assistant-markdown h3 {
            font-size: 18px;
          }

          .chat-assistant-markdown h4 {
            font-size: 16px;
          }

          .chat-assistant-markdown ul,
          .chat-assistant-markdown ol {
            margin: 10px 0 16px;
            padding-inline-start: 26px;
          }

          .chat-assistant-markdown ul {
            list-style: disc;
          }

          .chat-assistant-markdown ol {
            list-style: decimal;
          }

          .chat-assistant-markdown li {
            margin: 8px 0;
            padding-inline-start: 3px;
          }

          .chat-assistant-markdown li::marker {
            color: #38bdf8;
            font-weight: 800;
          }

          .chat-assistant-markdown a {
            color: #38bdf8;
            font-weight: 650;
            text-decoration: underline;
            text-underline-offset: 3px;
          }

          .chat-assistant-markdown blockquote {
            margin: 14px 0;
            border-inline-start: 3px solid #38bdf8;
            border-radius: 0 10px 10px 0;
            background: rgba(56, 189, 248, 0.045);
            padding: 10px 14px;
            color: #cadbe4;
          }

          .chat-assistant-markdown code {
            border: 1px solid rgba(56, 189, 248, 0.14);
            border-radius: 7px;
            background: rgba(56, 189, 248, 0.07);
            padding: 2px 6px;
            color: #7dd3fc;
            font-family: "Cascadia Code", "Fira Code", Consolas, monospace;
            font-size: 0.92em;
          }

          .chat-assistant-markdown pre {
            margin: 14px 0;
            overflow-x: auto;
            border: 1px solid rgba(56, 189, 248, 0.13);
            border-radius: 12px;
            background: #07131c;
            padding: 14px;
          }

          .chat-assistant-markdown pre code {
            border: 0;
            background: transparent;
            padding: 0;
            color: #d8edf7;
            font-size: 13.5px;
            line-height: 1.65;
          }

          .chat-assistant-markdown hr {
            margin: 18px 0;
            border: 0;
            border-top: 1px solid rgba(56, 189, 248, 0.13);
          }

          .chat-assistant-markdown table {
            width: 100%;
            margin: 14px 0;
            border-collapse: collapse;
            overflow: hidden;
            border-radius: 10px;
            font-size: 14px;
          }

          .chat-assistant-markdown th,
          .chat-assistant-markdown td {
            border: 1px solid rgba(56, 189, 248, 0.14);
            padding: 9px 11px;
            text-align: start;
          }

          .chat-assistant-markdown th {
            background: rgba(56, 189, 248, 0.07);
            color: #f5fbff;
            font-weight: 750;
          }

          .chat-user-text {
            color: #f7fbfe;
            font-size: 14.5px;
            font-weight: 550;
            line-height: 1.62;
            overflow-wrap: anywhere;
          }

          /* =================================================
             COMPOSER / FOCUS FIX
             ================================================= */

          .chat-composer {
            min-height: 66px;
            background: #061018;
            box-shadow: 0 10px 32px rgba(0, 0, 0, 0.18);
            transition:
              border-color 160ms ease,
              box-shadow 160ms ease,
              background-color 160ms ease;
          }

          .chat-composer:focus-within {
            border-color: rgba(48, 175, 220, 0.62) !important;
            box-shadow:
              0 10px 32px rgba(0, 0, 0, 0.18),
              0 0 0 1px rgba(48, 175, 220, 0.08);
          }

          .chat-page .chat-composer-textarea,
          .chat-page .chat-composer-textarea:hover,
          .chat-page .chat-composer-textarea:active,
          .chat-page .chat-composer-textarea:focus,
          .chat-page .chat-composer-textarea:focus-visible,
          body.accessmate-high-contrast .chat-page .chat-composer-textarea:focus,
          body.accessmate-high-contrast .chat-page .chat-composer-textarea:focus-visible {
            border: 0 !important;
            border-color: transparent !important;
            outline: none !important;
            outline-width: 0 !important;
            outline-color: transparent !important;
            box-shadow: none !important;
            background: transparent !important;
            appearance: none !important;
            -webkit-appearance: none !important;
          }

          .chat-composer-textarea {
            caret-color: #38bdf8;
            font-family: inherit;
          }

          .chat-composer-textarea::placeholder {
            color: rgba(116, 142, 156, 0.78) !important;
            opacity: 1;
            font-size: 15px;
            font-weight: 450;
          }

          @media (max-width: 768px) {
            .chat-assistant-row {
              max-width: 94% !important;
            }

            .chat-user-row {
              max-width: 86% !important;
            }

            .chat-assistant-bubble {
              padding: 15px 16px !important;
            }

            .chat-assistant-markdown {
              font-size: 15px;
              line-height: 1.72;
            }

            .chat-user-text {
              font-size: 14px;
            }

            .chat-composer-textarea {
              font-size: 15px !important;
            }
          }
          `}
        </style>
      </div>
    );
  };


export default ChatPage;
