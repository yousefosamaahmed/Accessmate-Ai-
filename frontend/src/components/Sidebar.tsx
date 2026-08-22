// src/components/Sidebar.tsx

import React, {
  useEffect,
  useState,
} from "react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  HeartHandshake,
  History,
  Home,
  Ear,
  Library,
  LogOut,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShieldCheck,
} from "lucide-react";

import logoImage
  from "../assets/Logo.jpeg";


/* =========================================================
   TYPES
   ========================================================= */

interface SidebarProps {
  onNewChat?: () => void;

  onChatSelect?: (
    chatId: string
  ) => void;

  onLogout?: () => void;

  activeChatId?: string | null;
}


type UiLanguage =
  | "en"
  | "ar";


/* =========================================================
   STORAGE
   ========================================================= */

const SIDEBAR_COLLAPSED_KEY =
  "accessmate_sidebar_collapsed";

const LANGUAGE_KEY =
  "accessmate_language";


/* =========================================================
   HELPERS
   ========================================================= */

function getInitialSidebarCollapsed() {
  try {
    return (
      localStorage.getItem(
        SIDEBAR_COLLAPSED_KEY
      ) ===
      "true"
    );
  } catch {
    return false;
  }
}


function saveSidebarCollapsed(
  value: boolean
) {
  try {
    localStorage.setItem(
      SIDEBAR_COLLAPSED_KEY,
      String(
        value
      )
    );
  } catch {
    // Ignore localStorage failures.
  }
}


function normalizeLanguage(
  value: unknown
):
  | UiLanguage
  | null {
  if (
    value ===
      "ar" ||
    value ===
      "en"
  ) {
    return value;
  }


  if (
    value &&
    typeof value ===
      "object"
  ) {
    const data =
      value as {
        language?: unknown;
        preferredLanguage?: unknown;
        lang?: unknown;
      };


    if (
      data.language ===
        "ar" ||
      data.language ===
        "en"
    ) {
      return data.language;
    }


    if (
      data.preferredLanguage ===
        "ar" ||
      data.preferredLanguage ===
        "en"
    ) {
      return data.preferredLanguage;
    }


    if (
      data.lang ===
        "ar" ||
      data.lang ===
        "en"
    ) {
      return data.lang;
    }
  }


  return null;
}


function getInitialLanguage():
  UiLanguage {
  try {
    const stored =
      localStorage.getItem(
        LANGUAGE_KEY
      );


    if (
      stored ===
      "ar"
    ) {
      return "ar";
    }


    if (
      stored ===
      "en"
    ) {
      return "en";
    }
  } catch {
    // Ignore localStorage failures.
  }


  if (
    typeof document !==
      "undefined" &&
    document.documentElement.lang
      .toLowerCase()
      .startsWith(
        "ar"
      )
  ) {
    return "ar";
  }


  return "en";
}


/* =========================================================
   COMPONENT
   ========================================================= */

