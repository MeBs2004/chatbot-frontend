// The config-driven launcher button + greeting/teaser bubble, drawn on
// the customer's page. DOM APIs only: every piece of text from the
// chatbot's config goes through textContent, never innerHTML.

const SIZES = { small: 48, medium: 60, large: 72 };
const FIRST_BUBBLE_MS = 2000;
const ROTATE_MS = 6000;
const SVG_NS = "http://www.w3.org/2000/svg";
const ICON_PATHS = {
  // Sparkle ("AI") and speech-bubble icons, 24x24 viewBox.
  default: "M12 2l2.4 6.1L20.5 10l-6.1 2.4L12 18.5l-2.4-6.1L3.5 10l6.1-1.9L12 2zm7 13l1.1 2.9L23 19l-2.9 1.1L19 23l-1.1-2.9L15 19l2.9-1.1L19 15z",
  chat: "M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2z",
};

const CSS = `
@keyframes nuformlyFloat { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }
@keyframes nuformlyPulseRing { 0% { box-shadow: 0 0 0 0 rgba(0,0,0,.25) } 100% { box-shadow: 0 0 0 14px rgba(0,0,0,0) } }
@keyframes nuformlyGlow { 0%,100% { filter: brightness(1) } 50% { filter: brightness(1.15) } }
[data-nuformly-launcher] .nf-anim-float { animation: nuformlyFloat 4.5s ease-in-out infinite }
[data-nuformly-launcher] .nf-anim-pulse { animation: nuformlyPulseRing 2.6s ease-out infinite }
[data-nuformly-launcher] .nf-anim-glow { animation: nuformlyGlow 3s ease-in-out infinite }
@media (prefers-reduced-motion: reduce) { [data-nuformly-launcher] * { animation: none !important } }
`;

function ensureStyle() {
  if (document.getElementById("nuformly-launcher-style")) return;
  const style = document.createElement("style");
  style.id = "nuformly-launcher-style";
  style.textContent = CSS;
  document.head.appendChild(style);
}

function iconNode(icon, px) {
  if (icon.kind === "image") {
    const img = document.createElement("img");
    img.setAttribute("src", icon.src);
    img.setAttribute("alt", "");
    Object.assign(img.style, { width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" });
    return img;
  }
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", String(Math.round(px * 0.45)));
  svg.setAttribute("height", String(Math.round(px * 0.45)));
  svg.setAttribute("fill", "#ffffff");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", ICON_PATHS[icon.kind] || ICON_PATHS.default);
  svg.appendChild(path);
  return svg;
}

export function mountLauncher(initialModel, { onClick }) {
  ensureStyle();
  const root = document.createElement("div");
  root.setAttribute("data-nuformly-launcher", "");
  document.body.appendChild(root);

  let timers = [];
  let open = false;
  let model = null;

  const clearTimers = () => {
    timers.forEach((t) => {
      clearTimeout(t);
      clearInterval(t);
    });
    timers = [];
  };

  function renderBubble(bubble, message) {
    bubble.replaceChildren();
    if (message.title) {
      const title = document.createElement("strong");
      title.textContent = message.title;
      Object.assign(title.style, { display: "block", marginBottom: "2px" });
      bubble.appendChild(title);
    }
    const text = document.createElement("span");
    text.textContent = message.text;
    bubble.appendChild(text);
    const close = document.createElement("button");
    close.type = "button";
    close.setAttribute("aria-label", "Dismiss");
    close.textContent = "✕";
    Object.assign(close.style, {
      position: "absolute", top: "-6px", right: "-6px", width: "18px", height: "18px", borderRadius: "50%",
      border: "1px solid #e5e7eb", background: "#fff", color: "#6b7280", fontSize: "10px", lineHeight: "1",
      cursor: "pointer", padding: "0",
    });
    close.onclick = () => {
      clearTimers();
      bubble.style.display = "none";
    };
    bubble.appendChild(close);
    bubble.style.display = "block";
  }

  function render() {
    clearTimers();
    root.replaceChildren();
    if (!model) {
      root.style.display = "none";
      return;
    }
    const px = SIZES[model.size] || SIZES.medium;
    Object.assign(root.style, {
      display: "",
      position: "fixed",
      bottom: `${model.bottom}px`,
      left: model.side === "left" ? `${model.sideOffset}px` : "",
      right: model.side === "right" ? `${model.sideOffset}px` : "",
      zIndex: "2147483000",
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    });

    const bubble = document.createElement("div");
    bubble.setAttribute("data-nuformly-bubble", "");
    bubble.setAttribute("aria-live", "polite");
    Object.assign(bubble.style, {
      display: "none", position: "absolute", bottom: `${px + 14}px`, [model.side]: "0", width: "max-content",
      maxWidth: "220px", padding: "10px 14px", background: "#fff", color: "#374151", border: "1px solid #e5e7eb",
      borderRadius: "12px", boxShadow: "0 6px 20px rgba(0,0,0,.12)", fontSize: "13px", lineHeight: "1.4",
    });
    root.appendChild(bubble);

    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", model.label);
    button.className = model.animation && model.animation !== "none" ? `nf-anim-${model.animation}` : "";
    Object.assign(button.style, {
      position: "relative", width: `${px}px`, height: `${px}px`, padding: "0", border: "none", cursor: "pointer",
      borderRadius: model.shape === "rounded-square" ? "16px" : "50%", background: model.background,
      boxShadow: "0 10px 30px rgba(0,0,0,.25)", display: "flex", alignItems: "center", justifyContent: "center",
      overflow: model.icon.kind === "image" ? "hidden" : "visible",
    });
    button.appendChild(iconNode(model.icon, px));
    if (model.showBadge) {
      const badge = document.createElement("span");
      Object.assign(badge.style, {
        position: "absolute", top: "2px", right: "2px", width: "12px", height: "12px", borderRadius: "50%",
        background: "#ef4444", border: "2px solid #fff",
      });
      button.appendChild(badge);
    }
    button.onclick = () => onClick();
    root.appendChild(button);

    const messages = [
      ...(model.greeting ? [{ title: model.greeting.title, text: model.greeting.message }] : []),
      ...model.teasers.map((t) => ({ text: t })),
    ];
    if (messages.length === 0 || open) return;
    let i = 0;
    timers.push(
      setTimeout(() => {
        renderBubble(bubble, messages[0]);
        if (messages.length > 1) {
          timers.push(
            setInterval(() => {
              i = (i + 1) % messages.length;
              renderBubble(bubble, messages[i]);
            }, ROTATE_MS)
          );
        }
      }, FIRST_BUBBLE_MS)
    );
  }

  function update(next) {
    model = next;
    render();
  }

  update(initialModel);

  return {
    update,
    setOpen(value) {
      open = value;
      render();
    },
    destroy() {
      clearTimers();
      root.remove();
    },
  };
}
