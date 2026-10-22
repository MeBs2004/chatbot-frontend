import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import axios from "axios";
import { createWidgetClient, requestTokenFromParent } from "./widgetApi.js";

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
  FaPhoneAlt,
  FaWhatsapp,
  FaEnvelope,
  FaExternalLinkAlt,
  FaCalculator,
  FaPlus,
  FaTimesCircle,
  FaFile,
  FaFilePdf,
  FaFileWord,
  FaFileExcel,
  FaMicrophone,
  FaStop,
  FaVolumeUp,
  FaVolumeMute,
  FaPaperclip,
} from "react-icons/fa";
import useSpeechRecognition from "../../hooks/useSpeechRecognition.js";
import useTextToSpeech from "../../hooks/useTextToSpeech.js";
import { primeNotificationSound, playBotReplySound } from "../../utils/notificationSound.js";
import SectorCalculatorPanel from "./SectorCalculatorPanel.jsx";
import PreChatForm from "./PreChatForm.jsx";
import { resolveWindowStyle, animationCss, animClass, messageAnimClass, welcomeFor, placeholderFor, readableOn, uiText, shown } from "./widgetStyle.js";

const CTA_ICON = { call: FaPhoneAlt, whatsapp: FaWhatsapp, email: FaEnvelope, custom: FaExternalLinkAlt };
const CTA_HREF = {
  call: (v) => `tel:${v}`,
  whatsapp: (v) => `https://wa.me/${String(v).replace(/[^\d]/g, "")}`,
  email: (v) => `mailto:${v}`,
  custom: (v) => v,
};

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

// Bot replies are Markdown. Tailwind's reset strips list bullets and heading
// sizes, so each element is styled explicitly (same as the original widget).
/* eslint-disable no-unused-vars -- react-markdown passes `node`; it must not reach the DOM element */
const MD_COMPONENTS = {
  a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline break-all" />,
  img: ({ node: _node, ...props }) => <img {...props} alt={props.alt || "Image"} className="rounded-xl my-3 max-w-full border" />,
  ul: ({ node: _node, ...props }) => <ul {...props} className="list-disc pl-5 my-2" />,
  ol: ({ node: _node, ...props }) => <ol {...props} className="list-decimal pl-5 my-2" />,
  h1: ({ node: _node, ...props }) => <h1 {...props} className="text-[20px] font-bold mb-2" />,
  h2: ({ node: _node, ...props }) => <h2 {...props} className="text-[18px] font-semibold mb-2" />,
  h3: ({ node: _node, ...props }) => <h3 {...props} className="text-[16px] font-semibold mb-2" />,
  p: ({ node: _node, ...props }) => <p {...props} className="nfw-p" />,
  strong: ({ node: _node, ...props }) => <strong {...props} className="font-bold" />,
};
/* eslint-enable no-unused-vars */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Phase 5 v1 engine — config-driven rendering for chatbots explicitly
// flipped to widgetEngineVersion "v1". Production chatbots stay on the
// legacy Bot/OyaBot components untouched; see Embed.jsx for the branch.
//
// Deliberately NOT implemented here (documented limitation, not a bug):
// voice input/TTS, file upload, the Studio's `forms` feature. All are
// real, working features of the legacy widgets that this first version
// of the config-driven engine does not yet reimplement.


function chatHistoryKey(chatbotId) {
  return `nuformly_v1_chat_history_${chatbotId}`;
}

// Origin of the page that embedded this iframe (widget.js). Token
// refreshes and live config are only ever accepted from it.
function parentOriginOf() {
  try {
    return document.referrer ? new URL(document.referrer).origin : null;
  } catch {
    return null;
  }
}

