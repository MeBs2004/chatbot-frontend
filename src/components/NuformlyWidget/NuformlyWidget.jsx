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
import {
  FaTimes,
  FaPaperPlane,
  FaTrash,
  FaChevronDown,
  FaRedo,
} from "react-icons/fa";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

// Phase 5 v1 engine — config-driven rendering for chatbots explicitly
// flipped to widgetEngineVersion "v1". Production chatbots stay on the
// legacy Bot/OyaBot components untouched; see Embed.jsx for the branch.
//
// Deliberately NOT implemented here (documented limitation, not a bug):
// voice input/TTS, file upload, the Studio's `forms` feature. All are
// real, working features of the legacy widgets that this first version
// of the config-driven engine does not yet reimplement.

const SIZE_PX = { small: 320, medium: 365, large: 400 };
const RADIUS_PX = { none: 0, small: 8, medium: 16, large: 28 };

function chatHistoryKey(chatbotId) {
  return `nuformly_v1_chat_history_${chatbotId}`;
}

function NuformlyWidget({ companyId, chatbotId, embed = false }) {
  const [state, setState] = useState("loading"); // loading | ready | unavailable | error
  const [unavailableReason, setUnavailableReason] = useState(null);
  const [chatbotMeta, setChatbotMeta] = useState(null);
  const [config, setConfig] = useState(null);

  const [language, setLanguage] = useState("English");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [openBot, setOpenBot] = useState(embed ? true : false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [failedMessage, setFailedMessage] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const chatAreaRef = useRef(null);
  const mountedRef = useRef(true);
  const userScrolledUpRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const onOnline = () => mountedRef.current && setIsOnline(true);
    const onOffline = () => mountedRef.current && setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // Load public, unauthenticated widget config
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const res = await axios.get(
          `${BACKEND_URL}api/widget/config/${chatbotId}`,
          { signal: controller.signal },
        );
        if (!mountedRef.current) return;

        if (!res.data?.success) {
          setState("error");
          return;
        }
        if (!res.data.available) {
          setState("unavailable");
          setUnavailableReason(res.data.reason || "unavailable");
          return;
        }

        setChatbotMeta(res.data.chatbot);
        setConfig(res.data.config);
        setLanguage(res.data.config?.language?.defaultLanguage || "English");
        setState("ready");
      } catch (err) {
        if (!axios.isCancel(err) && mountedRef.current) {
          console.error("Widget Config Error:", err.response?.data || err.message);
          setState("error");
        }
      }
    };
    load();
    return () => controller.abort();
  }, [chatbotId]);

  // Chat history (per chatbot, separate from legacy widgets' own keys)
  useEffect(() => {
    if (state !== "ready") return;
    try {
      const saved = localStorage.getItem(chatHistoryKey(chatbotId));
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          setShowSuggestions(false);
        }
      }
    } catch {
      localStorage.removeItem(chatHistoryKey(chatbotId));
    }
  }, [state, chatbotId]);

  useEffect(() => {
    if (messages.length === 0) return;
    try {
      localStorage.setItem(chatHistoryKey(chatbotId), JSON.stringify(messages));
    } catch {
      /* quota exceeded */
    }
  }, [messages, chatbotId]);

  // Suggestions (same public endpoint the legacy widgets use)
  useEffect(() => {
    if (state !== "ready") return;
    const controller = new AbortController();
    const fetch_ = async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}bot/v1/suggestions`, {
          params: { language },
          headers: { "x-company-id": companyId },
          signal: controller.signal,
        });
        if (mountedRef.current && res.data.success) {
          setSuggestions([...new Set(res.data.suggestions)]);
        }
      } catch (err) {
        if (!axios.isCancel(err)) {
          console.error("Suggestions Error:", err.response?.data || err.message);
        }
      }
    };
    fetch_();
    return () => controller.abort();
  }, [state, language, companyId]);

  // Visitor tracking — same shared visitorId key as the legacy widgets
  useEffect(() => {
    if (state !== "ready") return;
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
          { headers: { "x-company-id": companyId }, signal: controller.signal },
        );
      } catch (err) {
        if (!axios.isCancel(err)) {
          console.error("Visitor Error:", err.response?.data || err.message);
        }
      }
    };
    save();
    return () => controller.abort();
  }, [state, companyId]);

  useEffect(() => {
    if (!userScrolledUpRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

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

  const canSend = useMemo(
    () => Boolean(input.trim()) && !loading && isOnline,
    [input, loading, isOnline],
  );

  const handleSendMessage = useCallback(
    async (customMessage = null) => {
      const messageText = (customMessage || input).trim();
      if (!messageText || loading || !isOnline) return;

      setFailedMessage(null);
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

        const res = await axios.post(`${BACKEND_URL}bot/v1/message`, formData, {
          headers: {
            "x-company-id": companyId,
            "Content-Type": "multipart/form-data",
          },
        });

        if (!mountedRef.current) return;

        const botText = res.data?.botMessage;
        if (!res.data?.success || typeof botText !== "string") {
          throw new Error("Malformed response");
        }

        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), text: botText, sender: "bot" },
        ]);
      } catch (err) {
        if (!mountedRef.current) return;
        console.error("Message Error:", err.response?.data || err.message);
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            text: "Server error. Please try again.",
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
    [input, loading, isOnline, language, companyId],
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
    localStorage.removeItem(chatHistoryKey(chatbotId));
    setMessages([]);
    setShowSuggestions(true);
    setFailedMessage(null);
  }, [chatbotId]);

  const handleKeyPress = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage],
  );

  const handleClose = useCallback(() => {
    if (embed) {
      window.parent.postMessage({ type: "NUFORMLY_CLOSE" }, "*");
    } else {
      setOpenBot(false);
    }
  }, [embed]);

  // ── Not-yet-ready states ──────────────────────────────────────────────
  if (state === "loading") {
    if (!embed && !openBot) return null;
    return (
      <div
        className={
          embed
            ? "w-[365px] h-[547px] rounded-[24px] border border-[#e5e7eb] bg-white flex items-center justify-center"
            : "fixed bottom-5 right-5 w-[365px] h-[547px] rounded-[24px] border border-[#e5e7eb] bg-white flex items-center justify-center"
        }
      >
        <div className="w-[30px] h-[30px] rounded-full border-4 border-gray-200 border-t-gray-500 animate-spin" />
      </div>
    );
  }

  if (state === "unavailable" || state === "error") {
    // Honest, no fake UI: nothing renders for a paused/offline/broken
    // chatbot rather than pretending it's online.
    return null;
  }

  const launcher = config.launcher;
  const win = config.chatWindow;
  const behavior = config.behavior;
  const width = SIZE_PX[win.size] || SIZE_PX.medium;
  const height = Math.round(width * 1.5);
  const radius = RADIUS_PX[win.borderRadius] ?? RADIUS_PX.large;
  const isDark = win.theme === "dark";
  const botBubbleColor = isDark ? "#1F2937" : "#F3F4F6";
  const botTextColor = isDark ? "#F3F4F6" : win.textColor;

  const positionClass =
    launcher.position === "bottom-left" ? "left-5" : "right-5";

  // ── Launcher ─────────────────────────────────────────────────────────
  if (!embed && !openBot) {
    if (launcher.enabled === false) return null;
    return (
      <div className={`fixed bottom-5 ${positionClass} z-50`}>
        {launcher.showGreeting && (
          <div
            className={`absolute bottom-[70px] ${launcher.position === "bottom-left" ? "left-0" : "right-0"} bg-white rounded-xl shadow-lg px-4 py-3 max-w-[220px] border border-gray-100`}
          >
            <p className="text-[13px] font-semibold text-gray-800 mb-[2px]">
              {launcher.greetingTitle}
            </p>
            <p className="text-[12px] text-gray-500">{launcher.greetingMessage}</p>
          </div>
        )}
        <button
          onClick={() => setOpenBot(true)}
          aria-label={`Open ${win.botName || "chat"}`}
          style={{
            backgroundColor: launcher.color,
            width: launcher.size === "large" ? 68 : launcher.size === "small" ? 52 : 60,
            height: launcher.size === "large" ? 68 : launcher.size === "small" ? 52 : 60,
            borderRadius: launcher.shape === "square" ? 16 : "9999px",
          }}
          className="flex items-center justify-center shadow-lg hover:scale-105 transition-transform duration-200"
        >
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#fff" strokeWidth="2">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        </button>
      </div>
    );
  }

  // ── Chat panel ───────────────────────────────────────────────────────
  return (
    <div
      role="dialog"
      aria-label={`${win.botName || "Chat"} window`}
      style={{
        width,
        height,
        borderRadius: radius,
        background: win.backgroundColor,
        fontFamily:
          config.appearance?.font === "system" || !config.appearance?.font
            ? undefined
            : config.appearance.font,
      }}
      className={
        embed
          ? "overflow-hidden flex flex-col border border-[#e5e7eb]"
          : `fixed bottom-5 ${positionClass} overflow-hidden flex flex-col border border-[#e5e7eb] shadow-2xl z-50`
      }
    >
      {config.appearance?.customCss ? (
        <style>{config.appearance.customCss}</style>
      ) : null}

      {!isOnline && (
        <div className="shrink-0 bg-red-500 text-white text-[11px] font-semibold text-center py-[6px] px-4">
          No internet connection — messages won't send.
        </div>
      )}

      <header
        style={{ backgroundColor: win.primaryColor }}
        className="shrink-0 h-[64px] px-4 flex items-center justify-between text-white"
      >
        <div className="flex items-center gap-3 min-w-0">
          {win.botAvatar ? (
            <img
              src={win.botAvatar}
              alt=""
              className="w-[36px] h-[36px] rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-[36px] h-[36px] rounded-full bg-white/20 flex-shrink-0" />
          )}
          <div className="min-w-0">
            <h2 className="font-semibold text-[14px] leading-none truncate">
              {win.botName || chatbotMeta?.name || "Chat"}
            </h2>
            {win.companyName || chatbotMeta?.companyName ? (
              <p className="text-[11px] text-white/70 mt-[4px] truncate">
                {win.companyName || chatbotMeta?.companyName}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={clearChatHistory}
            aria-label="Clear chat history"
            title="Clear history"
            className="w-[20px] h-[20px] rounded-full bg-white/20 flex items-center justify-center"
          >
            <FaTrash size={10} />
          </button>

          {config.language?.defaultLanguage !== undefined && (
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              aria-label="Select language"
              className="bg-white/20 text-white text-[10px] px-1 py-1 rounded-[6px] outline-none border-none cursor-pointer"
            >
              <option value="English">EN</option>
              <option value="Hindi">HI</option>
            </select>
          )}

          <button
            onClick={handleClose}
            aria-label="Close chat"
            className="w-[20px] h-[20px] rounded-full bg-white/20 flex items-center justify-center"
          >
            <FaTimes size={12} />
          </button>
        </div>
      </header>

      <div className="flex-1 relative overflow-hidden">
        <main
          ref={chatAreaRef}
          onScroll={handleChatScroll}
          className="h-full overflow-y-auto px-4 py-4"
        >
          {messages.length === 0 && (
            <div
              style={{ background: botBubbleColor, color: botTextColor }}
              className="rounded-[16px] p-4 text-[13.5px] leading-[1.7] mb-4"
            >
              {win.welcomeMessage}
            </div>
          )}

          {messages.map((msg, index) => (
            <div
              key={msg.id ?? `${msg.sender}-${index}`}
              className={`flex mb-3 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`flex flex-col max-w-[82%] ${msg.sender === "user" ? "items-end" : "items-start"}`}>
                <div
                  style={{
                    backgroundColor: msg.sender === "user" ? win.primaryColor : botBubbleColor,
                    color: msg.sender === "user" ? "#ffffff" : botTextColor,
                  }}
                  className="px-[14px] py-[10px] text-[13.5px] leading-[1.6] whitespace-pre-wrap rounded-[14px] break-words"
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                </div>
                {msg.failed && failedMessage && (
                  <button
                    onClick={handleRetry}
                    style={{ color: win.primaryColor }}
                    className="mt-[4px] flex items-center gap-[4px] text-[10.5px] font-medium hover:opacity-70"
                  >
                    <FaRedo size={9} />
                    <span>Retry</span>
                  </button>
                )}
              </div>
            </div>
          ))}

          {loading && behavior.typingIndicator && (
            <div className="flex mb-3 justify-start">
              <div
                style={{ background: botBubbleColor }}
                className="inline-flex items-center gap-2 px-4 py-3 rounded-[14px]"
              >
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-[7px] h-[7px] rounded-full animate-bounce"
                    style={{ backgroundColor: win.primaryColor, animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          )}

          {showSuggestions && suggestions.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              {suggestions.map((item, index) => (
                <button
                  key={`suggestion-${index}-${item}`}
                  onClick={() => handleSendMessage(item)}
                  style={{ background: botBubbleColor, color: botTextColor }}
                  className="min-h-[30px] px-3 rounded-full border border-black/5 text-[11px] font-medium text-left flex items-center hover:opacity-80 transition-opacity"
                >
                  {item}
                </button>
              ))}
            </div>
          )}

          <div ref={messagesEndRef} />
        </main>

        {showScrollBtn && (
          <button
            onClick={scrollToLatest}
            style={{ backgroundColor: win.primaryColor }}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-[5px] px-3 py-[6px] rounded-full text-white text-[11px] font-semibold shadow-lg z-10"
          >
            <FaChevronDown size={10} />
            <span>Latest</span>
          </button>
        )}
      </div>

      <footer className="shrink-0 bg-white border-t border-[#e8e8e8] px-3 py-3">
        <div
          className="flex items-center border-2 rounded-[16px] px-2 py-1 bg-white"
          style={{ borderColor: win.primaryColor }}
        >
          <input
            ref={inputRef}
            disabled={loading || !isOnline}
            type="text"
            autoComplete="off"
            placeholder={!isOnline ? "No internet connection…" : "Type a message..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            aria-label="Type a message"
            className="flex-1 outline-none text-[13.5px] text-[#333] px-2 py-2 bg-transparent disabled:cursor-not-allowed"
          />
          <button
            disabled={!canSend}
            onClick={() => handleSendMessage()}
            aria-label="Send message"
            style={{ backgroundColor: canSend ? win.primaryColor : "#e5e7eb" }}
            className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center shrink-0 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <div className="w-[14px] h-[14px] border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <FaPaperPlane size={13} className={canSend ? "text-white" : "text-gray-400"} />
            )}
          </button>
        </div>

        {win.showBranding && (
          <div className="text-center text-[10.5px] text-[#9ca3af] mt-2">
            Powered by <span style={{ color: win.primaryColor }} className="font-semibold">Nuformly</span>
          </div>
        )}
      </footer>
    </div>
  );
}

export default NuformlyWidget;
