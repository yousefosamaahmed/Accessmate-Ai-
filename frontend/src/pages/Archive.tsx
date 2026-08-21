// src/pages/Archive.tsx

import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  Archive as ArchiveIcon,
  FolderOpen,
  MessageSquare,
  RotateCcw,
  Trash2,
} from "lucide-react";

import {
  api,
  unwrapResponse,
} from "../lib/api";


/* =========================================================
   TYPES
   ========================================================= */

interface ArchivedChat {
  id: string;
  title: string;

  created_at: string;
  updated_at: string;

  is_archived: boolean;
}


/* =========================================================
   HELPERS
   ========================================================= */

function getBackendConversationArray(
  payload: any
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
  chat: any
): ArchivedChat {
  return {
    id:
      String(
        chat.id ??
          chat.conversation_id
      ),

    title:
      String(
        chat.title ||
          chat.name ||
          "Untitled"
      ),

    created_at:
      String(
        chat.created_at ||
          chat.createdAt ||
          ""
      ),

    updated_at:
      String(
        chat.updated_at ||
          chat.updatedAt ||
          chat.created_at ||
          chat.createdAt ||
          ""
      ),

    is_archived:
      Boolean(
        chat.is_archived ??
          false
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


/* =========================================================
   COMPONENT
   ========================================================= */

const Archive:
  React.FC = () => {
    const navigate =
      useNavigate();


    const [
      chats,
      setChats,
    ] =
      useState<
        ArchivedChat[]
      >([]);


    const [
      loading,
      setLoading,
    ] =
      useState(
        true
      );


    const [
      actionChatId,
      setActionChatId,
    ] =
      useState<
        string | null
      >(null);


    /* =====================================================
       LOAD ARCHIVED CONVERSATIONS
       ===================================================== */

    const loadArchivedChats =
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


            const backendRows =
              getBackendConversationArray(
                payload
              );


            const archivedChats =
              backendRows
                .map(
                  normalizeConversation
                )
                .filter(
                  (
                    chat
                  ) =>
                    chat.is_archived
                )
                .sort(
                  (
                    first,
                    second
                  ) =>
                    new Date(
                      second.updated_at ||
                        second.created_at
                    ).getTime() -
                    new Date(
                      first.updated_at ||
                        first.created_at
                    ).getTime()
                );


            setChats(
              archivedChats
            );
          } catch (
            error
          ) {
            console.error(
              "Failed to load archived conversations:",
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


    /* =====================================================
       INITIAL LOAD + LIVE UPDATE
       ===================================================== */

    useEffect(() => {
      void loadArchivedChats();


      const handleUpdate =
        () => {
          void loadArchivedChats();
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
      loadArchivedChats,
    ]);


    /* =====================================================
       OPEN CHAT
       ===================================================== */

    function openChat(
      chatId: string
    ) {
      navigate(
        `/chat/${chatId}`
      );
    }


    /* =====================================================
       UNARCHIVE
       ===================================================== */

    async function handleUnarchive(
      chatId: string
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
          current.filter(
            (
              chat
            ) =>
              chat.id !==
              chatId
          )
      );


      try {
        await api.patch(
          `/conversations/${chatId}`,
          {
            is_archived:
              false,
          }
        );


        dispatchConversationUpdate();
      } catch (
        error
      ) {
        console.error(
          "Failed to unarchive conversation:",
          error
        );


        setChats(
          previousChats
        );


        window.alert(
          "Failed to unarchive chat."
        );
      } finally {
        setActionChatId(
          null
        );
      }
    }


    /* =====================================================
       DELETE
       ===================================================== */

    async function handleDelete(
      chatId: string
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


        window.alert(
          "Failed to delete chat."
        );
      } finally {
        setActionChatId(
          null
        );
      }
    }


    /* =====================================================
       DATE
       ===================================================== */

    function formatDate(
      value: string
    ) {
      if (
        !value
      ) {
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


      return date.toLocaleString();
    }


    /* =====================================================
       UI
       ===================================================== */

    return (
      <main
        data-voice-region="Archive"
        aria-label="Archive"
        className="
          archive-page
          relative
          h-full
          min-h-0
          overflow-hidden
          bg-black/30
          text-white
        "
      >
        <div
          className="
            pointer-events-none
            absolute
            inset-0
            bg-black/50
          "
        />


        <div
          className="
            pointer-events-none
            absolute
            right-[-8%]
            top-[-16%]
            h-[420px]
            w-[420px]
            rounded-full
            bg-emerald-400/[0.045]
            blur-[150px]
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

          {/* ===============================================
              HEADER
              =============================================== */}

          <header
            data-voice-region="Archive header"
            className="
              flex
              shrink-0
              flex-col
              gap-4
              border-b
              border-emerald-400/[0.08]
              pb-4
              sm:flex-row
              sm:items-end
              sm:justify-between
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
                  border-emerald-400/22
                  bg-emerald-400/[0.05]
                  px-3
                  py-1.5
                  text-[9px]
                  font-bold
                  uppercase
                  tracking-[0.16em]
                  text-[#55f474]
                "
              >
                <ArchiveIcon
                  className="
                    h-3.5
                    w-3.5
                  "
                />

                Conversation Archive
              </span>


              <h1
                className="
                  mt-2
                  text-[30px]
                  font-black
                  tracking-[-0.035em]
                  text-white
                "
              >
                Archive
              </h1>


              <p
                className="
                  mt-1
                  text-[11px]
                  leading-5
                  text-slate-600
                "
              >
                Archived conversations stay saved here until you restore or permanently delete them.
              </p>
            </div>


            <div
              className="
                flex
                items-center
                gap-2
              "
            >
              <div
                className="
                  rounded-[13px]
                  border
                  border-emerald-400/12
                  bg-[#06100c]/76
                  px-3.5
                  py-2.5
                  backdrop-blur-xl
                "
              >
                <p
                  className="
                    text-[8px]
                    font-semibold
                    uppercase
                    tracking-[0.12em]
                    text-slate-700
                  "
                >
                  Archived
                </p>

                <p
                  className="
                    mt-0.5
                    text-[18px]
                    font-black
                    text-white
                  "
                >
                  {
                    chats.length
                  }
                </p>
              </div>


              <button
                type="button"
                onClick={() =>
                  void loadArchivedChats()
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
                  border-emerald-400/16
                  bg-emerald-400/[0.025]
                  px-3.5
                  text-[10px]
                  font-semibold
                  text-slate-500
                  transition
                  hover:border-emerald-400/32
                  hover:bg-emerald-400/[0.055]
                  hover:text-emerald-300
                  disabled:opacity-50
                "
                aria-label="Refresh archived conversations"
                data-voice-label="Refresh archived conversations"
              >
                <RotateCcw
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
            </div>
          </header>


          {/* ===============================================
              CONTENT
              =============================================== */}

          <div
            className="
              archive-green-scroll
              min-h-0
              flex-1
              overflow-y-auto
              pt-4
            "
          >
            <div
              className="
                mx-auto
                w-full
                max-w-[1180px]
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
                    rounded-[20px]
                    border
                    border-emerald-400/[0.08]
                    bg-[#06100c]/48
                    text-center
                    backdrop-blur-xl
                  "
                  aria-live="polite"
                >
                  <RotateCcw
                    className="
                      h-6
                      w-6
                      animate-spin
                      text-emerald-400/65
                    "
                  />

                  <p
                    className="
                      mt-3
                      text-[11px]
                      font-medium
                      text-slate-600
                    "
                  >
                    Loading archived conversations...
                  </p>
                </div>
              ) : chats.length ===
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
                    border-emerald-400/[0.10]
                    bg-emerald-400/[0.012]
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
                      border-emerald-400/12
                      bg-emerald-400/[0.035]
                      text-emerald-400/45
                    "
                  >
                    <FolderOpen
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
                      text-slate-300
                    "
                  >
                    No archived chats
                  </h2>


                  <p
                    className="
                      mt-1
                      max-w-md
                      text-[10px]
                      leading-5
                      text-slate-700
                    "
                  >
                    Conversations you archive from the sidebar will appear here automatically.
                  </p>
                </div>
              ) : (
                <div
                  className="
                    space-y-2
                  "
                  data-voice-region="Archived conversations"
                >
                  {chats.map(
                    (
                      chat
                    ) => {
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
                            rounded-[16px]
                            border
                            border-emerald-400/[0.08]
                            bg-[#06100c]/64
                            p-3.5
                            backdrop-blur-xl
                            transition
                            duration-200
                            hover:border-emerald-400/22
                            hover:bg-emerald-400/[0.025]
                            sm:flex-row
                            sm:items-center
                            sm:justify-between
                          "
                        >

                          {/* OPEN */}

                          <button
                            type="button"
                            onClick={() =>
                              openChat(
                                chat.id
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
                            aria-label={`Open archived conversation ${chat.title}`}
                            data-voice-label={`Open archived conversation ${chat.title}`}
                          >
                            <span
                              className="
                                flex
                                h-10
                                w-10
                                shrink-0
                                items-center
                                justify-center
                                rounded-[12px]
                                border
                                border-emerald-400/15
                                bg-emerald-400/[0.04]
                                text-emerald-300
                              "
                            >
                              <MessageSquare
                                className="
                                  h-4
                                  w-4
                                "
                              />
                            </span>


                            <span
                              className="
                                min-w-0
                              "
                            >
                              <span
                                className="
                                  block
                                  truncate
                                  text-[12px]
                                  font-semibold
                                  text-white
                                "
                              >
                                {
                                  chat.title
                                }
                              </span>


                              <span
                                className="
                                  mt-1
                                  block
                                  text-[9px]
                                  text-slate-700
                                "
                              >
                                {formatDate(
                                  chat.updated_at
                                )}
                              </span>
                            </span>
                          </button>


                          {/* ACTIONS */}

                          <div
                            className="
                              flex
                              shrink-0
                              items-center
                              gap-2
                            "
                          >
                            <button
                              type="button"
                              disabled={
                                isProcessing
                              }
                              onClick={() =>
                                void handleUnarchive(
                                  chat.id
                                )
                              }
                              className="
                                inline-flex
                                min-h-[36px]
                                items-center
                                justify-center
                                gap-1.5
                                rounded-[10px]
                                border
                                border-emerald-400/18
                                bg-emerald-400/[0.045]
                                px-3
                                text-[9px]
                                font-semibold
                                text-emerald-300
                                transition
                                hover:border-emerald-400/38
                                hover:bg-emerald-400/[0.09]
                                disabled:cursor-not-allowed
                                disabled:opacity-50
                              "
                              aria-label={`Unarchive ${chat.title}`}
                              data-voice-label={`Unarchive ${chat.title}`}
                            >
                              <RotateCcw
                                className={`
                                  h-3.5
                                  w-3.5
                                  ${
                                    isProcessing
                                      ? "animate-spin"
                                      : ""
                                  }
                                `}
                              />

                              Unarchive
                            </button>


                            <button
                              type="button"
                              disabled={
                                isProcessing
                              }
                              onClick={() =>
                                void handleDelete(
                                  chat.id
                                )
                              }
                              className="
                                inline-flex
                                min-h-[36px]
                                items-center
                                justify-center
                                gap-1.5
                                rounded-[10px]
                                border
                                border-red-400/12
                                bg-red-500/[0.035]
                                px-3
                                text-[9px]
                                font-semibold
                                text-red-300/70
                                transition
                                hover:border-red-400/30
                                hover:bg-red-500/[0.08]
                                hover:text-red-300
                                disabled:cursor-not-allowed
                                disabled:opacity-50
                              "
                              aria-label={`Delete ${chat.title} permanently`}
                              data-voice-label={`Delete ${chat.title} permanently`}
                            >
                              <Trash2
                                className="
                                  h-3.5
                                  w-3.5
                                "
                              />

                              Delete
                            </button>
                          </div>
                        </article>
                      );
                    }
                  )}
                </div>
              )}
            </div>
          </div>
        </section>


        <style>
          {`

          .archive-green-scroll {
            scrollbar-width:
              thin;

            scrollbar-color:
              rgba(
                74,
                222,
                128,
                0.20
              )
              transparent;
          }


          .archive-green-scroll::-webkit-scrollbar {
            width:
              5px;
          }


          .archive-green-scroll::-webkit-scrollbar-track {
            background:
              transparent;
          }


          .archive-green-scroll::-webkit-scrollbar-thumb {
            background:
              rgba(
                74,
                222,
                128,
                0.18
              );

            border-radius:
              999px;
          }

          `}
        </style>
      </main>
    );
  };


export default Archive;
