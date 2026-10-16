// POST /api/widget/session from the customer's page. Resolves null on
// ANY failure (network, 4xx/5xx, bad JSON, paused chatbot) — the
// widget must never throw into the host page.
export async function fetchSession(apiBase, chatbotId, fetchImpl = fetch) {
  try {
    const res = await fetchImpl(`${apiBase}api/widget/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatbotId }),
    });
    if (!res.ok) return null;
    const body = await res.json();
    if (!body || !body.available || !body.token) return null;
    return { token: body.token, expiresAt: body.expiresAt, chatbot: body.chatbot, config: body.config };
  } catch {
    return null;
  }
}
