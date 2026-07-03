import React, { useEffect, useRef, useState } from "react";
import axios from "axios";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import logo from "../assets/logo.png";

import {
  FaTimes,
  FaPaperPlane,
  FaTrash,
  FaWhatsapp,
  FaEnvelope,
  FaPhoneAlt,
} from "react-icons/fa";

function Bot({ embed = false }) {
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

  const messagesEndRef = useRef(null);

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  const axiosConfig = {
    headers: {
      "x-company-id": "nuform-social",
    },
  };

  // Auto Scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  // Popup Animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimateBot(true);
    }, 200);

    return () => clearTimeout(timer);
  }, []);

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

  // Send Message
  const handleSendMessage = async (customMessage = null) => {
    const messageText = customMessage || input;

    if (!messageText.trim()) return;

    // Save Email If User Enters One
    if (
      emailAsked &&
      !userEmail &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(messageText)
    ) {
      setUserEmail(messageText);
      setEmailAsked(false);

      localStorage.setItem("nuform_user_email", messageText);

      try {
        const response = await axios.post(
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

        console.log("EMAIL SAVED SUCCESSFULLY");
        console.log(response.data);
      } catch (error) {
        console.log("EMAIL SAVE FAILED");

        console.log(error);

        console.log(error.response?.data);
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

      setInput("");

      return;
    }

    // Add User Message
    const userMessage = {
      text: messageText,
      sender: "user",
    };

    setMessages((prev) => [...prev, userMessage]);

    setInput("");

    setLoading(true);

    setShowSuggestions(false);

    try {
      const res = await axios.post(
        `${BACKEND_URL}bot/v1/message`,
        {
          text: messageText,
          language,
          visitorId: localStorage.getItem("visitorId"),
        },
        {
          headers: {
            "x-company-id": "nuform-social",
          },
        },
      );
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

            setEmailAsked(true);
          }

          return updatedMessages;
        });
      }
    } catch (error) {
      console.log("Message Error:", error);

      setMessages((prev) => [
        ...prev,
        {
          text: "⚠️ Server error. Please try again.",
          sender: "bot",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Clear History
  const clearChatHistory = () => {
    localStorage.removeItem("nuform_chat_history");
    localStorage.removeItem("nuform_user_email");

    setMessages([]);
    setUserEmail("");
    setEmailAsked(false);

    setShowSuggestions(true);
  };

  // Enter Key
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Floating Button */}
      {!openBot && (
        <button
          onClick={() => setOpenBot(true)}
          className="
            fixed
            bottom-5
            right-5
            w-[60px]
            h-[60px]
            rounded-full
            bg-[#067647]
            shadow-2xl
            flex
            items-center
            justify-center
            text-white
            z-50
            hover:scale-105
            transition-all
            duration-300
          "
        >
          <img
            src={logo}
            alt="Logo"
            className="
              w-[34px]
              h-[34px]
              object-cover
              rounded-full
            "
          />
        </button>
      )}

      {/* Chatbot */}
      {(openBot || embed) && (
        <div
          className={`
    ${embed ? "w-full h-full" : "fixed bottom-5 right-5 w-[365px] h-[547px] rounded-[28px] border border-[#dcdcdc] -m-3"}

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
                    w-[32px]
                    h-[32px]
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
                onClick={() => setOpenBot(false)}
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
                    font-medium
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
            "
          >
            <div
              className="
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
              <input
                type="text"
                placeholder="Ask me anything about our services..."
                className="
                  flex-1
                  outline-none
                  text-[14px]
                  text-[#333]
                  opacity-90
                  placeholder:text-[#9aa5a0]
                "
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
              />

              <button
                onClick={() => handleSendMessage()}
                className="
                  w-[40px]
                  h-[40px]
                  rounded-[12px]
                  bg-[#067647]
                  flex
                  items-center
                  justify-center
                  text-white
                  hover:scale-105
                  transition-all
                  duration-200
                "
              >
                <FaPaperPlane size={14} />
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
