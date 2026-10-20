// Bundled by tests/widgetOptions.test.mjs. Mounts the REAL
// NuformlyWidget chat window in jsdom with a mocked API, so each
// customization option can be checked against what visitors get.
import { createElement, act } from "react";
import { createRoot } from "react-dom/client";
import axios from "axios";
import NuformlyWidget from "../../src/components/NuformlyWidget/NuformlyWidget.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const tick = (ms = 0) => act(async () => { await new Promise((r) => setTimeout(r, ms)); });

export const calls = [];
let pendingMessage = null;

export function installApi({ config, messageReply = "Hello from the bot" }) {
  calls.length = 0;
  pendingMessage = null;
  axios.defaults.adapter = (cfg) =>
    new Promise((resolve, reject) => {
      const url = cfg.url || "";
      const ok = (data) => resolve({ data, status: 200, statusText: "OK", headers: {}, config: cfg });
      calls.push({ method: (cfg.method || "get").toUpperCase(), url, data: cfg.data });
      if (url.includes("api/widget/config/")) {
        return ok({ success: true, available: true, chatbot: { id: "b1", name: "Acme Bot", companyName: "Acme Inc", template: "general" }, config });
      }
      if (url.includes("bot/v1/suggestions")) return ok({ success: true, suggestions: ["Pricing?", "Hours?"] });
      if (url.includes("bot/v1/message")) {
        if (messageReply === "__fail__") return reject(Object.assign(new Error("boom"), { config: cfg, response: { status: 500, data: {} } }));
        if (messageReply === "__pending__") {
          pendingMessage = () => ok({ success: true, botMessage: "late reply" });
          return undefined;
        }
        return ok({ success: true, botMessage: messageReply });
      }
      return ok({ success: true });
    });
}

export const releaseMessage = () => pendingMessage?.();

const setValue = (input, value) => {
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(input, value);
  input.dispatchEvent(new window.Event("input", { bubbles: true }));
};

/**
 * scenario: { history?: messages[], send?: "now"|"pending", formDone?: bool, fillForm?: {field:value} }
 * Returns { html, container, unmount }.
 */
export async function mountWidget(config, scenario = {}) {
  localStorage.clear();
  if (scenario.history) localStorage.setItem("nuformly_v1_chat_history_b1", JSON.stringify(scenario.history));
  if (scenario.formDone) localStorage.setItem("nuformly_v1_form_b1", "1");
  localStorage.setItem("visitorId", "visitor-1");
  installApi({ config, messageReply: scenario.send === "pending" ? "__pending__" : scenario.send === "fail" ? "__fail__" : "Hello from the bot" });
  Object.defineProperty(navigator, "onLine", { value: !scenario.offline, configurable: true });

  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(createElement(NuformlyWidget, { companyId: "acme", chatbotId: "b1", embed: true }));
  });
  for (let i = 0; i < 4; i += 1) await tick(0);

  if (scenario.scrolled) {
    // Pretend the visitor scrolled up: the "Latest" shortcut then appears.
    const main = container.querySelector("main");
    Object.defineProperty(main, "scrollHeight", { value: 1000, configurable: true });
    Object.defineProperty(main, "clientHeight", { value: 100, configurable: true });
    Object.defineProperty(main, "scrollTop", { value: 0, configurable: true });
    await act(async () => main.dispatchEvent(new window.Event("scroll", { bubbles: true })));
  }
  if (scenario.listen) {
    const listen = [...container.querySelectorAll("button")].find((b) => /Listen|सुनें/.test(b.textContent));
    await act(async () => listen?.click());
    for (let i = 0; i < 3; i += 1) await tick(0);
  }
  if (scenario.mic) {
    await act(async () => container.querySelector('button[aria-label="Start voice input"]')?.click());
    for (let i = 0; i < 2; i += 1) await tick(0);
  }
  if (scenario.typed) {
    await act(async () => setValue(container.querySelector('input[aria-label="Type a message"]'), scenario.typed));
  }
  if (scenario.send) {
    const input = container.querySelector('input[aria-label="Type a message"]');
    await act(async () => setValue(input, "hello there"));
    await act(async () => container.querySelector('button[aria-label="Send message"]').click());
    for (let i = 0; i < 3; i += 1) await tick(0);
  }
  return {
    get html() {
      return container.innerHTML;
    },
    container,
    async unmount() {
      await act(async () => root.unmount());
      container.remove();
    },
  };
}

export { act, tick, setValue };
