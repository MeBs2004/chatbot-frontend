import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { JSDOM } from "jsdom";

const here = dirname(fileURLToPath(import.meta.url));
const backendConfig = join(here, "../../backend/config/chatbotConfig.js");

// This audit needs the backend's config schema (the single source of
// truth for option names/values). Skipped when this repo is checked out alone.
const haveBackend = existsSync(backendConfig);

let widget;
let defaults;
let lists;
let launcherMod;
let launcherModel;
let dynamicLauncher;
let widgetStyle;

// A jsdom window as globals — what the widget bundle expects of a browser.
function installDom() {
  const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>", { url: "https://customer.test/page", pretendToBeVisual: true });
  const { window } = dom;
  Object.defineProperty(window, "innerWidth", { value: 1280, configurable: true });
  // jsdom doesn't implement layout APIs the chat window calls.
  window.HTMLElement.prototype.scrollIntoView = () => {};
  // Browsers with read-aloud support; jsdom has none.
  window.speechSynthesis = { getVoices: () => [{ name: "Test", lang: "en-US" }], cancel() {}, speak: (u) => u.onstart?.(), pause() {}, resume() {} };
  window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
  // A microphone that "starts" instantly, so the listening state can be seen.
  window.SpeechRecognition = class { start() { this.onstart?.(); } stop() { this.onend?.(); } };
  for (const key of Object.getOwnPropertyNames(window)) {
    if (key in globalThis && !["window", "document", "navigator", "localStorage"].includes(key)) continue;
    try {
      Object.defineProperty(globalThis, key, { value: window[key], configurable: true, writable: true });
    } catch {
      /* some window props are not redefinable */
    }
  }
  globalThis.window = window;
  globalThis.document = window.document;
  Object.defineProperty(globalThis, "navigator", { value: window.navigator, configurable: true });
  Object.defineProperty(globalThis, "localStorage", { value: window.localStorage, configurable: true });
  return dom;
}

before(async () => {
  if (!haveBackend) return;
  installDom();
  const outfile = join(mkdtempSync(join(tmpdir(), "nf-widget-")), "widget.mjs");
  await build({
    entryPoints: [join(here, "entries/widget.entry.jsx")],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile,
    jsx: "automatic",
    loader: { ".png": "dataurl", ".svg": "dataurl" },
    define: { "import.meta.env.VITE_BACKEND_URL": '"http://api.test/"', "process.env.NODE_ENV": '"development"' },
    logLevel: "error",
    banner: { js: 'import { createRequire } from "module"; const require = createRequire(import.meta.url);' },
  });
  widget = await import(pathToFileURL(outfile).href);
  const cfg = await import(pathToFileURL(backendConfig).href);
  defaults = cfg.DEFAULT_CHATBOT_CONFIG;
  lists = {
    "launcher.position": ["bottom-right", "bottom-left"],
    "launcher.shape": cfg.LAUNCHER_SHAPES,
    "launcher.icon": cfg.LAUNCHER_ICONS,
    "launcher.style": ["icon", "icon-label"],
    "launcher.size": ["small", "medium", "large"],
    "launcher.animation": cfg.LAUNCHER_ANIMATIONS,
    "launcher.entrance": cfg.LAUNCHER_ENTRANCES,
    "launcher.hoverEffect": cfg.LAUNCHER_HOVERS,
    "launcher.bubbleAnimation": cfg.BUBBLE_ANIMATIONS,
    "launcher.bubbleEffect": cfg.BUBBLE_EFFECTS,
    "launcher.bubbleOrder": cfg.BUBBLE_ORDERS,
    "chatWindow.avatarShape": cfg.AVATAR_SHAPES,
    "chatWindow.statusStyle": cfg.STATUS_STYLES,
    "chatWindow.avatarAlign": cfg.AVATAR_ALIGNS,
    "chatWindow.sendButtonShape": cfg.SEND_SHAPES,
    "launcher.shadow": cfg.LAUNCHER_SHADOWS,
    "chatWindow.theme": ["light", "dark"],
    "chatWindow.size": ["small", "medium", "large"],
    "chatWindow.borderRadius": ["small", "medium", "large"],
    "chatWindow.bubbleStyle": cfg.BUBBLE_STYLES,
    "chatWindow.messageAnimation": cfg.MESSAGE_ANIMATIONS,
    "chatWindow.windowAnimation": cfg.WINDOW_ANIMATIONS,
    "chatWindow.typingStyle": cfg.TYPING_STYLES,
    "chatWindow.headerAnimation": cfg.HEADER_ANIMATIONS,
    "chatWindow.avatarAnimation": cfg.AVATAR_ANIMATIONS,
    "chatWindow.sendAnimation": cfg.SEND_ANIMATIONS,
    "chatWindow.suggestionAnimation": cfg.SUGGESTION_ANIMATIONS,
    "chatWindow.shadow": cfg.SHADOWS,
    "chatWindow.chatBackground": cfg.CHAT_BACKGROUNDS,
    "chatWindow.suggestionStyle": cfg.SUGGESTION_STYLES,
    "behavior.offlineMode": ["default", "offline-message"],
    "behavior.autoOpenAnimation": cfg.AUTO_OPEN_ANIMATIONS,
    "forms.style": ["classic", "conversational"],
    "language.defaultLanguage": ["English", "Hindi"],
    "appearance.font": cfg.FONTS,
    "appearance.fontSize": cfg.FONT_SIZES,
  };
  launcherMod = await import("../src/widget/launcher.js");
  launcherModel = await import("../src/widget/launcherModel.js");
  dynamicLauncher = await import("../src/widget/dynamicLauncher.js");
  widgetStyle = await import("../src/components/NuformlyWidget/widgetStyle.js");
});

