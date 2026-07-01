(function () {
  if (window.NuformlyWidgetLoaded) return;
  window.NuformlyWidgetLoaded = true;

  const script = document.currentScript;

  const companyId =
    script.getAttribute("data-company-id") || "nuform-social";

  const position =
    script.getAttribute("data-position") || "right";

  const BASE_URL = "https://chatbot-frontend-nine-psi.vercel.app";

  const button = document.createElement("div");

  Object.assign(button.style, {
    position: "fixed",
    width: "60px",
    height: "60px",
    borderRadius: "50%",
    background: "#067647",
    color: "#fff",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: "30px",
    cursor: "pointer",
    bottom: "20px",
    zIndex: "999999",
    boxShadow: "0 10px 25px rgba(0,0,0,.25)",
    transition: ".3s",
    userSelect: "none"
  });

  button.innerHTML = "💬";

  if (position === "left") {
    button.style.left = "20px";
  } else {
    button.style.right = "20px";
  }

  document.body.appendChild(button);

  const iframe = document.createElement("iframe");

  iframe.src =
    `${BASE_URL}/embed?companyId=${companyId}`;

  Object.assign(iframe.style, {
    position: "fixed",
    width: "380px",
    height: "650px",
    bottom: "90px",
    border: "none",
    borderRadius: "20px",
    background: "#fff",
    boxShadow: "0 10px 40px rgba(0,0,0,.25)",
    opacity: "0",
    visibility: "hidden",
    transform: "translateY(20px)",
    transition: ".25s",
    zIndex: "999999"
  });

  if (position === "left") {
    iframe.style.left = "20px";
  } else {
    iframe.style.right = "20px";
  }

  document.body.appendChild(iframe);

  let opened = false;

  button.onclick = () => {

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

  };

})();