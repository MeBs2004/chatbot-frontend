import { test } from "node:test";
import assert from "node:assert/strict";
import { readAttributes, pickMode, buildLauncherModel } from "../src/widget/launcherModel.js";

const fakeScript = (attrs) => ({ getAttribute: (n) => (n in attrs ? attrs[n] : null) });

const baseConfig = () => ({
  launcher: {
    enabled: true,
    position: "bottom-right",
    shape: "circle",
    color: "#0D5537",
    gradient: { enabled: false, from: "#111111", to: "#222222" },
    icon: "default",
    size: "medium",
    animation: "float",
    showGreeting: true,
    greetingTitle: "Hi there",
    greetingMessage: "How can we help?",
    showNotificationBadge: true,
    showOnMobile: true,
    teaserMessages: ["Need help?", "", "Ask us"],
  },
  chatWindow: { botName: "", botAvatar: "" },
  behavior: { autoOpen: false, autoOpenDelay: 3 },
});
const chatbot = { id: "b1", name: "Acme Sales" };
const model = (patch = {}, attrs = {}, isMobile = false) => {
  const config = baseConfig();
  for (const [section, values] of Object.entries(patch)) Object.assign(config[section], values);
  return buildLauncherModel({ config, chatbot, attrs: readAttributes(fakeScript(attrs)), isMobile });
};

test("readAttributes", () => {
  assert.deepEqual(
    readAttributes(fakeScript({ "data-chatbot-id": "b1", "data-position": "left", "data-bottom": "40", "data-api-base": "https://api.test/" })),
    { chatbotId: "b1", companyId: null, position: "left", bottom: 40, side: 20, apiBase: "https://api.test/" }
  );
  assert.equal(readAttributes(fakeScript({ "data-position": "middle" })).position, null);
});

test("pickMode prefers chatbotId", () => {
  assert.equal(pickMode({ chatbotId: "b1", companyId: "acme" }), "dynamic");
  assert.equal(pickMode({ chatbotId: null, companyId: "acme" }), "legacy");
  assert.equal(pickMode({ chatbotId: null, companyId: null }), "none");
});

test("position: data-position overrides config", () => {
  assert.equal(model({ launcher: { position: "bottom-left" } }, { "data-position": "right" }).side, "right");
  assert.equal(model({ launcher: { position: "bottom-left" } }).side, "left");
  assert.equal(model().side, "right");
});

test("gradient vs solid background", () => {
  assert.equal(model().background, "#0D5537");
  assert.equal(
    model({ launcher: { gradient: { enabled: true, from: "#111111", to: "#222222" } } }).background,
    "linear-gradient(135deg, #111111, #222222)"
  );
});

test("icon logo with avatar -> image, without -> default", () => {
  assert.deepEqual(model({ launcher: { icon: "logo" }, chatWindow: { botAvatar: "https://x.test/a.png" } }).icon, {
    kind: "image",
    src: "https://x.test/a.png",
  });
  assert.deepEqual(model({ launcher: { icon: "logo" } }).icon, { kind: "default" });
  assert.deepEqual(model({ launcher: { icon: "chat" } }).icon, { kind: "chat" });
});

test("label uses botName then chatbot name", () => {
  assert.equal(model({ chatWindow: { botName: "Aria" } }).label, "Open Aria");
  assert.equal(model().label, "Open Acme Sales");
});

test("hidden when disabled or mobile-hidden", () => {
  assert.equal(model({ launcher: { enabled: false } }), null);
  assert.equal(model({ launcher: { showOnMobile: false } }, {}, true), null);
  assert.notEqual(model({ launcher: { showOnMobile: false } }, {}, false), null);
});

test("greeting, teasers, autoOpen", () => {
  assert.deepEqual(model().greeting, { title: "Hi there", message: "How can we help?" });
  assert.equal(model({ launcher: { showGreeting: false } }).greeting, null);
  assert.deepEqual(model().teasers, ["Need help?", "Ask us"]);
  assert.equal(model().autoOpenMs, null);
  assert.equal(model({ behavior: { autoOpen: true, autoOpenDelay: 3 } }).autoOpenMs, 3000);
});