const clone = (v) => JSON.parse(JSON.stringify(v));
const get = (o, path) => path.split(".").reduce((a, k) => a?.[k], o);
function set(o, path, value) {
  const keys = path.split(".");
  const last = keys.pop();
  keys.reduce((a, k) => a[k], o)[last] = value;
}
function leaves(obj, prefix = "") {
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) out.push(...leaves(v, path));
    else out.push(path);
  }
  return out;
}

// Same idea as the admin preview audit: some options only show when a
// related option is on.
const SETUP = {
  "launcher.icon": (c) => { c.launcher.logoUrl = "data:image/png;base64,AAAA"; },
  "launcher.logoUrl": (c) => { c.launcher.icon = "logo"; },
  "launcher.labelText": (c) => { c.launcher.style = "icon-label"; },
  "launcher.labelFontSize": (c) => { c.launcher.style = "icon-label"; },
  "launcher.gradient.from": (c) => { c.launcher.gradient.enabled = true; },
  "launcher.gradient.to": (c) => { c.launcher.gradient.enabled = true; },
  "chatWindow.headerGradient.from": (c) => { c.chatWindow.headerGradient.enabled = true; },
  "chatWindow.headerGradient.to": (c) => { c.chatWindow.headerGradient.enabled = true; },
  "forms.style": (c) => { c.forms.enabled = true; c.forms.fields = ["name", "email"]; },
  "forms.fields": (c) => { c.forms.enabled = true; },
  "chatWindow.showCtas": (c) => { c.ctas = [{ type: "call", enabled: true, label: "Call us", value: "+10000000" }]; },
  "chatWindow.listenLabel": (c) => { c.behavior.textToSpeech = true; },
  "chatWindow.stopLabel": (c) => { c.behavior.textToSpeech = true; },
  "chatWindow.offlineMessage": (c) => { c.behavior.offlineMode = "offline-message"; },
  "chatWindow.listeningPlaceholder": (c) => { c.behavior.voiceInput = true; },
  "chatWindow.welcomeMessageHindi": (c) => { c.language.defaultLanguage = "Hindi"; },
  "chatWindow.messageAvatarSize": (c) => { c.chatWindow.showMessageAvatars = true; },
  "chatWindow.welcomeMaxWidthPct": (c) => { c.chatWindow.welcomeMessage = "Hello there"; },
  "chatWindow.statusDotColor": (c) => { c.chatWindow.statusStyle = "inline"; },
  "behavior.autoOpenDelay": (c) => { c.behavior.autoOpen = true; },
  // "default" means the open animation, so give that a distinct value to compare against.
  "behavior.autoOpenAnimation": (c, value) => { c.behavior.autoOpen = true; c.chatWindow.windowAnimation = value === "fade" ? "zoom" : "fade"; },
};

