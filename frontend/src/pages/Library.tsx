// src/pages/Library.tsx

import {
  type ComponentType,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  motion,
} from "framer-motion";

import {
  Download,
  File,
  FileText,
  Image as ImageIcon,
  Music2,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";

import {
  api,
  getApiError,
  unwrapResponse,
} from "../lib/api";

import {
  getToken,
} from "../lib/storage";


/* =========================================================
   TYPES
   ========================================================= */

type LibraryFileType =
  | "pdf"
  | "image"
  | "doc"
  | "audio"
  | "csv"
  | "text"
  | "other";


type FileItem = {
  id: string;

  name: string;

  type: LibraryFileType;

  mimeType?: string;

  sizeBytes?: number;

  size: string;

  date: string;

  rawDate?: string;

  url?: string;
};


/* =========================================================
   HELPERS
   ========================================================= */

function getBackendFileArray(
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
      payload?.files
    )
  ) {
    return payload.files;
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

  if (
    Array.isArray(
      payload?.results
    )
  ) {
    return payload.results;
  }

  return [];
}


/* =========================================================
   DETECT FILE TYPE
   ========================================================= */

function detectFileType(
  name: string,
  mimeType?: string
): LibraryFileType {
  const lowerName =
    String(
      name ||
      ""
    ).toLowerCase();

  const lowerMime =
    String(
      mimeType ||
      ""
    ).toLowerCase();


  if (
    lowerMime.startsWith(
      "image/"
    ) ||
    /\.(png|jpg|jpeg|webp|gif|bmp|svg)$/i.test(
      lowerName
    )
  ) {
    return "image";
  }


  if (
    lowerMime ===
      "application/pdf" ||
    lowerName.endsWith(
      ".pdf"
    )
  ) {
    return "pdf";
  }


  if (
    lowerMime.includes(
      "word"
    ) ||
    lowerMime.includes(
      "document"
    ) ||
    /\.(doc|docx)$/i.test(
      lowerName
    )
  ) {
    return "doc";
  }


  if (
    lowerMime.startsWith(
      "audio/"
    ) ||
    /\.(mp3|wav|m4a|webm|ogg|aac)$/i.test(
      lowerName
    )
  ) {
    return "audio";
  }


  if (
    lowerMime.includes(
      "csv"
    ) ||
    lowerName.endsWith(
      ".csv"
    )
  ) {
    return "csv";
  }


  if (
    lowerMime.startsWith(
      "text/"
    ) ||
    /\.(txt|md)$/i.test(
      lowerName
    )
  ) {
    return "text";
  }


  return "other";
}


/* =========================================================
   FORMAT FILE SIZE
   ========================================================= */

function formatFileSize(
  value: unknown
) {
  const bytes =
    Number(
      value
    );


  if (
    !Number.isFinite(
      bytes
    ) ||
    bytes <=
      0
  ) {
    return "";
  }


  if (
    bytes <
    1024
  ) {
    return `${bytes} B`;
  }


  if (
    bytes <
    1024 *
      1024
  ) {
    return `${(
      bytes /
      1024
    ).toFixed(1)} KB`;
  }


  if (
    bytes <
    1024 *
      1024 *
      1024
  ) {
    return `${(
      bytes /
      (
        1024 *
        1024
      )
    ).toFixed(1)} MB`;
  }


  return `${(
    bytes /
    (
      1024 *
      1024 *
      1024
    )
  ).toFixed(1)} GB`;
}


/* =========================================================
   FORMAT DATE
   ========================================================= */

