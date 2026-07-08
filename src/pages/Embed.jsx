import React, { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

import Bot from "../component/Bot";
import OyaBot from "../component/OyaBot";

export default function Embed() {
  const [searchParams] = useSearchParams();

  const companyId =
    searchParams.get("companyId") || "nuform-social";

  useEffect(() => {
    window.NUFORMLY_CONFIG = {
      companyId,
    };

    return () => {
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
      {companyId === "oya-gemkara" ? (
        <OyaBot embed />
      ) : (
        <Bot embed />
      )}
    </div>
  );
}