// Size options of things that only exist in some states.
for (const key of ["ctaHeight", "ctaWidth", "ctaFontSize", "ctaRadius", "ctaGap"]) {
  SETUP[`chatWindow.${key}`] = (c) => { c.ctas = [{ type: "call", enabled: true, label: "Call us", value: "+10000000" }]; };
}
for (const key of ["formTitle", "formSubtitle", "formButtonLabel"]) {
  SETUP[`chatWindow.${key}`] = (c) => { c.forms.enabled = true; c.forms.fields = ["name", "email"]; };
}
for (const key of ["fieldHeight", "buttonHeight", "fontSize"]) {
  SETUP[`forms.${key}`] = (c) => { c.forms.enabled = true; c.forms.fields = ["name", "email"]; };
}

const ARRAY_VALUES = {
  "launcher.teaserMessages": ["Need a hand?"],
  "forms.fields": ["phone", "company"],
  ctas: [{ type: "call", enabled: true, label: "Call us now", value: "+10000000" }],
  suggestions: ["A custom suggestion"],
};
const HISTORY = [
  { id: "m1", ts: 1700000000000, text: "Hi, what do you do?", sender: "user" },
  { id: "m2", ts: 1700000005000, text: "We build chatbots.", sender: "bot" },
];

// What a visitor's browser would draw for the launcher: the model
// plus the DOM mountLauncher produces from it.
function launcherSnapshot(config, isMobile) {
  document.body.innerHTML = "";
  const model = launcherModel.buildLauncherModel({
    config,
    chatbot: { id: "b1", name: "Acme Bot" },
    attrs: { chatbotId: "b1", position: null, bottom: 20, side: 20 },
    isMobile,
  });
  const l = launcherMod.mountLauncher(model, { onClick() {} });
  const html = document.body.innerHTML;
  l.destroy();
  return JSON.stringify(model) + html;
}

async function windowSnapshot(config, scenario) {
  const m = await widget.mountWidget(config, scenario);
  const html = m.html;
  if (scenario.send === "pending") widget.releaseMessage();
  await m.unmount();
  return html;
}

// A visitor's typed text is what reveals the send button's colour.
const WINDOW_SCENARIOS = [
  {},
  { history: HISTORY },
  { send: "pending" },
  { formDone: true },
  { typed: "hello" },
  // states a text can only show in:
  { offline: true },
  { send: "fail", formDone: true },
  { history: HISTORY, scrolled: true },
  { history: HISTORY, listen: true },
  { mic: true, formDone: true },
];

// How the host-page loader frames the chat iframe: size, corner radius,
// shadow and the open/close motion all come from the config.
async function iframeSnapshot(config) {
  document.body.innerHTML = "";
  const realSetTimeout = globalThis.setTimeout;
  // Long timers (auto-open, greeting bubble) must not fire into later snapshots.
  globalThis.setTimeout = (fn, ms, ...rest) => (ms >= 1000 ? 0 : realSetTimeout(fn, ms, ...rest));
  try {
    const handle = await dynamicLauncher.startDynamicLauncher({
      attrs: { chatbotId: "b1", companyId: null, position: null, bottom: 20, side: 20, apiBase: "https://api.test/" },
      scriptSrc: "https://cdn.test/widget.js",
      fetchImpl: async () => ({ ok: true, json: async () => ({ success: true, available: true, token: "tok", chatbot: { id: "b1", name: "Bot" }, config }) }),
      connectSocket: () => ({ on() {}, close() {} }),
    });
    if (!handle) return "unavailable";
    // Same path the auto-open timer takes when the option is on.
    handle.open({ auto: Boolean(config.behavior?.autoOpen) });
    const snap = document.querySelector("iframe").getAttribute("style");
    handle.launcher.destroy();
    return snap;
  } finally {
    globalThis.setTimeout = realSetTimeout;
  }
}

