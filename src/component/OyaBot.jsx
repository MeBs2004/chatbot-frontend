import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import axios from "axios";

// Phase 14 — none of this file's axios calls had a timeout, so a
// hung backend/network request could leave the widget waiting
// indefinitely with no visible failure. 60s comfortably covers a
// real (if slow) AI reply without cutting off legitimate responses.
axios.defaults.timeout = 60000;

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import logo from "../assets/oya-logo.png";
import logo1 from "../assets/oya-logo1.png";
import useSpeechRecognition from "../hooks/useSpeechRecognition";
import useTextToSpeech from "../hooks/useTextToSpeech";
import {
  primeNotificationSound,
  playBotReplySound,
} from "../utils/notificationSound";
import {
  FaTimes,
  FaPaperPlane,
  FaPaperclip,
  FaTrash,
  FaWhatsapp,
  FaEnvelope,
  FaPhoneAlt,
  FaChevronDown,
  FaRedo,
  FaCopy,
  FaCheck,
  FaMicrophone,
  FaStop,
  FaVolumeUp,
  FaVolumeMute,
} from "react-icons/fa";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const OYA_DARK = "#5E0F28";
const OYA_MID = "#8C2346";
const OYA_GOLD = "#B8865B";
const OYA_CHAMPAGNE = "#F3D6B6";

// Launcher-only luxury palette (does not affect the opened chatbot's styling)
const LAUNCHER_LUX_PRIMARY = "#C9A227";
const LAUNCHER_LUX_ACCENT = "#D4AF37";
const LAUNCHER_LUX_SOFT_GOLD = "#E7C873";
const LAUNCHER_LUX_CREAM = "#FFFDF8";
const LAUNCHER_LUX_TEXT = "#2E2E2E";

// Public Widget Config Integration — a safe, minimal shape used only
// when bot/v1/company fails or times out. Before this fix, a failed
// fetch left `company` (and therefore `theme`) permanently null, which
// blocked the launcher from ever rendering at all (see the `!company ||
// !theme` gate below) — a real, silent, total-widget-outage bug. This
// keeps every existing `company.X`/`theme.X` read in this file safe
// without touching each call site, using the same brand colors this
// file already hardcodes elsewhere as literals.
const FALLBACK_COMPANY = {
  theme: {
    primaryColor: OYA_DARK,
    backgroundColor: "#fffaf5",
    botBubbleColor: "#fdf3e7",
    textColor: "#2e2e2e",
  },
  branding: { botAvatar: null },
  chatbot: { chatbotName: "OYA Assistant", botName: "OYA" },
  contact: {},
};

const OYA_SERVICE_CHIPS = [
  "Natural Gemstones",
  "Premium Jewellery",
  "Personalized Reco",
  "Book Appointment",
  "Customer Support",
];

// ── Launcher greeting bubble ──────────────────────────────────────────────
const OYA_LAUNCHER_MESSAGES = [
  "✨ Welcome to OYA",
  "💎 Looking for timeless jewellery?",
  "✨ Find your perfect sparkle",
  "💍 Discover handcrafted elegance",
  "✨ Explore our latest collection",
  "💎 Looking for the perfect gift?",
  "✨ Need styling advice?",
  "💍 Let's find something beautiful",
  "✨ Browse rings, earrings & necklaces",
  "💎 Ask me anything about OYA",
  "✨ Your jewellery assistant is here",
];

function pickNextLauncherMessage(lastMessage) {
  if (OYA_LAUNCHER_MESSAGES.length <= 1) return OYA_LAUNCHER_MESSAGES[0];

  let next;

  do {
    next =
      OYA_LAUNCHER_MESSAGES[
        Math.floor(Math.random() * OYA_LAUNCHER_MESSAGES.length)
      ];
  } while (next === lastMessage);

  return next;
}

