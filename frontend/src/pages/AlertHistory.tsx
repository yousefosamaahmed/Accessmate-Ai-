// src/pages/AlertHistory.tsx

import {
  useEffect,
  useMemo,
  useState,
  type ComponentType,
} from "react";

import {
  AlertTriangle,
  AudioLines,
  CheckCircle2,
  Clock3,
  Ear,
  Filter,
  History,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
} from "lucide-react";

import {
  api,
  getApiError,
  unwrapResponse,
} from "../lib/api";


type Language = "en" | "ar";

type AlertStatus =
  | "pending"
  | "sent"
  | "acknowledged"
  | "resolved"
  | "failed";

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

type HearingSoundEvent = {
  id: string;
  user_id: string;
  session_id?: string | null;
  care_alert_id?: string | null;
  client_id?: string | null;
  category: string;
  label?: string | null;
  confidence: number;
  threshold: number;
  model: string;
  is_critical: boolean;
  created_at: string;
};

type StatusFilter = "all" | AlertStatus;
type RiskFilter = "all" | "low" | "medium" | "high" | "emergency";
type SourceFilter =
  | "all"
  | "careboard"
  | "hearing_assistant"
  | "camera"
  | "workspace"
  | "voice";

const LANGUAGE_KEY = "accessmate_language";

function readLanguage(): Language {
  try {
    return localStorage.getItem(LANGUAGE_KEY) === "ar" ? "ar" : "en";
  } catch {
    return "en";
  }
}

function extractArray(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.alerts)) return payload.alerts;
  if (Array.isArray(payload?.events)) return payload.events;
  return [];
}

function normalize(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}