// jsdom's CSS parser drops gradient values, so the header gradient can't
// be read back from the DOM. Those options are checked at the resolver
// (what feeds the style) plus a source check that the widget uses it.
const GRADIENT_BLIND = new Set(["chatWindow.headerGradient.from", "chatWindow.headerGradient.to"]);
// No static DOM trace (behaviour only) — each has its own test below.
const BEHAVIOUR_TESTED = new Set(["behavior.sound", "language.defaultLanguage", "behavior.askEmail", "chatWindow.emailPrompt", "chatWindow.emailThanks"]);

// Baseline renders are identical for every option that shares a setup,
// so each is computed once.
const baseCache = new Map();
const config0 = (c) => c;
async function baseline(setupKey, base, kind, scenario, index) {
  const key = `${setupKey}|${kind}|${index}`;
  if (!baseCache.has(key)) {
    baseCache.set(
      key,
      kind === "launcher" ? launcherSnapshot(base, scenario) : kind === "iframe" ? await iframeSnapshot(base) : await windowSnapshot(base, scenario),
    );
  }
  return baseCache.get(key);
}

async function changed(path, make, value) {
  const setupKey = SETUP[path] ? `${path}:${JSON.stringify(value)}` : "default";
  const base = clone(defaults);
  SETUP[path]?.(base, value);
  const next = clone(base);
  make(next);
  // Cheapest surface first, stop at the first visible difference.
  for (const mobile of [false, true]) {
    if ((await baseline(setupKey, base, "launcher", mobile, Number(mobile))) !== launcherSnapshot(next, mobile)) return true;
  }
  if (GRADIENT_BLIND.has(path)) {
    const a1 = JSON.stringify(widgetStyle.resolveWindowStyle(base));
    const a2 = JSON.stringify(widgetStyle.resolveWindowStyle(next));
    const usesIt = readFileSync(join(here, "../src/components/NuformlyWidget/NuformlyWidget.jsx"), "utf8").includes("look.headerBg");
    return a1 !== a2 && usesIt;
  }
  if (BEHAVIOUR_TESTED.has(path)) return true;
  if ((await baseline(setupKey, base, "iframe", config0(base), 0)) !== (await iframeSnapshot(next))) return true;
  for (const [i, sc] of WINDOW_SCENARIOS.entries()) {
    if ((await baseline(setupKey, base, "window", sc, i)) !== (await windowSnapshot(next, sc))) return true;
  }
  return false;
}

test("every customization option (and enum value) changes what the REAL widget renders", { skip: !haveBackend && "needs ../backend" }, async () => {
  const failures = [];
  let checked = 0;
  for (const path of leaves(defaults).concat(["ctas", "suggestions"])) {
    const def = get(defaults, path);
    const options = lists[path];
    let values;
    if (options) values = options.filter((v) => v !== def);
    else if (path in ARRAY_VALUES) values = [ARRAY_VALUES[path]];
    else if (def === null) values = [77]; // a size option: automatic -> 77 (clamped into range)
    else if (typeof def === "boolean") values = [!def];
    else if (typeof def === "number") values = [def + 4];
    else if (typeof def === "string" && /^#[0-9a-f]{6}$/i.test(def)) values = ["#123456"];
    else if (def === "") values = [/Color$|Background$/.test(path) ? "#123456" : /logoUrl|botAvatar/.test(path) ? "https://example.test/x.png" : path === "appearance.customCss" ? ".x{color:red}" : "ZQ-sample"];
    else if (typeof def === "string") values = ["ZQ-sample"];
    else values = [];

    for (const value of values) {
      checked += 1;
      try {
        if (!(await changed(path, (cfg) => set(cfg, path, value), value))) failures.push(`${path} = ${JSON.stringify(value)}`);
      } catch (err) {
        // A value that crashes the widget is a failure worth naming.
        failures.push(`${path} = ${JSON.stringify(value)} -> threw: ${err.message.slice(0, 80)}`);
      }
    }
  }
  assert.ok(checked > 150, `expected 150+ option values, exercised ${checked}`);
  assert.deepEqual(failures, [], `options with no effect on the real widget:\n  ${failures.join("\n  ")}`);
});

test("sound: the chime plays on a bot reply only when behavior.sound is on", { skip: !haveBackend && "needs ../backend" }, async () => {
  let contexts = 0;
  const osc = () => ({ connect: () => ({ connect() {} }), frequency: {}, start() {}, stop() {} });
  window.AudioContext = class {
    constructor() { contexts += 1; this.currentTime = 0; this.destination = {}; }
    createOscillator() { return osc(); }
    createGain() { return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect: () => ({ connect() {} }) }; }
    close() {}
  };
  for (const [sound, expected] of [[true, 1], [false, 0]]) {
    contexts = 0;
    const cfg = clone(defaults);
    cfg.behavior.sound = sound;
    const m = await widget.mountWidget(cfg, { send: "now", formDone: true });
    await widget.tick(5);
    assert.equal(contexts, expected, `sound=${sound}`);
    await m.unmount();
  }
});

