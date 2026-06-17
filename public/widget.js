(function () {

  const iframe = document.createElement("iframe");

  iframe.src =
    "https://nuform-chatbot-frontend2-git-main-mebs2004s-projects.vercel.app";

  iframe.style.position = "fixed";
  iframe.style.bottom = "20px";
  iframe.style.right = "20px";
  iframe.style.width = "370px";
  iframe.style.height = "560px";
  iframe.style.border = "3px solid red";
  iframe.style.zIndex = "999999";
  iframe.style.background = "white";

  document.body.appendChild(iframe);

  console.log("Nuform Widget Loaded");

})();