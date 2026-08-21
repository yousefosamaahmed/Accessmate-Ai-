import {
  Mail,
  MessageCircle,
  Send,
  Sparkles,
} from "lucide-react";
import { type FormEvent, useState } from "react";

import PublicNavbar from "../components/Public/PublicNavbar";
import { usePublicLanguage } from "../hooks/usePublicLanguage";
import backgroundImage from "../assets/wellpaper.jpg";

export default function Contact() {
  const { isArabic } = usePublicLanguage();
  const [sent, setSent] = useState(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setSent(true);
  };

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

      {/* Cyan atmospheric glow */}
      <div className="pointer-events-none fixed inset-0 z-[1] overflow-hidden">
        <div
          className="
            absolute
            right-[-190px]
            top-[60px]
            h-[620px]
            w-[620px]
            rounded-full
            bg-[#00D9F5]/[0.055]
            blur-[190px]
          "
        />

        <div
          className="
            absolute
            bottom-[-220px]
            left-[7%]
            h-[520px]
            w-[520px]
            rounded-full
            bg-[#008FC8]/[0.04]
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
              grid
              gap-8
              px-6
              py-12
              sm:px-10
              lg:grid-cols-[0.82fr_1.18fr]
              lg:px-14
              lg:py-14
              xl:px-[64px]
              2xl:px-[76px]
            "
          >
            {/* Left side */}
            <div className="flex flex-col justify-center">
              <div
                className="
                  inline-flex
                  w-fit
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
                {isArabic ? "ØªÙˆØ§ØµÙ„ Ù…Ø¹Ù†Ø§" : "Contact"}
              </div>

              <h1
                className="
                  mt-6
                  max-w-[700px]
                  text-[42px]
                  font-black
                  leading-[1.03]
                  tracking-[-0.045em]
                  text-[#F5F7FA]
                  sm:text-[54px]
                  lg:text-[60px]
                  xl:text-[66px]
                "
              >
                {isArabic ? "Ø§Ø¨Ø¯Ø£ Ù…Ø­Ø§Ø¯Ø«Ø©" : "Start a conversation"}

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
                  {isArabic ? "Ù…Ø¹Ù†Ø§." : "with us."}
                </span>
              </h1>

              <p
                className="
                  mt-6
                  max-w-[610px]
                  text-[14px]
                  leading-7
                  text-[#97A8B3]
                  sm:text-[15px]
                  lg:text-[16px]
                "
              >
                {isArabic
                  ? "Ù‡Ø°Ù‡ Ø§Ù„ØµÙØ­Ø© Ø¬Ø§Ù‡Ø²Ø© Ø¨ØµØ±ÙŠÙ‹Ø§ Ø§Ù„Ø¢Ù†ØŒ ÙˆÙŠÙ…ÙƒÙ† Ù„Ø§Ø­Ù‚Ù‹Ø§ Ø±Ø¨Ø· Ø§Ù„Ù†Ù…ÙˆØ°Ø¬ Ø¨Ø¨Ø±ÙŠØ¯ Ø£Ùˆ API ØªÙˆØ§ØµÙ„ Ø­Ù‚ÙŠÙ‚ÙŠ."
                  : "This page is visually ready now. The form can later be connected to a real email or contact API."}
              </p>

              <div className="mt-8 grid gap-3">
                <div
                  className="
                    group
                    flex
                    items-center
                    gap-4
                    rounded-[12px]
                    border
                    border-[#17323D]
                    bg-[#061018]/82
                    p-4
                    backdrop-blur-xl
                    transition-all
                    duration-300
                    hover:-translate-y-1
                    hover:border-[#00D9F5]/40
                    hover:bg-[#071922]
                  "
                >
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
                    "
                  >
                    <Mail className="h-[18px] w-[18px]" />
                  </span>

                  <div>
                    <p className="text-[14px] font-semibold text-[#EDF5F8]">
                      {isArabic
                        ? "Ø¯Ø¹Ù… ÙˆØ§Ø³ØªÙØ³Ø§Ø±Ø§Øª Ø§Ù„Ù…Ø´Ø±ÙˆØ¹"
                        : "Project support and inquiries"}
                    </p>

                    <p className="mt-1 text-[11px] leading-5 text-[#81929D]">
                      {isArabic
                        ? "Ù„Ù„Ø§Ø³ØªÙØ³Ø§Ø±Ø§Øª Ø§Ù„Ø¹Ø§Ù…Ø© ÙˆØ§Ù„Ø¯Ø¹Ù… Ø§Ù„Ù…Ø±ØªØ¨Ø· Ø¨Ø§Ù„Ù…Ù†ØµØ©."
                        : "For general questions and product-related support."}
                    </p>
                  </div>
                </div>

                <div
                  className="
                    group
                    flex
                    items-center
                    gap-4
                    rounded-[12px]
                    border
                    border-[#17323D]
                    bg-[#061018]/82
                    p-4
                    backdrop-blur-xl
                    transition-all
                    duration-300
                    hover:-translate-y-1
                    hover:border-[#00D9F5]/40
                    hover:bg-[#071922]
                  "
                >
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
                    "
                  >
                    <MessageCircle className="h-[18px] w-[18px]" />
                  </span>

                  <div>
                    <p className="text-[14px] font-semibold text-[#EDF5F8]">
                      {isArabic
                        ? "Ø§Ù„Ø´Ø±Ø§ÙƒØ§Øª ÙˆØ§Ù„ØªØ¹Ø§ÙˆÙ†"
                        : "Partnerships and collaboration"}
                    </p>

                    <p className="mt-1 text-[11px] leading-5 text-[#81929D]">
                      {isArabic
                        ? "Ù„Ù„ØªØ¹Ø§ÙˆÙ† ÙˆØ§Ù„Ø´Ø±Ø§ÙƒØ§Øª ÙˆÙØ±Øµ ØªØ·ÙˆÙŠØ± AccessMate AI."
                        : "For partnerships, collaboration, and opportunities to grow AccessMate AI."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Form */}
            <form
              onSubmit={submit}
              className="
                relative
                overflow-hidden
                rounded-[14px]
                border
                border-[#17323D]
                bg-[#061018]/84
                p-6
                shadow-[inset_0_1px_0_rgba(255,255,255,0.025),0_22px_60px_rgba(0,0,0,0.22)]
                backdrop-blur-xl
                sm:p-8
                lg:p-9
              "
            >
              <div
                className="
                  pointer-events-none
                  absolute
                  right-[-120px]
                  top-[-140px]
                  h-[320px]
                  w-[320px]
                  rounded-full
                  bg-[#00D9F5]/[0.05]
                  blur-[85px]
                "
              />

              <div className="relative z-10">
                <div className="mb-7">
                  <p
                    className="
                      text-[10px]
                      font-semibold
                      uppercase
                      tracking-[0.18em]
                      text-[#00D9F5]
                    "
                  >
                    {isArabic ? "Ø£Ø±Ø³Ù„ Ø±Ø³Ø§Ù„Ø©" : "Send a message"}
                  </p>

                  <h2
                    className="
                      mt-3
                      text-[24px]
                      font-bold
                      tracking-[-0.025em]
                      text-[#EEF5F8]
                      sm:text-[28px]
                    "
                  >
                    {isArabic
                      ? "ÙƒÙŠÙ ÙŠÙ…ÙƒÙ†Ù†Ø§ Ù…Ø³Ø§Ø¹Ø¯ØªÙƒØŸ"
                      : "How can we help?"}
                  </h2>

                  <p
                    className="
                      mt-2
                      text-[12px]
                      leading-6
                      text-[#82939E]
                    "
                  >
                    {isArabic
                      ? "Ø§Ù…Ù„Ø£ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª ÙˆØ³Ø¬Ù„ Ø±Ø³Ø§Ù„ØªÙƒØŒ ÙˆØ³ÙŠØ¸Ù„ Ù…Ù†Ø·Ù‚ Ø§Ù„Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„Ø­Ø§Ù„ÙŠ ÙƒÙ…Ø§ Ù‡Ùˆ."
                      : "Fill in the details below and submit your message using the current form flow."}
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span
                      className="
                        mb-2
                        block
                        text-[12px]
                        font-medium
                        text-[#A7B4BC]
                      "
                    >
                      {isArabic ? "Ø§Ù„Ø§Ø³Ù…" : "Name"}
                    </span>

                    <input
                      required
                      className="
                        min-h-[50px]
                        w-full
                        rounded-[9px]
                        border
                        border-[#17323D]
                        bg-[#020A11]/78
                        px-4
                        text-[13px]
                        text-[#F4F9FC]
                        outline-none
                        transition-all
                        duration-200
                        placeholder:text-[#50606B]
                        focus:border-[#00D9F5]/65
                        focus:shadow-[0_0_0_3px_rgba(0,217,245,0.06),0_0_20px_rgba(0,217,245,0.05)]
                      "
                    />
                  </label>

                  <label className="block">
                    <span
                      className="
                        mb-2
                        block
                        text-[12px]
                        font-medium
                        text-[#A7B4BC]
                      "
                    >
                      {isArabic ? "Ø§Ù„Ø¨Ø±ÙŠØ¯ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ" : "Email"}
                    </span>

                    <input
                      type="email"
                      required
                      className="
                        min-h-[50px]
                        w-full
                        rounded-[9px]
                        border
                        border-[#17323D]
                        bg-[#020A11]/78
                        px-4
                        text-[13px]
                        text-[#F4F9FC]
                        outline-none
                        transition-all
                        duration-200
                        placeholder:text-[#50606B]
                        focus:border-[#00D9F5]/65
                        focus:shadow-[0_0_0_3px_rgba(0,217,245,0.06),0_0_20px_rgba(0,217,245,0.05)]
                      "
                    />
                  </label>
                </div>

                <label className="mt-4 block">
                  <span
                    className="
                      mb-2
                      block
                      text-[12px]
                      font-medium
                      text-[#A7B4BC]
                    "
                  >
                    {isArabic ? "Ø§Ù„Ø±Ø³Ø§Ù„Ø©" : "Message"}
                  </span>

                  <textarea
                    required
                    rows={7}
                    className="
                      w-full
                      resize-none
                      rounded-[9px]
                      border
                      border-[#17323D]
                      bg-[#020A11]/78
                      px-4
                      py-3
                      text-[13px]
                      leading-6
                      text-[#F4F9FC]
                      outline-none
                      transition-all
                      duration-200
                      placeholder:text-[#50606B]
                      focus:border-[#00D9F5]/65
                      focus:shadow-[0_0_0_3px_rgba(0,217,245,0.06),0_0_20px_rgba(0,217,245,0.05)]
                    "
                  />
                </label>

                {sent && (
                  <div
                    className="
                      mt-4
                      rounded-[9px]
                      border
                      border-[#00D9F5]/25
                      bg-[#00212B]/65
                      px-4
                      py-3
                      text-[12px]
                      leading-6
                      text-[#72E7F7]
                    "
                  >
                    {isArabic
                      ? "ØªÙ… ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø±Ø³Ø§Ù„Ø© ÙÙŠ Ø§Ù„ÙˆØ§Ø¬Ù‡Ø©. Ù†Ø±Ø¨Ø· Ø§Ù„Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„Ø­Ù‚ÙŠÙ‚ÙŠ Ù„Ø§Ø­Ù‚Ù‹Ø§."
                      : "The form UI has accepted the message. We can connect real delivery later."}
                  </div>
                )}

                <button
                  type="submit"
                  className="
                    group
                    mt-5
                    inline-flex
                    min-h-[50px]
                    items-center
                    justify-center
                    gap-2
                    rounded-[9px]
                    border
                    border-[#00D9F5]/80
                    bg-gradient-to-r
                    from-[#0094C7]
                    via-[#00ADD8]
                    to-[#00C9E6]
                    px-6
                    text-[12px]
                    font-bold
                    text-white
                    shadow-[0_0_22px_rgba(0,201,230,0.14)]
                    transition-all
                    duration-300
                    hover:-translate-y-0.5
                    hover:brightness-110
                    hover:shadow-[0_0_30px_rgba(0,217,245,0.22)]
                  "
                >
                  <Send
                    className="
                      h-[15px]
                      w-[15px]
                      transition-transform
                      duration-300
                      group-hover:translate-x-0.5
                    "
                  />

                  {isArabic ? "Ø¥Ø±Ø³Ø§Ù„" : "Send Message"}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}


