import type { ChatSession } from "../types/chat";
// src/pages/Chats.tsx

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  Archive,
  MessageSquare,
  Pin,
  PinOff,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";

import {
  api,
  unwrapResponse,
} from "../lib/api";


/* =========================================================
   TYPES
   ========================================================= */

type ChatTab =
  | "all"
  | "pinned"
  | "archived";


/* =========================================================
   STORAGE
   ========================================================= */

const PINNED_KEY =
  "accessmate_pinned_conversation_ids";


/* =========================================================
   HELPERS
   ========================================================= */

function getPinnedIds():
  string[] {
  try {
    const raw =
      localStorage.getItem(
        PINNED_KEY
      );


    if (!raw) {
      return [];
    }


    const parsed =
      JSON.parse(
        raw
      );


    if (
      !Array.isArray(
        parsed
      )
    ) {
      return [];
    }


    return parsed.map(
      String
    );

  } catch {
    return [];
  }
}


function savePinnedIds(
  ids:
    string[]
) {
  try {
    localStorage.setItem(
      PINNED_KEY,
      JSON.stringify(
        ids
      )
    );

  } catch {
    // Ignore localStorage failures.
  }
}


function extractConversationArray(
  payload:
    any
): any[] {
  if (
    Array.isArray(
      payload
    )
  ) {
    return payload;
  }


  if (
    Array.isArray(
      payload?.conversations
    )
  ) {
    return payload.conversations;
  }


  if (
    Array.isArray(
      payload?.items
    )
  ) {
    return payload.items;
  }


  if (
    Array.isArray(
      payload?.data
    )
  ) {
    return payload.data;
  }


  return [];
}


function normalizeConversation(
  item:
    any
): ChatSession {
  return {
    id:
      String(
        item.id ??
          item.conversation_id
      ),

    title:
      String(
        item.title ||
          item.name ||
          "New chat"
      ),

    isArchived:
      Boolean(
        item.is_archived ??
          item.archived ??
          false
      ),

    createdAt:
      String(
        item.created_at ||
          item.createdAt ||
          ""
      ),

    updatedAt:
      String(
        item.updated_at ||
          item.updatedAt ||
          item.created_at ||
          item.createdAt ||
          ""
      ),
  };
}


function dispatchConversationUpdate() {
  window.dispatchEvent(
    new Event(
      "accessmate-conversations-updated"
    )
  );
}


function formatDate(
  value:
    string
) {
  if (!value) {
    return "";
  }


  const date =
    new Date(
      value
    );


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }


  return date.toLocaleString(
    undefined,
    {
      dateStyle:
        "medium",

      timeStyle:
        "short",
    }
  );
}


/* =========================================================
   PAGE
   ========================================================= */

