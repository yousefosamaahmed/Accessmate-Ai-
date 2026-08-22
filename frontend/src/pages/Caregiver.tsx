// src/pages/Caregiver.tsx

import {
  type ComponentType,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  Bell,
  Check,
  CheckCircle2,
  Clock3,
  ExternalLink,
  HeartHandshake,
  Link2,
  Loader2,
  MessageCircle,
  MoreVertical,
  RefreshCw,
  ShieldCheck,
  Unplug,
  UserRoundCog,
} from "lucide-react";

import {
  api,
  getApiError,
  unwrapResponse,
} from "../lib/api";

import waterImage from "../assets/Water.jpg";
import toiletImage from "../assets/Toilet.jpg";
import doctorImage from "../assets/Doctor.jpg";
import emergencyImage from "../assets/Emergency.jpg";
import foodImage from "../assets/Food.jpg";
import helpImage from "../assets/Help.jpg";
import medicineImage from "../assets/Medicine.jpg";
import painImage from "../assets/Pain.jpg";
import sleepImage from "../assets/Sleep.jpg";


/* =========================================================
   TYPES
   ========================================================= */

type Language =
  | "en"
  | "ar";


type AlertStatus =
  | "pending"
  | "sent"
  | "acknowledged"
  | "resolved"
  | "failed";


type CaregiverData = {
  id: string;

  user_id?: string;

  full_name: string;

  relationship?: string | null;

  phone_number?: string | null;

  telegram_chat_id?: string | null;

  whatsapp_number?: string | null;

  preferred_channel: string;

  is_primary: boolean;

  is_active: boolean;

  created_at?: string;

  updated_at?: string;
};


type DailyNeedAction = {
  id: string;

  code: string;

  name_ar: string;

  name_en: string;

  intent: string;

  category: string;

  risk_level: string;

  default_message_ar: string;

  default_message_en: string;

  icon?: string | null;

  color?: string | null;

  requires_confirmation: boolean;

  is_active: boolean;
};


type CareAlert = {
  id: string;

  user_id: string;

  caregiver_id?: string | null;

  daily_need_action_id?: string | null;

  alert_type: string;

  intent: string;

  message: string;

  channel: string;

  status: AlertStatus;

  risk_level: string;

  confidence?: number | string | null;

  source: string;

  confirmed_by_user: boolean;

  error_message?: string | null;

  sent_at?: string | null;

  acknowledged_at?: string | null;

  resolved_at?: string | null;

  created_at: string;
};


type TelegramConnectData = {
  status: string;

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

  status: string;

  telegram_chat_id?: string | null;

  caregiver_id?: string | null;

  message: string;
};


/* =========================================================
   CONSTANTS
   ========================================================= */

const LANGUAGE_KEY =
  "accessmate_language";


const NEED_IMAGES:
  Record<string, string> = {
  water:
    waterImage,

  toilet:
    toiletImage,

  doctor:
    doctorImage,

  emergency:
    emergencyImage,

  food:
    foodImage,

  help:
    helpImage,

  medicine:
    medicineImage,

  pain:
    painImage,

  sleep:
    sleepImage,
};


/* =========================================================
   HELPERS
   ========================================================= */

function readLanguage():
  Language {
  try {
    return (
      localStorage.getItem(
        LANGUAGE_KEY
      ) === "ar"
        ? "ar"
        : "en"
    );
  } catch {
    return "en";
  }
}


function extractArray(
  payload: any
): any[] {
  if (
    Array.isArray(payload)
  ) {
    return payload;
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
      payload?.items
    )
  ) {
    return payload.items;
  }

  if (
    Array.isArray(
      payload?.caregivers
    )
  ) {
    return payload.caregivers;
  }

  if (
    Array.isArray(
      payload?.alerts
    )
  ) {
    return payload.alerts;
  }

  return [];
}


function normalizeCode(
  value:
    string
) {
  return String(
    value || ""
  )
    .trim()
    .toLowerCase();
}


function getNeedImage(
  code:
    string
) {
  return (
    NEED_IMAGES[
      normalizeCode(
        code
      )
    ] ||
    helpImage
  );
}


function formatDate(
  value:
    string | null | undefined,
  language:
    Language
) {
  if (!value) {
    return "—";
  }

  try {
    return new Intl.DateTimeFormat(
      language === "ar"
        ? "ar-EG"
        : "en-US",
      {
        dateStyle:
          "medium",

        timeStyle:
          "short",
      }
    ).format(
      new Date(value)
    );
  } catch {
    return value;
  }
}


function getRiskRank(
  value:
    string
) {
  const ranks:
    Record<
      string,
      number
    > = {
    emergency: 4,
    high: 3,
    medium: 2,
    low: 1,
  };

  return (
    ranks[
      String(
        value || ""
      ).toLowerCase()
    ] || 0
  );
}


function isOpenStatus(
  status:
    AlertStatus
) {
  return (
    status === "pending" ||
    status === "sent" ||
    status === "acknowledged"
  );
}


/* =========================================================
   PAGE
   ========================================================= */

