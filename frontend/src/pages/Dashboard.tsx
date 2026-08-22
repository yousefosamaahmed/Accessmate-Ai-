
import {
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import { motion } from "framer-motion";

import {
  AlertTriangle,
  AudioLines,
  Bell,
  Brain,
  CheckCircle2,
  ChevronRight,
  Clock3,
  File as FileIcon,
  FileText,
  Image as ImageIcon,
  Mic,
  Paperclip,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  User,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import {
  api,
  getApiError,
  unwrapResponse,
} from "../lib/api";

import { getUser } from "../lib/storage";

import backgroundImage from "../assets/wellpaper.jpg";
import heroVisual from "../assets/VISION ARTIFICIAL.jpg";


/* =========================================================
   TYPES
   ========================================================= */

type BackendConversation = {
  id: string;
  user_id: string;
  title?: string | null;
  conversation_type: string;
  document_id?: string | null;
  website_check_id?: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
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
  detected_language?: string;

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

  retrieved_chunks: number;

  source_chunks_used: number;

  sources: DocumentAskSource[];

  provider: string;

  model: string;
};


type UserData = {
  full_name?: string;
  email?: string;
};


type CareAlertNotification = {
  id: string;
  message: string;
  status: string;
  riskLevel: string;
  channel: string;
  source: string;
  createdAt: string;
  sentAt?: string | null;
};


type ImageTaskMode =
  | "ocr"
  | "describe"
  | "assist";


type ImageProcessingResult =
  | {
      ok: true;
      answer: string;
    }
  | {
      ok: false;
      error: unknown;
    };


/* =========================================================
   QUICK ACTIONS
   ========================================================= */

const quickActions = [
  {
    title: "Ask AI",
    desc: "Get answers to anything",
    icon: Brain,
    action: "prompt",
    prompt: "Ask AI",
  },
  {
    title: "Analyze File",
    desc: "Upload a file and get insights",
    icon: FileText,
    action: "file",
    prompt: "Analyze this file",
  },
  {
    title: "Vision & OCR",
    desc: "Extract text and understand images",
    icon: ImageIcon,
    action: "image",
    prompt: "Describe this image",
  },
  {
    title: "Voice Assistant",
    desc: "Speak and get instant help",
    icon: AudioLines,
    action: "voice",
    prompt: "",
  },
  {
    title: "Explain Simply",
    desc: "Make complex topics easy",
    icon: Sparkles,
    action: "prompt",
    prompt: "Explain this simply",
  },
  {
    title: "Website Safety",
    desc: "Check if a website is safe",
    icon: ShieldCheck,
    action: "website",
    prompt: "",
  },
] as const;


/* =========================================================
   HELPERS
   ========================================================= */

function detectLanguage(
  value: string
): "ar" | "en" {
  return /[\u0600-\u06FF]/.test(
    value
  )
    ? "ar"
    : "en";
}


function cleanTitle(
  value: string
) {
  const result =
    String(
      value ||
        "New chat"
    )
      .replace(
        /\n/g,
        " "
      )
      .trim();


  return (
    result ||
    "New chat"
  );
}


function makeTitle(
  text: string,
  fileName?: string
) {
  const base =
    cleanTitle(
      text ||
        fileName ||
        "New chat"
    );


  return base.length > 38
    ? `${base.slice(
        0,
        38
      )}...`
    : base;
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


  window.dispatchEvent(
    new Event(
      "chat-updated"
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
  const name =
    file.name
      .toLowerCase();


  return /\.(pdf|docx|txt|csv)$/i.test(
    name
  );
}


/* =========================================================
   IMAGE TASK ROUTING
   ========================================================= */

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


  if (!normalized) {
    return "describe";
  }


  const ocrPatterns = [
    /\bocr\b/,
    /\bextract (the )?text\b/,
    /\bread (the )?text\b/,
    /\bwhat is written\b/,
    /\bwhat does (the|this) (image|photo|picture) say\b/,
    /\btranscribe (the )?(image|text)\b/,
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


  const describePatterns = [
    /\bdescribe\b/,
    /\bdescribe (the|this) (image|photo|picture)\b/,
    /\bwhat is in (the|this) (image|photo|picture)\b/,
    /\bwhat do you see\b/,
    /اوصف الصورة/,
    /اوصف الصوره/,
    /وصف الصورة/,
    /وصف الصوره/,
    /اشرح الصورة/,
    /اشرح الصوره/,
    /ايه في الصورة/,
    /ايه في الصوره/,
  ];


  const explanationPatterns = [
    /\bexplain\b/,
    /\banaly[sz]e\b/,
    /\bunderstand\b/,
    /اشرح/,
    /حلل/,
    /فسر/,
  ];


  const wantsOCR =
    ocrPatterns.some(
      (
        pattern
      ) =>
        pattern.test(
          normalized
        )
    );


  const wantsDescription =
    describePatterns.some(
      (
        pattern
      ) =>
        pattern.test(
          normalized
        )
    );


  const wantsExplanation =
    explanationPatterns.some(
      (
        pattern
      ) =>
        pattern.test(
          normalized
        )
    );


  /*
   * Combined requests need the vision model because
   * the user wants more than raw OCR text.
   */
  if (
    (
      wantsOCR &&
      wantsDescription
    ) ||
    (
      wantsOCR &&
      wantsExplanation
    )
  ) {
    return "assist";
  }


  if (
    wantsOCR
  ) {
    return "ocr";
  }


  if (
    wantsDescription
  ) {
    return "describe";
  }


  return "assist";
}


/* =========================================================
   IMAGE OPTIMIZATION
   ========================================================= */

async function optimizeImageForAI(
  file: File,
  mode: ImageTaskMode
): Promise<File> {
  if (
    !file.type
      .toLowerCase()
      .startsWith(
        "image/"
      )
  ) {
    return file;
  }


  if (
    typeof createImageBitmap !==
    "function"
  ) {
    return file;
  }


  try {
    const bitmap =
      await createImageBitmap(
        file
      );


    /*
     * OCR keeps more pixels for small text.
     * General visual description uses a lighter image
     * to reduce upload time and multimodal token cost.
     */
    const maxDimension =
      mode === "ocr"
        ? 2200
        : mode === "describe"
        ? 1280
        : 1600;


    const targetSizeLimit =
      mode === "ocr"
        ? 2_500_000
        : mode === "describe"
        ? 1_200_000
        : 1_600_000;


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


    if (
      scale === 1 &&
      file.size <=
        targetSizeLimit
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


    if (!context) {
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
        : mode === "describe"
        ? 0.80
        : 0.84;


    const blob =
      await new Promise<
        Blob | null
      >(
        (
          resolve
        ) =>
          canvas.toBlob(
            resolve,
            outputType,
            quality
          )
      );


    /*
     * Never replace the image with a larger encoded copy.
     */
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

  } catch (
    optimizationError
  ) {
    console.warn(
      "Image optimization skipped:",
      optimizationError
    );


    return file;
  }
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


  /*
   * The dashboard quick action currently inserts:
   *
   * "Analyze this file"
   *
   * Sending that phrase directly to mode:auto would
   * normally be classified as targeted RAG.
   *
   * For a generic Analyze File action we want a useful
   * complete document analysis / summary.
   */
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


function extractList(
  payload: any
): any[] {
  if (
    Array.isArray(
      payload
    )
  ) {
    return payload;
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
      payload?.alerts
    )
  ) {
    return payload.alerts;
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


function normalizeCareAlert(
  item: any
): CareAlertNotification {
  return {
    id:
      String(
        item?.id ||
        item?.alert_id ||
        `${item?.created_at || Date.now()}`
      ),

    message:
      String(
        item?.message ||
        item?.need ||
        item?.action_code ||
        item?.alert_type ||
        "Care alert updated"
      ),

    status:
      String(
        item?.status ||
        "pending"
      ).toLowerCase(),

    riskLevel:
      String(
        item?.risk_level ||
        item?.priority ||
        "low"
      ).toLowerCase(),

    channel:
      String(
        item?.channel ||
        item?.preferred_channel ||
        "telegram"
      ),

    source:
      String(
        item?.source ||
        "care alert"
      ),

    createdAt:
      String(
        item?.created_at ||
        item?.sent_at ||
        ""
      ),

    sentAt:
      item?.sent_at ??
      null,
  };
}


function formatRelativeTime(
  value?: string | null
) {
  if (
    !value
  ) {
    return "Just now";
  }


  const timestamp =
    new Date(
      value
    ).getTime();


  if (
    !Number.isFinite(
      timestamp
    )
  ) {
    return "Recently";
  }


  const difference =
    Date.now() -
    timestamp;


  const minute =
    60 * 1000;

  const hour =
    60 * minute;

  const day =
    24 * hour;


  if (
    difference <
    minute
  ) {
    return "Just now";
  }


  if (
    difference <
    hour
  ) {
    return `${Math.max(
      1,
      Math.floor(
        difference /
        minute
      )
    )}m ago`;
  }


  if (
    difference <
    day
  ) {
    return `${Math.max(
      1,
      Math.floor(
        difference /
        hour
      )
    )}h ago`;
  }


  return `${Math.max(
    1,
    Math.floor(
      difference /
      day
    )
  )}d ago`;
}


function getGreeting(
  language:
    "en" | "ar"
) {
  const hour =
    new Date()
      .getHours();


  if (
    hour < 12
  ) {
    return language ===
      "ar"
      ? "صباح الخير"
      : "Good morning";
  }


  if (
    hour < 18
  ) {
    return language ===
      "ar"
      ? "مساء الخير"
      : "Good afternoon";
  }


  return language ===
    "ar"
    ? "مساء الخير"
    : "Good evening";
}


function getFirstName(
  value: string
) {
  const cleaned =
    String(
      value ||
      "User"
    )
      .trim();


  if (
    cleaned.includes(
      "@"
    )
  ) {
    return (
      cleaned
        .split(
          "@"
        )[0] ||
      "User"
    );
  }


  return (
    cleaned
      .split(
        /\s+/
      )[0] ||
    "User"
  );
}


/* =========================================================
   COMPONENT
   ========================================================= */

export default function Dashboard() {
  const navigate =
    useNavigate();


  const [
    input,
    setInput,
  ] = useState("");


  const [
    selectedFile,
    setSelectedFile,
  ] = useState<
    File | null
  >(null);


  const [
    loading,
    setLoading,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState("");


  const [
    isRecording,
    setIsRecording,
  ] = useState(false);


  const [
    recordingSeconds,
    setRecordingSeconds,
  ] = useState(0);


  const [
    currentUser,
    setCurrentUser,
  ] =
    useState<
      UserData | null
    >(
      getUser<UserData>()
    );


  const [
    accessibilityOn,
    setAccessibilityOn,
  ] = useState(
    localStorage.getItem(
      "accessmate_screen_reader"
    ) === "true"
  );


  const [
    avatarUrl,
    setAvatarUrl,
  ] = useState(
    localStorage.getItem(
      "accessmate_avatar"
    ) || ""
  );


  const [
    dashboardLanguage,
    setDashboardLanguage,
  ] = useState<
    "en" | "ar"
  >(
    localStorage.getItem(
      "accessmate_language"
    ) === "ar"
      ? "ar"
      : "en"
  );


  const [
    notifications,
    setNotifications,
  ] =
    useState<
      CareAlertNotification[]
    >([]);


  const [
    notificationsOpen,
    setNotificationsOpen,
  ] = useState(false);


  const [
    notificationsLoading,
    setNotificationsLoading,
  ] = useState(false);


  const [
    notificationsError,
    setNotificationsError,
  ] = useState("");


  const [
    notificationsLastSeenAt,
    setNotificationsLastSeenAt,
  ] = useState(
    localStorage.getItem(
      "accessmate_notifications_last_seen_at"
    ) || ""
  );


  const [
    searchQuery,
    setSearchQuery,
  ] = useState("");


  const [
    searchOpen,
    setSearchOpen,
  ] = useState(false);


  const [
    searchLoading,
    setSearchLoading,
  ] = useState(false);


  const [
    searchableConversations,
    setSearchableConversations,
  ] =
    useState<
      BackendConversation[]
    >([]);


  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null
    );


  const textareaRef =
    useRef<HTMLTextAreaElement | null>(
      null
    );


  const notificationMenuRef =
    useRef<HTMLDivElement | null>(
      null
    );


  const searchMenuRef =
    useRef<HTMLDivElement | null>(
      null
    );


  const mediaRecorderRef =
    useRef<MediaRecorder | null>(
      null
    );


  const audioChunksRef =
    useRef<Blob[]>([]);


  const recordingTimerRef =
    useRef<
      ReturnType<
        typeof setInterval
      > | null
    >(null);


  /*
   * Prevent:
   * - double click
   * - double enter
   * - duplicate upload
   * - duplicate chat
   */
  const sendingRef =
    useRef(false);


  useEffect(() => {
    function syncDashboardLanguage(
      explicitLanguage?:
        unknown
    ) {
      const nextLanguage =
        explicitLanguage ===
          "ar" ||
        explicitLanguage ===
          "en"
          ? explicitLanguage
          : localStorage.getItem(
              "accessmate_language"
            ) === "ar"
          ? "ar"
          : "en";


      setDashboardLanguage(
        nextLanguage
      );
    }


    function handleLanguageEvent(
      event:
        Event
    ) {
      const customEvent =
        event as
          CustomEvent<any>;


      const eventLanguage =
        customEvent.detail
          ?.language ||
        customEvent.detail
          ?.preferredLanguage ||
        customEvent.detail;


      syncDashboardLanguage(
        eventLanguage
      );
    }


    function handleStorage(
      event:
        StorageEvent
    ) {
      if (
        event.key ===
        "accessmate_language"
      ) {
        syncDashboardLanguage(
          event.newValue
        );
      }
    }


    window.addEventListener(
      "accessmate-public-language-change",
      handleLanguageEvent
    );


    window.addEventListener(
      "accessmate-language-change",
      handleLanguageEvent
    );


    window.addEventListener(
      "accessmate-settings-updated",
      handleLanguageEvent
    );


    window.addEventListener(
      "storage",
      handleStorage
    );


    return () => {
      window.removeEventListener(
        "accessmate-public-language-change",
        handleLanguageEvent
      );


      window.removeEventListener(
        "accessmate-language-change",
        handleLanguageEvent
      );


      window.removeEventListener(
        "accessmate-settings-updated",
        handleLanguageEvent
      );


      window.removeEventListener(
        "storage",
        handleStorage
      );
    };
  }, []);


  const displayName =
    currentUser?.full_name ||
    currentUser?.email ||
    "User";


  const firstName =
    getFirstName(
      displayName
    );


  const isArabicDashboard =
    dashboardLanguage ===
    "ar";


  const greeting =
    getGreeting(
      dashboardLanguage
    );


  const heroQuestion =
    isArabicDashboard
      ? "كيف يمكنني مساعدتك؟"
      : "How can I help you today?";


  const lastSeenTimestamp =
    notificationsLastSeenAt
      ? new Date(
          notificationsLastSeenAt
        ).getTime()
      : 0;


  const unreadNotifications =
    notifications.filter(
      (
        item
      ) => {
        const created =
          item.createdAt
            ? new Date(
                item.createdAt
              ).getTime()
            : 0;


        return (
          created >
          lastSeenTimestamp
        );
      }
    ).length;


  const normalizedSearchQuery =
    searchQuery
      .trim()
      .toLowerCase();


  const searchActionResults =
    normalizedSearchQuery
      ? quickActions
          .filter(
            (
              item
            ) =>
              item.title
                .toLowerCase()
                .includes(
                  normalizedSearchQuery
                ) ||
              item.desc
                .toLowerCase()
                .includes(
                  normalizedSearchQuery
                )
          )
          .slice(
            0,
            4
          )
      : [];


  const searchConversationResults =
    normalizedSearchQuery
      ? searchableConversations
          .filter(
            (
              conversation
            ) =>
              !conversation.is_archived &&
              String(
                conversation.title ||
                "New chat"
              )
                .toLowerCase()
                .includes(
                  normalizedSearchQuery
                )
          )
          .slice(
            0,
            5
          )
      : [];


  /* =======================================================
     TOP BAR SEARCH

     Searches:
     - dashboard actions
     - the authenticated user's conversation titles
     ======================================================= */

  async function loadSearchableConversations() {
    setSearchLoading(
      true
    );


    try {
      const response =
        await api.get(
          "/conversations/me"
        );


      const payload =
        unwrapResponse<any>(
          response
        );


      const rows =
        extractList(
          payload
        );


      setSearchableConversations(
        rows.filter(
          (
            item
          ) =>
            Boolean(
              item?.id
            )
        )
      );
    } catch (
      searchError
    ) {
      console.error(
        "Failed to load searchable conversations:",
        searchError
      );
    } finally {
      setSearchLoading(
        false
      );
    }
  }


  useEffect(() => {
    void loadSearchableConversations();


    function handleSearchOutsideClick(
      event: MouseEvent
    ) {
      const target =
        event.target as Node;


      if (
        searchMenuRef.current &&
        !searchMenuRef.current.contains(
          target
        )
      ) {
        setSearchOpen(
          false
        );
      }
    }


    document.addEventListener(
      "mousedown",
      handleSearchOutsideClick
    );


    return () => {
      document.removeEventListener(
        "mousedown",
        handleSearchOutsideClick
      );
    };
  }, []);


  function openConversationFromSearch(
    conversationId: string
  ) {
    setSearchQuery("");
    setSearchOpen(false);


    navigate(
      `/chat/${conversationId}`
    );
  }


  /* =======================================================
     CARE ALERT NOTIFICATIONS

     The current backend exposes Care Alerts, not a separate
     general notification table. The bell is therefore wired
     to the real care-alert history endpoint and shows
     sent / pending / failed caregiver alert activity.
     ======================================================= */

  async function loadCareAlertNotifications(
    showLoader = false
  ) {
    if (
      showLoader
    ) {
      setNotificationsLoading(
        true
      );
    }


    try {
      const response =
        await api.get(
          "/care-alerts?limit=12"
        );


      const payload =
        unwrapResponse<any>(
          response
        );


      const rows =
        extractList(
          payload
        );


      const normalized =
        rows
          .map(
            normalizeCareAlert
          )
          .sort(
            (
              first,
              second
            ) =>
              new Date(
                second.createdAt ||
                0
              ).getTime() -
              new Date(
                first.createdAt ||
                0
              ).getTime()
          );


      setNotifications(
        normalized
      );


      setNotificationsError(
        ""
      );
    } catch (
      notificationError
    ) {
      console.error(
        "Failed to load care-alert notifications:",
        notificationError
      );


      setNotificationsError(
        getApiError(
          notificationError
        )
      );
    } finally {
      if (
        showLoader
      ) {
        setNotificationsLoading(
          false
        );
      }
    }
  }


  function markNotificationsSeen() {
    const now =
      new Date()
        .toISOString();


    localStorage.setItem(
      "accessmate_notifications_last_seen_at",
      now
    );


    setNotificationsLastSeenAt(
      now
    );
  }


  async function toggleNotifications() {
    const nextOpen =
      !notificationsOpen;


    setNotificationsOpen(
      nextOpen
    );


    if (
      nextOpen
    ) {
      await loadCareAlertNotifications(
        true
      );


      markNotificationsSeen();
    }
  }


  useEffect(() => {
    void loadCareAlertNotifications(
      true
    );


    const interval =
      window.setInterval(
        () => {
          void loadCareAlertNotifications();
        },
        30000
      );


    const handleFocus =
      () => {
        void loadCareAlertNotifications();
      };


    window.addEventListener(
      "focus",
      handleFocus
    );


    return () => {
      window.clearInterval(
        interval
      );


      window.removeEventListener(
        "focus",
        handleFocus
      );
    };
  }, []);


  useEffect(() => {
    function handleOutsideClick(
      event: MouseEvent
    ) {
      if (
        !notificationsOpen
      ) {
        return;
      }


      const target =
        event.target as Node;


      if (
        notificationMenuRef.current &&
        !notificationMenuRef.current.contains(
          target
        )
      ) {
        setNotificationsOpen(
          false
        );
      }
    }


    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );


    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, [
    notificationsOpen,
  ]);


  /* =======================================================
     USER
     ======================================================= */

  useEffect(() => {
    let cancelled =
      false;


    async function loadCurrentUser() {
      try {
        const response =
          await api.get(
            "/auth/me"
          );


        const payload =
          unwrapResponse<UserData>(
            response
          );


        if (
          cancelled
        ) {
          return;
        }


        setCurrentUser(
          payload
        );


        localStorage.setItem(
          "accessmate_user",
          JSON.stringify(
            payload
          )
        );
      } catch (requestError) {
        console.error(
          "Failed to load current user:",
          requestError
        );
      }
    }


    void loadCurrentUser();


    return () => {
      cancelled =
        true;
    };
  }, []);


  /* =======================================================
     AVATAR
     ======================================================= */

  useEffect(() => {
    function syncAvatar() {
      setAvatarUrl(
        localStorage.getItem(
          "accessmate_avatar"
        ) || ""
      );
    }


    window.addEventListener(
      "accessmate-avatar-updated",
      syncAvatar
    );


    syncAvatar();


    return () => {
      window.removeEventListener(
        "accessmate-avatar-updated",
        syncAvatar
      );
    };
  }, []);


  /* =======================================================
     ACCESSIBILITY
     ======================================================= */

  useEffect(() => {
    localStorage.setItem(
      "accessmate_screen_reader",
      String(
        accessibilityOn
      )
    );


    window.dispatchEvent(
      new CustomEvent(
        "accessmate-voice-guidance-changed",
        {
          detail: {
            enabled:
              accessibilityOn,
          },
        }
      )
    );


    if (
      !accessibilityOn
    ) {
      window.speechSynthesis.cancel();
    }
  }, [
    accessibilityOn,
  ]);


  function speak(
    text: string
  ) {
    if (
      !(
        "speechSynthesis" in
        window
      )
    ) {
      return;
    }


    window.speechSynthesis.cancel();


    const utterance =
      new SpeechSynthesisUtterance(
        text
      );


    utterance.lang =
      detectLanguage(
        text
      ) === "ar"
        ? "ar-EG"
        : "en-US";


    utterance.rate =
      0.88;

    utterance.pitch =
      0.85;

    utterance.volume =
      1;


    window.speechSynthesis.speak(
      utterance
    );
  }


  /* =======================================================
     RESPONSE HELPER
     ======================================================= */

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


  /* =======================================================
     CREATE CONVERSATION
     ======================================================= */

  async function createConversation(
    text: string,
    fileName?: string,
    documentId?: string | null
  ) {
    const response =
      await api.post(
        "/conversations/me",
        {
          title:
            makeTitle(
              text,
              fileName
            ),

          conversation_type:
            "general",

          /*
           * For PDF / DOCX / TXT / CSV we persist the
           * document relation on the conversation itself.
           *
           * Images and audio still use attachment metadata
           * on the message, exactly as before.
           */
          document_id:
            documentId ??
            null,

          website_check_id:
            null,
        }
      );


    const conversation =
      unwrapResponse<BackendConversation>(
        response
      );


    if (
      !conversation?.id
    ) {
      throw new Error(
        "The backend did not return a conversation ID."
      );
    }


    return conversation;
  }


  /* =======================================================
     SAVE MESSAGE
     ======================================================= */

  async function saveMessage(
    conversationId: string,

    role:
      | "user"
      | "assistant",

    content: string,

    language:
      | "ar"
      | "en",

    file?: File | null,

    document?:
      | BackendDocument
      | null
  ) {
    const attachment =
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
        `/conversations/me/${conversationId}/messages`,
        {
          role,

          content,

          assistant_language:
            language,

          structured_response_json:
            attachment,

          audio_url:
            null,
        }
      );


    const message =
      unwrapResponse<BackendMessage>(
        response
      );


    if (
      !message?.id
    ) {
      throw new Error(
        "Failed to save message."
      );
    }


    return message;
  }


  /* =======================================================
     UPLOAD FILE ONCE
     ======================================================= */

  async function uploadFileToRepository(
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


  /* =======================================================
     TEXT AI
     ======================================================= */

  async function callTextAI(
    message: string,
    language:
      | "ar"
      | "en"
  ) {
    const response =
      await api.post(
        "/ai/chat",
        {
          message,

          prompt:
            message,

          question:
            message,

          language,
        }
      );


    return extractTextFromResponse(
      response
    );
  }


  /* =======================================================
     IMAGE — FAST DIRECT ROUTING

     - OCR request      -> /ocr/extract only
     - Describe request -> /vision/describe only
     - Other image task -> /vision/assist only

     IMPORTANT:
     A failed Vision request is NOT silently converted to OCR.
     OCR cannot replace a real visual description.
     ======================================================= */

  async function callOCRService(
    file: File,
    language:
      | "ar"
      | "en"
  ) {
    const ocrFormData =
      new FormData();


    ocrFormData.append(
      "image_file",
      file
    );


    ocrFormData.append(
      "language",
      language
    );


    ocrFormData.append(
      "voice_friendly",
      "true"
    );


    const response =
      await api.post(
        "/ocr/extract",
        ocrFormData
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
    const visionFormData =
      new FormData();


    visionFormData.append(
      "image_file",
      file
    );


    visionFormData.append(
      "language",
      language
    );


    visionFormData.append(
      "explanation_level",
      "simple"
    );


    visionFormData.append(
      "voice_friendly",
      "true"
    );


    visionFormData.append(
      "should_speak",
      "true"
    );


    const response =
      await api.post(
        "/vision/describe",
        visionFormData
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
    const visionFormData =
      new FormData();


    visionFormData.append(
      "image_file",
      file
    );


    visionFormData.append(
      "task",
      taskText.trim() ||
        "Describe this image clearly and practically for accessibility."
    );


    visionFormData.append(
      "language",
      language
    );


    visionFormData.append(
      "explanation_level",
      "simple"
    );


    visionFormData.append(
      "voice_friendly",
      "true"
    );


    visionFormData.append(
      "should_speak",
      "true"
    );


    const response =
      await api.post(
        "/vision/assist",
        visionFormData
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


  /* =======================================================
     AUDIO
     ======================================================= */

  async function callAudioService(
    file: File,
    text: string
  ) {
    const language =
      detectLanguage(
        text ||
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
    } catch (audioError) {
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


  /* =======================================================
     DOCUMENT PREPARE
     ======================================================= */

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


  /* =======================================================
     DOCUMENT ASK — REAL RAG / SMART SUMMARY
     ======================================================= */

  async function askDocument(
    documentId: string,

    question: string,

    language:
      | "ar"
      | "en"
  ) {
    const response =
      await api.post(
        `/documents/me/${documentId}/ask`,
        {
          question,

          language,

          explanation_level:
            "simple",

          voice_friendly:
            true,

          limit:
            5,

          mode:
            "auto",
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
      "Document AI result:",
      {
        mode:
          result.mode,

        strategy:
          result.strategy,

        retrievedChunks:
          result.retrieved_chunks,

        sourceChunksUsed:
          result.source_chunks_used,
      }
    );


    return result.answer.trim();
  }


  /* =======================================================
     DOCUMENT SERVICE

     REAL PIPELINE:

     Document already uploaded by /files/upload
          ↓
     /documents/me/{id}/prepare
          ↓
     extract + chunk + embed
          ↓
     /documents/me/{id}/ask
          ↓
     mode:auto
          ↓
     summary or vector RAG
     ======================================================= */

  async function callDocumentService(
    file: File,

    text: string,

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
     * STEP 1:
     * Extract text + chunk + embed.
     */
    await prepareDocument(
      document.id
    );


    /*
     * STEP 2:
     * Decide the actual user question.
     *
     * Empty prompt:
     *   → full summary
     *
     * "Analyze this file":
     *   → full summary + analysis
     *
     * Specific question:
     *   → sent unchanged and Smart Router chooses RAG
     */
    const question =
      normalizeDocumentQuestion(
        text
      );


    /*
     * STEP 3:
     * Ask document using Smart Router.
     */
    return askDocument(
      document.id,
      question,
      language
    );
  }


  /* =======================================================
     BACKGROUND PROCESSING

     Dashboard has ALREADY navigated to /chat/:id
     before this completes.
     ======================================================= */

  async function processInBackground(
    conversationId: string,

    file:
      | File
      | null,

    text: string,

    language:
      | "ar"
      | "en",

    document:
      | BackendDocument
      | null,

    preparedImageResult:
      | Promise<ImageProcessingResult>
      | null =
        null
  ) {
    try {
      let answer = "";


      if (
        file
      ) {
        /* IMAGE */
        if (
          isImageFile(
            file
          )
        ) {
          if (
            preparedImageResult
          ) {
            const imageResult =
              await preparedImageResult;


            if (
              !imageResult.ok
            ) {
              throw imageResult.error;
            }


            answer =
              imageResult.answer;
          } else {
            answer =
              await callImageService(
                file,
                text
              );
          }
        }

        /* AUDIO */
        else if (
          isAudioFile(
            file
          )
        ) {
          answer =
            await callAudioService(
              file,
              text
            );
        }

        /* DOCUMENT */
        else if (
          isDocumentFile(
            file
          )
        ) {
          if (
            !document
          ) {
            throw new Error(
              "Uploaded document record is missing."
            );
          }


          answer =
            await callDocumentService(
              file,
              text,
              language,
              document
            );
        }

        /* UNSUPPORTED */
        else {
          throw new Error(
            `Unsupported file type: ${file.name}`
          );
        }
      } else {
        answer =
          await callTextAI(
            text,
            language
          );
      }


      if (
        !answer ||
        !answer.trim()
      ) {
        throw new Error(
          "AccessMate returned an empty response."
        );
      }


      /*
       * Save the final answer in PostgreSQL.
       */
      await saveMessage(
        conversationId,
        "assistant",
        answer,
        language,
        null,
        null
      );


      /*
       * Tell ChatPage that a fresh assistant
       * message is now available.
       */
      dispatchConversationUpdate(
        conversationId
      );


      if (
        accessibilityOn
      ) {
        speak(
          answer
        );
      }
    } catch (backgroundError) {
      console.error(
        "Background processing failed:",
        backgroundError
      );


      window.dispatchEvent(
        new CustomEvent(
          "accessmate-chat-processing-error",
          {
            detail: {
              conversationId,

              message:
                getApiError(
                  backgroundError
                ),
            },
          }
        )
      );
    }
  }


  /* =======================================================
     SEND FROM DASHBOARD

     FILE:
       ↓
     /files/upload
       ↓
     document_id
       ↓
     conversation
       ↓
     user message
       ↓
     navigate immediately
       ↓
     background processing
     ======================================================= */

  async function processRequest() {
    const text =
      input.trim();


    const currentFile =
      selectedFile;


    if (
      !text &&
      !currentFile
    ) {
      return;
    }


    if (
      sendingRef.current
    ) {
      return;
    }


    if (
      isRecording
    ) {
      return;
    }


    sendingRef.current =
      true;


    setLoading(
      true
    );


    setError("");


    const language =
      detectLanguage(
        text ||
          currentFile?.name ||
          ""
      );


    const userContent =
      text ||
      (
        currentFile
          ? `Uploaded a file: ${currentFile.name}`
          : ""
      );


    try {
      let uploadedDocument:
        | BackendDocument
        | null =
        null;


      let imageProcessingPromise:
        | Promise<ImageProcessingResult>
        | null =
        null;


      /*
       * FAST IMAGE PATH:
       *
       * Start Vision/OCR immediately.
       * It runs in parallel with saving the ORIGINAL file
       * to the AccessMate Library.
       *
       * The promise never rejects directly, which prevents
       * an unhandled rejection if the repository upload fails.
       */
      if (
        currentFile &&
        isImageFile(
          currentFile
        )
      ) {
        imageProcessingPromise =
          callImageService(
            currentFile,
            text
          )
            .then(
              (
                answer
              ):
                ImageProcessingResult => ({
                  ok:
                    true,

                  answer,
                })
            )
            .catch(
              (
                imageError
              ):
                ImageProcessingResult => ({
                  ok:
                    false,

                  error:
                    imageError,
                })
            );
      }


      /* ---------------------------------------------------
         FILE → LIBRARY

         For images this runs at the SAME TIME as Vision/OCR.
         Documents/audio keep the existing behavior.
         --------------------------------------------------- */

      if (
        currentFile
      ) {
        uploadedDocument =
          await uploadFileToRepository(
            currentFile
          );
      }


      /* ---------------------------------------------------
         DOCUMENT RELATION

         Only document-style files should become the
         conversation.document_id.

         Image/audio attachments continue exactly as before.
         --------------------------------------------------- */

      const conversationDocumentId =
        currentFile &&
        uploadedDocument &&
        isDocumentFile(
          currentFile
        )
          ? uploadedDocument.id
          : null;


      /* ---------------------------------------------------
         CREATE CHAT
         --------------------------------------------------- */

      const conversation =
        await createConversation(
          text,
          currentFile?.name,
          conversationDocumentId
        );


      /* ---------------------------------------------------
         SAVE USER MESSAGE WITH ATTACHMENT
         --------------------------------------------------- */

      await saveMessage(
        conversation.id,
        "user",
        userContent,
        language,
        currentFile,
        uploadedDocument
      );


      dispatchConversationUpdate(
        conversation.id
      );


      /* ---------------------------------------------------
         CLEAR DASHBOARD COMPOSER
         --------------------------------------------------- */

      setInput("");

      setSelectedFile(
        null
      );


      if (
        fileInputRef.current
      ) {
        fileInputRef.current.value =
          "";
      }


      /*
       * IMPORTANT:
       *
       * Navigate BEFORE:
       *
       * - document extraction
       * - chunking
       * - embeddings
       * - RAG
       * - Vision
       * - OCR
       * - Voice
       * - normal LLM generation
       */
      navigate(
        `/chat/${conversation.id}`,
        {
          replace:
            true,

          state: {
            backgroundProcessing:
              true,

            /*
             * Useful for ChatPage later when we add
             * persistent document conversation context.
             */
            documentId:
              conversationDocumentId,
          },
        }
      );


      /*
       * Continue processing after navigation.
       */
      void processInBackground(
        conversation.id,
        currentFile,
        text,
        language,
        uploadedDocument,
        imageProcessingPromise
      ).finally(
        () => {
          sendingRef.current =
            false;
        }
      );
    } catch (requestError) {
      console.error(
        "Dashboard request failed:",
        requestError
      );


      setError(
        getApiError(
          requestError
        )
      );


      setLoading(
        false
      );


      sendingRef.current =
        false;
    }
  }


  /* =======================================================
     FORM
     ======================================================= */

  async function handleSubmit(
    event: FormEvent
  ) {
    event.preventDefault();


    await processRequest();
  }


  async function handleTextareaKeyDown(
    event:
      KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (
      event.key ===
        "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();


      await processRequest();
    }
  }


  /* =======================================================
     FILE PICK
     ======================================================= */

  function handleFilePick(
    event:
      ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];


    if (!file) {
      return;
    }


    setSelectedFile(
      file
    );


    setError("");


    window.setTimeout(
      () => {
        textareaRef.current?.focus();
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


  /* =======================================================
     RECORDING TIMER
     ======================================================= */

  useEffect(() => {
    if (
      isRecording
    ) {
      recordingTimerRef.current =
        setInterval(
          () => {
            setRecordingSeconds(
              (
                seconds
              ) =>
                seconds +
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


  /* =======================================================
     START RECORDING
     ======================================================= */

  async function startRecording() {
    if (
      isRecording ||
      loading
    ) {
      return;
    }


    if (
      !navigator.mediaDevices
        ?.getUserMedia
    ) {
      setError(
        "Microphone recording is not supported in this browser."
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


          if (
            blob.size >
            0
          ) {
            const audioFile =
              new File(
                [
                  blob,
                ],
                `voice-recording-${Date.now()}.webm`,
                {
                  type:
                    "audio/webm",
                }
              );


            setSelectedFile(
              audioFile
            );
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


          window.setTimeout(
            () => {
              textareaRef.current?.focus();
            },
            50
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


          setError(
            "Unable to record audio."
          );
        };


      mediaRecorderRef.current =
        recorder;


      setSelectedFile(
        null
      );


      setRecordingSeconds(
        0
      );


      setIsRecording(
        true
      );


      setError("");


      recorder.start(
        250
      );
    } catch (
      recordingError
    ) {
      console.error(
        "Failed to start microphone:",
        recordingError
      );


      setIsRecording(
        false
      );


      setRecordingSeconds(
        0
      );


      setError(
        "Microphone permission was denied or the microphone is unavailable."
      );
    }
  }


  function stopRecording() {
    const recorder =
      mediaRecorderRef.current;


    if (!recorder) {
      return;
    }


    if (
      recorder.state !==
      "inactive"
    ) {
      recorder.stop();
    }
  }


  function toggleRecording() {
    if (
      isRecording
    ) {
      stopRecording();
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


    const remaining =
      seconds %
      60;


    return `${String(
      minutes
    ).padStart(
      2,
      "0"
    )}:${String(
      remaining
    ).padStart(
      2,
      "0"
    )}`;
  }


  /* =======================================================
     CLEAN MICROPHONE
     ======================================================= */

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
        recordingTimerRef.current
      ) {
        clearInterval(
          recordingTimerRef.current
        );
      }
    };
  }, []);
  function handleQuickAction(
    item:
      (
        typeof quickActions
      )[number]
  ) {
    if (
      loading ||
      sendingRef.current
    ) {
      return;
    }


    if (
      item.action ===
      "website"
    ) {
      navigate(
        "/website-safety"
      );

      return;
    }


    if (
      item.action ===
      "voice"
    ) {
      toggleRecording();

      return;
    }


    if (
      item.action ===
        "file" ||
      item.action ===
        "image"
    ) {
      setInput(
        item.prompt
      );


      window.setTimeout(
        () => {
          fileInputRef.current?.click();
        },
        50
      );

      return;
    }


    setInput(
      item.prompt
    );


    window.setTimeout(
      () => {
        textareaRef.current?.focus();
      },
      50
    );
  }


  /* =======================================================
     UI
     ======================================================= */

  return (
    <main
      data-voice-region="Dashboard"
      className="
        relative
        h-full
        min-h-0
        overflow-hidden
        bg-[#000912]
        text-white
      "
      style={{
        backgroundImage:
          `url(${backgroundImage})`,

        backgroundSize:
          "cover",

        backgroundPosition:
          "center center",

        backgroundRepeat:
          "no-repeat",
      }}
    >
      <div
        className="
          pointer-events-none
          absolute
          inset-0
          bg-[#000912]/92
        "
      />


      <div
        className="
          pointer-events-none
          absolute
          inset-0
          overflow-hidden
        "
      >
        <div
          className="
            absolute
            right-[3%]
            top-[4%]
            h-[420px]
            w-[420px]
            rounded-full
            bg-[#00B8DB]/[0.045]
            blur-[150px]
          "
        />

        <div
          className="
            absolute
            bottom-[-18%]
            left-[24%]
            h-[440px]
            w-[440px]
            rounded-full
            bg-[#00B8DB]/[0.03]
            blur-[170px]
          "
        />
      </div>


      <section
        className="
          relative
          z-10
          flex
          h-full
          min-h-0
          flex-col
          overflow-hidden
          px-5
          py-4
          lg:px-6
        "
      >

        {/* =================================================
            TOP BAR
            ================================================= */}

        <header
          data-voice-region="Dashboard top bar"
          aria-label="Dashboard top bar"
          className="
            relative
            z-40
            flex
            h-[58px]
            shrink-0
            items-center
            justify-between
            gap-4
            border-b
            border-[#15313D]/80
          "
        >

          <div
            className="
              hidden
              min-w-[170px]
              lg:block
            "
          >
            <p
              className="
                text-[10px]
                font-semibold
                uppercase
                tracking-[0.18em]
                text-[#30AFDC]/75
              "
            >
              AccessMate Workspace
            </p>

            <h1
              className="
                mt-0.5
                text-[16px]
                font-bold
                text-white
              "
            >
              Dashboard
            </h1>
          </div>


          {/* FUNCTIONAL SEARCH */}

          <div
            ref={
              searchMenuRef
            }
            className="
              relative
              mx-auto
              w-full
              max-w-[560px]
            "
          >
            <div
              className="
                flex
                h-[40px]
                items-center
                gap-2.5
                rounded-[15px]
                border
                border-[#17323D]
                bg-[#060D17]/96
                px-3.5
                shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]
                backdrop-blur-xl
                transition
                focus-within:border-[#00B8DB]/50
                focus-within:shadow-[0_0_24px_rgba(74,222,128,0.06)]
              "
            >
              <Search
                className="
                  h-[16px]
                  w-[16px]
                  shrink-0
                  text-[#30AFDC]/70
                "
              />

              <input
                value={
                  searchQuery
                }
                onChange={(
                  event
                ) => {
                  setSearchQuery(
                    event.target.value
                  );

                  setSearchOpen(
                    true
                  );
                }}
                onFocus={() =>
                  setSearchOpen(
                    true
                  )
                }
                onKeyDown={(
                  event
                ) => {
                  if (
                    event.key ===
                    "Escape"
                  ) {
                    setSearchOpen(
                      false
                    );

                    return;
                  }


                  if (
                    event.key ===
                    "Enter" &&
                    normalizedSearchQuery
                  ) {
                    const conversation =
                      searchConversationResults[0];


                    if (
                      conversation
                    ) {
                      openConversationFromSearch(
                        conversation.id
                      );

                      return;
                    }


                    const action =
                      searchActionResults[0];


                    if (
                      action
                    ) {
                      setSearchQuery("");
                      setSearchOpen(false);

                      handleQuickAction(
                        action
                      );
                    }
                  }
                }}
                placeholder="Search chats, files, or AccessMate tools..."
                aria-label="Search chats and AccessMate tools"
                data-voice-label="Search AccessMate"
                className="
                  min-w-0
                  flex-1
                  bg-transparent
                  text-[12px]
                  font-medium
                  text-[#D1D2D6]
                  outline-none
                  placeholder:text-[#52565F]
                "
              />


              {searchLoading && (
                <span
                  className="
                    h-3.5
                    w-3.5
                    animate-spin
                    rounded-full
                    border-2
                    border-[#17323D]
                    border-t-[#00B8DB]
                  "
                />
              )}


              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSearchOpen(false);
                  }}
                  className="
                    flex
                    h-6
                    w-6
                    items-center
                    justify-center
                    rounded-full
                    text-[#52565F]
                    transition
                    hover:bg-[#00B8DB]/[0.06]
                    hover:text-[#50CFF2]
                  "
                  aria-label="Clear search"
                >
                  <X
                    className="
                      h-3.5
                      w-3.5
                    "
                  />
                </button>
              )}
            </div>


            {searchOpen &&
              normalizedSearchQuery && (
              <motion.div
                initial={{
                  opacity: 0,
                  y: -6,
                  scale: 0.99,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                }}
                transition={{
                  duration: 0.16,
                }}
                className="
                  absolute
                  left-0
                  right-0
                  top-[47px]
                  z-[80]
                  overflow-hidden
                  rounded-[18px]
                  border
                  border-[#17323D]
                  bg-[#060D17]/98
                  p-2
                  shadow-[0_24px_80px_rgba(0,0,0,0.65)]
                  backdrop-blur-2xl
                "
                role="listbox"
                aria-label="Search results"
              >

                {searchConversationResults.length >
                  0 && (
                  <div>
                    <p
                      className="
                        px-2
                        pb-1.5
                        pt-1
                        text-[8px]
                        font-bold
                        uppercase
                        tracking-[0.14em]
                        text-[#52565F]
                      "
                    >
                      Conversations
                    </p>


                    {searchConversationResults.map(
                      (
                        conversation
                      ) => (
                        <button
                          type="button"
                          key={
                            conversation.id
                          }
                          onClick={() =>
                            openConversationFromSearch(
                              conversation.id
                            )
                          }
                          className="
                            flex
                            w-full
                            items-center
                            gap-2.5
                            rounded-xl
                            px-3
                            py-2.5
                            text-left
                            transition
                            hover:bg-[#00B8DB]/[0.045]
                          "
                          data-voice-label={`Open conversation ${conversation.title || "New chat"}`}
                        >
                          <span
                            className="
                              flex
                              h-8
                              w-8
                              shrink-0
                              items-center
                              justify-center
                              rounded-full
                              bg-[#00B8DB]/[0.05]
                              text-[#50CFF2]
                            "
                          >
                            <Brain
                              className="
                                h-3.5
                                w-3.5
                              "
                            />
                          </span>

                          <span
                            className="
                              min-w-0
                              flex-1
                            "
                          >
                            <span
                              className="
                                block
                                truncate
                                text-[11px]
                                font-semibold
                                text-[#D1D2D6]
                              "
                            >
                              {conversation.title ||
                                "New chat"}
                            </span>

                            <span
                              className="
                                mt-0.5
                                block
                                text-[8px]
                                text-[#52565F]
                              "
                            >
                              Conversation
                            </span>
                          </span>

                          <ChevronRight
                            className="
                              h-3.5
                              w-3.5
                              text-[#38414A]
                            "
                          />
                        </button>
                      )
                    )}
                  </div>
                )}


                {searchActionResults.length >
                  0 && (
                  <div
                    className={
                      searchConversationResults.length >
                      0
                        ? "mt-1 border-t border-white/[0.05] pt-1"
                        : ""
                    }
                  >
                    <p
                      className="
                        px-2
                        pb-1.5
                        pt-1
                        text-[8px]
                        font-bold
                        uppercase
                        tracking-[0.14em]
                        text-[#52565F]
                      "
                    >
                      AccessMate tools
                    </p>


                    {searchActionResults.map(
                      (
                        item
                      ) => {
                        const Icon =
                          item.icon;


                        return (
                          <button
                            type="button"
                            key={
                              item.title
                            }
                            onClick={() => {
                              setSearchQuery("");
                              setSearchOpen(false);

                              handleQuickAction(
                                item
                              );
                            }}
                            className="
                              flex
                              w-full
                              items-center
                              gap-2.5
                              rounded-xl
                              px-3
                              py-2.5
                              text-left
                              transition
                              hover:bg-[#00B8DB]/[0.045]
                            "
                            data-voice-label={`Open ${item.title}`}
                          >
                            <span
                              className="
                                flex
                                h-8
                                w-8
                                shrink-0
                                items-center
                                justify-center
                                rounded-full
                                bg-[#00B8DB]/[0.05]
                                text-[#50CFF2]
                              "
                            >
                              <Icon
                                className="
                                  h-3.5
                                  w-3.5
                                "
                              />
                            </span>

                            <span
                              className="
                                min-w-0
                                flex-1
                              "
                            >
                              <span
                                className="
                                  block
                                  text-[11px]
                                  font-semibold
                                  text-[#D1D2D6]
                                "
                              >
                                {item.title}
                              </span>

                              <span
                                className="
                                  mt-0.5
                                  block
                                  truncate
                                  text-[8px]
                                  text-[#52565F]
                                "
                              >
                                {item.desc}
                              </span>
                            </span>

                            <ChevronRight
                              className="
                                h-3.5
                                w-3.5
                                text-[#38414A]
                              "
                            />
                          </button>
                        );
                      }
                    )}
                  </div>
                )}


                {searchConversationResults.length ===
                  0 &&
                  searchActionResults.length ===
                    0 && (
                  <div
                    className="
                      px-4
                      py-7
                      text-center
                      text-[10px]
                      text-[#52565F]
                    "
                  >
                    No matching chats or tools.
                  </div>
                )}
              </motion.div>
            )}
          </div>


          <div
            className="
              flex
              items-center
              gap-2
            "
          >

            {/* ACCESSIBILITY / VOICE GUIDE */}

            <button
              type="button"
              onClick={() =>
                setAccessibilityOn(
                  (
                    value
                  ) =>
                    !value
                )
              }
              className={`
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-full
                border
                transition
                duration-200

                ${
                  accessibilityOn
                    ? "border-[#00B8DB]/50 bg-[#00B8DB]/[0.10] text-[#50CFF2] shadow-[0_0_22px_rgba(74,222,128,0.12)]"
                    : "border-white/10 bg-[#060D17]/88 text-[#989B9F] hover:border-[#00B8DB]/30 hover:text-[#50CFF2]"
                }
              `}
              title="Voice guidance"
              aria-label={
                accessibilityOn
                  ? "Turn voice guidance off"
                  : "Turn voice guidance on"
              }
              data-voice-label={
                accessibilityOn
                  ? "Voice guidance is on. Press to turn it off."
                  : "Voice guidance is off. Press to turn it on."
              }
              aria-pressed={
                accessibilityOn
              }
            >
              {accessibilityOn ? (
                <Volume2
                  className="
                    h-[18px]
                    w-[18px]
                  "
                />
              ) : (
                <VolumeX
                  className="
                    h-[18px]
                    w-[18px]
                  "
                />
              )}
            </button>


            {/* REAL NOTIFICATION BELL */}

            <div
              ref={
                notificationMenuRef
              }
              className="
                relative
              "
            >
              <button
                type="button"
                onClick={() =>
                  void toggleNotifications()
                }
                className={`
                  relative
                  flex
                  h-10
                  w-10
                  items-center
                  justify-center
                  rounded-full
                  border
                  transition
                  duration-200

                  ${
                    notificationsOpen
                      ? "border-[#00B8DB]/55 bg-[#00B8DB]/[0.09] text-[#50CFF2]"
                      : "border-white/10 bg-[#060D17]/88 text-[#B0B4B9] hover:border-[#00B8DB]/35 hover:text-[#50CFF2]"
                  }
                `}
                title="Care alert notifications"
                aria-label={`Notifications${
                  unreadNotifications
                    ? `, ${unreadNotifications} unread`
                    : ""
                }`}
                data-voice-label={`Notifications. ${unreadNotifications} unread.`}
                aria-expanded={
                  notificationsOpen
                }
              >
                <Bell
                  className="
                    h-[18px]
                    w-[18px]
                  "
                />


                {unreadNotifications >
                  0 && (
                  <>
                    <span
                      className="
                        absolute
                        right-[6px]
                        top-[6px]
                        h-2
                        w-2
                        rounded-full
                        bg-[#00B8DB]
                        shadow-[0_0_10px_rgba(85,244,116,0.95)]
                      "
                    />

                    <span
                      className="
                        absolute
                        -right-2
                        -top-2
                        flex
                        min-h-[18px]
                        min-w-[18px]
                        items-center
                        justify-center
                        rounded-full
                        border
                        border-black
                        bg-[#00B8DB]
                        px-1
                        text-[9px]
                        font-black
                        text-black
                      "
                    >
                      {unreadNotifications >
                      9
                        ? "9+"
                        : unreadNotifications}
                    </span>
                  </>
                )}
              </button>


              {notificationsOpen && (
                <motion.div
                  initial={{
                    opacity: 0,
                    y: -8,
                    scale: 0.98,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: 1,
                  }}
                  transition={{
                    duration: 0.18,
                  }}
                  className="
                    absolute
                    right-0
                    top-[48px]
                    z-[70]
                    w-[360px]
                    max-w-[calc(100vw-40px)]
                    overflow-hidden
                    rounded-[20px]
                    border
                    border-[#17323D]
                    bg-[#060D17]/98
                    shadow-[0_26px_80px_rgba(0,0,0,0.62),0_0_30px_rgba(74,222,128,0.05)]
                    backdrop-blur-2xl
                  "
                  data-voice-region="Notifications panel"
                  aria-label="Notifications panel"
                >
                  <div
                    className="
                      flex
                      items-center
                      justify-between
                      border-b
                      border-[#00B8DB]/[0.09]
                      px-4
                      py-3.5
                    "
                  >
                    <div>
                      <p
                        className="
                          text-[14px]
                          font-bold
                          text-white
                        "
                      >
                        Notifications
                      </p>

                      <p
                        className="
                          mt-0.5
                          text-[10px]
                          text-[#767C83]
                        "
                      >
                        Live care-alert activity
                      </p>
                    </div>


                    <button
                      type="button"
                      onClick={() =>
                        void loadCareAlertNotifications(
                          true
                        )
                      }
                      disabled={
                        notificationsLoading
                      }
                      className="
                        flex
                        h-8
                        w-8
                        items-center
                        justify-center
                        rounded-lg
                        border
                        border-[#00B8DB]/15
                        text-[#989B9F]
                        transition
                        hover:border-[#00B8DB]/40
                        hover:text-[#50CFF2]
                        disabled:opacity-50
                      "
                      title="Refresh notifications"
                      aria-label="Refresh notifications"
                    >
                      <RefreshCw
                        className={`
                          h-4
                          w-4

                          ${
                            notificationsLoading
                              ? "animate-spin"
                              : ""
                          }
                        `}
                      />
                    </button>
                  </div>


                  <div
                    className="
                      max-h-[360px]
                      overflow-y-auto
                      p-2
                    "
                  >
                    {notificationsLoading &&
                      notifications.length ===
                        0 && (
                      <div
                        className="
                          px-3
                          py-8
                          text-center
                          text-[12px]
                          text-[#767C83]
                        "
                      >
                        Loading notifications...
                      </div>
                    )}


                    {!notificationsLoading &&
                      notificationsError &&
                      notifications.length ===
                        0 && (
                      <div
                        className="
                          rounded-xl
                          border
                          border-red-400/15
                          bg-red-500/[0.05]
                          px-3
                          py-4
                          text-[11px]
                          leading-5
                          text-red-300
                        "
                      >
                        {notificationsError}
                      </div>
                    )}


                    {!notificationsLoading &&
                      !notificationsError &&
                      notifications.length ===
                        0 && (
                      <div
                        className="
                          px-4
                          py-9
                          text-center
                        "
                      >
                        <Bell
                          className="
                            mx-auto
                            h-6
                            w-6
                            text-[#30AFDC]/45
                          "
                        />

                        <p
                          className="
                            mt-3
                            text-[12px]
                            font-semibold
                            text-[#B0B4B9]
                          "
                        >
                          No care alerts yet
                        </p>

                        <p
                          className="
                            mt-1
                            text-[10px]
                            text-[#767C83]
                          "
                        >
                          Sent, pending, and failed alerts will appear here.
                        </p>
                      </div>
                    )}


                    {notifications
                      .slice(
                        0,
                        8
                      )
                      .map(
                        (
                          notification
                        ) => {
                          const isSent =
                            notification.status ===
                            "sent";

                          const isFailed =
                            notification.status ===
                            "failed";


                          return (
                            <div
                              key={
                                notification.id
                              }
                              className="
                                flex
                                items-start
                                gap-3
                                rounded-xl
                                px-3
                                py-3
                                transition
                                hover:bg-[#00B8DB]/[0.035]
                              "
                            >
                              <span
                                className={`
                                  mt-0.5
                                  flex
                                  h-9
                                  w-9
                                  shrink-0
                                  items-center
                                  justify-center
                                  rounded-full
                                  border

                                  ${
                                    isSent
                                      ? "border-[#00B8DB]/25 bg-[#00B8DB]/[0.06] text-[#50CFF2]"
                                      : isFailed
                                      ? "border-red-400/20 bg-red-400/[0.06] text-red-300"
                                      : "border-amber-400/20 bg-amber-400/[0.06] text-amber-300"
                                  }
                                `}
                              >
                                {isSent ? (
                                  <CheckCircle2
                                    className="
                                      h-4
                                      w-4
                                    "
                                  />
                                ) : isFailed ? (
                                  <AlertTriangle
                                    className="
                                      h-4
                                      w-4
                                    "
                                  />
                                ) : (
                                  <Clock3
                                    className="
                                      h-4
                                      w-4
                                    "
                                  />
                                )}
                              </span>


                              <div
                                className="
                                  min-w-0
                                  flex-1
                                "
                              >
                                <div
                                  className="
                                    flex
                                    items-start
                                    justify-between
                                    gap-2
                                  "
                                >
                                  <p
                                    className="
                                      line-clamp-2
                                      text-[12px]
                                      font-semibold
                                      leading-5
                                      text-[#D1D2D6]
                                    "
                                  >
                                    {
                                      notification.message
                                    }
                                  </p>

                                  <span
                                    className="
                                      shrink-0
                                      text-[9px]
                                      text-[#52565F]
                                    "
                                  >
                                    {formatRelativeTime(
                                      notification.sentAt ||
                                        notification.createdAt
                                    )}
                                  </span>
                                </div>


                                <div
                                  className="
                                    mt-1.5
                                    flex
                                    flex-wrap
                                    items-center
                                    gap-2
                                  "
                                >
                                  <span
                                    className={`
                                      rounded-full
                                      px-2
                                      py-0.5
                                      text-[8px]
                                      font-bold
                                      uppercase
                                      tracking-[0.08em]

                                      ${
                                        isSent
                                          ? "bg-[#00B8DB]/[0.08] text-[#50CFF2]"
                                          : isFailed
                                          ? "bg-red-400/[0.08] text-red-300"
                                          : "bg-amber-400/[0.08] text-amber-300"
                                      }
                                    `}
                                  >
                                    {
                                      notification.status
                                    }
                                  </span>

                                  <span
                                    className="
                                      text-[9px]
                                      text-[#52565F]
                                    "
                                  >
                                    {
                                      notification.channel
                                    }
                                  </span>

                                  <span
                                    className="
                                      text-[9px]
                                      text-[#52565F]
                                    "
                                  >
                                    •
                                  </span>

                                  <span
                                    className="
                                      text-[9px]
                                      text-[#52565F]
                                    "
                                  >
                                    {
                                      notification.riskLevel
                                    }
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                      )}
                  </div>


                  <div
                    className="
                      border-t
                      border-[#15313D]/80
                      px-4
                      py-3
                    "
                  >
                    <div
                      className="
                        flex
                        items-center
                        gap-2
                        text-[9px]
                        text-[#52565F]
                      "
                    >
                      <span
                        className="
                          h-1.5
                          w-1.5
                          rounded-full
                          bg-[#00B8DB]
                          shadow-[0_0_8px_rgba(74,222,128,0.8)]
                        "
                      />

                      Connected to the Care Alerts backend
                    </div>
                  </div>
                </motion.div>
              )}
            </div>


            {/* PROFILE */}

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/account"
                )
              }
              className="
                flex
                min-h-[42px]
                items-center
                gap-2.5
                rounded-2xl
                border
                border-white/[0.08]
                bg-[#060D17]/88
                px-2
                pr-3
                transition
                hover:border-[#00B8DB]/30
                hover:bg-[#00B8DB]/[0.035]
              "
              data-voice-label={`Open account. ${displayName}`}
              aria-label={`Open account for ${displayName}`}
            >
              <span
                className="
                  flex
                  h-8
                  w-8
                  items-center
                  justify-center
                  overflow-hidden
                  rounded-full
                  border
                  border-[#17323D]
                  bg-[#00B8DB]/[0.05]
                  text-[#50CFF2]
                "
              >
                {avatarUrl ? (
                  <img
                    src={
                      avatarUrl
                    }
                    alt=""
                    className="
                      h-full
                      w-full
                      rounded-full
                      object-cover
                    "
                  />
                ) : (
                  <User
                    className="
                      h-4
                      w-4
                    "
                  />
                )}
              </span>


              <span
                className="
                  hidden
                  min-w-0
                  text-left
                  sm:block
                "
              >
                <span
                  className="
                    block
                    max-w-[130px]
                    truncate
                    text-[11px]
                    font-semibold
                    text-white
                  "
                >
                  {
                    displayName
                  }
                </span>

                <span
                  className="
                    block
                    text-[8px]
                    text-[#52565F]
                  "
                >
                  AccessMate User
                </span>
              </span>
            </button>

          </div>
        </header>


        {/* =================================================
            MAIN LAYOUT
            ================================================= */}

        <div
          className="
            grid
            min-h-0
            flex-1
            grid-cols-1
            gap-3
            overflow-hidden
            pt-3
          "
        >

          {/* =================================================
              MAIN WORKSPACE
              ================================================= */}

          <div
            data-voice-region="Main workspace"
            aria-label="Main workspace"
            className="
              grid
              min-h-0
              grid-rows-[minmax(245px,1fr)_auto]
              gap-3
              overflow-hidden
            "
          >

            {/* HERO + COMPOSER */}

            <motion.section
              initial={{
                opacity: 0,
                y: 12,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.5,
              }}
              aria-label="AI assistant message area"
              className="
                relative
                min-h-0
                overflow-hidden
                rounded-[22px]
                border
                border-[#15313D]
                bg-[#03101E]/94
                shadow-[0_20px_60px_rgba(0,0,0,0.30)]
                backdrop-blur-xl
              "
            >

              <img
                src={
                  heroVisual
                }
                alt=""
                aria-hidden="true"
                className="
                  pointer-events-none
                  absolute
                  right-0
                  top-0
                  h-full
                  w-[50%]
                  object-cover
                  object-center
                  opacity-70
                "
                style={{
                  filter:
                    "grayscale(1) sepia(1) hue-rotate(142deg) saturate(5.8) brightness(0.68) contrast(1.22)",
                }}
              />


              <div
                className="
                  pointer-events-none
                  absolute
                  inset-0
                  bg-gradient-to-r
                  from-[#03101E]
                  via-[#03101E]/85
                  to-black/15
                "
              />


              <div
                dir={
                  isArabicDashboard
                    ? "rtl"
                    : "ltr"
                }
                data-voice-region={
                  isArabicDashboard
                    ? "ترحيب لوحة التحكم"
                    : "Dashboard greeting"
                }
                className="
                  pointer-events-none
                  absolute
                  inset-x-0
                  top-[42%]
                  z-10
                  -translate-y-1/2
                  px-6
                  text-center
                "
              >
                <p
                  className="
                    flex
                    flex-wrap
                    items-center
                    justify-center
                    gap-x-1.5
                    text-[20px]
                    font-semibold
                    leading-7
                    text-[#D1D2D6]
                  "
                >
                  <span>
                    {greeting}
                  </span>

                  <span
                    className="
                      font-bold
                      text-[#30AFDC]
                    "
                  >
                    {firstName}
                  </span>
                </p>


                <h2
                  className="
                    mt-1.5
                    text-[15px]
                    font-medium
                    leading-6
                    tracking-normal
                    text-[#989B9F]
                  "
                >
                  {heroQuestion}
                </h2>
              </div>


              {error && (
                <div
                  role="alert"
                  className="
                    absolute
                    bottom-[98px]
                    left-6
                    right-6
                    z-20
                    rounded-xl
                    border
                    border-red-400/20
                    bg-red-500/[0.08]
                    px-4
                    py-2
                    text-[11px]
                    text-red-300
                    backdrop-blur-xl
                  "
                >
                  {error}
                </div>
              )}


              {(selectedFile ||
                isRecording) && (
                <div
                  className="
                    absolute
                    bottom-[96px]
                    left-6
                    z-20
                    flex
                    max-w-[65%]
                    items-center
                    gap-2
                  "
                >
                  {isRecording && (
                    <div
                      className="
                        flex
                        items-center
                        gap-2
                        rounded-full
                        border
                        border-red-400/25
                        bg-red-500/[0.10]
                        px-3
                        py-1.5
                        text-[10px]
                        font-medium
                        text-red-300
                        backdrop-blur-xl
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

                      Recording{" "}
                      {
                        formatRecordingTime(
                          recordingSeconds
                        )
                      }
                    </div>
                  )}


                  {selectedFile && (
                    <div
                      className="
                        flex
                        min-w-0
                        items-center
                        gap-2
                        rounded-full
                        border
                        border-[#17323D]
                        bg-[#000912]/60
                        px-3
                        py-1.5
                        text-[10px]
                        text-[#B0B4B9]
                        backdrop-blur-xl
                      "
                    >
                      <FileIcon
                        className="
                          h-3.5
                          w-3.5
                          shrink-0
                          text-[#30AFDC]
                        "
                      />

                      <span
                        className="
                          max-w-[320px]
                          truncate
                        "
                        title={
                          selectedFile.name
                        }
                      >
                        {
                          selectedFile.name
                        }
                      </span>


                      <button
                        type="button"
                        onClick={
                          removeSelectedFile
                        }
                        disabled={
                          loading
                        }
                        className="
                          text-[#767C83]
                          transition
                          hover:text-white
                        "
                        title="Remove file"
                        aria-label={`Remove ${selectedFile.name}`}
                      >
                        <X
                          className="
                            h-3.5
                            w-3.5
                          "
                        />
                      </button>
                    </div>
                  )}
                </div>
              )}


              {/* COMPOSER */}

              <form
                onSubmit={
                  handleSubmit
                }
                aria-label="Message AccessMate"
                className="
                  absolute
                  bottom-5
                  left-6
                  right-6
                  z-20
                  flex
                  min-h-[72px]
                  items-center
                  gap-2
                  rounded-[20px]
                  border
                  border-[#17323D]
                  bg-[#09121C]/96
                  px-3
                  py-2
                  shadow-[0_18px_50px_rgba(0,0,0,0.35),0_0_24px_rgba(74,222,128,0.05)]
                  backdrop-blur-2xl
                  transition
                  focus-within:border-[#00B8DB]/70
                  focus-within:shadow-[0_18px_50px_rgba(0,0,0,0.35),0_0_30px_rgba(85,244,116,0.09)]
                "
              >

                <button
                  type="button"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  disabled={
                    loading ||
                    isRecording
                  }
                  className="
                    flex
                    h-10
                    w-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-full
                    border
                    border-white/[0.08]
                    bg-[#060D17]/88
                    text-[#989B9F]
                    transition
                    hover:border-[#00B8DB]/35
                    hover:text-[#50CFF2]
                    disabled:opacity-40
                  "
                  title="Attach file"
                  aria-label="Attach a file"
                  data-voice-label="Attach a file"
                >
                  <Paperclip
                    className="
                      h-[18px]
                      w-[18px]
                    "
                  />
                </button>


                <input
                  ref={
                    fileInputRef
                  }
                  type="file"
                  className="hidden"
                  onChange={
                    handleFilePick
                  }
                  accept="image/*,audio/*,.pdf,.docx,.txt,.csv,.mp3,.wav,.m4a,.webm,.ogg,.aac"
                />


                <div
                  className="
                    min-w-0
                    flex-1
                  "
                >
                  <textarea
                    id="accessmate-home-composer-input"
                    ref={
                      textareaRef
                    }
                    value={
                      input
                    }
                    onChange={(
                      event
                    ) => {
                      setInput(
                        event.target.value
                      );


                      const textarea =
                        event.currentTarget;


                      textarea.style.height =
                        "44px";


                      textarea.style.height =
                        `${Math.min(
                          textarea.scrollHeight,
                          112
                        )}px`;
                    }}
                    onKeyDown={
                      handleTextareaKeyDown
                    }
                    placeholder={
                      isRecording
                        ? "Recording voice..."
                        : selectedFile
                        ? "What do you want AccessMate to do with this file?"
                        : "Message AccessMate AI..."
                    }
                    aria-label="Message AccessMate AI"
                    data-voice-label="Message AccessMate AI text field"
                    className="dashboard-reference-textarea"
                    disabled={
                      loading ||
                      isRecording
                    }
                    rows={
                      1
                    }
                  />
                </div>


                <button
                  type="button"
                  onClick={
                    toggleRecording
                  }
                  disabled={
                    loading
                  }
                  className={`
                    relative
                    flex
                    h-10
                    w-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-full
                    border
                    transition

                    ${
                      isRecording
                        ? "border-red-400/35 bg-red-500/[0.10] text-red-300"
                        : "border-white/[0.08] bg-[#060D17]/88 text-[#989B9F] hover:border-[#00B8DB]/35 hover:text-[#50CFF2]"
                    }
                  `}
                  title={
                    isRecording
                      ? "Stop recording"
                      : "Record voice"
                  }
                  aria-label={
                    isRecording
                      ? "Stop voice recording"
                      : "Start voice recording"
                  }
                  data-voice-label={
                    isRecording
                      ? "Stop voice recording"
                      : "Start voice recording"
                  }
                >
                  {isRecording && (
                    <span
                      className="
                        absolute
                        -right-0.5
                        -top-0.5
                        h-2
                        w-2
                        animate-ping
                        rounded-full
                        bg-red-500
                      "
                    />
                  )}


                  <Mic
                    className={`
                      h-[18px]
                      w-[18px]

                      ${
                        isRecording
                          ? "animate-pulse"
                          : ""
                      }
                    `}
                  />
                </button>


                <button
                  type="submit"
                  disabled={
                    loading ||
                    isRecording ||
                    (
                      !input.trim() &&
                      !selectedFile
                    )
                  }
                  className="
                    flex
                    h-11
                    w-11
                    shrink-0
                    items-center
                    justify-center
                    rounded-full
                    border
                    border-[#50CFF2]/60
                    bg-[#006C93]
                    text-white
                    shadow-[0_0_24px_rgba(85,244,116,0.18)]
                    transition
                    hover:bg-[#007FA9]
                    hover:shadow-[0_0_32px_rgba(85,244,116,0.28)]
                    disabled:cursor-not-allowed
                    disabled:opacity-35
                  "
                  title="Send"
                  aria-label="Send message"
                  data-voice-label="Send message"
                >
                  {loading ? (
                    <span
                      className="
                        h-4
                        w-4
                        animate-spin
                        rounded-full
                        border-2
                        border-black/30
                        border-t-black
                      "
                    />
                  ) : (
                    <Send
                      className="
                        h-[18px]
                        w-[18px]
                      "
                    />
                  )}
                </button>
              </form>
            </motion.section>


            {/* QUICK ACTIONS */}

            <section
              aria-label="Quick actions"
              data-voice-region="Quick actions"
              className="
                grid
                grid-cols-3
                gap-2.5
              "
            >
              {quickActions.map(
                (
                  item,
                  index
                ) => {
                  const Icon =
                    item.icon;


                  return (
                    <button
                      type="button"
                      key={
                        item.title
                      }
                      onClick={() =>
                        handleQuickAction(
                          item
                        )
                      }
                      className="
                        group
                        min-h-[108px]
                        rounded-[12px]
                        border
                        border-[#15313D]
                        bg-[#09121C]/92
                        p-3.5
                        text-left
                        backdrop-blur-xl
                        transition
                        duration-200
                        hover:-translate-y-0.5
                        hover:border-[#00B8DB]/40
                        hover:bg-[#00B8DB]/[0.035]
                      "
                      aria-label={`${item.title}. ${item.desc}`}
                      data-voice-label={`${item.title}. ${item.desc}`}
                      data-voice-context={`Quick action ${index + 1} of ${quickActions.length}`}
                    >
                      <span
                        className="
                          flex
                          h-9
                          w-9
                          items-center
                          justify-center
                          rounded-full
                          border
                          border-[#17323D]
                          bg-[#00B8DB]/[0.055]
                          text-[#30AFDC]
                        "
                      >
                        <Icon
                          className="
                            h-[17px]
                            w-[17px]
                          "
                        />
                      </span>


                      <p
                        className="
                          mt-2.5
                          text-[13px]
                          font-semibold
                          text-white
                        "
                      >
                        {
                          item.title
                        }
                      </p>


                      <p
                        className="
                          mt-0.5
                          line-clamp-1
                          text-[10px]
                          text-[#767C83]
                        "
                      >
                        {
                          item.desc
                        }
                      </p>
                    </button>
                  );
                }
              )}
            </section>

          </div>


        </div>
      </section>


      {/* =====================================================
          LOCAL DASHBOARD DESIGN SYSTEM
          ===================================================== */}

      <style>
        {`

        .dashboard-reference-textarea {
          display:
            block;

          width:
            100%;

          height:
            44px;

          min-height:
            44px;

          max-height:
            112px;

          margin:
            0;

          padding:
            10px 8px;

          resize:
            none;

          overflow-y:
            auto;

          border:
            0 !important;

          outline:
            0 !important;

          background:
            transparent !important;

          box-shadow:
            none !important;

          color:
            #D1D2D6 !important;

          font-size:
            14px;

          line-height:
            24px;

          appearance:
            none;

          -webkit-appearance:
            none;
        }


        .dashboard-reference-textarea:focus,
        .dashboard-reference-textarea:focus-visible {
          border:
            0 !important;

          outline:
            0 !important;

          box-shadow:
            none !important;

          background:
            transparent !important;
        }


        .dashboard-reference-textarea::placeholder {
          color:
            rgba(
              152,
              155,
              159,
              0.70
            ) !important;

          opacity:
            1;
        }


        @media (
          max-width:
          1280px
        ) {

          main[data-voice-region="Dashboard"] {
            overflow-y:
              auto !important;
          }

        }

        `}
      </style>
    </main>
  );
}




