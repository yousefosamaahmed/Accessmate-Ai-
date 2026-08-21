import {
  ChevronDown,
  Globe2,
  LogIn,
  Menu,
  X,
} from "lucide-react";

import { useState } from "react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import logoImage from "../../assets/Logo.jpeg";

import {
  usePublicLanguage,
} from "../../hooks/usePublicLanguage";

const navItems = [
  { path: "/", en: "Home", ar: "الرئيسية" },
  { path: "/features", en: "Features", ar: "المميزات" },
  { path: "/solutions", en: "Solutions", ar: "الحلول" },
  { path: "/about", en: "About Us", ar: "من نحن" },
  { path: "/contact", en: "Contact", ar: "تواصل معنا" },
];

export default function PublicNavbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    lang,
    isArabic,
    toggleLanguage,
  } = usePublicLanguage();

  const [mobileOpen, setMobileOpen] = useState(false);

  function go(path: string) {
    setMobileOpen(false);
    navigate(path);
  }

  return (
    <header
      dir={isArabic ? "rtl" : "ltr"}
      className="
        relative
        z-50
        flex
        h-[78px]
        min-h-[78px]
        items-center
        justify-between
        gap-5
        border-b
        border-[#112B36]/70
        bg-[#020A11]/94
        px-5
        backdrop-blur-2xl
        sm:px-7
        lg:px-9
        xl:px-10
      "
    >
      <button
        type="button"
        onClick={() => go("/")}
        className="
          group
          flex
          min-w-0
          shrink-0
          items-center
          gap-3
          text-start
        "
        aria-label="AccessMate AI Home"
      >
        <span
          className="
            relative
            flex
            h-[46px]
            w-[46px]
            shrink-0
            items-center
            justify-center
            rounded-full
            border
            border-[#00D9F5]/38
            bg-[#03131A]
            shadow-[0_0_24px_rgba(0,217,245,0.08)]
            transition-all
            duration-300
            group-hover:border-[#00D9F5]/70
            group-hover:shadow-[0_0_28px_rgba(0,217,245,0.16)]
          "
        >
          <div className="absolute inset-[4px] rounded-full bg-[#001A22]" />

          <img
            src={logoImage}
            alt="AccessMate AI"
            className="
              relative
              z-10
              h-[35px]
              w-[35px]
              rounded-full
              object-cover
            "
            style={{
              filter:
                "grayscale(1) sepia(1) hue-rotate(135deg) saturate(7) brightness(1.18) contrast(1.18)",
            }}
          />

          <div
            className="
              pointer-events-none
              absolute
              inset-0
              rounded-full
              shadow-[inset_0_0_18px_rgba(0,217,245,0.05)]
            "
          />
        </span>

        <span className="min-w-0">
          <span
            className="
              block
              truncate
              text-[16px]
              font-bold
              tracking-[-0.025em]
              text-[#F4F9FC]
              sm:text-[17px]
            "
          >
            AccessMate AI
          </span>

          <span
            className="
              mt-[1px]
              block
              truncate
              text-[9px]
              font-medium
              tracking-[0.01em]
              text-[#81929D]
              sm:text-[10px]
            "
          >
            {isArabic
              ? "ذكاء اصطناعي متكيف لإمكانية الوصول"
              : "Adaptive AI for Accessibility"}
          </span>
        </span>
      </button>

      <nav
        className="
          absolute
          left-1/2
          hidden
          -translate-x-1/2
          items-center
          gap-7
          xl:flex
        "
        aria-label="Main navigation"
      >
        {navItems.map((item) => {
          const active =
            item.path === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.path);

          return (
            <button
              key={item.path}
              type="button"
              onClick={() => go(item.path)}
              aria-current={active ? "page" : undefined}
              className={`
                group
                relative
                flex
                h-[78px]
                items-center
                px-[2px]
                text-[12px]
                font-medium
                transition-colors
                duration-200
                ${
                  active
                    ? "text-[#00D9F5]"
                    : "text-[#B7C3CA] hover:text-[#F4F9FC]"
                }
              `}
            >
              {isArabic ? item.ar : item.en}

              <span
                className={`
                  absolute
                  bottom-[10px]
                  left-1/2
                  h-[2px]
                  w-[30px]
                  -translate-x-1/2
                  rounded-full
                  bg-[#00D9F5]
                  shadow-[0_0_10px_rgba(0,217,245,0.60)]
                  transition-all
                  duration-300
                  ${
                    active
                      ? "scale-x-100 opacity-100"
                      : "scale-x-0 opacity-0 group-hover:scale-x-75 group-hover:opacity-50"
                  }
                `}
              />
            </button>
          );
        })}
      </nav>

      <div
        className="
          hidden
          shrink-0
          items-center
          gap-[9px]
          sm:flex
        "
      >
        <button
          type="button"
          onClick={toggleLanguage}
          className="
            group
            inline-flex
            h-[38px]
            items-center
            gap-[7px]
            rounded-[8px]
            border
            border-[#17323D]
            bg-[#041018]/70
            px-[12px]
            text-[11px]
            font-medium
            text-[#C7D1D7]
            transition-all
            duration-300
            hover:border-[#00D9F5]/50
            hover:bg-[#061821]
            hover:text-white
          "
          aria-label="Change language"
        >
          <Globe2
            className="
              h-[14px]
              w-[14px]
              text-[#C5D1D7]
              transition-colors
              group-hover:text-[#00D9F5]
            "
          />
          <span className="font-semibold">{lang.toUpperCase()}</span>
          <ChevronDown
            className="
              h-[12px]
              w-[12px]
              text-[#72838E]
              transition-colors
              group-hover:text-[#00D9F5]
            "
          />
        </button>

        <button
          type="button"
          onClick={() => navigate("/auth?mode=login")}
          className="
            group
            inline-flex
            h-[38px]
            items-center
            gap-[7px]
            rounded-[8px]
            border
            border-[#17323D]
            bg-[#041018]/70
            px-[13px]
            text-[11px]
            font-medium
            text-[#D7E0E5]
            transition-all
            duration-300
            hover:border-[#00D9F5]/55
            hover:bg-[#061821]
            hover:text-white
          "
        >
          <LogIn
            className="
              h-[14px]
              w-[14px]
              text-[#A7B5BD]
              transition-colors
              group-hover:text-[#00D9F5]
            "
          />
          {isArabic ? "تسجيل الدخول" : "Login"}
        </button>

        <button
          type="button"
          onClick={() => navigate("/auth?mode=register")}
          className="
            inline-flex
            h-[38px]
            items-center
            justify-center
            rounded-[8px]
            border
            border-[#00D9F5]/80
            bg-gradient-to-r
            from-[#0094C7]
            via-[#00ABD7]
            to-[#00C9E6]
            px-[17px]
            text-[11px]
            font-bold
            text-white
            shadow-[0_0_18px_rgba(0,201,230,0.13)]
            transition-all
            duration-300
            hover:-translate-y-[1px]
            hover:brightness-110
            hover:shadow-[0_0_26px_rgba(0,217,245,0.22)]
            active:translate-y-0
          "
        >
          {isArabic ? "ابدأ الآن" : "Get Started"}
        </button>
      </div>

      <button
        type="button"
        onClick={() => setMobileOpen((current) => !current)}
        className="
          flex
          h-[40px]
          w-[40px]
          shrink-0
          items-center
          justify-center
          rounded-[8px]
          border
          border-[#17323D]
          bg-[#041018]
          text-[#DCE5EA]
          transition
          hover:border-[#00D9F5]/55
          hover:text-[#00D9F5]
          xl:hidden
        "
        aria-label="Toggle menu"
        aria-expanded={mobileOpen}
      >
        {mobileOpen ? (
          <X className="h-[18px] w-[18px]" />
        ) : (
          <Menu className="h-[18px] w-[18px]" />
        )}
      </button>

      {mobileOpen && (
        <div
          className="
            absolute
            left-4
            right-4
            top-[84px]
            z-[60]
            overflow-hidden
            rounded-[12px]
            border
            border-[#17323D]
            bg-[#031018]/[0.98]
            p-3
            shadow-[0_25px_70px_rgba(0,0,0,0.60)]
            backdrop-blur-2xl
            xl:hidden
          "
        >
          <div className="grid gap-[5px]">
            {navItems.map((item) => {
              const active =
                item.path === "/"
                  ? location.pathname === "/"
                  : location.pathname.startsWith(item.path);

              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => go(item.path)}
                  className={`
                    relative
                    rounded-[8px]
                    px-4
                    py-[11px]
                    text-start
                    text-[13px]
                    font-medium
                    transition-all
                    ${
                      active
                        ? "bg-[#00212B] text-[#00D9F5]"
                        : "text-[#C3CED4] hover:bg-[#071923] hover:text-white"
                    }
                  `}
                >
                  {isArabic ? item.ar : item.en}

                  {active && (
                    <span
                      className={`
                        absolute
                        top-1/2
                        h-[18px]
                        w-[2px]
                        -translate-y-1/2
                        rounded-full
                        bg-[#00D9F5]
                        shadow-[0_0_8px_rgba(0,217,245,0.60)]
                        ${isArabic ? "right-1" : "left-1"}
                      `}
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div
            className="
              mt-3
              grid
              grid-cols-2
              gap-2
              border-t
              border-[#142C36]
              pt-3
              sm:hidden
            "
          >
            <button
              type="button"
              onClick={toggleLanguage}
              className="
                flex
                min-h-[42px]
                items-center
                justify-center
                gap-2
                rounded-[8px]
                border
                border-[#17323D]
                bg-[#041018]
                px-4
                text-[12px]
                font-semibold
                text-[#D5DEE3]
                transition
                hover:border-[#00D9F5]/50
                hover:text-[#00D9F5]
              "
            >
              <Globe2 className="h-[14px] w-[14px]" />
              {lang.toUpperCase()}
            </button>

            <button
              type="button"
              onClick={() => navigate("/auth?mode=login")}
              className="
                flex
                min-h-[42px]
                items-center
                justify-center
                gap-2
                rounded-[8px]
                border
                border-[#17323D]
                bg-[#041018]
                px-4
                text-[12px]
                font-semibold
                text-[#D5DEE3]
                transition
                hover:border-[#00D9F5]/50
                hover:text-[#00D9F5]
              "
            >
              <LogIn className="h-[14px] w-[14px]" />
              {isArabic ? "دخول" : "Login"}
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              navigate("/auth?mode=register");
            }}
            className="
              mt-2
              flex
              min-h-[43px]
              w-full
              items-center
              justify-center
              rounded-[8px]
              border
              border-[#00D9F5]/75
              bg-gradient-to-r
              from-[#0094C7]
              via-[#00ABD7]
              to-[#00C9E6]
              px-4
              text-[12px]
              font-bold
              text-white
              shadow-[0_0_18px_rgba(0,201,230,0.10)]
              transition-all
              hover:brightness-110
            "
          >
            {isArabic ? "ابدأ الآن" : "Get Started"}
          </button>
        </div>
      )}
    </header>
  );
}