function formatDate(
  value?: string
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


/* =========================================================
   NORMALIZE BACKEND FILE
   ========================================================= */

function normalizeBackendFile(
  file: any
): FileItem {
  const id =
    String(
      file?.id ??
        file?.file_id ??
        ""
    );


  const name =
    String(
      file?.original_file_name ??
        file?.original_filename ??
        file?.original_name ??
        file?.filename ??
        file?.file_name ??
        file?.name ??
        "Untitled file"
    );


  const mimeType =
    String(
      file?.mime_type ??
        file?.content_type ??
        ""
    );


  const sizeBytes =
    Number(
      file?.file_size ??
        file?.size_bytes ??
        file?.size ??
        0
    );


  const rawDate =
    String(
      file?.created_at ??
        file?.uploaded_at ??
        file?.updated_at ??
        ""
    );


  return {
    id,

    name,

    type:
      detectFileType(
        name,
        mimeType
      ),

    mimeType,

    sizeBytes:
      Number.isFinite(
        sizeBytes
      )
        ? sizeBytes
        : undefined,

    size:
      formatFileSize(
        sizeBytes
      ),

    rawDate,

    date:
      formatDate(
        rawDate
      ),
  };
}


/* =========================================================
   BUILD BACKEND URL
   ========================================================= */

function buildApiUrl(
  path: string
) {
  const rawBase =
    import.meta.env
      .VITE_API_BASE_URL ||
    "http://127.0.0.1:8000";


  const base =
    String(
      rawBase
    )
      .replace(
        /\/+$/,
        ""
      )
      .replace(
        /\/api\/v1$/,
        ""
      );


  const normalizedPath =
    path.startsWith(
      "/"
    )
      ? path
      : `/${path}`;


  return `${base}/api/v1${normalizedPath}`;
}


/* =========================================================
   COMPONENT
   ========================================================= */

export default function Library() {
  const [
    searchTerm,
    setSearchTerm,
  ] =
    useState("");


  const [
    files,
    setFiles,
  ] =
    useState<
      FileItem[]
    >([]);


  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );


  const [
    refreshing,
    setRefreshing,
  ] =
    useState(
      false
    );


  const [
    deletingId,
    setDeletingId,
  ] =
    useState<
      string | null
    >(null);


  const [
    downloadingId,
    setDownloadingId,
  ] =
    useState<
      string | null
    >(null);


  const [
    error,
    setError,
  ] =
    useState("");


  /* =======================================================
     LOAD FILES
     ======================================================= */

  const loadFiles =
    useCallback(
      async (
        manualRefresh =
          false
      ) => {
        if (
          manualRefresh
        ) {
          setRefreshing(
            true
          );
        } else {
          setLoading(
            true
          );
        }


        setError("");


        try {
          const response =
            await api.get<any>(
              "/files"
            );


          const payload =
            unwrapResponse<any>(
              response
            );


          const rows =
            getBackendFileArray(
              payload
            );


          const normalizedFiles =
            rows
              .map(
                normalizeBackendFile
              )
              .filter(
                (
                  file
                ) =>
                  Boolean(
                    file.id
                  )
              )
              .sort(
                (
                  first,
                  second
                ) => {
                  const firstDate =
                    first.rawDate
                      ? new Date(
                          first.rawDate
                        ).getTime()
                      : 0;


                  const secondDate =
                    second.rawDate
                      ? new Date(
                          second.rawDate
                        ).getTime()
                      : 0;


                  return (
                    secondDate -
                    firstDate
                  );
                }
              );


          setFiles(
            normalizedFiles
          );
        } catch (
          err
        ) {
          console.error(
            "Failed to load library files:",
            err
          );


          setFiles(
            []
          );


          setError(
            getApiError(
              err
            )
          );
        } finally {
          setLoading(
            false
          );


          setRefreshing(
            false
          );
        }
      },
      []
    );


  /* =======================================================
     INITIAL LOAD
     ======================================================= */

  useEffect(() => {
    void loadFiles();
  }, [
    loadFiles,
  ]);


  /* =======================================================
     LIVE FILE UPDATE EVENT
     ======================================================= */

  useEffect(() => {
    const handleFilesUpdated =
      () => {
        void loadFiles(
          true
        );
      };


    window.addEventListener(
      "accessmate-files-updated",
      handleFilesUpdated
    );


    return () => {
      window.removeEventListener(
        "accessmate-files-updated",
        handleFilesUpdated
      );
    };
  }, [
    loadFiles,
  ]);


  /* =======================================================
     DOWNLOAD
     ======================================================= */

  async function handleDownload(
    file: FileItem
  ) {
    if (
      downloadingId ||
      deletingId
    ) {
      return;
    }


    setDownloadingId(
      file.id
    );


    setError("");


    try {
      const token =
        getToken();


      if (
        !token
      ) {
        throw new Error(
          "Authentication token not found."
        );
      }


      const response =
        await fetch(
          buildApiUrl(
            `/files/${file.id}/download`
          ),
          {
            method:
              "GET",

            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );


      if (
        !response.ok
      ) {
        let message =
          `Download failed (${response.status})`;


        try {
          const payload =
            await response.json();


          if (
            payload?.detail
          ) {
            message =
              String(
                payload.detail
              );
          }
        } catch {
          // Response was not JSON.
        }


        throw new Error(
          message
        );
      }


      const blob =
        await response.blob();


      const objectUrl =
        URL.createObjectURL(
          blob
        );


      const link =
        document.createElement(
          "a"
        );


      link.href =
        objectUrl;


      link.download =
        file.name;


      document.body.appendChild(
        link
      );


      link.click();


      link.remove();


      URL.revokeObjectURL(
        objectUrl
      );
    } catch (
      err
    ) {
      console.error(
        "Failed to download file:",
        err
      );


      setError(
        err instanceof
          Error
          ? err.message
          : "Failed to download file."
      );
    } finally {
      setDownloadingId(
        null
      );
    }
  }


  /* =======================================================
     DELETE
     ======================================================= */

  async function handleDelete(
    id: string
  ) {
    if (
      deletingId ||
      downloadingId
    ) {
      return;
    }


    const targetFile =
      files.find(
        (
          file
        ) =>
          file.id ===
          id
      );


    const confirmed =
      window.confirm(
        targetFile
          ? `Are you sure you want to permanently delete "${targetFile.name}"?`
          : "Are you sure you want to permanently delete this file?"
      );


    if (
      !confirmed
    ) {
      return;
    }


    const previousFiles =
      files;


    setFiles(
      (
        current
      ) =>
        current.filter(
          (
            file
          ) =>
            file.id !==
            id
        )
    );


    setDeletingId(
      id
    );


    setError("");


    try {
      await api.delete(
        `/files/${id}`
      );


      window.dispatchEvent(
        new Event(
          "accessmate-files-updated"
        )
      );
    } catch (
      err
    ) {
      console.error(
        "Failed to delete file:",
        err
      );


      setFiles(
        previousFiles
      );


      setError(
        getApiError(
          err
        )
      );
    } finally {
      setDeletingId(
        null
      );
    }
  }


  /* =======================================================
     SEARCH
     ======================================================= */

  const filteredFiles =
    useMemo(
      () => {
        const query =
          searchTerm
            .trim()
            .toLowerCase();


        if (
          !query
        ) {
          return files;
        }


        return files.filter(
          (
            file
          ) =>
            file.name
              .toLowerCase()
              .includes(
                query
              ) ||
            file.type
              .toLowerCase()
              .includes(
                query
              ) ||
            file.mimeType
              ?.toLowerCase()
              .includes(
                query
              )
        );
      },
      [
        files,
        searchTerm,
      ]
    );


  /* =======================================================
     FILE ICON
     ======================================================= */

  function getFileIcon(
    type:
      LibraryFileType
  ) {
    switch (
      type
    ) {
      case "pdf":
        return (
          <FileText
            className="
              h-5
              w-5
            "
          />
        );


      case "doc":
      case "csv":
      case "text":
        return (
          <FileText
            className="
              h-5
              w-5
            "
          />
        );


      case "image":
        return (
          <ImageIcon
            className="
              h-5
              w-5
            "
          />
        );


      default:
        return (
          <File
            className="
              h-5
              w-5
            "
          />
        );
    }
  }



  const fileStats =
    useMemo(
      () => {
        const documents =
          files.filter(
            (file) =>
              ["pdf", "doc", "csv", "text"].includes(file.type)
          ).length;

        const images =
          files.filter(
            (file) =>
              file.type === "image"
          ).length;

        const audio =
          files.filter(
            (file) =>
              file.type === "audio"
          ).length;

        const others =
          files.length -
          documents -
          images -
          audio;

        return {
          total: files.length,
          documents,
          images,
          audio,
          others: Math.max(0, others),
        };
      },
      [files]
    );


  /* =======================================================
     UI
     ======================================================= */

  return (
    <main
      data-voice-region="Library"
      aria-label="Library"
      className="
        library-page
        relative
        h-full
        min-h-0
        overflow-hidden
        bg-[#000912]
        text-[#E8EEF2]
      "
    >
      <div className="pointer-events-none absolute inset-0 bg-[#000912]" />

      <div
        className="
          pointer-events-none
          absolute
          bottom-[-18%]
          right-[-8%]
          h-[480px]
          w-[480px]
          rounded-full
          bg-[#00B8DB]/[0.035]
          blur-[165px]
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
          py-5
          lg:px-7
        "
      >
        <header
          data-voice-region="Library header"
          className="
            flex
            shrink-0
            flex-col
            gap-5
            pb-4
            lg:flex-row
            lg:items-end
            lg:justify-between
          "
        >
          <div>
            <span
              className="
                inline-flex
                items-center
                gap-2
                text-[10px]
                font-black
                uppercase
                tracking-[0.15em]
                text-[#30AFDC]
              "
            >
              <FileText className="h-3.5 w-3.5" />
              Asset Repository
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
              Library
            </h1>

            <p
              className="
                mt-1
                max-w-2xl
                text-[12px]
                leading-5
                text-[#8D98A1]
              "
            >
              Uploaded images, documents, audio, CSV files, and other supported assets in one place.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div
              className="
                min-w-[74px]
                rounded-[10px]
                border
                border-[#15313D]
                bg-[#061018]/90
                px-4
                py-2.5
              "
            >
              <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-[#6F7D86]">
                Files
              </p>
              <p className="mt-0.5 text-[20px] font-black text-white">
                {files.length}
              </p>
            </div>

            <button
              type="button"
              disabled={refreshing}
              onClick={() =>
                void loadFiles(true)
              }
              className="
                inline-flex
                min-h-[40px]
                items-center
                justify-center
                gap-2
                rounded-[9px]
                border
                border-[#0F4055]
                bg-[#04121C]
                px-4
                text-[11px]
                font-bold
                text-[#30AFDC]
                transition
                hover:border-[#00B8DB]/60
                hover:bg-[#07202B]
                disabled:opacity-50
              "
              aria-label="Refresh library files"
              data-voice-label="Refresh library files"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
              />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </header>

        <div
          data-voice-region="Library search"
          className="
            mt-1
            flex
            shrink-0
            items-center
            gap-3
          "
        >
          <div
            className="
              group
              flex
              h-[44px]
              w-full
              max-w-[640px]
              items-center
              gap-2.5
              rounded-[10px]
              border
              border-[#15313D]
              bg-[#061018]/90
              px-4
              transition
              focus-within:border-[#00B8DB]/55
            "
          >
            <Search className="h-4 w-4 shrink-0 text-[#30AFDC]" />

            <input
              type="text"
              placeholder="Search files by name, type, or MIME..."
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
              aria-label="Search library files"
              data-voice-label="Search library files"
              className="
                min-w-0
                flex-1
                bg-transparent
                text-[11px]
                font-medium
                text-white
                outline-none
                placeholder:text-[#68747D]
              "
            />

            {searchTerm && (
              <span
                className="
                  rounded-full
                  border
                  border-[#15313D]
                  bg-[#081722]
                  px-2
                  py-0.5
                  text-[8px]
                  font-bold
                  text-[#30AFDC]
                "
              >
                {filteredFiles.length}
              </span>
            )}
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="
              mt-3
              shrink-0
              rounded-[10px]
              border
              border-red-400/20
              bg-red-500/[0.055]
              px-4
              py-2.5
              text-[11px]
              leading-5
              text-red-300
            "
          >
            {error}
          </div>
        )}

        <section
          className="
            mt-4
            grid
            shrink-0
            grid-cols-2
            gap-3
            xl:grid-cols-5
          "
        >
          <LibraryStat
            label="Total Files"
            value={fileStats.total}
            detail="Across all categories"
            icon={FileText}
            tone="blue"
          />
          <LibraryStat
            label="Documents"
            value={fileStats.documents}
            detail="PDF, DOCX, TXT, CSV"
            icon={FileText}
            tone="blue"
          />
          <LibraryStat
            label="Images"
            value={fileStats.images}
            detail="JPG, PNG, GIF..."
            icon={ImageIcon}
            tone="green"
          />
          <LibraryStat
            label="Audio"
            value={fileStats.audio}
            detail="MP3, WAV, OGG..."
            icon={Music2}
            tone="purple"
          />
          <LibraryStat
            label="Others"
            value={fileStats.others}
            detail="Other supported files"
            icon={File}
            tone="amber"
          />
        </section>

        <div
          className="
            library-cyan-scroll
            mt-4
            min-h-0
            flex-1
            overflow-y-auto
            rounded-[13px]
            border
            border-[#15313D]
            bg-[#04101A]/88
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
                text-center
              "
              aria-live="polite"
            >
              <RefreshCw className="h-6 w-6 animate-spin text-[#30AFDC]" />
              <p className="mt-3 text-[11px] font-medium text-[#7E8992]">
                Loading files...
              </p>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div
              className="
                flex
                min-h-[360px]
                flex-col
                items-center
                justify-center
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
                  rounded-[16px]
                  border
                  border-[#15313D]
                  bg-[#061722]
                  text-[#30AFDC]
                "
              >
                <File className="h-7 w-7" />
              </span>

              <h2 className="mt-4 text-[14px] font-semibold text-[#D6DEE3]">
                {searchTerm.trim()
                  ? "No matching files"
                  : "No files uploaded yet"}
              </h2>

              <p className="mt-1 max-w-md text-[10px] leading-5 text-[#65717A]">
                {searchTerm.trim()
                  ? "Try another file name, type, or MIME value."
                  : "Files uploaded through AccessMate will appear here automatically."}
              </p>
            </div>
          ) : (
            <div className="min-w-[760px]">
              <div
                className="
                  grid
                  grid-cols-[minmax(280px,1.6fr)_100px_100px_170px_150px]
                  items-center
                  border-b
                  border-[#15313D]
                  px-4
                  py-3
                  text-[9px]
                  font-black
                  uppercase
                  tracking-[0.08em]
                  text-[#73808A]
                "
              >
                <span>Name</span>
                <span>Type</span>
                <span>Size</span>
                <span>Last Modified</span>
                <span className="text-right">Actions</span>
              </div>

              {filteredFiles.map((file) => (
                <motion.article
                  key={file.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18 }}
                  className="
                    grid
                    grid-cols-[minmax(280px,1.6fr)_100px_100px_170px_150px]
                    items-center
                    border-b
                    border-[#102832]
                    px-4
                    py-3
                    transition
                    hover:bg-[#071722]
                  "
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="
                        flex
                        h-9
                        w-9
                        shrink-0
                        items-center
                        justify-center
                        rounded-[8px]
                        border
                        border-[#15313D]
                        bg-[#071722]
                        text-[#30AFDC]
                      "
                    >
                      {getFileIcon(file.type)}
                    </span>

                    <div className="min-w-0">
                      <p
                        className="
                          truncate
                          text-[11px]
                          font-bold
                          text-[#DDE6EA]
                        "
                        title={file.name}
                      >
                        {file.name}
                      </p>

                      <p className="mt-0.5 truncate text-[8px] text-[#65717A]">
                        {file.mimeType || file.name}
                      </p>
                    </div>
                  </div>

                  <span
                    className="
                      w-fit
                      rounded-full
                      border
                      border-[#0E3B50]
                      bg-[#072033]
                      px-2
                      py-1
                      text-[8px]
                      font-black
                      uppercase
                      text-[#30AFDC]
                    "
                  >
                    {file.type}
                  </span>

                  <span className="text-[10px] font-medium text-[#8D98A1]">
                    {file.size || "—"}
                  </span>

                  <span className="text-[9px] leading-4 text-[#8D98A1]">
                    {file.date || "—"}
                  </span>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      disabled={
                        downloadingId === file.id ||
                        deletingId === file.id
                      }
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleDownload(file);
                      }}
                      className="
                        inline-flex
                        h-8
                        items-center
                        justify-center
                        gap-1.5
                        rounded-[8px]
                        border
                        border-[#15313D]
                        bg-[#06131D]
                        px-2.5
                        text-[9px]
                        font-bold
                        text-[#30AFDC]
                        transition
                        hover:border-[#00B8DB]/45
                        hover:bg-[#08202C]
                        disabled:opacity-50
                      "
                      aria-label={`Download ${file.name}`}
                      data-voice-label={`Download ${file.name}`}
                    >
                      {downloadingId === file.id ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Download className="h-3.5 w-3.5" />
                      )}
                      Download
                    </button>

                    <button
                      type="button"
                      disabled={
                        deletingId === file.id ||
                        downloadingId === file.id
                      }
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleDelete(file.id);
                      }}
                      className="
                        inline-flex
                        h-8
                        w-8
                        items-center
                        justify-center
                        rounded-[8px]
                        border
                        border-red-400/16
                        bg-red-500/[0.04]
                        text-red-300/80
                        transition
                        hover:border-red-400/35
                        hover:bg-red-500/[0.09]
                        disabled:opacity-50
                      "
                      aria-label={`Delete ${file.name}`}
                      data-voice-label={`Delete ${file.name}`}
                    >
                      {deletingId === file.id ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </motion.article>
              ))}
            </div>
          )}
        </div>
      </section>

      <style>
        {`
        .library-cyan-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(0,184,219,0.24) transparent;
        }

        .library-cyan-scroll::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }

        .library-cyan-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .library-cyan-scroll::-webkit-scrollbar-thumb {
          background: rgba(0,184,219,0.20);
          border-radius: 999px;
        }
        `}
      </style>
    </main>
  );
}


function LibraryStat({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  detail: string;
  icon: ComponentType<{ className?: string }>;
  tone: "blue" | "green" | "purple" | "amber";
}) {
  const tones = {
    blue: "border-[#0E3B50] bg-[#072033] text-[#30AFDC]",
    green: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
    purple: "border-violet-500/20 bg-violet-500/10 text-violet-400",
    amber: "border-amber-500/20 bg-amber-500/10 text-amber-400",
  };

  return (
    <div
      className="
        flex
        min-h-[82px]
        items-center
        gap-3
        rounded-[11px]
        border
        border-[#15313D]
        bg-[#061018]/90
        p-3
      "
    >
      <span
        className={`
          flex
          h-10
          w-10
          shrink-0
          items-center
          justify-center
          rounded-[10px]
          border
          ${tones[tone]}
        `}
      >
        <Icon className="h-5 w-5" />
      </span>

      <div className="min-w-0">
        <p className="truncate text-[9px] font-bold text-[#8A959E]">
          {label}
        </p>
        <p className="mt-0.5 text-[18px] font-black text-white">
          {value}
        </p>
        <p className="mt-0.5 truncate text-[8px] text-[#65717A]">
          {detail}
        </p>
      </div>
    </div>
  );
}