const GLOBAL_STYLES = `
  @keyframes botEnter {
    0%   { opacity: 0; transform: translateY(24px) scale(0.94); }
    65%  { opacity: 1; transform: translateY(-3px)  scale(1.01); }
    100% { opacity: 1; transform: translateY(0)      scale(1);   }
  }
  @keyframes msgSlide {
    from { opacity: 0; transform: translateY(9px); }
    to   { opacity: 1; transform: translateY(0);   }
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0);   }
  }
  @keyframes oyaLauncherFloat {
    0%   { transform: translateY(0); }
    25%  { transform: translateY(-8px); }
    50%  { transform: translateY(0); }
    75%  { transform: translateY(8px); }
    100% { transform: translateY(0); }
  }
  @keyframes oyaLauncherBreathe {
    0%, 100% { transform: scale(1); }
    50%      { transform: scale(1.03); }
  }
  @keyframes oyaLauncherGlow {
    0%, 100% { box-shadow: 0 0 0 rgba(212, 175, 55, 0); }
    6%       { box-shadow: 0 0 22px 6px rgba(212, 175, 55, 0.4); }
    14%      { box-shadow: 0 0 0 rgba(212, 175, 55, 0); }
  }
  @keyframes oyaBubbleEnter {
    from { opacity: 0; transform: translateY(10px) scale(0.95); }
    to   { opacity: 1; transform: translateY(0)    scale(1);    }
  }
  @keyframes oyaBubbleExit {
    from { opacity: 1; transform: translateY(0)    scale(1);    }
    to   { opacity: 0; transform: translateY(10px) scale(0.95); }
  }
  @keyframes oyaLauncherHalo {
    0%   { transform: scale(0.9);  opacity: 0.4;  }
    50%  { transform: scale(1.25); opacity: 0.18; }
    100% { transform: scale(1.5);  opacity: 0;    }
  }
  @keyframes oyaLauncherShimmer {
    0%, 88% { background-position: -120% -120%; opacity: 0;   }
    92%     { opacity: 0.7; }
    100%    { background-position: 220% 220%;   opacity: 0;   }
  }
  @keyframes oyaSparkleFade {
    0%, 100% { opacity: 0;    transform: scale(0.4); }
    50%      { opacity: 0.85; transform: scale(1);   }
  }
  @keyframes oyaLauncherEntrance {
    from { opacity: 0; transform: translateY(24px) scale(0.9); }
    to   { opacity: 1; transform: translateY(0)     scale(1);   }
  }

  .bot-enter { animation: botEnter 0.44s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
  .msg-enter { animation: msgSlide 0.22s ease forwards; }
  .fade-up   { animation: fadeUp   0.28s ease forwards; }

  .oya-launcher-float     { animation: oyaLauncherFloat 4.5s ease-in-out infinite; }
  .oya-launcher-breathe   { animation: oyaLauncherBreathe 5.5s ease-in-out infinite; }
  .oya-launcher-glow      { animation: oyaLauncherGlow 8s ease-in-out infinite; }
  .oya-launcher-halo      { animation: oyaLauncherHalo 3.4s ease-out infinite; filter: blur(6px); }
  .oya-launcher-shimmer   {
    animation: oyaLauncherShimmer 9s ease-in-out infinite;
    background: linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.85) 50%, transparent 70%);
    background-size: 250% 250%;
  }
  .oya-launcher-entrance  { animation: oyaLauncherEntrance 0.6s ease-out forwards; }
  .oya-sparkle            { animation: oyaSparkleFade var(--dur, 4s) ease-in-out infinite; animation-delay: var(--delay, 0s); }
  .oya-bubble-enter       { animation: oyaBubbleEnter 0.3s ease forwards; }
  .oya-bubble-exit        { animation: oyaBubbleExit 0.3s ease forwards; }

  @media (prefers-reduced-motion: reduce) {
    .oya-launcher-float,
    .oya-launcher-breathe,
    .oya-launcher-glow,
    .oya-launcher-halo,
    .oya-launcher-shimmer,
    .oya-launcher-entrance,
    .oya-sparkle,
    .oya-bubble-enter,
    .oya-bubble-exit {
      animation: none !important;
    }
  }

  .chat-scroll {
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
  }
  .chat-scroll::-webkit-scrollbar       { width: 3px; }
  .chat-scroll::-webkit-scrollbar-track { background: transparent; }
  .chat-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 99px; }
  .chat-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

  .bot-footer { padding-bottom: max(16px, env(safe-area-inset-bottom)); }

  .oya-ctrl:focus-visible {
    outline: 2px solid ${OYA_GOLD};
    outline-offset: 2px;
  }

  .lang-select option {
    background: #ffffff;
    color: #1e293b;
    font-weight: 500;
  }

  @media (max-width: 480px) {
    .bot-panel {
      bottom: 0 !important;
      right: 0 !important;
      width: 100vw !important;
      max-width: 100vw !important;
      height: 100dvh !important;
      border-radius: 0 !important;
    }

    .fab-wrap {
      bottom: 20px !important;
      right: 16px !important;
    }

    .oya-launcher-bubble {
      max-width: calc(100vw - 90px) !important;
    }
  }
`;
// ── CodeBlock ────────────────────────────────────────────────────────────────
function CodeBlock({ className, children, sender }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(String(children).replace(/\n$/, ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }, [children]);

  return (
    <div className="relative group my-2">
      <button
        onClick={handleCopy}
        aria-label={copied ? "Copied" : "Copy code"}
        style={{ backgroundColor: copied ? "#16a34a" : "#374151" }}
        className="
          oya-ctrl
          absolute top-[6px] right-[6px]
          flex items-center gap-[4px]
          px-[8px] py-[4px] rounded-md
          text-white text-[10px] font-medium
          opacity-0 group-hover:opacity-100
          transition-all duration-150 z-10
        "
      >
        {copied ? <FaCheck size={9} /> : <FaCopy size={9} />}
        <span>{copied ? "Copied" : "Copy"}</span>
      </button>
      <pre
        className={`rounded-xl px-3 pt-3 pb-3 pr-[64px] overflow-x-auto text-[12px] font-mono leading-relaxed ${
          sender === "user"
            ? "bg-black/20 text-white/90"
            : "bg-gray-900 text-gray-100"
        }`}
      >
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
}

// ── Markdown factory ─────────────────────────────────────────────────────────
function buildMarkdownComponents(sender) {
  return {
    a: ({ node, ...props }) => (
      <a
        {...props}
        target="_blank"
        rel="noopener noreferrer"
        className={`underline break-all font-medium ${
          sender === "user"
            ? "text-white/90 hover:text-white"
            : "text-blue-600 hover:text-blue-700"
        }`}
      />
    ),
    ul: ({ node, ...props }) => (
      <ul {...props} className="list-disc pl-5 my-2 space-y-[3px]" />
    ),
    ol: ({ node, ...props }) => (
      <ol {...props} className="list-decimal pl-5 my-2 space-y-[3px]" />
    ),
    li: ({ node, ...props }) => <li {...props} className="leading-relaxed" />,
    h1: ({ node, ...props }) => (
      <h1 {...props} className="text-[17px] font-bold mt-3 mb-1" />
    ),
    h2: ({ node, ...props }) => (
      <h2 {...props} className="text-[15px] font-bold mt-3 mb-1" />
    ),
    h3: ({ node, ...props }) => (
      <h3 {...props} className="text-[13.5px] font-semibold mt-2 mb-1" />
    ),
    p: ({ node, ...props }) => (
      <p {...props} className="mb-[6px] last:mb-0 leading-relaxed" />
    ),
    strong: ({ node, ...props }) => (
      <strong {...props} className="font-semibold" />
    ),
    em: ({ node, ...props }) => <em {...props} className="italic" />,
    blockquote: ({ node, ...props }) => (
      <blockquote
        {...props}
        className={`border-l-[3px] pl-3 my-2 italic opacity-75 ${
          sender === "user" ? "border-white/40" : "border-gray-300"
        }`}
      />
    ),
    code: ({ node, className, children, ...props }) => {
      if (/language-/.test(className || ""))
        return (
          <CodeBlock className={className} sender={sender}>
            {children}
          </CodeBlock>
        );
      return (
        <code
          {...props}
          className={`px-[5px] py-[2px] rounded text-[12px] font-mono ${
            sender === "user" ? "bg-white/20" : "bg-gray-100 text-gray-800"
          }`}
        >
          {children}
        </code>
      );
    },
    table: ({ node, ...props }) => (
      <div className="overflow-x-auto my-2 rounded-lg border border-gray-200">
        <table {...props} className="text-[12px] border-collapse w-full" />
      </div>
    ),
    th: ({ node, ...props }) => (
      <th
        {...props}
        className={`px-3 py-2 text-left font-semibold border-b ${
          sender === "user"
            ? "border-white/20 bg-white/10"
            : "border-gray-200 bg-gray-50 text-gray-700"
        }`}
      />
    ),
    td: ({ node, ...props }) => (
      <td
        {...props}
        className={`px-3 py-[7px] border-b last:border-b-0 ${
          sender === "user" ? "border-white/15" : "border-gray-100"
        }`}
      />
    ),
  };
}

// ── Component ────────────────────────────────────────────────────────────────
function OyaBot({ embed = false }) {
  const COMPANY_ID = window.NUFORMLY_CONFIG?.companyId || "oya-gemkara";

  const [company, setCompany] = useState(null);
  const [emailAsked, setEmailAsked] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [language, setLanguage] = useState("English");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [openBot, setOpenBot] = useState(embed ? true : false);
  const [animateBot, setAnimateBot] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [failedMessage, setFailedMessage] = useState(null);
  const [showRecordingBubble, setShowRecordingBubble] = useState(false);

  // Launcher greeting bubble
  const [launcherBubbleStage, setLauncherBubbleStage] = useState("idle"); // idle | indicator | typing | visible | hiding
  const [launcherBubbleText, setLauncherBubbleText] = useState("");
  const lastLauncherMessageRef = useRef("");
  const dismissLauncherBubbleRef = useRef(() => {});

  // Random sparkle positions around the launcher, generated once per mount
  const launcherSparkles = useMemo(() => {
    const SPARKLE_COUNT = 5;

    return Array.from({ length: SPARKLE_COUNT }, (_, i) => {
      const angle = (i / SPARKLE_COUNT) * Math.PI * 2 + Math.random() * 0.8;
      const radius = 34 + Math.random() * 16;

      return {
        id: i,
        top: 40 + Math.sin(angle) * radius,
        left: 40 + Math.cos(angle) * radius,
        delay: Math.random() * 4,
        duration: 3.2 + Math.random() * 2.2,
      };
    });
  }, []);

  const silenceTimerRef = useRef(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const chatAreaRef = useRef(null);
  const fileInputRef = useRef(null);
  const mountedRef = useRef(true);
  const userScrolledUpRef = useRef(false);
  const openBotTimerRef = useRef(null);

  const {
    transcript,
    listening,
    supported,
    startListening,
    stopListening,
    setTranscript,
  } = useSpeechRecognition(language === "Hindi" ? "hi-IN" : "en-US");

  const { speak, stop, speaking } = useTextToSpeech();

  // Public Widget Config Integration — the normalized, public-safe
  // Chatbot.config for this company's chatbot, from the same bot/v1/company
  // response (no second round trip, no new identity model). `null` means
  // "use company.theme / the hardcoded OYA defaults, exactly as before."
  const [widgetConfig, setWidgetConfig] = useState(null);
  const [resolvedChatbotId, setResolvedChatbotId] = useState(null);
  const appliedDefaultLanguageRef = useRef(false);

  const theme = useMemo(() => company?.theme, [company]);
  // Merged theme — Chatbot.config takes priority, company.theme (legacy)
  // is the fallback, then the hardcoded OYA brand literals. Every existing
  // theme.X read in this file is unaffected until config/theme actually
  // resolve, so a company with neither renders exactly as before.
  const mergedTheme = useMemo(
    () => ({
      primaryColor:
        widgetConfig?.chatWindow?.primaryColor || theme?.primaryColor || OYA_DARK,
      backgroundColor:
        widgetConfig?.chatWindow?.backgroundColor || theme?.backgroundColor,
      // Config has no dedicated "bot bubble" field (matches the admin
      // Studio's own ChatWidgetRenderer, which hardcodes this too) — stays
      // legacy-only, company.theme.botBubbleColor or undefined.
      botBubbleColor: theme?.botBubbleColor,
      textColor: widgetConfig?.chatWindow?.textColor || theme?.textColor,
    }),
    [widgetConfig, theme],
  );
  // Public Widget Config Integration — this was previously computed but
  // never rendered anywhere (header always used the hardcoded `logo1`
  // import). Now the header's actual avatar, with `logo1` as the same
  // fallback it always used.
  const botAvatar = useMemo(
    () => widgetConfig?.chatWindow?.botAvatar || company?.branding?.botAvatar || logo1,
    [company, widgetConfig],
  );
  const canSend = useMemo(
    () => Boolean(input.trim()) && !loading && isOnline,
    [input, loading, isOnline],
  );

  // Config-driven header/welcome copy — company.chatbot.* (legacy) is the
  // fallback, matching mergedTheme's same priority order.
  const headerTitle =
    widgetConfig?.chatWindow?.botName || company?.chatbot?.chatbotName || "OYA Assistant";
  const botNameForCopy =
    widgetConfig?.chatWindow?.botName || company?.chatbot?.botName || "OYA";
  const headerSubtitle = widgetConfig?.chatWindow?.companyName || "";
  const welcomeMessageEN = widgetConfig?.chatWindow?.welcomeMessage || "";
  const showBranding = widgetConfig?.chatWindow?.showBranding !== false;
  const showGreeting = widgetConfig?.launcher?.showGreeting !== false;
  const showNotificationBadge = widgetConfig?.launcher?.showNotificationBadge !== false;
  const typingIndicatorEnabled = widgetConfig?.behavior?.typingIndicator !== false;

  const mdUserComponents = useMemo(() => buildMarkdownComponents("user"), []);
  const mdBotComponents = useMemo(() => buildMarkdownComponents("bot"), []);

  // ── Effects ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (openBotTimerRef.current) clearTimeout(openBotTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const onOnline = () => {
      if (mountedRef.current) setIsOnline(true);
    };
    const onOffline = () => {
      if (mountedRef.current) setIsOnline(false);
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        // Scoped, shorter timeout than the file's 60s AI-reply default —
        // this is a lightweight lookup the launcher blocks on, not an AI
        // response, so a slow/dead backend shouldn't leave visitors staring
        // at nothing for a minute.
        const res = await axios.get(`${BACKEND_URL}bot/v1/company`, {
          headers: { "x-company-id": COMPANY_ID },
          signal: controller.signal,
          timeout: 8000,
        });
        if (!mountedRef.current) return;

        if (res.data.success) {
          setCompany(res.data.company);
          setWidgetConfig(
            res.data.widgetConfig?.available ? res.data.widgetConfig.config : null,
          );
          if (res.data.chatbotId) setResolvedChatbotId(res.data.chatbotId);
        } else {
          setCompany(FALLBACK_COMPANY);
        }
      } catch (err) {
        if (axios.isCancel(err)) return;

        console.error(
          "Company Load Error:",
          err.response?.data || err.message,
        );

        // Public Widget Config Integration fix — previously this left
        // `company` (and `theme`) permanently null on any failure, which
        // silently blocks the launcher from ever rendering (see the
        // `!company || !theme` gate below). Falling back to a safe,
        // hardcoded-brand shape means a backend hiccup degrades to "the
        // widget looks like it always did," not "the widget vanishes."
        if (mountedRef.current) setCompany(FALLBACK_COMPANY);
      }
    };
    load();
    return () => controller.abort();
  }, [BACKEND_URL, COMPANY_ID]);

  // Phase 15 — live config updates, purely additive on top of the REST
  // fetch above (same guarantee as Bot.jsx's equivalent effect): if
  // this never connects, the widget already has a fully correct
  // config from the REST call and simply never gets a live update
  // until the visitor's next page load. Only ever touches
  // `widgetConfig` (the visual layer).
  useEffect(() => {
    if (!resolvedChatbotId) return;

    let socket;
    let cancelled = false;

    import("socket.io-client")
      .then(({ io }) => {
        if (cancelled) return;
        socket = io(`${BACKEND_URL}widget`, {
          auth: { chatbotId: resolvedChatbotId },
          transports: ["websocket", "polling"],
          reconnectionDelay: 1000,
          reconnectionDelayMax: 8000,
        });
        socket.on("domain:event", (evt) => {
          if (evt.type === "chatbot.config.updated" && evt.available) {
            setWidgetConfig(evt.config || null);
          }
        });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      socket?.disconnect();
    };
  }, [resolvedChatbotId, BACKEND_URL]);

  // Applies config.language.defaultLanguage exactly once, the first time
  // it becomes available — never overrides a language the visitor already
  // switched to mid-conversation.
  useEffect(() => {
    const defaultLanguage = widgetConfig?.language?.defaultLanguage;

    if (
      defaultLanguage &&
      !appliedDefaultLanguageRef.current &&
      ["English", "Hindi"].includes(defaultLanguage)
    ) {
      appliedDefaultLanguageRef.current = true;
      setLanguage(defaultLanguage);
    }
  }, [widgetConfig]);

  // Phase 20 fix — behavior.autoOpen existed in the Studio and already
  // worked for Bot.jsx, but was never wired here at all: OyaBot never
  // auto-opened regardless of the setting. Same opt-in-only, embed-safe
  // behavior as Bot.jsx.
  useEffect(() => {
    if (embed || !widgetConfig?.behavior?.autoOpen) return;

    const delayMs = Math.max(0, Number(widgetConfig.behavior.autoOpenDelay) || 0) * 1000;
    const timer = setTimeout(() => setOpenBot(true), delayMs);

    return () => clearTimeout(timer);
  }, [embed, widgetConfig]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (mountedRef.current) setAnimateBot(true);
    }, 200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("oya_chat_history");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          setShowSuggestions(false);
        }
      }
      const savedEmail = localStorage.getItem("oya_user_email");
      if (savedEmail) setUserEmail(savedEmail);
    } catch {
      localStorage.removeItem("oya_chat_history");
    }
  }, []);

  useEffect(() => {
    if (messages.length === 0) return;
    try {
      localStorage.setItem("oya_chat_history", JSON.stringify(messages));
    } catch {
      /* quota exceeded */
    }
  }, [messages]);

  useEffect(() => {
    const controller = new AbortController();
    const fetch_ = async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}bot/v1/suggestions`, {
          params: { language },
          headers: { "x-company-id": COMPANY_ID },
          signal: controller.signal,
        });
        if (mountedRef.current && res.data.success)
          setSuggestions([...new Set(res.data.suggestions)]);
      } catch (err) {
        if (!axios.isCancel(err))
          console.error(
            "Suggestions Error:",
            err.response?.data || err.message,
          );
      }
    };
    fetch_();
    return () => controller.abort();
  }, [language, BACKEND_URL, COMPANY_ID]);

  useEffect(() => {
    const controller = new AbortController();
    const save = async () => {
      try {
        let visitorId = localStorage.getItem("visitorId");
        if (!visitorId) {
          visitorId = crypto.randomUUID();
          localStorage.setItem("visitorId", visitorId);
        }
        await axios.post(
          `${BACKEND_URL}bot/v1/visitor`,
          {
            visitorId,
            browser: navigator.userAgent,
            os: navigator.platform,
            device: window.innerWidth < 768 ? "Mobile" : "Desktop",
            language: navigator.language,
            page: window.location.href,
          },
          {
            headers: { "x-company-id": COMPANY_ID },
            signal: controller.signal,
          },
        );
      } catch (err) {
        if (!axios.isCancel(err))
          console.error("Visitor Error:", err.response?.data || err.message);
      }
    };
    save();
    return () => controller.abort();
  }, [BACKEND_URL, COMPANY_ID]);

  useEffect(() => {
    if (!userScrolledUpRef.current)
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Drives the launcher greeting bubble lifecycle: wait -> typing indicator ->
  // type message -> hold -> fade -> wait -> repeat. Only runs while the
  // launcher itself is visible (chat closed, not embedded).
  useEffect(() => {
    const launcherVisible = !embed && !openBot;

    if (!launcherVisible) {
      setLauncherBubbleStage("idle");
      setLauncherBubbleText("");
      return;
    }

    let cancelled = false;
    let timerId = null;

    const wait = (ms, next) => {
      timerId = setTimeout(() => {
        if (!cancelled) next();
      }, ms);
    };

    const typeMessage = (message, charIndex) => {
      if (cancelled) return;

      setLauncherBubbleText(message.slice(0, charIndex));

      if (charIndex >= message.length) {
        setLauncherBubbleStage("visible");

        const goToHiding = () => {
          if (cancelled) return;

          setLauncherBubbleStage("hiding");

          wait(300, () => {
            setLauncherBubbleStage("idle");
            setLauncherBubbleText("");
            wait(8000, startCycle);
          });
        };

        dismissLauncherBubbleRef.current = () => {
          clearTimeout(timerId);
          goToHiding();
        };

        wait(4000, goToHiding);

        return;
      }

      wait(35 + Math.random() * 10, () => typeMessage(message, charIndex + 1));
    };

    const startCycle = () => {
      if (cancelled) return;

      wait(2000, () => {
        setLauncherBubbleStage("indicator");

        wait(700, () => {
          const message = pickNextLauncherMessage(
            lastLauncherMessageRef.current,
          );

          lastLauncherMessageRef.current = message;

          setLauncherBubbleStage("typing");
          typeMessage(message, 0);
        });
      });
    };

    startCycle();

    return () => {
      cancelled = true;
      clearTimeout(timerId);
      dismissLauncherBubbleRef.current = () => {};
    };
  }, [embed, openBot]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  // Live transcript -> input
  useEffect(() => {
    setInput(transcript);
  }, [transcript]);

  useEffect(() => {
    if (!listening) {
      clearTimeout(silenceTimerRef.current);
      return;
    }

    // Reset timer whenever transcript changes
    clearTimeout(silenceTimerRef.current);

    silenceTimerRef.current = setTimeout(() => {
      stopListening();
      setShowRecordingBubble(false);

      // Focus the input after recording stops
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }, 5000);

    return () => clearTimeout(silenceTimerRef.current);
  }, [transcript, listening]);

  // Hide recording bubble when recording stops
  useEffect(() => {
    if (!listening) {
      setShowRecordingBubble(false);
    }
  }, [listening]);

  // Prevent recording while bot is replying
  const handleMicClick = () => {
    if (loading) return;

    clearTimeout(silenceTimerRef.current);

    if (listening) {
      stopListening();
      setShowRecordingBubble(false);

      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);

      return;
    }

    // Don't start recording if input already has text
    if (input.trim()) return;

    stop();

    setTranscript("");
    setInput("");
    setShowRecordingBubble(true);
    startListening();
  };

  const handleChatScroll = useCallback(() => {
    const el = chatAreaRef.current;
    if (!el) return;

    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const scrolledUp = distFromBottom > 80;

    userScrolledUpRef.current = scrolledUp;
    setShowScrollBtn(scrolledUp);
  }, []);

  const scrollToLatest = useCallback(() => {
    userScrolledUpRef.current = false;
    setShowScrollBtn(false);
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
  }, []);

  const removeSelectedFile = useCallback(() => {
    setSelectedFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleSendMessage = useCallback(
    async (customMessage = null) => {
      // Stop recording if it is still active
      if (listening) {
        stopListening();
        clearTimeout(silenceTimerRef.current);
        setShowRecordingBubble(false);
      }

      const messageText = (customMessage || input).trim();
      if ((!messageText && !selectedFile) || loading || !isOnline) return;

      primeNotificationSound();
      setFailedMessage(null);

      if (
        emailAsked &&
        !userEmail &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(messageText)
      ) {
        setUserEmail(messageText);
        setEmailAsked(false);
        localStorage.setItem("oya_user_email", messageText);
        try {
          await axios.post(
            `${BACKEND_URL}bot/v1/visitor/email`,
            {
              visitorId: localStorage.getItem("visitorId"),
              email: messageText,
            },
            { headers: { "x-company-id": COMPANY_ID } },
          );
        } catch (err) {
          console.error("Email Save Error:", err.response?.data || err.message);
        }
        if (!mountedRef.current) return;
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), text: messageText, sender: "user" },
          {
            id: crypto.randomUUID(),
            text: "✨ Thank you. Your email has been saved. Our OYA team will be happy to assist you further.",
            sender: "bot",
          },
        ]);
        playBotReplySound();
        setInput("");
        return;
      }

      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), text: messageText, sender: "user" },
      ]);
      setInput("");
      setLoading(true);
      setShowSuggestions(false);
      userScrolledUpRef.current = false;

      try {
        const formData = new FormData();

        formData.append("text", messageText);
        formData.append("language", language);
        formData.append("visitorId", localStorage.getItem("visitorId"));

        if (selectedFile) {
          formData.append("file", selectedFile);
        }

        const res = await axios.post(`${BACKEND_URL}bot/v1/message`, formData, {
          headers: {
            "x-company-id": COMPANY_ID,
            "Content-Type": "multipart/form-data",
          },
        });

        if (!mountedRef.current) return;

        const botText = res.data?.botMessage;
        if (!res.data?.success || typeof botText !== "string")
          throw new Error("Malformed response");

        setMessages((prev) => {
          const next = [
            ...prev,
            { id: crypto.randomUUID(), text: botText, sender: "bot" },
          ];
          const userCount = next.filter((m) => m.sender === "user").length;
          if (
            userCount >= 3 &&
            !emailAsked &&
            !userEmail &&
            !localStorage.getItem("oya_user_email")
          ) {
            next.push({
              id: crypto.randomUUID(),
              text: "📧 May we have your email address? This helps our OYA jewellery consultants assist you personally.",
              sender: "bot",
            });
            setEmailAsked(true);
          }
          return next;
        });

        playBotReplySound();

        // Speak bot response
        // speak(botText, language === "Hindi" ? "hi-IN" : "en-IN");
      } catch (err) {
        if (!mountedRef.current) return;
        console.error("Message Error:", err.response?.data || err.message);
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            text: "⚠️ Server error. Please try again.",
            sender: "bot",
            failed: true,
          },
        ]);
        setFailedMessage(messageText);
      } finally {
        if (mountedRef.current) {
          setSelectedFile(null);

          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
          setLoading(false);
          requestAnimationFrame(() => inputRef.current?.focus());
        }
      }
    },
    [
      input,
      loading,
      isOnline,
      emailAsked,
      userEmail,
      language,
      COMPANY_ID,
      listening,
      stopListening,
    ],
  );

  const handleRetry = useCallback(() => {
    if (!failedMessage) return;
    const msg = failedMessage;
    setFailedMessage(null);
    setMessages((prev) => {
      const next = [...prev];
      if (next.at(-1)?.failed) next.pop();
      if (next.at(-1)?.sender === "user") next.pop();
      return next;
    });
    setTimeout(() => handleSendMessage(msg), 50);
  }, [failedMessage, handleSendMessage]);

  const clearChatHistory = useCallback(() => {
    stop();
    localStorage.removeItem("oya_chat_history");
    localStorage.removeItem("oya_user_email");
    setMessages([]);
    setUserEmail("");
    setEmailAsked(false);
    setShowSuggestions(true);
    setFailedMessage(null);
  }, [stop]);

  const handleKeyPress = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();

        // Never allow Enter while recording
        if (listening) return;

        handleSendMessage();
      }
    },
    [handleSendMessage, listening],
  );

  const handleOpenBot = useCallback(() => {
    setOpenBot(true);
    openBotTimerRef.current = setTimeout(() => inputRef.current?.focus(), 320);
  }, []);

  if (!company || !theme) {
    if (!embed && !openBot) return null;

    // Show an instant branded loading shell instead of a blank iframe while
    // company config loads, so the panel appears to open immediately even
    // if the backend request is slow (e.g. a cold-started server).
    return (
      <div
        className={`
          bot-panel
          ${
            embed
              ? "w-[365px] h-[547px] rounded-[28px] border border-[#dcdcdc]"
              : "fixed bottom-5 right-5 w-[365px] h-[547px] rounded-[28px] border border-[#dcdcdc] -m-3"
          }
          bg-white
          overflow-hidden
          flex
          items-center
          justify-center
          z-50
        `}
      >
        <div
          className="w-[34px] h-[34px] rounded-full border-4 border-[#f3d6b6] animate-spin"
          style={{ borderTopColor: OYA_DARK }}
        />
      </div>
    );
  }

  // ── UI ────────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{GLOBAL_STYLES}</style>

      {/* ════════════ Floating Launcher ════════════ */}
      {!embed && !openBot && (
        <div className="fab-wrap fixed bottom-5 right-5 z-50 oya-launcher-entrance">
          <div className="relative oya-launcher-float">
            {/* AI Greeting Bubble */}
            {showGreeting && launcherBubbleStage !== "idle" && (
              <div
                className={`
                  absolute bottom-[77px] right-0
                  ${launcherBubbleStage === "hiding" ? "oya-bubble-exit" : "oya-bubble-enter"}
                `}
              >
                <div
                  className="oya-launcher-bubble relative flex items-start gap-[6px] rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.1)] pl-[8px] pr-3 py-[7px] min-w-[150px] max-w-[195px]"
                  style={{
                    background: LAUNCHER_LUX_CREAM,
                    border: `1px solid ${LAUNCHER_LUX_ACCENT}66`,
                  }}
                >
                  <img
                    src={logo}
                    alt=""
                    aria-hidden="true"
                    className="w-[16px] h-[16px] rounded-full object-cover mt-[2px] flex-shrink-0"
                    style={{ border: `1px solid ${LAUNCHER_LUX_ACCENT}66` }}
                  />

                  {launcherBubbleStage === "indicator" ? (
                    <div
                      className="flex items-center gap-1 h-[11px] mt-[3px]"
                      aria-hidden="true"
                    >
                      <span
                        className="w-[4px] h-[4px] rounded-full animate-bounce"
                        style={{ backgroundColor: LAUNCHER_LUX_PRIMARY }}
                      />
                      <span
                        className="w-[4px] h-[4px] rounded-full animate-bounce"
                        style={{
                          backgroundColor: LAUNCHER_LUX_PRIMARY,
                          animationDelay: "0.15s",
                        }}
                      />
                      <span
                        className="w-[4px] h-[4px] rounded-full animate-bounce"
                        style={{
                          backgroundColor: LAUNCHER_LUX_PRIMARY,
                          animationDelay: "0.3s",
                        }}
                      />
                    </div>
                  ) : (
                    <p
                      className="text-[11.5px] font-medium leading-snug tracking-wide pt-[1px]"
                      style={{ color: LAUNCHER_LUX_TEXT }}
                      aria-live="polite"
                    >
                      {launcherBubbleText}
                    </p>
                  )}

                  {/* Dismiss */}
                  {launcherBubbleStage === "visible" && (
                    <button
                      onClick={() => dismissLauncherBubbleRef.current()}
                      aria-label="Dismiss greeting"
                      className="
                        oya-ctrl
                        absolute -top-[5px] -right-[5px]
                        w-[14px] h-[14px]
                        rounded-full
                        shadow-sm
                        flex items-center justify-center
                        text-gray-400 hover:text-gray-600
                        leading-none
                        transition-colors
                      "
                      style={{
                        background: LAUNCHER_LUX_CREAM,
                        border: `1px solid ${LAUNCHER_LUX_ACCENT}66`,
                      }}
                    >
                      <FaTimes size={6} />
                    </button>
                  )}

                  {/* Tail */}
                  <div
                    className="absolute -bottom-[5px] right-[20px] w-[10px] h-[10px] rotate-45"
                    style={{
                      background: LAUNCHER_LUX_CREAM,
                      borderBottom: `1px solid ${LAUNCHER_LUX_ACCENT}66`,
                      borderRight: `1px solid ${LAUNCHER_LUX_ACCENT}66`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Luxury Halo */}
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-full oya-launcher-halo pointer-events-none"
              style={{
                background: `radial-gradient(circle, ${LAUNCHER_LUX_ACCENT}8c 0%, ${LAUNCHER_LUX_ACCENT}00 70%)`,
              }}
            />

            {/* Sparkles */}
            <div
              aria-hidden="true"
              className="absolute -inset-[30px] pointer-events-none"
            >
              {launcherSparkles.map((s) => (
                <span
                  key={s.id}
                  className="absolute oya-sparkle"
                  style={{
                    top: `${s.top}px`,
                    left: `${s.left}px`,
                    fontSize: "8px",
                    color: LAUNCHER_LUX_SOFT_GOLD,
                    textShadow: `0 0 4px ${LAUNCHER_LUX_ACCENT}cc`,
                    "--dur": `${s.duration}s`,
                    "--delay": `${s.delay}s`,
                  }}
                >
                  ✦
                </span>
              ))}
            </div>

            <button
              onClick={handleOpenBot}
              aria-label="Open OYA jewellery assistant"
              style={{ backgroundColor: "rgba(249, 248, 248, 0)" }}
              className="
                oya-ctrl
                relative
                w-[62px] h-[62px]
                rounded-full
                flex items-center justify-center
                hover:scale-[1.05]
                hover:rotate-1
                transition-transform
                duration-[250ms]
              "
            >
              <div className="oya-launcher-breathe oya-launcher-glow relative w-full h-full rounded-full overflow-hidden flex items-center justify-center">
                <img
                  src={logo}
                  alt="OYA by Gemkara"
                  className="w-[70px] h-[70px] object-cover rounded-full"
                />

                {/* Shimmer */}
                <span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full overflow-hidden pointer-events-none"
                >
                  <span className="absolute inset-0 oya-launcher-shimmer" />
                </span>
              </div>

              {/* Notification Dot */}
              {showNotificationBadge && launcherBubbleStage !== "idle" && (
                <span
                  className="absolute top-0 right-0 w-[12px] h-[12px] rounded-full border border-white animate-pulse"
                  style={{ backgroundColor: LAUNCHER_LUX_ACCENT }}
                />
              )}
            </button>
          </div>
        </div>
      )}

      {/* ════════════ Chat Panel ════════════ */}
      {openBot && (
        <div
          role="dialog"
          aria-label="OYA Jewellery Assistant Chat"
          aria-modal="true"
          style={{ background: mergedTheme.backgroundColor }}
          className={`
    bot-panel

    ${
      embed
        ? "w-[365px] h-[547px] rounded-[28px] border border-[#dcdcdc]"
        : "fixed bottom-5 right-5 w-[365px] h-[547px] rounded-[28px] border border-[#dcdcdc] -m-3"
    }

overflow-hidden
flex
flex-col
z-50
transition-all
duration-500

${
  embed
    ? ""
    : animateBot
      ? "opacity-100 translate-y-0 scale-100 bot-enter"
      : "opacity-0 translate-y-10 scale-95 pointer-events-none"
}
`}
        >
          {/* Offline Banner */}
          {!isOnline && (
            <div
              role="alert"
              aria-live="assertive"
              className="
        shrink-0
        bg-red-500/90
        text-white
        text-[11.5px]
        font-semibold
        text-center
        py-[7px]
        px-4
      "
            >
              No internet connection — messages won't send.
            </div>
          )}

          {/* ── Header ── */}
          <header
            aria-label="Chat header"
            style={{
              background: `linear-gradient(135deg, ${OYA_DARK} 0%, ${OYA_MID} 100%)`,
            }}
            className="
              shrink-0
              h-[74px]
              px-4
              flex items-center justify-between
              text-white
            "
          >
            {/* Left */}
            <div className="flex items-center gap-3">
              <div
                className="
                  w-[40px] h-[40px]
                  rounded-[12px]
                  bg-[#ffffff22]
                  flex items-center justify-center
                  overflow-hidden
                "
              >
                <img
                  src={botAvatar}
                  alt="OYA logo"
                  className="w-[34px] h-[38px] object-cover rounded-[8px]"
                />
              </div>

              <div>
                <h2 className="font-semibold text-[15px] leading-none whitespace-nowrap">
                  {headerTitle}
                </h2>
                <div className="flex items-center gap-2 mt-[5px]">
                  <span
                    style={{
                      backgroundColor: OYA_CHAMPAGNE,
                      boxShadow: `0 0 8px ${OYA_CHAMPAGNE}`,
                    }}
                    className="w-[6px] h-[6px] rounded-full animate-pulse"
                  />
                  <p className="text-[11px] text-[#f3d6b6] leading-none">
                    {headerSubtitle || "Online · Always ready"}
                  </p>
                </div>
              </div>
            </div>

            {/* Right */}
            <nav aria-label="Chat controls" className="flex items-center gap-2">
              <button
                onClick={clearChatHistory}
                aria-label="Clear chat history"
                title="Clear history"
                className="
                  oya-ctrl
                  w-[20px] h-[20px]
                  rounded-full
                  bg-[#ffffff22]
                  flex items-center justify-center
                "
              >
                <FaTrash size={11} />
              </button>

              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                aria-label="Select language"
                className="
    oya-ctrl lang-select
    bg-[#ffffff22]
    text-white text-[10px]
    px-1 py-1
    rounded-[8px]
    outline-none border-none cursor-pointer
  "
              >
                <option value="English">EN</option>
                <option value="Hindi">हिं</option>
              </select>

              <button
                onClick={() => {
                  stop();

                  if (embed) {
                    window.parent.postMessage(
                      {
                        type: "NUFORMLY_CLOSE",
                      },
                      "*",
                    );
                  } else {
                    setOpenBot(false);
                  }
                }}
                aria-label="Close chat"
                className="
    oya-ctrl
    w-[20px]
    h-[20px]
    rounded-full
    bg-[#ffffff22]
    flex
    items-center
    justify-center
  "
              >
                <FaTimes size={13} />
              </button>
            </nav>
          </header>

          {/* ── Chat Area ── */}
          <div className="flex-1 relative overflow-hidden">
            <main
              ref={chatAreaRef}
              onScroll={handleChatScroll}
              className="h-full overflow-y-auto px-4 py-4 chat-scroll"
              role="log"
              aria-label="Chat messages"
              aria-live="polite"
              aria-atomic="false"
              aria-relevant="additions"
            >
              {/* Welcome Card */}
              {messages.length === 0 && (
                <div className="fade-up">
                  <div
                    style={{
                      background: mergedTheme.botBubbleColor,
                      color: mergedTheme.textColor,
                    }}
                    className="
                      rounded-[18px]
                      p-4
                      border border-[#d8e9de]
                      text-[14px] leading-7
                      mb-5
                    "
                  >
                    {/* <div className="flex items-center gap-[9px] mb-[11px]">
                      <img
                        src={logo}
                        alt="OYA"
                        className="w-[30px] h-[35px] rounded-full object-cover"
                      />
                      <div>
                        <p className="font-semibold text-[13px] leading-none">
                          {company.chatbot.botName}
                        </p>
                        <p className="text-[10px] opacity-50 mt-[3px] leading-none">
                          OYA by Gemkara
                        </p>
                      </div>
                    </div> */}

                    {language === "Hindi" ? (
                      <p className="text-[13.5px] leading-[1.72]">
                        👋 नमस्ते! मैं {botNameForCopy} हूँ। OYA by
                        Gemkara में आपका स्वागत है। मैं आपकी सहायता कर सकती हूँ:
                        • प्राकृतिक रत्न • प्रीमियम ज्वेलरी • व्यक्तिगत सुझाव •
                        अपॉइंटमेंट बुकिंग • ऑर्डर सहायता। आज मैं आपकी किस प्रकार
                        सहायता कर सकती हूँ?
                      </p>
                    ) : welcomeMessageEN ? (
                      <p className="text-[13.5px] leading-[1.72]">{welcomeMessageEN}</p>
                    ) : (
                      <p className="text-[13.5px] leading-[1.72]">
                        👋 Welcome to OYA by Gemkara. I'm{" "}
                        {botNameForCopy}, your luxury jewellery
                        assistant. I can help you with: • Natural Gemstones •
                        Premium Jewellery • Personalized Recommendations • Book
                        Appointments • Customer Support. How may I assist you
                        today?
                      </p>
                    )}

                    {/* <div className="flex flex-wrap gap-[6px] mt-[13px]">
                      {OYA_SERVICE_CHIPS.map((chip) => (
                        <span
                          key={chip}
                          style={{
                            color: OYA_GOLD,
                            borderColor: `${OYA_GOLD}50`,
                          }}
                          className="
                            px-[10px] py-[4px]
                            rounded-full border
                            text-[10.5px] font-medium
                            bg-white/55
                          "
                        >
                          {chip}
                        </span>
                      ))}
                    </div> */}
                  </div>

                  {/* Contact Buttons — guarded (Public Widget Config
                      Integration): FALLBACK_COMPANY.contact has no phone/
                      whatsapp/email, so these must not assume they exist. */}
                  <div className="flex gap-2 mb-5">
                    {company.contact?.phone && (
                    <a
                      href={`tel:${company.contact.phone}`}
                      aria-label="Call OYA"
                      style={{ backgroundColor: OYA_DARK }}
                      className="
                        oya-ctrl
                        flex items-center justify-center gap-2
                        flex-1 px-3 py-2
                        rounded-full
                        text-white text-[12px] font-medium
                        transition-all duration-200
                      "
                    >
                      <FaPhoneAlt size={13} />
                      <span>Call</span>
                    </a>
                    )}

                    {company.contact?.whatsapp && (
                    <a
                      href={`https://wa.me/${company.contact.whatsapp}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Chat on WhatsApp"
                      className="
                        oya-ctrl
                        flex items-center justify-center gap-2
                        flex-1 px-3 py-2
                        rounded-full
                        bg-[#25D366] text-white text-[12px] font-medium
                        transition-all duration-200
                      "
                    >
                      <FaWhatsapp size={14} />
                      <span>WhatsApp</span>
                    </a>
                    )}

                    {company.contact?.email && (
                    <a
                      href={`mailto:${company.contact.email}`}
                      aria-label="Email OYA"
                      style={{ backgroundColor: OYA_GOLD }}
                      className="
                        oya-ctrl
                        flex items-center justify-center gap-2
                        flex-1 px-3 py-2
                        rounded-full
                        text-white text-[12px] font-medium
                        transition-all duration-200
                      "
                    >
                      <FaEnvelope size={13} />
                      <span>Email</span>
                    </a>
                    )}
                  </div>
                </div>
              )}

              {/* Messages */}
              {messages.map((msg, index) => (
                <div
                  key={msg.id ?? `${msg.sender}-${index}`}
                  className={`
                    flex mb-4 msg-enter
                    ${msg.sender === "user" ? "justify-end" : "justify-start"}
                  `}
                >
                  {msg.sender === "bot" && (
                    <img
                      src={botAvatar}
                      alt="OYA Bot"
                      aria-hidden="true"
                      className="
                        w-[32px] h-[37px]
                        rounded-full object-cover
                        mr-2 mt-1
                        flex-shrink-0
                      "
                    />
                  )}

                  <div
                    className={`flex flex-col max-w-[82%] ${
                      msg.sender === "user" ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      style={{
                        backgroundColor:
                          msg.sender === "user"
                            ? mergedTheme.primaryColor
                            : mergedTheme.botBubbleColor,
                        color:
                          msg.sender === "user" ? "#ffffff" : mergedTheme.textColor,
                      }}
                      className={`
                        px-[15px] py-[12px]
                        text-[14px] leading-[26px] font-[400]
                        whitespace-pre-wrap
                        w-full break-words overflow-hidden
                        ${
                          msg.sender === "user"
                            ? "rounded-[16px] rounded-br-[6px] shadow-md"
                            : "rounded-[18px] rounded-bl-[6px] border border-[#d7e7dc]"
                        }
                      `}
                    >
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={
                          msg.sender === "user"
                            ? mdUserComponents
                            : mdBotComponents
                        }
                      >
                        {msg.text}
                      </ReactMarkdown>
                    </div>

                    {msg.failed && failedMessage && (
                      <button
                        onClick={handleRetry}
                        aria-label="Retry sending message"
                        style={{ color: OYA_DARK }}
                        className="
                          oya-ctrl
                          mt-[5px]
                          flex items-center gap-[4px]
                          text-[10.5px] font-medium
                          hover:opacity-70
                          transition-opacity duration-150
                        "
                      >
                        <FaRedo size={9} />
                        <span>Retry</span>
                      </button>
                    )}
                    {msg.sender === "bot" && (
                      <button
                        onClick={() =>
                          speaking
                            ? stop()
                            : speak(
                                msg.text,
                                language === "Hindi" ? "hi-IN" : "en-IN",
                              )
                        }
                        className="
      oya-ctrl
      mt-[6px]
      flex items-center gap-1
      text-[11px]
      text-gray-500
      hover:text-[#5E0F28]
      transition
    "
                      >
                        {speaking ? (
                          <>
                            <FaVolumeMute size={12} />
                            <span>Stop</span>
                          </>
                        ) : (
                          <>
                            <FaVolumeUp size={12} />
                            <span>Listen</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Loading */}
              {loading && typingIndicatorEnabled && (
                <div className="flex mb-4 msg-enter justify-start">
                  <img
                    src={botAvatar}
                    alt=""
                    aria-hidden="true"
                    className="w-[32px] h-[32px] rounded-full object-cover mr-2 mt-1 flex-shrink-0"
                  />
                  <div
                    style={{ background: mergedTheme.botBubbleColor }}
                    className="
                      inline-flex items-center gap-2
                      border border-[#d7e7dc]
                      px-4 py-3
                      rounded-[18px] rounded-bl-[6px]
                      shadow-sm
                    "
                    aria-label="OYA is typing"
                  >
                    <span
                      className="w-[8px] h-[8px] rounded-full animate-bounce"
                      style={{ backgroundColor: OYA_DARK }}
                    />
                    <span
                      className="w-[8px] h-[8px] rounded-full animate-bounce"
                      style={{
                        backgroundColor: OYA_MID,
                        animationDelay: "0.15s",
                      }}
                    />
                    <span
                      className="w-[8px] h-[8px] rounded-full animate-bounce"
                      style={{
                        backgroundColor: OYA_GOLD,
                        animationDelay: "0.3s",
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  {suggestions.map((item, index) => (
                    <button
                      key={`suggestion-${index}-${item}`}
                      onClick={() => handleSendMessage(item)}
                      aria-label={`Ask: ${item}`}
                      style={{
                        background: mergedTheme.botBubbleColor,
                        color: mergedTheme.textColor,
                      }}
                      className="
                        oya-ctrl
                        min-h-[32px] px-3
                        rounded-full
                        border border-[#d6e8dd]
                        text-[11px] font-[500] leading-4
                        text-left flex items-center
                        shadow-sm
                        hover:opacity-80
                        transition-all duration-200
                      "
                    >
                      {item}
                    </button>
                  ))}
                </div>
              )}

              {showRecordingBubble && (
                <div className="flex justify-end mb-4">
                  <div
                    style={{ backgroundColor: OYA_DARK }}
                    className="
                      text-white
                      rounded-[18px]
                      rounded-br-[6px]
                      px-4
                      py-3
                      w-[170px]
                    "
                  >
                    <div className="flex items-center justify-center gap-[3px] h-[34px]">
                      {[...Array(22)].map((_, i) => (
                        <span
                          key={i}
                          className="rounded-full bg-white animate-pulse"
                          style={{
                            width: "3px",
                            height: `${12 + Math.sin(i) * 10 + (i % 5) * 3}px`,
                            animationDelay: `${i * 0.05}s`,
                            animationDuration: "0.8s",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} aria-hidden="true" />
            </main>

            {/* Scroll-to-Latest */}
            {showScrollBtn && (
              <button
                onClick={scrollToLatest}
                aria-label="Scroll to latest message"
                style={{ backgroundColor: OYA_DARK }}
                className="
                  oya-ctrl
                  absolute bottom-3 left-1/2 -translate-x-1/2
                  flex items-center gap-[5px]
                  px-[12px] py-[6px]
                  rounded-full
                  text-white text-[11px] font-semibold
                  shadow-[0_4px_16px_rgba(94,15,40,0.3)]
                  hover:opacity-90 active:scale-95
                  transition-all duration-200
                  z-10
                "
              >
                <FaChevronDown size={10} />
                <span>Latest</span>
              </button>
            )}
          </div>

          {/* ── Footer ── */}
          <footer
            aria-label="Message input area"
            className="
    bot-footer
    shrink-0
    bg-white
    border-t border-[#e8e8e8]
    px-4 py-4
  "
          >
            {selectedFile && (
              <div className="mb-2 flex items-center justify-between bg-gray-100 rounded-lg px-3 py-2 text-sm">
                <span className="truncate">📎 {selectedFile.name}</span>

                <button
                  onClick={removeSelectedFile}
                  className="text-red-500 ml-2"
                >
                  ✕
                </button>
              </div>
            )}

            <div
              className="
      relative
      flex items-center
      border-2 rounded-[18px]
      px-2 py-1
      bg-white
    "
              style={{ borderColor: OYA_DARK }}
            >
              <input
                ref={fileInputRef}
                type="file"
                hidden
                disabled={listening}
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                onChange={handleFileChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mr-2 text-gray-500 hover:text-[#5E0F28]"
              >
                <FaPaperclip size={16} />
              </button>
              <input
                ref={inputRef}
                disabled={loading || !isOnline}
                readOnly={listening}
                type="text"
                inputMode="text"
                autoComplete="off"
                autoCapitalize="sentences"
                spellCheck="false"
                placeholder={
                  listening
                    ? "Listening..."
                    : !isOnline
                      ? "No internet connection…"
                      : language === "Hindi"
                        ? "अपना प्रश्न पूछें..."
                        : "Explore elegance with Oya..."
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                aria-label="Type a message"
                aria-disabled={loading || !isOnline}
                className="
                  flex-1
                  outline-none
                  text-[14px] text-[#333]
                  opacity-90
                  placeholder:text-[#9aa5a0]
                  bg-transparent
                  disabled:cursor-not-allowed
                "
              />

              {/* Voice Wave */}
              {listening && (
                <div className="absolute left-[58px] right-[60px] flex items-center justify-center gap-[3px] pointer-events-none">
                  {[...Array(18)].map((_, i) => (
                    <span
                      key={i}
                      className="w-[3px] rounded-full animate-pulse"
                      style={{
                        height: `${10 + (i % 6) * 5}px`,
                        backgroundColor: OYA_GOLD,
                        animationDelay: `${i * 0.08}s`,
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Mic Button */}
              <button
                type="button"
                onClick={(e) => {
                  handleMicClick();
                  e.currentTarget.blur();
                }}
                disabled={!supported || loading}
                aria-label={listening ? "Stop recording" : "Start recording"}
                className={`
    oya-ctrl
    mr-2
    w-[35px]
    h-[35px]
    rounded-full
    flex
    items-center
    justify-center
    transition-all
    duration-300
    ${
      listening
        ? "bg-red-600 hover:bg-red-700 text-white"
        : "bg-gray-100 text-[#5E0F28] hover:bg-[#5E0F28] hover:text-white"
    }
    ${loading ? "opacity-50 cursor-not-allowed" : ""}
  `}
              >
                {listening ? <FaStop size={13} /> : <FaMicrophone size={15} />}
              </button>

              {/* Send Button */}
              <button
                disabled={!canSend}
                onClick={() => handleSendMessage()}
                aria-label="Send message"
                style={{
                  backgroundColor: canSend ? OYA_DARK : "#e5e7eb",
                }}
                className="
    oya-ctrl
    w-[35px]
    h-[35px]
    rounded-[12px]
    flex
    items-center
    justify-center
    shrink-0
    hover:scale-105
    active:scale-95
    disabled:cursor-not-allowed
    disabled:hover:scale-100
    transition-all
    duration-200
  "
              >
                {loading ? (
                  <div className="w-[15px] h-[15px] border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <FaPaperPlane
                    size={14}
                    className={canSend ? "text-white" : "text-gray-400"}
                  />
                )}
              </button>
            </div>

            {showBranding && (
            <div className="text-center text-[11px] text-[#9ca3af] mt-3">
              Powered by
              <span style={{ color: OYA_DARK }} className="font-semibold">
                {" "}
                Nuform Social
              </span>
              &nbsp;&nbsp;nuformsocial.com
            </div>
            )}
          </footer>
        </div>
      )}
    </>
  );
}

export default OyaBot;
