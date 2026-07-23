import React, { useEffect, useRef, useState } from "react";
import axios from "axios";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import logo from "../assets/logo.png";
import logo1 from "../assets/logo1.png";

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
} from "react-icons/fa";

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

  const [suggestions, setSuggestions] = useState([]);

  const [showSuggestions, setShowSuggestions] = useState(true);

  const [openBot, setOpenBot] = useState(embed ? true : false);

  const [animateBot, setAnimateBot] = useState(false);

  const messagesEndRef = useRef(null);

  // Hidden file input
  const fileInputRef = useRef(null);

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
    const messageText = customMessage || input;

    // Prevent empty send
    if (!messageText.trim() && !selectedFile) return;

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
      const formData = new FormData();

      formData.append("text", messageText);
      formData.append("language", language);
      formData.append("visitorId", localStorage.getItem("visitorId"));

      if (selectedFile) {
        formData.append("file", selectedFile);
      }

      const res = await axios.post(`${BACKEND_URL}bot/v1/message`, formData, {
        headers: {
          "x-company-id": "nuform-social",
          "Content-Type": "multipart/form-data",
        },
      });

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

    // Send if there is text OR any selected file
    if (input.trim() || selectedFile) {
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Floating Button */}
      {!embed && !openBot && (
        <button
          onClick={() => setOpenBot(true)}
          className="
            fixed
            bottom-5
            right-5
            w-[75px]
            h-[75px]
            rounded-full
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
            src={logo1}
            alt="Logo"
            className="
              w-[55px]
              h-[55px]
              object-contain
            "
          />
        </button>
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

              {/* Text Input */}
              <input
                type="text"
                placeholder="Ask me anything about our services..."
                className="
        flex-1
        outline-none
        text-[13px]
        text-[#333]
        opacity-90
        placeholder:text-[#9aa5a0]
      "
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
              />

              {/* Send Button */}
              <button
                onClick={() => handleSendMessage()}
                className="
        w-[35px]
        h-[35px]
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
