// src/pages/WebsiteSafety.tsx

import {
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Copy,
  Database,
  Globe2,
  History,
  Info,
  Languages,
  Loader2,
  Lock,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";

import {
  api,
  getApiError,
  unwrapResponse,
} from "../lib/api";


type PageSection =
  | "check"
  | "trusted"
  | "history";


type RiskLevel =
  | "low"
  | "caution"
  | "suspicious"
  | "dangerous";


type ThreatProviderStatus =
  | "clean"
  | "matched"
  | "not_checked"
  | "unavailable"
  | "error"
  | string;


type WebsiteSafetySignal = {
  signal: string;
  severity: string;
  description: string;
  source?: string;
};


type ThreatSource = {
  provider: string;
  status: ThreatProviderStatus;
  matched: boolean;
  threat_types: string[];
  details?: string | null;
};


type ThreatIntelligence = {
  checked: boolean;
  is_known_threat: boolean;
  sources: ThreatSource[];
};


type OfficialDomainInfo = {
  status: string;
  brand?: string | null;
  official_root_domain?: string | null;
  registrable_domain?: string | null;
  is_official_domain: boolean;
  is_trusted_domain: boolean;
  is_possible_impersonation: boolean;
  similarity_score?: number | null;
};


type WebsiteSafetyResult = {
  input_url: string;
  normalized_url?: string | null;
  domain?: string | null;
  registrable_domain?: string | null;
  scheme?: string | null;

  official_domain: OfficialDomainInfo;

  threat_intelligence: ThreatIntelligence;

  risk_score: number;
  risk_level: RiskLevel;
  verdict: string;

  is_potentially_riemerald: boolean;
  is_known_threat: boolean;

  recommended_action:
    | "allow"
    | "caution"
    | "warn"
    | "block"
    | string;

  signals: WebsiteSafetySignal[];

  recommendation: string;
  simple_explanation: string;

  language: string;
  explanation_level: string;
  voice_friendly: boolean;

  engine_version?: string | null;
};


type WebsiteCheckHistory = {
  id: string;
  user_id: string;

  url: string;
  normalized_url?: string | null;

  domain?: string | null;
  registrable_domain?: string | null;
  scheme?: string | null;

  status?: string | null;

  risk_score?: number | null;
  risk_level?: RiskLevel | null;

  is_potentially_riemerald?: boolean | null;
  is_known_threat?: boolean | null;

  action?: string | null;

  verdict?: string | null;
  recommendation?: string | null;
  simple_explanation?: string | null;

  expected_domain?: string | null;
  brand?: string | null;
  official_root_domain?: string | null;

  is_official_domain?: boolean | null;
  is_trusted_domain?: boolean | null;
  is_possible_impersonation?: boolean | null;

  similarity_score?: number | null;

  official_domain?: OfficialDomainInfo | null;

  threat_intelligence?: ThreatIntelligence | null;

  signals?: WebsiteSafetySignal[] | null;

  reason?: string | null;

  language?: string | null;
  explanation_level?: string | null;
  voice_friendly?: boolean | null;

  engine_version?: string | null;

  checked_at: string;
};


type TrustedDomain = {
  id: string;
  user_id: string;

  brand_name: string;
  official_domain: string;
  category?: string | null;

  created_at: string;
  updated_at: string;
};


type TrustedDomainForm = {
  brandName: string;
  officialDomain: string;
  category: string;
};


const EMPTY_TRUSTED_FORM: TrustedDomainForm = {
  brandName: "",
  officialDomain: "",
  category: "",
};


function getInitialLanguage(): "en" | "ar" {
  const saved = localStorage.getItem(
    "accessmate_language"
  );

  return saved === "ar"
    ? "ar"
    : "en";
}


function normalizeProviderName(
  value: string
): string {
  const provider = String(
    value || ""
  ).toLowerCase();

  if (provider === "phishtank") {
    return "PhishTank";
  }

  if (
    provider === "openphish_community"
    || provider === "openphish"
  ) {
    return "OpenPhish";
  }

  if (provider === "urlhaus") {
    return "URLhaus";
  }

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) =>
      char.toUpperCase()
    );
}


function formatDate(
  value?: string | null,
  language: "en" | "ar" = "en"
): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    language === "ar"
      ? "ar-EG"
      : "en-US",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(date);
}


function copyToClipboard(
  value: string
) {
  if (!value) {
    return;
  }

  navigator.clipboard
    ?.writeText(value)
    .catch(() => {
      // Clipboard permission can be unavailable.
    });
}


function riskClasses(
  riskLevel?: string | null
) {
  switch (riskLevel) {
    case "dangerous":
      return {
        container:
          "border-red-400/30 bg-red-500/10",
        badge:
          "border-red-400/30 bg-red-500/15 text-red-200",
        text:
          "text-red-300",
        bar:
          "bg-red-400",
      };

    case "suspicious":
      return {
        container:
          "border-orange-400/30 bg-orange-500/10",
        badge:
          "border-orange-400/30 bg-orange-500/15 text-orange-200",
        text:
          "text-orange-300",
        bar:
          "bg-orange-400",
      };

    case "caution":
      return {
        container:
          "border-amber-400/30 bg-amber-500/10",
        badge:
          "border-amber-400/30 bg-amber-500/15 text-amber-200",
        text:
          "text-amber-300",
        bar:
          "bg-amber-400",
      };

    default:
      return {
        container:
          "border-cyan-400/25 bg-cyan-500/10",
        badge:
          "border-cyan-400/25 bg-cyan-500/15 text-cyan-200",
        text:
          "text-cyan-300",
        bar:
          "bg-cyan-400",
      };
  }
}


function severityClasses(
  severity?: string
) {
  switch (
    String(
      severity || ""
    ).toLowerCase()
  ) {
    case "critical":
      return "border-red-400/25 bg-red-500/10 text-red-100";

    case "high":
      return "border-orange-400/25 bg-orange-500/10 text-orange-100";

    case "medium":
      return "border-amber-400/25 bg-amber-500/10 text-amber-100";

    case "low":
      return "border-cyan-400/25 bg-cyan-500/10 text-cyan-100";

    default:
      return "border-white/10 bg-[#061018]/78 text-slate-200";
  }
}


