import { test, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import { setupDom } from "./helpers/dom.mjs";

beforeEach(() => setupDom());
const { mountLauncher } = await import("../src/widget/launcher.js");

const baseModel = (patch = {}) => ({
  side: "right",
  bottom: 20,
  sideOffset: 20,
  shape: "circle",
  size: "medium",
  animation: "float",
  background: "#0D5537",
  icon: { kind: "default" },
  label: "Open Acme Sales",
  greeting: { title: "Hi there", message: "How can we help?" },
  teasers: [],
  showBadge: false,
  autoOpenMs: null,
  ...patch,
});

test("renders the configured launcher", () => {
  mountLauncher(baseModel({ side: "left", background: "#123456" }), { onClick() {} });
  const button = document.querySelector("button[aria-label='Open Acme Sales']");
  assert.ok(button);
  assert.equal(button.style.background, "rgb(18, 52, 86)");
  const root = button.closest("[data-nuformly-launcher]");
  assert.equal(root.style.left, "20px");
  assert.equal(document.body.textContent.includes("Nuform"), false);
});

test("click calls onClick", () => {
  let clicks = 0;
  mountLauncher(baseModel(), { onClick: () => clicks++ });
  document.querySelector("button[aria-label='Open Acme Sales']").click();
  assert.equal(clicks, 1);
});

test("renders config text as text", () => {
  mock.timers.enable({ apis: ["setTimeout", "setInterval"] });
  const evil = '<img src=x onerror="window.pwned=1">';
  mountLauncher(baseModel({ greeting: { title: evil, message: evil }, teasers: [evil] }), { onClick() {} });
  mock.timers.tick(10000);
  assert.equal(document.querySelectorAll("img").length, 0);
  assert.ok(document.body.textContent.includes(evil));
  mock.timers.reset();
});

test("image icon uses the avatar url", () => {
  mountLauncher(baseModel({ icon: { kind: "image", src: "https://x.test/a.png" } }), { onClick() {} });
  assert.equal(document.querySelector("button img").getAttribute("src"), "https://x.test/a.png");
});

test("teasers rotate after the greeting", () => {
  mock.timers.enable({ apis: ["setTimeout", "setInterval"] });
  mountLauncher(baseModel({ teasers: ["Need help?", "Ask us"] }), { onClick() {} });
  const bubbleText = () => document.querySelector("[data-nuformly-bubble]")?.textContent || "";
  mock.timers.tick(2500);
  assert.ok(bubbleText().includes("How can we help?"));
  mock.timers.tick(6000);
  assert.ok(bubbleText().includes("Need help?"));
  mock.timers.tick(6000);
  assert.ok(bubbleText().includes("Ask us"));
  mock.timers.reset();
});

test("update(null) hides and update(model) shows again", () => {
  const l = mountLauncher(baseModel(), { onClick() {} });
  l.update(null);
  assert.equal(document.querySelector("[data-nuformly-launcher]").style.display, "none");
  l.update(baseModel({ label: "Open New Name" }));
  assert.ok(document.querySelector("button[aria-label='Open New Name']"));
  assert.notEqual(document.querySelector("[data-nuformly-launcher]").style.display, "none");
});
