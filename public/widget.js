(function () {

  const iframe = document.createElement("iframe");

  iframe.src =
    "https://nuform-chatbot-frontend2-git-main-mebs2004s-projects.vercel.app";

  iframe.style.position = "fixed";
  iframe.style.bottom = "20px";
  iframe.style.right = "20px";
  iframe.style.width = "370px";
  iframe.style.height = "560px";
  iframe.style.border = "none";
  iframe.style.background = "transparent";
  iframe.style.zIndex = "999999";

  document.body.appendChild(iframe);

})();