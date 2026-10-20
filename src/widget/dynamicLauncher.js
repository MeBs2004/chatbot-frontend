// The config-driven widget: one data-chatbot-id, everything else from
// the chatbot's saved config. See the Phase 1 design spec.
import { io } from "socket.io-client";
import { buildLauncherModel } from "./launcherModel.js";
import { mountLauncher } from "./launcher.js";
import { fetchSession } from "./session.js";
import { resolveWindowStyle } from "../components/NuformlyWidget/widgetStyle.js";

const MOBILE_MAX_WIDTH = 480;

// How the chat window enters/leaves, from chatWindow.windowAnimation.
const WINDOW_MOTION = {
  none: { hidden: "none", transition: "none" },
  "slide-up": { hidden: "translateY(25px)", transition: "all .25s ease" },
  fade: { hidden: "none", transition: "opacity .3s ease, visibility .3s" },
  scale: { hidden: "scale(.92)", transition: "all .28s cubic-bezier(.16,1,.3,1)" },
  bounce: { hidden: "translateY(30px) scale(.85)", transition: "all .5s cubic-bezier(.34,1.56,.64,1)" },
  zoom: { hidden: "scale(.4)", transition: "all .35s cubic-bezier(.16,1,.3,1)" },
  flip: { hidden: "perspective(900px) rotateX(-70deg)", transition: "all .55s ease" },
  drop: { hidden: "translateY(-60px)", transition: "all .6s cubic-bezier(.34,1.56,.64,1)" },
  rotate: { hidden: "rotate(-8deg) scale(.85)", transition: "all .45s cubic-bezier(.16,1,.3,1)" },
  elastic: { hidden: "scale(.3)", transition: "all .7s cubic-bezier(.34,1.8,.64,1)" },
  "slide-down": { hidden: "translateY(-30px)", transition: "all .35s ease" },
  "slide-left": { hidden: "translateX(-40px)", transition: "all .4s cubic-bezier(.16,1,.3,1)" },
  "slide-right": { hidden: "translateX(40px)", transition: "all .4s cubic-bezier(.16,1,.3,1)" },
  "flip-y": { hidden: "perspective(900px) rotateY(70deg)", transition: "all .55s ease" },
  swing: { hidden: "rotate(-14deg) translateY(20px)", transition: "all .8s cubic-bezier(.34,1.56,.64,1)" },
  blur: { hidden: "scale(.96)", hiddenFilter: "blur(14px)", transition: "all .5s ease" },
};
// `auto` = the window is opening by itself (behavior.autoOpen). It uses
// behavior.autoOpenAnimation unless that is "default", which means the
// same motion as a manual open.
export function windowMotion(config, auto = false) {
  const chosen = auto ? config?.behavior?.autoOpenAnimation : null;
  const name = chosen && chosen !== "default" ? chosen : config?.chatWindow?.windowAnimation;
  return WINDOW_MOTION[name] || WINDOW_MOTION["slide-up"];
}
const motionFor = (config, auto = false) => windowMotion(config, auto);

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
    const look = resolveWindowStyle(config);
    if (isMobile()) {
      Object.assign(iframe.style, { width: "100vw", height: "100dvh", left: "0", right: "0", bottom: "0", borderRadius: "0", boxShadow: "none" });
    } else {
      Object.assign(iframe.style, {
        width: `${look.width}px`,
        // Never taller than what's left of the visitor's screen above the launcher.
        height: `${Math.max(240, Math.min(look.height, window.innerHeight - attrs.bottom - 16))}px`,
        bottom: `${attrs.bottom}px`,
        borderRadius: `${look.radius}px`, boxShadow: look.shadow, transformOrigin: side === "left" ? "bottom left" : "bottom right",
        left: side === "left" ? `${attrs.side}px` : "", right: side === "right" ? `${attrs.side}px` : "",
      });
    }
  }

  function openChat({ auto = false } = {}) {
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.setAttribute("title", "Chat");
      iframe.allow = "clipboard-write; microphone";
      Object.assign(iframe.style, {
        position: "fixed", border: "none", background: "transparent", overflow: "hidden", zIndex: "2147483001",
        opacity: "0", visibility: "hidden", transform: motionFor(config, auto).hidden, filter: motionFor(config, auto).hiddenFilter || "none",
        transition: motionFor(config, auto).transition,
      });
      sizeIframe();
      window.addEventListener("resize", sizeIframe);
      iframe.setAttribute(
        "src",
        `${widgetOrigin}/embed?chatbotId=${encodeURIComponent(chatbotId)}#t=${encodeURIComponent(token)}`
      );
      document.body.appendChild(iframe);
      // Commit the hidden state before showing it, otherwise the very
      // first open skips its transition.
      void iframe.offsetWidth;
    }
    opened = true;
    Object.assign(iframe.style, { transition: motionFor(config, auto).transition, visibility: "visible", opacity: "1", transform: "none", filter: "none" });
    launcher.setOpen(true);
  }

  function closeChat() {
    opened = false;
    if (!iframe) return;
    Object.assign(iframe.style, { opacity: "0", transform: motionFor(config).hidden, filter: motionFor(config).hiddenFilter || "none" });
    setTimeout(() => {
      if (!opened) iframe.style.visibility = "hidden";
    }, 800);
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
      if (iframe) sizeIframe();
      post({ type: "NUFORMLY_CONFIG", config });
    });
  } catch (err) {
    // Live updates are optional; the launcher already works without them.
    console.warn("Nuformly widget: live updates unavailable.", err);
  }

  const model = modelFor(config);
  if (model?.autoOpenMs !== null && model?.autoOpenMs !== undefined) setTimeout(() => openChat({ auto: true }), model.autoOpenMs);

  return { launcher, open: openChat, close: closeChat };
}