export const Sidebar:
  React.FC<SidebarProps> = ({
    onLogout,
  }) => {
    const navigate =
      useNavigate();


    const location =
      useLocation();


    const [
      isCollapsed,
      setIsCollapsed,
    ] =
      useState(
        getInitialSidebarCollapsed
      );


    const [
      language,
      setLanguage,
    ] =
      useState<UiLanguage>(
        getInitialLanguage
      );


    const isArabic =
      language ===
      "ar";


    function txt(
      en: string,
      ar: string
    ) {
      return isArabic
        ? ar
        : en;
    }


    /* =====================================================
       LANGUAGE SYNC
       ===================================================== */

    useEffect(
      () => {
        function syncLanguage(
          explicitLanguage?:
            unknown
        ) {
          const fromEvent =
            normalizeLanguage(
              explicitLanguage
            );


          if (
            fromEvent
          ) {
            setLanguage(
              fromEvent
            );

            return;
          }


          try {
            const stored =
              normalizeLanguage(
                localStorage.getItem(
                  LANGUAGE_KEY
                )
              );


            if (
              stored
            ) {
              setLanguage(
                stored
              );

              return;
            }
          } catch {
            // Ignore storage failures.
          }


          if (
            document.documentElement.lang
              .toLowerCase()
              .startsWith(
                "ar"
              )
          ) {
            setLanguage(
              "ar"
            );

            return;
          }


          setLanguage(
            "en"
          );
        }


        function handleLanguageEvent(
          event: Event
        ) {
          const customEvent =
            event as
              CustomEvent<unknown>;


          syncLanguage(
            customEvent.detail
          );
        }


        function handleStorage(
          event:
            StorageEvent
        ) {
          if (
            event.key ===
            LANGUAGE_KEY
          ) {
            syncLanguage(
              event.newValue
            );
          }
        }


        window.addEventListener(
          "accessmate-public-language-change",
          handleLanguageEvent
        );


        window.addEventListener(
          "accessmate-language-change",
          handleLanguageEvent
        );


        window.addEventListener(
          "accessmate-settings-updated",
          handleLanguageEvent
        );


        window.addEventListener(
          "storage",
          handleStorage
        );


        /*
         * Initial synchronization.
         */
        syncLanguage();


        return () => {
          window.removeEventListener(
            "accessmate-public-language-change",
            handleLanguageEvent
          );


          window.removeEventListener(
            "accessmate-language-change",
            handleLanguageEvent
          );


          window.removeEventListener(
            "accessmate-settings-updated",
            handleLanguageEvent
          );


          window.removeEventListener(
            "storage",
            handleStorage
          );
        };
      },
      []
    );


    /* =====================================================
       COLLAPSE / EXPAND
       ===================================================== */

    function handleCollapse() {
      setIsCollapsed(
        true
      );


      saveSidebarCollapsed(
        true
      );
    }


    function handleExpand() {
      setIsCollapsed(
        false
      );


      saveSidebarCollapsed(
        false
      );
    }


    /* =====================================================
       NAVIGATION
       ===================================================== */

    function handleNavigate(
      path: string
    ) {
      navigate(
        path
      );
    }


    function handleLogout() {
      if (
        onLogout
      ) {
        onLogout();

        return;
      }


      localStorage.removeItem(
        "accessmate_token"
      );


      localStorage.removeItem(
        "accessmate_user"
      );


      navigate(
        "/auth?mode=login",
        {
          replace:
            true,
        }
      );
    }


    /* =====================================================
       ACTIVE ROUTE
       ===================================================== */

    function isActive(
      path: string
    ) {
      if (
        path ===
        "/dashboard"
      ) {
        return (
          location.pathname ===
            "/dashboard" ||
          location.pathname ===
            "/"
        );
      }


      if (
        path ===
        "/chats"
      ) {
        return (
          location.pathname ===
            "/chats" ||
          location.pathname.startsWith(
            "/chat/"
          )
        );
      }


      return location.pathname.startsWith(
        path
      );
    }


    /* =====================================================
       NAVIGATION STYLE
       ===================================================== */

    function navButtonClass(
      active: boolean
    ) {
      return `
        group
        relative
        flex
        h-[44px]
        w-full
        items-center

        ${
          isCollapsed
            ? "justify-center px-0"
            : "justify-start px-3.5"
        }

        gap-3
        overflow-hidden
        rounded-[10px]
        border
        text-[12px]
        font-semibold
        transition-all
        duration-200

        ${
          active
            ? `
              border-[#0E3B50]
              bg-[#082331]
              text-[#E8F3F7]
              shadow-[0_0_24px_rgba(0,184,219,0.06)]
            `
            : `
              border-transparent
              text-[#A7B0B7]
              hover:border-[#17323D]
              hover:bg-[#061722]
              hover:text-[#E8F3F7]
            `
        }
      `;
    }


    /* =====================================================
       UI
       ===================================================== */

    return (
      <aside
        data-voice-region={
          txt(
            "Main navigation sidebar",
            "القائمة الجانبية الرئيسية"
          )
        }
        aria-label={
          txt(
            "Main navigation sidebar",
            "القائمة الجانبية الرئيسية"
          )
        }
        lang={
          language
        }
        dir={
          isArabic
            ? "rtl"
            : "ltr"
        }
        data-language={
          language
        }
        className={`
          workspace-sidebar
          relative
          z-40
          hidden
          h-full
          min-h-0
          shrink-0
          flex-col
          overflow-hidden
          border-r
          border-[#15313D]
          bg-[#020B14]
          text-[#E8F3F7]
          transition-[width,background-color,border-color]
          duration-300
          ease-out
          min-[1101px]:flex

          ${
            isCollapsed
              ? "w-[76px]"
              : "w-[282px]"
          }
        `}
      >

        {/* Ambient accent */}
        <div
          className="
            pointer-events-none
            absolute
            left-[-120px]
            top-[70px]
            h-[300px]
            w-[260px]
            rounded-full
            bg-[#00B8DB]/[0.035]
            blur-[110px]
          "
        />


        {/* =================================================
            BRAND HEADER
            ================================================= */}

        <div
          className={`
            relative
            z-10
            flex
            h-[82px]
            shrink-0
            items-center
            border-b
            border-[#15313D]

            ${
              isCollapsed
                ? "justify-center px-3"
                : "justify-between px-4"
            }
          `}
        >

          <button
            type="button"
            onClick={() =>
              handleNavigate(
                "/dashboard"
              )
            }
            className={`
              flex
              min-w-0
              items-center

              ${
                isCollapsed
                  ? "justify-center"
                  : "gap-3"
              }
            `}
            aria-label={
              txt(
                "AccessMate AI dashboard",
                "لوحة تحكم AccessMate AI"
              )
            }
            data-voice-label={
              txt(
                "AccessMate AI dashboard",
                "لوحة تحكم AccessMate AI"
              )
            }
          >

            <span
              className="
                relative
                flex
                h-[48px]
                w-[48px]
                shrink-0
                items-center
                justify-center
                rounded-full
                border
                border-[#0E3B50]
                bg-[#06131D]
                shadow-[0_0_24px_rgba(0,184,219,0.07)]
              "
            >

              <img
                src={
                  logoImage
                }
                alt=""
                className="
                  h-[40px]
                  w-[40px]
                  rounded-full
                  object-cover
                "
                style={{
                  filter:
                    "grayscale(1) sepia(1) hue-rotate(142deg) saturate(6) brightness(1.08) contrast(1.12)",
                }}
              />


              <span
                className="
                  pointer-events-none
                  absolute
                  inset-[-5px]
                  rounded-full
                  border
                  border-[#15313D]
                "
              />

            </span>


            {!isCollapsed && (
              <span
                className="
                  min-w-0
                  text-start
                "
              >

                <span
                  className="
                    block
                    truncate
                    text-[17px]
                    font-bold
                    tracking-tight
                    text-[#F2F7FA]
                  "
                >
                  AccessMate AI
                </span>


                <span
                  className="
                    mt-0.5
                    block
                    truncate
                    text-[9px]
                    font-medium
                    text-[#7C8992]
                  "
                >
                  {txt(
                    "Adaptive AI for Accessibility",
                    "ذكاء اصطناعي تكيفي لإمكانية الوصول"
                  )}
                </span>

              </span>
            )}

          </button>


          {!isCollapsed && (
            <button
              type="button"
              onClick={
                handleCollapse
              }
              className="
                flex
                h-9
                w-9
                shrink-0
                items-center
                justify-center
                rounded-[9px]
                border
                border-[#15313D]
                bg-[#06131D]
                text-[#82919A]
                transition
                hover:border-[#00B8DB]/50
                hover:bg-[#08202C]
                hover:text-[#50CFF2]
              "
              title={
                txt(
                  "Collapse sidebar",
                  "طي القائمة الجانبية"
                )
              }
              aria-label={
                txt(
                  "Collapse sidebar",
                  "طي القائمة الجانبية"
                )
              }
              data-voice-label={
                txt(
                  "Collapse sidebar",
                  "طي القائمة الجانبية"
                )
              }
            >
              <PanelLeftClose
                className={`
                  h-[17px]
                  w-[17px]

                  ${
                    isArabic
                      ? "scale-x-[-1]"
                      : ""
                  }
                `}
              />
            </button>
          )}

        </div>


        {/* =================================================
            PRIMARY NAVIGATION
            ================================================= */}

        <nav
          className={`
            relative
            z-10
            shrink-0
            pt-3

            ${
              isCollapsed
                ? "space-y-1.5 px-3"
                : "space-y-1.5 px-3.5"
            }
          `}
          aria-label={
            txt(
              "Primary navigation",
              "التنقل الرئيسي"
            )
          }
          data-voice-region={
            txt(
              "Primary navigation",
              "التنقل الرئيسي"
            )
          }
        >

          <SidebarNavButton
            collapsed={
              isCollapsed
            }
            icon={
              Home
            }
            label={
              txt(
                "Home",
                "الرئيسية"
              )
            }
            onClick={() =>
              handleNavigate(
                "/dashboard"
              )
            }
            className={
              navButtonClass(
                isActive(
                  "/dashboard"
                )
              )
            }
          />


          <SidebarNavButton
            collapsed={
              isCollapsed
            }
            icon={
              MessageSquare
            }
            label={
              txt(
                "Chats",
                "المحادثات"
              )
            }
            onClick={() =>
              handleNavigate(
                "/chats"
              )
            }
            className={
              navButtonClass(
                isActive(
                  "/chats"
                )
              )
            }
          />


          <SidebarNavButton
            collapsed={
              isCollapsed
            }
            icon={
              Ear
            }
            label={
              txt(
                "Hearing Assistant",
                "مساعد السمع"
              )
            }
            onClick={() =>
              handleNavigate(
                "/hearing-assistant"
              )
            }
            className={
              navButtonClass(
                isActive(
                  "/hearing-assistant"
                )
              )
            }
          />


          <SidebarNavButton
            collapsed={
              isCollapsed
            }
            icon={
              HeartHandshake
            }
            label={
              txt(
                "Care Center",
                "مركز الرعاية"
              )
            }
            onClick={() =>
              handleNavigate(
                "/caregiver"
              )
            }
            className={
              navButtonClass(
                isActive(
                  "/caregiver"
                )
              )
            }
          />


          <SidebarNavButton
            collapsed={
              isCollapsed
            }
            icon={
              History
            }
            label={
              txt(
                "Alert History",
                "سجل التنبيهات"
              )
            }
            onClick={() =>
              handleNavigate(
                "/alert-history"
              )
            }
            className={
              navButtonClass(
                isActive(
                  "/alert-history"
                )
              )
            }
          />


          <SidebarNavButton
            collapsed={
              isCollapsed
            }
            icon={
              ShieldCheck
            }
            label={
              txt(
                "Website Safety",
                "أمان المواقع"
              )
            }
            onClick={() =>
              handleNavigate(
                "/website-safety"
              )
            }
            className={
              navButtonClass(
                isActive(
                  "/website-safety"
                )
              )
            }
          />


          <SidebarNavButton
            collapsed={
              isCollapsed
            }
            icon={
              Library
            }
            label={
              txt(
                "Library",
                "المكتبة"
              )
            }
            onClick={() =>
              handleNavigate(
                "/library"
              )
            }
            className={
              navButtonClass(
                isActive(
                  "/library"
                )
              )
            }
          />

        </nav>


        {/* FLEX SPACER */}
        <div
          className="
            min-h-0
            flex-1
          "
        />


        {/* =================================================
            BOTTOM CONTROLS
            ================================================= */}

        <div
          className={`
            relative
            z-10
            shrink-0
            border-t
            border-[#15313D]
            pb-4
            pt-4

            ${
              isCollapsed
                ? "px-2.5"
                : "px-4"
            }
          `}
        >

          <div
            className={`
              flex
              items-center
              gap-2

              ${
                isCollapsed
                  ? "flex-col"
                  : "justify-start"
              }
            `}
          >

            {/* SETTINGS */}
            <button
              type="button"
              onClick={() =>
                handleNavigate(
                  "/settings"
                )
              }
              className={`
                group
                flex
                h-[42px]
                shrink-0
                items-center
                justify-center
                gap-2
                rounded-[10px]
                border
                transition-all
                duration-200

                ${
                  isCollapsed
                    ? "w-[42px] px-0"
                    : "px-3.5"
                }

                ${
                  isActive(
                    "/settings"
                  )
                    ? `
                      border-[#00B8DB]/55
                      bg-[#082331]
                      text-[#50CFF2]
                      shadow-[0_0_18px_rgba(0,184,219,0.08)]
                    `
                    : `
                      border-[#15313D]
                      bg-[#06131D]
                      text-[#8D9AA2]
                      hover:border-[#00B8DB]/45
                      hover:bg-[#08202C]
                      hover:text-[#50CFF2]
                    `
                }
              `}
              title={
                txt(
                  "Settings",
                  "الإعدادات"
                )
              }
              aria-label={
                txt(
                  "Settings",
                  "الإعدادات"
                )
              }
              data-voice-label={
                txt(
                  "Settings",
                  "الإعدادات"
                )
              }
            >
              <Settings
                className="
                  h-[18px]
                  w-[18px]
                  shrink-0
                "
              />

              {!isCollapsed && (
                <span
                  className="
                    text-[11px]
                    font-semibold
                    text-[#C7D1D7]
                  "
                >
                  {txt(
                    "Settings",
                    "الإعدادات"
                  )}
                </span>
              )}
            </button>


            {/* LOGOUT */}
            <button
              type="button"
              onClick={
                handleLogout
              }
              className={`
                group
                flex
                h-[42px]
                shrink-0
                items-center
                justify-center
                gap-2
                rounded-[10px]
                border
                border-red-500/20
                bg-red-500/[0.045]
                text-red-400
                transition-all
                duration-200
                hover:border-red-500/40
                hover:bg-red-500/[0.09]
                hover:text-red-300

                ${
                  isCollapsed
                    ? "w-[42px] px-0"
                    : "px-3.5"
                }
              `}
              title={
                txt(
                  "Logout",
                  "تسجيل الخروج"
                )
              }
              aria-label={
                txt(
                  "Logout",
                  "تسجيل الخروج"
                )
              }
              data-voice-label={
                txt(
                  "Logout",
                  "تسجيل الخروج"
                )
              }
            >
              <LogOut
                className="
                  h-[18px]
                  w-[18px]
                  shrink-0
                "
              />

              {!isCollapsed && (
                <span
                  className="
                    text-[11px]
                    font-semibold
                    text-red-400
                  "
                >
                  {txt(
                    "Logout",
                    "تسجيل الخروج"
                  )}
                </span>
              )}
            </button>


            {/* EXPAND WHEN COLLAPSED */}
            {isCollapsed && (
              <button
                type="button"
                onClick={
                  handleExpand
                }
                className="
                  flex
                  h-[42px]
                  w-[42px]
                  items-center
                  justify-center
                  rounded-[10px]
                  border
                  border-[#15313D]
                  bg-[#06131D]
                  text-[#82919A]
                  transition
                  hover:border-[#00B8DB]/45
                  hover:bg-[#08202C]
                  hover:text-[#50CFF2]
                "
                title={
                  txt(
                    "Expand sidebar",
                    "توسيع القائمة الجانبية"
                  )
                }
                aria-label={
                  txt(
                    "Expand sidebar",
                    "توسيع القائمة الجانبية"
                  )
                }
                data-voice-label={
                  txt(
                    "Expand sidebar",
                    "توسيع القائمة الجانبية"
                  )
                }
              >
                <PanelLeftOpen
                  className={`
                    h-[17px]
                    w-[17px]

                    ${
                      isArabic
                        ? "scale-x-[-1]"
                        : ""
                    }
                  `}
                />
              </button>
            )}

          </div>

        </div>

      </aside>
    );
  };


/* =========================================================
   SMALL COMPONENT
   ========================================================= */

function SidebarNavButton({
  icon:
    Icon,

  label,

  collapsed,

  onClick,

  className,
}: {
  collapsed:
    boolean;

  icon:
    React.ComponentType<{
      className?: string;
    }>;

  label:
    string;

  onClick:
    () => void;

  className:
    string;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={
        className
      }
      title={
        collapsed
          ? label
          : undefined
      }
      aria-label={
        label
      }
      data-voice-label={
        label
      }
    >

      <span
        className="
          relative
          flex
          h-[20px]
          w-[20px]
          shrink-0
          items-center
          justify-center
        "
      >
        <Icon
          className="
            h-[18px]
            w-[18px]
          "
        />
      </span>


      {!collapsed && (
        <span
          className="
            truncate
            text-start
          "
        >
          {label}
        </span>
      )}


      {!collapsed && (
        <span
          className="
            ms-auto
            h-1.5
            w-1.5
            rounded-full
            bg-current
            opacity-0
            transition
            group-hover:opacity-25
          "
        />
      )}

    </button>
  );
}