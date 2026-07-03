(function () {
  if (window.NuformlyWidgetLoaded) return;
  window.NuformlyWidgetLoaded = true;

  const script = document.currentScript;

  // ==========================
  // CONFIG
  // ==========================

  const BASE_URL = "https://chatbot-frontend-nine-psi.vercel.app";

  const companyId =
    script.getAttribute("data-company-id") || "nuform-social";

  const position =
    script.getAttribute("data-position") || "right";

  const bottom =
    script.getAttribute("data-bottom") || "20";

  const side =
    script.getAttribute("data-side") || "20";

  // ==========================
  // COMPANY LOGO
  // ==========================

  let logo = BASE_URL + "/logo.png";

  if (companyId === "oya-gemkara") {
    logo = BASE_URL + "/oya-logo.png";
  }

  // ==========================
  // CHAT BUTTON
  // ==========================

  const button = document.createElement("div");

  Object.assign(button.style, {
    position: "fixed",
    width: "64px",
    height: "64px",
    borderRadius: "50%",
    overflow: "hidden",
    cursor: "pointer",
    background: "white",
    boxShadow: "0 8px 30px rgba(0,0,0,.25)",
    transition: "all .25s ease",
    zIndex: "999999999",
    userSelect: "none",
    bottom: bottom + "px"
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
    display: "block"
  });

  button.appendChild(img);

  document.body.appendChild(button);

  // ==========================
  // CHAT WINDOW
  // ==========================

  const iframe = document.createElement("iframe");

  iframe.setAttribute(
    "allow",
    "clipboard-write; microphone"
  );

  Object.assign(iframe.style, {
    position: "fixed",
    width: "390px",
    maxWidth: "calc(100vw - 20px)",
    height: "700px",
    maxHeight: "calc(100vh - 100px)",
    border: "none",
    outline: "none",
    background: "transparent",
    overflow: "hidden",
    borderRadius: "20px",
    zIndex: "999999999",
    opacity: "0",
    visibility: "hidden",
    transform: "translateY(25px)",
    transition: "all .25s ease",
    bottom: Number(bottom) + 75 + "px"
  });

  if (position === "left") {
    iframe.style.left = side + "px";
  } else {
    iframe.style.right = side + "px";
  }

  document.body.appendChild(iframe);

  // ==========================
  // OPEN / CLOSE
  // ==========================

  let opened = false;
  let loaded = false;

  button.onclick = () => {

    opened = !opened;

    if (!loaded) {
      iframe.src =
        `${BASE_URL}/embed?companyId=${companyId}`;
      loaded = true;
    }

    if (opened) {

      iframe.style.visibility = "visible";
      iframe.style.opacity = "1";
      iframe.style.transform = "translateY(0)";

      button.style.transform = "scale(.95)";

    } else {

      iframe.style.opacity = "0";
      iframe.style.transform = "translateY(25px)";

      button.style.transform = "scale(1)";

      setTimeout(() => {
        iframe.style.visibility = "hidden";
      }, 250);

    }

  };

})();