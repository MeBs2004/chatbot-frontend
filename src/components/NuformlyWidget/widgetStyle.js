// Pure presentation logic shared (as an identical copy) by the admin
// preview and the real widget — frontend/src/components/NuformlyWidget/
// widgetStyle.js. Keep the two files byte-identical so what the admin
// previews is exactly what visitors get. No DOM, no React.

// 24x24 Material-style glyphs, filled.
export const ICON_PATHS = {
  default:
    "M12 2l2.4 6.1L20.5 10l-6.1 2.4L12 18.5l-2.4-6.1L3.5 10l6.1-1.9L12 2zm7 13l1.1 2.9L23 19l-2.9 1.1L19 23l-1.1-2.9L15 19l2.9-1.1L19 15z",
  chat: "M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2z",
  headset:
    "M12 1c-4.97 0-9 4.03-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h3c1.66 0 3-1.34 3-3v-7c0-4.97-4.03-9-9-9z",
  bolt: "M7 2v11h3v9l7-12h-4l4-8z",
  heart:
    "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z",
  help: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z",
  robot:
    "M20 9V7c0-1.1-.9-2-2-2h-3c0-1.66-1.34-3-3-3S9 3.34 9 5H6c-1.1 0-2 .9-2 2v2c-1.66 0-3 1.34-3 3s1.34 3 3 3v4c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4c1.66 0 3-1.34 3-3s-1.34-3-3-3zM7.5 11.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5S9.83 13 9 13s-1.5-.67-1.5-1.5zM16 17H8v-2h8v2zm-1-4c-.83 0-1.5-.67-1.5-1.5S14.17 10 15 10s1.5.67 1.5 1.5S15.83 13 15 13z",
  send: "M2.01 21L23 12 2.01 3 2 10l15 2-15 2z",
  smile:
    "M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z",
  star: "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z",
};

export const LAUNCHER_SIZE_PX = { small: 48, medium: 60, large: 72 };
export const WINDOW_WIDTH_PX = { small: 320, medium: 365, large: 400 };
export const WINDOW_RADIUS_PX = { none: 0, small: 10, medium: 18, large: 28 };

export const FONT_STACKS = {
  system: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  inter: "'Inter', system-ui, sans-serif",
  poppins: "'Poppins', system-ui, sans-serif",
  nunito: "'Nunito', system-ui, sans-serif",
  "dm-sans": "'DM Sans', system-ui, sans-serif",
  merriweather: "'Merriweather', Georgia, serif",
  mono: "'JetBrains Mono', ui-monospace, Menlo, monospace",
};
const FONT_FAMILY_PARAM = {
  inter: "Inter:wght@400;500;600",
  poppins: "Poppins:wght@400;500;600",
  nunito: "Nunito:wght@400;600;700",
  "dm-sans": "DM+Sans:wght@400;500;700",
  merriweather: "Merriweather:wght@400;700",
  mono: "JetBrains+Mono:wght@400;500",
};
/** Google Fonts stylesheet URL for a font key, or null for system. */
export const fontStylesheetUrl = (font) =>
  FONT_FAMILY_PARAM[font] ? `https://fonts.googleapis.com/css2?family=${FONT_FAMILY_PARAM[font]}&display=swap` : null;

const FONT_SIZE_PX = { small: 12.5, medium: 13.5, large: 15 };

const BUBBLE_RADIUS = {
  rounded: { bot: "16px 16px 16px 4px", user: "16px 16px 4px 16px" },
  soft: { bot: "20px", user: "20px" },
  sharp: { bot: "4px", user: "4px" },
  pill: { bot: "999px", user: "999px" },
  // The Nuform Social assistant's bubbles: a small tail corner on the sender's side.
  classic: { bot: "18px 18px 18px 6px", user: "16px 16px 6px 16px" },
};

const SHADOWS = {
  none: "none",
  soft: "0 8px 24px rgba(0,0,0,.12)",
  strong: "0 24px 60px rgba(0,0,0,.28)",
};
const LAUNCHER_SHADOWS = {
  none: "none",
  soft: "0 6px 16px rgba(0,0,0,.18)",
  strong: "0 10px 30px rgba(0,0,0,.25)",
};