test("pre-chat form: gates the chat, validates, saves to the backend, and stays done", { skip: !haveBackend && "needs ../backend" }, async () => {
  const cfg = clone(defaults);
  cfg.forms = { enabled: true, style: "classic", fields: ["name", "email"] };
  const m = await widget.mountWidget(cfg);
  const q = (sel) => m.container.querySelector(sel);
  assert.ok(q('input[type="email"]'), "email field shown");
  assert.equal(q('input[aria-label="Type a message"]'), null, "chat input hidden behind the form");

  const [name, email] = m.container.querySelectorAll("form input");
  await widget.act(async () => { widget.setValue(name, "Jane Doe"); widget.setValue(email, "not-an-email"); });
  await widget.act(async () => q("form").dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true })));
  assert.ok(m.html.includes("valid email"), "invalid email rejected");

  await widget.act(async () => widget.setValue(email, "jane@acme.test"));
  await widget.act(async () => q("form").dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true })));
  await widget.tick(5);
  assert.ok(q('input[aria-label="Type a message"]'), "chat unlocked after submit");
  const saved = widget.calls.find((c) => c.url.includes("bot/v1/visitor/profile"));
  assert.ok(saved, "profile posted to the backend");
  assert.deepEqual(JSON.parse(saved.data), { visitorId: "visitor-1", name: "Jane Doe", email: "jane@acme.test" });
  await m.unmount();

  const again = await widget.mountWidget(cfg, { formDone: true });
  assert.ok(again.container.querySelector('input[aria-label="Type a message"]'), "returning visitor skips the form");
  await again.unmount();
});

test("language: the default language drives the selector and the chat request", { skip: !haveBackend && "needs ../backend" }, async () => {
  const cfg = clone(defaults);
  cfg.language.defaultLanguage = "Hindi";
  const m = await widget.mountWidget(cfg, { send: "now", formDone: true });
  await widget.tick(0);
  assert.equal(m.container.querySelector('select[aria-label="Select language"]').value, "Hindi");
  const sent = widget.calls.find((c) => c.url.includes("bot/v1/message"));
  assert.equal(sent.data.get("language"), "Hindi");
  await m.unmount();
});

test("offline mode: banner, gray status and 'Currently offline' subtitle", { skip: !haveBackend && "needs ../backend" }, async () => {
  const cfg = clone(defaults);
  cfg.behavior.offlineMode = "offline-message";
  const m = await widget.mountWidget(cfg, { formDone: true });
  assert.ok(m.html.includes("currently offline"), "offline notice");
  assert.ok(m.html.includes("Currently offline"), "header subtitle");
  await m.unmount();
});

test("typing indicator renders in the chosen style while the bot is thinking", { skip: !haveBackend && "needs ../backend" }, async () => {
  for (const style of ["dots", "wave", "pulse", "bars"]) {
    const cfg = clone(defaults);
    cfg.chatWindow.typingStyle = style;
    const m = await widget.mountWidget(cfg, { send: "pending", formDone: true });
    assert.ok(m.container.querySelector(`.nfw-typing-${style}`), `typing style ${style}`);
    widget.releaseMessage();
    await m.unmount();
  }
  const off = clone(defaults);
  off.behavior.typingIndicator = false;
  const m = await widget.mountWidget(off, { send: "pending", formDone: true });
  assert.equal(m.container.querySelector('[class*="nfw-typing"]'), null, "typingIndicator=false hides it");
  widget.releaseMessage();
  await m.unmount();
});

