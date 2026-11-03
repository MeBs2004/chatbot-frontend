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

// ---- Energy customer journey (Phase 5) — Phases 1–4's published config, the deterministic solution engine, supplier matching and RFQ creation, all served through /api/widget/energy/*. ----

const energyBase = (chatbotId) => `api/widget/energy/${encodeURIComponent(chatbotId)}`;

export async function getEnergyJourneyConfig(client, chatbotId) {
  return (await client.get(`${energyBase(chatbotId)}/journey/config`)).data;
}
export async function getEnergyJourneyOfferings(client, chatbotId, fuelKey, track) {
  return (await client.get(`${energyBase(chatbotId)}/journey/offerings`, { params: { fuelKey, ...track } })).data;
}
export async function getEnergyJourneyQuestions(client, chatbotId, fuelKey, projectTypeId, track) {
  return (await client.get(`${energyBase(chatbotId)}/journey/questions`, { params: { fuelKey, projectTypeId, ...track } })).data;
}
export async function generateEnergyJourneySolution(client, chatbotId, body) {
  return (await client.post(`${energyBase(chatbotId)}/journey/generate`, body)).data;
}
export async function getEnergySupplierMatches(client, chatbotId, body) {
  return (await client.post(`${energyBase(chatbotId)}/suppliers/match`, body)).data;
}
export async function createEnergyEnquiry(client, chatbotId, body) {
  return (await client.post(`${energyBase(chatbotId)}/enquiries`, body)).data;
}

// ---- Phase 5.1: AI assistance, human handoff, real file upload during the journey ----

/** A one-off explainer question — never advances/changes journey state itself. */
export async function askEnergyJourneyQuestion(client, chatbotId, question, context, track) {
  return (await client.post(`${energyBase(chatbotId)}/journey/ask`, { question, context, ...track })).data;
}

export async function requestEnergyJourneyHandoff(client, chatbotId, { visitorId, reason, context, sessionId }) {
  return (await client.post(`${energyBase(chatbotId)}/journey/handoff`, { visitorId, reason, context, sessionId })).data;
}

// ---- Phase 6: Energy analytics event tracking ----

/** Fire-and-forget from the caller's point of view — see CLIENT_TRACKABLE_EVENTS on the backend for the exact allowlist. Never throws into the caller; swallows its own errors. */
export async function trackEnergyJourneyEvent(client, chatbotId, payload) {
  try {
    await client.post(`${energyBase(chatbotId)}/journey/track`, payload);
  } catch {
    // Analytics must never interrupt the visitor's journey.
  }
}

/** Uploads real file bytes for a "file"-type question; returns { fileId, filename, size, contentType }. */
export async function uploadEnergyJourneyFile(client, chatbotId, questionId, visitorId, file, onProgress) {
  const form = new FormData();
  form.append("visitorId", visitorId);
  form.append("file", file);
  const res = await client.post(`${energyBase(chatbotId)}/journey/questions/${encodeURIComponent(questionId)}/upload`, form, {
    onUploadProgress: onProgress ? (evt) => onProgress(evt.total ? Math.round((evt.loaded / evt.total) * 100) : null) : undefined,
  });
  return res.data;
}

// ---- Education — the chatbot's PUBLISHED category/FAQ/course catalog, served through /api/widget/education/*. ----

const educationBase = (chatbotId) => `api/widget/education/${encodeURIComponent(chatbotId)}`;

export async function getEducationCategories(client, chatbotId) {
  return (await client.get(`${educationBase(chatbotId)}/categories`)).data;
}
export async function getEducationFaqs(client, chatbotId, categoryKey) {
  return (await client.get(`${educationBase(chatbotId)}/faqs`, { params: categoryKey ? { categoryKey } : {} })).data;
}
export async function createEducationLead(client, chatbotId, body) {
  return (await client.post(`${educationBase(chatbotId)}/leads`, body)).data;
}

const marketingBase = (chatbotId) => `api/widget/marketing/${encodeURIComponent(chatbotId)}`;

export async function getMarketingWidgetConfig(client, chatbotId) {
  return (await client.get(`${marketingBase(chatbotId)}/config`)).data;
}
export async function createMarketingLead(client, chatbotId, body) {
  return (await client.post(`${marketingBase(chatbotId)}/leads`, body)).data;
}
