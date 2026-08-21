// src/components/Sidebar.tsx

import React, {
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


/* =========================================================
   STORAGE
   ========================================================= */

const SIDEBAR_COLLAPSED_KEY =
  "accessmate_sidebar_collapsed";


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
        data-voice-region="Main navigation sidebar"
        aria-label="Main navigation sidebar"
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
            aria-label="AccessMate AI dashboard"
            data-voice-label="AccessMate AI dashboard"
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
                  text-left
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
                  Adaptive AI for Accessibility
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
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
              data-voice-label="Collapse sidebar"
            >
              <PanelLeftClose
                className="
                  h-[17px]
                  w-[17px]
                "
              />
            </button>
          )}

        </div>


        {/* =================================================
            PRIMARY NAVIGATION
            Legacy gesture feature removed; Hearing Assistant is active
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
          aria-label="Primary navigation"
          data-voice-region="Primary navigation"
        >

          <SidebarNavButton
            collapsed={
              isCollapsed
            }
            icon={
              Home
            }
            label="Home"
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
            label="Chats"
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
            label="Hearing Assistant"
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
            label="Care Center"
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
            label="Alert History"
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
            label="Website Safety"
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
            label="Library"
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

            Light/Dark mode removed.
            Settings + Logout are icon-only and side-by-side.
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

            {/* SETTINGS ICON */}
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
              title="Settings"
              aria-label="Settings"
              data-voice-label="Settings"
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
                  Settings
                </span>
              )}
            </button>


            {/* LOGOUT ICON */}
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
              title="Logout"
              aria-label="Logout"
              data-voice-label="Logout"
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
                  Logout
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
                title="Expand sidebar"
                aria-label="Expand sidebar"
                data-voice-label="Expand sidebar"
              >
                <PanelLeftOpen
                  className="
                    h-[17px]
                    w-[17px]
                  "
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
          "
        >
          {label}
        </span>
      )}


      {!collapsed && (
        <span
          className="
            ml-auto
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
