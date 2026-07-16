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

  // Matches each company's real launcher button exactly
  // (Bot.jsx uses logo1.png, transparent bg, object-contain, 75/55px)
  // (OyaBot.jsx uses oya-logo.png, #5E0F28 bg, object-cover, 60/35px)
  const logo = isOya ? BASE_URL + "/oya-logo.png" : BASE_URL + "/logo1.png";

  const buttonSize = isOya ? 60 : 75;

  const imgSize = isOya ? 35 : 55;

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
  // ==========================================
  // Launcher Button
  // ==========================================

  const button = document.createElement("div");

  Object.assign(button.style, {
    position: "fixed",
    width: buttonSize + "px",
    height: buttonSize + "px",
    bottom: bottom + "px",
    borderRadius: "50%",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: isOya ? "#5E0F28" : "transparent",
    cursor: "pointer",
    boxShadow: "0 10px 30px rgba(0,0,0,.25)",
    transition: ".25s ease",
    zIndex: "999999999",
    userSelect: "none",
  });

  if (position === "left") {
    button.style.left = side + "px";
  } else {
    button.style.right = side + "px";
  }

  const img = document.createElement("img");

  img.src = logo;

  Object.assign(img.style, {
    width: imgSize + "px",
    height: imgSize + "px",
    objectFit: isOya ? "cover" : "contain",
    borderRadius: isOya ? "50%" : "0",
    display: "block",
  });

  button.appendChild(img);

  document.body.appendChild(button);

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
        BASE_URL +
        "/embed?companyId=" +
        encodeURIComponent(companyId);

      loaded = true;
    }

    opened = true;

    iframe.style.visibility = "visible";
    iframe.style.opacity = "1";
    iframe.style.transform = "translateY(0)";
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