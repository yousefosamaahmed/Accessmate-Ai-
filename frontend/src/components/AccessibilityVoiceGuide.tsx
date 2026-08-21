// src/components/AccessibilityVoiceGuide.tsx

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useLocation,
} from "react-router-dom";


const STORAGE_KEY =
  "accessmate_screen_reader";

const CHANGE_EVENT =
  "accessmate-voice-guidance-changed";


const INTERACTIVE_SELECTOR = [
  "button:not([disabled])",
  "a[href]",
  "input:not([disabled]):not([type='hidden'])",
  "textarea:not([disabled])",
  "select:not([disabled])",
  "[role='button']:not([aria-disabled='true'])",
  "[role='link']",
  "[tabindex]:not([tabindex='-1'])",
].join(",");


function isVisible(
  element: HTMLElement
) {
  const style =
    window.getComputedStyle(
      element
    );


  if (
    style.display ===
      "none" ||
    style.visibility ===
      "hidden"
  ) {
    return false;
  }


  const rect =
    element.getBoundingClientRect();


  return (
    rect.width >
      0 &&
    rect.height >
      0
  );
}


function cleanText(
  value: string
) {
  return value
    .replace(
      /\s+/g,
      " "
    )
    .trim()
    .slice(
      0,
      110
    );
}


function getElementLabel(
  element: HTMLElement
) {
  const explicit =
    element.getAttribute(
      "data-voice-label"
    ) ||
    element.getAttribute(
      "aria-label"
    ) ||
    element.getAttribute(
      "title"
    );


  if (
    explicit
  ) {
    return cleanText(
      explicit
    );
  }


  if (
    element instanceof
      HTMLInputElement ||
    element instanceof
      HTMLTextAreaElement
  ) {
    return cleanText(
      element.placeholder ||
      element.name ||
      "Text field"
    );
  }


  const labelledBy =
    element.getAttribute(
      "aria-labelledby"
    );


  if (
    labelledBy
  ) {
    const label =
      labelledBy
        .split(
          /\s+/
        )
        .map(
          (
            id
          ) =>
            document.getElementById(
              id
            )?.textContent ||
            ""
        )
        .join(
          " "
        );


    if (
      label.trim()
    ) {
      return cleanText(
        label
      );
    }
  }


  return cleanText(
    element.innerText ||
    element.textContent ||
    "Control"
  );
}


function getRoleLabel(
  element: HTMLElement
) {
  if (
    element instanceof
    HTMLTextAreaElement
  ) {
    return "text field";
  }


  if (
    element instanceof
    HTMLInputElement
  ) {
    if (
      element.type ===
      "checkbox"
    ) {
      return element.checked
        ? "checked checkbox"
        : "unchecked checkbox";
    }


    if (
      element.type ===
      "radio"
    ) {
      return element.checked
        ? "selected radio button"
        : "radio button";
    }


    if (
      [
        "text",
        "email",
        "password",
        "search",
        "tel",
        "url",
        "number",
      ].includes(
        element.type
      )
    ) {
      return "text field";
    }
  }


  if (
    element instanceof
    HTMLSelectElement
  ) {
    return "select menu";
  }


  if (
    element instanceof
    HTMLAnchorElement
  ) {
    return "link";
  }


  const role =
    element.getAttribute(
      "role"
    );


  if (
    role
  ) {
    return role.replace(
      /-/g,
      " "
    );
  }


  if (
    element.tagName ===
    "BUTTON"
  ) {
    return "button";
  }


  return "control";
}


