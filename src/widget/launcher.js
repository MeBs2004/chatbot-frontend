// The config-driven launcher button + greeting/teaser bubble, drawn on
// the customer's page. DOM APIs only: every piece of text from the
// chatbot's config goes through textContent, never innerHTML.

import { ICON_PATHS, animationCss, animClass } from "../components/NuformlyWidget/widgetStyle.js";

const SIZES = { small: 48, medium: 60, large: 72 };
const FIRST_BUBBLE_MS = 2000;
const ROTATE_MS = 6000;

const SVG_NS = "http://www.w3.org/2000/svg";
// All motion (idle loops, entrances, hover effects, bubble animations)
// comes from the one shared definition, scoped to the launcher's own root
// so nothing it declares can reach the customer's page.
const SCOPE = "[data-nuformly-launcher]";
const CSS = animationCss("nf", SCOPE);

function ensureStyle() {
  if (document.getElementById("nuformly-launcher-style")) return;
  const style = document.createElement("style");
  style.id = "nuformly-launcher-style";
  style.textContent = CSS;
  document.head.appendChild(style);
}

function iconNode(icon, iconPx, fit = "cover") {
  if (icon.kind === "image") {
    const img = document.createElement("img");
    img.setAttribute("src", icon.src);
    img.setAttribute("alt", "");
    img.setAttribute("class", "nf-icon");
    Object.assign(img.style, { width: "100%", height: "100%", objectFit: fit, borderRadius: "inherit" });
    return img;
  }
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", String(iconPx));
  svg.setAttribute("height", String(iconPx));
  svg.setAttribute("fill", icon.color || "#ffffff");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("class", "nf-icon");
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
  let badgeEl = null; // so the greeting bubble can show/hide the badge with it

  const clearTimers = () => {
    timers.forEach((t) => {
      clearTimeout(t);
      clearInterval(t);
    });
    timers = [];
  };

  function renderBubble(bubble, message) {
    bubble.replaceChildren();
    // Restart the bubble's entrance animation for every message.
    const cls = bubble.className;
    bubble.className = "";
    void bubble.offsetWidth;
    bubble.className = cls;
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
      border: `1px solid ${model.bubbleBorder || "#e5e7eb"}`, background: model.bubbleBg || "#fff", color: "#6b7280", fontSize: "10px", lineHeight: "1",
      cursor: "pointer", padding: "0",
    });
    close.onclick = () => {
      clearTimers();
      bubble.style.display = "none";
    };
    bubble.appendChild(close);
    bubble.style.display = "block";
  }

  // The "typing" bubble: wait, show a typing indicator, type the message
  // out, hold it, fade it, pause, then do it again with the next one.
  function startTypingCycle(bubble, messages) {
    const later = (ms, fn) => timers.push(setTimeout(fn, ms));
    let last = -1;
    let seq = 0;
    const pick = () => {
      if (messages.length === 1) return 0;
      if (model.bubbleOrder === "random") {
        let n;
        do n = Math.floor(Math.random() * messages.length);
        while (n === last);
        return n;
      }
      return seq++ % messages.length;
    };

    // Bubble contents: [avatar] [dots | text] [dismiss] + tail
    bubble.replaceChildren();
    Object.assign(bubble.style, { alignItems: "flex-start", gap: "6px" });
    if (model.bubbleAvatar && model.bubbleAvatarSrc) {
      const avatar = document.createElement("img");
      avatar.setAttribute("src", model.bubbleAvatarSrc);
      avatar.setAttribute("alt", "");
      Object.assign(avatar.style, {
        width: "16px", height: "16px", borderRadius: "50%", objectFit: "cover", marginTop: "2px", flexShrink: "0",
        ...(model.bubbleAvatarRing ? { border: `1px solid ${model.bubbleBorder}`, boxSizing: "border-box" } : {}),
      });
      bubble.appendChild(avatar);
    }
    const dots = document.createElement("div");
    dots.className = "nf-bdots";
    dots.style.marginTop = "3px";
    dots.style.setProperty("--nf-bdot", model.bubbleDot || "#9ca3af");
    for (let n = 0; n < 3; n += 1) dots.appendChild(document.createElement("i"));
    const text = document.createElement("p");
    Object.assign(text.style, {
      margin: "0", fontWeight: "500", lineHeight: "1.35", paddingTop: "1px",
      ...(model.bubbleLetterSpacing ? { letterSpacing: `${model.bubbleLetterSpacing}px` } : {}),
    });
    bubble.append(dots, text);
    const close = document.createElement("button");
    close.type = "button";
    close.setAttribute("aria-label", "Dismiss");
    close.textContent = "✕";
    Object.assign(close.style, {
      position: "absolute", top: "-5px", right: "-5px", width: "14px", height: "14px", borderRadius: "50%",
      border: `1px solid ${model.bubbleBorder || "#e5e7eb"}`, background: model.bubbleBg || "#fff", color: "#9ca3af", fontSize: "7px", lineHeight: "1", cursor: "pointer", padding: "0",
    });
    bubble.appendChild(close);
    if (model.bubbleTail) {
      const tail = document.createElement("div");
      Object.assign(tail.style, {
        position: "absolute", bottom: "-5px", [model.side]: "20px", width: "10px", height: "10px", background: model.bubbleBg || "#fff",
        borderBottom: `1px solid ${model.bubbleBorder || "#e5e7eb"}`, borderRight: `1px solid ${model.bubbleBorder || "#e5e7eb"}`, transform: "rotate(45deg)",
      });
      bubble.appendChild(tail);
    }

    const setBadge = (visible) => {
      if (badgeEl && model.badgeWithBubble) badgeEl.style.display = visible ? "" : "none";
    };
    const show = () => {
      setBadge(true);
      bubble.style.transition = "";
      bubble.style.opacity = "1";
      bubble.style.display = "flex";
      // restart the entrance animation
      const cls = bubble.className;
      bubble.className = "";
      void bubble.offsetWidth;
      bubble.className = cls;
    };
    const hide = (after) => {
      bubble.style.transition = "opacity .3s ease";
      bubble.style.opacity = "0";
      later(300, () => {
        bubble.style.display = "none";
        setBadge(false);
        after();
      });
    };
    const pause = () => later(model.bubblePause * 1000, cycle);

    function cycle() {
      const index = pick();
      last = index;
      const message = messages[index];
      const full = message.title ? `${message.title} ${message.text}` : message.text;
      dots.style.display = "flex";
      text.style.display = "none";
      text.textContent = "";
      show();
      close.style.display = "none";
      later(700, () => {
        dots.style.display = "none";
        text.style.display = "block";
        const type = (n) => {
          text.textContent = full.slice(0, n);
          if (n >= full.length) {
            close.style.display = "block";
            close.onclick = () => {
              clearTimers();
              hide(pause);
            };
            later(model.bubbleHold * 1000, () => hide(pause));
            return;
          }
          later(35 + Math.random() * 10, () => type(n + 1));
        };
        type(0);
      });
    }
    later(FIRST_BUBBLE_MS, cycle);
  }

  function render() {
    clearTimers();
    root.replaceChildren();
    if (!model) {
      root.style.display = "none";
      return;
    }
    const px = model.px || SIZES[model.size] || SIZES.medium;
    const iconPx = model.iconPx || Math.round(px * 0.45);
    // The original widget's motion: the whole launcher floats, a ring pulses behind it.
    root.className = model.wholeLauncherFloat ? "nf-wrap-float" : "";
    badgeEl = null;
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
    bubble.className = animClass("nf", "bubble", model.bubbleAnimation);
    Object.assign(bubble.style, {
      display: "none", position: "absolute", bottom: `${px + (model.bubbleOffset ?? (model.bubbleEffect === "typing" ? 17 : 14))}px`, [model.side]: "0", width: "max-content",
      maxWidth: `min(${model.bubbleMaxWidth || 220}px, calc(100vw - 90px))`, padding: model.bubbleEffect === "typing" ? "7px 12px 7px 8px" : "10px 14px",
      minWidth: model.bubbleEffect === "typing" ? "150px" : "", background: model.bubbleBg || "#fff", color: model.bubbleText || "#374151",
      border: `1px solid ${model.bubbleBorder || "#e5e7eb"}`,
      borderRadius: "12px", boxShadow: "0 6px 20px rgba(0,0,0,.12)", fontSize: `${model.bubbleFontPx || 13}px`, lineHeight: "1.4",
    });
    root.appendChild(bubble);

    if (model.wholeLauncherFloat && !model.luxe) {
      const ring = document.createElement("span");
      ring.className = "nf-ring";
      ring.style.setProperty("--nf-c", model.color || "#067647");
      ring.setAttribute("aria-hidden", "true");
      root.appendChild(ring);
    }

    if (model.luxe) {
      // A soft halo pulsing out of the launcher, and a few sparkles twinkling around it.
      const halo = document.createElement("span");
      halo.className = "nf-halo";
      halo.setAttribute("aria-hidden", "true");
      halo.style.setProperty("--nf-g", model.effectColor || "#d4af37");
      root.appendChild(halo);
      const sparkles = document.createElement("div");
      sparkles.className = "nf-sparkles";
      sparkles.setAttribute("aria-hidden", "true");
      sparkles.style.setProperty("--nf-g", model.effectColor || "#d4af37");
      sparkles.style.setProperty("--nf-s", model.sparkleColor || "#e7c873");
      const count = 5;
      for (let n = 0; n < count; n += 1) {
        const angle = (n / count) * Math.PI * 2 + Math.random() * 0.8;
        const radius = 34 + Math.random() * 16;
        const s = document.createElement("span");
        s.className = "nf-sparkle";
        s.textContent = "✦";
        Object.assign(s.style, { top: `${40 + Math.sin(angle) * radius}px`, left: `${40 + Math.cos(angle) * radius}px` });
        s.style.setProperty("--dur", `${3.2 + Math.random() * 2.2}s`);
        s.style.setProperty("--delay", `${Math.random() * 4}s`);
        sparkles.appendChild(s);
      }
      root.appendChild(sparkles);
    }

    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", model.label);
    const classes = ["nf-hover", animClass("nf", "hover", model.hoverEffect || "grow")];
    // float-ripple moves the wrapper (above), not the button itself.
    classes.push(model.wholeLauncherFloat ? "" : animClass("nf", "anim", model.animation), animClass("nf", "in", model.entrance));
    button.className = classes.filter(Boolean).join(" ");
    button.style.setProperty("--nf-c", model.color || "#000000");
    const isImage = model.icon.kind === "image";
    const pill = Boolean(model.pill && model.labelText);
    Object.assign(button.style, {
      position: "relative", height: `${px}px`, padding: pill ? `0 ${Math.round(px * 0.4)}px 0 ${Math.round(px * 0.3)}px` : "0",
      border: "none", cursor: "pointer", gap: "10px",
      borderRadius: model.radius || (model.shape === "rounded-square" ? "16px" : "50%"), background: model.background,
      boxShadow: model.shadow || "0 10px 30px rgba(0,0,0,.25)", display: "flex", alignItems: "center", justifyContent: "center",
      overflow: isImage && !model.logoOnly ? "hidden" : "visible",
    });
    if (!pill) button.style.width = `${px}px`;
    if (pill && isImage) {
      // A logo inside a pill is a round chip, not the whole button.
      const chip = document.createElement("span");
      Object.assign(chip.style, {
        width: `${Math.round(px * 0.7)}px`, height: `${Math.round(px * 0.7)}px`, borderRadius: "50%", overflow: "hidden", display: "block",
      });
      chip.appendChild(iconNode(model.icon, iconPx));
      button.appendChild(chip);
      button.style.overflow = "visible";
    } else {
      const glyph = iconNode({ ...model.icon, color: model.iconColor }, iconPx, model.logoOnly && !model.luxe ? "contain" : "cover");
      if (model.luxe) {
        // The logo fills the circle (zoomed by logoScale), breathes, glows now and then, and catches a shimmer.
        const inner = document.createElement("div");
        inner.className = "nf-luxe-logo";
        inner.style.setProperty("--nf-g", model.effectColor || "#d4af37");
        if (model.icon.kind === "image") {
          const scale = `${model.logoScale || 100}%`;
          Object.assign(glyph.style, { width: scale, height: scale, minWidth: scale, minHeight: scale, flexShrink: "0", borderRadius: "50%" });
        }
        const shine = document.createElement("span");
        shine.className = "nf-shimmer";
        shine.setAttribute("aria-hidden", "true");
        inner.append(glyph, shine);
        button.appendChild(inner);
      } else if (model.wholeLauncherFloat) {
        // The logo gently breathes (and glows now and then) inside the button.
        const inner = document.createElement("div");
        inner.className = "nf-breathe";
        inner.appendChild(glyph);
        button.appendChild(inner);
      } else {
        button.appendChild(glyph);
      }
    }
    if (pill) {
      const label = document.createElement("span");
      label.textContent = model.labelText;
      Object.assign(label.style, {
        color: model.labelColor || "#ffffff", fontSize: `${model.labelFontPx || Math.max(13, Math.round(px * 0.24))}px`, fontWeight: "600", whiteSpace: "nowrap",
      });
      button.appendChild(label);
    }
    if (model.showBadge) {
      const badge = document.createElement("span");
      if (model.badgePulse) badge.className = "nf-badge-pulse";
      Object.assign(badge.style, {
        position: "absolute", top: model.logoOnly ? "0" : "2px", right: model.logoOnly ? "0" : "2px", width: `${model.badgePx || 12}px`, height: `${model.badgePx || 12}px`, borderRadius: "50%",
        background: model.badgeColor || "#ef4444", border: model.logoOnly ? "1px solid #fff" : "2px solid #fff", boxSizing: "border-box",
      });
      button.appendChild(badge);
      badgeEl = badge;
      // Original behaviour: the dot only shows while the greeting bubble is up.
      if (model.badgeWithBubble && model.bubbleEffect === "typing") badge.style.display = "none";
    }
    button.onclick = () => onClick();
    root.appendChild(button);

    const messages = [
      ...(model.greeting ? [{ title: model.greeting.title, text: model.greeting.message }] : []),
      ...model.teasers.map((t) => ({ text: t })),
    ];
    if (messages.length === 0 || open) return;
    if (model.bubbleEffect === "typing") {
      startTypingCycle(bubble, messages);
      return;
    }
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
