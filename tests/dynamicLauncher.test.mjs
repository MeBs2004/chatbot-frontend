import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { setupDom } from "./helpers/dom.mjs";

beforeEach(() => setupDom());
const { startDynamicLauncher, windowMotion } = await import("../src/widget/dynamicLauncher.js");
const { fetchSession } = await import("../src/widget/session.js");

const config = {
  launcher: { enabled: true, position: "bottom-right", color: "#0D5537", gradient: { enabled: false }, icon: "default", showGreeting: false, teaserMessages: [], showOnMobile: true },
  chatWindow: { botName: "Aria", botAvatar: "" },
  behavior: { autoOpen: false },
};
const attrs = { chatbotId: "b1", companyId: null, position: null, bottom: 20, side: 20, apiBase: "https://api.test/" };
const okFetch = async () => ({ ok: true, json: async () => ({ success: true, available: true, token: "tok", chatbot: { id: "b1", name: "Bot" }, config }) });
const noSocket = () => ({ on() {}, close() {} });

test("renders nothing when session unavailable", async () => {
  const cases = [
    async () => ({ ok: true, json: async () => ({ success: true, available: false, reason: "paused" }) }),
    async () => ({ ok: false, status: 404, json: async () => ({ success: false }) }),
    async () => { throw new Error("network down"); },
    async () => ({ ok: true, json: async () => { throw new Error("bad json"); } }),
  ];
  for (const fetchImpl of cases) {
    setupDom();
    const result = await startDynamicLauncher({ attrs, scriptSrc: "https://cdn.test/widget.js", fetchImpl, connectSocket: noSocket });
    assert.equal(result, null);
    assert.equal(document.body.children.length, 0);
  }
});

test("fetchSession posts the chatbotId and never throws", async () => {
  let seen;
  const fetchImpl = async (url, init) => { seen = { url, init }; return okFetch(); };
  const s = await fetchSession("https://api.test/", "b1", fetchImpl);
  assert.equal(seen.url, "https://api.test/api/widget/session");
  assert.equal(JSON.parse(seen.init.body).chatbotId, "b1");
  assert.equal(s.token, "tok");
  assert.equal(await fetchSession("https://api.test/", "b1", async () => { throw new Error("x"); }), null);
});

test("opens the chat iframe with the token in the fragment", async () => {
  const r = await startDynamicLauncher({ attrs, scriptSrc: "https://cdn.test/widget.js", fetchImpl: okFetch, connectSocket: noSocket });
  document.querySelector("button[aria-label='Open Aria']").click();
  const iframe = document.querySelector("iframe");
  assert.equal(iframe.getAttribute("src"), "https://cdn.test/embed?chatbotId=b1#t=tok");
  assert.ok(r);
});

test("answers token requests only from the widget origin", async () => {
  let calls = 0;
  const fetchImpl = async () => { calls++; return okFetch(); };
  await startDynamicLauncher({ attrs, scriptSrc: "https://cdn.test/widget.js", fetchImpl, connectSocket: noSocket });
  document.querySelector("button").click();
  const iframe = document.querySelector("iframe");
  const posted = [];
  Object.defineProperty(iframe, "contentWindow", { value: { postMessage: (m, o) => posted.push([m, o]) } });
  const ask = (origin) =>
    window.dispatchEvent(new window.MessageEvent("message", { data: { type: "NUFORMLY_TOKEN_REQUEST" }, origin }));
  ask("https://evil.test");
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(posted.length, 0);
  ask("https://cdn.test");
  await new Promise((r) => setTimeout(r, 10));
  assert.deepEqual(posted, [[{ type: "NUFORMLY_TOKEN", token: "tok" }, "https://cdn.test"]]);
  assert.equal(calls, 2);
});

test("live config update recolours and forwards to the iframe", async () => {
  const handlers = {};
  const connectSocket = (url, opts) => {
    assert.equal(url, "https://api.test/widget");
    assert.deepEqual(opts.auth, { chatbotId: "b1" });
    return { on: (e, fn) => (handlers[e] = fn), close() {} };
  };
  await startDynamicLauncher({ attrs, scriptSrc: "https://cdn.test/widget.js", fetchImpl: okFetch, connectSocket });
  document.querySelector("button").click();
  const posted = [];
  Object.defineProperty(document.querySelector("iframe"), "contentWindow", { value: { postMessage: (m, o) => posted.push([m, o]) } });
  const next = { ...config, launcher: { ...config.launcher, color: "#ff0000" } };
  handlers["domain:event"]({ type: "chatbot.config.updated", available: true, config: next });
  assert.equal(document.querySelector("button[aria-label='Open Aria']").style.background, "rgb(255, 0, 0)");
  assert.deepEqual(posted.at(-1), [{ type: "NUFORMLY_CONFIG", config: next }, "https://cdn.test"]);
  handlers["domain:event"]({ type: "chatbot.config.updated", available: false });
  assert.equal(document.querySelector("[data-nuformly-launcher]").style.display, "none");
});

test("auto-open uses its own animation; 'default' falls back to the open animation", () => {
  const cfg = (auto, open) => ({ chatWindow: { windowAnimation: open }, behavior: { autoOpenAnimation: auto } });
  assert.deepEqual(windowMotion(cfg("default", "zoom"), true), windowMotion(cfg("default", "zoom"), false));
  assert.notDeepEqual(windowMotion(cfg("swing", "zoom"), true), windowMotion(cfg("swing", "zoom"), false));
  assert.equal(windowMotion(cfg("blur", "fade"), true).hiddenFilter, "blur(14px)");
  // a manual open never uses the auto-open animation
  assert.deepEqual(windowMotion(cfg("swing", "fade"), false), windowMotion(cfg("default", "fade"), false));
  for (const name of ["slide-down", "slide-left", "slide-right", "flip-y", "swing", "blur"]) {
    assert.ok(windowMotion(cfg(name, "fade"), true).hidden, name);
  }
});

test("auto-open timer opens the window with the auto animation", async () => {
  const mock = await import("node:test").then((m) => m.mock);
  mock.timers.enable({ apis: ["setTimeout"] });
  const auto = { ...config, behavior: { autoOpen: true, autoOpenDelay: 1, autoOpenAnimation: "drop" }, chatWindow: { botName: "Aria", windowAnimation: "fade" } };
  const fetchImpl = async () => ({ ok: true, json: async () => ({ success: true, available: true, token: "tok", chatbot: { id: "b1", name: "Bot" }, config: auto }) });
  await startDynamicLauncher({ attrs, scriptSrc: "https://cdn.test/widget.js", fetchImpl, connectSocket: noSocket });
  mock.timers.tick(1000);
  const iframe = document.querySelector("iframe");
  assert.ok(iframe, "window opened by itself");
  assert.ok(iframe.style.transition.includes("cubic-bezier(.34,1.56,.64,1)"), "drop motion, not the fade used for manual opens");
  mock.timers.reset();
});
