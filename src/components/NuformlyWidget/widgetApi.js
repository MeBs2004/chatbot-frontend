import axios from "axios";

// ======================================================
// API client for the chat iframe. With a widget session token (the
// one-line data-chatbot-id snippet) every request carries
// x-widget-token, and the backend takes the chatbot and company from
// it. When the token expires mid-chat, ask the page that embedded us
// for a fresh one and retry that request once.
// ======================================================

export function createWidgetClient({ baseURL, getToken, requestToken }) {
  const client = axios.create({ baseURL, timeout: 60000 });

  client.interceptors.request.use((config) => {
    const token = getToken();
    if (token) config.headers["x-widget-token"] = token;
    return config;
  });

  client.interceptors.response.use(undefined, async (error) => {
    const { config, response } = error;
    const expired = response?.status === 401 && response.data?.code === "WIDGET_TOKEN_EXPIRED";
    if (!expired || !config || config.__nuformlyRetried) throw error;
    const fresh = await requestToken();
    if (!fresh) throw error;
    config.__nuformlyRetried = true;
    return client.request(config);
  });

  return client;
}

/** Ask the embedding page (widget.js) for a new token; null on timeout. */
export function requestTokenFromParent(parentOrigin, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const onMessage = (event) => {
      if (event.origin !== parentOrigin || event.data?.type !== "NUFORMLY_TOKEN") return;
      cleanup();
      resolve(typeof event.data.token === "string" ? event.data.token : null);
    };
    const timer = setTimeout(() => {
      cleanup();
      resolve(null);
    }, timeoutMs);
    function cleanup() {
      clearTimeout(timer);
      window.removeEventListener("message", onMessage);
    }
    window.addEventListener("message", onMessage);
    window.parent.postMessage({ type: "NUFORMLY_TOKEN_REQUEST" }, parentOrigin);
  });
}

/** Sector calculator call ("marketing" | "energy-bom") via the widget client. */
export async function runCalculation(client, chatbotId, kind, body) {
  const res = await client.post(`api/widget/calculate/${encodeURIComponent(chatbotId)}/${kind}`, body);
  return res.data;
}
