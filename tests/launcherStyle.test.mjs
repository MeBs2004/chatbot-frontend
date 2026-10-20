import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { setupDom } from "./helpers/dom.mjs";
import { buildLauncherModel, readAttributes } from "../src/widget/launcherModel.js";
import { resolveLauncherStyle, resolveWindowStyle } from "../src/components/NuformlyWidget/widgetStyle.js";

beforeEach(() => setupDom());
const { mountLauncher } = await import("../src/widget/launcher.js");

const fakeScript = (attrs = {}) => ({ getAttribute: (n) => (n in attrs ? attrs[n] : null) });
const config = (launcher = {}, chatWindow = {}) => ({
  launcher: {
    enabled: true, position: "bottom-right", shape: "circle", color: "#0D5537", gradient: { enabled: false, from: "#111111", to: "#222222" },
    icon: "default", size: "medium", animation: "float", showGreeting: false, showNotificationBadge: false, showOnMobile: true,
    teaserMessages: [], ...launcher,
  },
  chatWindow: { botName: "", botAvatar: "", ...chatWindow },
  behavior: {},
});
const model = (l, w) =>
  buildLauncherModel({ config: config(l, w), chatbot: { name: "Acme" }, attrs: readAttributes(fakeScript()), isMobile: false });

test("uploaded logo wins over the bot avatar; avatar is the fallback", () => {
  assert.deepEqual(model({ icon: "logo", logoUrl: "data:image/png;base64,AA" }, { botAvatar: "https://x.test/a.png" }).icon, { kind: "image", src: "data:image/png;base64,AA" });
  assert.deepEqual(model({ icon: "logo" }, { botAvatar: "https://x.test/a.png" }).icon, { kind: "image", src: "https://x.test/a.png" });
  assert.deepEqual(model({ icon: "logo" }).icon, { kind: "default" });
});

test("built-in glyphs map through; unknown ones fall back to default", () => {
  assert.deepEqual(model({ icon: "robot" }).icon, { kind: "robot" });
  assert.deepEqual(model({ icon: "bogus" }).icon, { kind: "default" });
});

test("pill style needs text; radius follows shape", () => {
  assert.equal(model({ style: "icon-label", labelText: "Chat with us" }).pill, true);
  assert.equal(model({ style: "icon-label", labelText: "   " }).pill, false);
  assert.equal(model({ style: "icon" , labelText: "Hi" }).pill, false);
  assert.equal(model({ shape: "circle" }).radius, "50%");
  assert.equal(model({ shape: "squircle" }).radius, "22px");
});

test("resolveWindowStyle: auto colours follow the theme, overrides win", () => {
  const w = (cw) => resolveWindowStyle({ chatWindow: { theme: "light", primaryColor: "#0D5537", backgroundColor: "#FFFFFF", textColor: "#111827", ...cw }, appearance: {} });
  assert.equal(w({}).userBubble, "#0D5537");
  assert.equal(w({ userBubbleColor: "#112233" }).userBubble, "#112233");
  assert.equal(w({ botBubbleColor: "#000000" }).botText, "#ffffff");
  assert.equal(w({ theme: "dark" }).windowBg, "#171f1b");
  assert.equal(w({ headerGradient: { enabled: true, from: "#000000", to: "#ffffff" } }).headerBg, "linear-gradient(135deg, #000000, #ffffff)");
  assert.equal(w({ bubbleStyle: "pill" }).botRadius, "999px");
});

test("resolveLauncherStyle ignores invalid hex values", () => {
  assert.equal(resolveLauncherStyle({ launcher: { color: "red" } }).color, "#0D5537");
});

test("launcher DOM: classes, pill label, icon colour, badge colour", () => {
  mountLauncher({ ...model({ animation: "ripple", entrance: "pop", hoverEffect: "lift", style: "icon-label", labelText: "Chat with us", iconColor: "#ff0000", showNotificationBadge: true, badgeColor: "#00ff00" }) }, { onClick() {} });
  const button = document.querySelector("button[aria-label]");
  assert.ok(button.className.includes("nf-anim-ripple"));
  assert.ok(button.className.includes("nf-in-pop"));
  assert.ok(button.className.includes("nf-hover-lift"));
  assert.ok(button.textContent.includes("Chat with us"));
  assert.equal(button.querySelector("svg").getAttribute("fill"), "#ff0000");
  const badge = [...button.querySelectorAll("span")].find((el) => el.style.border.includes("2px"));
  assert.equal(badge.style.background, "rgb(0, 255, 0)");
});

test("launcher DOM: logo inside a pill renders as a round chip", () => {
  mountLauncher(model({ icon: "logo", logoUrl: "https://x.test/l.png", style: "icon-label", labelText: "Hi" }), { onClick() {} });
  const img = document.querySelector("button img");
  assert.equal(img.getAttribute("src"), "https://x.test/l.png");
  assert.equal(img.parentElement.style.borderRadius, "50%");
});

test("typing bubble: indicator, types the message, holds, hides, pauses, then shows the next", async () => {
  const { mock } = await import("node:test");
  mock.timers.enable({ apis: ["setTimeout", "setInterval"] });
  const m = {
    ...model({ showGreeting: false, teaserMessages: ["First one", "Second one"], bubbleEffect: "typing", bubbleOrder: "sequence", bubbleAvatar: true, bubbleTail: true, bubbleHoldSeconds: 4, bubblePauseSeconds: 8 }, { botAvatar: "https://x.test/a.png" }),
  };
  assert.equal(m.bubbleEffect, "typing");
  mountLauncher(m, { onClick() {} });
  const bubble = () => document.querySelector("[data-nuformly-bubble]");
  const text = () => bubble().querySelector("p").textContent;
  // The typewriter chains one timeout per character, so advance in small steps.
  const advance = (ms) => {
    for (let t = 0; t < ms; t += 25) mock.timers.tick(25);
  };

  assert.equal(bubble().style.display, "none", "nothing before the first delay");
  advance(2000);
  assert.equal(bubble().style.display, "flex", "bubble appears with a typing indicator");
  assert.equal(bubble().querySelector(".nf-bdots").style.display, "flex");
  assert.equal(text(), "");
  assert.ok(bubble().querySelector("img"), "small avatar");

  advance(700 + 600);
  assert.equal(bubble().querySelector(".nf-bdots").style.display, "none");
  assert.equal(text(), "First one", "message typed out in full");

  advance(4000 + 300);
  assert.equal(bubble().style.display, "none", "hidden after the hold");
  advance(8000);
  assert.equal(bubble().style.display, "flex", "next cycle after the pause");
  advance(700 + 600);
  assert.equal(text(), "Second one", "sequence order");
  mock.timers.reset();
});

test("logo-only launcher draws just the logo; badge can pulse", () => {
  mountLauncher(model({ icon: "logo", logoUrl: "https://x.test/l.png", logoOnly: true, showNotificationBadge: true, badgePulse: true, badgeSize: 11 }), { onClick() {} });
  const button = document.querySelector("button[aria-label]");
  const img = button.querySelector("img");
  assert.equal(img.style.objectFit, "contain");
  assert.equal(button.style.background, "transparent");
  assert.equal(button.style.boxShadow, "none");
  assert.ok(button.querySelector(".nf-badge-pulse"));
});
