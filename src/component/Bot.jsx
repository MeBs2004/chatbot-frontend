import React, { useEffect, useRef, useState } from "react";
import axios from "axios";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import logo from "../assets/logo.png";
import logo1 from "../assets/logo1.png";

import useSpeechRecognition from "../hooks/useSpeechRecognition";
import useTextToSpeech from "../hooks/useTextToSpeech";

import {
  FaTimes,
  FaPaperPlane,
  FaTrash,
  FaWhatsapp,
  FaEnvelope,
  FaPhoneAlt,
  FaPlus,
  FaTimesCircle,
  FaFile,
  FaFilePdf,
  FaFileWord,
  FaFileExcel,
  FaFilePowerpoint,
  FaFileArchive,
  FaFileAudio,
  FaFileImage,
  FaFileVideo,
  FaMicrophone,
  FaStop,
  FaVolumeUp,
} from "react-icons/fa";

// ── Launcher greeting bubble ──────────────────────────────────────────────
const LAUNCHER_MESSAGES = [
  "👋 Hi there!",
  "Hello 👋",
  "Need any help?",
  "Let's build your website 🚀",
  "Want more leads?",
  "Need SEO Services?",
  "Need Digital Marketing?",
  "Let's grow your business 📈",
  "Need a website?",
  "Ask me anything.",
  "How can I help today?",
];

function pickNextLauncherMessage(lastMessage) {
  if (LAUNCHER_MESSAGES.length <= 1) return LAUNCHER_MESSAGES[0];

  let next;

  do {
    next =
      LAUNCHER_MESSAGES[Math.floor(Math.random() * LAUNCHER_MESSAGES.length)];
  } while (next === lastMessage);

  return next;
}

const LAUNCHER_STYLES = `
  @keyframes nuformLauncherFloat {
    0%   { transform: translateY(0); }
    25%  { transform: translateY(-8px); }
    50%  { transform: translateY(0); }
    75%  { transform: translateY(8px); }
    100% { transform: translateY(0); }
  }
  @keyframes nuformLauncherBreathe {
    0%, 100% { transform: scale(1); }
    50%      { transform: scale(1.03); }
  }
  @keyframes nuformLauncherGlow {
    0%, 100% { box-shadow: 0 0 0 rgba(6, 118, 71, 0); }
    6%       { box-shadow: 0 0 22px 6px rgba(6, 118, 71, 0.45); }
    14%      { box-shadow: 0 0 0 rgba(6, 118, 71, 0); }
  }
  @keyframes nuformBubbleEnter {
    from { opacity: 0; transform: translateY(10px) scale(0.95); }
    to   { opacity: 1; transform: translateY(0)    scale(1);    }
  }
  @keyframes nuformBubbleExit {
    from { opacity: 1; transform: translateY(0)    scale(1);    }
    to   { opacity: 0; transform: translateY(10px) scale(0.95); }
  }
  @keyframes nuformLauncherPulseRing {
    0%   { transform: scale(0.85); opacity: 0.55; }
    70%  { transform: scale(1.35); opacity: 0; }
    100% { transform: scale(1.35); opacity: 0; }
  }

  .nuform-launcher-float      { animation: nuformLauncherFloat 4.5s ease-in-out infinite; }
  .nuform-launcher-breathe    { animation: nuformLauncherBreathe 5.5s ease-in-out infinite; }
  .nuform-launcher-glow       { animation: nuformLauncherGlow 8s ease-in-out infinite; }
  .nuform-launcher-pulse-ring { animation: nuformLauncherPulseRing 2.6s ease-out infinite; }
  .nuform-bubble-enter        { animation: nuformBubbleEnter 0.3s ease forwards; }
  .nuform-bubble-exit      { animation: nuformBubbleExit 0.3s ease forwards; }
`;

