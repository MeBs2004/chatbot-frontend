import React from "react";
import { useSearchParams } from "react-router-dom";

import Bot from "../component/Bot";
import OyaBot from "../component/OyaBot";

export default function Embed() {
  const [searchParams] = useSearchParams();

  const companyId = searchParams.get("companyId");

  if (companyId === "oya-gemkara") {
    return <OyaBot />;
  }

  return <Bot />;
}