function formatDate(value: string | null | undefined, language: Language) {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat(language === "ar" ? "ar-EG" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatPercent(value: number | string | null | undefined) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "—";
  return `${Math.round(numeric * 100)}%`;
}

function prettyToken(value: string | null | undefined) {
  const token = String(value || "").trim();
  if (!token) return "—";

  return token
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function sourceLabel(source: string, language: Language) {
  const value = normalize(source);

  if (value === "hearing_assistant") {
    return language === "ar" ? "مساعد السمع" : "Hearing Assistant";
  }

  if (value === "careboard") return "CareBoard";
  if (value === "camera") return language === "ar" ? "الكاميرا" : "Camera";
  if (value === "workspace") return "Workspace";
  if (value === "voice") return language === "ar" ? "الصوت" : "Voice";
  if (value === "sign_language") {
    // Kept only for old database records; it is intentionally not offered as a filter anymore.
    return language === "ar" ? "سجل قديم - لغة الإشارة" : "Legacy - Sign Language";
  }

  return prettyToken(source);
}

export default function AlertHistory() {
  const [language, setLanguage] = useState<Language>(readLanguage);
  const [alerts, setAlerts] = useState<CareAlert[]>([]);
  const [soundEvents, setSoundEvents] = useState<HearingSoundEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isArabic = language === "ar";
  const txt = (english: string, arabic: string) => (isArabic ? arabic : english);

  useEffect(() => {
    function syncLanguage() {
      setLanguage(readLanguage());
    }

    function handleLanguageEvent(event: Event) {
      const custom = event as CustomEvent<{ language?: string }>;
      if (custom.detail?.language === "ar" || custom.detail?.language === "en") {
        setLanguage(custom.detail.language);
        return;
      }
      syncLanguage();
    }

    window.addEventListener("storage", syncLanguage);
    window.addEventListener("accessmate-public-language-change", handleLanguageEvent);
    window.addEventListener("accessmate-settings-updated", syncLanguage);

    return () => {
      window.removeEventListener("storage", syncLanguage);
      window.removeEventListener("accessmate-public-language-change", handleLanguageEvent);
      window.removeEventListener("accessmate-settings-updated", syncLanguage);
    };
  }, []);

  useEffect(() => {
    void loadHistory();
  }, []);

  function clearNotice() {
    setMessage("");
    setError("");
  }

  async function loadHistory() {
    setLoading(true);
    clearNotice();

    try {
      const response = await api.get("/care-alerts?limit=100");
      const payload = unwrapResponse<any>(response);
      const rows = (extractArray(payload) as CareAlert[]).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setAlerts(rows);

      // Sound-event enrichment is optional. Alert History still works if this request fails.
      try {
        const soundResponse = await api.get("/hearing/sound-events?limit=100");
        const soundPayload = unwrapResponse<any>(soundResponse);
        const events = (extractArray(soundPayload) as HearingSoundEvent[]).sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setSoundEvents(events);
      } catch {
        setSoundEvents([]);
      }
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }

  async function deleteAlert(alert: CareAlert) {
    clearNotice();

    const confirmed = window.confirm(
      isArabic
        ? `هل تريد حذف هذا التنبيه من السجل نهائيًا؟\n\n${alert.message}`
        : `Delete this alert from history permanently?\n\n${alert.message}`
    );

    if (!confirmed) return;

    setDeletingId(alert.id);
    try {
      await api.delete(`/care-alerts/${alert.id}`);
      setAlerts((current) => current.filter((item) => item.id !== alert.id));
      setSoundEvents((current) =>
        current.map((event) =>
          event.care_alert_id === alert.id ? { ...event, care_alert_id: null } : event
        )
      );
      setMessage(txt("Alert deleted from history.", "تم حذف التنبيه من السجل."));
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setDeletingId(null);
    }
  }

  const soundEventByAlertId = useMemo(() => {
    const map = new Map<string, HearingSoundEvent>();

    for (const event of soundEvents) {
      if (!event.care_alert_id) continue;
      if (!map.has(event.care_alert_id)) map.set(event.care_alert_id, event);
    }

    return map;
  }, [soundEvents]);

  const filteredAlerts = useMemo(() => {
    const query = normalize(searchTerm);

    return alerts.filter((alert) => {
      const linkedSound = soundEventByAlertId.get(alert.id);
      const statusMatch = statusFilter === "all" || alert.status === statusFilter;
      const riskMatch = riskFilter === "all" || normalize(alert.risk_level) === riskFilter;
      const sourceMatch = sourceFilter === "all" || normalize(alert.source) === sourceFilter;

      const searchMatch =
        !query ||
        normalize(alert.message).includes(query) ||
        normalize(alert.intent).includes(query) ||
        normalize(alert.source).includes(query) ||
        normalize(alert.risk_level).includes(query) ||
        normalize(alert.status).includes(query) ||
        normalize(linkedSound?.category).includes(query) ||
        normalize(linkedSound?.label).includes(query);

      return statusMatch && riskMatch && sourceMatch && searchMatch;
    });
  }, [alerts, riskFilter, searchTerm, soundEventByAlertId, sourceFilter, statusFilter]);

  const emergencyCount = useMemo(
    () => alerts.filter((alert) => normalize(alert.risk_level) === "emergency").length,
    [alerts]
  );

  const hearingCount = useMemo(
    () => alerts.filter((alert) => normalize(alert.source) === "hearing_assistant").length,
    [alerts]
  );

  const failedCount = useMemo(
    () => alerts.filter((alert) => alert.status === "failed").length,
    [alerts]
  );

  return (
    <main
      dir={isArabic ? "rtl" : "ltr"}
      data-voice-region={txt("Alert History", "سجل التنبيهات")}
      aria-label={txt("Alert History", "سجل التنبيهات")}
      className="alert-history-page h-full min-h-0 w-full overflow-y-auto text-white"
    >
      <div className="min-h-full w-full bg-black/48 px-5 py-6 backdrop-blur-[1px] lg:px-7 lg:py-7">
        <div className="mx-auto w-full max-w-[1500px] pb-12">
          <header className="flex flex-col gap-5 border-b border-cyan-400/[0.12] pb-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/[0.06] px-3.5 py-2 text-[12px] font-bold uppercase tracking-[0.14em] text-cyan-300">
                <History className="h-4 w-4" />
                {txt("Care Alert Timeline", "سجل تنبيهات الرعاية")}
              </span>

              <h1 className="mt-4 text-4xl font-black tracking-[-0.035em] text-white">
                {txt("Alert History", "سجل التنبيهات")}
              </h1>

              <p className="mt-2 max-w-3xl text-[15px] leading-7 text-slate-400">
                {txt(
                  "Review every care alert lifecycle, including Hearing Assistant emergencies and linked environmental-sound events.",
                  "راجع دورة حياة جميع تنبيهات الرعاية، بما فيها طوارئ مساعد السمع وأحداث الأصوات البيئية المرتبطة بها."
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadHistory()}
              disabled={loading}
              className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[13px] border border-cyan-400/20 bg-cyan-400/[0.04] px-4 text-[13px] font-bold text-slate-300 transition hover:border-cyan-400/40 hover:bg-cyan-400/[0.08] hover:text-cyan-200 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              {txt("Refresh", "تحديث")}
            </button>
          </header>

          <div className="mt-4 space-y-3" aria-live="polite" aria-atomic="true">
            {loading && <Notice loading text={txt("Loading alert history...", "جاري تحميل سجل التنبيهات...")} />}
            {message && <Notice success text={message} />}
            {error && <Notice error text={error} />}
          </div>

          <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label={txt("Total Alerts", "إجمالي التنبيهات")} value={String(alerts.length)} icon={History} />
            <SummaryCard label={txt("Hearing Assistant", "مساعد السمع")} value={String(hearingCount)} icon={Ear} />
            <SummaryCard label={txt("Emergency", "طوارئ")} value={String(emergencyCount)} icon={ShieldAlert} />
            <SummaryCard label={txt("Failed", "فشل الإرسال")} value={String(failedCount)} icon={AlertTriangle} />
          </section>

          <section className="mt-5 rounded-[22px] border border-cyan-400/[0.12] bg-[#041019]/82 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.24)] backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/[0.05] text-cyan-300">
                <Filter className="h-4 w-4" />
              </span>
              <div>
                <h2 className="font-black text-white">{txt("Filters", "الفلاتر")}</h2>
                <p className="mt-1 text-[11px] text-slate-500">
                  {txt(`${filteredAlerts.length} alerts shown`, `يتم عرض ${filteredAlerts.length} تنبيه`)}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(280px,1.4fr)_1fr_1fr_1fr]">
              <label className="history-control flex min-h-[50px] items-center gap-3 rounded-[13px] border border-cyan-400/15 bg-black/25 px-4 focus-within:border-cyan-400/45">
                <Search className="h-4 w-4 shrink-0 text-cyan-400/70" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder={txt(
                    "Search message, sound, source, risk...",
                    "ابحث في الرسالة أو الصوت أو المصدر أو الخطورة..."
                  )}
                  aria-label={txt("Search alert history", "البحث في سجل التنبيهات")}
                />
              </label>

              <FilterSelect
                value={statusFilter}
                label={txt("Status", "الحالة")}
                onChange={(value) => setStatusFilter(value as StatusFilter)}
                options={[
                  { value: "all", label: txt("All Statuses", "كل الحالات") },
                  { value: "pending", label: txt("Pending", "قيد الانتظار") },
                  { value: "sent", label: txt("Sent", "تم الإرسال") },
                  { value: "acknowledged", label: txt("Acknowledged", "تم تأكيد الاستلام") },
                  { value: "resolved", label: txt("Resolved", "تم الحل") },
                  { value: "failed", label: txt("Failed", "فشل") },
                ]}
              />

              <FilterSelect
                value={riskFilter}
                label={txt("Risk", "الخطورة")}
                onChange={(value) => setRiskFilter(value as RiskFilter)}
                options={[
                  { value: "all", label: txt("All Risks", "كل مستويات الخطورة") },
                  { value: "low", label: txt("Low", "منخفض") },
                  { value: "medium", label: txt("Medium", "متوسط") },
                  { value: "high", label: txt("High", "مرتفع") },
                  { value: "emergency", label: txt("Emergency", "طوارئ") },
                ]}
              />

              <FilterSelect
                value={sourceFilter}
                label={txt("Source", "المصدر")}
                onChange={(value) => setSourceFilter(value as SourceFilter)}
                options={[
                  { value: "all", label: txt("All Sources", "كل المصادر") },
                  { value: "careboard", label: "CareBoard" },
                  { value: "hearing_assistant", label: txt("Hearing Assistant", "مساعد السمع") },
                  { value: "camera", label: txt("Camera", "الكاميرا") },
                  { value: "workspace", label: "Workspace" },
                  { value: "voice", label: txt("Voice", "الصوت") },
                ]}
              />
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setRiskFilter("all");
                  setSourceFilter("all");
                }}
                className="text-[11px] font-bold text-slate-500 transition hover:text-cyan-300"
              >
                {txt("Clear Filters", "مسح الفلاتر")}
              </button>
            </div>
          </section>

          <section className="mt-5 rounded-[24px] border border-cyan-400/[0.12] bg-[#041019]/82 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.26)] backdrop-blur-xl lg:p-7">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] border border-cyan-400/20 bg-cyan-400/[0.05] text-cyan-300">
                  <Clock3 className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-xl font-black text-white">{txt("Care Alert Timeline", "سجل تنبيهات الرعاية")}</h2>
                  <p className="mt-1 text-[12px] text-slate-500">
                    {txt(
                      "Pending, sent, acknowledged, resolved and failed alerts",
                      "التنبيهات قيد الانتظار والمرسلة والمؤكد استلامها والمحلولة والفاشلة"
                    )}
                  </p>
                </div>
              </div>

              <span className="rounded-full border border-cyan-400/18 bg-cyan-400/[0.05] px-3 py-1.5 text-[11px] font-black text-cyan-300">
                {filteredAlerts.length}
              </span>
            </div>

            <div className="mt-6 space-y-4">
              {filteredAlerts.length === 0 ? (
                <EmptyState
                  text={
                    alerts.length === 0
                      ? txt("There are no care alerts yet.", "لا توجد تنبيهات رعاية حتى الآن.")
                      : txt("No alerts match the selected filters.", "لا توجد تنبيهات مطابقة للفلاتر المحددة.")
                  }
                />
              ) : (
                filteredAlerts.map((alert) => (
                  <HistoryCard
                    key={alert.id}
                    alert={alert}
                    soundEvent={soundEventByAlertId.get(alert.id) ?? null}
                    language={language}
                    deleting={deletingId === alert.id}
                    onDelete={() => void deleteAlert(alert)}
                  />
                ))
              )}
            </div>
          </section>
        </div>
      </div>

      <style>{`
        .alert-history-page {
          scrollbar-width: thin;
          scrollbar-color: rgba(34, 211, 238, 0.24) transparent;
        }
        .alert-history-page::-webkit-scrollbar { width: 7px; }
        .alert-history-page::-webkit-scrollbar-track { background: transparent; }
        .alert-history-page::-webkit-scrollbar-thumb {
          background: rgba(34, 211, 238, 0.22);
          border-radius: 999px;
        }
        .history-control input,
        .history-control select {
          width: 100%;
          min-width: 0;
          min-height: 46px;
          border: 0 !important;
          outline: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
          color: #f8fafc !important;
          font-size: 13px;
          font-weight: 600;
        }
        .history-control input::placeholder { color: rgb(71, 85, 105); }
        .history-control select option { background: #030a0f; color: #f8fafc; }
      `}</style>
    </main>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[18px] border border-cyan-400/[0.11] bg-[#041019]/82 p-4">
      <Icon className="h-5 w-5 text-cyan-300" />
      <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.10em] text-slate-500">{label}</p>
      <p className="mt-1 text-[20px] font-black text-white">{value}</p>
    </div>
  );
}

