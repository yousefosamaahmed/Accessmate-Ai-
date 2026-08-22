import {
  Accessibility,
  AudioLines,
  Brain,
  Eye,
  HandHeart,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import PublicNavbar from "../components/Public/PublicNavbar";
import { usePublicLanguage } from "../hooks/usePublicLanguage";
import backgroundImage from "../assets/wellpaper.jpg";

const solutions = [
  [
    Accessibility,
    "Blind & Low Vision",
    "العمى وضعف البصر",
    "Voice guidance, screen-reader-friendly structure, image description, OCR, and adaptable visual presentation.",
    "إرشاد صوتي وبنية مناسبة لقارئات الشاشة ووصف الصور واستخراج النص وعرض بصري متكيف.",
  ],
  [
    AudioLines,
    "Hearing & Speech",
    "السمع والكلام",
    "Text-first alternatives, visual feedback, captions, and non-voice interaction paths.",
    "بدائل نصية وتغذية راجعة مرئية وتسميات ومسارات تفاعل لا تعتمد على الصوت.",
  ],
  [
    Brain,
    "Reading & Understanding",
    "القراءة والفهم",
    "Simplified explanations, structured content, and optional read-aloud support.",
    "شرح مبسط ومحتوى منظم وخيار القراءة الصوتية.",
  ],
  [
    ShieldCheck,
    "Safe Browsing",
    "التصفح الآمن",
    "URL safety checks, trusted domains, and community threat intelligence.",
    "فحص أمان الروابط والمواقع الموثوقة ومصادر معلومات التهديدات.",
  ],
  [
    HandHeart,
    "Caregiver Support",
    "دعم مقدم الرعاية",
    "Caregiver profiles, alerts, daily needs, and future Telegram-connected support flows.",
    "ملفات مقدمي الرعاية والتنبيهات والاحتياجات اليومية وتدفقات الدعم المرتبطة بتليجرام.",
  ],
  [
    Eye,
    "Vision Intelligence",
    "ذكاء الرؤية",
    "OCR, image description, and AI-assisted understanding of visual content.",
    "استخراج النص ووصف الصور وفهم المحتوى المرئي بالذكاء الاصطناعي.",
  ],
];

export default function Solutions() {
  const { isArabic } = usePublicLanguage();

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
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Main dark overlay */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-[#02080D]/95" />

      {/* Cyan ambient glow */}
      <div className="pointer-events-none fixed inset-0 z-[1] overflow-hidden">
        <div
          className="
            absolute
            right-[-180px]
            top-[70px]
            h-[600px]
            w-[600px]
            rounded-full
            bg-[#00D9F5]/[0.055]
            blur-[190px]
          "
        />

        <div
          className="
            absolute
            bottom-[-220px]
            left-[8%]
            h-[520px]
            w-[520px]
            rounded-full
            bg-[#008EC9]/[0.04]
            blur-[180px]
          "
        />
      </div>

      {/* Page shell */}
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
            border
            border-[#15313D]/90
            bg-[#020A11]/92
            shadow-[0_30px_90px_rgba(0,0,0,0.55)]
            sm:min-h-[calc(100dvh-20px)]
            lg:min-h-[calc(100dvh-24px)]
          "
        >
          <PublicNavbar />

          <section
            className="
              relative
              px-6
              py-12
              sm:px-10
              lg:px-14
              lg:py-14
              xl:px-[64px]
              2xl:px-[76px]
            "
          >
            {/* Eyebrow */}
            <div
              className="
                inline-flex
                items-center
                gap-2
                rounded-full
                border
                border-[#00D9F5]/45
                bg-[#00171F]/72
                px-4
                py-2
                text-[10px]
                font-semibold
                uppercase
                tracking-[0.14em]
                text-[#00D9F5]
                shadow-[0_0_20px_rgba(0,217,245,0.06)]
                backdrop-blur-md
              "
            >
              <Sparkles className="h-[14px] w-[14px]" />
              {isArabic ? "الحلول" : "Solutions"}
            </div>

            {/* Hero */}
            <div className="mt-6 max-w-[980px]">
              <h1
                className="
                  text-[42px]
                  font-black
                  leading-[1.03]
                  tracking-[-0.045em]
                  text-[#F5F7FA]
                  sm:text-[54px]
                  lg:text-[62px]
                  xl:text-[68px]
                "
              >
                {isArabic ? "منصة واحدة." : "One platform."}

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
                >
                  {isArabic ? "احتياجات مختلفة." : "Different needs."}
                </span>
              </h1>

              <p
                className="
                  mt-6
                  max-w-[760px]
                  text-[14px]
                  leading-7
                  text-[#97A8B3]
                  sm:text-[15px]
                  lg:text-[16px]
                "
              >
                {isArabic
                  ? "يمكن لـ AccessMate الجمع بين أكثر من نوع من المساعدة بدل فرض وضع واحد على كل المستخدمين."
                  : "AccessMate can combine multiple assistance modes instead of forcing every user into a single accessibility mode."}
              </p>
            </div>

            {/* Solutions grid */}
            <div
              className="
                mt-10
                grid
                gap-4
                lg:grid-cols-2
              "
            >
              {solutions.map(([Icon, en, ar, enText, arText]: any, index) => (
                <article
                  key={en}
                  className="
                    group
                    relative
                    overflow-hidden
                    rounded-[14px]
                    border
                    border-[#17323D]
                    bg-[#061018]/82
                    p-5
                    shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]
                    backdrop-blur-xl
                    transition-all
                    duration-300
                    hover:-translate-y-1
                    hover:border-[#00D9F5]/45
                    hover:bg-[#071922]
                    hover:shadow-[0_16px_38px_rgba(0,0,0,0.22),0_0_22px_rgba(0,217,245,0.04)]
                    sm:p-6
                  "
                >
                  <div
                    className="
                      pointer-events-none
                      absolute
                      right-[-80px]
                      top-[-90px]
                      h-[210px]
                      w-[210px]
                      rounded-full
                      bg-[#00D9F5]/[0.045]
                      blur-[58px]
                      transition
                      duration-300
                      group-hover:bg-[#00D9F5]/[0.07]
                    "
                  />

                  <div className="relative z-10 flex gap-5">
                    <span
                      className="
                        flex
                        h-[52px]
                        w-[52px]
                        shrink-0
                        items-center
                        justify-center
                        rounded-full
                        border
                        border-[#00D9F5]/40
                        bg-[#00212B]/80
                        text-[#00D9F5]
                        shadow-[0_0_18px_rgba(0,217,245,0.08)]
                        transition-all
                        duration-300
                        group-hover:border-[#00D9F5]/70
                        group-hover:shadow-[0_0_24px_rgba(0,217,245,0.14)]
                      "
                    >
                      <Icon className="h-[21px] w-[21px]" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <h2
                          className="
                            text-[18px]
                            font-bold
                            tracking-[-0.015em]
                            text-[#EEF5F8]
                          "
                        >
                          {isArabic ? ar : en}
                        </h2>

                        <span
                          className="
                            shrink-0
                            text-[10px]
                            font-semibold
                            tracking-[0.16em]
                            text-[#47606D]
                          "
                        >
                          {String(index + 1).padStart(2, "0")}
                        </span>
                      </div>

                      <p
                        className="
                          mt-3
                          text-[12px]
                          leading-6
                          text-[#8FA0AA]
                          sm:text-[13px]
                        "
                      >
                        {isArabic ? arText : enText}
                      </p>

                      <div
                        className="
                          mt-5
                          h-px
                          w-0
                          bg-gradient-to-r
                          from-[#00D9F5]
                          to-transparent
                          transition-all
                          duration-300
                          group-hover:w-full
                        "
                      />
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* Bottom line */}
            <div
              className="
                mt-8
                flex
                flex-col
                gap-3
                border-t
                border-[#14303B]
                pt-6
                sm:flex-row
                sm:items-center
                sm:justify-between
              "
            >
              <p
                className="
                  max-w-[780px]
                  text-[12px]
                  leading-6
                  text-[#70828E]
                "
              >
                {isArabic
                  ? "الفكرة الأساسية هي أن تتكيف المنصة مع احتياجات المستخدم المختلفة داخل تجربة واحدة متناسقة."
                  : "The core idea is simple: one consistent platform that adapts around different accessibility needs."}
              </p>

              <span
                className="
                  text-[10px]
                  font-semibold
                  uppercase
                  tracking-[0.18em]
                  text-[#00D9F5]
                "
              >
                AccessMate AI
              </span>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

