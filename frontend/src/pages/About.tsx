import {
  HandHeart,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import PublicNavbar from "../components/Public/PublicNavbar";
import { usePublicLanguage } from "../hooks/usePublicLanguage";
import backgroundImage from "../assets/wellpaper.jpg";

const values = [
  {
    icon: Sparkles,
    en: "Adaptive by design",
    ar: "Ù…ØªÙƒÙŠÙ Ù…Ù† Ø§Ù„Ø¨Ø¯Ø§ÙŠØ©",
    textEn:
      "Accessibility is built into the experience from the first interaction.",
    textAr:
      "Ø¥Ù…ÙƒØ§Ù†ÙŠØ© Ø§Ù„ÙˆØµÙˆÙ„ Ø¬Ø²Ø¡ Ø£Ø³Ø§Ø³ÙŠ Ù…Ù† Ø§Ù„ØªØ¬Ø±Ø¨Ø© Ù…Ù†Ø° Ø£ÙˆÙ„ ØªÙØ§Ø¹Ù„.",
  },
  {
    icon: ShieldCheck,
    en: "Safety-aware",
    ar: "ÙŠØ±Ø§Ø¹ÙŠ Ø§Ù„Ø£Ù…Ø§Ù†",
    textEn:
      "Useful assistance should be dependable, clear, and designed with safety in mind.",
    textAr:
      "Ø§Ù„Ù…Ø³Ø§Ø¹Ø¯Ø© Ø§Ù„ÙØ¹Ø§Ù„Ø© ÙŠØ¬Ø¨ Ø£Ù† ØªÙƒÙˆÙ† Ù…ÙˆØ«ÙˆÙ‚Ø© ÙˆÙˆØ§Ø¶Ø­Ø© ÙˆÙ…ØµÙ…Ù…Ø© Ù…Ø¹ Ù…Ø±Ø§Ø¹Ø§Ø© Ø§Ù„Ø£Ù…Ø§Ù†.",
  },
  {
    icon: HandHeart,
    en: "Human-centered",
    ar: "Ù…ØªÙ…Ø­ÙˆØ± Ø­ÙˆÙ„ Ø§Ù„Ø¥Ù†Ø³Ø§Ù†",
    textEn:
      "Technology should reduce friction and adapt around real human needs.",
    textAr:
      "ÙŠØ¬Ø¨ Ø£Ù† ØªÙ‚Ù„Ù„ Ø§Ù„ØªÙƒÙ†ÙˆÙ„ÙˆØ¬ÙŠØ§ Ø§Ù„ØªØ¹Ù‚ÙŠØ¯ ÙˆØ£Ù† ØªØªÙƒÙŠÙ Ù…Ø¹ Ø§Ø­ØªÙŠØ§Ø¬Ø§Øª Ø§Ù„Ø¥Ù†Ø³Ø§Ù† Ø§Ù„Ø­Ù‚ÙŠÙ‚ÙŠØ©.",
  },
];

export default function About() {
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

      {/* Atmospheric cyan glow */}
      <div className="pointer-events-none fixed inset-0 z-[1] overflow-hidden">
        <div
          className="
            absolute
            right-[-170px]
            top-[90px]
            h-[560px]
            w-[560px]
            rounded-full
            bg-[#00D9F5]/[0.055]
            blur-[180px]
          "
        />

        <div
          className="
            absolute
            bottom-[-200px]
            left-[10%]
            h-[500px]
            w-[500px]
            rounded-full
            bg-[#008CCB]/[0.04]
            blur-[170px]
          "
        />
      </div>

      {/* Main shell */}
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
              py-14
              sm:px-10
              lg:px-14
              lg:py-16
              xl:px-[64px]
              2xl:px-[76px]
            "
          >
            {/* Small badge */}
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

              {isArabic ? "Ù…Ù† Ù†Ø­Ù†" : "About AccessMate"}
            </div>

            {/* Heading */}
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
                {isArabic
                  ? "ÙŠØ¬Ø¨ Ø£Ù† ØªØªÙƒÙŠÙ Ø§Ù„ØªÙƒÙ†ÙˆÙ„ÙˆØ¬ÙŠØ§ Ù…Ø¹"
                  : "Technology should adapt to"}

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
                  {isArabic ? "Ø§Ù„Ø¥Ù†Ø³Ø§Ù†ØŒ Ù„Ø§ Ø§Ù„Ø¹ÙƒØ³." : "people, not the other way around."}
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
                  ? "AccessMate AI ÙŠØ¨Ù†ÙŠ ØªØ¬Ø±Ø¨Ø© Ø±Ù‚Ù…ÙŠØ© Ø£ÙƒØ«Ø± Ø´Ù…ÙˆÙ„Ù‹Ø§ Ù…Ù† Ø®Ù„Ø§Ù„ Ø£Ø¯ÙˆØ§Øª Ø°ÙƒÙŠØ© ØªØªÙƒÙŠÙ Ù…Ø¹ Ø§Ø­ØªÙŠØ§Ø¬Ø§Øª Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ØŒ Ø¨Ø¯Ù„Ù‹Ø§ Ù…Ù† Ø¥Ø¬Ø¨Ø§Ø±Ù‡ Ø¹Ù„Ù‰ Ø§Ù„ØªÙƒÙŠÙ Ù…Ø¹ Ø§Ù„ØªÙ‚Ù†ÙŠØ©."
                  : "AccessMate AI creates a more inclusive digital experience through intelligent tools that adapt around the user instead of forcing the user to adapt to technology."}
              </p>
            </div>

            {/* Content grid */}
            <div
              className="
                mt-12
                grid
                gap-5
                lg:grid-cols-[1.08fr_0.92fr]
                xl:gap-6
              "
            >
              {/* Main mission card */}
              <div
                className="
                  relative
                  overflow-hidden
                  rounded-[14px]
                  border
                  border-[#17323D]
                  bg-[#061018]/82
                  p-6
                  shadow-[inset_0_1px_0_rgba(255,255,255,0.025),0_20px_50px_rgba(0,0,0,0.18)]
                  backdrop-blur-xl
                  sm:p-8
                  lg:p-9
                "
              >
                <div
                  className="
                    pointer-events-none
                    absolute
                    right-[-90px]
                    top-[-120px]
                    h-[270px]
                    w-[270px]
                    rounded-full
                    bg-[#00D9F5]/[0.045]
                    blur-[70px]
                  "
                />

                <div className="relative z-10">
                  <p
                    className="
                      text-[10px]
                      font-semibold
                      uppercase
                      tracking-[0.18em]
                      text-[#00D9F5]
                    "
                  >
                    {isArabic ? "Ø±Ø¤ÙŠØªÙ†Ø§" : "Our Vision"}
                  </p>

                  <h2
                    className="
                      mt-4
                      max-w-[680px]
                      text-[24px]
                      font-bold
                      leading-[1.35]
                      tracking-[-0.025em]
                      text-[#EDF5F8]
                      sm:text-[28px]
                    "
                  >
                    {isArabic
                      ? "ØªØ¬Ø±Ø¨Ø© ÙˆØ§Ø­Ø¯Ø© ØªØ¬Ù…Ø¹ Ø£Ø¯ÙˆØ§Øª Ø§Ù„ÙˆØµÙˆÙ„ Ø§Ù„Ø°ÙƒÙŠØ© Ø­ÙˆÙ„ Ø§Ø­ØªÙŠØ§Ø¬Ø§Øª Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…."
                      : "One adaptive experience that brings intelligent accessibility tools around the user."}
                  </h2>

                  <div
                    className="
                      mt-7
                      h-px
                      w-full
                      bg-gradient-to-r
                      from-[#00D9F5]/25
                      via-[#17323D]
                      to-transparent
                    "
                  />

                  <p
                    className="
                      mt-7
                      max-w-[720px]
                      text-[15px]
                      leading-8
                      text-[#B1BEC6]
                      sm:text-[16px]
                    "
                  >
                    {isArabic
                      ? "AccessMate AI Ù…Ù†ØµØ© Ù…Ø³Ø§Ø¹Ø¯Ø© Ù…ØªÙƒÙŠÙØ© ØªÙ‡Ø¯Ù Ø¥Ù„Ù‰ Ø¬Ù…Ø¹ Ø£Ø¯ÙˆØ§Øª Ø§Ù„Ù‚Ø±Ø§Ø¡Ø© ÙˆØ§Ù„Ø±Ø¤ÙŠØ© ÙˆØ§Ù„ØµÙˆØª ÙˆØ§Ù„Ø£Ù…Ø§Ù† ÙˆØ§Ù„ØªÙˆØ§ØµÙ„ ÙÙŠ ØªØ¬Ø±Ø¨Ø© ÙˆØ§Ø­Ø¯Ø© ÙŠÙ…ÙƒÙ† ØªØ®ØµÙŠØµÙ‡Ø§ Ø­Ø³Ø¨ Ø§Ø­ØªÙŠØ§Ø¬Ø§Øª Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…."
                      : "AccessMate AI is an adaptive assistance platform designed to bring reading, vision, voice, safety, and communication tools into one experience that can be tailored around the user."}
                  </p>

                  <p
                    className="
                      mt-5
                      max-w-[720px]
                      text-[15px]
                      leading-8
                      text-[#B1BEC6]
                      sm:text-[16px]
                    "
                  >
                    {isArabic
                      ? "Ø§Ù„ÙÙƒØ±Ø© Ø§Ù„Ø£Ø³Ø§Ø³ÙŠØ© Ù„ÙŠØ³Øª Ø¥Ø¶Ø§ÙØ© Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª ÙˆØµÙˆÙ„ Ø´ÙƒÙ„ÙŠØ©ØŒ Ø¨Ù„ Ø¬Ø¹Ù„ Ø¥Ù…ÙƒØ§Ù†ÙŠØ© Ø§Ù„ÙˆØµÙˆÙ„ Ø¬Ø²Ø¡Ù‹Ø§ Ù…Ù† Ø¨Ù†ÙŠØ© Ø§Ù„Ù…Ù†ØªØ¬ Ù…Ù† Ø§Ù„Ø¨Ø¯Ø§ÙŠØ©."
                      : "The goal is not to bolt accessibility settings onto the product. Accessibility is intended to be part of the product architecture from the start."}
                  </p>
                </div>
              </div>

              {/* Value cards */}
              <div className="grid gap-4">
                {values.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.en}
                      className="
                        group
                        relative
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
                        hover:border-[#00D9F5]/40
                        hover:bg-[#071922]
                        hover:shadow-[0_14px_34px_rgba(0,0,0,0.20),0_0_22px_rgba(0,217,245,0.04)]
                      "
                    >
                      <div className="flex items-start gap-4">
                        <span
                          className="
                            flex
                            h-[46px]
                            w-[46px]
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
                            group-hover:border-[#00D9F5]/65
                            group-hover:shadow-[0_0_22px_rgba(0,217,245,0.13)]
                          "
                        >
                          <Icon className="h-5 w-5" />
                        </span>

                        <div className="min-w-0">
                          <h3
                            className="
                              text-[16px]
                              font-bold
                              tracking-[-0.015em]
                              text-[#EDF5F8]
                            "
                          >
                            {isArabic ? item.ar : item.en}
                          </h3>

                          <p
                            className="
                              mt-2
                              text-[12px]
                              leading-6
                              text-[#8FA0AA]
                            "
                          >
                            {isArabic ? item.textAr : item.textEn}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom statement */}
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
                  ? "AccessMate AI â€” ØªØ¬Ø±Ø¨Ø© ÙˆØµÙˆÙ„ Ù…Ø¯Ø¹ÙˆÙ…Ø© Ø¨Ø§Ù„Ø°ÙƒØ§Ø¡ Ø§Ù„Ø§ØµØ·Ù†Ø§Ø¹ÙŠØŒ Ù…ØµÙ…Ù…Ø© Ù„ØªÙƒÙˆÙ† Ø£ÙƒØ«Ø± Ø¨Ø³Ø§Ø·Ø© ÙˆØ£Ù…Ø§Ù†Ù‹Ø§ ÙˆØ´Ù…ÙˆÙ„Ù‹Ø§."
                  : "AccessMate AI â€” AI-powered accessibility designed to be simpler, safer, and more inclusive."}
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
                Accessibility without limits
              </span>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

