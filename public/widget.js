(function () {
  // Prevent duplicate widget
  if (document.getElementById("nuformly-widget")) return;

  // Configuration
  const CONFIG = {
    chatbotUrl: "https://nuform-chatbot-frontend2.vercel.app",
    companyId: "nuform-social", // Change per client
    width: "380px",
    height: "600px",
    mobileWidth: "100vw",
    mobileHeight: "100vh",
  };

  const iframe = document.createElement("iframe");

  iframe.id = "nuformly-widget";

  iframe.src =
    `${CONFIG.chatbotUrl}?companyId=${encodeURIComponent(CONFIG.companyId)}`;

  iframe.title = "Nuformly Chatbot";

  iframe.loading = "lazy";

  iframe.allow =
    "clipboard-read; clipboard-write; microphone; camera";

  iframe.style.position = "fixed";
  iframe.style.bottom = "20px";
  iframe.style.right = "20px";
  iframe.style.width = CONFIG.width;
  iframe.style.height = CONFIG.height;
  iframe.style.border = "none";
  iframe.style.background = "transparent";
  iframe.style.borderRadius = "20px";
  iframe.style.boxShadow = "0 10px 40px rgba(0,0,0,.18)";
  iframe.style.zIndex = "999999";
  iframe.style.overflow = "hidden";

  // Mobile
  if (window.innerWidth <= 768) {
    iframe.style.bottom = "0";
    iframe.style.right = "0";
    iframe.style.left = "0";
    iframe.style.width = CONFIG.mobileWidth;
    iframe.style.height = CONFIG.mobileHeight;
    iframe.style.borderRadius = "0";
  }

  document.body.appendChild(iframe);
})();