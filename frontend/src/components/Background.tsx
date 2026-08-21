// src/components/Background.tsx

import React from "react";
import { useLocation } from "react-router-dom";

import backgroundImage from "../assets/Wellpaper Image.jpg";
import "../styles/workspace-dim.css";

interface BackgroundProps {
  children: React.ReactNode;
}

export const Background: React.FC<BackgroundProps> = ({
  children,
}) => {
  const location = useLocation();

  const pathname = location.pathname;

  /*
   * Pages where we want the wallpaper
   * darker / calmer like the Dashboard.
   */
  const shouldDimBackground =
    pathname.startsWith("/chat/") ||
    pathname === "/library" ||
    pathname === "/archive";

  return (
    <div
      className={`accessmate-workspace-background ${
        shouldDimBackground
          ? "accessmate-workspace-dimmed"
          : ""
      }`}
    >
      {/* Background image only */}
      <div
        className="accessmate-workspace-wallpaper"
        style={{
          backgroundImage: `url(${backgroundImage})`,
        }}
      />

      {/* Dark overlay only on Chat / Library / Archive */}
      {shouldDimBackground && (
        <div className="accessmate-workspace-dim-overlay" />
      )}

      {/* Application content */}
      <div className="accessmate-workspace-content">
        {children}
      </div>
    </div>
  );
};