export default function Chats() {
  const navigate =
    useNavigate();


  const [
    chats,
    setChats,
  ] =
    useState<
      ChatSession[]
    >([]);


  const [
    pinnedIds,
    setPinnedIds,
  ] =
    useState<
      string[]
    >(
      getPinnedIds()
    );


  const [
    activeTab,
    setActiveTab,
  ] =
    useState<ChatTab>(
      "all"
    );


  const [
    searchTerm,
    setSearchTerm,
  ] =
    useState("");


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    actionChatId,
    setActionChatId,
  ] =
    useState<
      string | null
    >(
      null
    );


  /* =======================================================
     LOAD CONVERSATIONS
     ======================================================= */

  const loadChats =
    useCallback(
      async () => {
        setLoading(
          true
        );


        try {
          const response =
            await api.get<any>(
              "/conversations/me"
            );


          const payload =
            unwrapResponse<any>(
              response
            );


          const rows =
            extractConversationArray(
              payload
            );


          const normalized =
            rows
              .map(
                normalizeConversation
              )
              .filter(
                (
                  chat
                ) =>
                  Boolean(
                    chat.id
                  )
              )
              .sort(
                (
                  first,
                  second
                ) =>
                  new Date(
                    second.updatedAt ||
                      second.createdAt
                  ).getTime() -
                  new Date(
                    first.updatedAt ||
                      first.createdAt
                  ).getTime()
              );


          setChats(
            normalized
          );

        } catch (
          error
        ) {
          console.error(
            "Failed to load conversations:",
            error
          );


          setChats(
            []
          );

        } finally {
          setLoading(
            false
          );
        }
      },
      []
    );


  /* =======================================================
     INITIAL LOAD + LIVE UPDATE
     ======================================================= */

  useEffect(() => {
    void loadChats();


    const handleUpdate =
      () => {
        void loadChats();
      };


    window.addEventListener(
      "accessmate-conversations-updated",
      handleUpdate
    );


    return () => {
      window.removeEventListener(
        "accessmate-conversations-updated",
        handleUpdate
      );
    };

  }, [
    loadChats,
  ]);


  /* =======================================================
     PIN
     ======================================================= */

  function togglePin(
    chatId:
      string
  ) {
    const exists =
      pinnedIds.includes(
        chatId
      );


    const next =
      exists
        ? pinnedIds.filter(
            (
              id
            ) =>
              id !==
              chatId
          )
        : [
            ...pinnedIds,
            chatId,
          ];


    setPinnedIds(
      next
    );


    savePinnedIds(
      next
    );


    dispatchConversationUpdate();
  }


  /* =======================================================
     ARCHIVE / UNARCHIVE
     ======================================================= */

  async function setArchived(
    chatId:
      string,
    archived:
      boolean
  ) {
    if (
      actionChatId
    ) {
      return;
    }


    const previousChats =
      chats;


    setActionChatId(
      chatId
    );


    setChats(
      (
        current
      ) =>
        current.map(
          (
            chat
          ) =>
            chat.id ===
            chatId
              ? {
                  ...chat,
                  isArchived:
                    archived,
                }
              : chat
        )
    );


    try {
      await api.patch(
        `/conversations/${chatId}`,
        {
          is_archived:
            archived,
        }
      );


      dispatchConversationUpdate();

    } catch (
      error
    ) {
      console.error(
        archived
          ? "Failed to archive conversation:"
          : "Failed to unarchive conversation:",
        error
      );


      setChats(
        previousChats
      );


      window.alert(
        archived
          ? "Failed to archive chat."
          : "Failed to unarchive chat."
      );

    } finally {
      setActionChatId(
        null
      );
    }
  }


  /* =======================================================
     DELETE
     ======================================================= */

  async function deleteChat(
    chatId:
      string
  ) {
    if (
      actionChatId
    ) {
      return;
    }


    const confirmed =
      window.confirm(
        "Are you sure you want to permanently delete this chat?"
      );


    if (
      !confirmed
    ) {
      return;
    }


    const previousChats =
      chats;

    const previousPinned =
      pinnedIds;


    setActionChatId(
      chatId
    );


    setChats(
      (
        current
      ) =>
        current.filter(
          (
            chat
          ) =>
            chat.id !==
            chatId
        )
    );


    const nextPinned =
      pinnedIds.filter(
        (
          id
        ) =>
          id !==
          chatId
      );


    setPinnedIds(
      nextPinned
    );


    savePinnedIds(
      nextPinned
    );


    try {
      await api.delete(
        `/conversations/${chatId}`
      );


      dispatchConversationUpdate();

    } catch (
      error
    ) {
      console.error(
        "Failed to delete conversation:",
        error
      );


      setChats(
        previousChats
      );


      setPinnedIds(
        previousPinned
      );


      savePinnedIds(
        previousPinned
      );


      window.alert(
        "Failed to delete chat."
      );

    } finally {
      setActionChatId(
        null
      );
    }
  }


  /* =======================================================
     DERIVED DATA
     ======================================================= */

  const activeChats =
    useMemo(
      () =>
        chats.filter(
          (
            chat
          ) =>
            !chat.isArchived
        ),
      [
        chats,
      ]
    );


  const archivedChats =
    useMemo(
      () =>
        chats.filter(
          (
            chat
          ) =>
            chat.isArchived
        ),
      [
        chats,
      ]
    );


  const pinnedChats =
    useMemo(
      () =>
        activeChats.filter(
          (
            chat
          ) =>
            pinnedIds.includes(
              chat.id
            )
        ),
      [
        activeChats,
        pinnedIds,
      ]
    );


  const visibleChats =
    useMemo(
      () => {
        let base:
          ChatSession[];


        if (
          activeTab ===
          "archived"
        ) {
          base =
            archivedChats;

        } else if (
          activeTab ===
          "pinned"
        ) {
          base =
            pinnedChats;

        } else {
          base =
            activeChats;
        }


        const normalizedSearch =
          searchTerm
            .trim()
            .toLowerCase();


        if (
          !normalizedSearch
        ) {
          return base;
        }


        return base.filter(
          (
            chat
          ) =>
            chat.title
              .toLowerCase()
              .includes(
                normalizedSearch
              )
        );
      },
      [
        activeTab,
        activeChats,
        archivedChats,
        pinnedChats,
        searchTerm,
      ]
    );


  /* =======================================================
     UI
     ======================================================= */

  return (
    <main
      data-voice-region="Chats"
      aria-label="Chats"
      className="
        chats-page
        relative
        h-full
        min-h-0
        overflow-hidden
        bg-[#000912]
        text-white
      "
    >

      <div
        className="
          pointer-events-none
          absolute
          inset-0
          bg-[#000912]/72
        "
      />


      <div
        className="
          pointer-events-none
          absolute
          right-[-10%]
          top-[-18%]
          h-[500px]
          w-[500px]
          rounded-full
          bg-[#00B8DB]/[0.045]
          blur-[160px]
        "
      />


      <section
        className="
          relative
          z-10
          flex
          h-full
          min-h-0
          flex-col
          overflow-hidden
          px-5
          py-4
          lg:px-6
        "
      >

        {/* =================================================
            HEADER
            ================================================= */}

        <header
          className="
            flex
            shrink-0
            flex-col
            gap-4
            border-b
            border-[#15313D]
            pb-4
            xl:flex-row
            xl:items-end
            xl:justify-between
          "
        >

          <div>

            <span
              className="
                inline-flex
                items-center
                gap-2
                rounded-full
                border
                border-[#00B8DB]/[0.22]
                bg-[#00B8DB]/[0.05]
                px-3
                py-1.5
                text-[9px]
                font-bold
                uppercase
                tracking-[0.16em]
                text-[#00B8DB]
              "
            >
              <MessageSquare
                className="
                  h-3.5
                  w-3.5
                "
              />

              Conversation Workspace
            </span>


            <h1
              className="
                mt-2
                text-[32px]
                font-black
                tracking-[-0.035em]
                text-white
              "
            >
              Chats
            </h1>


            <p
              className="
                mt-1
                max-w-2xl
                text-[12px]
                leading-5
                text-[#767C83]
              "
            >
              Search, open, pin, archive, restore, or permanently delete your AccessMate conversations.
            </p>

          </div>


          <div
            className="
              flex
              flex-wrap
              items-center
              gap-2
            "
          >

            <button
              type="button"
              onClick={() =>
                void loadChats()
              }
              disabled={
                loading
              }
              className="
                inline-flex
                min-h-[42px]
                items-center
                justify-center
                gap-2
                rounded-[13px]
                border
                border-[#17323D]
                bg-[#00B8DB]/[0.025]
                px-3.5
                text-[10px]
                font-semibold
                text-[#989FA5]
                transition
                hover:border-[#00B8DB]/[0.32]
                hover:bg-[#00B8DB]/[0.055]
                hover:text-[#50CFF2]
                disabled:opacity-50
              "
            >
              <RefreshCw
                className={`
                  h-3.5
                  w-3.5

                  ${
                    loading
                      ? "animate-spin"
                      : ""
                  }
                `}
              />

              Refresh
            </button>


            <button
              type="button"
              onClick={() =>
                navigate(
                  "/dashboard"
                )
              }
              className="
                inline-flex
                min-h-[42px]
                items-center
                justify-center
                gap-2
                rounded-[13px]
                border
                border-[#2399CD]/[0.55]
                bg-[#006C93]
                px-4
                text-[11px]
                font-black
                text-white
                transition
                hover:bg-[#007FA9]
              "
              data-voice-label="Start a new chat"
            >
              <Plus
                className="
                  h-4
                  w-4
                "
              />

              New Chat
            </button>

          </div>

        </header>


        {/* =================================================
            SUMMARY + SEARCH
            ================================================= */}

        <div
          className="
            mt-4
            grid
            shrink-0
            gap-3
            xl:grid-cols-[minmax(0,1fr)_auto]
          "
        >

          <div
            className="
              relative
            "
          >
            <Search
              className="
                pointer-events-none
                absolute
                left-4
                top-1/2
                h-4
                w-4
                -translate-y-1/2
                text-[#50CFF2]/[0.60]
              "
            />


            <input
              type="search"
              value={
                searchTerm
              }
              onChange={(
                event
              ) =>
                setSearchTerm(
                  event.target.value
                )
              }
              placeholder="Search conversations..."
              className="
                h-[46px]
                w-full
                rounded-[14px]
                border
                border-[#17323D]
                bg-[#060D17]/94
                pl-11
                pr-4
                text-[12px]
                font-medium
                text-white
                outline-none
                backdrop-blur-xl
                transition
                placeholder:text-[#525B64]
                focus:border-[#00B8DB]/[0.35]
                focus:bg-[#060D17]/98
              "
              aria-label="Search conversations"
            />
          </div>


          <div
            className="
              flex
              items-center
              gap-2
            "
          >
            <StatCard
              label="Active"
              value={
                activeChats.length
              }
            />

            <StatCard
              label="Pinned"
              value={
                pinnedChats.length
              }
            />

            <StatCard
              label="Archived"
              value={
                archivedChats.length
              }
            />
          </div>

        </div>


        {/* =================================================
            TABS
            ================================================= */}

        <div
          className="
            mt-3
            flex
            shrink-0
            items-center
            gap-2
            overflow-x-auto
            pb-1
          "
          role="tablist"
          aria-label="Conversation filters"
        >

          <TabButton
            active={
              activeTab ===
              "all"
            }
            label="All Chats"
            count={
              activeChats.length
            }
            onClick={() =>
              setActiveTab(
                "all"
              )
            }
          />


          <TabButton
            active={
              activeTab ===
              "pinned"
            }
            label="Pinned"
            count={
              pinnedChats.length
            }
            onClick={() =>
              setActiveTab(
                "pinned"
              )
            }
          />


          <TabButton
            active={
              activeTab ===
              "archived"
            }
            label="Archived"
            count={
              archivedChats.length
            }
            onClick={() =>
              setActiveTab(
                "archived"
              )
            }
          />

        </div>


        {/* =================================================
            LIST
            ================================================= */}

        <div
          className="
            chats-cyan-scroll
            mt-3
            min-h-0
            flex-1
            overflow-y-auto
            pr-1
          "
        >

          {loading ? (

            <div
              className="
                flex
                min-h-[360px]
                flex-col
                items-center
                justify-center
                rounded-[14px]
                border
                border-[#15313D]
                bg-[#060D17]/88
                text-center
                backdrop-blur-xl
              "
            >
              <RefreshCw
                className="
                  h-6
                  w-6
                  animate-spin
                  text-[#00B8DB]/[0.65]
                "
              />


              <p
                className="
                  mt-3
                  text-[11px]
                  font-medium
                  text-[#767C83]
                "
              >
                Loading conversations...
              </p>
            </div>

          ) : visibleChats.length ===
            0 ? (

            <div
              className="
                flex
                min-h-[360px]
                flex-col
                items-center
                justify-center
                rounded-[20px]
                border
                border-dashed
                border-[#15313D]
                bg-[#00B8DB]/[0.012]
                px-6
                text-center
              "
            >
              <span
                className="
                  flex
                  h-16
                  w-16
                  items-center
                  justify-center
                  rounded-[18px]
                  border
                  border-[#00B8DB]/[0.12]
                  bg-[#00B8DB]/[0.035]
                  text-[#00B8DB]/[0.50]
                "
              >
                <MessageSquare
                  className="
                    h-7
                    w-7
                  "
                />
              </span>


              <h2
                className="
                  mt-4
                  text-[14px]
                  font-semibold
                  text-[#B8C0C6]
                "
              >
                No conversations found
              </h2>


              <p
                className="
                  mt-1
                  max-w-md
                  text-[10px]
                  leading-5
                  text-[#525B64]
                "
              >
                Try another search or filter, or start a new conversation.
              </p>

            </div>

          ) : (

            <div
              className="
                space-y-2
              "
              data-voice-region="Conversation list"
            >
              {visibleChats.map(
                (
                  chat
                ) => {
                  const isPinned =
                    pinnedIds.includes(
                      chat.id
                    );


                  const isProcessing =
                    actionChatId ===
                    chat.id;


                  return (
                    <article
                      key={
                        chat.id
                      }
                      className="
                        group
                        flex
                        flex-col
                        gap-3
                        rounded-[12px]
                        border
                        border-[#15313D]
                        bg-[#09121C]/94
                        p-3.5
                        backdrop-blur-xl
                        transition
                        duration-200
                        hover:border-[#00B8DB]/[0.24]
                        hover:bg-[#00B8DB]/[0.025]
                        lg:flex-row
                        lg:items-center
                        lg:justify-between
                      "
                    >

                      {/* OPEN CHAT */}

                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/chat/${chat.id}`
                          )
                        }
                        className="
                          flex
                          min-w-0
                          flex-1
                          items-center
                          gap-3
                          text-left
                        "
                        aria-label={`Open conversation ${chat.title}`}
                        data-voice-label={`Open conversation ${chat.title}`}
                      >

                        <span
                          className={`
                            flex
                            h-11
                            w-11
                            shrink-0
                            items-center
                            justify-center
                            rounded-[12px]
                            border

                            ${
                              chat.isArchived
                                ? "border-slate-500/15 bg-slate-500/[0.04] text-[#767C83]"
                                : isPinned
                                ? "border-[#00B8DB]/[0.25] bg-[#00B8DB]/[0.07] text-[#00B8DB]"
                                : "border-[#00B8DB]/[0.15] bg-[#00B8DB]/[0.04] text-[#50CFF2]"
                            }
                          `}
                        >
                          {chat.isArchived ? (
                            <Archive
                              className="
                                h-4
                                w-4
                              "
                            />
                          ) : isPinned ? (
                            <Pin
                              className="
                                h-4
                                w-4
                              "
                            />
                          ) : (
                            <MessageSquare
                              className="
                                h-4
                                w-4
                              "
                            />
                          )}
                        </span>


                        <span
                          className="
                            min-w-0
                          "
                        >
                          <span
                            className="
                              flex
                              min-w-0
                              items-center
                              gap-2
                            "
                          >
                            <span
                              className="
                                block
                                truncate
                                text-[13px]
                                font-semibold
                                text-white
                              "
                            >
                              {chat.title}
                            </span>


                            {isPinned &&
                              !chat.isArchived && (
                              <span
                                className="
                                  rounded-full
                                  border
                                  border-[#00B8DB]/[0.20]
                                  bg-[#00B8DB]/[0.05]
                                  px-2
                                  py-0.5
                                  text-[8px]
                                  font-bold
                                  uppercase
                                  text-[#50CFF2]
                                "
                              >
                                Pinned
                              </span>
                            )}


                            {chat.isArchived && (
                              <span
                                className="
                                  rounded-full
                                  border
                                  border-white/[0.08]
                                  bg-white/[0.025]
                                  px-2
                                  py-0.5
                                  text-[8px]
                                  font-bold
                                  uppercase
                                  text-[#767C83]
                                "
                              >
                                Archived
                              </span>
                            )}

                          </span>


                          <span
                            className="
                              mt-1
                              block
                              text-[9px]
                              text-[#525B64]
                            "
                          >
                            Updated {
                              formatDate(
                                chat.updatedAt
                              )
                            }
                          </span>
                        </span>

                      </button>


                      {/* ACTIONS */}

                      <div
                        className="
                          flex
                          shrink-0
                          flex-wrap
                          items-center
                          gap-2
                        "
                      >

                        {!chat.isArchived && (
                          <ActionButton
                            icon={
                              isPinned
                                ? PinOff
                                : Pin
                            }
                            label={
                              isPinned
                                ? "Unpin"
                                : "Pin"
                            }
                            disabled={
                              isProcessing
                            }
                            onClick={() =>
                              togglePin(
                                chat.id
                              )
                            }
                          />
                        )}


                        {chat.isArchived ? (
                          <ActionButton
                            icon={
                              RotateCcw
                            }
                            label="Unarchive"
                            disabled={
                              isProcessing
                            }
                            accent
                            spinning={
                              isProcessing
                            }
                            onClick={() =>
                              void setArchived(
                                chat.id,
                                false
                              )
                            }
                          />
                        ) : (
                          <ActionButton
                            icon={
                              Archive
                            }
                            label="Archive"
                            disabled={
                              isProcessing
                            }
                            onClick={() =>
                              void setArchived(
                                chat.id,
                                true
                              )
                            }
                          />
                        )}


                        <ActionButton
                          icon={
                            Trash2
                          }
                          label="Delete"
                          disabled={
                            isProcessing
                          }
                          danger
                          onClick={() =>
                            void deleteChat(
                              chat.id
                            )
                          }
                        />

                      </div>

                    </article>
                  );
                }
              )}
            </div>

          )}

        </div>

      </section>


      <style>
        {`

        .chats-cyan-scroll {
          scrollbar-width:
            thin;

          scrollbar-color:
            rgba(
              0,
              184,
              219,
              0.22
            )
            transparent;
        }


        .chats-cyan-scroll::-webkit-scrollbar {
          width:
            6px;
        }


        .chats-cyan-scroll::-webkit-scrollbar-track {
          background:
            transparent;
        }


        .chats-cyan-scroll::-webkit-scrollbar-thumb {
          background:
            rgba(
              0,
              184,
              219,
              0.20
            );

          border-radius:
            999px;
        }


        .chats-cyan-scroll::-webkit-scrollbar-thumb:hover {
          background:
            rgba(
              0,
              184,
              219,
              0.32
            );
        }

        `}
      </style>

    </main>
  );
}


/* =========================================================
   SMALL COMPONENTS
   ========================================================= */

function StatCard({
  label,
  value,
}: {
  label:
    string;

  value:
    number;
}) {
  return (
    <div
      className="
        min-w-[82px]
        rounded-[13px]
        border
        border-[#15313D]
        bg-[#09121C]/92
        px-3
        py-2
        text-center
        backdrop-blur-xl
      "
    >
      <p
        className="
          text-[8px]
          font-bold
          uppercase
          tracking-[0.10em]
          text-[#525B64]
        "
      >
        {label}
      </p>


      <p
        className="
          mt-0.5
          text-[17px]
          font-black
          text-white
        "
      >
        {value}
      </p>
    </div>
  );
}


function TabButton({
  active,
  label,
  count,
  onClick,
}: {
  active:
    boolean;

  label:
    string;

  count:
    number;

  onClick:
    () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={
        active
      }
      onClick={
        onClick
      }
      className={`
        inline-flex
        min-h-[38px]
        items-center
        gap-2
        whitespace-nowrap
        rounded-[11px]
        border
        px-3
        text-[10px]
        font-bold
        transition

        ${
          active
            ? `
              border-[#00B8DB]/[0.35]
              bg-[#00B8DB]/[0.09]
              text-[#00B8DB]
            `
            : `
              border-[#15313D]
              bg-[#09121C]/78
              text-[#767C83]
              hover:border-[#00B8DB]/[0.22]
              hover:text-[#B8C0C6]
            `
        }
      `}
    >
      {label}


      <span
        className={`
          rounded-full
          px-1.5
          py-0.5
          text-[8px]

          ${
            active
              ? "bg-[#00B8DB]/[0.12] text-[#50CFF2]"
              : "bg-white/[0.035] text-[#525B64]"
          }
        `}
      >
        {count}
      </span>

    </button>
  );
}


function ActionButton({
  icon:
    Icon,
  label,
  disabled,
  accent =
    false,
  danger =
    false,
  spinning =
    false,
  onClick,
}: {
  icon:
    React.ComponentType<{
      className?:
        string;
    }>;

  label:
    string;

  disabled:
    boolean;

  accent?:
    boolean;

  danger?:
    boolean;

  spinning?:
    boolean;

  onClick:
    () => void;
}) {
  return (
    <button
      type="button"
      disabled={
        disabled
      }
      onClick={
        onClick
      }
      aria-label={
        label
      }
      data-voice-label={
        label
      }
      className={`
        inline-flex
        min-h-[36px]
        items-center
        justify-center
        gap-1.5
        rounded-[10px]
        border
        px-3
        text-[9px]
        font-semibold
        transition
        disabled:cursor-not-allowed
        disabled:opacity-45

        ${
          danger
            ? `
              border-red-400/14
              bg-red-500/[0.035]
              text-red-300/75
              hover:border-red-400/30
              hover:bg-red-500/[0.08]
              hover:text-red-300
            `
            : accent
            ? `
              border-[#00B8DB]/[0.20]
              bg-[#00B8DB]/[0.055]
              text-[#50CFF2]
              hover:border-[#00B8DB]/[0.40]
              hover:bg-[#00B8DB]/[0.10]
            `
            : `
              border-[#15313D]
              bg-black/20
              text-[#989FA5]
              hover:border-[#00B8DB]/[0.28]
              hover:text-[#50CFF2]
            `
        }
      `}
    >
      <Icon
        className={`
          h-3.5
          w-3.5

          ${
            spinning
              ? "animate-spin"
              : ""
          }
        `}
      />

      {label}
    </button>
  );
}


