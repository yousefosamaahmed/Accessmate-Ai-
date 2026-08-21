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
    "Ø§Ù„Ø¹Ù…Ù‰ ÙˆØ¶Ø¹Ù Ø§Ù„Ø¨ØµØ±",
    "Voice guidance, screen-reader-friendly structure, image description, OCR, and adaptable visual presentation.",
    "Ø¥Ø±Ø´Ø§Ø¯ ØµÙˆØªÙŠ ÙˆØ¨Ù†ÙŠØ© Ù…Ù†Ø§Ø³Ø¨Ø© Ù„Ù‚Ø§Ø±Ø¦Ø§Øª Ø§Ù„Ø´Ø§Ø´Ø© ÙˆÙˆØµÙ Ø§Ù„ØµÙˆØ± ÙˆØ§Ø³ØªØ®Ø±Ø§Ø¬ Ø§Ù„Ù†Øµ ÙˆØ¹Ø±Ø¶ Ø¨ØµØ±ÙŠ Ù…ØªÙƒÙŠÙ.",
  ],
  [
    AudioLines,
    "Hearing & Speech",
    "Ø§Ù„Ø³Ù…Ø¹ ÙˆØ§Ù„ÙƒÙ„Ø§Ù…",
    "Text-first alternatives, visual feedback, captions, and non-voice interaction paths.",
    "Ø¨Ø¯Ø§Ø¦Ù„ Ù†ØµÙŠØ© ÙˆØªØºØ°ÙŠØ© Ø±Ø§Ø¬Ø¹Ø© Ù…Ø±Ø¦ÙŠØ© ÙˆØªØ³Ù…ÙŠØ§Øª ÙˆÙ…Ø³Ø§Ø±Ø§Øª ØªÙØ§Ø¹Ù„ Ù„Ø§ ØªØ¹ØªÙ…Ø¯ Ø¹Ù„Ù‰ Ø§Ù„ØµÙˆØª.",
  ],
  [
    Brain,
    "Reading & Understanding",
    "Ø§Ù„Ù‚Ø±Ø§Ø¡Ø© ÙˆØ§Ù„ÙÙ‡Ù…",
    "Simplified explanations, structured content, and optional read-aloud support.",
    "Ø´Ø±Ø­ Ù…Ø¨Ø³Ø· ÙˆÙ…Ø­ØªÙˆÙ‰ Ù…Ù†Ø¸Ù… ÙˆØ®ÙŠØ§Ø± Ø§Ù„Ù‚Ø±Ø§Ø¡Ø© Ø§Ù„ØµÙˆØªÙŠØ©.",
  ],
  [
    ShieldCheck,
    "Safe Browsing",
    "Ø§Ù„ØªØµÙØ­ Ø§Ù„Ø¢Ù…Ù†",
    "URL safety checks, trusted domains, and community threat intelligence.",
    "ÙØ­Øµ Ø£Ù…Ø§Ù† Ø§Ù„Ø±ÙˆØ§Ø¨Ø· ÙˆØ§Ù„Ù…ÙˆØ§Ù‚Ø¹ Ø§Ù„Ù…ÙˆØ«ÙˆÙ‚Ø© ÙˆÙ…ØµØ§Ø¯Ø± Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ø§Ù„ØªÙ‡Ø¯ÙŠØ¯Ø§Øª.",
  ],
  [
    HandHeart,
    "Caregiver Support",
    "Ø¯Ø¹Ù… Ù…Ù‚Ø¯Ù… Ø§Ù„Ø±Ø¹Ø§ÙŠØ©",
    "Caregiver profiles, alerts, daily needs, and future Telegram-connected support flows.",
    "Ù…Ù„ÙØ§Øª Ù…Ù‚Ø¯Ù…ÙŠ Ø§Ù„Ø±Ø¹Ø§ÙŠØ© ÙˆØ§Ù„ØªÙ†Ø¨ÙŠÙ‡Ø§Øª ÙˆØ§Ù„Ø§Ø­ØªÙŠØ§Ø¬Ø§Øª Ø§Ù„ÙŠÙˆÙ…ÙŠØ© ÙˆØªØ¯ÙÙ‚Ø§Øª Ø§Ù„Ø¯Ø¹Ù… Ø§Ù„Ù…Ø±ØªØ¨Ø·Ø© Ø¨ØªÙ„ÙŠØ¬Ø±Ø§Ù….",
  ],
  [
    Eye,
    "Vision Intelligence",
    "Ø°ÙƒØ§Ø¡ Ø§Ù„Ø±Ø¤ÙŠØ©",
    "OCR, image description, and AI-assisted understanding of visual content.",
    "Ø§Ø³ØªØ®Ø±Ø§Ø¬ Ø§Ù„Ù†Øµ ÙˆÙˆØµÙ Ø§Ù„ØµÙˆØ± ÙˆÙÙ‡Ù… Ø§Ù„Ù…Ø­ØªÙˆÙ‰ Ø§Ù„Ù…Ø±Ø¦ÙŠ Ø¨Ø§Ù„Ø°ÙƒØ§Ø¡ Ø§Ù„Ø§ØµØ·Ù†Ø§Ø¹ÙŠ.",
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
              {isArabic ? "Ø§Ù„Ø­Ù„ÙˆÙ„" : "Solutions"}
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
                {isArabic ? "Ù…Ù†ØµØ© ÙˆØ§Ø­Ø¯Ø©." : "One platform."}

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
                  {isArabic ? "Ø§Ø­ØªÙŠØ§Ø¬Ø§Øª Ù…Ø®ØªÙ„ÙØ©." : "Different needs."}
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
                  ? "ÙŠÙ…ÙƒÙ† Ù„Ù€ AccessMate Ø§Ù„Ø¬Ù…Ø¹ Ø¨ÙŠÙ† Ø£ÙƒØ«Ø± Ù…Ù† Ù†ÙˆØ¹ Ù…Ù† Ø§Ù„Ù…Ø³Ø§Ø¹Ø¯Ø© Ø¨Ø¯Ù„ ÙØ±Ø¶ ÙˆØ¶Ø¹ ÙˆØ§Ø­Ø¯ Ø¹Ù„Ù‰ ÙƒÙ„ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙŠÙ†."
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
                  ? "Ø§Ù„ÙÙƒØ±Ø© Ø§Ù„Ø£Ø³Ø§Ø³ÙŠØ© Ù‡ÙŠ Ø£Ù† ØªØªÙƒÙŠÙ Ø§Ù„Ù…Ù†ØµØ© Ù…Ø¹ Ø§Ø­ØªÙŠØ§Ø¬Ø§Øª Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… Ø§Ù„Ù…Ø®ØªÙ„ÙØ© Ø¯Ø§Ø®Ù„ ØªØ¬Ø±Ø¨Ø© ÙˆØ§Ø­Ø¯Ø© Ù…ØªÙ†Ø§Ø³Ù‚Ø©."
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