const hex = (v, fallback) => (typeof v === "string" && /^#([0-9A-Fa-f]{3}){1,2}$/.test(v) ? v : fallback);

// Size options. Mirrors backend SIZE_FIELDS; null in a saved config means
// "automatic", i.e. the built-in size below. Out-of-range values are clamped.
export const SIZE_RANGES = {
  "launcher.customSize": [36, 120],
  "launcher.iconSize": [12, 72],
  "launcher.labelFontSize": [11, 24],
  "launcher.bubbleMaxWidth": [140, 360],
  "launcher.bubbleFontSize": [10, 20],
  "launcher.badgeSize": [8, 28],
  "chatWindow.customWidth": [280, 560],
  "chatWindow.customHeight": [360, 800],
  "chatWindow.customRadius": [0, 48],
  "chatWindow.headerHeight": [48, 100],
  "chatWindow.headerTitleSize": [12, 24],
  "chatWindow.headerSubtitleSize": [9, 16],
  "chatWindow.avatarSize": [24, 64],
  "chatWindow.contentPadding": [8, 32],
  "chatWindow.messageGap": [4, 32],
  "chatWindow.bubbleMaxWidthPct": [50, 95],
  "chatWindow.bubblePaddingX": [8, 32],
  "chatWindow.bubblePaddingY": [4, 24],
  "chatWindow.welcomeFontSize": [11, 24],
  "chatWindow.welcomeMaxWidthPct": [50, 100],
  "chatWindow.welcomeLineHeight": [16, 44],
  "chatWindow.sectionGap": [8, 40],
  "chatWindow.messageAvatarSize": [20, 48],
  "chatWindow.lineHeight": [16, 40],
  "chatWindow.inputRadius": [8, 32],
  "chatWindow.typingDotSize": [4, 14],
  "chatWindow.suggestionFontSize": [10, 18],
  "chatWindow.suggestionHeight": [24, 64],
  "chatWindow.suggestionWidth": [80, 400],
  "chatWindow.suggestionPaddingX": [6, 32],
  "chatWindow.suggestionGap": [4, 24],
  "chatWindow.ctaHeight": [28, 64],
  "chatWindow.ctaWidth": [80, 320],
  "chatWindow.ctaFontSize": [10, 20],
  "chatWindow.ctaRadius": [0, 32],
  "chatWindow.ctaGap": [4, 24],
  "chatWindow.inputHeight": [36, 80],
  "chatWindow.sendButtonSize": [26, 56],
  "chatWindow.footerFontSize": [9, 16],
  "forms.fieldHeight": [32, 64],
  "forms.buttonHeight": [32, 64],
  "forms.fontSize": [11, 20],
  "appearance.fontSizePx": [10, 22],
};

/** A size option as a clamped number, or null when unset/automatic. */
export function sizeOf(config, path) {
  const [section, key] = path.split(".");
  const v = config?.[section]?.[key];
  const range = SIZE_RANGES[path];
  if (typeof v !== "number" || !Number.isFinite(v) || !range) return null;
  return Math.min(range[1], Math.max(range[0], v));
}

/** Relative luminance-based readable text colour for a hex background. */
export function readableOn(bg, light = "#ffffff", dark = "#111827") {
  const h = hex(bg, "#000000").replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.6 ? dark : light;
}

/** Blend two hex colours; t=0 -> a, t=1 -> b. */
export function mixHex(a, b, t) {
  const parse = (c) => {
    const h = hex(c, "#000000").replace("#", "");
    const full = h.length === 3 ? h.split("").map((x) => x + x).join("") : h;
    return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
  };
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  const to = (x, y) => Math.round(x + (y - x) * t).toString(16).padStart(2, "0");
  return `#${to(ar, br)}${to(ag, bg)}${to(ab, bb)}`;
}

const CHAT_BACKGROUND_IMAGE = (kind, dark) => {
  const dot = dark ? "rgba(255,255,255,.07)" : "rgba(0,0,0,.07)";
  if (kind === "dots") return { image: `radial-gradient(${dot} 1px, transparent 1px)`, size: "16px 16px" };
  if (kind === "grid")
    return {
      image: `linear-gradient(${dot} 1px, transparent 1px), linear-gradient(90deg, ${dot} 1px, transparent 1px)`,
      size: "22px 22px",
    };
  return { image: "none", size: "auto" };
};

/** Every computed value the chat window needs, from a saved config. */
export function resolveWindowStyle(config) {
  const w = config?.chatWindow || {};
  const a = config?.appearance || {};
  const dark = w.theme === "dark";
  const primary = hex(w.primaryColor, "#0D5537");
  const sz = (path, fallback) => sizeOf(config, path) ?? fallback;
  const width = sizeOf(config, "chatWindow.customWidth") ?? (WINDOW_WIDTH_PX[w.size] || WINDOW_WIDTH_PX.medium);
  const fontSize = sizeOf(config, "appearance.fontSizePx") ?? (FONT_SIZE_PX[a.fontSize] || FONT_SIZE_PX.medium);

  const windowBg = dark ? "#171f1b" : hex(w.backgroundColor, "#FFFFFF");
  const baseText = dark ? "#f3f4f6" : hex(w.textColor, "#111827");
  const botBubble = hex(w.botBubbleColor, "") || (dark ? "#232d27" : "#F3F4F6");
  const botText = hex(w.botTextColor, "") || (hex(w.botBubbleColor, "") ? readableOn(w.botBubbleColor) : baseText);
  const userBubble = hex(w.userBubbleColor, "") || primary;
  const userText = hex(w.userTextColor, "#FFFFFF");
  const sendBg = hex(w.sendButtonColor, "") || primary;
  const g = w.headerGradient || {};
  const flowing = w.headerAnimation === "flow";
  const headerBg = g.enabled
    ? `linear-gradient(135deg, ${hex(g.from, primary)}, ${hex(g.to, primary)}${flowing ? `, ${hex(g.from, primary)}` : ""})`
    : flowing
      ? `linear-gradient(120deg, ${primary}, ${mixHex(primary, "#ffffff", 0.35)}, ${primary})`
      : primary;
  const radii = BUBBLE_RADIUS[w.bubbleStyle] || BUBBLE_RADIUS.rounded;
  const classic = w.bubbleStyle === "classic";
  const botBorder = hex(w.botBubbleBorderColor, "");
  const welcomeBg = hex(w.welcomeBgColor, "") || botBubble;
  const welcomeBorder = hex(w.welcomeBorderColor, "");
  const footerBg = hex(w.footerBackground, "") || windowBg;
  const suggestionColors = {
    bg: hex(w.suggestionBgColor, ""),
    text: hex(w.suggestionTextColor, ""),
    border: hex(w.suggestionBorderColor, ""),
  };
  const bg = CHAT_BACKGROUND_IMAGE(w.chatBackground, dark);
  const chatBg =
    w.chatBackground === "gradient"
      ? `linear-gradient(180deg, ${windowBg}, ${dark ? "#0f1512" : "#eef7f2"})`
      : windowBg;

  return {
    dark,
    primary,
    windowBg,
    baseText,
    botBubble,
    botText,
    userBubble,
    userText,
    welcomeRadius: classic ? "18px" : radii.bot,
    userShadow: classic ? "0 4px 6px -1px rgba(0,0,0,.1), 0 2px 4px -2px rgba(0,0,0,.1)" : "none",
    botBorder: botBorder ? `1px solid ${botBorder}` : "none",
    footerBg,
    suggestionColors,
    headerSubtitleColor: hex(w.headerSubtitleColor, ""),
    avatarRadius: w.avatarShape === "rounded" ? "12px" : "50%",
    inlineStatus: w.statusStyle === "inline",
    statusDotColor: hex(w.statusDotColor, "") || (w.statusStyle === "inline" ? "#8dffb3" : "#22c55e"),
    sendRadius: w.sendButtonShape === "circle" ? "50%" : "10px",
    brandName: (w.brandName || "").trim(),
    brandUrl: (w.brandUrl || "").trim(),
    brandColor: hex(w.brandColor, "") || primary,
    sendBg,
    sendText: readableOn(sendBg),
    headerBg,
    headerBgSize: flowing ? "300% 300%" : "auto",
    headerText: hex(w.headerTextColor, "#FFFFFF"),
    botRadius: radii.bot,
    userRadius: radii.user,
    chatBg,
    chatBgImage: bg.image,
    chatBgSize: bg.size,
    border: hex(w.borderColor, "") || (dark ? "#2a352f" : "#e5e7eb"),
    divider: hex(w.dividerColor, "") || hex(w.borderColor, "") || (dark ? "#2a352f" : "#e5e7eb"),
    welcomeBg,
    welcomeBorder: welcomeBorder ? `1px solid ${welcomeBorder}` : botBorder ? `1px solid ${botBorder}` : "none",
    placeholderColor: hex(w.placeholderColor, ""),
    avatarTop: w.avatarAlign === "top",
    shadow: SHADOWS[w.shadow] ?? SHADOWS.strong,
    width,
    height: sizeOf(config, "chatWindow.customHeight") ?? Math.round(width * 1.5),
    radius: sizeOf(config, "chatWindow.customRadius") ?? (WINDOW_RADIUS_PX[w.borderRadius] ?? WINDOW_RADIUS_PX.large),
    fontFamily: FONT_STACKS[a.font] || FONT_STACKS.system,
    fontSize,
    fontUrl: fontStylesheetUrl(a.font),
    // Sizes (px unless noted). null = leave to natural layout.
    headerHeight: sz("chatWindow.headerHeight", 64),
    headerTitleSize: sz("chatWindow.headerTitleSize", 14),
    headerSubtitleSize: sz("chatWindow.headerSubtitleSize", 11),
    avatarSize: sz("chatWindow.avatarSize", 36),
    contentPadding: sz("chatWindow.contentPadding", 16),
    messageGap: sz("chatWindow.messageGap", 12),
    bubbleMaxWidthPct: sz("chatWindow.bubbleMaxWidthPct", 82),
    bubblePadX: sz("chatWindow.bubblePaddingX", 14),
    bubblePadY: sz("chatWindow.bubblePaddingY", 10),
    welcomeFontSize: sz("chatWindow.welcomeFontSize", fontSize),
    welcomeMaxWidthPct: sizeOf(config, "chatWindow.welcomeMaxWidthPct"),
    welcomeLineHeight: sizeOf(config, "chatWindow.welcomeLineHeight"),
    sectionGap: sizeOf(config, "chatWindow.sectionGap"),
    // "Rounded" avatars sit inside a faint translucent tile, like the original widget.
    avatarTile: w.avatarShape === "rounded",
    messageAvatarSize: sz("chatWindow.messageAvatarSize", 26),
    lineHeight: sizeOf(config, "chatWindow.lineHeight"),
    inputRadius: sz("chatWindow.inputRadius", 16),
    typingDot: sz("chatWindow.typingDotSize", 7),
    suggestionFontSize: sz("chatWindow.suggestionFontSize", 11),
    suggestionHeight: sz("chatWindow.suggestionHeight", 30),
    suggestionWidth: sizeOf(config, "chatWindow.suggestionWidth"),
    suggestionPadX: sz("chatWindow.suggestionPaddingX", 12),
    suggestionGap: sz("chatWindow.suggestionGap", 8),
    ctaHeight: sz("chatWindow.ctaHeight", 36),
    ctaWidth: sizeOf(config, "chatWindow.ctaWidth"),
    ctaFontSize: sz("chatWindow.ctaFontSize", 12),
    ctaRadius: sz("chatWindow.ctaRadius", 999),
    ctaGap: sz("chatWindow.ctaGap", 8),
    inputHeight: sizeOf(config, "chatWindow.inputHeight"),
    sendSize: sz("chatWindow.sendButtonSize", 34),
    footerFontSize: sz("chatWindow.footerFontSize", 10.5),
    form: {
      fieldHeight: sz("forms.fieldHeight", 38),
      buttonHeight: sz("forms.buttonHeight", 36),
      fontSize: sz("forms.fontSize", 13),
    },
  };
}

/** Every computed value the launcher needs, from a saved config. */
export function resolveLauncherStyle(config) {
  const l = config?.launcher || {};
  const w = config?.chatWindow || {};
  const color = hex(l.color, "#0D5537");
  const g = l.gradient || {};
  const background = g.enabled ? `linear-gradient(135deg, ${hex(g.from, color)}, ${hex(g.to, color)})` : color;
  const px = sizeOf(config, "launcher.customSize") ?? (LAUNCHER_SIZE_PX[l.size] || LAUNCHER_SIZE_PX.medium);
  const shape = l.shape || "circle";
  const pill = l.style === "icon-label" && (l.labelText || "").trim().length > 0;
  const radius = pill ? `${px / 2}px` : shape === "circle" ? "50%" : shape === "squircle" ? `${Math.round(px * 0.36)}px` : `${Math.round(px * 0.27)}px`;
  const logoSrc = l.icon === "logo" ? l.logoUrl || w.botAvatar || "" : "";
  const iconColor = hex(l.iconColor, "#FFFFFF");
  const glow = l.shadow === "glow" ? `0 8px 28px ${color}99, 0 0 0 1px ${color}33` : null;
  return {
    px,
    iconPx: sizeOf(config, "launcher.iconSize") ?? Math.round(px * 0.45),
    labelFontPx: sizeOf(config, "launcher.labelFontSize") ?? Math.max(13, Math.round(px * 0.24)),
    bubbleMaxWidth: sizeOf(config, "launcher.bubbleMaxWidth") ?? 220,
    bubbleFontPx: sizeOf(config, "launcher.bubbleFontSize") ?? 13,
    badgePx: sizeOf(config, "launcher.badgeSize") ?? 14,
    background: l.logoOnly ? "transparent" : background,
    logoOnly: Boolean(l.logoOnly),
    bubbleEffect: l.bubbleEffect || "none",
    bubbleOrder: l.bubbleOrder || "sequence",
    bubbleAvatar: Boolean(l.bubbleAvatar),
    bubbleAvatarSrc: w.botAvatar || "",
    bubbleTail: Boolean(l.bubbleTail),
    bubbleHold: Number(l.bubbleHoldSeconds) || 4,
    bubblePause: Number(l.bubblePauseSeconds) || 8,
    badgePulse: Boolean(l.badgePulse),
    badgeWithBubble: Boolean(l.badgeWithBubble),
    // "float-ripple" is the original widget's motion: the WHOLE launcher (bubble
    // included) floats, a filled ring pulses out from behind it, and the logo breathes.
    wholeLauncherFloat: l.animation === "float-ripple",
    color,
    radius,
    pill,
    labelText: pill ? l.labelText.trim() : "",
    iconColor,
    labelColor: readableOn(g.enabled ? hex(g.from, color) : color),
    logoSrc,
    iconKey: l.icon === "logo" && !logoSrc ? "default" : l.icon === "logo" ? "logo" : ICON_PATHS[l.icon] ? l.icon : "default",
    shadow: l.logoOnly ? "none" : glow || LAUNCHER_SHADOWS[l.shadow] || LAUNCHER_SHADOWS.strong,
    badgeColor: hex(l.badgeColor, "#EF4444"),
    animation: l.animation || "none",
    entrance: l.entrance || "none",
    hoverEffect: l.hoverEffect || "grow",
    bubbleAnimation: l.bubbleAnimation || "none",
  };
}

// One-click looks. Each only touches colours/styling fields.
export const THEME_PRESETS = [
  {
    id: "emerald",
    name: "Emerald",
    swatch: ["#0D5537", "#34d399"],
    patch: {
      launcher: { color: "#0D5537", gradient: { enabled: true, from: "#0D5537", to: "#10b981" }, iconColor: "#FFFFFF" },
      chatWindow: { theme: "light", primaryColor: "#0D5537", headerGradient: { enabled: true, from: "#0D5537", to: "#10b981" }, userBubbleColor: "", botBubbleColor: "", backgroundColor: "#FFFFFF", textColor: "#111827" },
    },
  },
  {
    id: "ocean",
    name: "Ocean",
    swatch: ["#0369a1", "#38bdf8"],
    patch: {
      launcher: { color: "#0369a1", gradient: { enabled: true, from: "#0369a1", to: "#38bdf8" }, iconColor: "#FFFFFF" },
      chatWindow: { theme: "light", primaryColor: "#0369a1", headerGradient: { enabled: true, from: "#0369a1", to: "#38bdf8" }, userBubbleColor: "", botBubbleColor: "#E0F2FE", backgroundColor: "#F8FCFF", textColor: "#0c4a6e" },
    },
  },
  {
    id: "sunset",
    name: "Sunset",
    swatch: ["#ea580c", "#f472b6"],
    patch: {
      launcher: { color: "#ea580c", gradient: { enabled: true, from: "#f97316", to: "#ec4899" }, iconColor: "#FFFFFF" },
      chatWindow: { theme: "light", primaryColor: "#ea580c", headerGradient: { enabled: true, from: "#f97316", to: "#ec4899" }, userBubbleColor: "", botBubbleColor: "#FFEDD5", backgroundColor: "#FFFBF7", textColor: "#431407" },
    },
  },
  {
    id: "violet",
    name: "Violet",
    swatch: ["#6d28d9", "#a78bfa"],
    patch: {
      launcher: { color: "#6d28d9", gradient: { enabled: true, from: "#6d28d9", to: "#a78bfa" }, iconColor: "#FFFFFF" },
      chatWindow: { theme: "light", primaryColor: "#6d28d9", headerGradient: { enabled: true, from: "#6d28d9", to: "#a78bfa" }, userBubbleColor: "", botBubbleColor: "#EDE9FE", backgroundColor: "#FDFCFF", textColor: "#2e1065" },
    },
  },
  {
    id: "rose",
    name: "Rose",
    swatch: ["#be123c", "#fb7185"],
    patch: {
      launcher: { color: "#be123c", gradient: { enabled: true, from: "#be123c", to: "#fb7185" }, iconColor: "#FFFFFF" },
      chatWindow: { theme: "light", primaryColor: "#be123c", headerGradient: { enabled: true, from: "#be123c", to: "#fb7185" }, userBubbleColor: "", botBubbleColor: "#FFE4E6", backgroundColor: "#FFFBFB", textColor: "#4c0519" },
    },
  },
  {
    id: "midnight",
    name: "Midnight",
    swatch: ["#111827", "#6366f1"],
    patch: {
      launcher: { color: "#111827", gradient: { enabled: true, from: "#1e1b4b", to: "#6366f1" }, iconColor: "#FFFFFF" },
      chatWindow: { theme: "dark", primaryColor: "#6366f1", headerGradient: { enabled: true, from: "#1e1b4b", to: "#4f46e5" }, userBubbleColor: "#6366f1", botBubbleColor: "", backgroundColor: "#0f172a", textColor: "#f3f4f6" },
    },
  },
  {
    id: "mono",
    name: "Mono",
    swatch: ["#111827", "#9ca3af"],
    patch: {
      launcher: { color: "#111827", gradient: { enabled: false, from: "#111827", to: "#374151" }, iconColor: "#FFFFFF" },
      chatWindow: { theme: "light", primaryColor: "#111827", headerGradient: { enabled: false, from: "#111827", to: "#374151" }, userBubbleColor: "", botBubbleColor: "#F3F4F6", backgroundColor: "#FFFFFF", textColor: "#111827" },
    },
  },
];


// ─────────────────────────────────────────────────────────────────
// Animations. ONE definition, used by the admin preview, the host-page
// launcher and the chat iframe, so a given option moves identically
// everywhere. `p` namespaces class + keyframe names (so the three
// consumers never collide); `scope` optionally prefixes every selector
// (the launcher scopes to its own root so it can't touch the host page).
// ─────────────────────────────────────────────────────────────────

/** Class name for an animation option ("" for none/unknown). */
export const animClass = (p, kind, name) => (name && name !== "none" ? `${p}-${kind}-${name}` : "");

/** Message entrance class; "side" slides bot messages in from the left and visitor messages from the right. */
export const messageAnimClass = (p, name, isUser) =>
  name === "side" ? `${p}-msg-side-${isUser ? "user" : "bot"}` : animClass(p, "msg", name);

export function animationCss(p, scope = "") {
  const k = (n) => `${p}-kf-${n}`;
  const sel = (rule) => (scope ? `${scope} ${rule}` : rule);
  const out = [];
  const frames = (name, body) => out.push(`@keyframes ${k(name)} { ${body} }`);
  const rule = (selector, body) => out.push(`${sel(selector)} { ${body} }`);

  // ── keyframes
  frames("float", "0%,100% { transform: translateY(0) } 50% { transform: translateY(-6px) }");
  frames("pulse", "0% { box-shadow: 0 0 0 0 rgba(0,0,0,.25) } 100% { box-shadow: 0 0 0 14px rgba(0,0,0,0) }");
  frames("glow", "0%,100% { filter: brightness(1) } 50% { filter: brightness(1.18) }");
  frames("bounce", "0%,20%,50%,80%,100% { transform: translateY(0) } 40% { transform: translateY(-14px) } 60% { transform: translateY(-7px) }");
  frames("wiggle", "0%,86%,100% { transform: rotate(0) } 90% { transform: rotate(-12deg) } 94% { transform: rotate(10deg) } 98% { transform: rotate(-6deg) }");
  frames("ripple", "0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--nf-c, #000) 55%, transparent) } 100% { box-shadow: 0 0 0 22px transparent }");
  frames("heartbeat", "0%,100% { transform: scale(1) } 14% { transform: scale(1.12) } 28% { transform: scale(1) } 42% { transform: scale(1.12) } 70% { transform: scale(1) }");
  frames("shake", "0%,70%,100% { transform: translateX(0) } 74%,82%,90% { transform: translateX(-5px) } 78%,86%,94% { transform: translateX(5px) }");
  frames("jelly", "0%,100% { transform: scale(1,1) } 25% { transform: scale(.9,1.1) } 50% { transform: scale(1.1,.9) } 75% { transform: scale(.95,1.05) }");
  frames("swing", "0%,100% { transform: rotate(0) } 20% { transform: rotate(14deg) } 40% { transform: rotate(-10deg) } 60% { transform: rotate(6deg) } 80% { transform: rotate(-3deg) }");
  frames("tada", "0%,60%,100% { transform: scale(1) rotate(0) } 10%,20% { transform: scale(.9) rotate(-4deg) } 30%,50% { transform: scale(1.1) rotate(4deg) } 40% { transform: scale(1.1) rotate(-4deg) }");
  frames("breathe", "0%,100% { transform: scale(1); opacity: 1 } 50% { transform: scale(1.07); opacity: .88 }");
  frames("spin", "to { transform: rotate(360deg) }");
  frames("flash", "0%,50%,100% { opacity: 1 } 25%,75% { opacity: .35 }");
  frames("float-big", "0%,100% { transform: translateY(0) } 25% { transform: translateY(-8px) } 50% { transform: translateY(0) } 75% { transform: translateY(8px) }");
  frames("tbounce", "0%,100% { transform: translateY(-25%); animation-timing-function: cubic-bezier(.8,0,1,1) } 50% { transform: none; animation-timing-function: cubic-bezier(0,0,.2,1) }");
  frames("badge-pulse", "0%,100% { opacity: 1 } 50% { opacity: .5 }");
  frames("pulse-ring", "0% { transform: scale(.85); opacity: .55 } 70% { transform: scale(1.35); opacity: 0 } 100% { transform: scale(1.35); opacity: 0 }");
  frames("breathe-soft", "0%,100% { transform: scale(1) } 50% { transform: scale(1.03) }");
  frames("glow-soft", "0%,100% { box-shadow: 0 0 0 rgba(6,118,71,0) } 6% { box-shadow: 0 0 22px 6px rgba(6,118,71,.45) } 14% { box-shadow: 0 0 0 rgba(6,118,71,0) }");
  frames("wobble", "0%,100% { transform: translateX(0) rotate(0) } 15% { transform: translateX(-6px) rotate(-5deg) } 30% { transform: translateX(5px) rotate(3deg) } 45% { transform: translateX(-4px) rotate(-3deg) } 60% { transform: translateX(3px) rotate(2deg) } 75% { transform: translateX(-2px) rotate(-1deg) }");

  frames("in-pop", "0% { opacity: 0; transform: scale(.3) } 70% { transform: scale(1.12) } 100% { opacity: 1; transform: scale(1) }");
  frames("in-slide-up", "0% { opacity: 0; transform: translateY(30px) } 100% { opacity: 1; transform: translateY(0) }");
  frames("in-fade", "0% { opacity: 0 } 100% { opacity: 1 }");
  frames("in-bounce", "0% { opacity: 0; transform: translateY(-60px) } 55% { opacity: 1; transform: translateY(10px) } 75% { transform: translateY(-5px) } 100% { transform: translateY(0) }");
  frames("in-zoom", "0% { opacity: 0; transform: scale(2.2) } 100% { opacity: 1; transform: scale(1) }");
  frames("in-flip", "0% { opacity: 0; transform: perspective(400px) rotateY(90deg) } 100% { opacity: 1; transform: perspective(400px) rotateY(0) }");
  frames("in-slide-left", "0% { opacity: 0; transform: translateX(-50px) } 100% { opacity: 1; transform: translateX(0) }");
  frames("in-slide-right", "0% { opacity: 0; transform: translateX(50px) } 100% { opacity: 1; transform: translateX(0) }");
  frames("in-drop", "0% { opacity: 0; transform: translateY(-90px) } 60% { opacity: 1; transform: translateY(8px) } 100% { transform: translateY(0) }");
  frames("in-rotate", "0% { opacity: 0; transform: rotate(-200deg) scale(.4) } 100% { opacity: 1; transform: rotate(0) scale(1) }");
  frames("in-blur", "0% { opacity: 0; filter: blur(14px); transform: scale(.9) } 100% { opacity: 1; filter: blur(0); transform: scale(1) }");

  frames("win-scale", "0% { opacity: 0; transform: scale(.92) } 100% { opacity: 1; transform: scale(1) }");
  frames("win-bounce", "0% { opacity: 0; transform: translateY(30px) scale(.85) } 60% { opacity: 1; transform: translateY(-6px) scale(1.02) } 100% { opacity: 1; transform: none }");
  frames("win-zoom", "0% { opacity: 0; transform: scale(.4) } 100% { opacity: 1; transform: scale(1) }");
  frames("win-flip", "0% { opacity: 0; transform: perspective(900px) rotateX(-70deg) } 100% { opacity: 1; transform: perspective(900px) rotateX(0) }");
  frames("win-drop", "0% { opacity: 0; transform: translateY(-60px) } 70% { opacity: 1; transform: translateY(6px) } 100% { transform: translateY(0) }");
  frames("win-rotate", "0% { opacity: 0; transform: rotate(-8deg) scale(.85) } 100% { opacity: 1; transform: rotate(0) scale(1) }");
  frames("win-slide-down", "0% { opacity: 0; transform: translateY(-30px) } 100% { opacity: 1; transform: translateY(0) }");
  frames("win-slide-left", "0% { opacity: 0; transform: translateX(-40px) } 100% { opacity: 1; transform: translateX(0) }");
  frames("win-slide-right", "0% { opacity: 0; transform: translateX(40px) } 100% { opacity: 1; transform: translateX(0) }");
  frames("win-flip-y", "0% { opacity: 0; transform: perspective(900px) rotateY(70deg) } 100% { opacity: 1; transform: perspective(900px) rotateY(0) }");
  frames("win-swing", "0% { opacity: 0; transform: rotate(-20deg) } 40% { opacity: 1; transform: rotate(10deg) } 70% { transform: rotate(-5deg) } 100% { transform: rotate(0) }");
  frames("win-blur", "0% { opacity: 0; filter: blur(14px); transform: scale(.96) } 100% { opacity: 1; filter: blur(0); transform: scale(1) }");
  frames("win-elastic", "0% { opacity: 0; transform: scale(.3) } 40% { opacity: 1; transform: scale(1.1) } 60% { transform: scale(.95) } 80% { transform: scale(1.03) } 100% { transform: scale(1) }");

  frames("msg-slide", "0% { opacity: 0; transform: translateY(10px) } 100% { opacity: 1; transform: translateY(0) }");
  frames("msg-pop", "0% { opacity: 0; transform: scale(.85) } 70% { transform: scale(1.03) } 100% { opacity: 1; transform: scale(1) }");
  frames("msg-bounce", "0% { opacity: 0; transform: translateY(14px) } 60% { opacity: 1; transform: translateY(-5px) } 100% { transform: translateY(0) }");
  frames("msg-zoom", "0% { opacity: 0; transform: scale(.4) } 100% { opacity: 1; transform: scale(1) }");
  frames("msg-flip", "0% { opacity: 0; transform: perspective(300px) rotateX(-70deg) } 100% { opacity: 1; transform: perspective(300px) rotateX(0) }");
  frames("msg-side-bot", "0% { opacity: 0; transform: translateX(-24px) } 100% { opacity: 1; transform: translateX(0) }");
  frames("msg-side-user", "0% { opacity: 0; transform: translateX(24px) } 100% { opacity: 1; transform: translateX(0) }");
  frames("msg-blur", "0% { opacity: 0; filter: blur(8px) } 100% { opacity: 1; filter: blur(0) }");

  frames("bubble-slide", "0% { opacity: 0; transform: translateY(10px) scale(.96) } 100% { opacity: 1; transform: translateY(0) scale(1) }");
  frames("bubble-pop", "0% { opacity: 0; transform: scale(.5) } 70% { transform: scale(1.06) } 100% { opacity: 1; transform: scale(1) }");
  frames("bubble-bounce", "0% { opacity: 0; transform: translateY(20px) } 55% { opacity: 1; transform: translateY(-8px) } 100% { transform: translateY(0) }");
  frames("bubble-shake", "0% { opacity: 0 } 15% { opacity: 1 } 25%,45%,65% { transform: translateX(-4px) } 35%,55%,75% { transform: translateX(4px) } 100% { transform: translateX(0) }");

  frames("sugg-slide", "0% { opacity: 0; transform: translateX(-12px) } 100% { opacity: 1; transform: translateX(0) }");
  frames("sugg-pop", "0% { opacity: 0; transform: scale(.7) } 70% { transform: scale(1.06) } 100% { opacity: 1; transform: scale(1) }");
  frames("sugg-bounce", "0% { opacity: 0; transform: translateY(12px) } 60% { opacity: 1; transform: translateY(-4px) } 100% { transform: translateY(0) }");

  frames("tdot", "0%,80%,100% { transform: translateY(0); opacity: .5 } 40% { transform: translateY(-5px); opacity: 1 }");
  frames("twave", "0%,60%,100% { transform: translateY(0) } 30% { transform: translateY(-9px) }");
  frames("tpulse", "0%,80%,100% { transform: scale(.6); opacity: .4 } 40% { transform: scale(1.2); opacity: 1 }");
  frames("tbars", "0%,100% { transform: scaleY(.4) } 50% { transform: scaleY(1.5) }");

  frames("shimmer", "0% { transform: translateX(-120%) skewX(-20deg) } 60%,100% { transform: translateX(260%) skewX(-20deg) }");
  frames("flow", "0%,100% { background-position: 0% 50% } 50% { background-position: 100% 50% }");
  frames("avatar-pulse", "0% { box-shadow: 0 0 0 0 rgba(255,255,255,.55) } 100% { box-shadow: 0 0 0 10px rgba(255,255,255,0) }");
  frames("avatar-float", "0%,100% { transform: translateY(0) } 50% { transform: translateY(-3px) }");
  frames("avatar-wiggle", "0%,80%,100% { transform: rotate(0) } 85% { transform: rotate(-10deg) } 90% { transform: rotate(8deg) } 95% { transform: rotate(-4deg) }");
  frames("send-pulse", "0%,100% { transform: scale(1) } 50% { transform: scale(1.18) }");
  frames("status", "0% { box-shadow: 0 0 0 0 rgba(34,197,94,.6) } 100% { box-shadow: 0 0 0 7px rgba(34,197,94,0) }");

  // ── idle loops (launcher)
  const loops = {
    float: "4.5s ease-in-out infinite", pulse: "2.6s ease-out infinite", glow: "3s ease-in-out infinite",
    bounce: "2.4s ease infinite", wiggle: "3.5s ease-in-out infinite", ripple: "2s ease-out infinite",
    heartbeat: "2.2s ease-in-out infinite", shake: "3.2s ease-in-out infinite", jelly: "2.6s ease-in-out infinite",
    swing: "3s ease-in-out infinite", tada: "3.2s ease-in-out infinite", breathe: "3.4s ease-in-out infinite",
    spin: "6s linear infinite", flash: "2.4s ease-in-out infinite", wobble: "3.4s ease-in-out infinite",
  };
  for (const [name, timing] of Object.entries(loops)) rule(`.${p}-anim-${name}`, `animation: ${k(name)} ${timing}`);
  // The Nuform launcher: a gentle up-and-down float with a soft ring pulsing out of it.
  rule(`.${p}-anim-float-ripple`, `animation: ${k("float-big")} 4.5s ease-in-out infinite, ${k("ripple")} 2.6s ease-out infinite`);
  // Original-widget launcher: the wrapper floats, a ring pulses behind, the logo breathes.
  rule(`.${p}-wrap-float`, `animation: ${k("float-big")} 4.5s ease-in-out infinite`);
  rule(`.${p}-ring`, `position: absolute; inset: 0; border-radius: 50%; background: var(--nf-c, #067647); pointer-events: none; animation: ${k("pulse-ring")} 2.6s ease-out infinite`);
  rule(`.${p}-breathe`, `width: 100%; height: 100%; border-radius: 50%; display: flex; align-items: center; justify-content: center; animation: ${k("breathe-soft")} 5.5s ease-in-out infinite, ${k("glow-soft")} 8s ease-in-out infinite`);
  rule(`.${p}-badge-pulse`, `animation: ${k("badge-pulse")} 2s ease-in-out infinite`);
  // Typing dots inside the launcher's greeting bubble.
  rule(`.${p}-bdots`, "display: flex; align-items: center; gap: 4px; height: 11px");
  rule(`.${p}-bdots > i`, `display: block; width: 4px; height: 4px; border-radius: 50%; background: #9ca3af; animation: ${k("tbounce")} 1s infinite`);
  rule(`.${p}-bdots > i:nth-child(2)`, "animation-delay: .15s");
  rule(`.${p}-bdots > i:nth-child(3)`, "animation-delay: .3s");

  // ── entrances (launcher)
  const entrances = {
    pop: ".55s cubic-bezier(.34,1.56,.64,1) both", "slide-up": ".5s cubic-bezier(.16,1,.3,1) both", fade: ".6s ease both",
    bounce: ".8s ease both", zoom: ".5s cubic-bezier(.16,1,.3,1) both", flip: ".7s ease both",
    "slide-left": ".5s cubic-bezier(.16,1,.3,1) both", "slide-right": ".5s cubic-bezier(.16,1,.3,1) both",
    drop: ".8s ease both", rotate: ".7s cubic-bezier(.16,1,.3,1) both", blur: ".7s ease both",
  };
  for (const [name, timing] of Object.entries(entrances)) rule(`.${p}-in-${name}`, `animation: ${k(`in-${name}`)} ${timing}`);

  // ── hover effects (launcher)
  rule(`.${p}-hover`, "transition: transform .25s cubic-bezier(.34,1.56,.64,1), filter .25s, box-shadow .25s");
  rule(`.${p}-hover-grow:hover`, "transform: scale(1.08)");
  rule(`.${p}-hover-lift:hover`, "transform: translateY(-4px); filter: brightness(1.06)");
  rule(`.${p}-hover-spin:hover .${p}-icon`, "transform: rotate(360deg); transition: transform .6s ease");
  rule(`.${p}-hover-shake:hover`, `animation: ${k("shake")} .6s ease`);
  rule(`.${p}-hover-tilt:hover`, "transform: rotate(-10deg) scale(1.06)");
  rule(`.${p}-hover-glow:hover`, "filter: brightness(1.15) drop-shadow(0 0 12px var(--nf-c, #10b981))");
  rule(`.${p}-hover-bounce:hover`, `animation: ${k("bounce")} .8s ease`);
  rule(`.${p}-hover-pulse:hover`, `animation: ${k("heartbeat")} .9s ease`);
  rule(`.${p}-hover-grow-rotate:hover`, "transform: scale(1.08) rotate(2deg)");

  // ── window open
  rule(`.${p}-win-slide-up`, `animation: ${k("in-slide-up")} .35s ease both`);
  rule(`.${p}-win-fade`, `animation: ${k("in-fade")} .35s ease both`);
  const winTiming = {
    scale: ".3s cubic-bezier(.16,1,.3,1) both", bounce: ".5s cubic-bezier(.34,1.56,.64,1) both", zoom: ".35s cubic-bezier(.16,1,.3,1) both",
    flip: ".55s ease both", drop: ".6s ease both", rotate: ".45s cubic-bezier(.16,1,.3,1) both", elastic: ".7s ease both",
    "slide-down": ".35s ease both", "slide-left": ".4s cubic-bezier(.16,1,.3,1) both", "slide-right": ".4s cubic-bezier(.16,1,.3,1) both",
    "flip-y": ".55s ease both", swing: ".8s ease both", blur: ".5s ease both",
  };
  for (const [name, timing] of Object.entries(winTiming)) rule(`.${p}-win-${name}`, `animation: ${k(`win-${name}`)} ${timing}; transform-origin: bottom right`);

  // ── messages
  rule(`.${p}-msg-fade`, `animation: ${k("in-fade")} .35s ease both`);
  const msgTiming = {
    slide: ".4s cubic-bezier(.16,1,.3,1) both", pop: ".4s cubic-bezier(.34,1.56,.64,1) both", bounce: ".5s ease both",
    zoom: ".35s cubic-bezier(.16,1,.3,1) both", flip: ".5s ease both", "side-bot": ".4s cubic-bezier(.16,1,.3,1) both",
    "side-user": ".4s cubic-bezier(.16,1,.3,1) both", blur: ".5s ease both",
  };
  for (const [name, timing] of Object.entries(msgTiming)) rule(`.${p}-msg-${name}`, `animation: ${k(`msg-${name}`)} ${timing}`);

  // ── greeting bubble + suggestion chips
  rule(`.${p}-bubble-fade`, `animation: ${k("in-fade")} .4s ease both`);
  for (const n of ["slide", "pop", "bounce", "shake"]) rule(`.${p}-bubble-${n}`, `animation: ${k(`bubble-${n}`)} .5s cubic-bezier(.16,1,.3,1) both`);
  rule(`.${p}-sugg-fade`, `animation: ${k("in-fade")} .4s ease both`);
  for (const n of ["slide", "pop", "bounce"]) rule(`.${p}-sugg-${n}`, `animation: ${k(`sugg-${n}`)} .45s cubic-bezier(.16,1,.3,1) both`);

  // ── typing indicator: a flex row of three <i> elements
  rule(`.${p}-typing`, "display: inline-flex; align-items: center; gap: 5px");
  rule(`.${p}-typing > i`, "display: block; width: var(--nf-dot-size, 7px); height: var(--nf-dot-size, 7px); border-radius: 50%; background: var(--nf-dot, currentColor)");
  for (const [style, kf, time] of [["dots", "tdot", 1.2], ["wave", "twave", 1.1], ["pulse", "tpulse", 1.2]]) {
    rule(`.${p}-typing-${style} > i`, `animation: ${k(kf)} ${time}s ease-in-out infinite`);
  }
  // Three coloured dots bouncing, as in the Nuform Social assistant.
  rule(`.${p}-typing-colorful`, "gap: 8px; box-shadow: 0 1px 2px rgba(0,0,0,.05)");
  rule(`.${p}-typing-colorful > i`, `animation: ${k("tbounce")} 1s infinite`);
  rule(`.${p}-typing-colorful > i:nth-child(1)`, "background: #00c853");
  rule(`.${p}-typing-colorful > i:nth-child(2)`, "background: #00b0ff");
  rule(`.${p}-typing-colorful > i:nth-child(3)`, "background: #ff9100");
  rule(`.${p}-typing-bars > i`, `width: calc(var(--nf-dot-size, 7px) * .45); height: calc(var(--nf-dot-size, 7px) * 1.7); border-radius: 2px; animation: ${k("tbars")} 1s ease-in-out infinite`);
  rule(`.${p}-typing > i:nth-child(2)`, "animation-delay: .15s");
  rule(`.${p}-typing > i:nth-child(3)`, "animation-delay: .3s");

  // ── header, avatar, send button
  rule(`.${p}-head-shimmer`, "position: relative; overflow: hidden");
  rule(`.${p}-head-shimmer::after`, `content: ""; position: absolute; inset: 0; width: 35%; background: linear-gradient(90deg, transparent, rgba(255,255,255,.35), transparent); animation: ${k("shimmer")} 3.2s ease-in-out infinite; pointer-events: none`);
  rule(`.${p}-head-flow`, `animation: ${k("flow")} 6s ease infinite`);
  rule(`.${p}-avatar-pulse`, `border-radius: 50%; animation: ${k("avatar-pulse")} 1.8s ease-out infinite`);
  rule(`.${p}-avatar-float`, `animation: ${k("avatar-float")} 3s ease-in-out infinite`);
  rule(`.${p}-avatar-wiggle`, `animation: ${k("avatar-wiggle")} 3.5s ease-in-out infinite`);
  rule(`.${p}-send svg`, "transition: transform .3s cubic-bezier(.34,1.56,.64,1)");
  rule(`.${p}-send-fly:hover svg`, "transform: translate(3px,-3px) rotate(-8deg)");
  rule(`.${p}-send-pulse:hover`, `animation: ${k("send-pulse")} .7s ease infinite`);
  rule(`.${p}-send-spin:hover svg`, "transform: rotate(360deg)");
  rule(`.${p}-status`, `animation: ${k("status")} 2s ease-out infinite`);

  out.push(
    `@media (prefers-reduced-motion: reduce) { ${sel(`[class*="${p}-anim-"]`)}, ${sel(`[class*="${p}-in-"]`)}, ${sel(`[class*="${p}-win-"]`)}, ${sel(`[class*="${p}-msg-"]`)}, ${sel(`[class*="${p}-bubble-"]`)}, ${sel(`[class*="${p}-sugg-"]`)}, ${sel(`[class*="${p}-typing"] > i`)}, ${sel(`[class*="${p}-head-"]`)}, ${sel(`[class*="${p}-avatar-"]`)}, ${sel(`.${p}-wrap-float`)}, ${sel(`.${p}-ring`)}, ${sel(`.${p}-breathe`)}, ${sel(`.${p}-status`)} { animation: none !important } }`
  );
  return out.join("\n");
}

/** A built-in label/message: the admin's wording if they set one, else the built-in text. */
export function uiText(config, key, fallback) {
  const v = config?.chatWindow?.[key];
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

/** Whether an element is switched on (every show* option defaults to on). */
export const shown = (config, key) => config?.chatWindow?.[key] !== false;

/** Welcome text for the visitor's language (Hindi falls back to the English text). */
export function welcomeFor(config, language) {
  const w = config?.chatWindow || {};
  return language === "Hindi" && (w.welcomeMessageHindi || "").trim() ? w.welcomeMessageHindi : w.welcomeMessage;
}

/** Short two-note notification chime (Web Audio). No-op where unsupported. */
export function playChime() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return false;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [880, 1175].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = now + i * 0.11;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.15, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.18);
    });
    setTimeout(() => ctx.close(), 500);
    return true;
  } catch {
    return false;
  }
}
