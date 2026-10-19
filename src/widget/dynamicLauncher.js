// The config-driven widget: one data-chatbot-id, everything else from
// the chatbot's saved config. See the Phase 1 design spec.
import { io } from "socket.io-client";
import { buildLauncherModel } from "./launcherModel.js";
import { mountLauncher } from "./launcher.js";
import { fetchSession } from "./session.js";

const MOBILE_MAX_WIDTH = 480;

function defaultApiBase() {
  const base = (import.meta.env && import.meta.env.VITE_BACKEND_URL) || "";
  return base;
}

const withSlash = (url) => (url.endsWith("/") ? url : `${url}/`);

export async function startDynamicLauncher({
  attrs,
  scriptSrc,
  fetchImpl = (...args) => fetch(...args),
  connectSocket = io,
}) {
  const apiBase = withSlash(attrs.apiBase || defaultApiBase());
  const widgetOrigin = new URL(scriptSrc).origin;
  const chatbotId = attrs.chatbotId;

  const session = await fetchSession(apiBase, chatbotId, fetchImpl);
  if (!session) {
    console.warn("Nuformly widget: this chatbot is not available here.");
    return null;
  }

  let token = session.token;
  let config = session.config;
  const isMobile = () => window.innerWidth <= MOBILE_MAX_WIDTH;
  const modelFor = (cfg) => buildLauncherModel({ config: cfg, chatbot: session.chatbot, attrs, isMobile: isMobile() });

  let iframe = null;
  let opened = false;
  const post = (message) => iframe?.contentWindow?.postMessage(message, widgetOrigin);

  const launcher = mountLauncher(modelFor(config), { onClick: () => (opened ? closeChat() : openChat()) });

  function sizeIframe() {
    const side = modelFor(config)?.side || "right";
    if (isMobile()) {
      Object.assign(iframe.style, { width: "100vw", height: "100dvh", left: "0", right: "0", bottom: "0", borderRadius: "0" });
    } else {
      Object.assign(iframe.style, {
        width: "365px", height: "547px", bottom: `${attrs.bottom}px`, borderRadius: "28px",
        left: side === "left" ? `${attrs.side}px` : "", right: side === "right" ? `${attrs.side}px` : "",
      });
    }
  }

  function openChat() {
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.setAttribute("title", "Chat");
      iframe.allow = "clipboard-write; microphone";
      Object.assign(iframe.style, {
        position: "fixed", border: "none", background: "transparent", overflow: "hidden", zIndex: "2147483001",
        opacity: "0", visibility: "hidden", transform: "translateY(25px)", transition: "all .25s ease",
      });
      sizeIframe();
      window.addEventListener("resize", sizeIframe);
      iframe.setAttribute(
        "src",
        `${widgetOrigin}/embed?chatbotId=${encodeURIComponent(chatbotId)}#t=${encodeURIComponent(token)}`
      );
      document.body.appendChild(iframe);
    }
    opened = true;
    Object.assign(iframe.style, { visibility: "visible", opacity: "1", transform: "translateY(0)" });
    launcher.setOpen(true);
  }

  function closeChat() {
    opened = false;
    if (!iframe) return;
    Object.assign(iframe.style, { opacity: "0", transform: "translateY(25px)" });
    setTimeout(() => {
      if (!opened) iframe.style.visibility = "hidden";
    }, 250);
    launcher.setOpen(false);
  }

  window.addEventListener("message", async (event) => {
    if (event.origin !== widgetOrigin || !event.data) return;
    if (event.data.type === "NUFORMLY_CLOSE") closeChat();
    if (event.data.type === "NUFORMLY_TOKEN_REQUEST") {
      const fresh = await fetchSession(apiBase, chatbotId, fetchImpl);
      if (fresh) {
        token = fresh.token;
        post({ type: "NUFORMLY_TOKEN", token });
      }
    }
  });

  try {
    const socket = connectSocket(`${apiBase}widget`, { auth: { chatbotId } });
    socket.on("domain:event", (event) => {
      if (!event || event.type !== "chatbot.config.updated") return;
      if (!event.available) {
        launcher.update(null);
        return;
      }
      config = event.config;
      launcher.update(modelFor(config));
      post({ type: "NUFORMLY_CONFIG", config });
    });
  } catch (err) {
    // Live updates are optional; the launcher already works without them.
    console.warn("Nuformly widget: live updates unavailable.", err);
  }

  const model = modelFor(config);
  if (model?.autoOpenMs !== null && model?.autoOpenMs !== undefined) setTimeout(openChat, model.autoOpenMs);

  return { launcher, open: openChat, close: closeChat };
}