export default function Caregiver() {
  const [
    language,
    setLanguage,
  ] =
    useState<Language>(
      readLanguage
    );


  const [
    caregivers,
    setCaregivers,
  ] =
    useState<
      CaregiverData[]
    >([]);


  const [
    actions,
    setActions,
  ] =
    useState<
      DailyNeedAction[]
    >([]);


  const [
    alerts,
    setAlerts,
  ] =
    useState<
      CareAlert[]
    >([]);


  const [
    telegramConnected,
    setTelegramConnected,
  ] =
    useState(false);


  const [
    ,
    setTelegramData,
  ] =
    useState<
      TelegramConnectData | null
    >(
      null
    );


  const [
    telegramBusy,
    setTelegramBusy,
  ] =
    useState<
      "connect" |
      "sync" |
      "disconnect" |
      null
    >(
      null
    );


  const [
    initialLoading,
    setInitialLoading,
  ] =
    useState(true);


  const [
    needBusyCode,
    setNeedBusyCode,
  ] =
    useState<
      string | null
    >(
      null
    );


  const [
    alertBusyId,
    setAlertBusyId,
  ] =
    useState<
      string | null
    >(
      null
    );


  const [
    message,
    setMessage,
  ] =
    useState("");


  const [
    error,
    setError,
  ] =
    useState("");


  const isArabic =
    language === "ar";


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
     LANGUAGE
     ===================================================== */

  useEffect(() => {
    function syncLanguage() {
      setLanguage(
        readLanguage()
      );
    }


    function handleLanguageEvent(
      event:
        Event
    ) {
      const custom =
        event as
          CustomEvent<{
            language?:
              string;
          }>;


      if (
        custom.detail
          ?.language ===
        "ar"
      ) {
        setLanguage(
          "ar"
        );

        return;
      }


      if (
        custom.detail
          ?.language ===
        "en"
      ) {
        setLanguage(
          "en"
        );

        return;
      }


      syncLanguage();
    }


    window.addEventListener(
      "storage",
      syncLanguage
    );


    window.addEventListener(
      "accessmate-public-language-change",
      handleLanguageEvent
    );


    window.addEventListener(
      "accessmate-settings-updated",
      syncLanguage
    );


    return () => {
      window.removeEventListener(
        "storage",
        syncLanguage
      );


      window.removeEventListener(
        "accessmate-public-language-change",
        handleLanguageEvent
      );


      window.removeEventListener(
        "accessmate-settings-updated",
        syncLanguage
      );
    };
  }, []);


  /* =====================================================
     INITIAL LOAD
     ===================================================== */

  useEffect(() => {
    void loadAll();
  }, []);


  function clearNotice() {
    setMessage("");
    setError("");
  }


  async function loadAll() {
    setInitialLoading(
      true
    );

    clearNotice();


    await Promise.allSettled([
      loadCaregivers(),
      loadActions(),
      loadAlerts(),
      loadTelegramStatus(),
    ]);


    setInitialLoading(
      false
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
        ) as
          CaregiverData[];


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
    }
  }


  /* =====================================================
     TELEGRAM STATUS
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


      setTelegramConnected(
        Boolean(
          payload.connected
        )
      );


      setTelegramData(
        payload
      );

    } catch (
      err
    ) {
      console.error(
        "Failed to load Telegram status:",
        err
      );


      setTelegramConnected(
        false
      );


      setTelegramData(
        null
      );
    }
  }


  /* =====================================================
     TELEGRAM CONNECTION
     ===================================================== */

  async function openTelegramConnection() {
    clearNotice();


    /*
     * Open a blank tab immediately from the user gesture.
     * This avoids popup blockers while we request a fresh,
     * short-lived Telegram deep link from the backend.
     */
    const telegramWindow =
      window.open(
        "",
        "_blank"
      );


    setTelegramBusy(
      "connect"
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


      setTelegramData(
        payload
      );


      setTelegramConnected(
        Boolean(
          payload.connected
        )
      );


      if (
        payload.connected
      ) {
        telegramWindow
          ?.close();


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
        telegramWindow
          ?.close();


        throw new Error(
          txt(
            "Telegram connection link was not returned by the backend.",
            "لم يتم إرجاع رابط ربط تيليجرام من الخادم."
          )
        );
      }


      if (
        telegramWindow
      ) {
        telegramWindow.opener =
          null;

        telegramWindow.location.href =
          payload.connect_url;
      } else {
        window.location.href =
          payload.connect_url;
      }


      setMessage(
        txt(
          "Telegram opened. Press Start in the bot, then return here and click Check connection.",
          "تم فتح تيليجرام. اضغط Start داخل البوت، ثم ارجع هنا واضغط تحقق من الربط."
        )
      );

    } catch (
      err
    ) {
      telegramWindow
        ?.close();


      setError(
        getApiError(
          err
        )
      );

    } finally {
      setTelegramBusy(
        null
      );
    }
  }


  async function syncTelegramConnection() {
    clearNotice();


    setTelegramBusy(
      "sync"
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


      setTelegramConnected(
        Boolean(
          payload.connected
        )
      );


      if (
        payload.connected
      ) {
        await Promise.allSettled([
          loadTelegramStatus(),
          loadCaregivers(),
        ]);


        setMessage(
          txt(
            "Telegram connected successfully. Care alerts can now be delivered to your caregiver.",
            "تم ربط تيليجرام بنجاح. يمكن الآن إرسال تنبيهات الرعاية إلى مقدم الرعاية."
          )
        );

      } else {
        setMessage(
          isArabic
            ? (
                "لم يتم العثور على رسالة Start الخاصة بالربط بعد. افتح رابط تيليجرام واضغط Start ثم حاول مرة أخرى."
              )
            : (
                "The matching Start message has not been found yet. Open the Telegram link, press Start, then try again."
              )
        );
      }

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
        null
      );
    }
  }


  async function disconnectTelegram() {
    clearNotice();


    const confirmed =
      window.confirm(
        txt(
          "Disconnect Telegram alerts from this caregiver?",
          "هل تريد فصل تنبيهات تيليجرام عن مقدم الرعاية؟"
        )
      );


    if (
      !confirmed
    ) {
      return;
    }


    setTelegramBusy(
      "disconnect"
    );


    try {
      const response =
        await api.post(
          "/telegram/disconnect"
        );


      const payload =
        unwrapResponse<TelegramSyncData>(
          response
        );


      setTelegramConnected(
        false
      );


      setTelegramData(
        null
      );


      await Promise.allSettled([
        loadTelegramStatus(),
        loadCaregivers(),
      ]);


      setMessage(
        payload.message ||
        txt(
          "Telegram disconnected successfully.",
          "تم فصل تيليجرام بنجاح."
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
        null
      );
    }
  }


  /* =====================================================
     DAILY NEED ACTIONS
     ===================================================== */

  async function loadActions() {
    try {
      const response =
        await api.get(
          "/daily-need-actions"
        );


      const payload =
        unwrapResponse<any>(
          response
        );


      const rows =
        extractArray(
          payload
        ) as
          DailyNeedAction[];


      const sorted =
        rows
          .filter(
            (
              action
            ) =>
              action.is_active !==
              false
          )
          .sort(
            (
              first,
              second
            ) =>
              getRiskRank(
                second.risk_level
              ) -
              getRiskRank(
                first.risk_level
              )
          );


      setActions(
        sorted
      );

    } catch (
      err
    ) {
      console.error(
        "Failed to load daily need actions:",
        err
      );
    }
  }


  /* =====================================================
     SPEECH
     ===================================================== */

  function speakNeed(
    action:
      DailyNeedAction
  ) {
    if (
      !(
        "speechSynthesis" in
        window
      )
    ) {
      return;
    }


    try {
      window.speechSynthesis.cancel();


      const needName =
        isArabic
          ? action.name_ar
          : action.name_en;


      const sentence =
        isArabic
          ? `تم اختيار ${needName}`
          : `${needName} selected`;


      const utterance =
        new SpeechSynthesisUtterance(
          sentence
        );


      utterance.lang =
        isArabic
          ? "ar-EG"
          : "en-US";


      utterance.rate =
        0.88;


      utterance.pitch =
        1;


      utterance.volume =
        1;


      window.speechSynthesis.speak(
        utterance
      );

    } catch (
      err
    ) {
      console.error(
        "Speech synthesis failed:",
        err
      );
    }
  }


  function handleNeedPress(
    action:
      DailyNeedAction
  ) {
    /*
     * First give immediate audio feedback.
     * This helps users who depend on the image rather than text.
     */
    speakNeed(
      action
    );


    /*
     * Small delay gives the browser enough time to start
     * the spoken confirmation before opening any confirmation UI.
     */
    window.setTimeout(
      () => {
        void sendNeed(
          action
        );
      },
      250
    );
  }


  async function sendNeed(
    action:
      DailyNeedAction
  ) {
    clearNotice();


    const primaryCaregiver =
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
      );


    if (
      !primaryCaregiver
    ) {
      setError(
        txt(
          "No active caregiver is available. Add or activate a caregiver from Settings.",
          "لا يوجد مقدم رعاية نشط. أضف أو فعّل مقدم رعاية من الإعدادات."
        )
      );

      return;
    }


    if (
      action.requires_confirmation
    ) {
      const confirmed =
        window.confirm(
          isArabic
            ? `هل تريد إرسال طلب "${action.name_ar}" إلى ${primaryCaregiver.full_name}؟`
            : `Send "${action.name_en}" request to ${primaryCaregiver.full_name}?`
        );


      if (!confirmed) {
        return;
      }
    }


    setNeedBusyCode(
      action.code
    );


    try {
      const params =
        new URLSearchParams();


      params.set(
        "language",
        language
      );


      params.set(
        "source",
        "careboard"
      );


      params.set(
        "confirmed_by_user",
        "true"
      );


      params.set(
        "caregiver_id",
        primaryCaregiver.id
      );


      const response =
        await api.post(
          `/care-alerts/from-action/${encodeURIComponent(
            action.code
          )}?${params.toString()}`
        );


      const alert =
        unwrapResponse<CareAlert>(
          response
        );


      if (
        alert.status ===
        "sent"
      ) {
        const successText =
          isArabic
            ? `تم إرسال طلب ${action.name_ar} إلى ${primaryCaregiver.full_name} بنجاح.`
            : `${action.name_en} request was sent to ${primaryCaregiver.full_name} successfully.`;


        setMessage(
          successText
        );


        speakSuccess(
          action
        );

      } else if (
        alert.status ===
        "failed"
      ) {
        setError(
          alert.error_message ||
          txt(
            "The alert was created but delivery failed.",
            "تم إنشاء التنبيه ولكن فشل إرساله."
          )
        );

      } else if (
        alert.status ===
        "pending"
      ) {
        setMessage(
          txt(
            "The care alert was created and is waiting for delivery.",
            "تم إنشاء تنبيه الرعاية وهو في انتظار الإرسال."
          )
        );

      } else {
        setMessage(
          txt(
            `Alert created with status: ${alert.status}.`,
            `تم إنشاء التنبيه بالحالة: ${alert.status}.`
          )
        );
      }


      await loadAlerts();

    } catch (
      err
    ) {
      setError(
        getApiError(
          err
        )
      );

    } finally {
      setNeedBusyCode(
        null
      );
    }
  }


  function speakSuccess(
    action:
      DailyNeedAction
  ) {
    if (
      !(
        "speechSynthesis" in
        window
      )
    ) {
      return;
    }


    try {
      window.speechSynthesis.cancel();


      const text =
        isArabic
          ? `تم إرسال طلب ${action.name_ar} بنجاح`
          : `${action.name_en} request sent successfully`;


      const utterance =
        new SpeechSynthesisUtterance(
          text
        );


      utterance.lang =
        isArabic
          ? "ar-EG"
          : "en-US";


      utterance.rate =
        0.9;


      window.speechSynthesis.speak(
        utterance
      );

    } catch {
      // Speech is optional fallback feedback.
    }
  }


  /* =====================================================
     ALERTS
     ===================================================== */

  async function loadAlerts() {
    try {
      const response =
        await api.get(
          "/care-alerts?limit=100"
        );


      const payload =
        unwrapResponse<any>(
          response
        );


      const rows =
        extractArray(
          payload
        ) as
          CareAlert[];


      const sorted =
        [...rows].sort(
          (
            first,
            second
          ) =>
            new Date(
              second.created_at
            ).getTime() -
            new Date(
              first.created_at
            ).getTime()
        );


      setAlerts(
        sorted
      );

    } catch (
      err
    ) {
      console.error(
        "Failed to load alerts:",
        err
      );
    }
  }


  async function acknowledgeAlert(
    alertId:
      string
  ) {
    clearNotice();

    setAlertBusyId(
      alertId
    );


    try {
      await api.patch(
        `/care-alerts/${alertId}/acknowledge`
      );


      await loadAlerts();


      setMessage(
        txt(
          "Alert acknowledged successfully.",
          "تم تأكيد استلام التنبيه بنجاح."
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
      setAlertBusyId(
        null
      );
    }
  }


  async function resolveAlert(
    alertId:
      string
  ) {
    clearNotice();

    setAlertBusyId(
      alertId
    );


    try {
      await api.patch(
        `/care-alerts/${alertId}/resolve`
      );


      await loadAlerts();


      setMessage(
        txt(
          "Alert resolved successfully.",
          "تم إغلاق التنبيه بنجاح."
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
      setAlertBusyId(
        null
      );
    }
  }


  /* =====================================================
     DERIVED DATA
     ===================================================== */

  const activeAlerts =
    useMemo(
      () =>
        alerts.filter(
          (
            alert
          ) =>
            isOpenStatus(
              alert.status
            )
        ),
      [
        alerts,
      ]
    );


  const resolvedCount =
    useMemo(
      () =>
        alerts.filter(
          (
            alert
          ) =>
            alert.status ===
            "resolved"
        ).length,
      [
        alerts,
      ]
    );


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
      data-voice-region={
        txt(
          "Care Center",
          "مركز الرعاية"
        )
      }
      aria-label={
        txt(
          "Care Center",
          "مركز الرعاية"
        )
      }
      className="
        care-center-page
        h-full
        min-h-0
        w-full
        overflow-y-auto
        bg-[#000912]
        text-[#EAF2F5]
      "
    >
      <div
        className="
          min-h-full
          w-full
          bg-[#000912]
          px-5
          py-5
          lg:px-7
          lg:py-6
        "
      >
        <div
          className="
            mx-auto
            w-full
            max-w-[1600px]
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
                  text-[10px]
                  font-black
                  uppercase
                  tracking-[0.13em]
                  text-[#00B8DB]
                "
              >
                <HeartHandshake
                  className="
                    h-4
                    w-4
                  "
                />

                {txt(
                  "AccessMate Care System",
                  "نظام الرعاية في AccessMate"
                )}
              </span>


              <h1
                className="
                  mt-4
                  text-[34px]
                  font-black
                  leading-none
                  tracking-[-0.04em]
                  text-[#F3F7F9]
                  sm:text-[38px]
                "
              >
                {txt(
                  "Care Center",
                  "مركز الرعاية"
                )}
              </h1>


              <p
                className="
                  mt-3
                  max-w-[760px]
                  text-[13px]
                  leading-6
                  text-[#8C9AA3]
                "
              >
                {txt(
                  "Choose a picture to communicate a daily need. AccessMate can speak the selected need and notify your caregiver.",
                  "اختر صورة للتعبير عن احتياجك اليومي. يستطيع AccessMate نطق الاحتياج وإرسال تنبيه إلى مقدم الرعاية."
                )}
              </p>
            </div>


            <button
              type="button"
              onClick={() =>
                void loadAll()
              }
              disabled={
                initialLoading
              }
              className="
                inline-flex
                min-h-[42px]
                items-center
                justify-center
                gap-2
                rounded-[10px]
                border
                border-[#0E3B50]
                bg-[#04131D]
                px-4
                text-[11px]
                font-bold
                text-[#50CFF2]
                transition
                hover:border-[#00B8DB]/60
                hover:bg-[#06202D]
                disabled:opacity-50
              "
              data-voice-label={
                txt(
                  "Refresh Care Center",
                  "تحديث مركز الرعاية"
                )
              }
            >
              <RefreshCw
                className={`
                  h-4
                  w-4

                  ${
                    initialLoading
                      ? "animate-spin"
                      : ""
                  }
                `}
              />

              {txt(
                "Refresh",
                "تحديث"
              )}
            </button>
          </header>


          {/* =================================================
              NOTICES
              ================================================= */}

          <div
            className="
              space-y-3
            "
            aria-live="polite"
            aria-atomic="true"
          >
            {initialLoading && (
              <Notice
                loading
                text={
                  txt(
                    "Loading Care Center...",
                    "جاري تحميل مركز الرعاية..."
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
              SUMMARY
              ================================================= */}

          <section
            className="
              mt-5
              grid
              gap-3
              sm:grid-cols-2
              xl:grid-cols-4
            "
          >
            <SummaryCard
              icon={
                UserRoundCog
              }
              label={
                txt(
                  "Primary Caregiver",
                  "مقدم الرعاية الأساسي"
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


            <div
              className="
                group
                relative
                min-w-0
                overflow-hidden
                rounded-[12px]
                border
                border-[#15313D]
                bg-[#09121C]
                p-4
              "
            >
              <div
                className="
                  pointer-events-none
                  absolute
                  left-[-45px]
                  top-[-55px]
                  h-[130px]
                  w-[130px]
                  rounded-full
                  bg-[#00B8DB]/[0.06]
                  blur-[46px]
                "
              />

              <div className="relative z-10 flex items-start justify-between gap-3">
                <span
                  className="
                    flex
                    h-10
                    w-10
                    items-center
                    justify-center
                    rounded-full
                    border
                    border-[#00B8DB]/30
                    bg-[#05202C]
                    text-[#00B8DB]
                  "
                >
                  <MessageCircle className="h-[18px] w-[18px]" />
                </span>

                {telegramConnected && (
                  <button
                    type="button"
                    onClick={() =>
                      void disconnectTelegram()
                    }
                    disabled={
                      telegramBusy !==
                      null
                    }
                    className="
                      flex
                      h-8
                      w-8
                      items-center
                      justify-center
                      rounded-[8px]
                      border
                      border-transparent
                      text-[#50616B]
                      opacity-0
                      transition
                      hover:border-red-400/20
                      hover:bg-red-500/[0.06]
                      hover:text-red-300
                      group-hover:opacity-100
                      disabled:opacity-30
                    "
                    title={
                      txt(
                        "Disconnect Telegram",
                        "فصل تيليجرام"
                      )
                    }
                    aria-label={
                      txt(
                        "Disconnect Telegram",
                        "فصل تيليجرام"
                      )
                    }
                  >
                    <Unplug className="h-4 w-4" />
                  </button>
                )}
              </div>

              <p
                className="
                  relative
                  z-10
                  mt-3
                  text-[9px]
                  font-black
                  uppercase
                  tracking-[0.10em]
                  text-[#788791]
                "
              >
                Telegram
              </p>

              <p
                className={`
                  relative
                  z-10
                  mt-1
                  truncate
                  text-[17px]
                  font-black

                  ${
                    telegramConnected
                      ? "text-[#00C8E8]"
                      : "text-[#C7D1D7]"
                  }
                `}
              >
                {telegramConnected
                  ? txt(
                      "Connected",
                      "متصل"
                    )
                  : txt(
                      "Not connected",
                      "غير متصل"
                    )}
              </p>
            </div>


            <SummaryCard
              icon={
                Bell
              }
              label={
                txt(
                  "Active Alerts",
                  "التنبيهات النشطة"
                )
              }
              value={
                String(
                  activeAlerts.length
                )
              }
            />


            <SummaryCard
              icon={
                CheckCircle2
              }
              label={
                txt(
                  "Resolved",
                  "تم حلها"
                )
              }
              value={
                String(
                  resolvedCount
                )
              }
            />
          </section>


          {/* =================================================
              TELEGRAM CONNECTION
              Only shown when setup is needed, so the connected
              state matches the supplied reference layout.
              ================================================= */}

          {!telegramConnected && (
            <section
              className="
                mt-4
                rounded-[12px]
                border
                border-[#15313D]
                bg-[#07111B]
                p-4
              "
              aria-label={
                txt(
                  "Telegram caregiver connection",
                  "ربط مقدم الرعاية بتيليجرام"
                )
              }
            >
              <div
                className="
                  flex
                  flex-col
                  gap-4
                  lg:flex-row
                  lg:items-center
                  lg:justify-between
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
                      rounded-full
                      border
                      border-[#00B8DB]/25
                      bg-[#05202C]
                      text-[#00B8DB]
                    "
                  >
                    <MessageCircle className="h-[18px] w-[18px]" />
                  </span>

                  <div>
                    <h2
                      className="
                        text-[14px]
                        font-black
                        text-[#EAF2F5]
                      "
                    >
                      {txt(
                        "Connect Telegram Alerts",
                        "ربط تنبيهات تيليجرام"
                      )}
                    </h2>

                    <p
                      className="
                        mt-1
                        max-w-3xl
                        text-[11px]
                        leading-5
                        text-[#788791]
                      "
                    >
                      {txt(
                        "Connect Telegram, press Start in the bot, then verify the connection here.",
                        "اربط تيليجرام واضغط Start داخل البوت، ثم تحقق من الربط هنا."
                      )}
                    </p>
                  </div>
                </div>


                <div
                  className="
                    flex
                    shrink-0
                    flex-wrap
                    gap-2
                  "
                >
                  <button
                    type="button"
                    onClick={() =>
                      void openTelegramConnection()
                    }
                    disabled={
                      telegramBusy !==
                      null
                    }
                    className="
                      inline-flex
                      min-h-[40px]
                      items-center
                      justify-center
                      gap-2
                      rounded-[9px]
                      border
                      border-[#00B8DB]/35
                      bg-[#05202C]
                      px-4
                      text-[11px]
                      font-black
                      text-[#50CFF2]
                      transition
                      hover:border-[#00B8DB]/65
                      hover:bg-[#073043]
                      disabled:opacity-45
                    "
                  >
                    {telegramBusy ===
                    "connect" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ExternalLink className="h-4 w-4" />
                    )}

                    {txt(
                      "Connect Telegram",
                      "ربط تيليجرام"
                    )}
                  </button>


                  <button
                    type="button"
                    onClick={() =>
                      void syncTelegramConnection()
                    }
                    disabled={
                      telegramBusy !==
                      null
                    }
                    className="
                      inline-flex
                      min-h-[40px]
                      items-center
                      justify-center
                      gap-2
                      rounded-[9px]
                      border
                      border-[#15313D]
                      bg-[#09121C]
                      px-4
                      text-[11px]
                      font-black
                      text-[#B8C2C8]
                      transition
                      hover:border-[#00B8DB]/40
                      hover:text-[#50CFF2]
                      disabled:opacity-45
                    "
                  >
                    {telegramBusy ===
                    "sync" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Link2 className="h-4 w-4" />
                    )}

                    {txt(
                      "Check connection",
                      "تحقق من الربط"
                    )}
                  </button>
                </div>
              </div>
            </section>
          )}


          {/* =================================================
              MAIN CARE AREA
              ================================================= */}

          <section
            className="
              mt-5
              grid
              gap-4
              xl:grid-cols-[minmax(0,1fr)_330px]
            "
          >
            {/* ===============================================
                WHAT DO YOU NEED
                =============================================== */}

            <div
              data-voice-region={
                txt(
                  "Quick care needs",
                  "احتياجات الرعاية السريعة"
                )
              }
              className="
                min-w-0
                rounded-[14px]
                border
                border-[#15313D]
                bg-[#07111B]
                p-4
                shadow-[0_18px_50px_rgba(0,0,0,0.18)]
                lg:p-5
              "
            >
              <PanelHeading
                icon={
                  HeartHandshake
                }
                title={
                  txt(
                    "What do you need?",
                    "ماذا تحتاج؟"
                  )
                }
                description={
                  primaryCaregiver
                    ? txt(
                        `Choose a picture to send a request to ${primaryCaregiver.full_name}.`,
                        `اختر صورة لإرسال طلب إلى ${primaryCaregiver.full_name}.`
                      )
                    : txt(
                        "Configure a caregiver from Settings first.",
                        "قم بإعداد مقدم رعاية من الإعدادات أولاً."
                      )
                }
              />


              <div
                className="
                  mt-5
                  grid
                  grid-cols-2
                  gap-3
                  md:grid-cols-3
                "
              >
                {actions.map(
                  (
                    action
                  ) => {
                    const image =
                      getNeedImage(
                        action.code
                      );


                    const emergency =
                      normalizeCode(
                        action.code
                      ) ===
                        "emergency" ||
                      action.risk_level ===
                        "emergency";


                    const busy =
                      needBusyCode ===
                      action.code;


                    const label =
                      isArabic
                        ? action.name_ar
                        : action.name_en;


                    const secondaryLabel =
                      isArabic
                        ? action.name_en
                        : action.name_ar;


                    return (
                      <button
                        key={
                          action.id
                        }
                        type="button"
                        onClick={() =>
                          handleNeedPress(
                            action
                          )
                        }
                        disabled={
                          needBusyCode !==
                            null ||
                          !primaryCaregiver
                        }
                        aria-label={
                          label
                        }
                        data-voice-label={
                          label
                        }
                        className={`
                          group
                          relative
                          overflow-hidden
                          rounded-[11px]
                          border
                          text-start
                          shadow-[0_12px_30px_rgba(0,0,0,0.20)]
                          transition-all
                          duration-200
                          hover:-translate-y-1
                          focus-visible:outline
                          focus-visible:outline-2
                          focus-visible:outline-offset-2
                          focus-visible:outline-[#00B8DB]
                          disabled:cursor-not-allowed
                          disabled:opacity-45

                          ${
                            emergency
                              ? "border-red-500/35 bg-[#190E14] hover:border-red-400/60"
                              : "border-[#0E3B50] bg-[#06131D] hover:border-[#00B8DB]/55"
                          }
                        `}
                      >
                        <div
                          className="
                            relative
                            aspect-[4/3]
                            w-full
                            overflow-hidden
                            bg-[#02070D]
                          "
                        >
                          <img
                            src={
                              image
                            }
                            alt={
                              label
                            }
                            draggable={
                              false
                            }
                            className="
                              h-full
                              w-full
                              object-cover
                              transition
                              duration-300
                              group-hover:scale-[1.035]
                            "
                          />


                          <div
                            className="
                              pointer-events-none
                              absolute
                              inset-0
                              bg-gradient-to-t
                              from-[#000912]/75
                              via-transparent
                              to-transparent
                            "
                          />


                          {busy && (
                            <div
                              className="
                                absolute
                                inset-0
                                flex
                                items-center
                                justify-center
                                bg-[#000912]/75
                              "
                            >
                              <Loader2
                                className="
                                  h-8
                                  w-8
                                  animate-spin
                                  text-[#00B8DB]
                                "
                              />
                            </div>
                          )}


                          {emergency && (
                            <span
                              className="
                                absolute
                                right-3
                                top-3
                                rounded-full
                                border
                                border-red-300/30
                                bg-red-600
                                px-2.5
                                py-1
                                text-[8px]
                                font-black
                                uppercase
                                text-white
                                shadow-[0_0_18px_rgba(239,68,68,0.30)]
                              "
                            >
                              SOS
                            </span>
                          )}
                        </div>


                        <div
                          className="
                            border-t
                            border-[#15313D]
                            bg-[#071722]
                            p-3
                          "
                        >
                          <p
                            className={`
                              text-[14px]
                              font-black

                              ${
                                emergency
                                  ? "text-[#F0D7DA]"
                                  : "text-[#EDF3F6]"
                              }
                            `}
                          >
                            {label}
                          </p>


                          <p
                            className="
                              mt-1
                              text-[10px]
                              font-medium
                              text-[#7E8B94]
                            "
                          >
                            {secondaryLabel}
                          </p>
                        </div>
                      </button>
                    );
                  }
                )}
              </div>


              {actions.length ===
                0 &&
                !initialLoading && (
                <EmptyState
                  text={
                    txt(
                      "No daily needs are available.",
                      "لا توجد احتياجات يومية متاحة."
                    )
                  }
                />
              )}
            </div>


            {/* ===============================================
                ACTIVE ALERTS RIGHT PANEL
                =============================================== */}

            <aside
              data-voice-region={
                txt(
                  "Active Alerts",
                  "التنبيهات النشطة"
                )
              }
              className="
                min-w-0
                self-start
                rounded-[14px]
                border
                border-[#15313D]
                bg-[#07111B]
                p-4
                shadow-[0_18px_50px_rgba(0,0,0,0.18)]
                xl:sticky
                xl:top-5
              "
            >
              <div
                className="
                  flex
                  items-center
                  justify-between
                  gap-3
                "
              >
                <div
                  className="
                    flex
                    items-center
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
                      rounded-full
                      border
                      border-[#00B8DB]/25
                      bg-[#05202C]
                      text-[#00B8DB]
                    "
                  >
                    <Bell className="h-[18px] w-[18px]" />
                  </span>


                  <div>
                    <h2
                      className="
                        text-[16px]
                        font-black
                        text-[#EDF3F6]
                      "
                    >
                      {txt(
                        "Active Alerts",
                        "التنبيهات النشطة"
                      )}
                    </h2>


                    <p
                      className="
                        mt-1
                        text-[10px]
                        text-[#75838C]
                      "
                    >
                      {txt(
                        "Monitor ongoing alerts here.",
                        "تابع التنبيهات النشطة هنا."
                      )}
                    </p>
                  </div>
                </div>


                <button
                  type="button"
                  className="
                    flex
                    h-8
                    w-8
                    items-center
                    justify-center
                    rounded-[8px]
                    border
                    border-[#15313D]
                    bg-[#06131D]
                    text-[#00B8DB]
                  "
                  aria-label={
                    txt(
                      "Alert options",
                      "خيارات التنبيهات"
                    )
                  }
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>


              <div
                className="
                  mt-5
                  max-h-[640px]
                  space-y-3
                  overflow-y-auto
                  pr-1
                "
              >
                {activeAlerts.length ===
                0 ? (
                  <div
                    className="
                      flex
                      min-h-[285px]
                      flex-col
                      items-center
                      justify-center
                      rounded-[12px]
                      border
                      border-[#15313D]
                      bg-[#08111A]
                      px-5
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
                        border-[#00B8DB]/25
                        text-[#00B8DB]
                      "
                    >
                      <CheckCircle2 className="h-8 w-8" />
                    </span>


                    <p
                      className="
                        mt-5
                        text-[14px]
                        font-black
                        text-[#EDF3F6]
                      "
                    >
                      {txt(
                        "No active alerts",
                        "لا توجد تنبيهات نشطة"
                      )}
                    </p>


                    <p
                      className="
                        mt-2
                        text-[11px]
                        text-[#77858E]
                      "
                    >
                      {txt(
                        "You're all set!",
                        "كل شيء على ما يرام!"
                      )}
                    </p>
                  </div>
                ) : (
                  activeAlerts.map(
                    (
                      alert
                    ) => (
                      <ActiveAlertCard
                        key={
                          alert.id
                        }
                        alert={
                          alert
                        }
                        language={
                          language
                        }
                        busy={
                          alertBusyId ===
                          alert.id
                        }
                        onAcknowledge={() =>
                          void acknowledgeAlert(
                            alert.id
                          )
                        }
                        onResolve={() =>
                          void resolveAlert(
                            alert.id
                          )
                        }
                      />
                    )
                  )
                )}
              </div>
            </aside>
          </section>
        </div>
      </div>


      <style>
        {`
        .care-center-page {
          scrollbar-width: thin;
          scrollbar-color: rgba(0, 184, 219, 0.24) transparent;
        }

        .care-center-page::-webkit-scrollbar {
          width: 7px;
        }

        .care-center-page::-webkit-scrollbar-track {
          background: transparent;
        }

        .care-center-page::-webkit-scrollbar-thumb {
          background: rgba(0, 184, 219, 0.22);
          border-radius: 999px;
        }
        `}
      </style>
    </main>
  );
}


/* =========================================================
   COMPONENTS
   ========================================================= */

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
          rounded-full
          border
          border-[#00B8DB]/25
          bg-[#05202C]
          text-[#00B8DB]
        "
      >
        <Icon className="h-[18px] w-[18px]" />
      </span>


      <div>
        <h2
          className="
            text-[16px]
            font-black
            text-[#EDF3F6]
          "
        >
          {title}
        </h2>


        <p
          className="
            mt-1
            max-w-3xl
            text-[10px]
            leading-5
            text-[#75838C]
          "
        >
          {description}
        </p>
      </div>
    </div>
  );
}


function SummaryCard({
  icon:
    Icon,
  label,
  value,
}: {
  icon:
    ComponentType<{
      className?:
        string;
    }>;

  label:
    string;

  value:
    string;
}) {
  return (
    <div
      className="
        relative
        min-w-0
        overflow-hidden
        rounded-[12px]
        border
        border-[#15313D]
        bg-[#09121C]
        p-4
      "
    >
      <div
        className="
          pointer-events-none
          absolute
          left-[-45px]
          top-[-55px]
          h-[130px]
          w-[130px]
          rounded-full
          bg-[#00B8DB]/[0.05]
          blur-[46px]
        "
      />

      <Icon
        className="
          relative
          z-10
          h-5
          w-5
          text-[#00B8DB]
        "
      />


      <p
        className="
          relative
          z-10
          mt-3
          text-[9px]
          font-black
          uppercase
          tracking-[0.10em]
          text-[#788791]
        "
      >
        {label}
      </p>


      <p
        className="
          relative
          z-10
          mt-1
          truncate
          text-[17px]
          font-black
          text-[#EDF3F6]
        "
      >
        {value}
      </p>
    </div>
  );
}


function ActiveAlertCard({
  alert,
  language,
  busy,
  onAcknowledge,
  onResolve,
}: {
  alert:
    CareAlert;

  language:
    Language;

  busy:
    boolean;

  onAcknowledge:
    () => void;

  onResolve:
    () => void;
}) {
  const isArabic =
    language === "ar";


  const highRisk =
    alert.risk_level ===
      "high" ||
    alert.risk_level ===
      "emergency";


  return (
    <article
      className={`
        rounded-[12px]
        border
        p-4
        transition

        ${
          highRisk
            ? "border-red-400/25 bg-red-500/[0.035]"
            : "border-[#15313D] bg-[#08111A]"
        }
      `}
    >
      <div
        className="
          flex
          flex-wrap
          items-center
          gap-2
        "
      >
        <Badge
          success={
            alert.status ===
              "sent" ||
            alert.status ===
              "acknowledged"
          }
          text={
            alert.status
          }
        />


        <Badge
          danger={
            highRisk
          }
          text={
            alert.risk_level
          }
        />
      </div>


      <p
        className="
          mt-3
          text-[12px]
          font-bold
          leading-5
          text-[#D5DEE3]
        "
      >
        {alert.message}
      </p>


      <div
        className="
          mt-3
          flex
          items-center
          gap-2
          text-[10px]
          text-[#71808A]
        "
      >
        <Clock3 className="h-3.5 w-3.5" />

        {formatDate(
          alert.created_at,
          language
        )}
      </div>


      <div
        className="
          mt-4
          grid
          gap-2
        "
      >
        {(
          alert.status ===
            "sent" ||
          alert.status ===
            "pending"
        ) && (
          <AlertActionButton
            icon={
              Check
            }
            label={
              isArabic
                ? "تأكيد الاستلام"
                : "Acknowledge"
            }
            disabled={
              busy
            }
            secondary
            onClick={
              onAcknowledge
            }
          />
        )}


        {alert.status !==
          "failed" && (
          <AlertActionButton
            icon={
              ShieldCheck
            }
            label={
              isArabic
                ? "تم الحل"
                : "Resolve"
            }
            disabled={
              busy
            }
            onClick={
              onResolve
            }
          />
        )}
      </div>
    </article>
  );
}


function AlertActionButton({
  icon:
    Icon,
  label,
  disabled,
  secondary =
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

  disabled:
    boolean;

  secondary?:
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
      data-voice-label={
        label
      }
      className={`
        inline-flex
        min-h-[38px]
        w-full
        items-center
        justify-center
        gap-2
        rounded-[8px]
        border
        px-3
        text-[10px]
        font-black
        transition
        disabled:cursor-not-allowed
        disabled:opacity-45

        ${
          secondary
            ? "border-[#15313D] bg-[#06131D] text-[#AAB7BE] hover:border-[#00B8DB]/40 hover:text-[#50CFF2]"
            : "border-[#00B8DB]/55 bg-[#006C93] text-white hover:bg-[#007FA9]"
        }
      `}
    >
      {disabled ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Icon className="h-4 w-4" />
      )}


      {label}
    </button>
  );
}


function Badge({
  text,
  success =
    false,
  danger =
    false,
}: {
  text:
    string;

  success?:
    boolean;

  danger?:
    boolean;
}) {
  return (
    <span
      className={`
        rounded-full
        border
        px-2.5
        py-1
        text-[8px]
        font-black
        uppercase
        tracking-[0.06em]

        ${
          danger
            ? "border-red-400/25 bg-red-500/[0.06] text-red-300"
            : success
            ? "border-[#00B8DB]/25 bg-[#00B8DB]/[0.06] text-[#50CFF2]"
            : "border-[#15313D] bg-[#06131D] text-[#71808A]"
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
        rounded-[10px]
        border
        px-4
        py-3
        text-[11px]
        leading-5

        ${
          error
            ? "border-red-400/20 bg-red-500/[0.06] text-red-200"
            : success
            ? "border-[#00B8DB]/20 bg-[#00B8DB]/[0.05] text-[#9CEAF5]"
            : "border-[#15313D] bg-[#07111B] text-[#8C9AA3]"
        }
      `}
    >
      {loading ? (
        <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />
      ) : error ? (
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
      )}


      <span>
        {text}
      </span>
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
        mt-5
        rounded-[12px]
        border
        border-dashed
        border-[#15313D]
        bg-[#08111A]
        px-4
        py-8
        text-center
        text-[11px]
        text-[#71808A]
      "
    >
      {text}
    </div>
  );
}