function FilterSelect({
  value,
  label,
  onChange,
  options,
}: {
  value: string;
  label: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="history-control flex min-h-[50px] items-center rounded-[13px] border border-cyan-400/15 bg-black/25 px-4 focus-within:border-cyan-400/45">
      <select value={value} onChange={(event) => onChange(event.target.value)} aria-label={label}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function HistoryCard({
  alert,
  soundEvent,
  language,
  deleting,
  onDelete,
}: {
  alert: CareAlert;
  soundEvent: HearingSoundEvent | null;
  language: Language;
  deleting: boolean;
  onDelete: () => void;
}) {
  const isArabic = language === "ar";
  const failed = alert.status === "failed";
  const emergency = normalize(alert.risk_level) === "emergency";
  const fromHearing = normalize(alert.source) === "hearing_assistant";

  return (
    <article
      className={`rounded-[18px] border p-5 ${
        failed
          ? "border-red-400/22 bg-red-500/[0.035]"
          : emergency
          ? "border-red-400/18 bg-red-500/[0.025]"
          : fromHearing
          ? "border-cyan-400/18 bg-cyan-400/[0.025]"
          : "border-cyan-400/[0.10] bg-black/20"
      }`}
    >
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={alert.status} language={language} />
            <RiskBadge risk={alert.risk_level} language={language} />
            <Badge text={sourceLabel(alert.source, language)} cyan={fromHearing} />
            <Badge text={prettyToken(alert.channel)} />
            {alert.confirmed_by_user && (
              <Badge text={isArabic ? "تم التأكيد من المستخدم" : "User Confirmed"} cyan />
            )}
          </div>

          <p className="mt-4 text-[15px] font-bold leading-7 text-slate-200">{alert.message}</p>

          {soundEvent && (
            <div
              className={`mt-4 flex flex-col gap-3 rounded-[14px] border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
                soundEvent.is_critical
                  ? "border-red-400/20 bg-red-500/[0.04]"
                  : "border-cyan-400/16 bg-cyan-400/[0.035]"
              }`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                    soundEvent.is_critical
                      ? "border-red-400/20 bg-red-500/[0.05] text-red-300"
                      : "border-cyan-400/20 bg-cyan-400/[0.05] text-cyan-300"
                  }`}
                >
                  <AudioLines className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.10em] text-slate-500">
                    {isArabic ? "صوت بيئي مرتبط" : "Linked Environmental Sound"}
                  </p>
                  <p className="mt-1 truncate text-[13px] font-bold text-slate-200">
                    {prettyToken(soundEvent.label || soundEvent.category)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
                <span className="rounded-full border border-white/[0.08] bg-white/[0.025] px-2.5 py-1">
                  {formatPercent(soundEvent.confidence)}
                </span>
                <span className="rounded-full border border-white/[0.08] bg-white/[0.025] px-2.5 py-1 uppercase">
                  {soundEvent.model || "YAMNet"}
                </span>
              </div>
            </div>
          )}

          {alert.error_message && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-400/15 bg-red-500/[0.04] px-3 py-2.5 text-[12px] leading-5 text-red-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {alert.error_message}
            </div>
          )}

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <TimelineItem label={isArabic ? "تم الإنشاء" : "Created"} value={formatDate(alert.created_at, language)} />
            <TimelineItem label={isArabic ? "تم الإرسال" : "Sent"} value={formatDate(alert.sent_at, language)} />
            <TimelineItem label={isArabic ? "تم تأكيد الاستلام" : "Acknowledged"} value={formatDate(alert.acknowledged_at, language)} />
            <TimelineItem label={isArabic ? "تم الحل" : "Resolved"} value={formatDate(alert.resolved_at, language)} />
          </div>
        </div>

        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          className="inline-flex min-h-[42px] shrink-0 items-center justify-center gap-2 rounded-xl border border-red-400/22 bg-red-500/[0.04] px-4 text-[12px] font-black text-red-300 transition hover:bg-red-500/[0.09] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          {isArabic ? "حذف" : "Delete"}
        </button>
      </div>
    </article>
  );
}

function TimelineItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] border border-cyan-400/[0.08] bg-black/18 px-3 py-3">
      <p className="text-[9px] font-black uppercase tracking-[0.08em] text-slate-600">{label}</p>
      <p className="mt-1.5 text-[11px] font-semibold leading-5 text-slate-400">{value}</p>
    </div>
  );
}

function StatusBadge({ status, language }: { status: AlertStatus; language: Language }) {
  const isArabic = language === "ar";

  const labels: Record<AlertStatus, string> = {
    pending: isArabic ? "قيد الانتظار" : "Pending",
    sent: isArabic ? "تم الإرسال" : "Sent",
    acknowledged: isArabic ? "تم تأكيد الاستلام" : "Acknowledged",
    resolved: isArabic ? "تم الحل" : "Resolved",
    failed: isArabic ? "فشل" : "Failed",
  };

  const classes: Record<AlertStatus, string> = {
    pending: "border-amber-400/25 bg-amber-400/[0.06] text-amber-300",
    sent: "border-cyan-400/25 bg-cyan-400/[0.06] text-cyan-300",
    acknowledged: "border-violet-400/25 bg-violet-400/[0.06] text-violet-300",
    resolved: "border-emerald-400/25 bg-emerald-400/[0.06] text-emerald-300",
    failed: "border-red-400/25 bg-red-500/[0.06] text-red-300",
  };

  return (
    <span className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.06em] ${classes[status]}`}>
      {labels[status]}
    </span>
  );
}

function RiskBadge({ risk, language }: { risk: string; language: Language }) {
  const normalized = normalize(risk);
  const dangerous = normalized === "emergency" || normalized === "high";
  const medium = normalized === "medium";

  let label = prettyToken(risk);
  if (language === "ar") {
    if (normalized === "low") label = "منخفض";
    if (normalized === "medium") label = "متوسط";
    if (normalized === "high") label = "مرتفع";
    if (normalized === "emergency") label = "طوارئ";
  }

  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.06em] ${
        dangerous
          ? "border-red-400/25 bg-red-500/[0.06] text-red-300"
          : medium
          ? "border-amber-400/25 bg-amber-400/[0.06] text-amber-300"
          : "border-cyan-400/18 bg-cyan-400/[0.035] text-cyan-300"
      }`}
    >
      {label}
    </span>
  );
}

function Badge({ text, cyan = false }: { text: string; cyan?: boolean }) {
  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.06em] ${
        cyan
          ? "border-cyan-400/22 bg-cyan-400/[0.05] text-cyan-300"
          : "border-white/[0.08] bg-white/[0.025] text-slate-500"
      }`}
    >
      {text}
    </span>
  );
}

function Notice({
  text,
  success = false,
  error = false,
  loading = false,
}: {
  text: string;
  success?: boolean;
  error?: boolean;
  loading?: boolean;
}) {
  return (
    <div
      role={error ? "alert" : "status"}
      className={`flex items-start gap-3 rounded-[14px] border px-4 py-3 text-[13px] leading-6 ${
        error
          ? "border-red-400/20 bg-red-500/[0.06] text-red-200"
          : success
          ? "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-200"
          : "border-cyan-400/12 bg-cyan-400/[0.025] text-slate-400"
      }`}
    >
      {loading ? (
        <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />
      ) : error ? (
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
      )}
      {text}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-[16px] border border-dashed border-cyan-400/[0.12] bg-black/16 px-4 py-12 text-center">
      <History className="mx-auto h-8 w-8 text-cyan-400/35" />
      <p className="mt-3 text-[13px] font-semibold text-slate-500">{text}</p>
    </div>
  );
}
