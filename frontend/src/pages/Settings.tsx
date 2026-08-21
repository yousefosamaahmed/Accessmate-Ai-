// src/pages/Settings.tsx

import {
  type ComponentType,
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Accessibility,
  AlertTriangle,
  CheckCircle2,
  Contrast,
  ExternalLink,
  Languages,
  Loader2,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Settings as SettingsIcon,
  Trash2,
  Type,
  Unlink,
  UserRoundCog,
  Users,
  Volume2,
} from "lucide-react";

import {
  api,
  getApiError,
  unwrapResponse,
} from "../lib/api";


/* =========================================================
   TYPES
   ========================================================= */

type SettingsSection =
  | "accessibility"
  | "caregivers"
  | "telegram";


type UserMode =
  | "standard"
  | "blind"
  | "low_vision"
  | "deaf_hard_of_hearing"
  | "reading_difficulty"
  | "combined";


type PreferredLanguage =
  | "en"
  | "ar";


type TextSize =
  | "normal"
  | "large"
  | "extra_large";


type AccessibilityPreferences = {
  userMode: UserMode;

  preferredLanguage:
    PreferredLanguage;

  voiceGuidance:
    boolean;

  textSize:
    TextSize;

  highContrast:
    boolean;

  screenReaderDefault:
    boolean;
};


type CaregiverData = {
  id: string;

  user_id?: string;

  full_name: string;

  relationship?: string | null;

  phone_number?: string | null;

  telegram_chat_id?: string | null;

  whatsapp_number?: string | null;

  preferred_channel?: string;

  is_primary: boolean;

  is_active: boolean;

  created_at?: string;

  updated_at?: string;
};


type CaregiverForm = {
  full_name: string;

  relationship: string;

  phone_number: string;

  is_primary: boolean;

  is_active: boolean;
};


type TelegramConnectData = {
  status?: string;

  connected: boolean;

  telegram_bot_username?: string;

  connect_token?: string;

  connect_url?: string;

  telegram_chat_id?: string | null;

  caregiver_id?: string | null;

  instructions_ar?: string;

  instructions_en?: string;
};


type TelegramSyncData = {
  connected: boolean;

  status?: string;

  telegram_chat_id?: string | null;

  caregiver_id?: string | null;

  message?: string;
};


/* =========================================================
   STORAGE
   ========================================================= */

const PREFS_KEY =
  "accessmate_accessibility_preferences";

const VOICE_KEY =
  "accessmate_screen_reader";

const LANGUAGE_KEY =
  "accessmate_language";


const DEFAULT_PREFS:
  AccessibilityPreferences = {
    userMode:
      "standard",

    preferredLanguage:
      "en",

    voiceGuidance:
      false,

    textSize:
      "normal",

    highContrast:
      false,

    screenReaderDefault:
      false,
  };


const EMPTY_CAREGIVER:
  CaregiverForm = {
    full_name:
      "",

    relationship:
      "",

    phone_number:
      "",

    is_primary:
      false,

    is_active:
      true,
  };


/* =========================================================
   ACCESSIBILITY HELPERS
   ========================================================= */

function loadPreferences():
  AccessibilityPreferences {

  try {

    const raw =
      localStorage.getItem(
        PREFS_KEY
      );


    const parsed =
      raw
        ? JSON.parse(raw)
        : {};


    const storedVoice =
      localStorage.getItem(
        VOICE_KEY
      );


    const storedLanguage =
      localStorage.getItem(
        LANGUAGE_KEY
      );


    const voiceGuidance =
      storedVoice === null
        ? Boolean(
            parsed.voiceGuidance ??
            parsed.screenReaderDefault ??
            DEFAULT_PREFS.voiceGuidance
          )
        : storedVoice === "true";


    const preferredLanguage:
      PreferredLanguage =
      storedLanguage === "ar"
        ? "ar"
        : parsed.preferredLanguage === "ar"
          ? "ar"
          : "en";


    const userMode:
      UserMode =
      [
        "standard",
        "blind",
        "low_vision",
        "deaf_hard_of_hearing",
        "reading_difficulty",
        "combined",
      ].includes(
        parsed.userMode
      )
        ? parsed.userMode
        : "standard";


    const textSize:
      TextSize =
      [
        "normal",
        "large",
        "extra_large",
      ].includes(
        parsed.textSize
      )
        ? parsed.textSize
        : "normal";


    return {
      ...DEFAULT_PREFS,
      ...parsed,

      userMode,

      textSize,

      preferredLanguage,

      voiceGuidance,

      screenReaderDefault:
        voiceGuidance,
    };

  } catch {

    return {
      ...DEFAULT_PREFS,
    };

  }
}


function ensureGlobalAccessibilityStyles() {

  const id =
    "accessmate-global-accessibility-styles";


  if (
    document.getElementById(
      id
    )
  ) {
    return;
  }


  const style =
    document.createElement(
      "style"
    );


  style.id =
    id;


  style.textContent = `
    html[data-accessmate-text-size="normal"] {
      font-size: 16px;
    }

    html[data-accessmate-text-size="large"] {
      font-size: 18px;
    }

    html[data-accessmate-text-size="extra_large"] {
      font-size: 20px;
    }

    body.accessmate-high-contrast {
      filter: contrast(1.13);
    }

    body.accessmate-high-contrast :focus-visible {
      outline: 3px solid #38bdf8 !important;
      outline-offset: 3px !important;
    }
  `;


  document.head.appendChild(
    style
  );
}


function applyPreferences(
  preferences:
    AccessibilityPreferences,
  persist =
    true
) {

  const normalized:
    AccessibilityPreferences = {
      ...preferences,

      screenReaderDefault:
        preferences.voiceGuidance,
    };


  ensureGlobalAccessibilityStyles();


  document.documentElement.lang =
    normalized.preferredLanguage === "ar"
      ? "ar"
      : "en";


  document.documentElement.dir =
    normalized.preferredLanguage === "ar"
      ? "rtl"
      : "ltr";


  document.documentElement.setAttribute(
    "data-accessmate-text-size",
    normalized.textSize
  );


  document.body.classList.toggle(
    "accessmate-high-contrast",
    normalized.highContrast
  );


  document.body.setAttribute(
    "data-accessmate-user-mode",
    normalized.userMode
  );


  if (
    persist
  ) {

    localStorage.setItem(
      PREFS_KEY,
      JSON.stringify(
        normalized
      )
    );


    localStorage.setItem(
      VOICE_KEY,
      String(
        normalized.voiceGuidance
      )
    );


    localStorage.setItem(
      LANGUAGE_KEY,
      normalized.preferredLanguage
    );

  }


  window.dispatchEvent(
    new Event(
      "accessmate-voice-guidance-changed"
    )
  );


  window.dispatchEvent(
    new CustomEvent(
      "accessmate-public-language-change",
      {
        detail: {
          language:
            normalized.preferredLanguage,
        },
      }
    )
  );


  window.dispatchEvent(
    new CustomEvent(
      "accessmate-settings-updated",
      {
        detail:
          normalized,
      }
    )
  );


  return normalized;
}


function speakConfirmation(
  text:
    string,
  language:
    PreferredLanguage
) {

  if (
    !(
      "speechSynthesis" in window
    )
  ) {
    return;
  }


  try {

    window.speechSynthesis.cancel();


    const utterance =
      new SpeechSynthesisUtterance(
        text
      );


    utterance.lang =
      language === "ar"
        ? "ar-EG"
        : "en-US";


    utterance.rate =
      0.92;


    window.speechSynthesis.speak(
      utterance
    );

  } catch {

    // Speech synthesis is optional.

  }
}


/* =========================================================
   API HELPERS
   ========================================================= */

function extractArray(
  payload:
    any
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
      payload?.data
    )
  ) {
    return payload.data;
  }


  if (
    Array.isArray(
      payload?.caregivers
    )
  ) {
    return payload.caregivers;
  }


  return [];
}


/* =========================================================
   SETTINGS PAGE
   ========================================================= */

