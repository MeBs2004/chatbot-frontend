import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";

import Bot from "../component/Bot";
import OyaBot from "../component/OyaBot";
import NuformlyWidget from "../components/NuformlyWidget/NuformlyWidget";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export default function Embed() {
  const [searchParams] = useSearchParams();

  const companyId = searchParams.get("companyId") || "nuform-social";

  // An explicit ?chatbotId= (sent by widget.js's data-chatbot-id,
  // generated on each chatbot's own Installation page) always wins —
  // unambiguous regardless of how many chatbots this company has.
  // Without it, fall back to resolving via GET /bot/v1/company, which
  // only ever confirms "v1" when it can resolve to exactly ONE
  // chatbot for the company — correct for today's real installs
  // (Nuform Social, OYA), ambiguous the moment a company has a second
  // chatbot, which is exactly why new chatbots get an explicit id.
  const explicitChatbotId = searchParams.get("chatbotId") || null;
  const [v1ChatbotId, setV1ChatbotId] = useState(explicitChatbotId);

  useEffect(() => {
    window.NUFORMLY_CONFIG = {
      companyId,
    };

    if (explicitChatbotId) {
      return () => {
        delete window.NUFORMLY_CONFIG;
      };
    }

    let cancelled = false;

    axios
      .get(`${BACKEND_URL}bot/v1/company`, {
        headers: { "x-company-id": companyId },
      })
      .then((res) => {
        if (cancelled) return;
        if (
          res.data?.success &&
          res.data.widgetEngineVersion === "v1" &&
          res.data.chatbotId
        ) {
          setV1ChatbotId(res.data.chatbotId);
        }
      })
      .catch(() => {
        // Any failure (network, 404, malformed response) silently keeps
        // the legacy widget rendering — never blocks or breaks it.
      });

    return () => {
      cancelled = true;
      delete window.NUFORMLY_CONFIG;
    };
  }, [companyId, explicitChatbotId]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        margin: 0,
        padding: 0,
        overflow: "hidden",
        background: "transparent",
      }}
    >
      {v1ChatbotId ? (
        <NuformlyWidget companyId={companyId} chatbotId={v1ChatbotId} embed={true} />
      ) : companyId === "oya-gemkara" ? (
        <OyaBot embed={true} />
      ) : (
        <Bot embed={true} />
      )}
    </div>
  );
}
