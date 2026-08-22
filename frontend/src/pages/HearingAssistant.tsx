import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Activity,
  AlertTriangle,
  AudioLines,
  Bell,
  CircleStop,
  Copy,
  Download,
  Ear,
  Languages,
  Maximize2,
  Mic,
  Pause,
  Play,
  Radio,
  Save,
  Send,
  Square,
  Trash2,
  Volume2,
  VolumeX,
} from "lucide-react";

import {
  api,
  getApiError,
  unwrapResponse,
} from "../lib/api";


type Language =
  | "en"
  | "ar";

type CaptionSize =
  | "normal"
  | "large"
  | "extra";

type ActiveMode =
  | "conversation"
  | "sound";

type CaptionLine = {
  id: string;
  text: string;
  translation?: string;
  translating?: boolean;
  translationError?: boolean;
  createdAt: Date;
};

type HearingChunkResponse = {
  sequence: number;
  transcript: string;
  language: string;
  is_speech: boolean;
  provider: string;
  model: string;
  latency_ms: number;
};

type TranslationResponse = {
  translated_text: string;
  source_language: string;
  target_language: string;
  provider: string;
  model: string;
  latency_ms: number;
};

type SoundResponse = {
  detected: boolean;
  category: string | null;
  label: string | null;
  confidence: number;
  threshold: number;
  model: string;
  latency_ms: number;
  monitored_scores: Record<
    string,
    number
  >;
};


type HearingSavedSessionResponse = {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
};


type HearingSoundEventResponse = {
  id: string;
  user_id: string;
  session_id: string | null;
  care_alert_id: string | null;
  client_id: string;
  category: string;
  label: string;
  confidence: number;
  threshold: number;
  model: string;
  is_critical: boolean;
  created_at: string;
};

type SoundEvent = {
  id: string;
  clientId: string;
  serverId?: string;
  category: string;
  label: string;
  confidence: number;
  threshold: number;
  model: string;
  createdAt: Date;
};

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: {
    transcript: string;
  };
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]:
      SpeechRecognitionResultLike;
  };
};

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;

  onresult:
    | ((
        event:
          SpeechRecognitionEventLike
      ) => void)
    | null;

  onerror:
    | ((
        event: {
          error: string;
        }
      ) => void)
    | null;

  onend:
    | (() => void)
    | null;

  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionConstructor =
  new () =>
    BrowserSpeechRecognition;

type AccessibilityPrefs = {
  preferredLanguage?: Language;
  textSize?:
    | "normal"
    | "large"
    | "extra_large";
  highContrast?: boolean;
  userMode?: string;
};

declare global {
  interface Window {
    SpeechRecognition?:
      SpeechRecognitionConstructor;

    webkitSpeechRecognition?:
      SpeechRecognitionConstructor;
  }
}


const FALLBACK_SEGMENT_MS =
  6000;

const PREFS_KEY =
  "accessmate_accessibility_preferences";

const SESSION_KEY =
  "accessmate_hearing_sessions";

const SOUND_HISTORY_KEY =
  "accessmate_hearing_sound_events";

const SOUND_WINDOW_SECONDS =
  2.4;

const SOUND_THRESHOLD =
  0.22;

const SOUND_COOLDOWN_MS =
  15000;


const SOUND_CARDS = [
  {
    key:
      "alarm",
    icon:
      "🚨",
    label:
      "Alarm",
  },
  {
    key:
      "siren",
    icon:
      "🚑",
    label:
      "Siren",
  },
  {
    key:
      "doorbell",
    icon:
      "🔔",
    label:
      "Doorbell",
  },
  {
    key:
      "baby_cry",
    icon:
      "👶",
    label:
      "Baby Cry",
  },
  {
    key:
      "knock",
    icon:
      "🚪",
    label:
      "Knocking",
  },
  {
    key:
      "beep",
    icon:
      "📟",
    label:
      "Alert Beep",
  },
] as const;


function getRecognitionConstructor() {
  return (
    window.SpeechRecognition
    ||
    window.webkitSpeechRecognition
    ||
    null
  );
}


function formatTime(
  value: Date
) {
  return value
    .toLocaleTimeString(
      [],
      {
        hour:
          "2-digit",

        minute:
          "2-digit",
      }
    );
}


function detectTextLanguage(
  value: string
): Language {
  return /[\u0600-\u06FF]/.test(
    value
  )
    ? "ar"
    : "en";
}


function getStoredPrefs():
  AccessibilityPrefs {
  try {
    const raw =
      localStorage.getItem(
        PREFS_KEY
      );

    return raw
      ? JSON.parse(
          raw
        )
      : {};
  } catch {
    return {};
  }
}


function prefsCaptionSize(
  value?:
    AccessibilityPrefs[
      "textSize"
    ]
): CaptionSize {
  if (
    value ===
    "extra_large"
  ) {
    return "extra";
  }

  if (
    value ===
    "large"
  ) {
    return "large";
  }

  return "normal";
}


function concatenateFloat32(
  buffers:
    Float32Array[]
) {
  const length =
    buffers.reduce(
      (
        total,
        item
      ) =>
        total +
        item.length,
      0
    );

  const output =
    new Float32Array(
      length
    );

  let offset =
    0;

  for (
    const item
    of buffers
  ) {
    output.set(
      item,
      offset
    );

    offset +=
      item.length;
  }

  return output;
}


function makeWavBlob(
  samples:
    Float32Array,
  sampleRate:
    number
) {
  const bytesPerSample =
    2;

  const buffer =
    new ArrayBuffer(
      44 +
      samples.length *
        bytesPerSample
    );

  const view =
    new DataView(
      buffer
    );

  function writeText(
    offset: number,
    value: string
  ) {
    for (
      let index = 0;
      index <
      value.length;
      index += 1
    ) {
      view.setUint8(
        offset +
          index,
        value.charCodeAt(
          index
        )
      );
    }
  }

  writeText(
    0,
    "RIFF"
  );

  view.setUint32(
    4,
    36 +
      samples.length *
        bytesPerSample,
    true
  );

  writeText(
    8,
    "WAVE"
  );

  writeText(
    12,
    "fmt "
  );

  view.setUint32(
    16,
    16,
    true
  );

  view.setUint16(
    20,
    1,
    true
  );

  view.setUint16(
    22,
    1,
    true
  );

  view.setUint32(
    24,
    sampleRate,
    true
  );

  view.setUint32(
    28,
    sampleRate *
      bytesPerSample,
    true
  );

  view.setUint16(
    32,
    bytesPerSample,
    true
  );

  view.setUint16(
    34,
    16,
    true
  );

  writeText(
    36,
    "data"
  );

  view.setUint32(
    40,
    samples.length *
      bytesPerSample,
    true
  );

  let offset =
    44;

  for (
    let index = 0;
    index <
    samples.length;
    index += 1
  ) {
    const sample =
      Math.max(
        -1,
        Math.min(
          1,
          samples[
            index
          ]
        )
      );

    view.setInt16(
      offset,
      sample < 0
        ? sample *
          0x8000
        : sample *
          0x7fff,
      true
    );

    offset +=
      2;
  }

  return new Blob(
    [
      view,
    ],
    {
      type:
        "audio/wav",
    }
  );
}


function isEmergencyPhrase(
  text: string
) {
  const normalized =
    text
      .toLowerCase()
      .trim();

  return [
    /\bemergency\b/,
    /\bhelp me\b/,
    /\bcall my caregiver\b/,
    /\bcall caregiver\b/,
    /طوارئ/,
    /النجدة/,
    /الحقوني/,
    /ساعدني/,
    /اتصل بالمرافق/,
  ].some(
    (
      pattern
    ) =>
      pattern.test(
        normalized
      )
  );
}


