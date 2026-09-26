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

  // Resolved chatbotId once GET /bot/v1/company reports widgetEngineVersion
  // "v1" for this company. Stays null (legacy) for every chatbot that
  // hasn't been explicitly flipped by an admin — which today means both
  // real production chatbots render exactly as before, with zero added
  // delay, since the branch below defaults to legacy and only swaps the
  // tree if this resolver later confirms "v1".
  const [v1ChatbotId, setV1ChatbotId] = useState(null);

  useEffect(() => {
    window.NUFORMLY_CONFIG = {
      companyId,
    };

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
  }, [companyId]);

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