async function sendVia(m, text) {
  const input = m.container.querySelector('input[aria-label="Type a message"]');
  await widget.act(async () => widget.setValue(input, text));
  await widget.act(async () => m.container.querySelector('button[aria-label="Send message"]').click());
  for (let i = 0; i < 3; i += 1) await widget.tick(0);
}

test("email prompt: asked once after the third question, and the answer is saved without calling the AI", { skip: !haveBackend && "needs ../backend" }, async () => {
  const cfg = clone(defaults);
  cfg.behavior.askEmail = true;
  const m = await widget.mountWidget(cfg, { formDone: true });
  for (const q of ["one", "two", "three"]) await sendVia(m, q);
  assert.ok(m.html.includes("share your email address"), "prompt appears after the third message");
  const before = widget.calls.filter((c) => c.url.includes("bot/v1/message")).length;
  await sendVia(m, "jane@acme.test");
  const saved = widget.calls.find((c) => c.url.includes("bot/v1/visitor/email"));
  assert.ok(saved, "email posted to the backend");
  assert.deepEqual(JSON.parse(saved.data), { visitorId: "visitor-1", email: "jane@acme.test" });
  assert.ok(m.html.includes("saved your email"), "thank-you shown");
  assert.equal(widget.calls.filter((c) => c.url.includes("bot/v1/message")).length, before, "the AI was not called for the email");
  await m.unmount();

  // off by default: never asks
  const quiet = clone(defaults);
  const q = await widget.mountWidget(quiet, { formDone: true });
  for (const x of ["a", "b", "c", "d"]) await sendVia(q, x);
  assert.equal(q.html.includes("share your email address"), false);
  await q.unmount();
});

test("email prompt and thank-you use the admin's own wording", { skip: !haveBackend && "needs ../backend" }, async () => {
  const cfg = clone(defaults);
  cfg.behavior.askEmail = true;
  cfg.chatWindow.emailPrompt = "Mind dropping your email?";
  cfg.chatWindow.emailThanks = "Lovely, noted!";
  const m = await widget.mountWidget(cfg, { formDone: true });
  for (const q of ["one", "two", "three"]) await sendVia(m, q);
  assert.ok(m.html.includes("Mind dropping your email?"), "custom prompt");
  assert.equal(m.html.includes("share your email address"), false, "built-in prompt replaced");
  await sendVia(m, "jane@acme.test");
  assert.ok(m.html.includes("Lovely, noted!"), "custom thank-you");
  await m.unmount();
});

test("attachments: pick a file, see it, and it is sent with the message", { skip: !haveBackend && "needs ../backend" }, async () => {
  const cfg = clone(defaults);
  cfg.behavior.attachments = true;
  const m = await widget.mountWidget(cfg, { formDone: true });
  const picker = m.container.querySelector('input[type="file"]');
  assert.ok(picker, "attach control is rendered");
  // Node's File, so Node's FormData (used by the widget under test) accepts it.
  const file = new globalThis.File(["hello"], "brief.pdf", { type: "application/pdf" });
  Object.defineProperty(picker, "files", { value: [file], configurable: true });
  await widget.act(async () => picker.dispatchEvent(new window.Event("change", { bubbles: true })));
  assert.ok(m.html.includes("brief.pdf"), "selected file shown above the input");
  await sendVia(m, "see attached");
  const sent = widget.calls.filter((c) => c.url.includes("bot/v1/message")).pop();
  assert.equal(sent.data.get("file").name, "brief.pdf");
  assert.equal(m.container.querySelector('button[aria-label="Remove attachment"]'), null, "cleared after sending");
  await m.unmount();

  const off = await widget.mountWidget(clone(defaults), { formDone: true });
  assert.equal(off.container.querySelector('input[type="file"]'), null, "no attach control unless enabled");
  await off.unmount();
});

