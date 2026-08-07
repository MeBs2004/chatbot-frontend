(function () {
  if (window.NuformlyWidgetLoaded) return;
  window.NuformlyWidgetLoaded = true;

  const script = document.currentScript;

  const BASE_URL = "https://chatbot-frontend-nine-psi.vercel.app";

  const companyId =
    script.getAttribute("data-company-id") || "nuform-social";

  const position =
    script.getAttribute("data-position") || "right";

  const bottom = Number(script.getAttribute("data-bottom") || 20);

  const side = Number(script.getAttribute("data-side") || 20);

  const isOya = companyId === "oya-gemkara";

  // ==========================================
  // Per-company config
  // Mirrors Bot.jsx (Nuform) / OyaBot.jsx (OYA) launchers exactly.
  // ==========================================

  const NUFORM_MESSAGES = [
    "\u{1F44B} Hi there!",
    "Hello \u{1F44B}",
    "Need any help?",
    "Let's build your website \u{1F680}",
    "Want more leads?",
    "Need SEO Services?",
    "Need Digital Marketing?",
    "Let's grow your business \u{1F4C8}",
    "Need a website?",
    "Ask me anything.",
    "How can I help today?",
  ];

  const OYA_MESSAGES = [
    "\u2728 Welcome to OYA",
    "\u{1F48E} Looking for timeless jewellery?",
    "\u2728 Find your perfect sparkle",
    "\u{1F48D} Discover handcrafted elegance",
    "\u2728 Explore our latest collection",
    "\u{1F48E} Looking for the perfect gift?",
    "\u2728 Need styling advice?",
    "\u{1F48D} Let's find something beautiful",
    "\u2728 Browse rings, earrings & necklaces",
    "\u{1F48E} Ask me anything about OYA",
    "\u2728 Your jewellery assistant is here",
  ];

  const cfg = isOya
    ? {
        logo: BASE_URL + "/oya-logo.png",
        bubbleAvatar: BASE_URL + "/oya-logo.png",
        buttonSize: 65,
        imgSize: 70,
        imgFit: "cover",
        imgRadius: "50%",
        buttonBg: "rgba(255, 255, 255, 1)",
        glowColor: "212, 175, 55",
        haloColor: "#D4AF37",
        sparkleColor: "#E7C873",
        dotColor: "#D4AF37",
        bubbleBg: "#FFFDF8",
        bubbleBorder: "rgba(212, 175, 55, 0.4)",
        bubbleText: "#2E2E2E",
        dotsColor: "#C9A227",
        avatarBorder: "1px solid rgba(212, 175, 55, 0.4)",
        hoverScale: 1.05,
        hoverRotate: 1,
        messages: OYA_MESSAGES,
        hasHalo: true,
        hasSparkles: true,
        hasShimmer: true,
      }
    : {
        logo: BASE_URL + "/logo1.png",
        bubbleAvatar: BASE_URL + "/logo.png",
        buttonSize: 55,
        imgSize: 55,
        imgFit: "contain",
        imgRadius: "0",
        buttonBg: "transparent",
        glowColor: "6, 118, 71",
        haloColor: null,
        sparkleColor: null,
        dotColor: "#e36b0a",
        bubbleBg: "#ffffff",
        bubbleBorder: "rgba(229, 231, 235, 1)",
        bubbleText: "#374151",
        dotsColor: "#9ca3af",
        avatarBorder: "none",
        hoverScale: 1.08,
        hoverRotate: 2,
        messages: NUFORM_MESSAGES,
        hasHalo: false,
        hasSparkles: false,
        hasShimmer: false,
      };

  // ==========================================
  // Styles
  // ==========================================

  const styleEl = document.createElement("style");

  styleEl.textContent = `
    @keyframes nuformlyLauncherEntrance {
      from { opacity: 0; transform: translateY(24px) scale(0.9); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes nuformlyLauncherFloat {
      0%   { transform: translateY(0); }
      25%  { transform: translateY(-8px); }
      50%  { transform: translateY(0); }
      75%  { transform: translateY(8px); }
      100% { transform: translateY(0); }
    }
    @keyframes nuformlyLauncherBreathe {
      0%, 100% { transform: scale(1); }
      50%      { transform: scale(1.03); }
    }
    @keyframes nuformlyLauncherGlow {
      0%, 100% { box-shadow: 0 0 0 rgba(${cfg.glowColor}, 0); }
      6%       { box-shadow: 0 0 22px 6px rgba(${cfg.glowColor}, 0.45); }
      14%      { box-shadow: 0 0 0 rgba(${cfg.glowColor}, 0); }
    }
    @keyframes nuformlyBubbleEnter {
      from { opacity: 0; transform: translateY(10px) scale(0.95); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes nuformlyBubbleExit {
      from { opacity: 1; transform: translateY(0) scale(1); }
      to   { opacity: 0; transform: translateY(10px) scale(0.95); }
    }
    @keyframes nuformlyDotBounce {
      0%, 100% { transform: translateY(-25%); animation-timing-function: cubic-bezier(0.8,0,1,1); }
      50%      { transform: none; animation-timing-function: cubic-bezier(0,0,0.2,1); }
    }
    @keyframes nuformlyPulse {
      0%, 100% { opacity: 1; }
      50%      { opacity: .5; }
    }
    ${
      cfg.hasHalo
        ? `@keyframes nuformlyLauncherHalo {
      0%   { transform: scale(0.9); opacity: 0.4; }
      50%  { transform: scale(1.25); opacity: 0.18; }
      100% { transform: scale(1.5); opacity: 0; }
    }`
        : `@keyframes nuformlyLauncherPulseRing {
      0%   { transform: scale(0.85); opacity: 0.55; }
      70%  { transform: scale(1.35); opacity: 0; }
      100% { transform: scale(1.35); opacity: 0; }
    }`
    }
    ${
      cfg.hasShimmer
        ? `@keyframes nuformlyLauncherShimmer {
      0%, 88% { background-position: -120% -120%; opacity: 0; }
      92%     { opacity: 0.7; }
      100%    { background-position: 220% 220%; opacity: 0; }
    }`
        : ""
    }
    ${
      cfg.hasSparkles
        ? `@keyframes nuformlySparkleFade {
      0%, 100% { opacity: 0; transform: scale(0.4); }
      50%      { opacity: 0.85; transform: scale(1); }
    }`
        : ""
    }

    .nuformly-launcher-entrance { animation: nuformlyLauncherEntrance 0.6s ease-out forwards; }
    .nuformly-launcher-float    { animation: nuformlyLauncherFloat 4.5s ease-in-out infinite; }
    .nuformly-launcher-breathe  { animation: nuformlyLauncherBreathe 5.5s ease-in-out infinite; }
    .nuformly-launcher-glow     { animation: nuformlyLauncherGlow 8s ease-in-out infinite; }
    .nuformly-bubble-enter      { animation: nuformlyBubbleEnter 0.3s ease forwards; }
    .nuformly-bubble-exit       { animation: nuformlyBubbleExit 0.3s ease forwards; }
    ${
      cfg.hasHalo
        ? `.nuformly-launcher-halo { animation: nuformlyLauncherHalo 3.4s ease-out infinite; filter: blur(6px); }`
        : `.nuformly-launcher-pulse-ring { animation: nuformlyLauncherPulseRing 2.6s ease-out infinite; }`
    }
    ${
      cfg.hasShimmer
        ? `.nuformly-launcher-shimmer {
      animation: nuformlyLauncherShimmer 9s ease-in-out infinite;
      background: linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.85) 50%, transparent 70%);
      background-size: 250% 250%;
    }`
        : ""
    }
    ${
      cfg.hasSparkles
        ? `.nuformly-sparkle {
      animation: nuformlySparkleFade var(--dur, 4s) ease-in-out infinite;
      animation-delay: var(--delay, 0s);
    }`
        : ""
    }

    @media (prefers-reduced-motion: reduce) {
      .nuformly-launcher-entrance,
      .nuformly-launcher-float,
      .nuformly-launcher-breathe,
      .nuformly-launcher-glow,
      .nuformly-launcher-halo,
      .nuformly-launcher-pulse-ring,
      .nuformly-launcher-shimmer,
      .nuformly-sparkle,
      .nuformly-bubble-enter,
      .nuformly-bubble-exit {
        animation: none !important;
      }
    }

    @media (max-width: 480px) {
      .nuformly-bubble-card {
        max-width: calc(100vw - 90px) !important;
      }
    }
  `;

  // Runs the mount logic once <body> exists.
  // Handles scripts placed in <head> (e.g. WordPress/Wix/Squarespace
  // "header" injection), where document.body is still null at parse time.
  function whenBodyReady(fn) {
    if (document.body) {
      fn();
    } else {
      document.addEventListener("DOMContentLoaded", fn);
    }
  }

  whenBodyReady(function () {
    document.head.appendChild(styleEl);

    // ==========================================
    // Launcher (entrance -> float -> button/halo/sparkles)
    // ==========================================

    const outer = document.createElement("div");

    Object.assign(outer.style, {
      position: "fixed",
      bottom: bottom + "px",
      zIndex: "999999999",
      userSelect: "none",
    });

    outer.style[position === "left" ? "left" : "right"] = side + "px";
    outer.className = "nuformly-launcher-entrance";

    const floatWrap = document.createElement("div");

    floatWrap.style.position = "relative";
    floatWrap.className = "nuformly-launcher-float";
    outer.appendChild(floatWrap);

    // ---- Halo (OYA) / Pulse Ring (Nuform) ----

    const ring = document.createElement("span");

    Object.assign(ring.style, {
      position: "absolute",
      top: "0",
      left: "0",
      right: "0",
      bottom: "0",
      borderRadius: "50%",
      pointerEvents: "none",
    });

    if (cfg.hasHalo) {
      ring.className = "nuformly-launcher-halo";
      ring.style.background =
        "radial-gradient(circle, " +
        cfg.haloColor +
        "8c 0%, " +
        cfg.haloColor +
        "00 70%)";
    } else {
      ring.className = "nuformly-launcher-pulse-ring";
      ring.style.background = "#067647";
    }

    floatWrap.appendChild(ring);

    // ---- Sparkles (OYA only) ----

    if (cfg.hasSparkles) {
      const sparkleField = document.createElement("div");

      Object.assign(sparkleField.style, {
        position: "absolute",
        top: "-30px",
        left: "-30px",
        right: "-30px",
        bottom: "-30px",
        pointerEvents: "none",
      });

      const SPARKLE_COUNT = 5;

      for (let i = 0; i < SPARKLE_COUNT; i++) {
        const angle = (i / SPARKLE_COUNT) * Math.PI * 2 + Math.random() * 0.8;
        const radius = 34 + Math.random() * 16;

        const sparkle = document.createElement("span");

        sparkle.textContent = "\u2726";
        sparkle.className = "nuformly-sparkle";

        Object.assign(sparkle.style, {
          position: "absolute",
          top: 40 + Math.sin(angle) * radius + "px",
          left: 40 + Math.cos(angle) * radius + "px",
          fontSize: "8px",
          color: cfg.sparkleColor,
          textShadow: "0 0 4px rgba(212,175,55,0.8)",
        });

        sparkle.style.setProperty("--dur", 3.2 + Math.random() * 2.2 + "s");
        sparkle.style.setProperty("--delay", Math.random() * 4 + "s");

        sparkleField.appendChild(sparkle);
      }

      floatWrap.appendChild(sparkleField);
    }

    // ---- Greeting bubble container (populated by the cycle below) ----

    const bubbleWrap = document.createElement("div");

    Object.assign(bubbleWrap.style, {
      position: "absolute",
      bottom: cfg.buttonSize + 17 + "px",
      display: "none",
    });

    bubbleWrap.style[position === "left" ? "left" : "right"] = "0";
    floatWrap.appendChild(bubbleWrap);

    bubbleWrap.addEventListener("click", (event) => {
      if (event.target.closest("[data-dismiss]")) {
        dismissBubble();
      }
    });

    // ---- Launcher button ----

    const button = document.createElement("button");

    button.type = "button";

    button.setAttribute(
      "aria-label",
      isOya ? "Open OYA jewellery assistant" : "Open Nuform Social Assistant",
    );

    Object.assign(button.style, {
      position: "relative",
      width: cfg.buttonSize + "px",
      height: cfg.buttonSize + "px",
      borderRadius: "50%",
      border: "none",
      padding: "0",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: cfg.buttonBg,
      cursor: "pointer",
      boxShadow: "0 10px 30px rgba(0,0,0,.25)",
      transition: "transform .25s ease",
    });

    button.onmouseenter = () => {
      button.style.transform =
        "scale(" + cfg.hoverScale + ") rotate(" + cfg.hoverRotate + "deg)";
    };

    button.onmouseleave = () => {
      button.style.transform = "";
    };

    floatWrap.appendChild(button);

    const breatheWrap = document.createElement("div");

    breatheWrap.className = "nuformly-launcher-breathe nuformly-launcher-glow";

    Object.assign(breatheWrap.style, {
      position: "relative",
      width: "100%",
      height: "100%",
      borderRadius: "50%",
      overflow: "hidden",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    });

    button.appendChild(breatheWrap);

    const img = document.createElement("img");

    img.src = cfg.logo;
    img.alt = "Logo";

    Object.assign(img.style, {
      width: cfg.imgSize + "px",
      height: cfg.imgSize + "px",
      objectFit: cfg.imgFit,
      borderRadius: cfg.imgRadius,
      display: "block",
    });

    breatheWrap.appendChild(img);

    if (cfg.hasShimmer) {
      const shimmerMask = document.createElement("span");

      Object.assign(shimmerMask.style, {
        position: "absolute",
        top: "0",
        left: "0",
        right: "0",
        bottom: "0",
        borderRadius: "50%",
        overflow: "hidden",
        pointerEvents: "none",
      });

      const shimmerBar = document.createElement("span");

      shimmerBar.className = "nuformly-launcher-shimmer";

      Object.assign(shimmerBar.style, {
        position: "absolute",
        top: "0",
        left: "0",
        right: "0",
        bottom: "0",
      });

      shimmerMask.appendChild(shimmerBar);
      breatheWrap.appendChild(shimmerMask);
    }

    // ---- Notification dot ----

    const dot = document.createElement("span");

    Object.assign(dot.style, {
      position: "absolute",
      top: "0",
      right: "0",
      width: "12px",
      height: "12px",
      borderRadius: "50%",
      background: cfg.dotColor,
      border: "1px solid #fff",
      display: "none",
      animation: "nuformlyPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
    });

    button.appendChild(dot);

    document.body.appendChild(outer);

    // ==========================================
    // Greeting bubble lifecycle
    // wait 2s -> typing indicator 700ms -> type 35-45ms/char ->
    // hold 4s -> fade 300ms -> wait 8s -> repeat.
    // Mirrors the React launcher's useEffect cycle exactly.
    // ==========================================

    let lastMessage = "";
    let cycleTimer = null;
    let cycleCancelled = true; // starts paused; startCycle() below un-pauses it
    let dismissBubble = () => {};

    function pickNextMessage() {
      if (cfg.messages.length <= 1) return cfg.messages[0];

      let next;

      do {
        next = cfg.messages[Math.floor(Math.random() * cfg.messages.length)];
      } while (next === lastMessage);

      return next;
    }

    function wait(ms, next) {
      cycleTimer = setTimeout(() => {
        if (!cycleCancelled) next();
      }, ms);
    }

    function bubbleCardHtml(innerHtml, withDismiss) {
      return (
        '<div class="nuformly-bubble-card" style="position:relative;display:flex;align-items:flex-start;gap:6px;background:' +
        cfg.bubbleBg +
        ";border:1px solid " +
        cfg.bubbleBorder +
        ";border-radius:12px;box-shadow:0 6px 20px rgba(0,0,0,0.1);padding:7px 12px 7px 8px;min-width:150px;max-width:195px;\">" +
        '<img src="' +
        cfg.bubbleAvatar +
        '" alt="" style="width:16px;height:16px;border-radius:50%;object-fit:cover;margin-top:2px;flex-shrink:0;border:' +
        cfg.avatarBorder +
        ';" />' +
        innerHtml +
        (withDismiss
          ? '<button type="button" data-dismiss aria-label="Dismiss greeting" style="position:absolute;top:-5px;right:-5px;width:14px;height:14px;border-radius:50%;background:' +
            cfg.bubbleBg +
            ";border:1px solid " +
            cfg.bubbleBorder +
            ';box-shadow:0 1px 2px rgba(0,0,0,.15);display:flex;align-items:center;justify-content:center;cursor:pointer;color:#9ca3af;font-size:8px;line-height:1;padding:0;">\u2715</button>'
          : "") +
        '<div style="position:absolute;bottom:-5px;right:20px;width:10px;height:10px;background:' +
        cfg.bubbleBg +
        ";border-bottom:1px solid " +
        cfg.bubbleBorder +
        ";border-right:1px solid " +
        cfg.bubbleBorder +
        ';transform:rotate(45deg);"></div>' +
        "</div>"
      );
    }

    function dotsHtml() {
      const dotStyle =
        "width:4px;height:4px;border-radius:50%;background:" +
        cfg.dotsColor +
        ";animation:nuformlyDotBounce 1.4s ease-in-out infinite;";

      return (
        '<div style="display:flex;align-items:center;gap:4px;height:11px;margin-top:3px;" aria-hidden="true">' +
        '<span style="' +
        dotStyle +
        '"></span>' +
        '<span style="' +
        dotStyle +
        'animation-delay:0.15s;"></span>' +
        '<span style="' +
        dotStyle +
        'animation-delay:0.3s;"></span>' +
        "</div>"
      );
    }

    function textHtml(text) {
      return (
        '<p style="font-size:11.5px;font-weight:500;color:' +
        cfg.bubbleText +
        ';line-height:1.4;letter-spacing:0.01em;margin:0;padding-top:1px;" aria-live="polite">' +
        text +
        "</p>"
      );
    }

    function typeMessage(message, charIndex) {
      if (cycleCancelled) return;

      bubbleWrap.innerHTML = bubbleCardHtml(
        textHtml(message.slice(0, charIndex)),
        false,
      );

      if (charIndex >= message.length) {
        bubbleWrap.innerHTML = bubbleCardHtml(textHtml(message), true);

        const goToHiding = () => {
          if (cycleCancelled) return;

          bubbleWrap.className = "nuformly-bubble-exit";

          wait(300, () => {
            bubbleWrap.style.display = "none";
            dot.style.display = "none";
            wait(8000, startCycle);
          });
        };

        dismissBubble = () => {
          clearTimeout(cycleTimer);
          goToHiding();
        };

        wait(4000, goToHiding);
        return;
      }

      wait(35 + Math.random() * 10, () => typeMessage(message, charIndex + 1));
    }

    function startCycle() {
      if (cycleCancelled) return;

      wait(2000, () => {
        if (cycleCancelled) return;

        dot.style.display = "block";
        bubbleWrap.style.display = "block";
        bubbleWrap.className = "nuformly-bubble-enter";
        bubbleWrap.innerHTML = bubbleCardHtml(dotsHtml(), false);

        wait(700, () => {
          const message = pickNextMessage();

          lastMessage = message;
          typeMessage(message, 0);
        });
      });
    }

    function pauseBubbleCycle() {
      cycleCancelled = true;
      clearTimeout(cycleTimer);
      bubbleWrap.style.display = "none";
      dot.style.display = "none";
    }

    function resumeBubbleCycle() {
      if (!cycleCancelled) return;

      cycleCancelled = false;
      startCycle();
    }

    resumeBubbleCycle();

    // ==========================================
    // Iframe
    // ==========================================

    const iframe = document.createElement("iframe");

    iframe.allow = "clipboard-write; microphone";

    Object.assign(iframe.style, {
      position: "fixed",
      width: "365px",
      height: "547px",
      border: "none",
      borderRadius: "28px",
      background: "transparent",
      overflow: "hidden",
      zIndex: "999999999",
      opacity: "0",
      visibility: "hidden",
      transform: "translateY(25px)",
      transition: "all .25s ease",
      bottom: bottom + "px",
    });

    if (position === "left") {
      iframe.style.left = side + "px";
    } else {
      iframe.style.right = side + "px";
    }

    // ==========================================
    // Mobile Fullscreen
    // ==========================================

    if (window.innerWidth <= 480) {
      Object.assign(iframe.style, {
        width: "100vw",
        height: "100dvh",
        left: "0",
        right: "0",
        bottom: "0",
        borderRadius: "0",
      });
    }

    document.body.appendChild(iframe);

    let loaded = false;
    let opened = false;

    // ==========================================
    // Open Chat
    // ==========================================

    function openChat() {
      if (!loaded) {
        iframe.src =
          BASE_URL + "/embed?companyId=" + encodeURIComponent(companyId);

        loaded = true;
      }

      opened = true;

      iframe.style.visibility = "visible";
      iframe.style.opacity = "1";
      iframe.style.transform = "translateY(0)";

      pauseBubbleCycle();
    }

    // ==========================================
    // Close Chat
    // ==========================================

    function closeChat() {
      opened = false;

      iframe.style.opacity = "0";
      iframe.style.transform = "translateY(25px)";

      setTimeout(() => {
        if (!opened) {
          iframe.style.visibility = "hidden";
        }
      }, 250);

      resumeBubbleCycle();
    }

    // ==========================================
    // Launcher Click
    // ==========================================

    button.onclick = () => {
      opened ? closeChat() : openChat();
    };

    // ==========================================
    // Listen from React
    // ==========================================

    window.addEventListener("message", (event) => {
      if (!event.data) return;

      if (event.data.type === "NUFORMLY_CLOSE") {
        closeChat();
      }
    });
  });
})();
