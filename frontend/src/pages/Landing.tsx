import { useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  AudioLines,
  BellRing,
  Eye,
  Handshake,
  Languages,
  ShieldCheck,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import PublicNavbar from "../components/Public/PublicNavbar";
import { usePublicLanguage } from "../hooks/usePublicLanguage";

import backgroundImage from "../assets/wellpaper.jpg";
import heroVisual from "../assets/VISION ARTIFICIAL.jpg";

const stats = [
  {
    value: "10+",
    en: "Smart Features",
    ar: "ميزة ذكية",
    icon: Sparkles,
  },
  {
    value: "AR / EN",
    en: "Bilingual Support",
    ar: "دعم لغتين",
    icon: Languages,
  },
  {
    value: "100%",
    en: "Accessible",
    ar: "قابل للوصول",
    icon: ShieldCheck,
  },
];

const featureCards = [
  {
    titleEn: "Vision Support",
    titleAr: "دعم الرؤية",
    textEn: "Understand the world with AI and live assist.",
    textAr: "افهم العالم باستخدام الذكاء الاصطناعي والمساعدة الذكية.",
    icon: Eye,
  },
  {
    titleEn: "Voice Assistant",
    titleAr: "المساعد الصوتي",
    textEn: "Speak, listen & get instant help.",
    textAr: "تحدث واستمع واحصل على مساعدة فورية.",
    icon: AudioLines,
  },
  {
    titleEn: "Web Safety",
    titleAr: "أمان المواقع",
    textEn: "Browse safely with AI-powered protection.",
    textAr: "تصفح بأمان مع حماية مدعومة بالذكاء الاصطناعي.",
    icon: ShieldCheck,
  },
  {
    titleEn: "Caregiver Alerts",
    titleAr: "تنبيهات مقدم الرعاية",
    textEn: "Real-time alerts to keep you safe.",
    textAr: "تنبيهات فورية لمقدمي الرعاية للحفاظ على سلامتك.",
    icon: BellRing,
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const { isArabic } = usePublicLanguage();

  const speakWelcome = () => {
    if (!("speechSynthesis" in window)) {
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(
      isArabic
        ? "مرحبًا بك في أكسس ميت. إمكانية وصول بلا حدود."
        : "Welcome to AccessMate AI. Accessibility without limits."
    );

    utterance.lang = isArabic ? "ar-EG" : "en-US";
    utterance.rate = 0.92;
    utterance.pitch = 1;
    utterance.volume = 1;

    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      speakWelcome();
    }, 900);

    return () => {
      window.clearTimeout(timer);

      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isArabic]);

  return (
    <main
      dir={isArabic ? "rtl" : "ltr"}
      className="
        relative
        min-h-[100dvh]
        w-full
        overflow-x-hidden
        bg-[#02080D]
        text-[#F4F9FC]
      "
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="pointer-events-none fixed inset-0 z-0 bg-[#02080D]/95" />

      <div className="pointer-events-none fixed inset-0 z-[1] overflow-hidden">
        <div
          className="
            absolute
            right-[-180px]
            top-[70px]
            h-[620px]
            w-[620px]
            rounded-full
            bg-[#00CFF4]/[0.07]
            blur-[190px]
          "
        />

        <div
          className="
            absolute
            bottom-[-220px]
            left-[10%]
            h-[500px]
            w-[500px]
            rounded-full
            bg-[#009EDB]/[0.04]
            blur-[180px]
          "
        />
      </div>

      <div
        className="
          relative
          z-10
          mx-auto
          min-h-[100dvh]
          w-full
          max-w-[1680px]
          p-[6px]
          sm:p-[10px]
          lg:p-[12px]
        "
      >
        <div
          className="
            relative
            min-h-[calc(100dvh-12px)]
            overflow-hidden
            rounded-[2px]
            border
            border-[#15313D]/90
            bg-[#020A11]/92
            shadow-[0_0_0_1px_rgba(255,255,255,0.01),0_30px_90px_rgba(0,0,0,0.55)]
            sm:min-h-[calc(100dvh-20px)]
            lg:min-h-[calc(100dvh-24px)]
          "
        >
          <PublicNavbar />

          <section
            className="
              grid
              min-h-[calc(100dvh-86px)]
              lg:grid-cols-[0.51fr_0.49fr]
            "
          >
            <motion.div
              initial={{
                opacity: 0,
                x: isArabic ? 24 : -24,
              }}
              animate={{
                opacity: 1,
                x: 0,
              }}
              transition={{
                duration: 0.8,
                ease: "easeOut",
              }}
              className="
                relative
                z-20
                flex
                flex-col
                justify-center
                px-7
                pb-10
                pt-10
                sm:px-10
                lg:px-12
                lg:pb-7
                lg:pt-4
                xl:px-[54px]
                2xl:px-[62px]
              "
            >
              <div
                className="
                  mb-7
                  inline-flex
                  w-fit
                  items-center
                  gap-2
                  rounded-full
                  border
                  border-[#00D9F5]/50
                  bg-[#00171F]/70
                  px-4
                  py-2
                  text-[11px]
                  font-semibold
                  uppercase
                  tracking-[0.055em]
                  text-[#00D9F5]
                  shadow-[0_0_20px_rgba(0,217,245,0.06)]
                  backdrop-blur-md
                "
              >
                <Sparkles className="h-[15px] w-[15px]" />

                {isArabic
                  ? "إمكانية وصول مدعومة بالذكاء الاصطناعي"
                  : "AI Powered Accessibility"}
              </div>

              <h1
                className="
                  max-w-[700px]
                  text-[48px]
                  font-black
                  leading-[0.98]
                  tracking-[-0.048em]
                  text-[#F5F7FA]
                  sm:text-[58px]
                  lg:text-[clamp(52px,5.2vw,74px)]
                "
              >
                {isArabic ? "إمكانية وصول" : "Accessibility"}

                <br />

                <span
                  className="
                    bg-gradient-to-r
                    from-[#00A8E8]
                    via-[#00C7EE]
                    to-[#00E1EF]
                    bg-clip-text
                    text-transparent
                  "
                  style={{
                    textShadow: "0 0 30px rgba(0,195,235,0.10)",
                  }}
                >
                  {isArabic ? "بلا حدود" : "Without Limits"}
                </span>
              </h1>

              <p
                className="
                  mt-5
                  max-w-[650px]
                  text-[14px]
                  font-normal
                  leading-[1.75]
                  text-[#A8B5BE]
                  sm:text-[15px]
                  xl:text-[16px]
                "
              >
                {isArabic
                  ? "يتكيف AccessMate AI معك ليجعل المعلومات والتواصل والعالم الرقمي أكثر بساطة وأمانًا وشمولًا."
                  : "AccessMate AI adapts to you — making information, communication, and the digital world simple, safe, and inclusive."}
              </p>

              <div
                className="
                  mt-6
                  grid
                  max-w-[590px]
                  grid-cols-3
                "
              >
                {stats.map((item, index) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.en}
                      className={`
                        relative
                        min-h-[102px]
                        px-2
                        py-1
                        ${index > 0 ? "border-l border-[#17313C]" : ""}
                      `}
                    >
                      <span
                        className="
                          mb-2
                          flex
                          h-9
                          w-9
                          items-center
                          justify-center
                          rounded-full
                          border
                          border-[#00D9F5]/45
                          bg-[#00202A]/75
                          text-[#00D9F5]
                          shadow-[0_0_18px_rgba(0,217,245,0.08)]
                        "
                      >
                        <Icon className="h-[18px] w-[18px]" />
                      </span>

                      <p
                        className="
                          text-[23px]
                          font-extrabold
                          tracking-[-0.025em]
                          text-[#F4F8FA]
                        "
                      >
                        {item.value}
                      </p>

                      <p
                        className="
                          mt-1
                          text-[11px]
                          font-medium
                          text-[#8698A4]
                        "
                      >
                        {isArabic ? item.ar : item.en}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div
                className="
                  mt-5
                  grid
                  max-w-[650px]
                  gap-3
                  sm:grid-cols-3
                "
              >
                <button
                  type="button"
                  onClick={() => navigate("/auth?mode=login")}
                  className="
                    group
                    inline-flex
                    min-h-[48px]
                    items-center
                    justify-center
                    gap-2
                    rounded-[8px]
                    border
                    border-[#00C9EB]/90
                    bg-gradient-to-r
                    from-[#008BC4]
                    via-[#00AEDD]
                    to-[#00C9E9]
                    px-4
                    text-[12px]
                    font-bold
                    text-white
                    shadow-[0_0_24px_rgba(0,187,230,0.18)]
                    transition-all
                    duration-300
                    hover:-translate-y-0.5
                    hover:brightness-110
                    hover:shadow-[0_0_34px_rgba(0,217,245,0.28)]
                    active:translate-y-0
                  "
                >
                  {isArabic ? "تسجيل الدخول" : "Login"}

                  <ArrowRight
                    className={`
                      h-[15px]
                      w-[15px]
                      transition-transform
                      duration-300
                      group-hover:translate-x-1
                      ${isArabic ? "rotate-180" : ""}
                    `}
                  />
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/auth?mode=register")}
                  className="
                    group
                    inline-flex
                    min-h-[48px]
                    items-center
                    justify-center
                    gap-2
                    rounded-[8px]
                    border
                    border-[#00D9F5]/55
                    bg-[#031017]/72
                    px-4
                    text-[12px]
                    font-semibold
                    text-[#F4F8FA]
                    transition-all
                    duration-300
                    hover:-translate-y-0.5
                    hover:border-[#00D9F5]/90
                    hover:bg-[#051922]
                    hover:shadow-[0_0_24px_rgba(0,217,245,0.08)]
                  "
                >
                  <UserPlus className="h-[15px] w-[15px] text-[#00D9F5]" />

                  {isArabic ? "إنشاء حساب" : "Create Account"}

                  <ArrowRight
                    className={`
                      h-[15px]
                      w-[15px]
                      text-[#00D9F5]
                      transition-transform
                      duration-300
                      group-hover:translate-x-1
                      ${isArabic ? "rotate-180" : ""}
                    `}
                  />
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/about")}
                  className="
                    group
                    inline-flex
                    min-h-[48px]
                    items-center
                    justify-center
                    gap-2
                    rounded-[8px]
                    border
                    border-[#00D9F5]/55
                    bg-[#031017]/72
                    px-4
                    text-[12px]
                    font-semibold
                    text-[#F4F8FA]
                    transition-all
                    duration-300
                    hover:-translate-y-0.5
                    hover:border-[#00D9F5]/90
                    hover:bg-[#051922]
                    hover:shadow-[0_0_24px_rgba(0,217,245,0.08)]
                  "
                >
                  <Handshake className="h-[15px] w-[15px] text-[#00D9F5]" />

                  {isArabic ? "كن شريكًا معنا" : "Partner With Us"}

                  <ArrowRight
                    className={`
                      h-[15px]
                      w-[15px]
                      text-[#00D9F5]
                      transition-transform
                      duration-300
                      group-hover:translate-x-1
                      ${isArabic ? "rotate-180" : ""}
                    `}
                  />
                </button>
              </div>

              <div
                className="
                  mt-7
                  grid
                  max-w-[700px]
                  grid-cols-2
                  gap-[10px]
                  sm:grid-cols-4
                "
              >
                {featureCards.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.titleEn}
                      className="
                        group
                        min-h-[128px]
                        rounded-[9px]
                        border
                        border-[#15313D]
                        bg-[#061018]/78
                        p-[13px]
                        shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]
                        backdrop-blur-xl
                        transition-all
                        duration-300
                        hover:-translate-y-1
                        hover:border-[#00CFEF]/40
                        hover:bg-[#071821]
                        hover:shadow-[0_14px_30px_rgba(0,0,0,0.18),0_0_20px_rgba(0,217,245,0.04)]
                      "
                    >
                      <span
                        className="
                          flex
                          h-[34px]
                          w-[34px]
                          items-center
                          justify-center
                          rounded-full
                          border
                          border-[#00D9F5]/40
                          bg-[#00212B]/80
                          text-[#00D9F5]
                          shadow-[0_0_18px_rgba(0,217,245,0.08)]
                        "
                      >
                        <Icon className="h-[17px] w-[17px]" />
                      </span>

                      <h2
                        className="
                          mt-[10px]
                          text-[11px]
                          font-bold
                          text-[#EDF5F8]
                        "
                      >
                        {isArabic ? item.titleAr : item.titleEn}
                      </h2>

                      <p
                        className="
                          mt-[5px]
                          text-[9px]
                          leading-[16px]
                          text-[#8C9BA5]
                        "
                      >
                        {isArabic ? item.textAr : item.textEn}
                      </p>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            <motion.div
              initial={{
                opacity: 0,
                x: isArabic ? -24 : 24,
              }}
              animate={{
                opacity: 1,
                x: 0,
              }}
              transition={{
                duration: 0.95,
                delay: 0.08,
                ease: "easeOut",
              }}
              className="
                relative
                min-h-[540px]
                overflow-hidden
                lg:min-h-full
              "
            >
              <img
                src={heroVisual}
                alt="AccessMate AI adaptive intelligence"
                className="
                  absolute
                  inset-0
                  h-full
                  w-full
                  scale-[1.025]
                  object-cover
                  object-center
                "
                style={{
                  filter:
                    "grayscale(1) sepia(1) hue-rotate(142deg) saturate(6.4) brightness(0.73) contrast(1.32)",
                }}
              />

              <div className="absolute inset-0 bg-[#00BDE8]/[0.07] mix-blend-screen" />

              <div
                className={`
                  absolute
                  inset-0
                  ${
                    isArabic
                      ? "bg-gradient-to-l from-[#020A11] via-[#020A11]/15 to-transparent"
                      : "bg-gradient-to-r from-[#020A11] via-[#020A11]/15 to-transparent"
                  }
                `}
              />

              <div
                className="
                  absolute
                  inset-0
                  bg-gradient-to-t
                  from-[#020A11]/78
                  via-transparent
                  to-[#020A11]/15
                "
              />

              <div
                className="
                  pointer-events-none
                  absolute
                  left-[42%]
                  top-[18%]
                  h-[340px]
                  w-[340px]
                  rounded-full
                  bg-[#00E5FF]/[0.08]
                  blur-[80px]
                "
              />

              <div
                className="
                  absolute
                  bottom-[8%]
                  left-[10%]
                  right-[8%]
                  max-w-[440px]
                  rounded-[12px]
                  border
                  border-[#18313D]
                  bg-[#061019]/88
                  px-7
                  py-6
                  shadow-[0_24px_70px_rgba(0,0,0,0.52)]
                  backdrop-blur-2xl
                  lg:left-auto
                  lg:right-[7%]
                "
              >
                <div className="flex items-start gap-4">
                  <div
                    className="
                      mt-[-2px]
                      shrink-0
                      text-[44px]
                      font-black
                      leading-none
                      text-[#00D9F5]
                      drop-shadow-[0_0_14px_rgba(0,217,245,0.25)]
                    "
                  >
                    “
                  </div>

                  <div>
                    <p
                      className="
                        text-[13px]
                        font-medium
                        leading-[1.75]
                        text-[#D4DEE4]
                        sm:text-[14px]
                      "
                    >
                      {isArabic
                        ? "«يجب أن تتكيف التكنولوجيا مع الناس، وليس العكس.»"
                        : "“Technology should adapt to people, not the other way around.”"}
                    </p>

                    <p
                      className="
                        mt-3
                        text-[11px]
                        font-semibold
                        text-[#00D9F5]
                      "
                    >
                      AccessMate AI
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </section>
        </div>
      </div>
    </main>
  );
}