test("the Nuform starter look: what a new chatbot gets before any customizing", { skip: !haveBackend && "needs ../backend" }, async () => {
  const { STARTER_CHATBOT_CONFIG: starter } = await import(pathToFileURL(join(here, "../../backend/config/chatbotStarter.js")).href);
  const m = await widget.mountWidget(clone(starter), { formDone: true, history: HISTORY });
  const html = m.html;
  const q = (sel) => m.container.querySelector(sel);

  // header
  assert.ok(html.includes("Nuform Social Assistant"));
  assert.ok(html.includes("Online · Always ready"));
  assert.match(q("header").getAttribute("style"), /height: 74px/);
  const tile = q("header div[style*='border-radius: 12px']");
  assert.ok(tile, "rounded-square avatar tile");
  assert.match(tile.getAttribute("style"), /255, 255, 255, 0\.13/, "translucent tile behind the logo");
  assert.match(q("header img").getAttribute("style"), /border-radius: 8px/, "logo inside the tile");
  assert.ok(q('select[aria-label="Select language"]').textContent.includes("हिं"));
  // window
  assert.match(q('[role="dialog"]').getAttribute("style"), /border-radius: 28px/);
  // footer + inputs
  assert.equal(q('input[aria-label="Type a message"]').getAttribute("placeholder"), "Ask About Our Services...");
  assert.ok(q('button[aria-label="Attach a file"]'), "attach");
  assert.ok(q('button[aria-label="Start voice input"]'), "mic");
  assert.match(q('button[aria-label="Send message"]').getAttribute("style"), /border-radius: 50%/);
  assert.ok(html.includes("Nuform Social") && html.includes("nuformsocial.com"), "branded footer");
  // messages: classic bubbles, bot avatar beside bot messages
  const bubbles = [...m.container.querySelectorAll("main div[style*='border-radius']")].map((e) => e.getAttribute("style"));
  assert.ok(bubbles.some((st) => st.includes("18px 18px 18px 6px")), "bot bubble tail corner");
  assert.ok(bubbles.some((st) => st.includes("16px 16px 6px 16px")), "visitor bubble tail corner");
  assert.ok(m.container.querySelectorAll("main img").length >= 1, "bot avatar beside the reply");
  await m.unmount();

  // first screen: welcome card + the three CTAs + the suggestion chips
  const fresh = await widget.mountWidget(clone(starter), { formDone: true });
  assert.ok(fresh.html.includes("Hey! I&#x27;m the Nuform Social Assistant") || fresh.html.includes("Hey! I'm the Nuform Social Assistant"));
  const links = [...fresh.container.querySelectorAll("a")].map((a) => [a.getAttribute("href"), a.textContent]);
  assert.deepEqual(links.map((l) => l[1]), ["Call", "WhatsApp", "Email"]);
  assert.equal(links[0][0], "tel:+919902421936");
  assert.equal(links[1][0], "https://wa.me/919902421936");
  assert.equal(links[2][0], "mailto:info@nuformsocial.com");
  const colors = [...fresh.container.querySelectorAll("a")].map((a) => a.style.background);
  assert.deepEqual(colors, ["rgb(6, 118, 71)", "rgb(37, 211, 102)", "rgb(227, 107, 10)"], "green / WhatsApp green / orange");
  const chip = fresh.container.querySelector("main button");
  assert.match(chip.getAttribute("style"), /218, 247, 225/, "suggestion chip background #daf7e1");
  await fresh.unmount();

  // Hindi welcome
  const hi = clone(starter);
  hi.language.defaultLanguage = "Hindi";
  const h = await widget.mountWidget(hi, { formDone: true });
  assert.ok(h.html.includes("नमस्ते"));
  await h.unmount();

  // launcher: transparent logo-only button, orange pulsing badge, typing bubble
  const model = launcherModel.buildLauncherModel({ config: clone(starter), chatbot: { id: "b1", name: "Acme" }, attrs: { chatbotId: "b1", position: null, bottom: 20, side: 20 }, isMobile: false });
  assert.equal(model.px, 55);
  assert.equal(model.logoOnly, true);
  assert.equal(model.background, "transparent");
  assert.equal(model.animation, "float-ripple");
  assert.equal(model.bubbleEffect, "typing");
  assert.equal(model.badgeColor, "#E36B0A");
  assert.equal(model.badgePulse, true);
  assert.equal(model.teasers.length, 11);
});

// React's scheduler leaves message ports open under jsdom, which would
// keep this test process alive forever. Everything has finished by now.
after(() => {
  window?.close();
  setTimeout(() => process.exit(0), 100);
});
