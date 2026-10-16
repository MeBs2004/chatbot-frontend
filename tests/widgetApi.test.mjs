import { test } from "node:test";
import assert from "node:assert/strict";
import { setupDom } from "./helpers/dom.mjs";
import { createWidgetClient, requestTokenFromParent } from "../src/components/NuformlyWidget/widgetApi.js";

// Fake axios adapter: records each request, answers from a queue.
function fakeAdapter(responses) {
  const seen = [];
  const adapter = async (config) => {
    seen.push({ url: config.url, token: config.headers["x-widget-token"] ?? null, company: config.headers["x-company-id"] ?? null });
    const next = responses.shift();
    const response = { data: next.data, status: next.status, statusText: "", headers: {}, config };
    if (next.status >= 400) {
      const err = new Error(`HTTP ${next.status}`);
      err.response = response;
      err.config = config;
      err.isAxiosError = true;
      throw err;
    }
    return response;
  };
  return { adapter, seen };
}

test("sends x-widget-token when present and omits it when null", async () => {
  const { adapter, seen } = fakeAdapter([{ status: 200, data: { ok: 1 } }, { status: 200, data: { ok: 2 } }]);
  let token = "abc";
  const client = createWidgetClient({ baseURL: "https://api.test/", getToken: () => token, requestToken: async () => null });
  client.defaults.adapter = adapter;
  await client.get("bot/v1/suggestions");
  token = null;
  await client.get("bot/v1/suggestions");
  assert.deepEqual(seen.map((s) => s.token), ["abc", null]);
});

test("retries once after WIDGET_TOKEN_EXPIRED", async () => {
  const { adapter, seen } = fakeAdapter([
    { status: 401, data: { code: "WIDGET_TOKEN_EXPIRED" } },
    { status: 200, data: { success: true } },
  ]);
  let token = "old";
  let refreshes = 0;
  const client = createWidgetClient({
    baseURL: "https://api.test/",
    getToken: () => token,
    requestToken: async () => {
      refreshes++;
      token = "new";
      return "new";
    },
  });
  client.defaults.adapter = adapter;
  const res = await client.post("bot/v1/message", { text: "hi" });
  assert.equal(res.data.success, true);
  assert.equal(refreshes, 1);
  assert.deepEqual(seen.map((s) => s.token), ["old", "new"]);
});

test("does not retry on WIDGET_TOKEN_INVALID or when refresh returns null", async () => {
  for (const [code, refreshed] of [["WIDGET_TOKEN_INVALID", "new"], ["WIDGET_TOKEN_EXPIRED", null]]) {
    const { adapter, seen } = fakeAdapter([{ status: 401, data: { code } }, { status: 200, data: {} }]);
    let refreshes = 0;
    const client = createWidgetClient({ baseURL: "https://api.test/", getToken: () => "t", requestToken: async () => (refreshes++, refreshed) });
    client.defaults.adapter = adapter;
    await assert.rejects(client.get("bot/v1/suggestions"), (err) => err.response.status === 401);
    assert.equal(seen.length, 1, code);
  }
});

test("a second expiry after the retry is not retried again", async () => {
  const { adapter, seen } = fakeAdapter([
    { status: 401, data: { code: "WIDGET_TOKEN_EXPIRED" } },
    { status: 401, data: { code: "WIDGET_TOKEN_EXPIRED" } },
  ]);
  const client = createWidgetClient({ baseURL: "https://api.test/", getToken: () => "t", requestToken: async () => "t2" });
  client.defaults.adapter = adapter;
  await assert.rejects(client.get("x"));
  assert.equal(seen.length, 2);
});

test("requestTokenFromParent resolves with the parent's token, ignoring other origins", async () => {
  setupDom();
  const posted = [];
  Object.defineProperty(window, "parent", { value: { postMessage: (m, o) => posted.push([m, o]) }, configurable: true });
  const pending = requestTokenFromParent("https://customer.test", 1000);
  assert.deepEqual(posted, [[{ type: "NUFORMLY_TOKEN_REQUEST" }, "https://customer.test"]]);
  window.dispatchEvent(new window.MessageEvent("message", { data: { type: "NUFORMLY_TOKEN", token: "evil" }, origin: "https://evil.test" }));
  window.dispatchEvent(new window.MessageEvent("message", { data: { type: "NUFORMLY_TOKEN", token: "fresh" }, origin: "https://customer.test" }));
  assert.equal(await pending, "fresh");
});

test("requestTokenFromParent times out with null", async () => {
  setupDom();
  Object.defineProperty(window, "parent", { value: { postMessage() {} }, configurable: true });
  assert.equal(await requestTokenFromParent("https://customer.test", 20), null);
});
