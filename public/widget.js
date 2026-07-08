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

  let logo = BASE_URL + "/logo.png";

  if (companyId === "oya-gemkara") {
    logo = BASE_URL + "/oya-logo.png";
  }

  // ==========================================
  // Launcher Button
  // ==========================================

  const button = document.createElement("div");

  Object.assign(button.style, {
    position: "fixed",
    width: "60px",
    height: "60px",
    bottom: bottom + "px",
    borderRadius: "50%",
    overflow: "hidden",
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
    width: "100%",
    height: "100%",
    objectFit: "cover",
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
    width: "425px",
    height: "640px",
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

  // Mobile Fullscreen
  if (window.innerWidth <= 480) {
    iframe.style.width = "100vw";
    iframe.style.height = "100dvh";
    iframe.style.left = "0";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.borderRadius = "0";
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

    setTimeout(function () {
      if (!opened) {
        iframe.style.visibility = "hidden";
      }
    }, 250);
  }

  // ==========================================
  // Launcher Click
  // ==========================================

  button.onclick = function () {
    if (opened) {
      closeChat();
    } else {
      openChat();
    }
  };

  // ==========================================
  // Listen from React
  // ==========================================

  window.addEventListener("message", function (event) {
    if (!event.data) return;

    if (event.data.type === "NUFORMLY_CLOSE") {
      closeChat();
    }
  });
})();