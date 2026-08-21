// src/components/AppLayout.tsx

import React from "react";

import {
  Outlet,
  useNavigate,
} from "react-router-dom";

import {
  Sidebar,
} from "./Sidebar";

import AccessibilityVoiceGuide
  from "./AccessibilityVoiceGuide";

import {
  useAuth,
} from "../hooks/useAuth";


const AppLayout:
  React.FC = () => {
    const navigate =
      useNavigate();


    const {
      logout,
    } =
      useAuth();


    /* =====================================================
       LOGOUT
       ===================================================== */

    const handleLogout =
      async () => {
        await logout();


        navigate(
          "/auth?mode=login",
          {
            replace:
              true,
          }
        );
      };


    /* =====================================================
       UI
       ===================================================== */

    return (
      <div
        className="
          relative
          h-[100dvh]
          max-h-[100dvh]
          min-h-0
          w-full
          overflow-hidden
          bg-[#000912]
          text-[#D1D2D6]
          transition-colors
          duration-200
        "
      >
        {/* ================================================
            ACCESSMATE WORKSPACE BACKGROUND
            Exact dashboard reference palette
            ================================================ */}

        <div
          className="
            pointer-events-none
            absolute
            inset-0
            z-0
            bg-[#000912]
          "
        />

        <div
          className="
            pointer-events-none
            absolute
            right-[-180px]
            top-[-120px]
            z-0
            h-[520px]
            w-[520px]
            rounded-full
            bg-[#00B8DB]/[0.035]
            blur-[180px]
          "
        />


        {/* ================================================
            GLOBAL ACCESSIBILITY VOICE GUIDE

            Remains mounted while navigating between
            protected AccessMate pages.
            ================================================ */}

        <AccessibilityVoiceGuide />


        {/* ================================================
            APPLICATION LAYOUT
            ================================================ */}

        <div
          className="
            relative
            z-10
            flex
            h-full
            min-h-0
            w-full
            overflow-hidden
            bg-[#000912]
          "
        >

          {/* ==============================================
              SIDEBAR
              ============================================== */}

          <Sidebar
            onLogout={
              handleLogout
            }
            onNewChat={() =>
              navigate(
                "/dashboard"
              )
            }
          />


          {/* ==============================================
              MAIN CONTENT
              ============================================== */}

          <main
            data-voice-region="Application main content"
            className="
              h-full
              min-h-0
              min-w-0
              flex-1
              overflow-hidden
              border-l
              border-[#15313D]/80
              bg-[#000912]
              text-[#D1D2D6]
              transition-colors
              duration-200
            "
          >

            <div
              className="
                h-full
                min-h-0
                min-w-0
                overflow-hidden
                bg-[#000912]
                text-[#D1D2D6]
                transition-colors
                duration-200
              "
            >

              <Outlet />

            </div>

          </main>

        </div>

      </div>
    );
  };


export default AppLayout;