export default function HearingAssistant() {
  const initialPrefs =
    useMemo(
      () =>
        getStoredPrefs(),
      []
    );

  const [
    activeMode,
    setActiveMode,
  ] =
    useState<ActiveMode>(
      "conversation"
    );

  const [
    language,
    setLanguage,
  ] =
    useState<Language>(
      initialPrefs
        .preferredLanguage
      ||
      (
        localStorage.getItem(
          "accessmate_language"
        ) === "ar"
          ? "ar"
          : "en"
      )
    );

  const [
    captionSize,
    setCaptionSize,
  ] =
    useState<CaptionSize>(
      prefsCaptionSize(
        initialPrefs
          .textSize
      )
    );

  const [
    highContrast,
    setHighContrast,
  ] =
    useState(
      Boolean(
        initialPrefs
          .highContrast
      )
    );

  const [
    captions,
    setCaptions,
  ] =
    useState<CaptionLine[]>(
      []
    );

  const [
    interimCaption,
    setInterimCaption,
  ] =
    useState("");

  const [
    isListening,
    setIsListening,
  ] =
    useState(false);

  const [
    isPaused,
    setIsPaused,
  ] =
    useState(false);

  const [
    engine,
    setEngine,
  ] =
    useState<
      "idle"
      | "browser"
      | "whisper"
    >(
      "idle"
    );

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    statusMessage,
    setStatusMessage,
  ] =
    useState("");

  const [
    lastLatency,
    setLastLatency,
  ] =
    useState<
      number | null
    >(
      null
    );

  const [
    translationEnabled,
    setTranslationEnabled,
  ] =
    useState(false);

  const [
    translationTarget,
    setTranslationTarget,
  ] =
    useState<Language>(
      language ===
        "en"
        ? "ar"
        : "en"
    );

  const [
    replyText,
    setReplyText,
  ] =
    useState("");

  const [
    isSpeaking,
    setIsSpeaking,
  ] =
    useState(false);

  const [
    soundMonitoring,
    setSoundMonitoring,
  ] =
    useState(false);

  const [
    soundLoading,
    setSoundLoading,
  ] =
    useState(false);

  const [
    soundEvents,
    setSoundEvents,
  ] =
    useState<SoundEvent[]>(
      () => {
        try {
          const raw =
            localStorage.getItem(
              SOUND_HISTORY_KEY
            );

          const rows =
            raw
              ? JSON.parse(
                  raw
                )
              : [];

          return Array.isArray(
            rows
          )
            ? rows
                .slice(
                  0,
                  30
                )
                .map(
                  (
                    item:
                      any
                  ) => ({
                    ...item,

                    clientId:
                      String(
                        item.clientId
                        || item.id
                      ),

                    threshold:
                      Number(
                        item.threshold
                        ?? SOUND_THRESHOLD
                      ),

                    model:
                      String(
                        item.model
                        || "yamnet"
                      ),

                    createdAt:
                      new Date(
                        item
                          .createdAt
                      ),
                  })
                )
            : [];
        } catch {
          return [];
        }
      }
    );

  const [
    liveSoundScores,
    setLiveSoundScores,
  ] =
    useState<
      Record<
        string,
        number
      >
    >(
      {}
    );

  const [
    criticalSound,
    setCriticalSound,
  ] =
    useState<
      SoundEvent | null
    >(
      null
    );

  const [
    emergencyPrompt,
    setEmergencyPrompt,
  ] =
    useState(false);

  const [
    emergencySending,
    setEmergencySending,
  ] =
    useState(false);

  const [
    emergencyMessage,
    setEmergencyMessage,
  ] =
    useState("");

  const captionPanelRef =
    useRef<
      HTMLDivElement
      | null
    >(
      null
    );

  const recognitionRef =
    useRef<
      BrowserSpeechRecognition
      | null
    >(
      null
    );

  const streamRef =
    useRef<
      MediaStream
      | null
    >(
      null
    );

  const recorderRef =
    useRef<
      MediaRecorder
      | null
    >(
      null
    );

  const segmentTimerRef =
    useRef<
      ReturnType<
        typeof setTimeout
      >
      | null
    >(
      null
    );

  const shouldListenRef =
    useRef(false);

  const pausedRef =
    useRef(false);

  const sequenceRef =
    useRef(0);

  const queueRef =
    useRef<
      Array<{
        file:
          File;

        sequence:
          number;
      }>
    >(
      []
    );

  const queueBusyRef =
    useRef(false);

  const lastCaptionTextRef =
    useRef("");

  const soundStreamRef =
    useRef<
      MediaStream
      | null
    >(
      null
    );

  const soundContextRef =
    useRef<
      AudioContext
      | null
    >(
      null
    );

  const soundProcessorRef =
    useRef<
      ScriptProcessorNode
      | null
    >(
      null
    );

  const soundSourceRef =
    useRef<
      MediaStreamAudioSourceNode
      | null
    >(
      null
    );

  const soundGainRef =
    useRef<
      GainNode
      | null
    >(
      null
    );

  const soundBuffersRef =
    useRef<
      Float32Array[]
    >(
      []
    );

  const soundSamplesRef =
    useRef(0);

  const soundBusyRef =
    useRef(false);

  const soundCandidateRef =
    useRef<{
      category:
        string;

      count:
        number;

      lastAt:
        number;
    } | null>(
      null
    );

  const soundCooldownRef =
    useRef<
      Record<
        string,
        number
      >
    >(
      {}
    );


  useEffect(
    () => {
      function syncPrefs() {
        const prefs =
          getStoredPrefs();

        const storedLanguage =
          localStorage.getItem(
            "accessmate_language"
          );

        const nextLanguage:
          Language =
          storedLanguage ===
            "ar"
            ? "ar"
            : prefs
                .preferredLanguage ===
              "ar"
            ? "ar"
            : "en";

        setLanguage(
          nextLanguage
        );

        setCaptionSize(
          prefsCaptionSize(
            prefs.textSize
          )
        );

        setHighContrast(
          Boolean(
            prefs.highContrast
          )
        );
      }

      window.addEventListener(
        "accessmate-settings-updated",
        syncPrefs
      );

      window.addEventListener(
        "storage",
        syncPrefs
      );

      return () => {
        window.removeEventListener(
          "accessmate-settings-updated",
          syncPrefs
        );

        window.removeEventListener(
          "storage",
          syncPrefs
        );
      };
    },
    []
  );


  useEffect(
    () => {
      setTranslationTarget(
        language ===
          "en"
          ? "ar"
          : "en"
      );
    },
    [
      language,
    ]
  );


  async function loadPersistedSoundEvents() {
    try {
      const response =
        await api.get(
          "/hearing/sound-events?limit=30"
        );

      const payload =
        unwrapResponse<any>(
          response
        );

      const rows =
        Array.isArray(payload)
          ? payload
          : Array.isArray(
              payload?.data
            )
          ? payload.data
          : [];

      const serverEvents:
        SoundEvent[] =
        rows.map(
          (
            item:
              HearingSoundEventResponse
          ) => ({
            id:
              item.client_id,

            clientId:
              item.client_id,

            serverId:
              item.id,

            category:
              item.category,

            label:
              item.label,

            confidence:
              Number(
                item.confidence
              ),

            threshold:
              Number(
                item.threshold
              ),

            model:
              item.model,

            createdAt:
              new Date(
                item.created_at
              ),
          })
        );

      setSoundEvents(
        serverEvents
      );

      localStorage.setItem(
        SOUND_HISTORY_KEY,
        JSON.stringify(
          serverEvents
        )
      );

    } catch (
      historyError
    ) {
      console.warn(
        "Using local Sound Awareness history fallback:",
        historyError
      );
    }
  }


  useEffect(
    () => {
      void loadPersistedSoundEvents();
    },
    []
  );


  const translateCaption =
    useCallback(
      async (
        id: string,
        text: string
      ) => {
        if (
          !translationEnabled
        ) {
          return;
        }

        setCaptions(
          (
            previous
          ) =>
            previous.map(
              (
                item
              ) =>
                item.id ===
                  id
                  ? {
                      ...item,

                      translating:
                        true,

                      translationError:
                        false,
                    }
                  : item
            )
        );

        try {
          const response =
            await api.post(
              "/hearing/translate",
              {
                text,

                source_language:
                  language,

                target_language:
                  translationTarget,
              }
            );

          const result =
            unwrapResponse<
              TranslationResponse
            >(
              response
            );

          setCaptions(
            (
              previous
            ) =>
              previous.map(
                (
                  item
                ) =>
                  item.id ===
                    id
                    ? {
                        ...item,

                        translating:
                          false,

                        translation:
                          result
                            .translated_text,

                        translationError:
                          false,
                      }
                    : item
              )
          );

        } catch (
          translateError
        ) {
          console.error(
            "Caption translation failed:",
            translateError
          );

          setCaptions(
            (
              previous
            ) =>
              previous.map(
                (
                  item
                ) =>
                  item.id ===
                    id
                    ? {
                        ...item,

                        translating:
                          false,

                        translationError:
                          true,
                      }
                    : item
              )
          );
        }
      },
      [
        language,
        translationEnabled,
        translationTarget,
      ]
    );


  const appendCaption =
    useCallback(
      (
        value: string
      ) => {
        const text =
          value
            .replace(
              /\s+/g,
              " "
            )
            .trim();

        if (!text) {
          return;
        }

        if (
          lastCaptionTextRef
            .current
            .toLowerCase()
          ===
          text.toLowerCase()
        ) {
          return;
        }

        lastCaptionTextRef.current =
          text;

        const id =
          `${Date.now()}-${Math.random()}`;

        setCaptions(
          (
            previous
          ) =>
            [
              ...previous,
              {
                id,

                text,

                createdAt:
                  new Date(),
              },
            ].slice(
              -50
            )
        );

        if (
          translationEnabled
        ) {
          void translateCaption(
            id,
            text
          );
        }

        if (
          isEmergencyPhrase(
            text
          )
        ) {
          setEmergencyPrompt(
            true
          );
        }
      },
      [
        translateCaption,
        translationEnabled,
      ]
    );


  const processQueue =
    useCallback(
      async () => {
        if (
          queueBusyRef.current
        ) {
          return;
        }

        const item =
          queueRef.current
            .shift();

        if (!item) {
          return;
        }

        queueBusyRef.current =
          true;

        try {
          const formData =
            new FormData();

          formData.append(
            "audio_file",
            item.file
          );

          formData.append(
            "language",
            language
          );

          formData.append(
            "sequence",
            String(
              item.sequence
            )
          );

          const response =
            await api.post(
              "/hearing/transcribe-chunk",
              formData
            );

          const result =
            unwrapResponse<
              HearingChunkResponse
            >(
              response
            );

          setLastLatency(
            result.latency_ms
          );

          if (
            result.is_speech
            &&
            result.transcript
              .trim()
          ) {
            appendCaption(
              result.transcript
            );
          }

        } catch (
          requestError
        ) {
          console.error(
            "Live caption request failed:",
            requestError
          );

          setError(
            getApiError(
              requestError
            )
          );

        } finally {
          queueBusyRef.current =
            false;

          if (
            queueRef.current
              .length >
            0
          ) {
            void processQueue();
          }
        }
      },
      [
        appendCaption,
        language,
      ]
    );


  const startWhisperSegment =
    useCallback(
      () => {
        const stream =
          streamRef.current;

        if (
          !stream
          ||
          !shouldListenRef.current
          ||
          pausedRef.current
        ) {
          return;
        }

        const preferredType =
          MediaRecorder
            .isTypeSupported(
              "audio/webm;codecs=opus"
            )
            ? "audio/webm;codecs=opus"
            : "audio/webm";

        const chunks:
          Blob[] =
          [];

        const recorder =
          new MediaRecorder(
            stream,
            {
              mimeType:
                preferredType,

              audioBitsPerSecond:
                64000,
            }
          );

        recorderRef.current =
          recorder;

        recorder.ondataavailable =
          (
            event
          ) => {
            if (
              event.data.size >
              0
            ) {
              chunks.push(
                event.data
              );
            }
          };

        recorder.onstop =
          () => {
            if (
              segmentTimerRef.current
            ) {
              clearTimeout(
                segmentTimerRef.current
              );

              segmentTimerRef.current =
                null;
            }

            if (
              chunks.length >
              0
            ) {
              const blob =
                new Blob(
                  chunks,
                  {
                    type:
                      preferredType,
                  }
                );

              if (
                blob.size >
                2500
              ) {
                const sequence =
                  sequenceRef.current++;

                const file =
                  new File(
                    [
                      blob,
                    ],
                    `hearing-${sequence}.webm`,
                    {
                      type:
                        "audio/webm",
                    }
                  );

                queueRef.current
                  .push(
                    {
                      file,

                      sequence,
                    }
                  );

                void processQueue();
              }
            }

            recorderRef.current =
              null;

            if (
              shouldListenRef.current
              &&
              !pausedRef.current
            ) {
              window.setTimeout(
                startWhisperSegment,
                60
              );
            }
          };

        recorder.start();

        segmentTimerRef.current =
          setTimeout(
            () => {
              if (
                recorder.state !==
                "inactive"
              ) {
                recorder.stop();
              }
            },
            FALLBACK_SEGMENT_MS
          );
      },
      [
        processQueue,
      ]
    );


  const startWhisperFallback =
    useCallback(
      async () => {
        if (
          !navigator.mediaDevices
            ?.getUserMedia
        ) {
          throw new Error(
            "Microphone access is not supported in this browser."
          );
        }

        const stream =
          await navigator
            .mediaDevices
            .getUserMedia(
              {
                audio: {
                  echoCancellation:
                    true,

                  noiseSuppression:
                    true,

                  autoGainControl:
                    true,

                  channelCount:
                    1,
                },
              }
            );

        streamRef.current =
          stream;

        setEngine(
          "whisper"
        );

        startWhisperSegment();
      },
      [
        startWhisperSegment,
      ]
    );


  const startBrowserRecognition =
    useCallback(
      () => {
        const Constructor =
          getRecognitionConstructor();

        if (!Constructor) {
          return false;
        }

        const recognition =
          new Constructor();

        recognition.continuous =
          true;

        recognition.interimResults =
          true;

        recognition.maxAlternatives =
          1;

        recognition.lang =
          language ===
            "ar"
            ? "ar-EG"
            : "en-US";

        recognition.onresult =
          (
            event
          ) => {
            let interim =
              "";

            for (
              let index =
                event.resultIndex;
              index <
              event.results.length;
              index += 1
            ) {
              const result =
                event.results[
                  index
                ];

              const transcript =
                result[
                  0
                ]?.transcript
                  ?.trim()
                ||
                "";

              if (!transcript) {
                continue;
              }

              if (
                result.isFinal
              ) {
                appendCaption(
                  transcript
                );
              } else {
                interim +=
                  `${transcript} `;
              }
            }

            setInterimCaption(
              interim.trim()
            );
          };

        recognition.onerror =
          (
            event
          ) => {
            if (
              event.error ===
                "aborted"
              ||
              event.error ===
                "no-speech"
            ) {
              return;
            }

            if (
              event.error ===
                "not-allowed"
              ||
              event.error ===
                "service-not-allowed"
            ) {
              setError(
                "Microphone or speech-recognition permission was denied."
              );

              shouldListenRef.current =
                false;

              setIsListening(
                false
              );
            }
          };

        recognition.onend =
          () => {
            if (
              shouldListenRef.current
              &&
              !pausedRef.current
            ) {
              window.setTimeout(
                () => {
                  try {
                    recognition.start();
                  } catch {
                    // Browser is still changing state.
                  }
                },
                180
              );
            }
          };

        recognitionRef.current =
          recognition;

        recognition.start();

        setEngine(
          "browser"
        );

        return true;
      },
      [
        appendCaption,
        language,
      ]
    );


  const stopRecorder =
    useCallback(
      () => {
        if (
          segmentTimerRef.current
        ) {
          clearTimeout(
            segmentTimerRef.current
          );

          segmentTimerRef.current =
            null;
        }

        if (
          recorderRef.current
          &&
          recorderRef.current
            .state !==
            "inactive"
        ) {
          recorderRef.current
            .stop();
        }
      },
      []
    );


  const stopListening =
    useCallback(
      () => {
        shouldListenRef.current =
          false;

        pausedRef.current =
          false;

        setIsListening(
          false
        );

        setIsPaused(
          false
        );

        setInterimCaption(
          ""
        );

        try {
          recognitionRef.current
            ?.abort();
        } catch {
          // ignored
        }

        recognitionRef.current =
          null;

        stopRecorder();

        streamRef.current
          ?.getTracks()
          .forEach(
            (
              track
            ) =>
              track.stop()
          );

        streamRef.current =
          null;

        queueRef.current =
          [];

        setEngine(
          "idle"
        );
      },
      [
        stopRecorder,
      ]
    );


  const stopSoundAwareness =
    useCallback(
      () => {
        if (
          soundProcessorRef.current
        ) {
          soundProcessorRef.current
            .disconnect();

          soundProcessorRef.current
            .onaudioprocess =
            null;
        }

        soundSourceRef.current
          ?.disconnect();

        soundGainRef.current
          ?.disconnect();

        soundStreamRef.current
          ?.getTracks()
          .forEach(
            (
              track
            ) =>
              track.stop()
          );

        const context =
          soundContextRef.current;

        if (
          context
          &&
          context.state !==
            "closed"
        ) {
          void context.close();
        }

        soundProcessorRef.current =
          null;

        soundSourceRef.current =
          null;

        soundGainRef.current =
          null;

        soundStreamRef.current =
          null;

        soundContextRef.current =
          null;

        soundBuffersRef.current =
          [];

        soundSamplesRef.current =
          0;

        soundBusyRef.current =
          false;

        setSoundMonitoring(
          false
        );
      },
      []
    );


  const startListening =
    useCallback(
      async () => {
        if (
          shouldListenRef.current
        ) {
          return;
        }

        if (
          soundMonitoring
        ) {
          stopSoundAwareness();
        }

        setError("");
        setStatusMessage("");
        setInterimCaption("");

        shouldListenRef.current =
          true;

        pausedRef.current =
          false;

        setIsPaused(
          false
        );

        setIsListening(
          true
        );

        try {
          const started =
            startBrowserRecognition();

          if (!started) {
            await startWhisperFallback();
          }

        } catch (
          startError
        ) {
          console.error(
            "Unable to start Hearing Assistant:",
            startError
          );

          shouldListenRef.current =
            false;

          setIsListening(
            false
          );

          setEngine(
            "idle"
          );

          setError(
            startError instanceof
              Error
              ? startError
                  .message
              : "Unable to start microphone."
          );
        }
      },
      [
        soundMonitoring,
        startBrowserRecognition,
        startWhisperFallback,
        stopSoundAwareness,
      ]
    );


  const pauseListening =
    useCallback(
      () => {
        if (
          !shouldListenRef.current
        ) {
          return;
        }

        pausedRef.current =
          true;

        setIsPaused(
          true
        );

        setInterimCaption(
          ""
        );

        recognitionRef.current
          ?.stop();

        stopRecorder();
      },
      [
        stopRecorder,
      ]
    );


  const resumeListening =
    useCallback(
      async () => {
        if (
          !shouldListenRef.current
        ) {
          await startListening();

          return;
        }

        pausedRef.current =
          false;

        setIsPaused(
          false
        );

        setError("");

        if (
          engine ===
          "browser"
        ) {
          try {
            recognitionRef.current
              ?.start();
          } catch {
            // already active
          }

        } else if (
          engine ===
          "whisper"
        ) {
          startWhisperSegment();
        }
      },
      [
        engine,
        startListening,
        startWhisperSegment,
      ]
    );


  function speakReply() {
    const text =
      replyText.trim();

    if (!text) {
      return;
    }

    if (
      !(
        "speechSynthesis"
        in window
      )
    ) {
      setError(
        "Text-to-Speech is not supported in this browser."
      );

      return;
    }

    window.speechSynthesis
      .cancel();

    const utterance =
      new SpeechSynthesisUtterance(
        text
      );

    const replyLanguage =
      detectTextLanguage(
        text
      );

    utterance.lang =
      replyLanguage ===
        "ar"
        ? "ar-EG"
        : "en-US";

    utterance.rate =
      0.92;

    utterance.pitch =
      1;

    utterance.volume =
      1;

    utterance.onstart =
      () => {
        setIsSpeaking(
          true
        );
      };

    utterance.onend =
      () => {
        setIsSpeaking(
          false
        );
      };

    utterance.onerror =
      () => {
        setIsSpeaking(
          false
        );
      };

    window.speechSynthesis
      .speak(
        utterance
      );
  }


  function stopSpeaking() {
    if (
      "speechSynthesis"
      in window
    ) {
      window.speechSynthesis
        .cancel();
    }

    setIsSpeaking(
      false
    );
  }


  const persistSoundEvent =
    useCallback(
      async (
        event:
          SoundEvent
      ) => {
        try {
          const response =
            await api.post(
              "/hearing/sound-events",
              {
                client_id:
                  event.clientId,

                session_id:
                  null,

                category:
                  event.category,

                label:
                  event.label,

                confidence:
                  event.confidence,

                threshold:
                  event.threshold,

                model:
                  event.model,
              }
            );

          const saved =
            unwrapResponse<
              HearingSoundEventResponse
            >(
              response
            );

          setSoundEvents(
            (
              previous
            ) => {
              const next =
                previous.map(
                  (
                    item
                  ) =>
                    item.clientId ===
                      event.clientId
                      ? {
                          ...item,
                          serverId:
                            saved.id,
                        }
                      : item
                );

              localStorage.setItem(
                SOUND_HISTORY_KEY,
                JSON.stringify(
                  next
                )
              );

              return next;
            }
          );

        } catch (
          persistError
        ) {
          console.warn(
            "Sound event database persistence failed; local fallback kept:",
            persistError
          );
        }
      },
      []
    );


  const registerSoundEvent =
    useCallback(
      (
        result:
          SoundResponse
      ) => {
        if (
          !result.detected
          ||
          !result.category
          ||
          !result.label
        ) {
          return;
        }

        const now =
          Date.now();

        const previous =
          soundCandidateRef
            .current;

        let count =
          1;

        if (
          previous
          &&
          previous.category ===
            result.category
          &&
          now -
            previous.lastAt <
            6000
        ) {
          count =
            previous.count +
            1;
        }

        soundCandidateRef.current =
          {
            category:
              result.category,

            count,

            lastAt:
              now,
          };

        const confirmed =
          count >= 2
          ||
          result.confidence >=
            0.50;

        if (!confirmed) {
          return;
        }

        const lastAlertAt =
          soundCooldownRef
            .current[
              result.category
            ]
          ||
          0;

        if (
          now -
            lastAlertAt <
          SOUND_COOLDOWN_MS
        ) {
          return;
        }

        soundCooldownRef.current[
          result.category
        ] = now;

        const clientId =
          `${now}-${result.category}`;

        const event:
          SoundEvent = {
          id:
            clientId,

          clientId,

          category:
            result.category,

          label:
            result.label,

          confidence:
            result.confidence,

          threshold:
            result.threshold,

          model:
            result.model,

          createdAt:
            new Date(),
        };

        setSoundEvents(
          (
            previousEvents
          ) => {
            const next =
              [
                event,
                ...previousEvents,
              ].slice(
                0,
                30
              );

            localStorage.setItem(
              SOUND_HISTORY_KEY,
              JSON.stringify(
                next
              )
            );

            return next;
          }
        );

        void persistSoundEvent(
          event
        );

        const nav =
          navigator as Navigator & {
            vibrate?:
              (
                pattern:
                  number
                  | number[]
              ) => boolean;
          };

        nav.vibrate?.(
          [
            250,
            120,
            250,
          ]
        );

        if (
          "Notification"
          in window
          &&
          Notification
            .permission ===
            "granted"
        ) {
          try {
            new Notification(
              `AccessMate: ${result.label}`,
              {
                body:
                  "Important environmental sound detected.",
              }
            );
          } catch {
            // Browser notification is optional.
          }
        }

        if (
          result.category ===
            "alarm"
          ||
          result.category ===
            "siren"
        ) {
          setCriticalSound(
            event
          );
        }
      },
      [
        persistSoundEvent,
      ]
    );


  const sendSoundSample =
    useCallback(
      async (
        blob:
          Blob
      ) => {
        if (
          soundBusyRef.current
        ) {
          return;
        }

        soundBusyRef.current =
          true;

        try {
          const formData =
            new FormData();

          formData.append(
            "audio_file",
            new File(
              [
                blob,
              ],
              "environment.wav",
              {
                type:
                  "audio/wav",
              }
            )
          );

          formData.append(
            "threshold",
            String(
              SOUND_THRESHOLD
            )
          );

          const response =
            await api.post(
              "/hearing/classify-sound",
              formData
            );

          const result =
            unwrapResponse<
              SoundResponse
            >(
              response
            );

          setLiveSoundScores(
            result
              .monitored_scores
            ||
            {}
          );

          registerSoundEvent(
            result
          );

          setError("");

        } catch (
          soundError
        ) {
          console.error(
            "Sound Awareness failed:",
            soundError
          );

          setError(
            getApiError(
              soundError
            )
          );

        } finally {
          soundBusyRef.current =
            false;
        }
      },
      [
        registerSoundEvent,
      ]
    );


  const startSoundAwareness =
    useCallback(
      async () => {
        if (
          soundMonitoring
          ||
          soundLoading
        ) {
          return;
        }

        if (
          isListening
        ) {
          stopListening();
        }

        setError("");
        setStatusMessage("");
        setSoundLoading(
          true
        );

        try {
          if (
            !navigator
              .mediaDevices
              ?.getUserMedia
          ) {
            throw new Error(
              "Microphone access is not supported in this browser."
            );
          }

          const stream =
            await navigator
              .mediaDevices
              .getUserMedia(
                {
                  audio: {
                    echoCancellation:
                      false,

                    noiseSuppression:
                      false,

                    autoGainControl:
                      false,

                    channelCount:
                      1,
                  },
                }
              );

          const context =
            new AudioContext();

          await context.resume();

          const source =
            context
              .createMediaStreamSource(
                stream
              );

          const processor =
            context
              .createScriptProcessor(
                4096,
                1,
                1
              );

          const silentGain =
            context
              .createGain();

          silentGain.gain.value =
            0;

          source.connect(
            processor
          );

          processor.connect(
            silentGain
          );

          silentGain.connect(
            context.destination
          );

          soundStreamRef.current =
            stream;

          soundContextRef.current =
            context;

          soundSourceRef.current =
            source;

          soundProcessorRef.current =
            processor;

          soundGainRef.current =
            silentGain;

          soundBuffersRef.current =
            [];

          soundSamplesRef.current =
            0;

          const targetSamples =
            Math.floor(
              context.sampleRate *
                SOUND_WINDOW_SECONDS
            );

          processor.onaudioprocess =
            (
              event
            ) => {
              const input =
                event
                  .inputBuffer
                  .getChannelData(
                    0
                  );

              const copy =
                new Float32Array(
                  input
                );

              soundBuffersRef.current
                .push(
                  copy
                );

              soundSamplesRef.current +=
                copy.length;

              if (
                soundSamplesRef.current
                >= targetSamples
              ) {
                const combined =
                  concatenateFloat32(
                    soundBuffersRef.current
                  );

                soundBuffersRef.current =
                  [];

                soundSamplesRef.current =
                  0;

                const wavBlob =
                  makeWavBlob(
                    combined,
                    context.sampleRate
                  );

                void sendSoundSample(
                  wavBlob
                );
              }
            };

          if (
            "Notification"
            in window
            &&
            Notification
              .permission ===
              "default"
          ) {
            void Notification
              .requestPermission();
          }

          setSoundMonitoring(
            true
          );

        } catch (
          startError
        ) {
          stopSoundAwareness();

          setError(
            startError instanceof
              Error
              ? startError
                  .message
              : "Unable to start Sound Awareness."
          );

        } finally {
          setSoundLoading(
            false
          );
        }
      },
      [
        isListening,
        sendSoundSample,
        soundLoading,
        soundMonitoring,
        stopListening,
        stopSoundAwareness,
      ]
    );


  async function sendEmergencyAlert() {
    if (
      emergencySending
    ) {
      return;
    }

    setEmergencySending(
      true
    );

    setEmergencyMessage(
      ""
    );

    setError("");

    try {
      const params =
        new URLSearchParams();

      params.set(
        "language",
        language
      );

      params.set(
        "source",
        "hearing_assistant"
      );

      params.set(
        "confirmed_by_user",
        "true"
      );

      const response =
        await api.post(
          `/care-alerts/from-action/emergency?${params.toString()}`
        );

      const result =
        unwrapResponse<any>(
          response
        );

      const status =
        String(
          result?.status
          ||
          "created"
        );

      if (
        criticalSound?.clientId
        &&
        result?.id
      ) {
        try {
          await api.patch(
            `/hearing/sound-events/by-client/${encodeURIComponent(
              criticalSound.clientId
            )}/care-alert/${result.id}`
          );
        } catch (
          linkError
        ) {
          console.warn(
            "Emergency alert was sent, but the sound-event link could not be saved:",
            linkError
          );
        }
      }

      setEmergencyMessage(
        status ===
          "sent"
          ? "Emergency alert sent to your caregiver."
          : `Emergency alert created with status: ${status}.`
      );

      setEmergencyPrompt(
        false
      );

      setCriticalSound(
        null
      );

    } catch (
      emergencyError
    ) {
      setError(
        getApiError(
          emergencyError
        )
      );

    } finally {
      setEmergencySending(
        false
      );
    }
  }


  async function copyTranscript() {
    const text =
      captions
        .map(
          (
            item
          ) => {
            if (
              item.translation
            ) {
              return (
                `${item.text}\n${item.translation}`
              );
            }

            return item.text;
          }
        )
        .join(
          "\n\n"
        );

    if (!text) {
      return;
    }

    await navigator
      .clipboard
      .writeText(
        text
      );

    setStatusMessage(
      "Transcript copied."
    );
  }


  async function saveSession() {
    if (
      captions.length ===
      0
    ) {
      return;
    }

    setError("");
    setStatusMessage(
      "Saving session..."
    );

    const payload = {
      language,

      translation_enabled:
        translationEnabled,

      translation_target:
        translationEnabled
          ? translationTarget
          : null,

      captions:
        captions.map(
          (
            item,
            index
          ) => ({
            client_id:
              item.id,

            sequence:
              index,

            text:
              item.text,

            translated_text:
              item.translation
              ||
              null,

            detected_language:
              language,

            translation_target:
              item.translation
                ? translationTarget
                : null,

            created_at:
              item.createdAt
                .toISOString(),
          })
        ),
    };

    try {
      const response =
        await api.post(
          "/hearing/sessions",
          payload
        );

      const saved =
        unwrapResponse<
          HearingSavedSessionResponse
        >(
          response
        );

      setStatusMessage(
        `Session saved to your account (${saved.id.slice(0, 8)}).`
      );

    } catch (
      saveError
    ) {
      console.warn(
        "Database session save failed. Keeping local backup:",
        saveError
      );

      try {
        const raw =
          localStorage.getItem(
            SESSION_KEY
          );

        const previous =
          raw
            ? JSON.parse(
                raw
              )
            : [];

        const fallbackSession = {
          id:
            `${Date.now()}`,

          createdAt:
            new Date()
              .toISOString(),

          language,

          translationEnabled,

          translationTarget,

          captions:
            captions.map(
              (
                item
              ) => ({
                text:
                  item.text,

                translation:
                  item.translation
                  ||
                  null,

                createdAt:
                  item.createdAt
                    .toISOString(),
              })
            ),
        };

        const next =
          [
            fallbackSession,
            ...(
              Array.isArray(
                previous
              )
                ? previous
                : []
            ),
          ].slice(
            0,
            20
          );

        localStorage.setItem(
          SESSION_KEY,
          JSON.stringify(
            next
          )
        );

        setStatusMessage(
          "Server save failed; a local backup was kept on this device."
        );

        setError(
          getApiError(
            saveError
          )
        );

      } catch {
        setError(
          "Unable to save this session to the server or this device."
        );
      }
    }
  }


  function downloadTranscript() {
    if (
      captions.length ===
      0
    ) {
      return;
    }

    const text =
      captions
        .map(
          (
            item
          ) => {
            const time =
              formatTime(
                item.createdAt
              );

            return item.translation
              ? `[${time}] ${item.text}\n${item.translation}`
              : `[${time}] ${item.text}`;
          }
        )
        .join(
          "\n\n"
        );

    const blob =
      new Blob(
        [
          text,
        ],
        {
          type:
            "text/plain;charset=utf-8",
        }
      );

    const url =
      URL.createObjectURL(
        blob
      );

    const anchor =
      document.createElement(
        "a"
      );

    anchor.href =
      url;

    anchor.download =
      `accessmate-hearing-${Date.now()}.txt`;

    anchor.click();

    URL.revokeObjectURL(
      url
    );
  }


  async function openCaptionFullscreen() {
    const element =
      captionPanelRef.current;

    if (
      !element
    ) {
      return;
    }

    try {
      if (
        document
          .fullscreenElement
      ) {
        await document
          .exitFullscreen();

        return;
      }

      await element
        .requestFullscreen();

    } catch (
      fullscreenError
    ) {
      console.error(
        "Fullscreen failed:",
        fullscreenError
      );
    }
  }


  useEffect(
    () => {
      return () => {
        stopListening();

        stopSoundAwareness();

        if (
          "speechSynthesis"
          in window
        ) {
          window
            .speechSynthesis
            .cancel();
        }
      };
    },
    [
      stopListening,
      stopSoundAwareness,
    ]
  );


  const currentCaption =
    interimCaption
    ||
    captions[
      captions.length -
        1
    ]?.text
    ||
    (
      language ===
        "ar"
        ? "الكلام سيظهر هنا عند بدء الاستماع."
        : "Speech will appear here when listening starts."
    );

  const latestFinal =
    captions[
      captions.length -
        1
    ];

  const captionClass =
    captionSize ===
      "extra"
      ? "text-[32px] md:text-[42px] leading-[1.22]"
      : captionSize ===
        "large"
      ? "text-[25px] md:text-[32px] leading-[1.28]"
      : "text-[18px] md:text-[22px] leading-[1.35]";

  const pageContrast =
    highContrast
      ? "contrast-[1.15]"
      : "";


  return (
    <main
      className={`
        hearing-assistant-page
        h-full
        min-h-0
        overflow-y-auto
        bg-[#020B14]
        px-4
        py-4
        text-white
        lg:px-5
        ${pageContrast}
      `}
    >
      <div
        className="
          mx-auto
          w-full
          max-w-[1320px]
        "
      >
        <header
          className="
            flex
            flex-col
            gap-3
            border-b
            border-[#173240]
            pb-4
            md:flex-row
            md:items-center
            md:justify-between
          "
        >
          <div
            className="
              flex
              items-start
              gap-3
            "
          >
            <div
              className="
                flex
                h-11
                w-11
                items-center
                justify-center
                rounded-2xl
                border
                border-[#38C6F4]/25
                bg-[#38C6F4]/10
                text-[#55D4FF]
              "
            >
              <Ear
                className="
                  h-[22px]
                  w-[22px]
                "
              />
            </div>

            <div>
              <h1
                className="
                  text-[22px]
                  font-bold
                "
              >
                Hearing Assistant
              </h1>

              <p
                className="
                  mt-0.5
                  text-[12px]
                  text-[#83939D]
                "
              >
                Live communication and environmental sound awareness.
              </p>
            </div>
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
                setEmergencyPrompt(
                  true
                )
              }
              className="
                inline-flex
                h-9
                items-center
                gap-2
                rounded-xl
                border
                border-red-400/25
                bg-red-500/[0.07]
                px-3
                text-[10px]
                font-bold
                text-red-300
                transition
                hover:bg-red-500/[0.12]
              "
            >
              <AlertTriangle
                className="
                  h-4
                  w-4
                "
              />

              Emergency
            </button>

            <span
              className="
                rounded-full
                border
                border-white/10
                bg-white/[0.03]
                px-2.5
                py-1
                text-[10px]
                text-[#83939D]
              "
            >
              {activeMode ===
                "conversation"
                ? (
                    isListening
                      ? (
                          isPaused
                            ? "Paused"
                            : "Listening"
                        )
                      : "Ready"
                  )
                : (
                    soundMonitoring
                      ? "Monitoring"
                      : "Ready"
                  )}
            </span>
          </div>
        </header>


        <div
          className="
            mt-3
            inline-flex
            rounded-xl
            border
            border-[#173240]
            bg-[#06121D]
            p-1
          "
        >
          <button
            type="button"
            onClick={() =>
              setActiveMode(
                "conversation"
              )
            }
            className={`
              inline-flex
              h-9
              items-center
              gap-2
              rounded-lg
              px-4
              text-[11px]
              font-semibold
              transition

              ${
                activeMode ===
                  "conversation"
                  ? "bg-[#0A799D] text-white"
                  : "text-[#83939D] hover:text-white"
              }
            `}
          >
            <AudioLines
              className="
                h-4
                w-4
              "
            />

            Conversation
          </button>

          <button
            type="button"
            onClick={() =>
              setActiveMode(
                "sound"
              )
            }
            className={`
              inline-flex
              h-9
              items-center
              gap-2
              rounded-lg
              px-4
              text-[11px]
              font-semibold
              transition

              ${
                activeMode ===
                  "sound"
                  ? "bg-[#0A799D] text-white"
                  : "text-[#83939D] hover:text-white"
              }
            `}
          >
            <Radio
              className="
                h-4
                w-4
              "
            />

            Sound Awareness
          </button>
        </div>


        {(
          error
          ||
          statusMessage
          ||
          emergencyMessage
        ) && (
          <div
            className={`
              mt-3
              rounded-xl
              border
              px-4
              py-2.5
              text-[11px]

              ${
                error
                  ? "border-red-400/20 bg-red-500/[0.06] text-red-300"
                  : "border-[#55D4FF]/20 bg-[#55D4FF]/[0.05] text-[#A7E9FF]"
              }
            `}
          >
            {error
              ||
              emergencyMessage
              ||
              statusMessage}
          </div>
        )}


        {activeMode ===
          "conversation" ? (
          <section
            className="
              mt-3
              grid
              min-h-0
              gap-3
              xl:grid-cols-[minmax(0,1fr)_310px]
            "
          >
            <div
              className="
                space-y-3
              "
            >
              <div
                className="
                  overflow-hidden
                  rounded-[22px]
                  border
                  border-[#173240]
                  bg-[#06121D]
                "
              >
                <div
                  className="
                    flex
                    items-center
                    justify-between
                    border-b
                    border-[#173240]
                    px-4
                    py-3
                  "
                >
                  <div
                    className="
                      flex
                      items-center
                      gap-3
                    "
                  >
                    <AudioLines
                      className="
                        h-5
                        w-5
                        text-[#55D4FF]
                      "
                    />

                    <div>
                      <p
                        className="
                          text-[12px]
                          font-bold
                        "
                      >
                        LIVE CONVERSATION
                      </p>

                      <p
                        className="
                          mt-0.5
                          text-[9px]
                          text-[#657782]
                        "
                      >
                        Speech appears here in real time
                      </p>
                    </div>
                  </div>

                  <div
                    className="
                      flex
                      items-center
                      gap-2
                    "
                  >
                    {lastLatency !==
                      null && (
                      <span
                        className="
                          text-[9px]
                          text-[#657782]
                        "
                      >
                        STT {lastLatency} ms
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        void openCaptionFullscreen()
                      }
                      className="
                        flex
                        h-8
                        w-8
                        items-center
                        justify-center
                        rounded-lg
                        border
                        border-white/10
                        text-[#83939D]
                        transition
                        hover:border-[#55D4FF]/25
                        hover:text-[#83E2FF]
                      "
                      aria-label="Fullscreen captions"
                    >
                      <Maximize2
                        className="
                          h-3.5
                          w-3.5
                        "
                      />
                    </button>
                  </div>
                </div>


                <div
                  ref={
                    captionPanelRef
                  }
                  className="
                    hearing-caption-panel
                    flex
                    min-h-[clamp(300px,38vh,360px)]
                    flex-col
                    justify-center
                    bg-[#06121D]
                    px-5
                    py-7
                    md:px-8
                  "
                >
                  <div
                    dir={
                      language ===
                        "ar"
                        ? "rtl"
                        : "ltr"
                    }
                    aria-live="polite"
                    className={`
                      mx-auto
                      max-w-[1000px]
                      text-center
                      font-semibold
                      text-[#F2FAFD]
                      ${captionClass}

                      ${
                        interimCaption
                          ? "opacity-75"
                          : ""
                      }
                    `}
                  >
                    {(interimCaption || captions.length > 0) ? (
                      <span data-no-translate="true">
                        {currentCaption}
                      </span>
                    ) : (
                      currentCaption
                    )}
                  </div>

                  {(
                    !interimCaption
                    &&
                    translationEnabled
                    &&
                    latestFinal
                  ) && (
                    <div
                      dir={
                        translationTarget ===
                          "ar"
                          ? "rtl"
                          : "ltr"
                      }
                      className="
                        mx-auto
                        mt-4
                        max-w-[950px]
                        text-center
                        text-[17px]
                        font-medium
                        leading-7
                        text-[#77DDFE]
                      "
                    >
                      {latestFinal.translating ? (
                        "Translating…"
                      ) : latestFinal.translationError ? (
                        "Translation unavailable"
                      ) : (
                        <span data-no-translate="true">
                          {latestFinal.translation || ""}
                        </span>
                      )}
                    </div>
                  )}

                  <div
                    className="
                      mt-6
                      flex
                      justify-center
                    "
                  >
                    <span
                      className="
                        inline-flex
                        items-center
                        gap-2
                        rounded-full
                        bg-[#55D4FF]/10
                        px-3
                        py-1.5
                        text-[10px]
                        font-semibold
                        text-[#83E2FF]
                      "
                    >
                      <Mic
                        className="
                          h-4
                          w-4
                        "
                      />

                      {isListening
                        ? (
                            isPaused
                              ? "Microphone paused"
                              : engine ===
                                  "browser"
                              ? "Live streaming"
                              : "Whisper listening"
                          )
                        : "Microphone off"}
                    </span>
                  </div>
                </div>


                <div
                  className="
                    flex
                    flex-wrap
                    justify-center
                    gap-2
                    border-t
                    border-[#173240]
                    px-4
                    py-3
                  "
                >
                  {!isListening ? (
                    <button
                      type="button"
                      onClick={() =>
                        void startListening()
                      }
                      className="
                        inline-flex
                        h-10
                        items-center
                        gap-2
                        rounded-xl
                        bg-[#087EA4]
                        px-4
                        text-[11px]
                        font-bold
                        hover:bg-[#0994BF]
                      "
                    >
                      <Play
                        className="
                          h-4
                          w-4
                        "
                      />

                      Start Listening
                    </button>
                  ) : (
                    <>
                      {isPaused ? (
                        <button
                          type="button"
                          onClick={() =>
                            void resumeListening()
                          }
                          className="
                            inline-flex
                            h-10
                            items-center
                            gap-2
                            rounded-xl
                            bg-[#087EA4]
                            px-4
                            text-[11px]
                            font-bold
                          "
                        >
                          <Play
                            className="
                              h-4
                              w-4
                            "
                          />

                          Resume
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={
                            pauseListening
                          }
                          className="
                            inline-flex
                            h-10
                            items-center
                            gap-2
                            rounded-xl
                            border
                            border-[#55D4FF]/25
                            px-4
                            text-[11px]
                            font-bold
                            text-[#83E2FF]
                          "
                        >
                          <Pause
                            className="
                              h-4
                              w-4
                            "
                          />

                          Pause
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={
                          stopListening
                        }
                        className="
                          inline-flex
                          h-10
                          items-center
                          gap-2
                          rounded-xl
                          border
                          border-red-400/20
                          px-4
                          text-[11px]
                          font-bold
                          text-red-300
                        "
                      >
                        <CircleStop
                          className="
                            h-4
                            w-4
                          "
                        />

                        Stop
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setCaptions(
                        []
                      );

                      lastCaptionTextRef.current =
                        "";

                      setInterimCaption(
                        ""
                      );
                    }}
                    className="
                      inline-flex
                      h-10
                      items-center
                      gap-2
                      rounded-xl
                      border
                      border-white/10
                      px-3.5
                      text-[11px]
                      text-[#9BACB6]
                    "
                  >
                    <Trash2
                      className="
                        h-4
                        w-4
                      "
                    />

                    Clear
                  </button>
                </div>
              </div>


              <div
                className="
                  rounded-[20px]
                  border
                  border-[#173240]
                  bg-[#06121D]
                  p-4
                "
              >
                <div
                  className="
                    flex
                    items-center
                    justify-between
                    gap-3
                  "
                >
                  <div>
                    <p
                      className="
                        text-[12px]
                        font-bold
                        tracking-[0.02em]
                        text-white
                      "
                    >
                      {language === "ar" ? "اكتب ليتم النطق" : "TYPE TO SPEAK"}
                    </p>

                    <p
                      className="
                        mt-1
                        text-[10px]
                        leading-4
                        text-[#718793]
                      "
                    >
                      {language === "ar"
                        ? "اكتب ردك وسيقوم AccessMate بنطقه بصوت واضح."
                        : "Type a reply and AccessMate will speak it aloud."}
                    </p>
                  </div>

                  <div
                    className="
                      flex
                      h-8
                      w-8
                      shrink-0
                      items-center
                      justify-center
                      rounded-lg
                      border
                      border-[#55D4FF]/15
                      bg-[#55D4FF]/[0.06]
                    "
                  >
                    <Volume2
                      className="
                        h-4
                        w-4
                        text-[#55D4FF]
                      "
                    />
                  </div>
                </div>

                <div className="mt-3 space-y-3">
                  <textarea
                    value={replyText}
                    onChange={(event) => setReplyText(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        speakReply();
                      }
                    }}
                    rows={3}
                    dir={language === "ar" ? "rtl" : "ltr"}
                    placeholder={
                      language === "ar" ? "اكتب الرد هنا..." : "Type your reply..."
                    }
                    className="
                      hearing-reply-textarea
                      min-h-[88px]
                      w-full
                      resize-none
                      rounded-[14px]
                      border
                      border-[#1A3948]
                      bg-[#020B14]
                      px-4
                      py-3.5
                      text-[14px]
                      font-medium
                      leading-6
                      text-[#EAF7FC]
                      outline-none
                      transition-colors
                      duration-150
                      placeholder:font-normal
                      placeholder:text-[#526873]
                    "
                  />

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setReplyText("");
                        stopSpeaking();
                      }}
                      disabled={!replyText && !isSpeaking}
                      className="
                        inline-flex
                        h-10
                        min-w-[94px]
                        items-center
                        justify-center
                        gap-2
                        whitespace-nowrap
                        rounded-xl
                        border
                        border-white/10
                        bg-white/[0.025]
                        px-4
                        text-[11px]
                        font-semibold
                        text-[#A9BBC4]
                        transition
                        hover:border-[#55D4FF]/25
                        hover:bg-[#55D4FF]/[0.05]
                        hover:text-white
                        disabled:cursor-not-allowed
                        disabled:opacity-30
                      "
                      aria-label={language === "ar" ? "مسح النص" : "Clear text"}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {language === "ar" ? "مسح" : "Clear"}
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={stopSpeaking}
                        disabled={!isSpeaking}
                        className="
                          inline-flex
                          h-10
                          min-w-[94px]
                          items-center
                          justify-center
                          gap-2
                          whitespace-nowrap
                          rounded-xl
                          border
                          border-white/10
                          bg-white/[0.025]
                          px-4
                          text-[11px]
                          font-semibold
                          text-[#9BACB6]
                          transition
                          hover:border-white/20
                          hover:bg-white/[0.05]
                          hover:text-white
                          disabled:cursor-not-allowed
                          disabled:opacity-30
                        "
                      >
                        <VolumeX className="h-3.5 w-3.5" />
                        {language === "ar" ? "إيقاف" : "Stop"}
                      </button>

                      <button
                        type="button"
                        onClick={speakReply}
                        disabled={!replyText.trim() || isSpeaking}
                        className="
                          inline-flex
                          h-10
                          min-w-[122px]
                          items-center
                          justify-center
                          gap-2
                          whitespace-nowrap
                          rounded-xl
                          border
                          border-[#55D4FF]/35
                          bg-[#087EA4]
                          px-4
                          text-[11px]
                          font-bold
                          text-white
                          shadow-[0_8px_24px_rgba(8,126,164,0.18)]
                          transition
                          hover:bg-[#0A8DB7]
                          active:translate-y-px
                          disabled:cursor-not-allowed
                          disabled:opacity-40
                        "
                      >
                        <Volume2 className="h-3.5 w-3.5" />
                        {language === "ar" ? "تشغيل الصوت" : "Speak"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>


            <aside
              className="
                space-y-3
              "
            >
              <div
                className="
                  rounded-[20px]
                  border
                  border-[#173240]
                  bg-[#06121D]
                  p-4
                "
              >
                <p
                  className="
                    text-[11px]
                    font-bold
                  "
                >
                  Caption Settings
                </p>

                <p
                  className="
                    mt-4
                    text-[9px]
                    font-semibold
                    uppercase
                    tracking-[0.12em]
                    text-[#657782]
                  "
                >
                  Spoken language
                </p>

                <div
                  className="
                    mt-2
                    grid
                    grid-cols-2
                    gap-1.5
                  "
                >
                  {(
                    [
                      [
                        "en",
                        "English",
                      ],
                      [
                        "ar",
                        "العربية",
                      ],
                    ] as const
                  ).map(
                    (
                      [
                        value,
                        label,
                      ]
                    ) => (
                      <button
                        key={
                          value
                        }
                        type="button"
                        disabled={
                          isListening
                        }
                        onClick={() =>
                          setLanguage(
                            value
                          )
                        }
                        className={`
                          h-9
                          rounded-xl
                          border
                          text-[10px]
                          font-semibold
                          disabled:opacity-40

                          ${
                            language ===
                              value
                              ? "border-[#55D4FF]/35 bg-[#55D4FF]/10 text-[#83E2FF]"
                              : "border-white/10 text-[#83939D]"
                          }
                        `}
                      >
                        {label}
                      </button>
                    )
                  )}
                </div>


                <p
                  className="
                    mt-4
                    text-[9px]
                    font-semibold
                    uppercase
                    tracking-[0.12em]
                    text-[#657782]
                  "
                >
                  Caption size
                </p>

                <div
                  className="
                    mt-2
                    grid
                    grid-cols-3
                    gap-1.5
                  "
                >
                  {(
                    [
                      [
                        "normal",
                        "Normal",
                      ],
                      [
                        "large",
                        "Large",
                      ],
                      [
                        "extra",
                        "XL",
                      ],
                    ] as const
                  ).map(
                    (
                      [
                        value,
                        label,
                      ]
                    ) => (
                      <button
                        key={
                          value
                        }
                        type="button"
                        onClick={() =>
                          setCaptionSize(
                            value
                          )
                        }
                        className={`
                          h-9
                          rounded-xl
                          border
                          text-[9px]
                          font-semibold

                          ${
                            captionSize ===
                              value
                              ? "border-[#55D4FF]/35 bg-[#55D4FF]/10 text-[#83E2FF]"
                              : "border-white/10 text-[#83939D]"
                          }
                        `}
                      >
                        {label}
                      </button>
                    )
                  )}
                </div>


                <div
                  className="
                    mt-4
                    border-t
                    border-white/[0.06]
                    pt-4
                  "
                >
                  <div
                    className="
                      flex
                      items-center
                      justify-between
                      gap-3
                    "
                  >
                    <div
                      className="
                        flex
                        items-center
                        gap-2
                      "
                    >
                      <Languages
                        className="
                          h-4
                          w-4
                          text-[#55D4FF]
                        "
                      />

                      <div>
                        <p
                          className="
                            text-[10px]
                            font-semibold
                          "
                        >
                          Live Translation
                        </p>

                        <p
                          className="
                            text-[8px]
                            text-[#657782]
                          "
                        >
                          Translate final captions
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setTranslationEnabled(
                          (
                            value
                          ) =>
                            !value
                        )
                      }
                      className={`
                        h-7
                        rounded-full
                        border
                        px-3
                        text-[9px]
                        font-bold

                        ${
                          translationEnabled
                            ? "border-[#55D4FF]/35 bg-[#55D4FF]/10 text-[#83E2FF]"
                            : "border-white/10 text-[#657782]"
                        }
                      `}
                    >
                      {translationEnabled
                        ? "ON"
                        : "OFF"}
                    </button>
                  </div>

                  {translationEnabled && (
                    <div
                      className="
                        mt-3
                        grid
                        grid-cols-2
                        gap-1.5
                      "
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setTranslationTarget(
                            "en"
                          )
                        }
                        className={`
                          h-8
                          rounded-lg
                          border
                          text-[9px]

                          ${
                            translationTarget ===
                              "en"
                              ? "border-[#55D4FF]/35 bg-[#55D4FF]/10 text-[#83E2FF]"
                              : "border-white/10 text-[#657782]"
                          }
                        `}
                      >
                        To English
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setTranslationTarget(
                            "ar"
                          )
                        }
                        className={`
                          h-8
                          rounded-lg
                          border
                          text-[9px]

                          ${
                            translationTarget ===
                              "ar"
                              ? "border-[#55D4FF]/35 bg-[#55D4FF]/10 text-[#83E2FF]"
                              : "border-white/10 text-[#657782]"
                          }
                        `}
                      >
                        إلى العربية
                      </button>
                    </div>
                  )}
                </div>
              </div>


              <div
                className="
                  rounded-[20px]
                  border
                  border-[#173240]
                  bg-[#06121D]
                  p-4
                "
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-white">
                      Session Transcript
                    </p>
                    <p className="mt-0.5 text-[9px] text-[#657782]">
                      {captions.length} captions
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    disabled={captions.length === 0}
                    onClick={saveSession}
                    className="
                      inline-flex
                      h-9
                      min-w-0
                      flex-1
                      items-center
                      justify-center
                      gap-2
                      whitespace-nowrap
                      rounded-xl
                      border
                      border-[#55D4FF]/35
                      bg-[#0B7FA5]
                      px-3
                      text-[10px]
                      font-bold
                      text-white
                      shadow-[0_8px_22px_rgba(8,126,164,0.16)]
                      transition
                      hover:bg-[#0A8DB7]
                      disabled:cursor-not-allowed
                      disabled:opacity-40
                    "
                    aria-label="Save session"
                    title={
                      captions.length === 0
                        ? "Add at least one caption before saving"
                        : "Save this hearing session to your account"
                    }
                  >
                    <Save className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">
                      {language === "ar" ? "حفظ الجلسة" : "Save Session"}
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={captions.length === 0}
                    onClick={() => void copyTranscript()}
                    className="
                      inline-flex
                      h-9
                      w-9
                      shrink-0
                      items-center
                      justify-center
                      rounded-xl
                      border
                      border-white/10
                      bg-white/[0.02]
                      text-[#9BACB6]
                      transition
                      hover:border-[#55D4FF]/25
                      hover:bg-[#55D4FF]/[0.06]
                      hover:text-[#83E2FF]
                      disabled:cursor-not-allowed
                      disabled:opacity-30
                    "
                    aria-label="Copy transcript"
                    title="Copy transcript"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    disabled={captions.length === 0}
                    onClick={downloadTranscript}
                    className="
                      inline-flex
                      h-9
                      w-9
                      shrink-0
                      items-center
                      justify-center
                      rounded-xl
                      border
                      border-white/10
                      bg-white/[0.02]
                      text-[#9BACB6]
                      transition
                      hover:border-[#55D4FF]/25
                      hover:bg-[#55D4FF]/[0.06]
                      hover:text-[#83E2FF]
                      disabled:cursor-not-allowed
                      disabled:opacity-30
                    "
                    aria-label="Download transcript"
                    title="Download transcript"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div
                  className="
                    mt-3
                    max-h-[220px]
                    space-y-2
                    overflow-y-auto
                    pr-1
                  "
                >
                  {captions.length ===
                    0 ? (
                    <div
                      className="
                        rounded-xl
                        border
                        border-dashed
                        border-white/10
                        px-3
                        py-4
                        text-center
                        text-[9px]
                        text-[#52616A]
                      "
                    >
                      No captions yet.
                    </div>
                  ) : (
                    captions
                      .slice()
                      .reverse()
                      .map(
                        (
                          item
                        ) => (
                          <div
                            key={
                              item.id
                            }
                            className="
                              rounded-xl
                              bg-white/[0.025]
                              px-3
                              py-2.5
                            "
                          >
                            <p
                              data-no-translate="true"
                              dir={
                                language ===
                                  "ar"
                                  ? "rtl"
                                  : "ltr"
                              }
                              className="
                                text-[10px]
                                leading-4
                                text-[#C7D5DC]
                              "
                            >
                              {item.text}
                            </p>

                            {item.translation && (
                              <p
                                data-no-translate="true"
                                dir={
                                  translationTarget ===
                                    "ar"
                                    ? "rtl"
                                    : "ltr"
                                }
                                className="
                                  mt-1.5
                                  text-[9px]
                                  leading-4
                                  text-[#6EDCFF]
                                "
                              >
                                {item.translation}
                              </p>
                            )}

                            <p
                              className="
                                mt-1
                                text-[8px]
                                text-[#52616A]
                              "
                            >
                              {formatTime(
                                item.createdAt
                              )}
                            </p>
                          </div>
                        )
                      )
                  )}
                </div>
              </div>
            </aside>
          </section>
        ) : (
          <section
            className="
              mt-3
              grid
              gap-3
              xl:grid-cols-[minmax(0,1fr)_340px]
            "
          >
            <div
              className="
                rounded-[22px]
                border
                border-[#173240]
                bg-[#06121D]
                p-5
              "
            >
              <div
                className="
                  flex
                  flex-col
                  gap-4
                  md:flex-row
                  md:items-center
                  md:justify-between
                "
              >
                <div>
                  <div
                    className="
                      flex
                      items-center
                      gap-3
                    "
                  >
                    <Activity
                      className="
                        h-5
                        w-5
                        text-[#55D4FF]
                      "
                    />

                    <h2
                      className="
                        text-[15px]
                        font-bold
                      "
                    >
                      SOUND AWARENESS
                    </h2>
                  </div>

                  <p
                    className="
                      mt-1
                      text-[10px]
                      leading-5
                      text-[#657782]
                    "
                  >
                    YAMNet monitors important environmental sounds and creates visual alerts.
                  </p>
                </div>

                {!soundMonitoring ? (
                  <button
                    type="button"
                    onClick={() =>
                      void startSoundAwareness()
                    }
                    disabled={
                      soundLoading
                    }
                    className="
                      inline-flex
                      h-10
                      items-center
                      justify-center
                      gap-2
                      rounded-xl
                      bg-[#087EA4]
                      px-4
                      text-[11px]
                      font-bold
                      disabled:opacity-50
                    "
                  >
                    <Radio
                      className={`
                        h-4
                        w-4

                        ${
                          soundLoading
                            ? "animate-pulse"
                            : ""
                        }
                      `}
                    />

                    {soundLoading
                      ? "Initializing…"
                      : "Start Monitoring"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={
                      stopSoundAwareness
                    }
                    className="
                      inline-flex
                      h-10
                      items-center
                      justify-center
                      gap-2
                      rounded-xl
                      border
                      border-red-400/20
                      px-4
                      text-[11px]
                      font-bold
                      text-red-300
                    "
                  >
                    <Square
                      className="
                        h-4
                        w-4
                      "
                    />

                    Stop Monitoring
                  </button>
                )}
              </div>


              <div
                className={`
                  mt-5
                  rounded-[20px]
                  border
                  px-5
                  py-7
                  text-center

                  ${
                    soundMonitoring
                      ? "border-[#55D4FF]/25 bg-[#55D4FF]/[0.045]"
                      : "border-white/10 bg-black/10"
                  }
                `}
              >
                <div
                  className="
                    mx-auto
                    flex
                    h-14
                    w-14
                    items-center
                    justify-center
                    rounded-full
                    border
                    border-[#55D4FF]/20
                    bg-[#55D4FF]/10
                  "
                >
                  <Radio
                    className={`
                      h-6
                      w-6
                      text-[#55D4FF]

                      ${
                        soundMonitoring
                          ? "animate-pulse"
                          : ""
                      }
                    `}
                  />
                </div>

                <p
                  className="
                    mt-4
                    text-[18px]
                    font-bold
                  "
                >
                  {soundMonitoring
                    ? "Listening to the environment"
                    : "Sound monitoring is off"}
                </p>

                <p
                  className="
                    mx-auto
                    mt-1
                    max-w-lg
                    text-[10px]
                    leading-5
                    text-[#657782]
                  "
                >
                  Important sounds require repeated detection unless confidence is very high, reducing accidental alerts.
                </p>
              </div>


              <div
                className="
                  mt-4
                  grid
                  grid-cols-2
                  gap-2
                  md:grid-cols-3
                "
              >
                {SOUND_CARDS.map(
                  (
                    item
                  ) => {
                    const score =
                      liveSoundScores[
                        item.key
                      ]
                      ||
                      0;

                    const active =
                      score >=
                      SOUND_THRESHOLD;

                    return (
                      <div
                        key={
                          item.key
                        }
                        className={`
                          rounded-xl
                          border
                          p-3
                          transition

                          ${
                            active
                              ? "border-[#55D4FF]/35 bg-[#55D4FF]/[0.06]"
                              : "border-white/[0.08] bg-black/10"
                          }
                        `}
                      >
                        <div
                          className="
                            flex
                            items-center
                            justify-between
                            gap-2
                          "
                        >
                          <span
                            className="
                              text-[22px]
                            "
                          >
                            {item.icon}
                          </span>

                          <span
                            className="
                              text-[9px]
                              text-[#657782]
                            "
                          >
                            {Math.round(
                              score *
                                100
                            )}%
                          </span>
                        </div>

                        <p
                          className="
                            mt-2
                            text-[11px]
                            font-semibold
                          "
                        >
                          {item.label}
                        </p>

                        <div
                          className="
                            mt-2
                            h-1
                            overflow-hidden
                            rounded-full
                            bg-white/[0.06]
                          "
                        >
                          <div
                            className="
                              h-full
                              rounded-full
                              bg-[#55D4FF]
                            "
                            style={{
                              width:
                                `${Math.min(
                                  100,
                                  score *
                                    100
                                )}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </div>


            <aside
              className="
                space-y-3
              "
            >
              <div
                className="
                  rounded-[20px]
                  border
                  border-[#173240]
                  bg-[#06121D]
                  p-4
                "
              >
                <div
                  className="
                    flex
                    items-center
                    justify-between
                  "
                >
                  <div>
                    <p
                      className="
                        text-[11px]
                        font-bold
                      "
                    >
                      Recent Sound Alerts
                    </p>

                    <p
                      className="
                        mt-0.5
                        text-[9px]
                        text-[#657782]
                      "
                    >
                      {soundEvents.length} detected events
                    </p>
                  </div>

                  <Bell
                    className="
                      h-4
                      w-4
                      text-[#55D4FF]
                    "
                  />
                </div>

                <div
                  className="
                    mt-3
                    max-h-[390px]
                    space-y-2
                    overflow-y-auto
                  "
                >
                  {soundEvents.length ===
                    0 ? (
                    <div
                      className="
                        rounded-xl
                        border
                        border-dashed
                        border-white/10
                        px-3
                        py-6
                        text-center
                        text-[9px]
                        text-[#52616A]
                      "
                    >
                      No important sounds detected yet.
                    </div>
                  ) : (
                    soundEvents.map(
                      (
                        item
                      ) => (
                        <div
                          key={
                            item.id
                          }
                          className="
                            rounded-xl
                            border
                            border-white/[0.07]
                            bg-black/10
                            px-3
                            py-3
                          "
                        >
                          <div
                            className="
                              flex
                              items-center
                              justify-between
                              gap-2
                            "
                          >
                            <p
                              className="
                                text-[10px]
                                font-semibold
                                text-[#DCE8ED]
                              "
                            >
                              {item.label}
                            </p>

                            <span
                              className="
                                text-[8px]
                                text-[#52616A]
                              "
                            >
                              {formatTime(
                                item.createdAt
                              )}
                            </span>
                          </div>

                          <p
                            className="
                              mt-1
                              text-[9px]
                              text-[#657782]
                            "
                          >
                            Confidence{" "}
                            {Math.round(
                              item.confidence *
                                100
                            )}%
                          </p>
                        </div>
                      )
                    )
                  )}
                </div>
              </div>
            </aside>
          </section>
        )}


        {(
          emergencyPrompt
          ||
          criticalSound
        ) && (
          <div
            className="
              fixed
              inset-0
              z-[120]
              flex
              items-center
              justify-center
              bg-black/75
              p-5
              backdrop-blur-sm
            "
            role="dialog"
            aria-modal="true"
            aria-label="Emergency confirmation"
          >
            <div
              className="
                w-full
                max-w-[430px]
                rounded-[24px]
                border
                border-red-400/25
                bg-[#09121C]
                p-6
                shadow-[0_30px_100px_rgba(0,0,0,0.7)]
              "
            >
              <div
                className="
                  flex
                  h-12
                  w-12
                  items-center
                  justify-center
                  rounded-full
                  bg-red-500/10
                  text-red-300
                "
              >
                <AlertTriangle
                  className="
                    h-6
                    w-6
                  "
                />
              </div>

              <h2
                className="
                  mt-4
                  text-[19px]
                  font-bold
                "
              >
                Emergency Assistance
              </h2>

              <p
                className="
                  mt-2
                  text-[11px]
                  leading-6
                  text-[#87969F]
                "
              >
                {criticalSound
                  ? `${criticalSound.label} was detected. Do you want to alert your caregiver?`
                  : "Do you want AccessMate to send an emergency care alert to your caregiver?"}
              </p>

              <div
                className="
                  mt-5
                  flex
                  gap-2
                "
              >
                <button
                  type="button"
                  onClick={() =>
                    void sendEmergencyAlert()
                  }
                  disabled={
                    emergencySending
                  }
                  className="
                    inline-flex
                    h-10
                    flex-1
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    bg-red-500
                    px-4
                    text-[11px]
                    font-bold
                    text-white
                    disabled:opacity-50
                  "
                >
                  <Send
                    className="
                      h-4
                      w-4
                    "
                  />

                  {emergencySending
                    ? "Sending…"
                    : "Send Alert"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEmergencyPrompt(
                      false
                    );

                    setCriticalSound(
                      null
                    );
                  }}
                  className="
                    h-10
                    rounded-xl
                    border
                    border-white/10
                    px-4
                    text-[11px]
                    font-semibold
                    text-[#9BACB6]
                  "
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>


      <style>
        {`
          .hearing-caption-panel:fullscreen {
            width: 100vw;
            height: 100vh;
            min-height: 100vh;
            padding: 8vh 8vw;
            background: #020B14;
          }

          .hearing-caption-panel:fullscreen > div:first-child {
            font-size: clamp(42px, 6vw, 88px);
            line-height: 1.2;
            max-width: 1400px;
          }

          .hearing-reply-textarea:focus,
          .hearing-reply-textarea:focus-visible {
            outline: none !important;
            box-shadow: none !important;
            border-color: #173240 !important;
          }
        `}
      </style>
    </main>
  );
}