export default function WebsiteSafety() {
  const [
    language,
    setLanguage,
  ] = useState<"en" | "ar">(
    getInitialLanguage
  );

  const isArabic =
    language === "ar";

  const [
    activeSection,
    setActiveSection,
  ] = useState<PageSection>(
    "check"
  );

  const [
    url,
    setUrl,
  ] = useState("");

  const [
    result,
    setResult,
  ] = useState<
    WebsiteSafetyResult | null
  >(null);

  const [
    history,
    setHistory,
  ] = useState<
    WebsiteCheckHistory[]
  >([]);

  const [
    trustedDomains,
    setTrustedDomains,
  ] = useState<
    TrustedDomain[]
  >([]);

  const [
    trustedForm,
    setTrustedForm,
  ] = useState<TrustedDomainForm>(
    EMPTY_TRUSTED_FORM
  );

  const [
    editingTrustedId,
    setEditingTrustedId,
  ] = useState<
    string | null
  >(null);

  const [
    initialLoading,
    setInitialLoading,
  ] = useState(true);

  const [
    checking,
    setChecking,
  ] = useState(false);

  const [
    trustedSaving,
    setTrustedSaving,
  ] = useState(false);

  const [
    deletingId,
    setDeletingId,
  ] = useState<
    string | null
  >(null);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");


  const txt = (
    english: string,
    arabic: string
  ) =>
    isArabic
      ? arabic
      : english;


  useEffect(() => {
    void loadInitialData();
  }, []);


  async function loadInitialData() {
    setInitialLoading(true);

    await Promise.allSettled([
      loadHistory(),
      loadTrustedDomains(),
    ]);

    setInitialLoading(false);
  }


  async function loadHistory() {
    try {
      const response =
        await api.get(
          "/website-safety/history?limit=50&offset=0"
        );

      const payload =
        unwrapResponse<
          WebsiteCheckHistory[]
        >(response);

      setHistory(
        Array.isArray(payload)
          ? payload
          : []
      );
    } catch (err) {
      console.error(
        "Website Safety history error:",
        err
      );
    }
  }


  async function loadTrustedDomains() {
    try {
      const response =
        await api.get(
          "/website-safety/trusted-domains"
        );

      const payload =
        unwrapResponse<
          TrustedDomain[]
        >(response);

      setTrustedDomains(
        Array.isArray(payload)
          ? payload
          : []
      );
    } catch (err) {
      console.error(
        "Trusted domains error:",
        err
      );
    }
  }


  async function handleCheck(
    event: FormEvent
  ) {
    event.preventDefault();

    const cleanUrl =
      url.trim();

    if (!cleanUrl) {
      setError(
        txt(
          "Enter a website URL first.",
          "اكتب رابط الموقع أولاً."
        )
      );

      return;
    }

    setChecking(true);
    setError("");
    setSuccess("");

    try {
      const response =
        await api.post(
          "/website-safety/check",
          {
            url: cleanUrl,
            language,
            explanation_level:
              "simple",
            voice_friendly:
              true,
          }
        );

      const payload =
        unwrapResponse<
          WebsiteSafetyResult
        >(response);

      setResult(payload);

      await loadHistory();

    } catch (err) {
      setError(
        getApiError(err)
      );
    } finally {
      setChecking(false);
    }
  }


  function prepareTrustedDomainFromResult() {
    if (!result) {
      return;
    }

    const domain =
      result.registrable_domain
      || result.domain
      || "";

    if (!domain) {
      return;
    }

    setTrustedForm({
      brandName:
        result.official_domain
          ?.brand
        || domain.split(".")[0]
        || "Trusted website",

      officialDomain:
        domain,

      category:
        "Personal",
    });

    setEditingTrustedId(
      null
    );

    setActiveSection(
      "trusted"
    );
  }


  async function saveTrustedDomain(
    event: FormEvent
  ) {
    event.preventDefault();

    if (
      !trustedForm.brandName.trim()
      || !trustedForm.officialDomain.trim()
    ) {
      setError(
        txt(
          "Brand name and domain are required.",
          "اسم الموقع والدومين مطلوبان."
        )
      );

      return;
    }

    setTrustedSaving(true);
    setError("");
    setSuccess("");

    const body = {
      brand_name:
        trustedForm.brandName.trim(),

      official_domain:
        trustedForm.officialDomain.trim(),

      category:
        trustedForm.category.trim()
        || null,
    };

    try {
      if (editingTrustedId) {
        await api.patch(
          `/website-safety/trusted-domains/${editingTrustedId}`,
          body
        );

        setSuccess(
          txt(
            "Trusted domain updated.",
            "تم تحديث الدومين الموثوق."
          )
        );
      } else {
        await api.post(
          "/website-safety/trusted-domains",
          body
        );

        setSuccess(
          txt(
            "Domain added to your trusted list.",
            "تمت إضافة الدومين إلى قائمة المواقع الموثوقة."
          )
        );
      }

      setTrustedForm(
        EMPTY_TRUSTED_FORM
      );

      setEditingTrustedId(
        null
      );

      await loadTrustedDomains();

    } catch (err) {
      setError(
        getApiError(err)
      );
    } finally {
      setTrustedSaving(false);
    }
  }


  function startEditingTrustedDomain(
    item: TrustedDomain
  ) {
    setEditingTrustedId(
      item.id
    );

    setTrustedForm({
      brandName:
        item.brand_name,

      officialDomain:
        item.official_domain,

      category:
        item.category || "",
    });

    setError("");
    setSuccess("");
  }


  function cancelTrustedEdit() {
    setEditingTrustedId(
      null
    );

    setTrustedForm(
      EMPTY_TRUSTED_FORM
    );
  }


  async function deleteTrustedDomain(
    item: TrustedDomain
  ) {
    const approved =
      window.confirm(
        txt(
          `Remove ${item.official_domain} from your trusted domains?`,
          `هل تريد حذف ${item.official_domain} من المواقع الموثوقة؟`
        )
      );

    if (!approved) {
      return;
    }

    setDeletingId(
      item.id
    );

    setError("");
    setSuccess("");

    try {
      await api.delete(
        `/website-safety/trusted-domains/${item.id}`
      );

      setTrustedDomains(
        (current) =>
          current.filter(
            (domain) =>
              domain.id
              !== item.id
          )
      );

      setSuccess(
        txt(
          "Trusted domain removed.",
          "تم حذف الدومين من المواقع الموثوقة."
        )
      );

    } catch (err) {
      setError(
        getApiError(err)
      );
    } finally {
      setDeletingId(
        null
      );
    }
  }


  async function deleteHistoryItem(
    item: WebsiteCheckHistory
  ) {
    const approved =
      window.confirm(
        txt(
          `Delete the saved check for ${item.domain || item.url}?`,
          `هل تريد حذف نتيجة فحص ${item.domain || item.url}؟`
        )
      );

    if (!approved) {
      return;
    }

    setDeletingId(
      item.id
    );

    setError("");
    setSuccess("");

    try {
      await api.delete(
        `/website-safety/history/${item.id}`
      );

      setHistory(
        (current) =>
          current.filter(
            (entry) =>
              entry.id
              !== item.id
          )
      );

      setSuccess(
        txt(
          "History item deleted.",
          "تم حذف نتيجة الفحص."
        )
      );

    } catch (err) {
      setError(
        getApiError(err)
      );
    } finally {
      setDeletingId(
        null
      );
    }
  }


  function loadHistoryIntoResult(
    item: WebsiteCheckHistory
  ) {
    const reconstructed:
      WebsiteSafetyResult = {
      input_url:
        item.url,

      normalized_url:
        item.normalized_url,

      domain:
        item.domain,

      registrable_domain:
        item.registrable_domain,

      scheme:
        item.scheme,

      official_domain:
        item.official_domain
        || {
          status:
            item.is_trusted_domain
              ? "trusted"
              : item.is_official_domain
                ? "official"
                : "unknown",

          brand:
            item.brand,

          official_root_domain:
            item.official_root_domain,

          registrable_domain:
            item.registrable_domain,

          is_official_domain:
            Boolean(
              item.is_official_domain
            ),

          is_trusted_domain:
            Boolean(
              item.is_trusted_domain
            ),

          is_possible_impersonation:
            Boolean(
              item.is_possible_impersonation
            ),

          similarity_score:
            item.similarity_score,
        },

      threat_intelligence:
        item.threat_intelligence
        || {
          checked: false,
          is_known_threat:
            Boolean(
              item.is_known_threat
            ),
          sources: [],
        },

      risk_score:
        item.risk_score
        ?? 0,

      risk_level:
        item.risk_level
        || "low",

      verdict:
        item.verdict
        || "",

      is_potentially_riemerald:
        Boolean(
          item.is_potentially_riemerald
        ),

      is_known_threat:
        Boolean(
          item.is_known_threat
        ),

      recommended_action:
        item.action
        || "allow",

      signals:
        item.signals
        || [],

      recommendation:
        item.recommendation
        || "",

      simple_explanation:
        item.simple_explanation
        || "",

      language:
        item.language
        || language,

      explanation_level:
        item.explanation_level
        || "simple",

      voice_friendly:
        item.voice_friendly
        ?? true,

      engine_version:
        item.engine_version,
    };

    setResult(
      reconstructed
    );

    setUrl(
      item.url
    );

    setActiveSection(
      "check"
    );
  }


  function toggleLanguage() {
    const next =
      language === "en"
        ? "ar"
        : "en";

    setLanguage(
      next
    );

    localStorage.setItem(
      "accessmate_language",
      next
    );
  }


  const riskStyle =
    riskClasses(
      result?.risk_level
    );


  const riskScore =
    Math.max(
      0,
      Math.min(
        100,
        result?.risk_score
        ?? 0
      )
    );


  const canTrustCurrentResult =
    Boolean(
      result
      && !result.is_known_threat
      && result.risk_level
        !== "dangerous"
      && !result.official_domain
        ?.is_trusted_domain
    );


  const providerStats =
    useMemo(() => {
      const sources =
        result
          ?.threat_intelligence
          ?.sources
        || [];

      return {
        total:
          sources.length,

        clean:
          sources.filter(
            (source) =>
              source.status
              === "clean"
          ).length,

        matched:
          sources.filter(
            (source) =>
              source.matched
              || source.status
                === "matched"
          ).length,
      };
    }, [result]);


  return (
    <main
      data-voice-region="Website Safety"
      aria-label="Website Safety"
      dir={
        isArabic
          ? "rtl"
          : "ltr"
      }
      className="
        website-safety-page
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
          bg-[#000912]
          px-4
          py-6
          backdrop-blur-[1px]
          sm:px-6
          lg:px-8
        "
      >
        <div
          className="
            mx-auto
            w-full
            max-w-[1500px]
          "
        >
          {/* ==================================================
              HEADER
              ================================================== */}

          <header
            className="
              mb-6
              flex
              flex-col
              gap-5
              lg:flex-row
              lg:items-center
              lg:justify-between
            "
          >
            <div>
              <div
                className="
                  mb-3
                  inline-flex
                  items-center
                  gap-2
                  rounded-full
                  border
                  border-cyan-400/25
                  bg-cyan-400/[0.055]
                  px-3
                  py-1.5
                  text-[10px]
                  font-black
                  uppercase
                  tracking-[0.15em]
                  text-[#30AFDC]
                "
              >
                <ShieldCheck
                  className="h-4 w-4"
                />

                {txt(
                  "Website Protection",
                  "حماية المواقع"
                )}
              </div>

              <h1
                className="
                  text-[30px]
                  font-black
                  tracking-[-0.035em]
                  text-white
                  sm:text-[34px]
                "
              >
                {txt(
                  "Website Safety",
                  "أمان المواقع"
                )}
              </h1>

              <p
                className="
                  mt-2
                  max-w-2xl
                  text-sm
                  leading-6
                  text-slate-300
                  sm:text-base
                "
              >
                {txt(
                  "Check suspicious links before you trust them, sign in, download files, or enter personal information.",
                  "افحص الروابط المشبوهة قبل تسجيل الدخول أو تحميل الملفات أو إدخال أي معلومات شخصية."
                )}
              </p>
            </div>

            <div
              className="
                flex
                flex-wrap
                items-center
                gap-2
              "
            >
              <ProviderMiniBadge
                label="PhishTank"
              />

              <ProviderMiniBadge
                label="OpenPhish"
              />

              <ProviderMiniBadge
                label="URLhaus"
              />

              <button
                type="button"
                onClick={
                  toggleLanguage
                }
                className="
                  ml-1
                  inline-flex
                  h-10
                  items-center
                  gap-2
                  rounded-xl
                  border
                  border-white/10
                  bg-[#061018]/88
                  px-3
                  text-sm
                  font-medium
                  text-slate-200
                  transition
                  hover:border-cyan-400/30
                  hover:bg-cyan-400/10
                  focus:outline-none
                  focus:ring-2
                  focus:ring-cyan-400/50
                "
              >
                <Languages
                  className="h-4 w-4"
                />

                {language === "en"
                  ? "AR"
                  : "EN"}
              </button>
            </div>
          </header>


          {/* ==================================================
              ALERTS
              ================================================== */}

          <div
            aria-live="polite"
            className="mb-5 space-y-3"
          >
            {error && (
              <div
                className="
                  flex
                  items-start
                  gap-3
                  rounded-2xl
                  border
                  border-red-400/25
                  bg-red-500/10
                  px-4
                  py-3
                  text-sm
                  text-red-100
                "
              >
                <AlertTriangle
                  className="
                    mt-0.5
                    h-5
                    w-5
                    shrink-0
                    text-red-300
                  "
                />

                <span>
                  {error}
                </span>
              </div>
            )}

            {success && (
              <div
                className="
                  flex
                  items-start
                  gap-3
                  rounded-2xl
                  border
                  border-cyan-400/25
                  bg-cyan-500/10
                  px-4
                  py-3
                  text-sm
                  text-cyan-100
                "
              >
                <CheckCircle2
                  className="
                    mt-0.5
                    h-5
                    w-5
                    shrink-0
                    text-cyan-300
                  "
                />

                <span>
                  {success}
                </span>
              </div>
            )}
          </div>


          {/* ==================================================
              NAVIGATION
              ================================================== */}

          <nav
            data-voice-region="Website Safety sections"
            aria-label={txt(
              "Website Safety sections",
              "أقسام أمان المواقع"
            )}
            className="
              mb-6
              grid
              grid-cols-3
              gap-2
              rounded-2xl
              border
              border-[#15313D]
              bg-[#04101A]/94
              p-1.5
              shadow-[0_20px_60px_rgba(0,0,0,0.32)]
              
              backdrop-blur-xl
            "
          >
            <SectionButton
              active={
                activeSection
                === "check"
              }
              label={txt(
                "Check URL",
                "فحص رابط"
              )}
              icon={
                Search
              }
              onClick={() =>
                setActiveSection(
                  "check"
                )
              }
            />

            <SectionButton
              active={
                activeSection
                === "trusted"
              }
              label={txt(
                "Trusted Domains",
                "المواقع الموثوقة"
              )}
              icon={
                Lock
              }
              badge={
                trustedDomains.length
              }
              onClick={() =>
                setActiveSection(
                  "trusted"
                )
              }
            />

            <SectionButton
              active={
                activeSection
                === "history"
              }
              label={txt(
                "History",
                "السجل"
              )}
              icon={
                History
              }
              badge={
                history.length
              }
              onClick={() =>
                setActiveSection(
                  "history"
                )
              }
            />
          </nav>


          {/* ==================================================
              CHECK URL
              ================================================== */}

          {activeSection === "check" && (
            <section>
              <div
                className="
                  overflow-hidden
                  rounded-[22px]
                  border
                  border-[#15313D]
                  bg-[#04101A]/94
                  shadow-[0_20px_60px_rgba(0,0,0,0.32)]
                  shadow-cyan-950/20
                  backdrop-blur-2xl
                "
              >
                <div
                  className="
                    border-b
                    border-white/10
                    bg-gradient-to-r
                    from-cyan-500/10
                    via-cyan-400/[0.07]
                    to-transparent
                    px-5
                    py-5
                    sm:px-7
                  "
                >
                  <div
                    className="
                      flex
                      items-start
                      gap-4
                    "
                  >
                    <div
                      className="
                        flex
                        h-12
                        w-12
                        shrink-0
                        items-center
                        justify-center
                        rounded-2xl
                        border
                        border-cyan-400/25
                        bg-cyan-400/10
                        text-cyan-200
                      "
                    >
                      <Globe2
                        className="h-6 w-6"
                      />
                    </div>

                    <div>
                      <h2
                        className="
                          text-lg
                          font-semibold
                          text-white
                        "
                      >
                        {txt(
                          "Check a website",
                          "افحص موقعًا"
                        )}
                      </h2>

                      <p
                        className="
                          mt-1
                          text-sm
                          leading-6
                          text-slate-400
                        "
                      >
                        {txt(
                          "Paste the full link or domain. AccessMate checks domain identity, suspicious patterns, phishing sources, and malware intelligence.",
                          "الصق الرابط الكامل أو الدومين. يقوم AccessMate بفحص هوية الموقع والأنماط المشبوهة ومصادر التصيد والبرمجيات الضارة."
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <form
                  aria-label={txt(
                    "Check website form",
                    "نموذج فحص الموقع"
                  )}
                  data-voice-region="Website scanner"
                  onSubmit={
                    handleCheck
                  }
                  className="
                    p-5
                    sm:p-7
                  "
                >
                  <label
                    htmlFor="website-safety-url"
                    className="
                      mb-2
                      block
                      text-sm
                      font-medium
                      text-slate-200
                    "
                  >
                    {txt(
                      "Website URL",
                      "رابط الموقع"
                    )}
                  </label>

                  <div
                    className="
                      flex
                      flex-col
                      gap-3
                      sm:flex-row
                    "
                  >
                    <div
                      className="
                        group
                        flex
                        min-h-[56px]
                        flex-1
                        items-center
                        gap-3
                        rounded-2xl
                        border
                        border-[#15313D]
                        bg-[#03101A]
                        px-4
                        transition
                        focus-within:border-cyan-400/45
                        focus-within:bg-cyan-400/[0.05]
                        focus-within:ring-4
                        focus-within:ring-cyan-400/[0.06]
                      "
                    >
                      <Search
                        className="
                          h-5
                          w-5
                          shrink-0
                          text-slate-500
                          transition
                          group-focus-within:text-cyan-300
                        "
                      />

                      <input
                        id="website-safety-url"
                        aria-label={txt(
                          "Website URL to check",
                          "رابط الموقع المراد فحصه"
                        )}
                        data-voice-label={txt(
                          "Website URL to check",
                          "رابط الموقع المراد فحصه"
                        )}
                        value={url}
                        onChange={(event) =>
                          setUrl(
                            event.target.value
                          )
                        }
                        placeholder={txt(
                          "https://example.com",
                          "https://example.com"
                        )}
                        autoComplete="url"
                        spellCheck={false}
                        className="
                          h-full
                          w-full
                          bg-transparent
                          py-4
                          text-sm
                          text-white
                          outline-none
                          placeholder:text-slate-600
                        "
                      />

                      {url && (
                        <button
                          type="button"
                          onClick={() =>
                            setUrl("")
                          }
                          aria-label={txt(
                            "Clear URL",
                            "مسح الرابط"
                          )}
                          className="
                            rounded-lg
                            p-1
                            text-slate-500
                            transition
                            hover:bg-white/10
                            hover:text-white
                          "
                        >
                          <X
                            className="h-4 w-4"
                          />
                        </button>
                      )}
                    </div>

                    <button
                      type="submit"
                      aria-label={txt(
                        "Check Website",
                        "فحص الموقع"
                      )}
                      data-voice-label={txt(
                        "Check Website",
                        "فحص الموقع"
                      )}
                      disabled={
                        checking
                      }
                      className="
                        inline-flex
                        min-h-[56px]
                        items-center
                        justify-center
                        gap-2
                        rounded-2xl
                        border
                        border-cyan-300/25
                        bg-[#006C93]
                        px-6
                        text-sm
                        font-black
                        text-white
                        shadow-[0_0_28px_rgba(0,184,219,0.16)]
                        shadow-[0_0_28px_rgba(0,184,219,0.16)]
                        transition
                        hover:bg-[#007FA9] hover:-translate-y-0.5
                        disabled:cursor-not-allowed
                        disabled:opacity-60
                        focus:outline-none
                        focus:ring-2
                        focus:ring-cyan-400/60
                      "
                    >
                      {checking ? (
                        <Loader2
                          className="
                            h-5
                            w-5
                            animate-spin
                          "
                        />
                      ) : (
                        <ShieldCheck
                          className="h-5 w-5"
                        />
                      )}

                      {checking
                        ? txt(
                            "Checking...",
                            "جاري الفحص..."
                          )
                        : txt(
                            "Check Website",
                            "فحص الموقع"
                          )}
                    </button>
                  </div>

                  <div
                    className="
                      mt-4
                      flex
                      items-start
                      gap-2
                      text-xs
                      leading-5
                      text-slate-500
                    "
                  >
                    <Info
                      className="
                        mt-0.5
                        h-4
                        w-4
                        shrink-0
                      "
                    />

                    <span>
                      {txt(
                        "A low-risk result means no major configured signal or known threat match was found. It is not a guarantee that a website is safe.",
                        "النتيجة منخفضة الخطورة تعني عدم العثور على إشارة خطرة كبيرة أو تهديد معروف في المصادر المفعلة، لكنها ليست ضمانًا مطلقًا لأمان الموقع."
                      )}
                    </span>
                  </div>
                </form>
              </div>


              {/* ==============================================
                  RESULT
                  ============================================== */}

              {result && (
                <div
                  className="
                    mt-6
                    space-y-5
                  "
                >
                  <div
                    className={`
                      rounded-[22px]
                      border
                      p-5
                      shadow-[0_20px_60px_rgba(0,0,0,0.32)]
                      backdrop-blur-2xl
                      sm:p-7
                      ${riskStyle.container}
                    `}
                  >
                    <div
                      className="
                        flex
                        flex-col
                        gap-6
                        lg:flex-row
                        lg:items-start
                        lg:justify-between
                      "
                    >
                      <div
                        className="
                          min-w-0
                          flex-1
                        "
                      >
                        <div
                          className="
                            flex
                            flex-wrap
                            items-center
                            gap-2
                          "
                        >
                          <span
                            className={`
                              inline-flex
                              items-center
                              rounded-full
                              border
                              px-3
                              py-1
                              text-xs
                              font-semibold
                              uppercase
                              tracking-wider
                              ${riskStyle.badge}
                            `}
                          >
                            {result.risk_level}
                          </span>

                          <span
                            className="
                              inline-flex
                              items-center
                              rounded-full
                              border
                              border-white/10
                              bg-[#03101A]
                              px-3
                              py-1
                              text-xs
                              font-medium
                              text-slate-300
                            "
                          >
                            {String(
                              result.recommended_action
                            ).toUpperCase()}
                          </span>

                          {result.official_domain
                            ?.is_official_domain && (
                            <span
                              className="
                                inline-flex
                                items-center
                                gap-1.5
                                rounded-full
                                border
                                border-cyan-400/22
                                bg-cyan-400/[0.06]
                                px-3
                                py-1
                                text-xs
                                font-medium
                                text-cyan-200
                              "
                            >
                              <CheckCircle2
                                className="h-3.5 w-3.5"
                              />

                              {txt(
                                "Official domain",
                                "دومين رسمي"
                              )}
                            </span>
                          )}

                          {result.official_domain
                            ?.is_trusted_domain && (
                            <span
                              className="
                                inline-flex
                                items-center
                                gap-1.5
                                rounded-full
                                border
                                border-cyan-400/22
                                bg-cyan-400/[0.06]
                                px-3
                                py-1
                                text-xs
                                font-medium
                                text-cyan-200
                              "
                            >
                              <Lock
                                className="h-3.5 w-3.5"
                              />

                              {txt(
                                "Trusted by you",
                                "موثوق بواسطتك"
                              )}
                            </span>
                          )}
                        </div>

                        <h2
                          className="
                            mt-4
                            text-xl
                            font-semibold
                            text-white
                            sm:text-2xl
                          "
                        >
                          {result.verdict}
                        </h2>

                        <div
                          className="
                            mt-4
                            flex
                            items-center
                            gap-2
                            text-sm
                            text-slate-300
                          "
                        >
                          <Globe2
                            className="
                              h-4
                              w-4
                              shrink-0
                              text-cyan-300
                            "
                          />

                          <span
                            className="
                              min-w-0
                              truncate
                              font-mono
                            "
                            title={
                              result.domain
                              || ""
                            }
                          >
                            {result.domain
                            || result.input_url}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              copyToClipboard(
                                result.normalized_url
                                || result.input_url
                              )
                            }
                            className="
                              rounded-lg
                              p-1.5
                              text-slate-500
                              transition
                              hover:bg-white/10
                              hover:text-white
                            "
                            title={txt(
                              "Copy URL",
                              "نسخ الرابط"
                            )}
                          >
                            <Copy
                              className="h-4 w-4"
                            />
                          </button>
                        </div>

                        <p
                          className="
                            mt-5
                            max-w-3xl
                            whitespace-pre-line
                            text-sm
                            leading-7
                            text-slate-200
                          "
                        >
                          {result.simple_explanation}
                        </p>
                      </div>


                      <div
                        className="
                          w-full
                          shrink-0
                          rounded-3xl
                          border
                          border-white/10
                          bg-[#04101A]
                          p-5
                          lg:w-[260px]
                        "
                      >
                        <div
                          className="
                            flex
                            items-end
                            justify-between
                          "
                        >
                          <div>
                            <p
                              className="
                                text-xs
                                font-medium
                                uppercase
                                tracking-wider
                                text-slate-500
                              "
                            >
                              {txt(
                                "Risk score",
                                "درجة الخطورة"
                              )}
                            </p>

                            <div
                              className="
                                mt-1
                                flex
                                items-baseline
                                gap-1
                              "
                            >
                              <span
                                className={`
                                  text-4xl
                                  font-semibold
                                  ${riskStyle.text}
                                `}
                              >
                                {riskScore}
                              </span>

                              <span
                                className="
                                  text-sm
                                  text-slate-500
                                "
                              >
                                /100
                              </span>
                            </div>
                          </div>

                          {result.risk_level
                            === "low" ? (
                            <ShieldCheck
                              className="
                                h-8
                                w-8
                                text-cyan-300
                              "
                            />
                          ) : (
                            <ShieldAlert
                              className={`
                                h-8
                                w-8
                                ${riskStyle.text}
                              `}
                            />
                          )}
                        </div>

                        <div
                          className="
                            mt-5
                            h-2
                            overflow-hidden
                            rounded-full
                            bg-white/10
                          "
                        >
                          <div
                            className={`
                              h-full
                              rounded-full
                              transition-all
                              duration-500
                              ${riskStyle.bar}
                            `}
                            style={{
                              width:
                                `${riskScore}%`,
                            }}
                          />
                        </div>

                        <div
                          className="
                            mt-5
                            space-y-3
                            text-sm
                          "
                        >
                          <MetricRow
                            label={txt(
                              "Threat feeds",
                              "مصادر التهديد"
                            )}
                            value={
                              `${providerStats.clean}/${providerStats.total}`
                            }
                          />

                          <MetricRow
                            label={txt(
                              "Known matches",
                              "تهديدات معروفة"
                            )}
                            value={
                              String(
                                providerStats.matched
                              )
                            }
                          />

                          <MetricRow
                            label={txt(
                              "Engine",
                              "المحرك"
                            )}
                            value={
                              result.engine_version
                              || "V3"
                            }
                          />
                        </div>
                      </div>
                    </div>


                    <div
                      className="
                        mt-6
                        flex
                        flex-wrap
                        gap-3
                        border-t
                        border-white/10
                        pt-5
                      "
                    >
                      {canTrustCurrentResult && (
                        <button
                          type="button"
                          onClick={
                            prepareTrustedDomainFromResult
                          }
                          className="
                            inline-flex
                            items-center
                            gap-2
                            rounded-xl
                            border
                            border-cyan-400/25
                            bg-cyan-400/10
                            px-4
                            py-2.5
                            text-sm
                            font-medium
                            text-cyan-100
                            transition
                            hover:bg-cyan-400/15
                          "
                        >
                          <Plus
                            className="h-4 w-4"
                          />

                          {txt(
                            "Add to trusted domains",
                            "إضافة إلى المواقع الموثوقة"
                          )}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setUrl("");
                          setResult(null);
                          setError("");
                          setSuccess("");
                        }}
                        className="
                          inline-flex
                          items-center
                          gap-2
                          rounded-xl
                          border
                          border-white/10
                          bg-[#061018]/78
                          px-4
                          py-2.5
                          text-sm
                          font-medium
                          text-slate-300
                          transition
                          hover:bg-white/[0.08]
                          hover:text-white
                        "
                      >
                        <RefreshCw
                          className="h-4 w-4"
                        />

                        {txt(
                          "Check another URL",
                          "فحص رابط آخر"
                        )}
                      </button>
                    </div>
                  </div>


                  {/* ==========================================
                      PROVIDERS
                      ========================================== */}

                  <div
                    className="
                      grid
                      gap-4
                      md:grid-cols-3
                    "
                  >
                    {result.threat_intelligence
                      ?.sources
                      ?.map(
                        (
                          source
                        ) => (
                          <ThreatProviderCard
                            key={
                              source.provider
                            }
                            source={
                              source
                            }
                            isArabic={
                              isArabic
                            }
                          />
                        )
                      )}
                  </div>


                  {/* ==========================================
                      DOMAIN IDENTITY + RECOMMENDATION
                      ========================================== */}

                  <div
                    className="
                      grid
                      gap-5
                      lg:grid-cols-2
                    "
                  >
                    <GlassCard>
                      <div
                        className="
                          mb-5
                          flex
                          items-center
                          gap-3
                        "
                      >
                        <div
                          className="
                            flex
                            h-10
                            w-10
                            items-center
                            justify-center
                            rounded-xl
                            bg-cyan-500/10
                            text-cyan-300
                          "
                        >
                          <Database
                            className="h-5 w-5"
                          />
                        </div>

                        <div>
                          <h3
                            className="
                              font-semibold
                              text-white
                            "
                          >
                            {txt(
                              "Domain identity",
                              "هوية الدومين"
                            )}
                          </h3>

                          <p
                            className="
                              text-xs
                              text-slate-500
                            "
                          >
                            {txt(
                              "Official, trusted, and impersonation checks",
                              "فحص الدومين الرسمي والموثوق والانتحال"
                            )}
                          </p>
                        </div>
                      </div>

                      <div
                        className="
                          space-y-3
                        "
                      >
                        <DetailRow
                          label={txt(
                            "Domain",
                            "الدومين"
                          )}
                          value={
                            result.domain
                            || "-"
                          }
                        />

                        <DetailRow
                          label={txt(
                            "Registered domain",
                            "الدومين المسجل"
                          )}
                          value={
                            result.registrable_domain
                            || "-"
                          }
                        />

                        <DetailRow
                          label={txt(
                            "Brand",
                            "العلامة"
                          )}
                          value={
                            result.official_domain
                              ?.brand
                            || "-"
                          }
                        />

                        <DetailRow
                          label={txt(
                            "Official root",
                            "الدومين الرسمي"
                          )}
                          value={
                            result.official_domain
                              ?.official_root_domain
                            || "-"
                          }
                        />

                        <DetailRow
                          label={txt(
                            "Identity status",
                            "حالة الهوية"
                          )}
                          value={
                            result.official_domain
                              ?.status
                            || "unknown"
                          }
                        />
                      </div>
                    </GlassCard>


                    <GlassCard>
                      <div
                        className="
                          mb-5
                          flex
                          items-center
                          gap-3
                        "
                      >
                        <div
                          className="
                            flex
                            h-10
                            w-10
                            items-center
                            justify-center
                            rounded-xl
                            bg-cyan-500/10
                            text-cyan-300
                          "
                        >
                          <ShieldCheck
                            className="h-5 w-5"
                          />
                        </div>

                        <div>
                          <h3
                            className="
                              font-semibold
                              text-white
                            "
                          >
                            {txt(
                              "Recommended action",
                              "الإجراء المقترح"
                            )}
                          </h3>

                          <p
                            className="
                              text-xs
                              text-slate-500
                            "
                          >
                            {txt(
                              "What AccessMate recommends you do next",
                              "ما الذي ينصحك AccessMate بفعله الآن"
                            )}
                          </p>
                        </div>
                      </div>

                      <p
                        className="
                          text-sm
                          leading-7
                          text-slate-200
                        "
                      >
                        {result.recommendation}
                      </p>
                    </GlassCard>
                  </div>


                  {/* ==========================================
                      SIGNALS
                      ========================================== */}

                  <GlassCard>
                    <div
                      className="
                        mb-5
                        flex
                        flex-wrap
                        items-center
                        justify-between
                        gap-3
                      "
                    >
                      <div>
                        <h3
                          className="
                            font-semibold
                            text-white
                          "
                        >
                          {txt(
                            "Security signals",
                            "إشارات الأمان"
                          )}
                        </h3>

                        <p
                          className="
                            mt-1
                            text-xs
                            text-slate-500
                          "
                        >
                          {txt(
                            "Evidence used by the safety engine",
                            "الأدلة التي استخدمها محرك الفحص"
                          )}
                        </p>
                      </div>

                      <span
                        className="
                          rounded-full
                          border
                          border-white/10
                          bg-[#061018]/78
                          px-3
                          py-1
                          text-xs
                          text-slate-400
                        "
                      >
                        {result.signals?.length
                        || 0}
                      </span>
                    </div>

                    {result.signals
                      ?.length ? (
                      <div
                        className="
                          grid
                          gap-3
                          md:grid-cols-2
                        "
                      >
                        {result.signals.map(
                          (
                            signal,
                            index
                          ) => (
                            <div
                              key={
                                `${signal.signal}-${index}`
                              }
                              className={`
                                rounded-2xl
                                border
                                p-4
                                ${severityClasses(
                                  signal.severity
                                )}
                              `}
                            >
                              <div
                                className="
                                  flex
                                  items-center
                                  justify-between
                                  gap-3
                                "
                              >
                                <p
                                  className="
                                    text-sm
                                    font-semibold
                                  "
                                >
                                  {signal.signal
                                    .replaceAll(
                                      "_",
                                      " "
                                    )}
                                </p>

                                <span
                                  className="
                                    rounded-full
                                    border
                                    border-current/20
                                    px-2
                                    py-0.5
                                    text-[10px]
                                    font-semibold
                                    uppercase
                                  "
                                >
                                  {signal.severity}
                                </span>
                              </div>

                              <p
                                className="
                                  mt-2
                                  text-xs
                                  leading-5
                                  opacity-80
                                "
                              >
                                {signal.description}
                              </p>

                              {signal.source && (
                                <p
                                  className="
                                    mt-3
                                    text-[10px]
                                    uppercase
                                    tracking-wider
                                    opacity-50
                                  "
                                >
                                  {signal.source}
                                </p>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    ) : (
                      <EmptyState
                        icon={
                          CheckCircle2
                        }
                        title={txt(
                          "No additional signals",
                          "لا توجد إشارات إضافية"
                        )}
                        description={txt(
                          "The URL did not produce additional local security signals.",
                          "لم ينتج الرابط إشارات أمان محلية إضافية."
                        )}
                      />
                    )}
                  </GlassCard>
                </div>
              )}
            </section>
          )}


          {/* ==================================================
              TRUSTED DOMAINS
              ================================================== */}

          {activeSection === "trusted" && (
            <section
              className="
                grid
                gap-5
                xl:grid-cols-[380px_minmax(0,1fr)]
              "
            >
              <GlassCard>
                <div
                  className="
                    mb-5
                    flex
                    items-start
                    justify-between
                    gap-3
                  "
                >
                  <div>
                    <h2
                      className="
                        text-lg
                        font-semibold
                        text-white
                      "
                    >
                      {editingTrustedId
                        ? txt(
                            "Edit trusted domain",
                            "تعديل موقع موثوق"
                          )
                        : txt(
                            "Add trusted domain",
                            "إضافة موقع موثوق"
                          )}
                    </h2>

                    <p
                      className="
                        mt-1
                        text-xs
                        leading-5
                        text-slate-500
                      "
                    >
                      {txt(
                        "Trusted status never overrides phishing or malware warnings.",
                        "حالة الموقع الموثوق لا تلغي تحذيرات التصيد أو البرمجيات الضارة."
                      )}
                    </p>
                  </div>

                  {editingTrustedId && (
                    <button
                      type="button"
                      onClick={
                        cancelTrustedEdit
                      }
                      className="
                        rounded-lg
                        p-2
                        text-slate-500
                        transition
                        hover:bg-white/10
                        hover:text-white
                      "
                    >
                      <X
                        className="h-4 w-4"
                      />
                    </button>
                  )}
                </div>

                <form
                  onSubmit={
                    saveTrustedDomain
                  }
                  className="
                    space-y-4
                  "
                >
                  <InputField
                    label={txt(
                      "Website / Brand name",
                      "اسم الموقع"
                    )}
                    value={
                      trustedForm.brandName
                    }
                    placeholder="Example"
                    onChange={(value) =>
                      setTrustedForm(
                        (current) => ({
                          ...current,
                          brandName:
                            value,
                        })
                      )
                    }
                  />

                  <InputField
                    label={txt(
                      "Domain",
                      "الدومين"
                    )}
                    value={
                      trustedForm.officialDomain
                    }
                    placeholder="example.com"
                    onChange={(value) =>
                      setTrustedForm(
                        (current) => ({
                          ...current,
                          officialDomain:
                            value,
                        })
                      )
                    }
                  />

                  <InputField
                    label={txt(
                      "Category",
                      "التصنيف"
                    )}
                    value={
                      trustedForm.category
                    }
                    placeholder={txt(
                      "Bank, work, personal...",
                      "بنك، عمل، شخصي..."
                    )}
                    onChange={(value) =>
                      setTrustedForm(
                        (current) => ({
                          ...current,
                          category:
                            value,
                        })
                      )
                    }
                  />

                  <button
                    type="submit"
                    disabled={
                      trustedSaving
                    }
                    className="
                      inline-flex
                      w-full
                      min-h-[48px]
                      items-center
                      justify-center
                      gap-2
                      rounded-xl
                      bg-[#006C93]
                      px-4
                      text-sm
                      font-black
                      text-white
                      shadow-[0_0_24px_rgba(0,184,219,0.14)]
                      transition
                      hover:bg-[#007FA9] hover:-translate-y-0.5
                      disabled:opacity-60
                    "
                  >
                    {trustedSaving ? (
                      <Loader2
                        className="
                          h-4
                          w-4
                          animate-spin
                        "
                      />
                    ) : editingTrustedId ? (
                      <Pencil
                        className="h-4 w-4"
                      />
                    ) : (
                      <Plus
                        className="h-4 w-4"
                      />
                    )}

                    {editingTrustedId
                      ? txt(
                          "Save changes",
                          "حفظ التعديلات"
                        )
                      : txt(
                          "Add trusted domain",
                          "إضافة الموقع"
                        )}
                  </button>
                </form>
              </GlassCard>


              <GlassCard>
                <div
                  className="
                    mb-5
                    flex
                    items-center
                    justify-between
                    gap-3
                  "
                >
                  <div>
                    <h2
                      className="
                        text-lg
                        font-semibold
                        text-white
                      "
                    >
                      {txt(
                        "Your trusted domains",
                        "المواقع الموثوقة"
                      )}
                    </h2>

                    <p
                      className="
                        mt-1
                        text-xs
                        text-slate-500
                      "
                    >
                      {txt(
                        "Only domains saved by your account appear here.",
                        "تظهر هنا فقط المواقع التي أضفتها إلى حسابك."
                      )}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      void loadTrustedDomains()
                    }
                    className="
                      rounded-xl
                      border
                      border-white/10
                      bg-[#061018]/78
                      p-2.5
                      text-slate-400
                      transition
                      hover:bg-white/[0.08]
                      hover:text-white
                    "
                    title={txt(
                      "Refresh",
                      "تحديث"
                    )}
                  >
                    <RefreshCw
                      className="h-4 w-4"
                    />
                  </button>
                </div>

                {initialLoading ? (
                  <LoadingState />
                ) : trustedDomains.length ? (
                  <div
                    className="
                      space-y-3
                    "
                  >
                    {trustedDomains.map(
                      (item) => (
                        <div
                          key={
                            item.id
                          }
                          className="
                            flex
                            flex-col
                            gap-4
                            rounded-2xl
                            border
                            border-white/10
                            bg-[#061018]/72
                            p-4
                            sm:flex-row
                            sm:items-center
                            sm:justify-between
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
                            <div
                              className="
                                flex
                                h-10
                                w-10
                                shrink-0
                                items-center
                                justify-center
                                rounded-xl
                                border
                                border-cyan-400/22
                                bg-cyan-400/[0.06]
                                text-cyan-300
                              "
                            >
                              <Lock
                                className="h-5 w-5"
                              />
                            </div>

                            <div
                              className="
                                min-w-0
                              "
                            >
                              <p
                                className="
                                  truncate
                                  font-medium
                                  text-white
                                "
                              >
                                {item.brand_name}
                              </p>

                              <p
                                className="
                                  mt-0.5
                                  truncate
                                  font-mono
                                  text-xs
                                  text-cyan-300
                                "
                              >
                                {item.official_domain}
                              </p>

                              <div
                                className="
                                  mt-2
                                  flex
                                  flex-wrap
                                  gap-2
                                "
                              >
                                {item.category && (
                                  <span
                                    className="
                                      rounded-full
                                      bg-[#061018]/88
                                      px-2
                                      py-1
                                      text-[10px]
                                      text-slate-400
                                    "
                                  >
                                    {item.category}
                                  </span>
                                )}

                                <span
                                  className="
                                    rounded-full
                                    bg-[#061018]/88
                                    px-2
                                    py-1
                                    text-[10px]
                                    text-slate-500
                                  "
                                >
                                  {formatDate(
                                    item.created_at,
                                    language
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div
                            className="
                              flex
                              items-center
                              gap-2
                            "
                          >
                            <button
                              type="button"
                              onClick={() =>
                                startEditingTrustedDomain(
                                  item
                                )
                              }
                              className="
                                inline-flex
                                h-9
                                items-center
                                gap-2
                                rounded-lg
                                border
                                border-white/10
                                bg-[#061018]/78
                                px-3
                                text-xs
                                font-medium
                                text-slate-300
                                transition
                                hover:bg-white/[0.08]
                                hover:text-white
                              "
                            >
                              <Pencil
                                className="h-3.5 w-3.5"
                              />

                              {txt(
                                "Edit",
                                "تعديل"
                              )}
                            </button>

                            <button
                              type="button"
                              disabled={
                                deletingId
                                === item.id
                              }
                              onClick={() =>
                                void deleteTrustedDomain(
                                  item
                                )
                              }
                              className="
                                inline-flex
                                h-9
                                items-center
                                gap-2
                                rounded-lg
                                border
                                border-red-400/15
                                bg-red-500/[0.06]
                                px-3
                                text-xs
                                font-medium
                                text-red-300
                                transition
                                hover:bg-red-500/10
                              "
                            >
                              {deletingId
                                === item.id ? (
                                <Loader2
                                  className="
                                    h-3.5
                                    w-3.5
                                    animate-spin
                                  "
                                />
                              ) : (
                                <Trash2
                                  className="h-3.5 w-3.5"
                                />
                              )}

                              {txt(
                                "Remove",
                                "حذف"
                              )}
                            </button>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <EmptyState
                    icon={
                      Lock
                    }
                    title={txt(
                      "No trusted domains yet",
                      "لا توجد مواقع موثوقة بعد"
                    )}
                    description={txt(
                      "Add websites you recognize and regularly use.",
                      "أضف المواقع التي تعرفها وتستخدمها باستمرار."
                    )}
                  />
                )}
              </GlassCard>
            </section>
          )}


          {/* ==================================================
              HISTORY
              ================================================== */}

          {activeSection === "history" && (
            <section>
              <GlassCard>
                <div
                  className="
                    mb-5
                    flex
                    flex-col
                    gap-4
                    sm:flex-row
                    sm:items-center
                    sm:justify-between
                  "
                >
                  <div>
                    <h2
                      className="
                        text-lg
                        font-semibold
                        text-white
                      "
                    >
                      {txt(
                        "Website check history",
                        "سجل فحص المواقع"
                      )}
                    </h2>

                    <p
                      className="
                        mt-1
                        text-xs
                        text-slate-500
                      "
                    >
                      {txt(
                        "Previous checks saved to your account.",
                        "عمليات الفحص السابقة المحفوظة في حسابك."
                      )}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      void loadHistory()
                    }
                    className="
                      inline-flex
                      items-center
                      justify-center
                      gap-2
                      rounded-xl
                      border
                      border-white/10
                      bg-[#061018]/78
                      px-4
                      py-2.5
                      text-xs
                      font-medium
                      text-slate-300
                      transition
                      hover:bg-white/[0.08]
                      hover:text-white
                    "
                  >
                    <RefreshCw
                      className="h-4 w-4"
                    />

                    {txt(
                      "Refresh",
                      "تحديث"
                    )}
                  </button>
                </div>

                {initialLoading ? (
                  <LoadingState />
                ) : history.length ? (
                  <div
                    className="
                      space-y-3
                    "
                  >
                    {history.map(
                      (item) => {
                        const style =
                          riskClasses(
                            item.risk_level
                          );

                        return (
                          <div
                            key={
                              item.id
                            }
                            className="
                              group
                              flex
                              flex-col
                              gap-4
                              rounded-2xl
                              border
                              border-white/10
                              bg-[#061018]/70
                              p-4
                              transition
                              hover:border-cyan-400/20
                              hover:bg-white/[0.045]
                              lg:flex-row
                              lg:items-center
                              lg:justify-between
                            "
                          >
                            <button
                              type="button"
                              onClick={() =>
                                loadHistoryIntoResult(
                                  item
                                )
                              }
                              className="
                                flex
                                min-w-0
                                flex-1
                                items-start
                                gap-4
                                text-start
                              "
                            >
                              <div
                                className={`
                                  flex
                                  h-11
                                  w-11
                                  shrink-0
                                  items-center
                                  justify-center
                                  rounded-xl
                                  border
                                  ${style.container}
                                  ${style.text}
                                `}
                              >
                                {item.risk_level
                                  === "low" ? (
                                  <ShieldCheck
                                    className="h-5 w-5"
                                  />
                                ) : (
                                  <ShieldAlert
                                    className="h-5 w-5"
                                  />
                                )}
                              </div>

                              <div
                                className="
                                  min-w-0
                                  flex-1
                                "
                              >
                                <div
                                  className="
                                    flex
                                    flex-wrap
                                    items-center
                                    gap-2
                                  "
                                >
                                  <p
                                    className="
                                      truncate
                                      font-medium
                                      text-white
                                    "
                                  >
                                    {item.domain
                                    || item.url}
                                  </p>

                                  <span
                                    className={`
                                      rounded-full
                                      border
                                      px-2
                                      py-0.5
                                      text-[10px]
                                      font-semibold
                                      uppercase
                                      ${style.badge}
                                    `}
                                  >
                                    {item.risk_level
                                    || "low"}
                                  </span>

                                  {item.is_trusted_domain && (
                                    <span
                                      className="
                                        rounded-full
                                        border
                                        border-cyan-400/20
                                        bg-cyan-400/10
                                        px-2
                                        py-0.5
                                        text-[10px]
                                        font-medium
                                        text-cyan-200
                                      "
                                    >
                                      {txt(
                                        "Trusted",
                                        "موثوق"
                                      )}
                                    </span>
                                  )}
                                </div>

                                <p
                                  className="
                                    mt-1
                                    line-clamp-1
                                    text-xs
                                    text-slate-500
                                  "
                                >
                                  {item.verdict
                                  || item.reason
                                  || item.url}
                                </p>

                                <div
                                  className="
                                    mt-2
                                    flex
                                    flex-wrap
                                    items-center
                                    gap-3
                                    text-[11px]
                                    text-slate-600
                                  "
                                >
                                  <span
                                    className="
                                      inline-flex
                                      items-center
                                      gap-1
                                    "
                                  >
                                    <Clock
                                      className="h-3 w-3"
                                    />

                                    {formatDate(
                                      item.checked_at,
                                      language
                                    )}
                                  </span>

                                  <span>
                                    {txt(
                                      "Score",
                                      "الدرجة"
                                    )}
                                    :{" "}
                                    {item.risk_score
                                    ?? 0}
                                  </span>

                                  <span>
                                    {String(
                                      item.action
                                      || "allow"
                                    ).toUpperCase()}
                                  </span>
                                </div>
                              </div>
                            </button>

                            <button
                              type="button"
                              disabled={
                                deletingId
                                === item.id
                              }
                              onClick={() =>
                                void deleteHistoryItem(
                                  item
                                )
                              }
                              className="
                                inline-flex
                                h-9
                                items-center
                                justify-center
                                gap-2
                                rounded-lg
                                border
                                border-red-400/15
                                bg-red-500/[0.05]
                                px-3
                                text-xs
                                font-medium
                                text-red-300
                                transition
                                hover:bg-red-500/10
                                disabled:opacity-50
                              "
                            >
                              {deletingId
                                === item.id ? (
                                <Loader2
                                  className="
                                    h-3.5
                                    w-3.5
                                    animate-spin
                                  "
                                />
                              ) : (
                                <Trash2
                                  className="h-3.5 w-3.5"
                                />
                              )}

                              {txt(
                                "Delete",
                                "حذف"
                              )}
                            </button>
                          </div>
                        );
                      }
                    )}
                  </div>
                ) : (
                  <EmptyState
                    icon={
                      History
                    }
                    title={txt(
                      "No website checks yet",
                      "لا توجد عمليات فحص بعد"
                    )}
                    description={txt(
                      "Your future website checks will appear here.",
                      "ستظهر عمليات فحص المواقع هنا بعد استخدامها."
                    )}
                  />
                )}
              </GlassCard>
            </section>
          )}


          {/* ==================================================
              FOOTER NOTE
              ================================================== */}

          <div
            className="
              mt-6
              flex
              items-start
              gap-3
              rounded-2xl
              border
              border-[#15313D]/80
              bg-[#03101A]
              px-4
              py-3
              text-xs
              leading-5
              text-slate-600
            "
          >
            <Info
              className="
                mt-0.5
                h-4
                w-4
                shrink-0
              "
            />

            <p>
              {txt(
                "Website Safety is a decision-support feature. A domain can change or become compromised after a previous check, so important links should be checked again when needed.",
                "ميزة أمان المواقع هي أداة مساعدة لاتخاذ القرار. قد يتغير الموقع أو يتعرض للاختراق بعد فحص سابق، لذلك يُفضّل إعادة فحص الروابط المهمة عند الحاجة."
              )}
            </p>
          </div>
        </div>
      </div>
      <style>
        {`

        .website-safety-page {
          scrollbar-width:
            thin;

          scrollbar-color:
            rgba(
              0,
              184,
              219,
              0.22
            )
            transparent;
        }


        .website-safety-page::-webkit-scrollbar {
          width:
            5px;
        }


        .website-safety-page::-webkit-scrollbar-track {
          background:
            transparent;
        }


        .website-safety-page::-webkit-scrollbar-thumb {
          background:
            rgba(
              0,
              184,
              219,
              0.20
            );

          border-radius:
            999px;
        }


        .website-safety-page::-webkit-scrollbar-thumb:hover {
          background:
            rgba(
              0,
              184,
              219,
              0.42
            );
        }

        `}
      </style>

    </main>
  );
}


/* ============================================================
   SMALL COMPONENTS
   ============================================================ */


function ProviderMiniBadge({
  label,
}: {
  label: string;
}) {
  return (
    <div
      className="
        inline-flex
        h-9
        items-center
        gap-2
        rounded-xl
        border
        border-[#15313D]
        bg-[#061018]/72
        px-3
        text-xs
        font-medium
        text-slate-400
      "
    >
      <span
        className="
          h-1.5
          w-1.5
          rounded-full
          bg-cyan-400
          shadow-[0_0_8px_rgba(0,184,219,0.9)]
        "
      />

      {label}
    </div>
  );
}


function SectionButton({
  active,
  label,
  icon: Icon,
  badge,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: any;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={`
        flex
        min-h-[46px]
        items-center
        justify-center
        gap-2
        rounded-xl
        px-3
        text-xs
        font-medium
        transition
        sm:text-sm
        ${
          active
            ? `
              border
              border-cyan-400/35
              bg-gradient-to-r
              from-cyan-400/[0.12]
              to-cyan-400/[0.035]
              text-white
              shadow-[0_0_22px_rgba(74,222,128,0.07)]
            `
            : `
              border
              border-transparent
              text-slate-500
              hover:bg-[#061018]/88
              hover:text-slate-200
            `
        }
      `}
    >
      <Icon
        className="h-4 w-4"
      />

      <span
        className="
          hidden
          sm:inline
        "
      >
        {label}
      </span>

      {badge !== undefined && (
        <span
          className="
            min-w-[20px]
            rounded-full
            bg-white/[0.08]
            px-1.5
            py-0.5
            text-center
            text-[10px]
            text-slate-400
          "
        >
          {badge}
        </span>
      )}
    </button>
  );
}


function ProviderStatusIcon({
  source,
}: {
  source: ThreatSource;
}) {
  if (
    source.matched
    || source.status === "matched"
  ) {
    return (
      <ShieldAlert
        className="
          h-5
          w-5
          text-red-300
        "
      />
    );
  }

  if (
    source.status
    === "clean"
  ) {
    return (
      <CheckCircle2
        className="
          h-5
          w-5
          text-cyan-300
        "
      />
    );
  }

  return (
    <AlertTriangle
      className="
        h-5
        w-5
        text-amber-300
      "
    />
  );
}


function ThreatProviderCard({
  source,
  isArabic,
}: {
  source: ThreatSource;
  isArabic: boolean;
}) {
  const clean =
    source.status
    === "clean";

  const matched =
    source.matched
    || source.status
      === "matched";

  return (
    <div
      className={`
        rounded-2xl
        border
        p-4
        backdrop-blur-xl
        ${
          matched
            ? "border-red-400/20 bg-red-500/[0.07]"
            : clean
              ? "border-cyan-400/15 bg-cyan-500/[0.05]"
              : "border-amber-400/15 bg-amber-500/[0.05]"
        }
      `}
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
          <ProviderStatusIcon
            source={
              source
            }
          />

          <div>
            <p
              className="
                text-sm
                font-semibold
                text-white
              "
            >
              {normalizeProviderName(
                source.provider
              )}
            </p>

            <p
              className="
                mt-0.5
                text-[11px]
                text-slate-500
              "
            >
              {matched
                ? isArabic
                  ? "تم العثور على تطابق"
                  : "Threat match"
                : clean
                  ? isArabic
                    ? "لا يوجد تطابق معروف"
                    : "No known match"
                  : source.status}
            </p>
          </div>
        </div>

        <span
          className="
            rounded-full
            border
            border-white/10
            bg-[#03101A]
            px-2
            py-1
            text-[9px]
            font-semibold
            uppercase
            tracking-wider
            text-slate-500
          "
        >
          {source.status}
        </span>
      </div>

      {source.threat_types
        ?.length > 0 && (
        <div
          className="
            mt-3
            flex
            flex-wrap
            gap-1.5
          "
        >
          {source.threat_types.map(
            (
              threat
            ) => (
              <span
                key={
                  threat
                }
                className="
                  rounded-lg
                  bg-red-500/10
                  px-2
                  py-1
                  text-[10px]
                  text-red-200
                "
              >
                {threat}
              </span>
            )
          )}
        </div>
      )}

      {source.details && (
        <p
          className="
            mt-3
            line-clamp-3
            text-xs
            leading-5
            text-slate-500
          "
          title={
            source.details
          }
        >
          {source.details}
        </p>
      )}
    </div>
  );
}


function GlassCard({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <div
      className="
        rounded-[18px]
        border
        border-[#15313D]
        bg-[#061018]/92
        p-5
        shadow-[0_16px_46px_rgba(0,0,0,0.22)]
        
        backdrop-blur-2xl
        sm:p-6
      "
    >
      {children}
    </div>
  );
}


function MetricRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      className="
        flex
        items-center
        justify-between
        gap-3
      "
    >
      <span
        className="
          text-slate-500
        "
      >
        {label}
      </span>

      <span
        className="
          max-w-[130px]
          truncate
          font-medium
          text-slate-200
        "
        title={
          value
        }
      >
        {value}
      </span>
    </div>
  );
}


function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      className="
        flex
        flex-col
        gap-1
        rounded-xl
        border
        border-[#15313D]/80
        bg-[#061018]/70
        px-3
        py-3
        sm:flex-row
        sm:items-center
        sm:justify-between
      "
    >
      <span
        className="
          text-xs
          text-slate-500
        "
      >
        {label}
      </span>

      <span
        className="
          break-all
          text-sm
          font-medium
          text-slate-200
        "
      >
        {value}
      </span>
    </div>
  );
}


function InputField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange:
    (value: string) => void;
}) {
  return (
    <label
      className="block"
    >
      <span
        className="
          mb-2
          block
          text-xs
          font-medium
          text-slate-400
        "
      >
        {label}
      </span>

      <input
        value={
          value
        }
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        placeholder={
          placeholder
        }
        className="
          min-h-[46px]
          w-full
          rounded-xl
          border
          border-white/10
          bg-[#061018]/78
          px-3
          text-sm
          text-white
          outline-none
          transition
          placeholder:text-slate-700
          focus:border-cyan-400/40
          focus:bg-cyan-400/[0.04]
          focus:ring-4
          focus:ring-cyan-400/[0.05]
        "
      />
    </label>
  );
}


function LoadingState() {
  return (
    <div
      className="
        flex
        min-h-[180px]
        items-center
        justify-center
      "
    >
      <Loader2
        className="
          h-6
          w-6
          animate-spin
          text-cyan-300
        "
      />
    </div>
  );
}


function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: any;
  title: string;
  description: string;
}) {
  return (
    <div
      className="
        flex
        min-h-[180px]
        flex-col
        items-center
        justify-center
        rounded-2xl
        border
        border-dashed
        border-white/10
        bg-[#04101A]/60
        px-6
        text-center
      "
    >
      <div
        className="
          flex
          h-12
          w-12
          items-center
          justify-center
          rounded-2xl
          bg-[#061018]/88
          text-slate-500
        "
      >
        <Icon
          className="h-5 w-5"
        />
      </div>

      <h3
        className="
          mt-4
          text-sm
          font-semibold
          text-slate-300
        "
      >
        {title}
      </h3>

      <p
        className="
          mt-1
          max-w-sm
          text-xs
          leading-5
          text-slate-600
        "
      >
        {description}
      </p>
    </div>
  );
}