function getRegionLabel(
  element: HTMLElement
) {
  const region =
    element.closest<HTMLElement>(
      "[data-voice-region], nav, aside, header, main, section, form"
    );


  if (
    !region
  ) {
    return "page";
  }


  const explicit =
    region.getAttribute(
      "data-voice-region"
    ) ||
    region.getAttribute(
      "aria-label"
    );


  if (
    explicit
  ) {
    return cleanText(
      explicit
    );
  }


  if (
    region.tagName ===
    "NAV"
  ) {
    return "navigation";
  }


  if (
    region.tagName ===
    "ASIDE"
  ) {
    return "side panel";
  }


  if (
    region.tagName ===
    "HEADER"
  ) {
    return "top bar";
  }


  if (
    region.tagName ===
    "FORM"
  ) {
    return "form";
  }


  if (
    region.tagName ===
    "MAIN"
  ) {
    return "main content";
  }


  return "section";
}


function getFocusableElements(
  element: HTMLElement
) {
  const root =
    element.closest<HTMLElement>(
      "[data-voice-region], nav, aside, header, main, section, form"
    ) ||
    document.body;


  return Array.from(
    root.querySelectorAll<HTMLElement>(
      INTERACTIVE_SELECTOR
    )
  ).filter(
    isVisible
  );
}


function getNavigationContext(
  element: HTMLElement
) {
  const items =
    getFocusableElements(
      element
    );


  const index =
    items.indexOf(
      element
    );


  if (
    index < 0 ||
    items.length <=
      1
  ) {
    return "";
  }


  const parts = [
    `Item ${
      index + 1
    } of ${
      items.length
    }.`,
  ];


  const previous =
    items[
      index - 1
    ];


  const next =
    items[
      index + 1
    ];


  if (
    previous
  ) {
    parts.push(
      `Previous: ${
        getElementLabel(
          previous
        )
      }.`
    );
  }


  if (
    next
  ) {
    parts.push(
      `Next: ${
        getElementLabel(
          next
        )
      }.`
    );
  }


  return parts.join(
    " "
  );
}


function buildAnnouncement(
  element: HTMLElement,
  activated: boolean
) {
  const label =
    getElementLabel(
      element
    );

  const role =
    getRoleLabel(
      element
    );

  const region =
    getRegionLabel(
      element
    );

  const context =
    element.getAttribute(
      "data-voice-context"
    ) ||
    getNavigationContext(
      element
    );


  return cleanText(
    [
      activated
        ? `Activated ${label}.`
        : `${label}.`,

      `${role}.`,

      `In ${region}.`,

      context,
    ]
      .filter(
        Boolean
      )
      .join(
        " "
      )
  );
}


function pageNameFromPath(
  pathname: string
) {
  if (
    pathname ===
    "/dashboard"
  ) {
    return "Dashboard";
  }


  if (
    pathname.startsWith(
      "/chat/"
    )
  ) {
    return "Chat";
  }


  if (
    pathname ===
    "/website-safety"
  ) {
    return "Website Safety";
  }


  if (
    pathname ===
    "/library"
  ) {
    return "Library";
  }


  if (
    pathname ===
    "/archive"
  ) {
    return "Archive";
  }


  if (
    pathname ===
    "/account"
  ) {
    return "Account";
  }


  if (
    pathname ===
    "/settings"
  ) {
    return "Settings";
  }


  return "AccessMate";
}


