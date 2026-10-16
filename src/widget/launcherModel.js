// Pure launcher logic for widget.js — no DOM, so it's unit-testable.
// Everything visible comes from the chatbot's saved config; nothing
// here knows about any particular company.

const DEFAULT_OFFSET = 20;

function attrNumber(script, name) {
  const raw = script.getAttribute(name);
  const n = Number(raw);
  return raw !== null && raw !== "" && Number.isFinite(n) ? n : DEFAULT_OFFSET;
}

export function readAttributes(script) {
  const position = script.getAttribute("data-position");
  return {
    chatbotId: script.getAttribute("data-chatbot-id") || null,
    companyId: script.getAttribute("data-company-id") || null,
    position: position === "left" || position === "right" ? position : null,
    bottom: attrNumber(script, "data-bottom"),
    side: attrNumber(script, "data-side"),
    apiBase: script.getAttribute("data-api-base") || null,
  };
}

/** "dynamic" = new config-driven widget, "legacy" = old company-only snippet. */
export function pickMode(attrs) {
  if (attrs.chatbotId) return "dynamic";
  if (attrs.companyId) return "legacy";
  return "none";
}

export function buildLauncherModel({ config, chatbot, attrs, isMobile }) {
  const launcher = config.launcher || {};
  const chatWindow = config.chatWindow || {};
  const behavior = config.behavior || {};

  if (!launcher.enabled || (isMobile && !launcher.showOnMobile)) return null;

  const gradient = launcher.gradient || {};
  const icon =
    launcher.icon === "logo" && chatWindow.botAvatar
      ? { kind: "image", src: chatWindow.botAvatar }
      : { kind: launcher.icon === "chat" ? "chat" : "default" };

  return {
    side: attrs.position || (launcher.position === "bottom-left" ? "left" : "right"),
    bottom: attrs.bottom,
    sideOffset: attrs.side,
    shape: launcher.shape,
    size: launcher.size,
    animation: launcher.animation,
    background: gradient.enabled ? `linear-gradient(135deg, ${gradient.from}, ${gradient.to})` : launcher.color,
    icon,
    label: `Open ${chatWindow.botName || chatbot.name}`,
    greeting: launcher.showGreeting ? { title: launcher.greetingTitle, message: launcher.greetingMessage } : null,
    teasers: (launcher.teaserMessages || []).filter((m) => typeof m === "string" && m.trim()),
    showBadge: !!launcher.showNotificationBadge,
    autoOpenMs: behavior.autoOpen ? Number(behavior.autoOpenDelay || 0) * 1000 : null,
  };
}
