import {
  AudioLines,
  BellRing,
  Eye,
  FileText,
  Hand,
  Languages,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import PublicNavbar from "../components/Public/PublicNavbar";
import { usePublicLanguage } from "../hooks/usePublicLanguage";
import backgroundImage from "../assets/wellpaper.jpg";

const items = [
  [
    Eye,
    "Vision Support",
    "Ø¯Ø¹Ù… Ø§Ù„Ø±Ø¤ÙŠØ©",
    "AI image understanding, OCR, and accessible descriptions.",
    "ÙÙ‡Ù… Ø§Ù„ØµÙˆØ± ÙˆØ§Ø³ØªØ®Ø±Ø§Ø¬ Ø§Ù„Ù†ØµÙˆØµ ÙˆØ§Ù„ÙˆØµÙ Ø§Ù„Ù…ØªØ§Ø­ Ø¨Ø§Ù„Ø°ÙƒØ§Ø¡ Ø§Ù„Ø§ØµØ·Ù†Ø§Ø¹ÙŠ.",
  ],
  [
    AudioLines,
    "Voice Assistance",
    "Ø§Ù„Ù…Ø³Ø§Ø¹Ø¯Ø© Ø§Ù„ØµÙˆØªÙŠØ©",
    "Speech input, text-to-speech, and adaptive voice guidance.",
    "Ø¥Ø¯Ø®Ø§Ù„ ØµÙˆØªÙŠ ÙˆØªØ­ÙˆÙŠÙ„ Ø§Ù„Ù†Øµ Ø¥Ù„Ù‰ ÙƒÙ„Ø§Ù… ÙˆØ¥Ø±Ø´Ø§Ø¯ ØµÙˆØªÙŠ Ù…ØªÙƒÙŠÙ.",
  ],
  [
    ShieldCheck,
    "Website Safety",
    "Ø£Ù…Ø§Ù† Ø§Ù„Ù…ÙˆØ§Ù‚Ø¹",
    "Suspicious URL checks, trusted domains, and threat intelligence.",
    "ÙØ­Øµ Ø§Ù„Ø±ÙˆØ§Ø¨Ø· Ø§Ù„Ù…Ø´Ø¨ÙˆÙ‡Ø© ÙˆØ§Ù„Ù…ÙˆØ§Ù‚Ø¹ Ø§Ù„Ù…ÙˆØ«ÙˆÙ‚Ø© ÙˆÙ…Ø¹Ù„ÙˆÙ…Ø§Øª Ø§Ù„ØªÙ‡Ø¯ÙŠØ¯Ø§Øª.",
  ],
  [
    FileText,
    "Document Intelligence",
    "Ø°ÙƒØ§Ø¡ Ø§Ù„Ù…Ø³ØªÙ†Ø¯Ø§Øª",
    "Upload, understand, simplify, and ask questions about documents.",
    "Ø§Ø±ÙØ¹ Ø§Ù„Ù…Ø³ØªÙ†Ø¯Ø§Øª ÙˆØ§ÙÙ‡Ù…Ù‡Ø§ ÙˆØ¨Ø³Ù‘Ø·Ù‡Ø§ ÙˆØ§Ø³Ø£Ù„ Ø¹Ù†Ù‡Ø§.",
  ],
  [
    BellRing,
    "Caregiver Alerts",
    "ØªÙ†Ø¨ÙŠÙ‡Ø§Øª Ù…Ù‚Ø¯Ù… Ø§Ù„Ø±Ø¹Ø§ÙŠØ©",
    "Support and emergency workflows for trusted caregivers.",
    "Ø¥Ø´Ø¹Ø§Ø±Ø§Øª ÙˆÙ…Ù‡Ø§Ù… Ø¯Ø¹Ù… ÙˆØ·ÙˆØ§Ø±Ø¦ Ù„Ù…Ù‚Ø¯Ù…ÙŠ Ø§Ù„Ø±Ø¹Ø§ÙŠØ© Ø§Ù„Ù…ÙˆØ«ÙˆÙ‚ÙŠÙ†.",
  ],
  [
    Hand,
    "Sign Communication",
    "Ø§Ù„ØªÙˆØ§ØµÙ„ Ø¨Ø§Ù„Ø¥Ø´Ø§Ø±Ø©",
    "Live captions, speech playback, translation, and environmental sound awareness.",
    "Ø£Ø³Ø§Ø³ Ù„Ø¯Ø¹Ù… Ø§Ù„ØªÙØ§Ø¹Ù„ Ø¨Ø§Ø³ØªØ®Ø¯Ø§Ù… Ù„ØºØ© Ø§Ù„Ø¥Ø´Ø§Ø±Ø©.",
  ],
  [
    Languages,
    "Arabic & English",
    "Ø§Ù„Ø¹Ø±Ø¨ÙŠØ© ÙˆØ§Ù„Ø¥Ù†Ø¬Ù„ÙŠØ²ÙŠØ©",
    "A bilingual experience across the public interface.",
    "ØªØ¬Ø±Ø¨Ø© Ø«Ù†Ø§Ø¦ÙŠØ© Ø§Ù„Ù„ØºØ© Ø¹Ø¨Ø± Ø§Ù„ÙˆØ§Ø¬Ù‡Ø© Ø§Ù„Ø¹Ø§Ù…Ø©.",
  ],
  [
    Sparkles,
    "Adaptive Experience",
    "ØªØ¬Ø±Ø¨Ø© Ù…ØªÙƒÙŠÙØ©",
    "The interface can adapt around different accessibility needs.",
    "ÙŠÙ…ÙƒÙ† Ù„Ù„ÙˆØ§Ø¬Ù‡Ø© Ø£Ù† ØªØªÙƒÙŠÙ Ù…Ø¹ Ø§Ø­ØªÙŠØ§Ø¬Ø§Øª Ø¥Ù…ÙƒØ§Ù†ÙŠØ© Ø§Ù„ÙˆØµÙˆÙ„ Ø§Ù„Ù…Ø®ØªÙ„ÙØ©.",
  ],
];

export default function Features() {
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

      {/* Cyan ambient light */}
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
              {isArabic ? "Ø§Ù„Ù…Ù…ÙŠØ²Ø§Øª" : "Features"}
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
                {isArabic ? "Ø¥Ù…ÙƒØ§Ù†ÙŠØ© Ø§Ù„ÙˆØµÙˆÙ„ØŒ" : "Accessibility,"}

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
                  {isArabic ? "Ù…Ø¯Ù…Ø¬Ø© ÙÙŠ Ø§Ù„Ù…Ù†ØµØ©." : "built into the platform."}
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
                  ? "Ø£Ø¯ÙˆØ§Øª Ù…ØµÙ…Ù…Ø© Ù„Ø¯Ø¹Ù… Ø§Ù„Ø±Ø¤ÙŠØ© ÙˆØ§Ù„ØµÙˆØª ÙˆØ§Ù„Ù‚Ø±Ø§Ø¡Ø© ÙˆØ§Ù„Ø£Ù…Ø§Ù† ÙˆØ§Ù„ØªÙˆØ§ØµÙ„ ÙÙŠ ØªØ¬Ø±Ø¨Ø© ÙˆØ§Ø­Ø¯Ø© Ù…ØªÙ†Ø§Ø³Ù‚Ø©."
                  : "Tools for vision, voice, reading, safety, and communication â€” designed as one consistent experience."}
              </p>
            </div>

            {/* Feature grid */}
            <div
              className="
                mt-10
                grid
                gap-4
                md:grid-cols-2
                xl:grid-cols-4
              "
            >
              {items.map(([Icon, en, ar, enText, arText]: any, index) => (
                <article
                  key={en}
                  className="
                    group
                    relative
                    min-h-[218px]
                    overflow-hidden
                    rounded-[12px]
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
                  "
                >
                  <div
                    className="
                      pointer-events-none
                      absolute
                      right-[-55px]
                      top-[-70px]
                      h-[155px]
                      w-[155px]
                      rounded-full
                      bg-[#00D9F5]/[0.045]
                      blur-[46px]
                      transition
                      duration-300
                      group-hover:bg-[#00D9F5]/[0.07]
                    "
                  />

                  <div className="relative z-10">
                    <div className="flex items-start justify-between gap-3">
                      <span
                        className="
                          flex
                          h-[44px]
                          w-[44px]
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
                        <Icon className="h-[19px] w-[19px]" />
                      </span>

                      <span
                        className="
                          text-[10px]
                          font-semibold
                          tracking-[0.16em]
                          text-[#47606D]
                        "
                      >
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>

                    <h2
                      className="
                        mt-5
                        text-[16px]
                        font-bold
                        tracking-[-0.015em]
                        text-[#EEF5F8]
                      "
                    >
                      {isArabic ? ar : en}
                    </h2>

                    <p
                      className="
                        mt-3
                        text-[12px]
                        leading-6
                        text-[#8FA0AA]
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
                  max-w-[760px]
                  text-[12px]
                  leading-6
                  text-[#70828E]
                "
              >
                {isArabic
                  ? "ØªÙ… ØªØµÙ…ÙŠÙ… ÙƒÙ„ Ø£Ø¯Ø§Ø© Ù„ØªØ¹Ù…Ù„ Ø¶Ù…Ù† ØªØ¬Ø±Ø¨Ø© Ù…ÙˆØ­Ø¯Ø© ÙˆÙˆØ§Ø¶Ø­Ø© ÙˆÙ‚Ø§Ø¨Ù„Ø© Ù„Ù„ØªÙƒÙŠÙ."
                  : "Every capability is designed to work as part of one clear, consistent, and adaptive experience."}
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