function NuformlyWidget({ companyId, chatbotId, embed = false, token = null }) {
  // Widget session token (one-line snippet). Without one this is an old
  // install and requests keep identifying the company by x-company-id.
  const tokenRef = useRef(token);
  const clientRef = useRef(null);
  if (!clientRef.current) {
    const parentOrigin = parentOriginOf();
    clientRef.current = createWidgetClient({
      baseURL: BACKEND_URL,
      getToken: () => tokenRef.current,
      requestToken: async () => {
        if (!tokenRef.current || !parentOrigin) return null;
        const fresh = await requestTokenFromParent(parentOrigin);
        if (fresh) tokenRef.current = fresh;
        return fresh;
      },
    });
  }
  const api = clientRef.current;
  const companyHeader = useCallback(
    () => (tokenRef.current ? {} : { "x-company-id": companyId }),
    [companyId],
  );
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
  const [showCalculator, setShowCalculator] = useState(false);
  // Pre-chat form (config.forms): remembered per chatbot so a returning
  // visitor isn't asked again.
  const [formDone, setFormDone] = useState(() => {
    try {
      return localStorage.getItem(`nuformly_v1_form_${chatbotId}`) === "1";
    } catch {
      return false;
    }
  });
  const soundRef = useRef(false);

  // Attachments, voice, read-aloud and the email prompt (behavior.*).
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState("");
  const [emailAsked, setEmailAsked] = useState(false);
  const [userEmail, setUserEmail] = useState(() => {
    try {
      return localStorage.getItem(`nuformly_v1_email_${chatbotId}`) || "";
    } catch {
      return "";
    }
  });
  const [showRecordingBubble, setShowRecordingBubble] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState(null);
  const fileInputRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const {
    transcript,
    listening,
    supported: micSupported,
    startListening,
    stopListening,
    setTranscript,
  } = useSpeechRecognition(language === "Hindi" ? "hi-IN" : "en-US");
  const { supported: ttsSupported, speaking, speak, stop: stopSpeaking } = useTextToSpeech();

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
        const res = await api.get(`api/widget/config/${chatbotId}`, { signal: controller.signal });
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
  }, [chatbotId, api]);

  // Live Studio changes, forwarded by widget.js (NUFORMLY_CONFIG). Only
  // from the page that embedded us, and only for token installs.
  useEffect(() => {
    const parentOrigin = parentOriginOf();
    if (!token || !parentOrigin) return;
    const onMessage = (event) => {
      if (event.origin !== parentOrigin || event.data?.type !== "NUFORMLY_CONFIG" || !event.data.config) return;
      setConfig(event.data.config);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [token]);

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
      // A file's preview is a temporary blob URL — only its name/type survive a reload.
      const persistable = messages.map((m) => (m.file ? { ...m, file: { name: m.file.name, type: m.file.type } } : m));
      localStorage.setItem(chatHistoryKey(chatbotId), JSON.stringify(persistable));
    } catch {
      /* quota exceeded */
    }
  }, [messages, chatbotId]);

  // Suggestions — a chatbot with its own configured suggestions
  // (config.suggestions, set via Customize) uses those directly, no
  // network call needed. Empty means "fall back to the company-wide
  // suggestions endpoint", the same one the legacy widgets use —
  // unchanged behavior for every chatbot that never sets this.
  useEffect(() => {
    if (state !== "ready") return;
    if (config?.suggestions?.length > 0) {
      setSuggestions(config.suggestions);
      return;
    }
    const controller = new AbortController();
    const fetch_ = async () => {
      try {
        const res = await api.get("bot/v1/suggestions", {
          params: { language },
          headers: companyHeader(),
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
  }, [state, language, companyId, config?.suggestions, api, companyHeader]);

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
        await api.post(
          "bot/v1/visitor",
          {
            visitorId,
            browser: navigator.userAgent,
            os: navigator.platform,
            device: window.innerWidth < 768 ? "Mobile" : "Desktop",
            language: navigator.language,
            page: window.location.href,
          },
          { headers: companyHeader(), signal: controller.signal },
        );
      } catch (err) {
        if (!axios.isCancel(err)) {
          console.error("Visitor Error:", err.response?.data || err.message);
        }
      }
    };
    save();
    return () => controller.abort();
  }, [state, companyId, api, companyHeader]);

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
    () => (Boolean(input.trim()) || Boolean(selectedFile)) && !loading && isOnline,
    [input, selectedFile, loading, isOnline],
  );

  const clearSelectedFile = useCallback(() => {
    setSelectedFile(null);
    setFilePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setFilePreview(file.type.startsWith("image/") || file.type.startsWith("video/") ? URL.createObjectURL(file) : "");
  }, []);

  const handleSendMessage = useCallback(
    async (customMessage = null) => {
      // Never keep recording once a message is on its way.
      if (listening) {
        stopListening();
        clearTimeout(silenceTimerRef.current);
        setShowRecordingBubble(false);
      }

      const messageText = (typeof customMessage === "string" ? customMessage : input).trim();
      if ((!messageText && !selectedFile) || loading || !isOnline) return;

      const behavior = config?.behavior || {};
      if (behavior.sound) primeNotificationSound();

      // The visitor is answering "what's your email?" — save it, don't ask the AI.
      if (behavior.askEmail && emailAsked && !userEmail && EMAIL_RE.test(messageText)) {
        setUserEmail(messageText);
        setEmailAsked(false);
        try {
          localStorage.setItem(`nuformly_v1_email_${chatbotId}`, messageText);
        } catch {
          /* storage unavailable */
        }
        try {
          await api.post(
            "bot/v1/visitor/email",
            { visitorId: localStorage.getItem("visitorId"), email: messageText },
            { headers: companyHeader() },
          );
        } catch (err) {
          console.error("Email save failed:", err.response?.data || err.message);
        }
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), ts: Date.now(), text: messageText, sender: "user" },
          {
            id: crypto.randomUUID(),
            ts: Date.now(),
            text: uiText(config, "emailThanks", "✅ Thank you! We've saved your email address. How else can we help you today?"),
            sender: "bot",
          },
        ]);
        if (soundRef.current) playBotReplySound();
        setInput("");
        clearSelectedFile();
        setShowSuggestions(false);
        return;
      }

      const file = selectedFile;
      setFailedMessage(null);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          ts: Date.now(),
          text: messageText,
          sender: "user",
          file: file ? { name: file.name, type: file.type, size: file.size, preview: filePreview || null } : null,
        },
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
        formData.append("chatbotId", chatbotId);
        if (file) formData.append("file", file);

        const res = await api.post("bot/v1/message", formData, {
          headers: { ...companyHeader(), "Content-Type": "multipart/form-data" },
        });

        if (!mountedRef.current) return;

        const botText = res.data?.botMessage;
        if (!res.data?.success || typeof botText !== "string") {
          throw new Error("Malformed response");
        }

        setMessages((prev) => {
          const next = [...prev, { id: crypto.randomUUID(), ts: Date.now(), text: botText, sender: "bot" }];
          // After the third question, ask for an email (once).
          if (behavior.askEmail && !emailAsked && !userEmail && next.filter((m) => m.sender === "user").length >= 3) {
            next.push({
              id: crypto.randomUUID(),
              ts: Date.now(),
              text: uiText(config, "emailPrompt", "📧 Before we continue, could you please share your email address so our team can assist you better?"),
              sender: "bot",
            });
            setEmailAsked(true);
          }
          return next;
        });
        if (soundRef.current) playBotReplySound();
      } catch (err) {
        if (!mountedRef.current) return;
        console.error("Message Error:", err.response?.data || err.message);
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(), ts: Date.now(),
            text: uiText(config, "errorMessage", "Server error. Please try again."),
            sender: "bot",
            failed: true,
          },
        ]);
        setFailedMessage(messageText);
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          clearSelectedFile();
          requestAnimationFrame(() => inputRef.current?.focus());
        }
      }
    },
    [input, selectedFile, filePreview, loading, isOnline, listening, stopListening, emailAsked, userEmail, config, language, chatbotId, api, companyHeader, clearSelectedFile],
  );

  // ── Voice input: live transcript into the box, auto-stop after 5s of silence
  const voiceEnabled = Boolean(config?.behavior?.voiceInput);
  useEffect(() => {
    if (voiceEnabled && (listening || transcript)) setInput(transcript);
  }, [transcript, listening, voiceEnabled]);

  useEffect(() => {
    if (!listening) {
      clearTimeout(silenceTimerRef.current);
      setShowRecordingBubble(false);
      return undefined;
    }
    clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
      stopListening();
      setShowRecordingBubble(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }, 5000);
    return () => clearTimeout(silenceTimerRef.current);
  }, [transcript, listening, stopListening]);

  useEffect(() => {
    if (!speaking) setSpeakingMessageId(null);
  }, [speaking]);

  const handleMicClick = useCallback(() => {
    if (loading) return;
    clearTimeout(silenceTimerRef.current);
    if (listening) {
      stopListening();
      setShowRecordingBubble(false);
      setTimeout(() => inputRef.current?.focus(), 150);
      return;
    }
    if (input.trim()) return; // don't record over typed text
    setTranscript("");
    setInput("");
    setShowRecordingBubble(true);
    startListening();
  }, [loading, listening, input, stopListening, startListening, setTranscript]);

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

  // Save what the pre-chat form collected. Best-effort: a failed save
  // must never trap the visitor behind the form.
  const handleFormSubmit = useCallback(
    async (values) => {
      setFormDone(true);
      try {
        localStorage.setItem(`nuformly_v1_form_${chatbotId}`, "1");
      } catch {
        /* storage unavailable */
      }
      if (Object.keys(values).length === 0) return;
      try {
        await api.post(
          "bot/v1/visitor/profile",
          { visitorId: localStorage.getItem("visitorId"), ...values },
          { headers: companyHeader() },
        );
      } catch (err) {
        console.error("Form save failed:", err.response?.data || err.message);
      }
    },
    [chatbotId, api, companyHeader],
  );

  const clearChatHistory = useCallback(() => {
    localStorage.removeItem(chatHistoryKey(chatbotId));
    localStorage.removeItem(`nuformly_v1_email_${chatbotId}`);
    setMessages([]);
    setUserEmail("");
    setEmailAsked(false);
    setShowSuggestions(true);
    setFailedMessage(null);
    clearSelectedFile();
  }, [chatbotId, clearSelectedFile]);

  const handleKeyPress = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (listening) return; // never send while recording
        handleSendMessage();
      }
    },
    [handleSendMessage, listening],
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
  const look = resolveWindowStyle(config);
  const width = look.width;
  const height = look.height;
  const radius = look.radius;
  const botBubbleColor = look.botBubble;
  const botTextColor = look.botText;
  soundRef.current = Boolean(behavior.sound);
  const isOffline = behavior.offlineMode === "offline-message";
  const showForm = Boolean(config.forms?.enabled) && !formDone;
  // "Listen" / "Stop" read-aloud control: inside the bot bubble, or as a small link under it.
  const listenButton = (msg, index) => {
    if (!behavior.textToSpeech || !ttsSupported) return null;
    const active = speaking && speakingMessageId === index;
    const below = look.listenBelow;
    const StopIcon = below ? FaVolumeMute : FaStop;
    return (
      <button
        type="button"
        onClick={() => {
          if (active) {
            stopSpeaking();
            setSpeakingMessageId(null);
          } else {
            setSpeakingMessageId(index);
            speak(msg.text, language === "Hindi" ? "hi-IN" : "en-US");
          }
        }}
        className={
          below
            ? "nfw-listen-below mt-[6px] inline-flex items-center gap-1 p-0 text-[11px] text-[#6b7280] cursor-pointer transition-colors"
            : "mt-[10px] inline-flex items-center gap-[6px] p-0 text-[14px] font-medium text-[#6b7280] hover:text-[#4b5563] cursor-pointer transition-colors"
        }
        style={below ? { "--nf-hover": look.primary } : undefined}
      >
        {active ? <StopIcon size={below ? 12 : 14} /> : <FaVolumeUp size={below ? 12 : 15} />}
        <span>{active ? uiText(config, "stopLabel", language === "Hindi" ? "रोकें" : "Stop") : uiText(config, "listenLabel", language === "Hindi" ? "सुनें" : "Listen")}</span>
      </button>
    );
  };
  const typingStyle = win.typingStyle || "dots";
  const msgAnimFor = (isUser) => messageAnimClass("nfw", win.messageAnimation, isUser);
  const suggAnim = animClass("nfw", "sugg", win.suggestionAnimation);
  const botLabel = win.botName || chatbotMeta?.name || "Chat";
  const botInitial = botLabel.charAt(0).toUpperCase();
  const subtitle = win.subtitle || win.companyName || chatbotMeta?.companyName || "";
  const timeOf = (ts) => new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const suggestionStyle = (() => {
    if (win.suggestionStyle === "outline") return { background: "transparent", color: look.primary, border: `1.5px solid ${look.primary}` };
    if (win.suggestionStyle === "filled") return { background: look.primary, color: look.sendText, border: "1.5px solid transparent" };
    return { background: botBubbleColor, color: botTextColor, border: "1.5px solid transparent" };
  })();

  const positionClass =
    launcher.position === "bottom-left" ? "left-5" : "right-5";

  const template = chatbotMeta?.template;
  const hasCalculator = template === "digital_marketing" || template === "energy";

  const handleCalculatorResult = (text) => {
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), ts: Date.now(), text, sender: "bot" }]);
    setShowSuggestions(false);
  };

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
  const brandLine = look.brandName || "Nuformly";
  const welcomeText = welcomeFor(config, language);
  const welcomeWidth = look.welcomeMaxWidthPct ?? look.bubbleMaxWidthPct;
  const bubbleLineHeight = look.lineHeight ? `${look.lineHeight}px` : undefined;
  const ctaList = (config.ctas || []).filter((c) => c.enabled && c.value);
  const statusDot = (
    <span
      className="inline-block shrink-0 rounded-full animate-pulse"
      style={{ width: 6, height: 6, background: isOffline ? "#9ca3af" : look.statusDotColor, boxShadow: isOffline ? "none" : `0 0 8px ${look.statusDotColor}` }}
    />
  );
  const sc = look.suggestionColors;
  const suggestionLook = {
    ...suggestionStyle,
    ...(sc.bg ? { background: sc.bg } : {}),
    ...(sc.text ? { color: sc.text } : {}),
    ...(sc.border ? { border: `1px solid ${sc.border}` } : {}),
  };
  const fileKind = (type = "") =>
    type.startsWith("image/") ? "image" : type.startsWith("video/") ? "video" : type === "application/pdf" ? "pdf" : /word/.test(type) ? "word" : /excel|spreadsheet/.test(type) ? "excel" : "file";
  const FileIcon = { pdf: FaFilePdf, word: FaFileWord, excel: FaFileExcel, file: FaFile }[fileKind(selectedFile?.type)] || FaFile;
  const inputBg = look.dark ? "#0f1512" : "#ffffff";

  return (
    <div
      role="dialog"
      aria-label={`${botLabel} window`}
      style={{
        // In the iframe, the iframe itself is the size (set by widget.js, capped
        // to the visitor's screen); the panel simply fills it.
        width: embed ? "100%" : width,
        height: embed ? "100%" : height,
        borderRadius: radius,
        background: look.windowBg,
        color: look.baseText,
        fontFamily: look.fontFamily,
        fontSize: look.fontSize,
        borderColor: look.border,
      }}
      className={
        embed
          ? "overflow-hidden flex flex-col border"
          : `fixed bottom-5 ${positionClass} overflow-hidden flex flex-col border shadow-2xl z-50`
      }
    >
      {look.fontUrl ? <style>{`@import url('${look.fontUrl}');`}</style> : null}
      <style>{animationCss("nfw")}</style>
      <style>{`.nfw-input::placeholder { color: var(--nf-ph, #9ca3af); opacity: 1 } .nfw-listen-below:hover, .nfw-attach-plain:hover { color: var(--nf-hover) !important } .nfw-p { margin-bottom: var(--nf-pgap, 8px) } .nfw-p-trim .nfw-p:last-child { margin-bottom: 0 }`}</style>
      {config.appearance?.customCss ? (
        <style>{config.appearance.customCss}</style>
      ) : null}

      {!isOnline && (
        <div className="shrink-0 bg-red-500 text-white text-[11px] font-semibold text-center py-[6px] px-4">
          {uiText(config, "noInternetMessage", "No internet connection — messages won't send.")}
        </div>
      )}

      <header
        style={{ background: look.headerBg, backgroundSize: look.headerBgSize, color: look.headerText, height: look.headerHeight }}
        className={`shrink-0 px-4 flex items-center justify-between ${animClass("nfw", "head", win.headerAnimation)}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {shown(config, "showHeaderAvatar") && (
          <div className={`relative shrink-0 ${animClass("nfw", "avatar", win.avatarAnimation)}`}>
            {look.headerLogo && look.avatarTile ? (
              <div
                style={{ width: look.avatarSize, height: look.avatarSize, borderRadius: look.avatarRadius, background: "rgba(255,255,255,.13)" }}
                className="flex items-center justify-center overflow-hidden"
              >
                <img
                  src={look.headerLogo}
                  alt=""
                  style={{ width: look.headerLogoWidth, height: look.headerLogoHeight, borderRadius: 8 }}
                  className="object-cover"
                />
              </div>
            ) : look.headerLogo ? (
              <img
                src={look.headerLogo}
                alt=""
                style={{ width: look.avatarSize, height: look.avatarSize, borderRadius: look.avatarRadius }}
                className="object-cover"
              />
            ) : (
              <div
                style={{ width: look.avatarSize, height: look.avatarSize, fontSize: Math.round(look.avatarSize * 0.36), borderRadius: look.avatarRadius }}
                className="bg-white/20 flex items-center justify-center font-semibold"
              >
                {botInitial}
              </div>
            )}
            {win.showStatusDot !== false && isOnline && !look.inlineStatus && (
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-[10px] h-[10px] rounded-full border-2 ${isOffline ? "bg-gray-400" : "nfw-status"}`}
                style={{ borderColor: "#fff", ...(isOffline ? {} : { background: look.statusDotColor }) }}
              />
            )}
          </div>
          )}
          <div className="min-w-0">
            <h2 style={{ fontSize: look.headerTitleSize }} className="font-semibold leading-none truncate whitespace-nowrap">{botLabel}</h2>
            {look.inlineStatus && win.showStatusDot !== false ? (
              <div className="flex items-center gap-2 mt-[5px]">
                {statusDot}
                <p
                  style={{ fontSize: look.headerSubtitleSize, ...(look.headerSubtitleColor ? { color: look.headerSubtitleColor } : { opacity: 0.75 }) }}
                  className="leading-none truncate"
                >
                  {isOffline ? "Currently offline" : subtitle}
                </p>
              </div>
            ) : isOffline || subtitle ? (
              <p
                style={{ fontSize: look.headerSubtitleSize, ...(look.headerSubtitleColor ? { color: look.headerSubtitleColor } : { opacity: 0.75 }) }}
                className="mt-[4px] truncate"
              >
                {isOffline ? "Currently offline" : subtitle}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {hasCalculator && (
            <button
              onClick={() => setShowCalculator((s) => !s)}
              aria-label={template === "energy" ? "Open BOM calculator" : "Open marketing calculator"}
              title={template === "energy" ? "BOM Calculator" : "Marketing Calculator"}
              className="w-[20px] h-[20px] rounded-full flex items-center justify-center"
              style={{ background: look.headerButtonBg }}
            >
              <FaCalculator size={10} />
            </button>
          )}

          {shown(config, "showClearButton") && (
            <button
              onClick={clearChatHistory}
              aria-label="Clear chat history"
              title="Clear history"
              className="w-[20px] h-[20px] rounded-full flex items-center justify-center"
              style={{ background: look.headerButtonBg }}
            >
              <FaTrash size={11} />
            </button>
          )}

          {config.language?.defaultLanguage !== undefined && shown(config, "showLanguageSelector") && (
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              aria-label="Select language"
              className="text-[10px] px-1 py-1 rounded-[8px] outline-none border-none cursor-pointer"
              style={{ color: look.headerText, background: look.headerButtonBg }}
            >
              <option value="English" style={{ color: "#111" }}>EN</option>
              <option value="Hindi" style={{ color: "#111" }}>हिं</option>
            </select>
          )}

          {shown(config, "showCloseButton") && (
            <button
              onClick={handleClose}
              aria-label="Close chat"
              className="w-[20px] h-[20px] rounded-full flex items-center justify-center"
              style={{ background: look.headerButtonBg }}
            >
              <FaTimes size={look.closeIconSize} />
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 relative overflow-hidden">
        {showForm ? (
          <div className="h-full overflow-y-auto" style={{ background: look.chatBg }}>
            <PreChatForm
              fields={config.forms.fields}
              style={config.forms.style}
              look={look}
              onSubmit={handleFormSubmit}
              texts={{
                title: uiText(config, "formTitle", "Before we start"),
                subtitle: uiText(config, "formSubtitle", "A few details so we can help you faster."),
                button: uiText(config, "formButtonLabel", "Start Chat"),
              }}
            />
          </div>
        ) : showCalculator ? (
          <SectorCalculatorPanel
            api={api}
            chatbotId={chatbotId}
            template={template}
            primaryColor={win.primaryColor}
            onResult={handleCalculatorResult}
            onClose={() => setShowCalculator(false)}
          />
        ) : (
        <main
          ref={chatAreaRef}
          onScroll={handleChatScroll}
          className="h-full overflow-y-auto"
          style={{ background: look.chatBg, backgroundImage: look.chatBgImage, backgroundSize: look.chatBgSize, padding: look.contentPadding, overscrollBehavior: "contain", WebkitOverflowScrolling: "touch" }}
        >
          {isOffline && (
            <div
              className={`rounded-[14px] border px-4 py-3 text-[13px] leading-6 ${msgAnimFor(false)}`}
              style={{
                marginBottom: look.messageGap,
                color: look.baseText,
                background: look.dark ? "#2a2217" : "#fff7ed",
                borderColor: look.dark ? "#5b4524" : "#fed7aa",
              }}
            >
              {uiText(config, "offlineMessage", "We're currently offline. Leave a message and we'll get back to you as soon as we're back.")}
            </div>
          )}

          {messages.length === 0 && shown(config, "showWelcome") && (
            <div style={{ marginBottom: look.sectionGap ?? look.messageGap }} className={`flex items-end gap-2 ${msgAnimFor(false)}`}>
              {win.showMessageAvatars && welcomeWidth < 100 && (
                <Avatar src={win.botAvatar} initial={botInitial} bg={look.primary} fg={look.sendText} size={look.messageAvatarSize} height={look.messageAvatarHeight} />
              )}
              <div
                style={{
                  background: look.welcomeBg,
                  color: botTextColor,
                  border: look.welcomeBorder,
                  borderRadius: look.welcomeRadius,
                  fontSize: look.welcomeFontSize,
                  padding: `${look.bubblePadY + 4}px ${look.bubblePadX + 1}px`,
                  maxWidth: `${welcomeWidth}%`,
                  width: welcomeWidth >= 100 ? "100%" : undefined,
                  lineHeight: look.welcomeLineHeight ? `${look.welcomeLineHeight}px` : bubbleLineHeight || 1.7,
                }}
              >
                {welcomeText}
              </div>
            </div>
          )}

          {messages.length === 0 && shown(config, "showCtas") && ctaList.length > 0 && (
            <div style={{ gap: look.ctaGap, marginBottom: look.sectionGap ?? look.messageGap }} className={`flex flex-wrap ${msgAnimFor(false)}`}>
              {ctaList.map((cta, i) => {
                const Icon = CTA_ICON[cta.type] || FaExternalLinkAlt;
                const href = (CTA_HREF[cta.type] || CTA_HREF.custom)(cta.value);
                const bg = cta.color || look.primary;
                return (
                  <a
                    key={i}
                    href={href}
                    target={cta.type === "custom" ? "_blank" : undefined}
                    rel={cta.type === "custom" ? "noopener noreferrer" : undefined}
                    style={{
                      background: bg,
                      color: look.ctaText || readableOn(bg),
                      minHeight: look.ctaHeight,
                      fontSize: look.ctaFontSize,
                      borderRadius: look.ctaRadius,
                      ...(look.ctaWidth ? { width: look.ctaWidth } : { flex: "1 1 0" }),
                    }}
                    className="flex items-center justify-center gap-2 px-3 font-medium transition-transform hover:scale-[1.03]"
                  >
                    <Icon size={Math.round(look.ctaIconSize)} />
                    <span>{cta.label}</span>
                  </a>
                );
              })}
            </div>
          )}

          {messages.map((msg, index) => {
            const isUser = msg.sender === "user";
            const kind = fileKind(msg.file?.type);
            const MsgFileIcon = { pdf: FaFilePdf, word: FaFileWord, excel: FaFileExcel, file: FaFile }[kind] || FaFile;
            return (
              <div
                key={msg.id ?? `${msg.sender}-${index}`}
                style={{ marginBottom: look.messageGap }}
                className={`flex ${look.avatarTop ? "items-start" : "items-end"} gap-2 ${isUser ? "justify-end" : "justify-start"} ${msgAnimFor(isUser)}`}
              >
                {!isUser && win.showMessageAvatars && (
                  <div className={look.avatarTop ? "mt-1 shrink-0" : "shrink-0"}>
                    <Avatar src={win.botAvatar} initial={botInitial} bg={look.primary} fg={look.sendText} size={look.messageAvatarSize} height={look.messageAvatarHeight} />
                  </div>
                )}
                <div style={{ maxWidth: `${look.bubbleMaxWidthPct}%` }} className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                  <div
                    style={{
                      backgroundColor: isUser ? look.userBubble : botBubbleColor,
                      color: isUser ? look.userText : botTextColor,
                      borderRadius: isUser ? look.userRadius : look.botRadius,
                      padding: `${look.bubblePadY}px ${look.bubblePadX}px`,
                      lineHeight: bubbleLineHeight,
                      boxShadow: isUser ? look.userShadow : "none",
                      border: isUser ? "none" : look.botBorder,
                      ...(look.paragraphGap != null ? { "--nf-pgap": `${look.paragraphGap}px` } : {}),
                    }}
                    className={`${bubbleLineHeight ? "" : "leading-[1.6] "}${look.paragraphGap != null ? "nfw-p-trim " : ""}whitespace-pre-wrap break-words overflow-hidden`}
                  >
                    {msg.file && kind === "image" && msg.file.preview && (
                      <img src={msg.file.preview} alt={msg.file.name} className="rounded-xl mb-3 max-w-full border" />
                    )}
                    {msg.file && kind === "video" && msg.file.preview && (
                      <video controls className="rounded-xl mb-3 max-w-full border">
                        <source src={msg.file.preview} type={msg.file.type} />
                      </video>
                    )}
                    {msg.file && !(msg.file.preview && (kind === "image" || kind === "video")) && (
                      <div className="flex items-center gap-3 rounded-xl p-3 mb-3 bg-white text-[#2d2d2d] border">
                        <MsgFileIcon className="text-xl shrink-0" style={{ color: { pdf: "#dc2626", word: "#1d4ed8", excel: "#15803d" }[kind] || look.primary }} />
                        <div className="flex-1 overflow-hidden">
                          <div className="font-medium truncate">{msg.file.name}</div>
                          <div className="text-xs text-gray-500">
                            {{ pdf: "PDF Document", word: "Word Document", excel: "Excel Spreadsheet" }[kind] || (msg.file.size ? `${(msg.file.size / 1024).toFixed(1)} KB` : "File")}
                          </div>
                        </div>
                      </div>
                    )}
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>{msg.text}</ReactMarkdown>
                    {!isUser && !look.listenBelow && listenButton(msg, index)}
                  </div>
                  {!isUser && look.listenBelow && listenButton(msg, index)}
                  {behavior.showTimestamps && msg.ts && (
                    <span className="mt-[3px] text-[10px] opacity-50">{timeOf(msg.ts)}</span>
                  )}
                  {msg.failed && failedMessage && (
                    <button
                      onClick={handleRetry}
                      style={{ color: look.primary }}
                      className="mt-[4px] flex items-center gap-[4px] text-[10.5px] font-medium hover:opacity-70"
                    >
                      <FaRedo size={9} />
                      <span>{uiText(config, "retryLabel", "Retry")}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {loading && behavior.typingIndicator && (
            <div style={{ marginBottom: look.messageGap }} className={`flex ${look.avatarTop ? "items-start" : "items-end"} gap-2 justify-start ${msgAnimFor(false)}`}>
              {look.typingAvatar && win.showMessageAvatars && (
                <div className={look.avatarTop ? "mt-1 shrink-0" : "shrink-0"}>
                  <Avatar src={win.botAvatar} initial={botInitial} bg={look.primary} fg={look.sendText} size={look.messageAvatarSize} />
                </div>
              )}
              <div
                style={{ background: botBubbleColor, borderRadius: look.botRadius, border: look.botBorder, "--nf-dot": look.primary, "--nf-dot-size": `${look.typingDot}px` }}
                className={`nfw-typing nfw-typing-${typingStyle} px-4 py-3`}
                aria-label="Typing"
              >
                {[0, 1, 2].map((n) => (
                  <i key={n} style={look.typingColors ? { background: look.typingColors[n] } : undefined} />
                ))}
              </div>
            </div>
          )}

          {showSuggestions && shown(config, "showSuggestions") && suggestions.length > 0 && (
            <div
              style={{ gap: look.suggestionGap, ...(look.suggestionWidth ? { display: "flex", flexWrap: "wrap" } : { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }) }}
              className="mt-3"
            >
              {suggestions.map((item, index) => (
                <button
                  key={`suggestion-${index}-${item}`}
                  onClick={() => handleSendMessage(item)}
                  style={{
                    ...suggestionLook,
                    animationDelay: `${index * 70}ms`,
                    minHeight: look.suggestionHeight,
                    fontSize: look.suggestionFontSize,
                    lineHeight: "16px",
                    boxShadow: "0 1px 2px rgba(0,0,0,.05)",
                    padding: `0 ${look.suggestionPadX}px`,
                    ...(look.suggestionWidth ? { width: look.suggestionWidth } : {}),
                  }}
                  className={`rounded-full font-medium text-left flex items-center transition-transform hover:scale-[1.03] ${suggAnim}`}
                >
                  {item}
                </button>
              ))}
            </div>
          )}

          {showRecordingBubble && (
            <div className="flex justify-end" style={{ marginBottom: look.messageGap }}>
              <div style={{ background: look.userBubble, color: look.userText, borderRadius: look.userRadius, width: 170 }} className="px-4 py-3">
                <div className="flex items-center justify-center gap-[3px] h-[34px]">
                  {[...Array(22)].map((_, i) => (
                    <span
                      key={i}
                      className="rounded-full animate-pulse"
                      style={{
                        width: 3,
                        background: look.userText,
                        height: 12 + Math.sin(i) * 10 + (i % 5) * 3,
                        animationDelay: `${i * 0.05}s`,
                        animationDuration: "0.8s",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </main>
        )}

        {!showCalculator && !showForm && showScrollBtn && shown(config, "showScrollButton") && (
          <button
            onClick={scrollToLatest}
            style={{ backgroundColor: look.primary, color: look.sendText }}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-[5px] px-3 py-[6px] rounded-full text-[11px] font-semibold shadow-lg z-10"
          >
            <FaChevronDown size={10} />
            <span>{uiText(config, "latestLabel", "Latest")}</span>
          </button>
        )}
      </div>

      {!showCalculator && !showForm && (
      <footer
        className="shrink-0 border-t px-4 py-4 relative"
        style={{ background: look.footerBg, borderColor: look.divider }}
      >
        {selectedFile && (
          <div className="mb-3 relative w-fit">
            {selectedFile.type.startsWith("image/") && filePreview ? (
              <img src={filePreview} alt="preview" className="w-24 h-24 rounded-lg object-cover border" />
            ) : selectedFile.type.startsWith("video/") && filePreview ? (
              <video controls className="w-40 rounded-lg border">
                <source src={filePreview} type={selectedFile.type} />
              </video>
            ) : (
              <div className="flex items-center gap-3 border rounded-lg p-3 bg-gray-50 w-fit text-[#2d2d2d]">
                <FileIcon size={24} style={{ color: look.primary }} />
                <div>
                  <div className="font-medium text-sm">{selectedFile.name}</div>
                  <div className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(1)} KB</div>
                </div>
              </div>
            )}
            <button type="button" onClick={clearSelectedFile} aria-label="Remove attachment" className="absolute -top-2 -right-2 bg-white rounded-full shadow">
              <FaTimesCircle className="text-red-500" size={18} />
            </button>
          </div>
        )}

        <div
          className="relative flex items-center border-2"
          style={{ borderColor: look.primary, background: inputBg, borderRadius: look.inputRadius, padding: `${look.inputPadY}px ${look.inputPadX}px`, ...(look.inputHeight ? { minHeight: look.inputHeight } : {}) }}
        >
          {behavior.attachments && (
            <>
              <input
                disabled={listening}
                type="file"
                ref={fileInputRef}
                style={{ display: "none" }}
                accept="image/*,video/*,audio/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,application/zip,application/x-zip-compressed"
                onChange={handleFileSelect}
              />
              {look.attachIcon === "paperclip" ? (
                <button
                  type="button"
                  aria-label="Attach a file"
                  onClick={() => fileInputRef.current?.click()}
                  className="nfw-attach-plain mr-2 text-[#6b7280] transition-colors"
                  style={{ "--nf-hover": look.primary }}
                >
                  <FaPaperclip size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  aria-label="Attach a file"
                  onClick={() => fileInputRef.current?.click()}
                  className="mr-2 hover:scale-110 transition-all duration-200"
                  style={{ color: look.primary }}
                >
                  <FaPlus size={18} />
                </button>
              )}
            </>
          )}

          {listening && (
            <div className="absolute left-[58px] right-[60px] flex items-center justify-center gap-[3px] pointer-events-none">
              {[...Array(18)].map((_, i) => (
                <span key={i} className="w-[3px] rounded-full animate-pulse" style={{ background: look.primary, height: 10 + (i % 6) * 5, animationDelay: `${i * 0.08}s` }} />
              ))}
            </div>
          )}

          <input
            ref={inputRef}
            disabled={loading || !isOnline}
            readOnly={listening}
            type="text"
            autoComplete="off"
            placeholder={!isOnline ? "No internet connection…" : listening ? uiText(config, "listeningPlaceholder", "Listening...") : placeholderFor(config, language)}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            aria-label="Type a message"
            style={{ color: look.dark ? "#f3f4f6" : "#333", ...(look.placeholderColor ? { "--nf-ph": look.placeholderColor } : {}) }}
            className="nfw-input flex-1 min-w-0 outline-none bg-transparent opacity-90 disabled:cursor-not-allowed"
          />

          {behavior.voiceInput && (
            <button
              type="button"
              aria-label={listening ? "Stop recording" : "Start voice input"}
              onClick={(e) => {
                handleMicClick();
                e.currentTarget.blur(); // so Enter can't re-trigger the mic
              }}
              disabled={!micSupported || loading}
              className={`mr-2 w-[35px] h-[35px] rounded-full flex items-center justify-center transition-all duration-300 ${loading ? "opacity-50 cursor-not-allowed" : ""} ${
                listening ? "bg-red-600 hover:bg-red-700 text-white" : "bg-gray-100 hover:text-white"
              } ${!micSupported ? "opacity-50 cursor-not-allowed" : ""}`}
              style={listening ? undefined : { color: look.primary }}
              onMouseEnter={(e) => {
                if (!listening && micSupported && !loading) e.currentTarget.style.background = look.primary;
              }}
              onMouseLeave={(e) => {
                if (!listening) e.currentTarget.style.background = "";
              }}
            >
              {listening ? <FaStop size={13} /> : <FaMicrophone size={15} />}
            </button>
          )}

          <button
            disabled={!canSend}
            onClick={() => handleSendMessage()}
            aria-label="Send message"
            style={{ backgroundColor: canSend ? look.sendBg : "#e5e7eb", width: look.sendSize, height: look.sendSize, borderRadius: look.sendRadius }}
            className={`nfw-send ${animClass("nfw", "send", win.sendAnimation)} flex items-center justify-center shrink-0 disabled:cursor-not-allowed transition-all hover:scale-105`}
          >
            {loading ? (
              <div className="w-[14px] h-[14px] border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <FaPaperPlane size={look.sendIconSize} style={{ color: canSend ? look.sendText : "#9ca3af" }} />
            )}
          </button>
        </div>

        {win.footerText ? (
          <div style={{ fontSize: look.footerFontSize }} className="text-center mt-2 opacity-60">{win.footerText}</div>
        ) : null}
        {win.showBranding && (
          <div style={{ fontSize: look.footerFontSize }} className="text-center text-[#9ca3af] mt-3">
            Powered by <span style={{ color: look.brandColor }} className="font-semibold">{brandLine}</span>
            {look.brandUrl ? <>&nbsp;&nbsp;{look.brandUrl}</> : null}
          </div>
        )}
      </footer>
      )}
    </div>
  );
}

// Round bot avatar shown beside bot messages (config.showMessageAvatars).
function Avatar({ src, initial, bg, fg, size = 26, height = size }) {
  return src ? (
    <img src={src} alt="" style={{ width: size, height }} className="rounded-full object-cover shrink-0" />
  ) : (
    <div
      className="rounded-full shrink-0 flex items-center justify-center font-semibold"
      style={{ width: size, height: size, background: bg, color: fg, fontSize: Math.round(size * 0.42) }}
    >
      {initial}
    </div>
  );
}

export default NuformlyWidget;