const Settings = () => {

  const [
    activeSection,
    setActiveSection,
  ] =
    useState<SettingsSection>(
      "accessibility"
    );


  const [
    prefs,
    setPrefs,
  ] =
    useState<AccessibilityPreferences>(
      loadPreferences
    );


  const [
    caregivers,
    setCaregivers,
  ] =
    useState<
      CaregiverData[]
    >([]);


  const [
    caregiverForm,
    setCaregiverForm,
  ] =
    useState<CaregiverForm>({
      ...EMPTY_CAREGIVER,
    });


  const [
    editingCaregiverId,
    setEditingCaregiverId,
  ] =
    useState<
      string | null
    >(
      null
    );


  const [
    telegram,
    setTelegram,
  ] =
    useState<
      TelegramConnectData | null
    >(
      null
    );


  const [
    initialLoading,
    setInitialLoading,
  ] =
    useState(
      true
    );


  const [
    savingAccessibility,
    setSavingAccessibility,
  ] =
    useState(
      false
    );


  const [
    caregiverBusy,
    setCaregiverBusy,
  ] =
    useState(
      false
    );


  const [
    telegramBusy,
    setTelegramBusy,
  ] =
    useState(
      false
    );


  const [
    message,
    setMessage,
  ] =
    useState(
      ""
    );


  const [
    error,
    setError,
  ] =
    useState(
      ""
    );


  const isArabic =
    prefs.preferredLanguage ===
    "ar";


  const txt = (
    english:
      string,
    arabic:
      string
  ) =>
    isArabic
      ? arabic
      : english;


  /* =====================================================
     INITIAL LOAD
     ===================================================== */

  useEffect(
    () => {

      applyPreferences(
        prefs,
        false
      );


      void loadInitialData();

      // Intentionally initial load only.
      // eslint-disable-next-line react-hooks/exhaustive-deps

    },
    []
  );


  async function loadInitialData() {

    setInitialLoading(
      true
    );


    await Promise.allSettled([
      loadCaregivers(),
      loadTelegramStatus(),
    ]);


    setInitialLoading(
      false
    );

  }


  function clearAlerts() {

    setMessage(
      ""
    );

    setError(
      ""
    );

  }


  /* =====================================================
     ACCESSIBILITY
     ===================================================== */

  function commitPreferenceState(
    next:
      AccessibilityPreferences,
    speakText?:
      string
  ) {

    const normalized =
      applyPreferences(
        next,
        true
      );


    setPrefs(
      normalized
    );


    if (
      speakText &&
      normalized.voiceGuidance
    ) {

      window.setTimeout(
        () =>
          speakConfirmation(
            speakText,
            normalized.preferredLanguage
          ),
        80
      );

    }
  }


  function handleUserModeChange(
    value:
      UserMode
  ) {

    clearAlerts();


    let next:
      AccessibilityPreferences = {
        ...prefs,

        userMode:
          value,
      };


    switch (
      value
    ) {

      case "blind":

        next = {
          ...next,

          voiceGuidance:
            true,

          screenReaderDefault:
            true,

          highContrast:
            true,

          textSize:
            "large",
        };


        commitPreferenceState(
          next,
          isArabic
            ? "تم تفعيل وضع المكفوفين. تم تشغيل الإرشاد الصوتي والتباين العالي."
            : "Blind mode enabled. Voice Guidance and High Contrast are now active."
        );


        setMessage(
          txt(
            "Blind mode enabled with Voice Guidance, High Contrast, and larger text.",
            "تم تفعيل وضع المكفوفين مع الإرشاد الصوتي والتباين العالي والنص الأكبر."
          )
        );

        return;


      case "low_vision":

        next = {
          ...next,

          textSize:
            "extra_large",

          highContrast:
            true,
        };


        commitPreferenceState(
          next
        );


        setMessage(
          txt(
            "Low Vision mode enabled with Extra Large Text and High Contrast.",
            "تم تفعيل وضع ضعف البصر مع النص الكبير جدًا والتباين العالي."
          )
        );

        return;


      case "deaf_hard_of_hearing":

        next = {
          ...next,

          voiceGuidance:
            false,

          screenReaderDefault:
            false,
        };


        commitPreferenceState(
          next
        );


        setMessage(
          txt(
            "Deaf / Hard of Hearing mode enabled. Voice Guidance has been disabled.",
            "تم تفعيل وضع الصم وضعاف السمع وتم إيقاف الإرشاد الصوتي."
          )
        );

        return;


      case "reading_difficulty":

        next = {
          ...next,

          textSize:
            "large",
        };


        commitPreferenceState(
          next
        );


        setMessage(
          txt(
            "Reading Difficulty mode enabled with larger text.",
            "تم تفعيل وضع صعوبة القراءة مع تكبير النص."
          )
        );

        return;


      case "combined":

        next = {
          ...next,

          voiceGuidance:
            true,

          screenReaderDefault:
            true,

          textSize:
            "extra_large",

          highContrast:
            true,
        };


        commitPreferenceState(
          next,
          isArabic
            ? "تم تفعيل وضع الاحتياجات المتعددة."
            : "Combined accessibility mode enabled."
        );


        setMessage(
          txt(
            "Combined mode enabled with Voice Guidance, Extra Large Text, and High Contrast.",
            "تم تفعيل وضع الاحتياجات المتعددة مع الإرشاد الصوتي والنص الكبير جدًا والتباين العالي."
          )
        );

        return;


      case "standard":

      default:

        next = {
          ...DEFAULT_PREFS,

          preferredLanguage:
            prefs.preferredLanguage,

          userMode:
            "standard",
        };


        commitPreferenceState(
          next
        );


        setMessage(
          txt(
            "Standard accessibility mode restored.",
            "تم استعادة وضع إمكانية الوصول القياسي."
          )
        );

    }
  }


  function handleLanguageChange(
    value:
      PreferredLanguage
  ) {

    clearAlerts();


    const next:
      AccessibilityPreferences = {
        ...prefs,

        preferredLanguage:
          value,
      };


    commitPreferenceState(
      next,
      next.voiceGuidance
        ? value === "ar"
          ? "تم تغيير لغة AccessMate إلى العربية."
          : "AccessMate language changed to English."
        : undefined
    );

  }


  function handleTextSizeChange(
    value:
      TextSize
  ) {

    clearAlerts();


    commitPreferenceState({
      ...prefs,

      textSize:
        value,
    });

  }


  function handleVoiceGuidanceChange(
    value:
      boolean
  ) {

    clearAlerts();


    const next:
      AccessibilityPreferences = {
        ...prefs,

        voiceGuidance:
          value,

        screenReaderDefault:
          value,
      };


    commitPreferenceState(
      next,
      value
        ? prefs.preferredLanguage === "ar"
          ? "تم تشغيل الإرشاد الصوتي."
          : "Voice Guidance is now on."
        : undefined
    );

  }


  function handleHighContrastChange(
    value:
      boolean
  ) {

    clearAlerts();


    commitPreferenceState({
      ...prefs,

      highContrast:
        value,
    });

  }


  async function saveAccessibility(
    event:
      FormEvent
  ) {

    event.preventDefault();


    setSavingAccessibility(
      true
    );


    clearAlerts();


    try {

      const normalized =
        applyPreferences(
          prefs,
          true
        );


      setPrefs(
        normalized
      );


      setMessage(
        normalized.preferredLanguage === "ar"
          ? "تم حفظ وتطبيق إعدادات إمكانية الوصول على هذا الجهاز."
          : "Accessibility settings were saved and applied on this device."
      );

    } catch (
      err
    ) {

      setError(
        err instanceof Error
          ? err.message
          : txt(
              "Failed to save accessibility settings.",
              "تعذر حفظ إعدادات إمكانية الوصول."
            )
      );

    } finally {

      setSavingAccessibility(
        false
      );

    }
  }


  function resetAccessibility() {

    clearAlerts();


    const language =
      prefs.preferredLanguage;


    const next:
      AccessibilityPreferences = {
        ...DEFAULT_PREFS,

        preferredLanguage:
          language,
      };


    commitPreferenceState(
      next
    );


    setMessage(
      txt(
        "Accessibility preferences were reset.",
        "تمت إعادة ضبط تفضيلات إمكانية الوصول."
      )
    );

  }


  /* =====================================================
     CAREGIVERS
     ===================================================== */

  async function loadCaregivers() {

    try {

      const response =
        await api.get(
          "/caregivers"
        );


      const payload =
        unwrapResponse<any>(
          response
        );


      const rows =
        extractArray(
          payload
        ) as CaregiverData[];


      setCaregivers(
        rows
      );

    } catch (
      err
    ) {

      console.error(
        "Failed to load caregivers:",
        err
      );


      setError(
        getApiError(
          err
        )
      );

    }
  }


  function startNewCaregiver() {

    clearAlerts();


    setEditingCaregiverId(
      null
    );


    setCaregiverForm({
      ...EMPTY_CAREGIVER,

      is_primary:
        caregivers.length === 0,
    });

  }


  function startEditCaregiver(
    caregiver:
      CaregiverData
  ) {

    clearAlerts();


    setEditingCaregiverId(
      caregiver.id
    );


    setCaregiverForm({
      full_name:
        caregiver.full_name ||
        "",

      relationship:
        caregiver.relationship ||
        "",

      phone_number:
        caregiver.phone_number ||
        "",

      is_primary:
        Boolean(
          caregiver.is_primary
        ),

      is_active:
        Boolean(
          caregiver.is_active
        ),
    });

  }


  async function saveCaregiver(
    event:
      FormEvent
  ) {

    event.preventDefault();


    clearAlerts();


    const fullName =
      caregiverForm
        .full_name
        .trim();


    const phone =
      caregiverForm
        .phone_number
        .trim();


    if (
      !fullName
    ) {

      setError(
        txt(
          "Caregiver name is required.",
          "اسم مقدم الرعاية مطلوب."
        )
      );

      return;

    }


    if (
      !editingCaregiverId &&
      !phone
    ) {

      setError(
        txt(
          "Enter a phone number first. Telegram can be linked after the caregiver is saved.",
          "أدخل رقم هاتف أولًا. يمكنك ربط تيليجرام بعد حفظ مقدم الرعاية."
        )
      );

      return;

    }


    const existing =
      editingCaregiverId
        ? caregivers.find(
            (
              item
            ) =>
              item.id ===
              editingCaregiverId
          )
        : null;


    if (
      editingCaregiverId &&
      !phone &&
      !existing?.telegram_chat_id
    ) {

      setError(
        txt(
          "This caregiver needs a phone number or an existing Telegram connection.",
          "يجب أن يكون لدى مقدم الرعاية رقم هاتف أو اتصال تيليجرام موجود."
        )
      );

      return;

    }


    const body:
      Record<
        string,
        unknown
      > = {

        full_name:
          fullName,

        relationship:
          caregiverForm
            .relationship
            .trim() ||
          null,

        phone_number:
          phone ||
          null,

        /*
         * Telegram is the only alert delivery channel exposed
         * in Settings because it is the currently implemented
         * integration in this page/backend workflow.
         */
        preferred_channel:
          "telegram",

        is_primary:
          caregiverForm
            .is_primary,

        is_active:
          caregiverForm
            .is_active,
      };


    if (
      existing?.telegram_chat_id
    ) {

      body.telegram_chat_id =
        existing.telegram_chat_id;

    }


    setCaregiverBusy(
      true
    );


    try {

      if (
        editingCaregiverId
      ) {

        await api.patch(
          `/caregivers/${editingCaregiverId}`,
          body
        );


        setMessage(
          txt(
            "Caregiver updated successfully.",
            "تم تحديث مقدم الرعاية بنجاح."
          )
        );

      } else {

        await api.post(
          "/caregivers",
          body
        );


        setMessage(
          txt(
            "Caregiver added successfully.",
            "تمت إضافة مقدم الرعاية بنجاح."
          )
        );

      }


      setEditingCaregiverId(
        null
      );


      setCaregiverForm({
        ...EMPTY_CAREGIVER,
      });


      await Promise.allSettled([
        loadCaregivers(),
        loadTelegramStatus(),
      ]);

    } catch (
      err
    ) {

      setError(
        getApiError(
          err
        )
      );

    } finally {

      setCaregiverBusy(
        false
      );

    }
  }


  async function deleteCaregiver(
    caregiver:
      CaregiverData
  ) {

    clearAlerts();


    const confirmed =
      window.confirm(
        isArabic
          ? `هل تريد حذف مقدم الرعاية "${caregiver.full_name}"؟`
          : `Delete caregiver "${caregiver.full_name}"?`
      );


    if (
      !confirmed
    ) {
      return;
    }


    try {

      await api.delete(
        `/caregivers/${caregiver.id}`
      );


      if (
        editingCaregiverId ===
        caregiver.id
      ) {

        setEditingCaregiverId(
          null
        );


        setCaregiverForm({
          ...EMPTY_CAREGIVER,
        });

      }


      await Promise.allSettled([
        loadCaregivers(),
        loadTelegramStatus(),
      ]);


      setMessage(
        txt(
          "Caregiver deleted successfully.",
          "تم حذف مقدم الرعاية بنجاح."
        )
      );

    } catch (
      err
    ) {

      setError(
        getApiError(
          err
        )
      );

    }
  }


  /* =====================================================
     TELEGRAM
     ===================================================== */

  async function loadTelegramStatus() {

    try {

      const response =
        await api.get(
          "/telegram/connect-link"
        );


      const payload =
        unwrapResponse<TelegramConnectData>(
          response
        );


      setTelegram(
        payload
      );

    } catch (
      err
    ) {

      console.error(
        "Failed to load Telegram status:",
        err
      );


      setError(
        getApiError(
          err
        )
      );

    }
  }


  async function connectTelegram() {

    clearAlerts();


    setTelegramBusy(
      true
    );


    try {

      const response =
        await api.get(
          "/telegram/connect-link"
        );


      const payload =
        unwrapResponse<TelegramConnectData>(
          response
        );


      setTelegram(
        payload
      );


      if (
        payload.connected
      ) {

        setMessage(
          txt(
            "Telegram is already connected.",
            "تيليجرام متصل بالفعل."
          )
        );

        return;

      }


      if (
        !payload.connect_url
      ) {

        throw new Error(
          txt(
            "Telegram connection URL was not returned.",
            "لم يتم إرجاع رابط اتصال تيليجرام."
          )
        );

      }


      window.open(
        payload.connect_url,
        "_blank",
        "noopener,noreferrer"
      );


      setMessage(
        txt(
          "Telegram opened. Press Start in the bot, return here, then press Check Connection.",
          "تم فتح تيليجرام. اضغط Start داخل البوت، ثم ارجع هنا واضغط التحقق من الاتصال."
        )
      );

    } catch (
      err
    ) {

      setError(
        getApiError(
          err
        )
      );

    } finally {

      setTelegramBusy(
        false
      );

    }
  }


  async function syncTelegram() {

    clearAlerts();


    setTelegramBusy(
      true
    );


    try {

      const response =
        await api.post(
          "/telegram/sync"
        );


      const payload =
        unwrapResponse<TelegramSyncData>(
          response
        );


      if (
        payload.connected === true
      ) {

        await Promise.allSettled([
          loadTelegramStatus(),
          loadCaregivers(),
        ]);


        setMessage(
          txt(
            "Telegram connected successfully. Care alerts are ready.",
            "تم ربط تيليجرام بنجاح. تنبيهات الرعاية جاهزة الآن."
          )
        );


        if (
          prefs.voiceGuidance
        ) {

          speakConfirmation(
            txt(
              "Telegram connected successfully.",
              "تم ربط تيليجرام بنجاح."
            ),
            prefs.preferredLanguage
          );

        }


        return;

      }


      if (
        payload.status ===
        "waiting_for_start"
      ) {

        setError(
          txt(
            "Telegram is not connected yet. Open the bot, press Start, then check again.",
            "تيليجرام غير متصل حتى الآن. افتح البوت واضغط Start ثم تحقق مرة أخرى."
          )
        );

        return;

      }


      setError(
        payload.message ||
        txt(
          "Telegram connection could not be confirmed.",
          "تعذر تأكيد اتصال تيليجرام."
        )
      );

    } catch (
      err
    ) {

      setError(
        getApiError(
          err
        )
      );

    } finally {

      setTelegramBusy(
        false
      );

    }
  }


  async function disconnectTelegram() {

    clearAlerts();


    const confirmed =
      window.confirm(
        txt(
          "Disconnect Telegram from AccessMate?",
          "هل تريد فصل تيليجرام عن AccessMate؟"
        )
      );


    if (
      !confirmed
    ) {
      return;
    }


    setTelegramBusy(
      true
    );


    try {

      await api.post(
        "/telegram/disconnect"
      );


      await Promise.allSettled([
        loadTelegramStatus(),
        loadCaregivers(),
      ]);


      setMessage(
        txt(
          "Telegram disconnected.",
          "تم فصل تيليجرام."
        )
      );

    } catch (
      err
    ) {

      setError(
        getApiError(
          err
        )
      );

    } finally {

      setTelegramBusy(
        false
      );

    }
  }


  /* =====================================================
     DERIVED DATA
     ===================================================== */

  const primaryCaregiver =
    useMemo(
      () =>
        caregivers.find(
          (
            caregiver
          ) =>
            caregiver.is_primary &&
            caregiver.is_active
        ) ||
        caregivers.find(
          (
            caregiver
          ) =>
            caregiver.is_active
        ) ||
        null,
      [
        caregivers,
      ]
    );


  /* =====================================================
     UI
     ===================================================== */

  return (
    <main
      dir={
        isArabic
          ? "rtl"
          : "ltr"
      }
      data-voice-region="Settings"
      aria-label={
        txt(
          "Settings",
          "الإعدادات"
        )
      }
      className="
        settings-page
        h-full
        min-h-0
        w-full
        overflow-y-auto
        text-white
      "
    >

      <div
        className="
          min-h-full
          w-full
          bg-slate-950/55
          px-5
          py-6
          backdrop-blur-[2px]
          lg:px-7
          lg:py-7
        "
      >

        <div
          className="
            mx-auto
            w-full
            max-w-[1500px]
            pb-10
          "
        >

          {/* =================================================
              HEADER
              ================================================= */}

          <header
            className="
              flex
              flex-col
              gap-5
              border-b
              border-sky-400/[0.12]
              pb-5
              xl:flex-row
              xl:items-end
              xl:justify-between
            "
          >

            <div>

              <span
                className="
                  inline-flex
                  items-center
                  gap-2
                  rounded-full
                  border
                  border-sky-400/25
                  bg-sky-400/[0.07]
                  px-3.5
                  py-2
                  text-[12px]
                  font-bold
                  uppercase
                  tracking-[0.14em]
                  text-sky-300
                "
              >

                <SettingsIcon
                  className="
                    h-4
                    w-4
                  "
                />

                {txt(
                  "Adaptive Preferences",
                  "التفضيلات التكيفية"
                )}

              </span>


              <h1
                className="
                  mt-4
                  text-4xl
                  font-black
                  tracking-[-0.035em]
                  text-white
                "
              >
                {txt(
                  "Settings",
                  "الإعدادات"
                )}
              </h1>


              <p
                className="
                  mt-2
                  max-w-3xl
                  text-[15px]
                  leading-7
                  text-slate-400
                "
              >
                {txt(
                  "Manage accessibility preferences, trusted caregivers, and Telegram care alerts.",
                  "أدر إعدادات إمكانية الوصول ومقدمي الرعاية الموثوقين وتنبيهات الرعاية عبر تيليجرام."
                )}
              </p>

            </div>


            <div
              className="
                grid
                grid-cols-1
                gap-2
                sm:grid-cols-3
              "
            >

              <SummaryChip
                label={
                  txt(
                    "Caregivers",
                    "مقدمو الرعاية"
                  )
                }
                value={
                  String(
                    caregivers.length
                  )
                }
              />


              <SummaryChip
                label={
                  txt(
                    "Primary",
                    "الأساسي"
                  )
                }
                value={
                  primaryCaregiver
                    ?.full_name ||
                  txt(
                    "Not configured",
                    "غير محدد"
                  )
                }
              />


              <SummaryChip
                label="Telegram"
                value={
                  telegram?.connected
                    ? txt(
                        "Connected",
                        "متصل"
                      )
                    : txt(
                        "Not connected",
                        "غير متصل"
                      )
                }
              />

            </div>

          </header>


          {/* =================================================
              NOTICES
              ================================================= */}

          <div
            aria-live="polite"
            aria-atomic="true"
            className="
              mt-4
              space-y-3
            "
          >

            {initialLoading && (
              <Notice
                loading
                text={
                  txt(
                    "Loading settings...",
                    "جاري تحميل الإعدادات..."
                  )
                }
              />
            )}


            {message && (
              <Notice
                success
                text={
                  message
                }
              />
            )}


            {error && (
              <Notice
                error
                text={
                  error
                }
              />
            )}

          </div>


          {/* =================================================
              NAVIGATION
              ================================================= */}

          <nav
            aria-label={
              txt(
                "Settings sections",
                "أقسام الإعدادات"
              )
            }
            className="
              mt-5
              grid
              grid-cols-1
              gap-2
              rounded-[22px]
              border
              border-sky-400/[0.12]
              bg-[#06111b]/85
              p-2
              shadow-[0_18px_60px_rgba(0,0,0,0.18)]
              backdrop-blur-xl
              sm:grid-cols-3
            "
          >

            <SettingsTab
              active={
                activeSection ===
                "accessibility"
              }
              icon={
                Accessibility
              }
              title={
                txt(
                  "Accessibility",
                  "إمكانية الوصول"
                )
              }
              description={
                txt(
                  "Mode, language, text and voice",
                  "الوضع واللغة والنص والصوت"
                )
              }
              onClick={() =>
                setActiveSection(
                  "accessibility"
                )
              }
            />


            <SettingsTab
              active={
                activeSection ===
                "caregivers"
              }
              icon={
                Users
              }
              title={
                txt(
                  "Caregivers",
                  "مقدمو الرعاية"
                )
              }
              description={
                txt(
                  "Manage trusted support contacts",
                  "إدارة جهات الرعاية الموثوقة"
                )
              }
              onClick={() =>
                setActiveSection(
                  "caregivers"
                )
              }
            />


            <SettingsTab
              active={
                activeSection ===
                "telegram"
              }
              icon={
                MessageCircle
              }
              title="Telegram"
              description={
                txt(
                  "Configure real care alert delivery",
                  "إعداد إرسال تنبيهات الرعاية"
                )
              }
              onClick={() =>
                setActiveSection(
                  "telegram"
                )
              }
            />

          </nav>


          {/* =================================================
              ACCESSIBILITY
              ================================================= */}

          {activeSection ===
            "accessibility" && (

            <form
              onSubmit={
                saveAccessibility
              }
              className="
                mt-5
                rounded-[26px]
                border
                border-sky-400/[0.13]
                bg-[#07131f]/85
                p-5
                shadow-[0_22px_70px_rgba(0,0,0,0.25)]
                backdrop-blur-xl
                lg:p-7
              "
            >

              <PanelHeading
                icon={
                  Accessibility
                }
                title={
                  txt(
                    "Accessibility Profile",
                    "ملف إمكانية الوصول"
                  )
                }
                description={
                  txt(
                    "Every option below applies a real interface or guidance change.",
                    "كل خيار بالأسفل يطبق تغييرًا حقيقيًا في الواجهة أو الإرشاد."
                  )
                }
              />


              <div
                className="
                  mt-6
                  grid
                  gap-4
                  lg:grid-cols-2
                "
              >

                <SelectSetting
                  icon={
                    Accessibility
                  }
                  label={
                    txt(
                      "User Mode",
                      "وضع المستخدم"
                    )
                  }
                  description={
                    txt(
                      "Select a working accessibility preset.",
                      "اختر إعداد إمكانية وصول يتم تطبيقه فعليًا."
                    )
                  }
                  value={
                    prefs.userMode
                  }
                  onChange={(
                    value
                  ) =>
                    handleUserModeChange(
                      value as UserMode
                    )
                  }
                  options={[
                    {
                      value:
                        "standard",

                      label:
                        txt(
                          "Standard",
                          "قياسي"
                        ),
                    },

                    {
                      value:
                        "blind",

                      label:
                        txt(
                          "Blind",
                          "كفيف"
                        ),
                    },

                    {
                      value:
                        "low_vision",

                      label:
                        txt(
                          "Low Vision",
                          "ضعف بصري"
                        ),
                    },

                    {
                      value:
                        "deaf_hard_of_hearing",

                      label:
                        txt(
                          "Deaf / Hard of Hearing",
                          "أصم / ضعيف السمع"
                        ),
                    },

                    {
                      value:
                        "reading_difficulty",

                      label:
                        txt(
                          "Reading Difficulty",
                          "صعوبة في القراءة"
                        ),
                    },

                    {
                      value:
                        "combined",

                      label:
                        txt(
                          "Combined Needs",
                          "احتياجات متعددة"
                        ),
                    },
                  ]}
                />


                <SelectSetting
                  icon={
                    Languages
                  }
                  label={
                    txt(
                      "Preferred Language",
                      "اللغة المفضلة"
                    )
                  }
                  description={
                    txt(
                      "Changes language direction between LTR and RTL immediately.",
                      "يغير اتجاه الصفحة بين LTR وRTL فورًا."
                    )
                  }
                  value={
                    prefs.preferredLanguage
                  }
                  onChange={(
                    value
                  ) =>
                    handleLanguageChange(
                      value as PreferredLanguage
                    )
                  }
                  options={[
                    {
                      value:
                        "en",

                      label:
                        "English",
                    },

                    {
                      value:
                        "ar",

                      label:
                        "العربية",
                    },
                  ]}
                />


                <SelectSetting
                  icon={
                    Type
                  }
                  label={
                    txt(
                      "Text Size",
                      "حجم النص"
                    )
                  }
                  description={
                    txt(
                      "Changes the global application base font size.",
                      "يغير حجم الخط الأساسي في التطبيق بالكامل."
                    )
                  }
                  value={
                    prefs.textSize
                  }
                  onChange={(
                    value
                  ) =>
                    handleTextSizeChange(
                      value as TextSize
                    )
                  }
                  options={[
                    {
                      value:
                        "normal",

                      label:
                        txt(
                          "Normal",
                          "عادي"
                        ),
                    },

                    {
                      value:
                        "large",

                      label:
                        txt(
                          "Large",
                          "كبير"
                        ),
                    },

                    {
                      value:
                        "extra_large",

                      label:
                        txt(
                          "Extra Large",
                          "كبير جدًا"
                        ),
                    },
                  ]}
                />


                <ToggleSetting
                  icon={
                    Volume2
                  }
                  label={
                    txt(
                      "Voice Guidance",
                      "الإرشاد الصوتي"
                    )
                  }
                  description={
                    txt(
                      "Enables AccessMate voice guidance and browser speech output.",
                      "يفعّل الإرشاد الصوتي والنطق عبر المتصفح."
                    )
                  }
                  value={
                    prefs.voiceGuidance
                  }
                  onChange={
                    handleVoiceGuidanceChange
                  }
                  onLabel={
                    txt(
                      "On",
                      "مفعّل"
                    )
                  }
                  offLabel={
                    txt(
                      "Off",
                      "متوقف"
                    )
                  }
                />


                <ToggleSetting
                  icon={
                    Contrast
                  }
                  label={
                    txt(
                      "High Contrast",
                      "تباين عالٍ"
                    )
                  }
                  description={
                    txt(
                      "Increases application contrast and focus visibility.",
                      "يزيد تباين التطبيق ووضوح عناصر التركيز."
                    )
                  }
                  value={
                    prefs.highContrast
                  }
                  onChange={
                    handleHighContrastChange
                  }
                  onLabel={
                    txt(
                      "On",
                      "مفعّل"
                    )
                  }
                  offLabel={
                    txt(
                      "Off",
                      "متوقف"
                    )
                  }
                />

              </div>


              <div
                className="
                  mt-7
                  flex
                  flex-col
                  gap-3
                  border-t
                  border-sky-400/[0.10]
                  pt-5
                  sm:flex-row
                  sm:items-center
                  sm:justify-between
                "
              >

                <button
                  type="button"
                  onClick={
                    resetAccessibility
                  }
                  className="
                    inline-flex
                    min-h-[46px]
                    items-center
                    justify-center
                    gap-2
                    rounded-[13px]
                    border
                    border-sky-400/15
                    bg-sky-400/[0.03]
                    px-4
                    text-[13px]
                    font-semibold
                    text-slate-300
                    transition
                    hover:border-sky-400/35
                    hover:bg-sky-400/[0.07]
                    hover:text-white
                  "
                >

                  <RotateCcw
                    className="
                      h-4
                      w-4
                    "
                  />

                  {txt(
                    "Reset",
                    "إعادة ضبط"
                  )}

                </button>


                <button
                  type="submit"
                  disabled={
                    savingAccessibility
                  }
                  className="
                    inline-flex
                    min-h-[48px]
                    items-center
                    justify-center
                    gap-2
                    rounded-[14px]
                    border
                    border-sky-300/60
                    bg-[#38bdf8]
                    px-6
                    text-[14px]
                    font-black
                    text-[#03111a]
                    shadow-[0_10px_30px_rgba(56,189,248,0.18)]
                    transition
                    hover:bg-[#67d0fa]
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >

                  {savingAccessibility ? (
                    <Loader2
                      className="
                        h-4
                        w-4
                        animate-spin
                      "
                    />
                  ) : (
                    <Save
                      className="
                        h-4
                        w-4
                      "
                    />
                  )}


                  {txt(
                    "Save Accessibility",
                    "حفظ إعدادات الوصول"
                  )}

                </button>

              </div>

            </form>

          )}


          {/* =================================================
              CAREGIVERS
              ================================================= */}

          {activeSection ===
            "caregivers" && (

            <section
              className="
                mt-5
                grid
                gap-5
                xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]
              "
            >

              <div
                className="
                  rounded-[26px]
                  border
                  border-sky-400/[0.13]
                  bg-[#07131f]/85
                  p-5
                  shadow-[0_22px_70px_rgba(0,0,0,0.25)]
                  backdrop-blur-xl
                  lg:p-7
                "
              >

                <div
                  className="
                    flex
                    items-start
                    justify-between
                    gap-4
                  "
                >

                  <PanelHeading
                    icon={
                      Users
                    }
                    title={
                      txt(
                        "Caregivers",
                        "مقدمو الرعاية"
                      )
                    }
                    description={
                      txt(
                        "Manage the trusted contacts used by AccessMate Care Center.",
                        "أدر جهات الرعاية الموثوقة المستخدمة في مركز الرعاية."
                      )
                    }
                  />


                  <button
                    type="button"
                    onClick={
                      startNewCaregiver
                    }
                    className="
                      inline-flex
                      min-h-[40px]
                      shrink-0
                      items-center
                      gap-2
                      rounded-xl
                      border
                      border-sky-400/20
                      bg-sky-400/[0.06]
                      px-3
                      text-[12px]
                      font-bold
                      text-sky-300
                      transition
                      hover:border-sky-400/40
                      hover:bg-sky-400/[0.10]
                    "
                  >

                    <Plus
                      className="
                        h-4
                        w-4
                      "
                    />

                    {txt(
                      "New",
                      "جديد"
                    )}

                  </button>

                </div>


                <div
                  className="
                    mt-6
                    space-y-3
                  "
                >

                  {caregivers.length === 0 ? (

                    <EmptyState
                      text={
                        txt(
                          "No caregivers have been added yet.",
                          "لم تتم إضافة مقدم رعاية حتى الآن."
                        )
                      }
                    />

                  ) : (

                    caregivers.map(
                      (
                        caregiver
                      ) => (

                        <CaregiverRow
                          key={
                            caregiver.id
                          }
                          caregiver={
                            caregiver
                          }
                          language={
                            prefs.preferredLanguage
                          }
                          onEdit={() =>
                            startEditCaregiver(
                              caregiver
                            )
                          }
                          onDelete={() =>
                            void deleteCaregiver(
                              caregiver
                            )
                          }
                        />

                      )
                    )

                  )}

                </div>

              </div>


              <form
                onSubmit={
                  saveCaregiver
                }
                className="
                  rounded-[26px]
                  border
                  border-sky-400/[0.13]
                  bg-[#07131f]/85
                  p-5
                  shadow-[0_22px_70px_rgba(0,0,0,0.25)]
                  backdrop-blur-xl
                  lg:p-7
                "
              >

                <PanelHeading
                  icon={
                    editingCaregiverId
                      ? Pencil
                      : Plus
                  }
                  title={
                    editingCaregiverId
                      ? txt(
                          "Edit Caregiver",
                          "تعديل مقدم الرعاية"
                        )
                      : txt(
                          "Add Caregiver",
                          "إضافة مقدم رعاية"
                        )
                  }
                  description={
                    txt(
                      "Create or update a trusted support contact.",
                      "أضف أو عدّل جهة دعم موثوقة."
                    )
                  }
                />


                <div
                  className="
                    mt-6
                    space-y-4
                  "
                >

                  <Field
                    label={
                      txt(
                        "Full Name",
                        "الاسم الكامل"
                      )
                    }
                  >

                    <input
                      value={
                        caregiverForm.full_name
                      }
                      onChange={(
                        event
                      ) =>
                        setCaregiverForm(
                          (
                            current
                          ) => ({
                            ...current,

                            full_name:
                              event.target.value,
                          })
                        )
                      }
                      placeholder={
                        txt(
                          "Caregiver name",
                          "اسم مقدم الرعاية"
                        )
                      }
                      autoComplete="name"
                    />

                  </Field>


                  <Field
                    label={
                      txt(
                        "Relationship",
                        "صلة القرابة"
                      )
                    }
                  >

                    <input
                      value={
                        caregiverForm.relationship
                      }
                      onChange={(
                        event
                      ) =>
                        setCaregiverForm(
                          (
                            current
                          ) => ({
                            ...current,

                            relationship:
                              event.target.value,
                          })
                        )
                      }
                      placeholder={
                        txt(
                          "Parent, sibling, friend...",
                          "أب، أم، أخ، صديق..."
                        )
                      }
                    />

                  </Field>


                  <Field
                    label={
                      txt(
                        "Phone Number",
                        "رقم الهاتف"
                      )
                    }
                  >

                    <input
                      type="tel"
                      value={
                        caregiverForm.phone_number
                      }
                      onChange={(
                        event
                      ) =>
                        setCaregiverForm(
                          (
                            current
                          ) => ({
                            ...current,

                            phone_number:
                              event.target.value,
                          })
                        )
                      }
                      placeholder="+20..."
                      autoComplete="tel"
                    />

                  </Field>


                  <div
                    className="
                      rounded-[14px]
                      border
                      border-sky-400/12
                      bg-sky-400/[0.035]
                      px-4
                      py-3
                    "
                  >

                    <p
                      className="
                        text-[11px]
                        font-bold
                        uppercase
                        tracking-[0.08em]
                        text-sky-300
                      "
                    >
                      {txt(
                        "Alert Delivery",
                        "إرسال التنبيهات"
                      )}
                    </p>


                    <p
                      className="
                        mt-1
                        text-[12px]
                        leading-5
                        text-slate-400
                      "
                    >
                      {txt(
                        "Telegram is currently the active AccessMate caregiver alert channel.",
                        "تيليجرام هو قناة تنبيهات مقدمي الرعاية المفعلة حاليًا في AccessMate."
                      )}
                    </p>

                  </div>


                  <ToggleSettingSimple
                    label={
                      txt(
                        "Primary Caregiver",
                        "مقدم الرعاية الأساسي"
                      )
                    }
                    value={
                      caregiverForm.is_primary
                    }
                    onChange={(
                      value
                    ) =>
                      setCaregiverForm(
                        (
                          current
                        ) => ({
                          ...current,

                          is_primary:
                            value,
                        })
                      )
                    }
                  />


                  <ToggleSettingSimple
                    label={
                      txt(
                        "Active Caregiver",
                        "مقدم رعاية نشط"
                      )
                    }
                    value={
                      caregiverForm.is_active
                    }
                    onChange={(
                      value
                    ) =>
                      setCaregiverForm(
                        (
                          current
                        ) => ({
                          ...current,

                          is_active:
                            value,
                        })
                      )
                    }
                  />


                  <button
                    type="submit"
                    disabled={
                      caregiverBusy
                    }
                    className="
                      inline-flex
                      min-h-[48px]
                      w-full
                      items-center
                      justify-center
                      gap-2
                      rounded-[14px]
                      border
                      border-sky-300/60
                      bg-[#38bdf8]
                      px-5
                      text-[13px]
                      font-black
                      text-[#03111a]
                      shadow-[0_10px_30px_rgba(56,189,248,0.16)]
                      transition
                      hover:bg-[#67d0fa]
                      disabled:cursor-not-allowed
                      disabled:opacity-50
                    "
                  >

                    {caregiverBusy ? (

                      <Loader2
                        className="
                          h-4
                          w-4
                          animate-spin
                        "
                      />

                    ) : (

                      <Save
                        className="
                          h-4
                          w-4
                        "
                      />

                    )}


                    {editingCaregiverId
                      ? txt(
                          "Save Changes",
                          "حفظ التعديلات"
                        )
                      : txt(
                          "Add Caregiver",
                          "إضافة مقدم الرعاية"
                        )}

                  </button>

                </div>

              </form>

            </section>

          )}


          {/* =================================================
              TELEGRAM
              ================================================= */}

          {activeSection ===
            "telegram" && (

            <section
              className="
                mt-5
                rounded-[26px]
                border
                border-sky-400/[0.13]
                bg-[#07131f]/85
                p-5
                shadow-[0_22px_70px_rgba(0,0,0,0.25)]
                backdrop-blur-xl
                lg:p-7
              "
            >

              <PanelHeading
                icon={
                  MessageCircle
                }
                title="Telegram"
                description={
                  txt(
                    "Connect Telegram to the real AccessMate care alert workflow.",
                    "اربط تيليجرام بمسار تنبيهات الرعاية الفعلي في AccessMate."
                  )
                }
              />


              <div
                className="
                  mt-6
                  grid
                  gap-5
                  lg:grid-cols-[minmax(0,1fr)_380px]
                "
              >

                <div
                  className="
                    rounded-[19px]
                    border
                    border-sky-400/[0.11]
                    bg-black/20
                    p-5
                  "
                >

                  <div
                    className="
                      flex
                      items-start
                      gap-4
                    "
                  >

                    <span
                      className={`
                        flex
                        h-12
                        w-12
                        shrink-0
                        items-center
                        justify-center
                        rounded-full
                        border

                        ${
                          telegram?.connected
                            ? "border-emerald-400/35 bg-emerald-400/[0.08] text-emerald-300"
                            : "border-sky-400/15 bg-sky-400/[0.04] text-sky-300"
                        }
                      `}
                    >

                      {telegram?.connected ? (

                        <CheckCircle2
                          className="
                            h-5
                            w-5
                          "
                        />

                      ) : (

                        <MessageCircle
                          className="
                            h-5
                            w-5
                          "
                        />

                      )}

                    </span>


                    <div>

                      <p
                        className="
                          text-[11px]
                          font-bold
                          uppercase
                          tracking-[0.10em]
                          text-slate-500
                        "
                      >
                        {txt(
                          "Connection Status",
                          "حالة الاتصال"
                        )}
                      </p>


                      <h3
                        className={`
                          mt-1
                          text-xl
                          font-black

                          ${
                            telegram?.connected
                              ? "text-emerald-300"
                              : "text-slate-200"
                          }
                        `}
                      >

                        {telegram?.connected
                          ? txt(
                              "Connected",
                              "متصل"
                            )
                          : txt(
                              "Not connected",
                              "غير متصل"
                            )}

                      </h3>


                      <p
                        className="
                          mt-2
                          max-w-2xl
                          text-[13px]
                          leading-6
                          text-slate-500
                        "
                      >

                        {telegram?.connected
                          ? txt(
                              "Telegram is connected and ready for caregiver alerts.",
                              "تيليجرام متصل وجاهز لاستقبال تنبيهات الرعاية."
                            )
                          : txt(
                              "Open the AccessMate bot, press Start, return here, then verify the connection.",
                              "افتح بوت AccessMate واضغط Start ثم ارجع هنا وتحقق من الاتصال."
                            )}

                      </p>


                      {!telegram?.connected &&
                        telegram?.connect_url && (

                        <a
                          href={
                            telegram.connect_url
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="
                            mt-4
                            inline-flex
                            items-center
                            gap-2
                            text-[12px]
                            font-bold
                            text-sky-300
                            transition
                            hover:text-sky-200
                          "
                        >

                          <ExternalLink
                            className="
                              h-4
                              w-4
                            "
                          />

                          {txt(
                            "Open Telegram Bot",
                            "فتح بوت تيليجرام"
                          )}

                        </a>

                      )}

                    </div>

                  </div>

                </div>


                <div
                  className="
                    space-y-3
                  "
                >

                  {!telegram?.connected && (
                    <>

                      <TelegramAction
                        icon={
                          ExternalLink
                        }
                        label={
                          txt(
                            "Connect Telegram",
                            "ربط تيليجرام"
                          )
                        }
                        description={
                          txt(
                            "Open the AccessMate Telegram bot.",
                            "فتح بوت AccessMate على تيليجرام."
                          )
                        }
                        disabled={
                          telegramBusy
                        }
                        onClick={() =>
                          void connectTelegram()
                        }
                      />


                      <TelegramAction
                        icon={
                          RefreshCw
                        }
                        label={
                          txt(
                            "Check Connection",
                            "التحقق من الاتصال"
                          )
                        }
                        description={
                          txt(
                            "Verify that the bot received Start.",
                            "التحقق من وصول أمر Start إلى البوت."
                          )
                        }
                        disabled={
                          telegramBusy
                        }
                        onClick={() =>
                          void syncTelegram()
                        }
                      />

                    </>
                  )}


                  {telegram?.connected && (

                    <TelegramAction
                      icon={
                        Unlink
                      }
                      label={
                        txt(
                          "Disconnect",
                          "فصل الاتصال"
                        )
                      }
                      description={
                        txt(
                          "Remove the active Telegram connection.",
                          "إزالة اتصال تيليجرام الحالي."
                        )
                      }
                      danger
                      disabled={
                        telegramBusy
                      }
                      onClick={() =>
                        void disconnectTelegram()
                      }
                    />

                  )}

                </div>

              </div>

            </section>

          )}

        </div>

      </div>


      {/* =================================================
          LOCAL STYLES
          ================================================= */}

      <style>
        {`
          .settings-page {
            scrollbar-width: thin;
            scrollbar-color: rgba(56, 189, 248, 0.28) transparent;
          }

          .settings-page::-webkit-scrollbar {
            width: 7px;
          }

          .settings-page::-webkit-scrollbar-track {
            background: transparent;
          }

          .settings-page::-webkit-scrollbar-thumb {
            background: rgba(56, 189, 248, 0.24);
            border-radius: 999px;
          }

          .settings-page::-webkit-scrollbar-thumb:hover {
            background: rgba(56, 189, 248, 0.38);
          }

          .settings-control input,
          .settings-control select {
            width: 100%;
            min-width: 0;
            min-height: 48px;
            border: 0 !important;
            outline: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
            color: #f8fafc !important;
            font-size: 14px;
            font-weight: 600;
          }

          .settings-control input::placeholder {
            color: rgb(71, 85, 105);
          }

          .settings-control select {
            cursor: pointer;
          }

          .settings-control select option {
            background: #07131f;
            color: #f8fafc;
          }
        `}
      </style>

    </main>
  );
};


export default Settings;


/* =========================================================
   COMPONENTS
   ========================================================= */

function SummaryChip({
  label,
  value,
}: {
  label:
    string;

  value:
    string;
}) {

  return (
    <div
      className="
        min-w-[135px]
        rounded-[15px]
        border
        border-sky-400/[0.12]
        bg-[#07131f]/85
        px-4
        py-3
        shadow-[0_10px_30px_rgba(0,0,0,0.14)]
      "
    >

      <p
        className="
          text-[11px]
          font-semibold
          uppercase
          tracking-[0.08em]
          text-slate-500
        "
      >
        {label}
      </p>


      <p
        className="
          mt-1
          truncate
          text-[13px]
          font-semibold
          text-slate-200
        "
      >
        {value}
      </p>

    </div>
  );
}


function SettingsTab({
  active,
  icon:
    Icon,
  title,
  description,
  onClick,
}: {
  active:
    boolean;

  icon:
    ComponentType<{
      className?:
        string;
    }>;

  title:
    string;

  description:
    string;

  onClick:
    () => void;
}) {

  return (
    <button
      type="button"
      onClick={
        onClick
      }
      aria-pressed={
        active
      }
      data-voice-label={
        title
      }
      className={`
        flex
        min-h-[76px]
        items-center
        gap-3
        rounded-[16px]
        border
        px-4
        py-3
        text-start
        transition-all
        duration-200

        ${
          active
            ? "border-sky-400/35 bg-sky-400/[0.10] text-white shadow-[0_10px_30px_rgba(56,189,248,0.08)]"
            : "border-transparent text-slate-400 hover:border-sky-400/[0.14] hover:bg-sky-400/[0.04] hover:text-white"
        }
      `}
    >

      <span
        className={`
          flex
          h-10
          w-10
          shrink-0
          items-center
          justify-center
          rounded-[12px]
          border
          transition

          ${
            active
              ? "border-sky-400/30 bg-sky-400/[0.12] text-sky-300"
              : "border-sky-400/15 bg-sky-400/[0.04] text-sky-300"
          }
        `}
      >

        <Icon
          className="
            h-4
            w-4
          "
        />

      </span>


      <span>

        <span
          className="
            block
            text-[14px]
            font-bold
          "
        >
          {title}
        </span>


        <span
          className="
            mt-0.5
            block
            text-[11px]
            text-slate-500
          "
        >
          {description}
        </span>

      </span>

    </button>
  );
}


function PanelHeading({
  icon:
    Icon,
  title,
  description,
}: {
  icon:
    ComponentType<{
      className?:
        string;
    }>;

  title:
    string;

  description:
    string;
}) {

  return (
    <div
      className="
        flex
        items-center
        gap-4
      "
    >

      <span
        className="
          flex
          h-12
          w-12
          shrink-0
          items-center
          justify-center
          rounded-[14px]
          border
          border-sky-400/22
          bg-sky-400/[0.07]
          text-sky-300
          shadow-[0_8px_24px_rgba(56,189,248,0.06)]
        "
      >

        <Icon
          className="
            h-5
            w-5
          "
        />

      </span>


      <div>

        <h2
          className="
            text-xl
            font-bold
            text-white
          "
        >
          {title}
        </h2>


        <p
          className="
            mt-1
            max-w-3xl
            text-[13px]
            leading-6
            text-slate-500
          "
        >
          {description}
        </p>

      </div>

    </div>
  );
}


function SelectSetting({
  icon:
    Icon,
  label,
  description,
  value,
  onChange,
  options,
}: {
  icon:
    ComponentType<{
      className?:
        string;
    }>;

  label:
    string;

  description:
    string;

  value:
    string;

  onChange:
    (
      value:
        string
    ) => void;

  options:
    Array<{
      value:
        string;

      label:
        string;
    }>;
}) {

  return (
    <label
      className="
        block
        rounded-[19px]
        border
        border-sky-400/[0.11]
        bg-black/20
        p-4
        transition
        hover:border-sky-400/[0.20]
      "
    >

      <div
        className="
          flex
          items-start
          gap-3
        "
      >

        <span
          className="
            flex
            h-10
            w-10
            shrink-0
            items-center
            justify-center
            rounded-[12px]
            border
            border-sky-400/18
            bg-sky-400/[0.05]
            text-sky-300
          "
        >

          <Icon
            className="
              h-4
              w-4
            "
          />

        </span>


        <span>

          <span
            className="
              block
              text-[14px]
              font-bold
              text-slate-200
            "
          >
            {label}
          </span>


          <span
            className="
              mt-1
              block
              text-[12px]
              leading-5
              text-slate-500
            "
          >
            {description}
          </span>

        </span>

      </div>


      <div
        className="
          settings-control
          mt-4
          flex
          min-h-[50px]
          items-center
          rounded-[13px]
          border
          border-sky-400/16
          bg-black/28
          px-4
          transition
          focus-within:border-sky-400/50
          focus-within:shadow-[0_0_0_3px_rgba(56,189,248,0.05)]
        "
      >

        <select
          value={
            value
          }
          onChange={(
            event
          ) =>
            onChange(
              event.target.value
            )
          }
          aria-label={
            label
          }
        >

          {options.map(
            (
              option
            ) => (

              <option
                key={
                  option.value
                }
                value={
                  option.value
                }
              >
                {option.label}
              </option>

            )
          )}

        </select>

      </div>

    </label>
  );
}


function ToggleSetting({
  icon:
    Icon,
  label,
  description,
  value,
  onChange,
  onLabel,
  offLabel,
}: {
  icon:
    ComponentType<{
      className?:
        string;
    }>;

  label:
    string;

  description:
    string;

  value:
    boolean;

  onChange:
    (
      value:
        boolean
    ) => void;

  onLabel:
    string;

  offLabel:
    string;
}) {

  return (
    <div
      className="
        flex
        min-h-[145px]
        items-center
        justify-between
        gap-5
        rounded-[19px]
        border
        border-sky-400/[0.11]
        bg-black/20
        p-4
        transition
        hover:border-sky-400/[0.20]
      "
    >

      <div
        className="
          flex
          min-w-0
          items-start
          gap-3
        "
      >

        <span
          className="
            flex
            h-10
            w-10
            shrink-0
            items-center
            justify-center
            rounded-[12px]
            border
            border-sky-400/18
            bg-sky-400/[0.05]
            text-sky-300
          "
        >

          <Icon
            className="
              h-4
              w-4
            "
          />

        </span>


        <span>

          <span
            className="
              block
              text-[14px]
              font-bold
              text-slate-200
            "
          >
            {label}
          </span>


          <span
            className="
              mt-1
              block
              max-w-xl
              text-[12px]
              leading-5
              text-slate-500
            "
          >
            {description}
          </span>

        </span>

      </div>


      <div
        className="
          flex
          shrink-0
          flex-col
          items-center
          gap-1.5
        "
      >

        <button
          type="button"
          role="switch"
          aria-checked={
            value
          }
          aria-label={
            label
          }
          onClick={() =>
            onChange(
              !value
            )
          }
          className={`
            relative
            h-[32px]
            w-[58px]
            rounded-full
            border
            transition-all

            ${
              value
                ? "border-sky-300/60 bg-[#38bdf8] shadow-[0_0_18px_rgba(56,189,248,0.20)]"
                : "border-white/[0.10] bg-white/[0.05]"
            }
          `}
        >

          <span
            className={`
              absolute
              top-[4px]
              h-[22px]
              w-[22px]
              rounded-full
              transition-all

              ${
                value
                  ? "left-[31px] bg-[#03111a]"
                  : "left-[4px] bg-slate-500"
              }
            `}
          />

        </button>


        <span
          className="
            text-[11px]
            font-semibold
            text-slate-500
          "
        >
          {value
            ? onLabel
            : offLabel}
        </span>

      </div>

    </div>
  );
}


function ToggleSettingSimple({
  label,
  value,
  onChange,
}: {
  label:
    string;

  value:
    boolean;

  onChange:
    (
      value:
        boolean
    ) => void;
}) {

  return (
    <div
      className="
        flex
        items-center
        justify-between
        gap-3
        rounded-[14px]
        border
        border-sky-400/14
        bg-black/20
        px-4
        py-3
      "
    >

      <span
        className="
          text-[13px]
          font-bold
          text-slate-300
        "
      >
        {label}
      </span>


      <button
        type="button"
        role="switch"
        aria-checked={
          value
        }
        aria-label={
          label
        }
        onClick={() =>
          onChange(
            !value
          )
        }
        className={`
          relative
          h-[30px]
          w-[54px]
          rounded-full
          border
          transition-all

          ${
            value
              ? "border-sky-300/60 bg-[#38bdf8] shadow-[0_0_16px_rgba(56,189,248,0.18)]"
              : "border-white/[0.10] bg-white/[0.05]"
          }
        `}
      >

        <span
          className={`
            absolute
            top-[4px]
            h-[20px]
            w-[20px]
            rounded-full
            transition-all

            ${
              value
                ? "left-[28px] bg-[#03111a]"
                : "left-[4px] bg-slate-500"
            }
          `}
        />

      </button>

    </div>
  );
}


function Field({
  label,
  children,
}: {
  label:
    string;

  children:
    ReactNode;
}) {

  return (
    <label
      className="
        block
      "
    >

      <span
        className="
          mb-2
          block
          text-[12px]
          font-bold
          text-slate-300
        "
      >
        {label}
      </span>


      <div
        className="
          settings-control
          rounded-[14px]
          border
          border-sky-400/16
          bg-black/25
          px-4
          transition
          focus-within:border-sky-400/50
          focus-within:shadow-[0_0_0_3px_rgba(56,189,248,0.05)]
        "
      >
        {children}
      </div>

    </label>
  );
}


function CaregiverRow({
  caregiver,
  language,
  onEdit,
  onDelete,
}: {
  caregiver:
    CaregiverData;

  language:
    PreferredLanguage;

  onEdit:
    () => void;

  onDelete:
    () => void;
}) {

  const isArabic =
    language === "ar";


  return (
    <div
      className="
        rounded-[17px]
        border
        border-sky-400/[0.11]
        bg-black/20
        p-4
        transition
        hover:border-sky-400/[0.20]
      "
    >

      <div
        className="
          flex
          flex-col
          gap-3
          sm:flex-row
          sm:items-center
          sm:justify-between
        "
      >

        <div
          className="
            flex
            min-w-0
            items-center
            gap-3
          "
        >

          <span
            className="
              flex
              h-11
              w-11
              shrink-0
              items-center
              justify-center
              rounded-full
              border
              border-sky-400/22
              bg-sky-400/[0.06]
              text-sky-300
            "
          >

            <UserRoundCog
              className="
                h-5
                w-5
              "
            />

          </span>


          <div
            className="
              min-w-0
            "
          >

            <p
              className="
                truncate
                font-bold
                text-white
              "
            >
              {caregiver.full_name}
            </p>


            <p
              className="
                mt-1
                text-[12px]
                text-slate-500
              "
            >
              {caregiver.relationship ||
                (
                  isArabic
                    ? "مقدم رعاية"
                    : "Caregiver"
                )}
            </p>


            {caregiver.phone_number && (

              <p
                className="
                  mt-1
                  flex
                  items-center
                  gap-1.5
                  text-[11px]
                  text-slate-600
                "
              >

                <Phone
                  className="
                    h-3
                    w-3
                  "
                />

                {caregiver.phone_number}

              </p>

            )}

          </div>

        </div>


        <div
          className="
            flex
            flex-wrap
            items-center
            gap-2
          "
        >

          {caregiver.is_primary && (

            <Badge
              success
              text={
                isArabic
                  ? "أساسي"
                  : "Primary"
              }
            />

          )}


          <Badge
            success={
              caregiver.is_active
            }
            text={
              caregiver.is_active
                ? (
                    isArabic
                      ? "نشط"
                      : "Active"
                  )
                : (
                    isArabic
                      ? "متوقف"
                      : "Inactive"
                  )
            }
          />


          {caregiver.telegram_chat_id && (

            <Badge
              info
              text="Telegram"
            />

          )}


          <button
            type="button"
            onClick={
              onEdit
            }
            aria-label={
              isArabic
                ? "تعديل مقدم الرعاية"
                : "Edit caregiver"
            }
            className="
              flex
              h-9
              w-9
              items-center
              justify-center
              rounded-lg
              border
              border-sky-400/14
              text-slate-500
              transition
              hover:border-sky-400/35
              hover:bg-sky-400/[0.06]
              hover:text-sky-300
            "
          >

            <Pencil
              className="
                h-4
                w-4
              "
            />

          </button>


          <button
            type="button"
            onClick={
              onDelete
            }
            aria-label={
              isArabic
                ? "حذف مقدم الرعاية"
                : "Delete caregiver"
            }
            className="
              flex
              h-9
              w-9
              items-center
              justify-center
              rounded-lg
              border
              border-red-400/20
              bg-red-500/[0.025]
              text-red-300
              transition
              hover:border-red-400/40
              hover:bg-red-500/[0.08]
            "
          >

            <Trash2
              className="
                h-4
                w-4
              "
            />

          </button>

        </div>

      </div>

    </div>
  );
}


function TelegramAction({
  icon:
    Icon,
  label,
  description,
  disabled,
  danger =
    false,
  onClick,
}: {
  icon:
    ComponentType<{
      className?:
        string;
    }>;

  label:
    string;

  description:
    string;

  disabled:
    boolean;

  danger?:
    boolean;

  onClick:
    () => void;
}) {

  return (
    <button
      type="button"
      disabled={
        disabled
      }
      onClick={
        onClick
      }
      className={`
        flex
        min-h-[74px]
        w-full
        items-center
        gap-3
        rounded-[16px]
        border
        p-4
        text-start
        transition
        disabled:cursor-not-allowed
        disabled:opacity-40

        ${
          danger
            ? "border-red-400/14 bg-red-500/[0.035] hover:border-red-400/30 hover:bg-red-500/[0.08]"
            : "border-sky-400/[0.12] bg-black/20 hover:border-sky-400/30 hover:bg-sky-400/[0.05]"
        }
      `}
    >

      <span
        className={`
          flex
          h-10
          w-10
          shrink-0
          items-center
          justify-center
          rounded-[12px]
          border

          ${
            danger
              ? "border-red-400/16 bg-red-500/[0.04] text-red-300"
              : "border-sky-400/18 bg-sky-400/[0.05] text-sky-300"
          }
        `}
      >

        {disabled ? (

          <Loader2
            className="
              h-4
              w-4
              animate-spin
            "
          />

        ) : (

          <Icon
            className="
              h-4
              w-4
            "
          />

        )}

      </span>


      <span>

        <span
          className={`
            block
            text-[13px]
            font-bold

            ${
              danger
                ? "text-red-300"
                : "text-slate-200"
            }
          `}
        >
          {label}
        </span>


        <span
          className="
            mt-0.5
            block
            text-[11px]
            leading-5
            text-slate-500
          "
        >
          {description}
        </span>

      </span>

    </button>
  );
}


function Badge({
  text,
  success =
    false,
  info =
    false,
}: {
  text:
    string;

  success?:
    boolean;

  info?:
    boolean;
}) {

  return (
    <span
      className={`
        rounded-full
        border
        px-2.5
        py-1
        text-[9px]
        font-black
        uppercase
        tracking-[0.06em]

        ${
          success
            ? "border-emerald-400/25 bg-emerald-400/[0.06] text-emerald-300"
            : info
              ? "border-sky-400/25 bg-sky-400/[0.07] text-sky-300"
              : "border-white/[0.08] bg-white/[0.025] text-slate-500"
        }
      `}
    >
      {text}
    </span>
  );
}


function Notice({
  text,
  success =
    false,
  error =
    false,
  loading =
    false,
}: {
  text:
    string;

  success?:
    boolean;

  error?:
    boolean;

  loading?:
    boolean;
}) {

  return (
    <div
      role={
        error
          ? "alert"
          : "status"
      }
      className={`
        flex
        items-start
        gap-3
        rounded-[14px]
        border
        px-4
        py-3
        text-[13px]
        leading-6

        ${
          error
            ? "border-red-400/20 bg-red-500/[0.06] text-red-200"
            : success
              ? "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-200"
              : "border-sky-400/14 bg-sky-400/[0.035] text-slate-400"
        }
      `}
    >

      {loading ? (

        <Loader2
          className="
            mt-0.5
            h-4
            w-4
            shrink-0
            animate-spin
          "
        />

      ) : error ? (

        <AlertTriangle
          className="
            mt-0.5
            h-4
            w-4
            shrink-0
          "
        />

      ) : (

        <CheckCircle2
          className="
            mt-0.5
            h-4
            w-4
            shrink-0
          "
        />

      )}


      {text}

    </div>
  );
}


function EmptyState({
  text,
}: {
  text:
    string;
}) {

  return (
    <div
      className="
        rounded-[17px]
        border
        border-dashed
        border-sky-400/[0.16]
        bg-sky-400/[0.025]
        px-4
        py-8
        text-center
        text-[13px]
        text-slate-500
      "
    >
      {text}
    </div>
  );
}