function Bot({ embed = false }) {
  const [emailAsked, setEmailAsked] = useState(false);

  const [userEmail, setUserEmail] = useState("");

  const [language, setLanguage] = useState("English");

  const [messages, setMessages] = useState([]);

  const [input, setInput] = useState("");

  // Selected attachment
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState("");

  const [loading, setLoading] = useState(false);

  const [showRecordingBubble, setShowRecordingBubble] = useState(false);

  const [suggestions, setSuggestions] = useState([]);

  const [showSuggestions, setShowSuggestions] = useState(true);

  const [openBot, setOpenBot] = useState(embed ? true : false);

  const [animateBot, setAnimateBot] = useState(false);

  const messagesEndRef = useRef(null);

  const silenceTimerRef = useRef(null);

  const fileInputRef = useRef(null);
  // Hidden file input
  const inputRef = useRef(null);

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  const {
    transcript,
    listening,
    supported,
    startListening,
    stopListening,
    setTranscript,
  } = useSpeechRecognition(language === "Hindi" ? "hi-IN" : "en-US");

  const {
    supported: speechSupported,
    speaking,
    speak,
    stop,
  } = useTextToSpeech();

  // Track which bot message is currently speaking
  const [speakingMessageId, setSpeakingMessageId] = useState(null);

  // Launcher greeting bubble
  const [bubbleStage, setBubbleStage] = useState("idle"); // idle | indicator | typing | visible | hiding
  const [bubbleText, setBubbleText] = useState("");
  const lastLauncherMessageRef = useRef("");
  const dismissBubbleRef = useRef(() => {});

  // Drives the launcher greeting bubble lifecycle: wait -> typing indicator ->
  // type message -> hold -> fade -> wait -> repeat. Only runs while the
  // launcher itself is visible (chat closed, not embedded).
  useEffect(() => {
    const launcherVisible = !embed && !openBot;

    if (!launcherVisible) {
      setBubbleStage("idle");
      setBubbleText("");
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

      setBubbleText(message.slice(0, charIndex));

      if (charIndex >= message.length) {
        setBubbleStage("visible");

        const goToHiding = () => {
          if (cancelled) return;

          setBubbleStage("hiding");

          wait(300, () => {
            setBubbleStage("idle");
            setBubbleText("");
            wait(8000, startCycle);
          });
        };

        dismissBubbleRef.current = () => {
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
        setBubbleStage("indicator");

        wait(700, () => {
          const message = pickNextLauncherMessage(
            lastLauncherMessageRef.current,
          );

          lastLauncherMessageRef.current = message;

          setBubbleStage("typing");
          typeMessage(message, 0);
        });
      });
    };

    startCycle();

    return () => {
      cancelled = true;
      clearTimeout(timerId);
      dismissBubbleRef.current = () => {};
    };
  }, [embed, openBot]);

  const axiosConfig = {
    headers: {
      "x-company-id": "nuform-social",
    },
  };

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
      console.log("Stopped due to 5 seconds of silence");

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

  // If speech finishes naturally, clear the active message
  useEffect(() => {
    if (!speaking) {
      setSpeakingMessageId(null);
    }
  }, [speaking]);

  // Update input while speaking
  useEffect(() => {
    setInput(transcript);
  }, [transcript]);
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

    setTranscript("");
    setInput("");
    setShowRecordingBubble(true);
    startListening();
  };
  // Auto Scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  // Popup Animation
  useEffect(() => {
    if (embed) return;

    const timer = setTimeout(() => {
      setAnimateBot(true);
    }, 200);

    return () => clearTimeout(timer);
  }, [embed]);

  // Load Chat History
  useEffect(() => {
    const savedMessages = localStorage.getItem("nuform_chat_history");

    if (savedMessages && JSON.parse(savedMessages).length > 0) {
      setMessages(JSON.parse(savedMessages));
      setShowSuggestions(false);
    }

    const savedEmail = localStorage.getItem("nuform_user_email");

    if (savedEmail) {
      setUserEmail(savedEmail);
    }
  }, []);

  // Save Chat History
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("nuform_chat_history", JSON.stringify(messages));
    }
  }, [messages]);

  // Fetch Suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}bot/v1/suggestions`, {
          params: {
            language,
          },
          headers: {
            "x-company-id": "nuform-social",
          },
        });

        if (res.data.success) {
          setSuggestions([]);

          setTimeout(() => {
            setSuggestions(res.data.suggestions);
          }, 0);
        }
      } catch (error) {
        console.log("Suggestion Error:", error);
      }
    };

    fetchSuggestions();
  }, [language]);

  useEffect(() => {
    const saveVisitor = async () => {
      try {
        let visitorId = localStorage.getItem("visitorId");

        if (!visitorId) {
          visitorId = crypto.randomUUID();

          localStorage.setItem("visitorId", visitorId);
        }

        const response = await axios.post(
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
            headers: {
              "x-company-id": "nuform-social",
            },
          },
        );

        console.log(response.data);
      } catch (error) {
        console.log("Visitor Tracking Error");
        console.log(error);
      }
    };

    saveVisitor();
  }, []);
  // File Picker
  const handleFileSelect = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    setSelectedFile(file);

    // Preview for Images & Videos
    if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
      setFilePreview(URL.createObjectURL(file));
    } else {
      // PDF, DOC, Excel, ZIP, etc.
      setFilePreview("");
    }

    console.log("Selected File:", file);
  };

  // Remove File
  const removeFile = () => {
    setSelectedFile(null);
    setFilePreview("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Send Message
  const handleSendMessage = async (customMessage = null) => {
    // Stop recording if it is still active
    if (listening) {
      stopListening();
      clearTimeout(silenceTimerRef.current);
      setShowRecordingBubble(false);
    }

    console.log("SEND FUNCTION CALLED");

    const messageText =
      typeof customMessage === "string" ? customMessage : input;

    // Prevent empty send
    if (
      typeof messageText !== "string" ||
      (!messageText.trim() && !selectedFile)
    )
      return;
    // ==========================
    // SAVE EMAIL
    // ==========================

    if (
      emailAsked &&
      !userEmail &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(messageText)
    ) {
      setUserEmail(messageText);
      setEmailAsked(false);

      localStorage.setItem("nuform_user_email", messageText);

      try {
        await axios.post(
          `${BACKEND_URL}bot/v1/visitor/email`,
          {
            visitorId: localStorage.getItem("visitorId"),
            email: messageText,
          },
          {
            headers: {
              "x-company-id": "nuform-social",
            },
          },
        );
      } catch (error) {
        console.log("EMAIL SAVE FAILED");
        console.log(error);
      }

      setMessages((prev) => [
        ...prev,
        {
          text: messageText,
          sender: "user",
        },
        {
          text: "✅ Thank you! We've saved your email address. How else can we help you today?",
          sender: "bot",
        },
      ]);

      // Clear everything
      setInput("");
      setSelectedFile(null);
      setFilePreview("");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      return;
    }
    // ==========================
    // USER MESSAGE
    // ==========================

    const userMessage = {
      text: messageText,
      sender: "user",
      file: selectedFile
        ? {
            name: selectedFile.name,
            type: selectedFile.type,
            preview: filePreview || null,
          }
        : null,
    };

    setMessages((prev) => [...prev, userMessage]);

    setInput("");
    setLoading(true);
    setShowSuggestions(false);

    try {
      let res;

      const formData = new FormData();

      formData.append("text", messageText);
      formData.append("language", language);
      formData.append("visitorId", localStorage.getItem("visitorId"));
      if (selectedFile) {
        formData.append("file", selectedFile);
      }

      console.log("BACKEND_URL:", BACKEND_URL);
      console.log("API:", `${BACKEND_URL}bot/v1/message`);

      try {
        console.log("Sending request...");

        res = await axios.post(`${BACKEND_URL}bot/v1/message`, formData, {
          headers: {
            "x-company-id": "nuform-social",
          },
        });

        console.log("FULL API Response:");
        console.log(res.data);
        console.log("Bot Message:", res.data.botMessage);
        console.log("Success:", res.data.success);
      } catch (err) {
        console.log("FULL ERROR");
        console.log(err);
        console.log(err.response);
        console.log(err.response?.data);
      }

      if (res.data.success) {
        const botMessage = {
          text: res.data.botMessage,
          sender: "bot",
        };

        setMessages((prev) => {
          const updatedMessages = [...prev, botMessage];

          const userCount = updatedMessages.filter(
            (msg) => msg.sender === "user",
          ).length;

          if (userCount >= 3 && !emailAsked && !userEmail) {
            updatedMessages.push({
              text: "📧 Before we continue, could you please share your email address so our team can assist you better?",
              sender: "bot",
            });

            // 🔊 Read the email prompt too
            setEmailAsked(true);
          }

          return updatedMessages;
        });
      }
    } catch (error) {
      console.log("Message Error:", error);
      console.log("Error Response:", error.response);
      console.log("Error Data:", error.response?.data);

      setMessages((prev) => [
        ...prev,
        {
          text: "⚠️ Server error. Please try again.",
          sender: "bot",
        },
      ]);
    } finally {
      setLoading(false);

      // Always clear selected file
      setSelectedFile(null);
      setFilePreview("");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Clear History
  const clearChatHistory = () => {
    localStorage.removeItem("nuform_chat_history");
    localStorage.removeItem("nuform_user_email");

    setMessages([]);
    setUserEmail("");
    setEmailAsked(false);
    setSelectedFile(null);
    setFilePreview("");

    setShowSuggestions(true);
  };

  // Enter Key
  const handleKeyPress = (e) => {
    if (e.key !== "Enter") return;

    e.preventDefault();

    // Never allow Enter while recording
    if (listening) return;

    if (loading) return;

    if (input.trim() || selectedFile) {
      handleSendMessage();
    }
  };

  return (
    <>
      <style>{LAUNCHER_STYLES}</style>

      {/* Floating Launcher */}
      {!embed && !openBot && (
        <div className="fixed bottom-5 right-5 z-50 nuform-launcher-float">
          {/* AI Greeting Bubble */}
          {bubbleStage !== "idle" && (
            <div
              className={`
                absolute bottom-[72px] right-0
                ${bubbleStage === "hiding" ? "nuform-bubble-exit" : "nuform-bubble-enter"}
              `}
            >
              <div className="relative flex items-start gap-[6px] bg-white border border-gray-200 rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.1)] pl-[8px] pr-3 py-[7px] min-w-[150px] max-w-[195px]">
                <img
                  src={logo}
                  alt=""
                  aria-hidden="true"
                  className="w-[16px] h-[16px] rounded-full object-cover mt-[2px] flex-shrink-0"
                />

                {bubbleStage === "indicator" ? (
                  <div className="flex items-center gap-1 h-[11px] mt-[3px]">
                    <span className="w-[4px] h-[4px] rounded-full bg-gray-400 animate-bounce" />
                    <span
                      className="w-[4px] h-[4px] rounded-full bg-gray-400 animate-bounce"
                      style={{ animationDelay: "0.15s" }}
                    />
                    <span
                      className="w-[4px] h-[4px] rounded-full bg-gray-400 animate-bounce"
                      style={{ animationDelay: "0.3s" }}
                    />
                  </div>
                ) : (
                  <p className="text-[11.5px] font-medium text-gray-700 leading-snug pt-[1px]">
                    {bubbleText}
                  </p>
                )}

                {/* Dismiss */}
                {bubbleStage === "visible" && (
                  <button
                    onClick={() => dismissBubbleRef.current()}
                    aria-label="Dismiss"
                    className="
                      absolute -top-[5px] -right-[5px]
                      w-[14px] h-[14px]
                      rounded-full
                      bg-white border border-gray-200
                      shadow-sm
                      flex items-center justify-center
                      text-gray-400 hover:text-gray-600
                      leading-none
                      transition-colors
                    "
                  >
                    <FaTimes size={6} />
                  </button>
                )}

                {/* Tail */}
                <div className="absolute -bottom-[5px] right-[20px] w-[10px] h-[10px] bg-white border-b border-r border-gray-200 rotate-45" />
              </div>
            </div>
          )}

          {/* Pulse Ring */}
          <span className="absolute inset-0 rounded-full bg-[#067647] nuform-launcher-pulse-ring pointer-events-none" />

          <button
            onClick={() => setOpenBot(true)}
            className="
              relative
              w-[55px]
              h-[55px]
              rounded-full
              flex
              items-center
              justify-center
              text-white
              hover:scale-[1.08]
              hover:rotate-2
              transition-transform
              duration-[250ms]
            "
          >
            <div className="nuform-launcher-breathe nuform-launcher-glow w-full h-full rounded-full flex items-center justify-center">
              <img
                src={logo1}
                alt="Logo"
                className="
                  w-[55px]
                  h-[55px]
                  object-contain
                "
              />
            </div>

            {/* Notification Dot */}
            {bubbleStage !== "idle" && (
              <span className="absolute top-0 right-0 w-[11px] h-[11px] rounded-full bg-[#e36b0a] border border-white animate-pulse" />
            )}
          </button>
        </div>
      )}
      {/* Chatbot */}
      {(openBot || embed) && (
        <div
          className={`
      ${
        embed
          ? "w-[365px] h-[547px] rounded-[28px] border border-[#dcdcdc]"
          : "fixed bottom-5 right-5 w-[365px] h-[547px] rounded-[28px] border border-[#dcdcdc] -m-3"
      }

      bg-[#f7f7f7]
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
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 translate-y-10 scale-95"
      }
    `}
        >
          {/* Header */}
          <div
            className="
        h-[74px]
        px-4
        flex
        items-center
        justify-between
        text-white
      "
            style={{
              background: "linear-gradient(135deg, #0d5537 0%, #067647 100%)",
            }}
          >
            {/* Left */}
            <div className="flex items-center gap-3">
              <div
                className="
            w-[40px]
            h-[40px]
            rounded-[12px]
            bg-[#ffffff22]
            flex
            items-center
            justify-center
            overflow-hidden
          "
              >
                <img
                  src={logo}
                  alt="Logo"
                  className="
              w-[35px]
              h-[35px]
              object-cover
              rounded-[8px]
            "
                />
              </div>

              <div>
                <h2 className="font-semibold text-[15px] leading-none whitespace-nowrap">
                  Nuform Social Assistant
                </h2>

                <div className="flex items-center gap-2 mt-[5px]">
                  <span
                    className="
                w-[6px]
                h-[6px]
                rounded-full
                bg-[#8dffb3]
                shadow-[0_0_8px_#8dffb3]
                animate-pulse
              "
                  ></span>

                  <p className="text-[11px] text-[#d5f5e3] leading-none">
                    Online · Always ready
                  </p>
                </div>
              </div>
            </div>

            {/* Right */}
            <div className="flex items-center gap-2">
              {/* Clear History */}
              <button
                onClick={clearChatHistory}
                className="
            w-[20px]
            h-[20px]
            rounded-full
            bg-[#ffffff22]
            flex
            items-center
            justify-center
          "
              >
                <FaTrash size={11} />
              </button>

              {/* Language */}
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="
            bg-[#ffffff22]
            text-white
            text-[10px]
            px-1
            py-1
            rounded-[8px]
            outline-none
            border-none
            cursor-pointer
          "
              >
                <option value="English" className="text-black">
                  EN
                </option>

                <option value="Hindi" className="text-black">
                  हिं
                </option>
              </select>

              {/* Close */}
              <button
                onClick={() => {
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
                className="
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
            </div>
          </div>
          {/* Chat Area */}
          <div
            className="
    flex-1
    overflow-y-auto
    px-4
    py-4
  "
          >
            {/* Welcome */}
            {messages.length === 0 && (
              <div
                className="
        bg-[#edf7f1]
        border
        border-[#d8e9de]
        rounded-[18px]
        p-4
        text-[#333]
        text-[14px]
        leading-7
        mb-5
      "
              >
                {language === "Hindi" ? (
                  <>
                    👋 नमस्ते! मैं Nuform Social Assistant हूँ। चाहे आप अपना
                    ब्रांड बढ़ाना चाहते हों, वेबसाइट बनवाना चाहते हों या
                    उच्च-ROI कैंपेन चलाना चाहते हों — मैं आपकी सहायता के लिए
                    यहाँ हूँ। आज आप किस उद्देश्य से आए हैं?
                  </>
                ) : (
                  <>
                    👋 Hey! I'm the Nuform Social Assistant. Whether you're
                    looking to grow your brand, build a website, or run high-ROI
                    campaigns — I'm here to help. What brings you here today?
                  </>
                )}
              </div>
            )}

            {messages.length === 0 && (
              <div className="flex gap-2 mb-5">
                <a
                  href="tel:+919902421936"
                  className="
          flex
          items-center
          justify-center
          gap-2
          flex-1
          px-3
          py-2
          rounded-full
          text-white
          bg-[#067647]
          text-[12px]
          font-medium
        "
                >
                  <FaPhoneAlt size={13} />
                  <span>Call</span>
                </a>

                <a
                  href="https://wa.me/919902421936"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="
          flex
          items-center
          justify-center
          gap-2
          flex-1
          px-3
          py-2
          rounded-full
          bg-[#25D366]
          text-white
          text-[12px]
        "
                >
                  <FaWhatsapp size={14} />
                  <span>WhatsApp</span>
                </a>

                <a
                  href="mailto:info@nuformsocial.com"
                  className="
          flex
          items-center
          justify-center
          gap-2
          flex-1
          px-3
          py-2
          rounded-full
          bg-[#e36b0a]
          text-white
          text-[12px]
          font-medium
        "
                >
                  <FaEnvelope size={13} />
                  <span>Email</span>
                </a>
              </div>
            )}

            {/* Messages */}
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex mb-4 ${
                  msg.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.sender === "bot" && (
                  <img
                    src={logo}
                    alt="Bot"
                    className="
            w-[32px]
            h-[32px]
            rounded-full
            object-cover
            mr-2
            mt-1
            flex-shrink-0
          "
                  />
                )}

                <div
                  className={`
          px-[15px]
          py-[12px]
          text-[14px]
          leading-[26px]
          font-[400]
          whitespace-pre-wrap
          max-w-[82%]
          overflow-hidden
          ${
            msg.sender === "user"
              ? "bg-[#067647] text-white rounded-[16px] rounded-br-[6px] shadow-md"
              : "bg-[#edf5ef] text-[#2d2d2d] border border-[#d7e7dc] rounded-[18px] rounded-bl-[6px]"
          }
        `}
                >
                  {/* Image */}
                  {msg.file?.type?.startsWith("image/") && (
                    <img
                      src={msg.file.preview}
                      alt={msg.file.name}
                      className="rounded-xl mb-3 max-w-full border"
                    />
                  )}

                  {/* Video */}
                  {msg.file?.type?.startsWith("video/") && (
                    <video
                      controls
                      className="rounded-xl mb-3 max-w-full border"
                    >
                      <source src={msg.file.preview} type={msg.file.type} />
                    </video>
                  )}

                  {/* PDF */}
                  {msg.file?.type === "application/pdf" && (
                    <div className="flex items-center gap-3 bg-white border rounded-xl p-3 mb-3">
                      <FaFilePdf className="text-red-600 text-xl" />

                      <div className="flex-1 overflow-hidden">
                        <div className="font-medium truncate">
                          {msg.file.name}
                        </div>

                        <div className="text-xs text-gray-500">
                          PDF Document
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Word */}
                  {(msg.file?.type === "application/msword" ||
                    msg.file?.type ===
                      "application/vnd.openxmlformats-officedocument.wordprocessingml.document") && (
                    <div className="flex items-center gap-3 bg-white border rounded-xl p-3 mb-3">
                      <FaFileWord className="text-blue-700 text-xl" />

                      <div className="flex-1 overflow-hidden">
                        <div className="font-medium truncate">
                          {msg.file.name}
                        </div>

                        <div className="text-xs text-gray-500">
                          Word Document
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Excel */}
                  {(msg.file?.type === "application/vnd.ms-excel" ||
                    msg.file?.type ===
                      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") && (
                    <div className="flex items-center gap-3 bg-white border rounded-xl p-3 mb-3">
                      <FaFileExcel className="text-green-700 text-xl" />

                      <div className="flex-1 overflow-hidden">
                        <div className="font-medium truncate">
                          {msg.file.name}
                        </div>

                        <div className="text-xs text-gray-500">
                          Excel Spreadsheet
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Other Files */}
                  {msg.file &&
                    !msg.file.type.startsWith("image/") &&
                    !msg.file.type.startsWith("video/") &&
                    msg.file.type !== "application/pdf" &&
                    msg.file.type !== "application/msword" &&
                    msg.file.type !==
                      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" &&
                    msg.file.type !== "application/vnd.ms-excel" &&
                    msg.file.type !==
                      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" && (
                      <div className="flex items-center gap-3 bg-white border rounded-xl p-3 mb-3">
                        <FaFile className="text-[#067647] text-xl" />

                        <div className="flex-1 overflow-hidden">
                          <div className="font-medium truncate">
                            {msg.file.name}
                          </div>

                          <div className="text-xs text-gray-500">
                            {(msg.file.size / 1024).toFixed(1)} KB
                          </div>
                        </div>
                      </div>
                    )}

                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      a: ({ node, ...props }) => (
                        <a
                          {...props}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 underline break-all"
                        />
                      ),

                      img: ({ node, ...props }) => (
                        <img
                          {...props}
                          alt={props.alt || "Image"}
                          className="rounded-xl my-3 max-w-full border"
                        />
                      ),

                      ul: ({ node, ...props }) => (
                        <ul {...props} className="list-disc pl-5 my-2" />
                      ),

                      ol: ({ node, ...props }) => (
                        <ol {...props} className="list-decimal pl-5 my-2" />
                      ),

                      h1: ({ node, ...props }) => (
                        <h1 {...props} className="text-[20px] font-bold mb-2" />
                      ),

                      h2: ({ node, ...props }) => (
                        <h2
                          {...props}
                          className="text-[18px] font-semibold mb-2"
                        />
                      ),

                      h3: ({ node, ...props }) => (
                        <h3
                          {...props}
                          className="text-[16px] font-semibold mb-2"
                        />
                      ),

                      p: ({ node, ...props }) => (
                        <p {...props} className="mb-2" />
                      ),

                      strong: ({ node, ...props }) => (
                        <strong {...props} className="font-bold" />
                      ),
                    }}
                  >
                    {msg.text}
                  </ReactMarkdown>
                  {/* Speaker UI */}
                  {msg.sender === "bot" &&
                    speechSupported &&
                    (speaking && speakingMessageId === index ? (
                      <button
                        onClick={() => {
                          stop();
                          setSpeakingMessageId(null);
                        }}
                        className="
        mt-[10px]
        inline-flex
        items-center
        gap-[6px]
        p-0
        text-[14px]
        font-medium
        text-[#6b7280]
        hover:text-[#4b5563]
        cursor-pointer
        transition-colors
        duration-200
      "
                      >
                        <FaStop size={14} />
                        <span>{language === "Hindi" ? "रोकें" : "Stop"}</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setSpeakingMessageId(index);

                          speak(
                            msg.text,
                            language === "Hindi" ? "hi-IN" : "en-US",
                          );
                        }}
                        className="
        mt-[10px]
        inline-flex
        items-center
        gap-[6px]
        p-0
        text-[14px]
        font-medium
        text-[#6b7280]
        hover:text-[#4b5563]
        cursor-pointer
        transition-colors
        duration-200
      "
                      >
                        <FaVolumeUp size={15} />
                        <span>{language === "Hindi" ? "सुनें" : "Listen"}</span>
                      </button>
                    ))}
                </div>
              </div>
            ))}

            {/* Loading */}
            {loading && (
              <div
                className="
        inline-flex
        items-center
        gap-2
        bg-[#edf5ef]
        border
        border-[#d7e7dc]
        px-4
        py-3
        rounded-[18px]
        rounded-bl-[6px]
        shadow-sm
      "
              >
                <span className="w-[8px] h-[8px] rounded-full bg-[#00c853] animate-bounce"></span>

                <span
                  className="w-[8px] h-[8px] rounded-full bg-[#00b0ff] animate-bounce"
                  style={{ animationDelay: "0.15s" }}
                ></span>

                <span
                  className="w-[8px] h-[8px] rounded-full bg-[#ff9100] animate-bounce"
                  style={{ animationDelay: "0.3s" }}
                ></span>
              </div>
            )}
            {/* Suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <div
                className="
      grid
      grid-cols-2
      gap-3
      mt-3
    "
              >
                {suggestions.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => handleSendMessage(item)}
                    className="
          min-h-[32px]
          px-3
          rounded-full
          border
          border-[#d6e8dd]
          bg-[#daf7e1]
          text-[#1f5138]
          text-[11px]
          font-[500]
          leading-4
          hover:bg-[#e3f1e8]
          transition-all
          duration-200
          text-left
          flex
          items-center
          shadow-sm
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
                  className="
        bg-[#067647]
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

            <div ref={messagesEndRef} />
          </div>

          {/* Footer */}
          <div
            className="
    bg-white
    border-t
    border-[#e8e8e8]
    px-4
    py-4
    relative
  "
          >
            {/* Selected File Preview */}
            {selectedFile && (
              <div className="mb-3 relative">
                {/* Image Preview */}
                {selectedFile.type.startsWith("image/") && (
                  <img
                    src={filePreview}
                    alt="preview"
                    className="w-24 h-24 rounded-lg object-cover border"
                  />
                )}

                {/* Video Preview */}
                {selectedFile.type.startsWith("video/") && (
                  <video controls className="w-40 rounded-lg border">
                    <source src={filePreview} type={selectedFile.type} />
                  </video>
                )}

                {/* Other Files */}
                {!selectedFile.type.startsWith("image/") &&
                  !selectedFile.type.startsWith("video/") && (
                    <div className="flex items-center gap-3 border rounded-lg p-3 bg-gray-50 w-fit">
                      <FaFile size={24} className="text-[#067647]" />

                      <div>
                        <div className="font-medium text-sm">
                          {selectedFile.name}
                        </div>

                        <div className="text-xs text-gray-500">
                          {(selectedFile.size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    </div>
                  )}

                <button
                  onClick={removeFile}
                  className="absolute -top-2 -right-2 bg-white rounded-full shadow"
                >
                  <FaTimesCircle className="text-red-500" size={18} />
                </button>
              </div>
            )}

            {/* Input Box */}
            <div
              className="
      relative
      flex
      items-center
      border-2
      border-[#067647]
      rounded-[18px]
      px-3
      py-2
      bg-white
    "
            >
              {/* Hidden File Input */}
              <input
                disabled={listening}
                type="file"
                ref={fileInputRef}
                style={{ display: "none" }}
                accept="
        image/*,
        video/*,
        audio/*,
        application/pdf,
        application/msword,
        application/vnd.openxmlformats-officedocument.wordprocessingml.document,
        application/vnd.ms-excel,
        application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,
        application/vnd.ms-powerpoint,
        application/vnd.openxmlformats-officedocument.presentationml.presentation,
        text/plain,
        application/zip,
        application/x-zip-compressed
      "
                onChange={handleFileSelect}
              />

              {/* Plus Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="
        mr-2
        text-[#067647]
        hover:text-[#045c38]
        hover:scale-110
        transition-all
        duration-200
      "
              >
                <FaPlus size={18} />
              </button>

              {/* Voice Wave */}
              {listening && (
                <div className="absolute left-[58px] right-[60px] flex items-center justify-center gap-[3px] pointer-events-none">
                  {[...Array(18)].map((_, i) => (
                    <span
                      key={i}
                      className="w-[3px] rounded-full bg-[#067647] animate-pulse"
                      style={{
                        height: `${10 + (i % 6) * 5}px`,
                        animationDelay: `${i * 0.08}s`,
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Text Input */}
              <input
                ref={inputRef}
                type="text"
                placeholder={
                  listening ? "Listening..." : "Ask About Our Services..."
                }
                className="
        flex-1
        outline-none
        text-[14px]
        text-[#333]
        opacity-90
        placeholder:text-[#9aa5a0]
      "
                value={input}
                readOnly={listening}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
              />

              {/* Mic Button */}
              <button
                type="button"
                onClick={(e) => {
                  handleMicClick();
                  e.currentTarget.blur(); // Remove focus so Enter won't trigger mic again
                }}
                disabled={!supported || loading}
                className={`
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
        : "bg-gray-100 text-[#067647] hover:bg-[#067647] hover:text-white"
    }
    ${loading ? "opacity-50 cursor-not-allowed" : ""}
  `}
              >
                {listening ? <FaStop size={13} /> : <FaMicrophone size={15} />}
              </button>

              {/* Send Button */}
              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={loading || (!input.trim() && !selectedFile)}
                className={`
    w-[35px]
    h-[35px]
    rounded-full
    flex
    items-center
    justify-center
    transition-all
    duration-300
    ${
      input.trim() || selectedFile
        ? "bg-[#067647] text-white hover:scale-105"
        : "bg-gray-200 text-gray-400 cursor-not-allowed"
    }
  `}
              >
                <FaPaperPlane size={15} />
              </button>
            </div>

            {/* Footer */}
            <div
              className="
      text-center
      text-[11px]
      text-[#9ca3af]
      mt-3
    "
            >
              Powered by
              <span className="text-[#e36b0a] font-semibold">
                {" "}
                Nuform Social
              </span>
              &nbsp;&nbsp;nuformsocial.com
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Bot;
