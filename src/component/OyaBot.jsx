import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import logo from "../assets/oya-logo.png";
import {
  FaTimes,
  FaPaperPlane,
  FaTrash,
  FaWhatsapp,
  FaEnvelope,
  FaPhoneAlt,
  FaChevronDown,
  FaRedo,
  FaCopy,
  FaCheck,
} from "react-icons/fa";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const OYA_DARK = "#5E0F28";
const OYA_MID = "#8C2346";
const OYA_GOLD = "#B8865B";
const OYA_CHAMPAGNE = "#F3D6B6";

const OYA_SERVICE_CHIPS = [
  "Natural Gemstones",
  "Premium Jewellery",
  "Personalized Reco",
  "Book Appointment",
  "Customer Support",
];

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
  @keyframes fabGlow {
    0%   { box-shadow: 0 0 0 0    rgba(255,255,255,0.55); }
    70%  { box-shadow: 0 0 0 14px rgba(255,255,255,0);    }
    100% { box-shadow: 0 0 0 0    rgba(255,255,255,0);    }
  }
  @keyframes badgeBounce {
    0%,100% { transform: scale(1);   }
    50%     { transform: scale(1.2); }
  }

  .bot-enter { animation: botEnter 0.44s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
  .msg-enter { animation: msgSlide 0.22s ease forwards; }
  .fade-up   { animation: fadeUp   0.28s ease forwards; }
  .fab-glow  { animation: fabGlow  2.4s  ease-out infinite; }

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

  .lang-select option { background: #ffffff; color: #1e293b; font-weight: 500; }

  @media (max-width: 480px) {
    .bot-panel {
      bottom:        0 !important;
      right:         0 !important;
      width:         100vw  !important;
      max-width:     100vw  !important;
      height:        100dvh !important;
      border-radius: 0 !important;
    }
    .fab-wrap { bottom: 20px !important; right: 16px !important; }
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
function OyaBot() {
  const COMPANY_ID = window.NUFORMLY_CONFIG?.companyId || "oya-gemkara";

  const [company, setCompany] = useState(null);
  const [emailAsked, setEmailAsked] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [language, setLanguage] = useState("English");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [openBot, setOpenBot] = useState(true);
  const [animateBot, setAnimateBot] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [failedMessage, setFailedMessage] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const chatAreaRef = useRef(null);
  const mountedRef = useRef(true);
  const userScrolledUpRef = useRef(false);
  const openBotTimerRef = useRef(null);

  const theme = useMemo(() => company?.theme, [company]);
  const botAvatar = useMemo(
    () => company?.branding?.botAvatar || logo,
    [company],
  );
  const canSend = useMemo(
    () => Boolean(input.trim()) && !loading && isOnline,
    [input, loading, isOnline],
  );

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
        const res = await axios.get(`${BACKEND_URL}bot/v1/company`, {
          headers: { "x-company-id": COMPANY_ID },
          signal: controller.signal,
        });
        if (mountedRef.current && res.data.success)
          setCompany(res.data.company);
      } catch (err) {
        if (!axios.isCancel(err))
          console.error(
            "Company Load Error:",
            err.response?.data || err.message,
          );
      }
    };
    load();
    return () => controller.abort();
  }, [BACKEND_URL, COMPANY_ID]);

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

  // ── Handlers ─────────────────────────────────────────────────────────────────

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

  const handleSendMessage = useCallback(
    async (customMessage = null) => {
      const messageText = (customMessage || input).trim();
      if (!messageText || loading || !isOnline) return;

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
        const res = await axios.post(
          `${BACKEND_URL}bot/v1/message`,
          {
            text: messageText,
            language,
            visitorId: localStorage.getItem("visitorId"),
          },
          { headers: { "x-company-id": COMPANY_ID } },
        );

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
          setLoading(false);
          requestAnimationFrame(() => inputRef.current?.focus());
        }
      }
    },
    [input, loading, isOnline, emailAsked, userEmail, language, COMPANY_ID],
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
    localStorage.removeItem("oya_chat_history");
    localStorage.removeItem("oya_user_email");
    setMessages([]);
    setUserEmail("");
    setEmailAsked(false);
    setShowSuggestions(true);
    setFailedMessage(null);
  }, []);

  const handleKeyPress = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage],
  );

  const handleOpenBot = useCallback(() => {
    setOpenBot(true);
    openBotTimerRef.current = setTimeout(() => inputRef.current?.focus(), 320);
  }, []);

  if (!company || !theme) return null;

  // ── UI ────────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{GLOBAL_STYLES}</style>

      {/* ════════════ Floating Button ════════════ */}
      {!openBot && (
        <div className="fab-wrap fixed bottom-5 right-5 z-50">
          <button
            onClick={handleOpenBot}
            aria-label="Open OYA jewellery assistant"
            style={{ backgroundColor: OYA_DARK }}
            className="
              oya-ctrl fab-glow
              w-[60px] h-[60px]
              rounded-full
              flex items-center justify-center
              shadow-2xl
              hover:scale-105
              active:scale-95
              transition-all duration-300
            "
          >
            <img
              src={logo}
              alt="OYA by Gemkara"
              className="w-[35px] h-[35px] object-cover rounded-full"
            />
          </button>

          <span
            aria-label="1 new message"
            style={{ animation: "badgeBounce 1.8s ease-in-out infinite" }}
            className="
              absolute -top-[4px] -right-[4px]
              w-[19px] h-[19px]
              bg-red-500 text-white text-[9px] font-bold
              rounded-full flex items-center justify-center
              border-2 border-white shadow-md
            "
          >
            1
          </span>
        </div>
      )}

      {/* ════════════ Chat Panel ════════════ */}
      {openBot && (
        <div
          role="dialog"
          aria-label="OYA Jewellery Assistant Chat"
          aria-modal="true"
          style={{ background: theme.backgroundColor }}
          className={`
            bot-panel
            fixed bottom-5 right-5
            w-[365px] h-[547px]
            rounded-[28px]
            overflow-hidden
            flex flex-col
            z-50
            border border-[#dcdcdc]
            -m-3
            transition-all duration-500
            ${
              animateBot
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
                bg-red-500/90 text-white
                text-[11.5px] font-semibold
                text-center py-[7px] px-4
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
                  src={logo}
                  alt="OYA logo"
                  className="w-[34px] h-[38px] object-cover rounded-[8px]"
                />
              </div>

              <div>
                <h2 className="font-semibold text-[15px] leading-none whitespace-nowrap">
                  {company.chatbot.chatbotName}
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
                    Online · Always ready
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
                onClick={() => setOpenBot(false)}
                aria-label="Close chat"
                className="
                  oya-ctrl
                  w-[20px] h-[20px]
                  rounded-full
                  bg-[#ffffff22]
                  flex items-center justify-center
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
                      background: theme.botBubbleColor,
                      color: theme.textColor,
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
                        👋 नमस्ते! मैं {company.chatbot.botName} हूँ। OYA by
                        Gemkara में आपका स्वागत है। मैं आपकी सहायता कर सकती हूँ:
                        • प्राकृतिक रत्न • प्रीमियम ज्वेलरी • व्यक्तिगत सुझाव •
                        अपॉइंटमेंट बुकिंग • ऑर्डर सहायता। आज मैं आपकी किस प्रकार
                        सहायता कर सकती हूँ?
                      </p>
                    ) : (
                      <p className="text-[13.5px] leading-[1.72]">
                        👋 Welcome to OYA by Gemkara. I'm{" "}
                        {company.chatbot.botName}, your luxury jewellery
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

                  {/* Contact Buttons */}
                  <div className="flex gap-2 mb-5">
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
                      src={logo}
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
                            ? theme.primaryColor
                            : theme.botBubbleColor,
                        color:
                          msg.sender === "user" ? "#ffffff" : theme.textColor,
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
                  </div>
                </div>
              ))}

              {/* Loading */}
              {loading && (
                <div className="flex mb-4 msg-enter justify-start">
                  <img
                    src={logo}
                    alt=""
                    aria-hidden="true"
                    className="w-[32px] h-[32px] rounded-full object-cover mr-2 mt-1 flex-shrink-0"
                  />
                  <div
                    style={{ background: theme.botBubbleColor }}
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
                        background: theme.botBubbleColor,
                        color: theme.textColor,
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
            <div
              className="
                flex items-center
                border-2 rounded-[18px]
                px-2 py-1
                bg-white
              "
              style={{ borderColor: OYA_DARK }}
            >
              <input
                ref={inputRef}
                disabled={loading || !isOnline}
                type="text"
                inputMode="text"
                autoComplete="off"
                autoCapitalize="sentences"
                spellCheck="false"
                placeholder={
                  !isOnline
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

              <button
                disabled={!canSend}
                onClick={() => handleSendMessage()}
                aria-label="Send message"
                style={{ backgroundColor: canSend ? OYA_DARK : "#e5e7eb" }}
                className="
                  oya-ctrl
                  w-[35px] h-[35px]
                  rounded-[12px]
                  flex items-center justify-center
                  shrink-0
                  hover:scale-105 active:scale-95
                  disabled:cursor-not-allowed disabled:hover:scale-100
                  transition-all duration-200
                "
              >
                {loading ? (
                  <div
                    className="w-[15px] h-[15px] border-2 border-white border-t-transparent rounded-full animate-spin"
                    aria-label="Sending…"
                  />
                ) : (
                  <FaPaperPlane
                    size={14}
                    className={canSend ? "text-white" : "text-gray-400"}
                  />
                )}
              </button>
            </div>

            <div className="text-center text-[11px] text-[#9ca3af] mt-3">
              Powered by
              <span style={{ color: OYA_DARK }} className="font-semibold">
                {" "}
                OYA by Gemkara
              </span>
              &nbsp;&nbsp;oyabygemkara.com
            </div>
          </footer>
        </div>
      )}
    </>
  );
}

export default OyaBot;
