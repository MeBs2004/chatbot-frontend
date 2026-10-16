// widget.js entry. Built by vite.widget.config.js into one IIFE file.
//   <script src=".../widget.js" data-chatbot-id="..."> -> config-driven launcher
//   <script src=".../widget.js" data-company-id="...">  -> original launcher, unchanged
import { readAttributes, pickMode } from "./launcherModel.js";
import { startLegacyLauncher } from "./legacyLauncher.js";

(function () {
  if (window.NuformlyWidgetLoaded) return;
  window.NuformlyWidgetLoaded = true;

  // Must be read synchronously: currentScript is null once this
  // script's top-level execution ends.
  const script = document.currentScript;
  if (!script) return;

  const attrs = readAttributes(script);
  const mode = pickMode(attrs);

  if (mode === "dynamic") {
    // Wired up in the config-driven launcher (startDynamicLauncher).
    return;
  }

  // "none" keeps the original default of nuform-social, exactly as the
  // old widget.js did for a snippet with no attributes.
  startLegacyLauncher({
    companyId: attrs.companyId || "nuform-social",
    chatbotId: "",
    position: attrs.position || "right",
    bottom: attrs.bottom,
    side: attrs.side,
  });
})();
