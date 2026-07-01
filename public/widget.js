(function () {
  if (window.NuformlyWidgetLoaded) return;
  window.NuformlyWidgetLoaded = true;

  const script = document.currentScript;

  const companyId =
    script.getAttribute("data-company-id") || "nuform-social";

  const position =
    script.getAttribute("data-position") || "right";

  // Replace with your Vercel URL after deployment
  const BASE_URL = "https://chatbot-frontend-nine-psi.vercel.app";

  // Floating Button
  const button = document.createElement("div");

  button.innerHTML = "💬";

  Object.assign(button.style, {
    position: "fixed",
    bottom: "20px",
    width: "60px",
    height: "60px",
    borderRadius: "50%",
    background: "#067647",
    color: "#fff",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    cursor: "pointer",
    fontSize: "28px",
    boxShadow: "0 8px 25px rgba(0,0,0,.25)",
    zIndex: "999999",
    transition: "all .3s ease",
  });

  if (position === "left") {
    button.style.left = "20px";
  } else {
    button.style.right = "20px";
  }

  document.body.appendChild(button);

  // Chat Window
  const iframe = document.createElement("iframe");

  iframe.src = `${BASE_URL}/embed?companyId=${companyId}`;

  Object.assign(iframe.style, {
    position: "fixed",
    bottom: "90px",
    width: "380px",
    height: "620px",
    border: "none",
    borderRadius: "20px",
    background: "transparent",
    overflow: "hidden",
    boxShadow: "0 10px 35px rgba(0,0,0,.30)",
    zIndex: "999999",
    opacity: "0",
    visibility: "hidden",
    transform: "translateY(20px)",
    transition: "all .25s ease",
  });

  if (position === "left") {
    iframe.style.left = "20px";
  } else {
    iframe.style.right = "20px";
  }

  document.body.appendChild(iframe);

  let opened = false;

  button.addEventListener("click", () => {
    opened = !opened;

    if (opened) {
      iframe.style.visibility = "visible";
      iframe.style.opacity = "1";
      iframe.style.transform = "translateY(0)";
      button.innerHTML = "✕";
    } else {
      iframe.style.opacity = "0";
      iframe.style.transform = "translateY(20px)";

      setTimeout(() => {
        iframe.style.visibility = "hidden";
      }, 250);

      button.innerHTML = "💬";
    }
  });
})();