export default function AccessibilityVoiceGuide() {
  const location =
    useLocation();


  const [
    enabled,
    setEnabled,
  ] = useState(
    localStorage.getItem(
      STORAGE_KEY
    ) === "true"
  );


  const enabledRef =
    useRef(
      enabled
    );


  const lastTargetRef =
    useRef<
      HTMLElement | null
    >(null);


  const lastSpokenAtRef =
    useRef(0);


  useEffect(() => {
    enabledRef.current =
      enabled;
  }, [
    enabled,
  ]);


  function speak(
    text: string
  ) {
    if (
      !enabledRef.current ||
      !(
        "speechSynthesis"
        in window
      ) ||
      !text.trim()
    ) {
      return;
    }


    window.speechSynthesis.cancel();


    const utterance =
      new SpeechSynthesisUtterance(
        text
      );


    utterance.lang =
      /[\u0600-\u06FF]/.test(
        text
      )
        ? "ar-EG"
        : "en-US";


    utterance.rate =
      0.92;

    utterance.pitch =
      1;

    utterance.volume =
      1;


    window.speechSynthesis.speak(
      utterance
    );
  }


  useEffect(() => {
    function syncFromStorage() {
      setEnabled(
        localStorage.getItem(
          STORAGE_KEY
        ) === "true"
      );
    }


    function handleChange(
      event: Event
    ) {
      const customEvent =
        event as CustomEvent<{
          enabled?:
            boolean;
        }>;


      if (
        typeof customEvent
          .detail?.enabled ===
        "boolean"
      ) {
        setEnabled(
          customEvent
            .detail
            .enabled
        );

        return;
      }


      syncFromStorage();
    }


    window.addEventListener(
      "storage",
      syncFromStorage
    );


    window.addEventListener(
      CHANGE_EVENT,
      handleChange
    );


    return () => {
      window.removeEventListener(
        "storage",
        syncFromStorage
      );


      window.removeEventListener(
        CHANGE_EVENT,
        handleChange
      );
    };
  }, []);


  useEffect(() => {
    if (
      !enabled
    ) {
      return;
    }


    const timer =
      window.setTimeout(
        () => {
          speak(
            `${
              pageNameFromPath(
                location.pathname
              )
            } page. Voice guidance is on. Use Tab and Shift Tab to move between controls, then Enter or Space to activate the selected control.`
          );
        },
        250
      );


    return () =>
      window.clearTimeout(
        timer
      );
  }, [
    location.pathname,
    enabled,
  ]);


  useEffect(() => {
    function getInteractiveTarget(
      target: EventTarget | null
    ) {
      if (
        !(target instanceof
        Element)
      ) {
        return null;
      }


      return target.closest<HTMLElement>(
        INTERACTIVE_SELECTOR
      );
    }


    function announceFocus(
      event: FocusEvent
    ) {
      if (
        !enabledRef.current
      ) {
        return;
      }


      const element =
        getInteractiveTarget(
          event.target
        );


      if (
        !element ||
        !isVisible(
          element
        )
      ) {
        return;
      }


      lastTargetRef.current =
        element;

      lastSpokenAtRef.current =
        Date.now();


      speak(
        buildAnnouncement(
          element,
          false
        )
      );
    }


    function announceActivation(
      event: MouseEvent
    ) {
      if (
        !enabledRef.current
      ) {
        return;
      }


      const element =
        getInteractiveTarget(
          event.target
        );


      if (
        !element ||
        !isVisible(
          element
        )
      ) {
        return;
      }


      const now =
        Date.now();


      const recentlyFocused =
        lastTargetRef.current ===
          element &&
        now -
          lastSpokenAtRef.current <
          450;


      lastTargetRef.current =
        element;

      lastSpokenAtRef.current =
        now;


      if (
        recentlyFocused
      ) {
        window.speechSynthesis.cancel();
      }


      speak(
        buildAnnouncement(
          element,
          true
        )
      );
    }


    document.addEventListener(
      "focusin",
      announceFocus,
      true
    );


    document.addEventListener(
      "click",
      announceActivation,
      true
    );


    return () => {
      document.removeEventListener(
        "focusin",
        announceFocus,
        true
      );


      document.removeEventListener(
        "click",
        announceActivation,
        true
      );
    };
  }, []);


  return (
    <>
      <div
        className="
          sr-only
        "
        aria-live="polite"
        aria-atomic="true"
      >
        {enabled
          ? "Voice guidance enabled"
          : ""}
      </div>


      <style>
        {`

        :where(
          button,
          a[href],
          input,
          textarea,
          select,
          [role="button"],
          [role="link"],
          [tabindex]:not([tabindex="-1"])
        ):focus-visible {
          outline:
            3px solid
            #55f474 !important;

          outline-offset:
            3px !important;

          box-shadow:
            0 0 0 5px
            rgba(85, 244, 116, 0.10) !important;
        }

        `}
      </style>
    </>
  );
}
