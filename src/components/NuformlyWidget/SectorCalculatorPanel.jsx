import { useState } from "react";
import { FaArrowLeft } from "react-icons/fa";
import { runCalculation } from "./widgetApi.js";

// Deterministic calculators — this component never calls the AI. It
// posts raw numbers to a real backend endpoint
// (services/sectors/marketingCalculator.service.js /
// energyBomCalculator.service.js) and renders exactly what comes
// back. No value here is invented client-side.

const MARKETING_FIELDS = {
  roi: [{ key: "revenue", label: "Revenue" }, { key: "cost", label: "Cost" }],
  roas: [{ key: "revenue", label: "Revenue" }, { key: "spend", label: "Ad Spend" }],
  cpc: [{ key: "spend", label: "Ad Spend" }, { key: "clicks", label: "Clicks" }],
  cpm: [{ key: "spend", label: "Ad Spend" }, { key: "impressions", label: "Impressions" }],
  ctr: [{ key: "clicks", label: "Clicks" }, { key: "impressions", label: "Impressions" }],
  conversion_rate: [
    { key: "conversions", label: "Conversions" },
    { key: "denominator", label: "Visits or Clicks" },
  ],
  cpl: [{ key: "spend", label: "Ad Spend" }, { key: "leads", label: "Leads" }],
  cpa: [{ key: "spend", label: "Ad Spend" }, { key: "actions", label: "Conversions / Actions" }],
  cac: [{ key: "totalAcquisitionCost", label: "Total Acquisition Cost" }, { key: "newCustomers", label: "New Customers" }],
  engagement_rate: [{ key: "engagements", label: "Engagements (likes+comments+shares)" }, { key: "reachOrFollowers", label: "Reach or Followers" }],
  leads_from_budget: [{ key: "budget", label: "Budget" }, { key: "costPerLead", label: "Cost per Lead" }],
  budget_from_leads: [{ key: "targetLeads", label: "Target Leads" }, { key: "costPerLead", label: "Cost per Lead" }],
  // Combined view — every field is optional ("fill what you have"):
  // the backend computes whichever metrics it has enough inputs for
  // and skips the rest, rather than requiring one fixed pair.
  performance_analysis: [
    { key: "revenue", label: "Revenue (optional)" },
    { key: "cost", label: "Total Cost (optional)" },
    { key: "spend", label: "Ad Spend (optional)" },
    { key: "clicks", label: "Clicks (optional)" },
    { key: "impressions", label: "Impressions (optional)" },
    { key: "leads", label: "Leads (optional)" },
    { key: "actions", label: "Conversions / Actions (optional)" },
    { key: "conversions", label: "Conversions, for conversion rate (optional)" },
    { key: "denominator", label: "Visits or Clicks, for conversion rate (optional)" },
    { key: "totalAcquisitionCost", label: "Total Acquisition Cost (optional)" },
    { key: "newCustomers", label: "New Customers (optional)" },
    { key: "engagements", label: "Engagements (optional)" },
    { key: "reachOrFollowers", label: "Reach or Followers (optional)" },
  ],
};

const MARKETING_LABELS = {
  roi: "ROI",
  roas: "ROAS",
  cpc: "CPC",
  cpm: "CPM",
  ctr: "CTR",
  conversion_rate: "Conversion Rate",
  cpl: "CPL",
  cpa: "CPA",
  cac: "CAC",
  engagement_rate: "Engagement Rate",
  leads_from_budget: "Estimated Leads from Budget",
  budget_from_leads: "Estimated Budget from Target Leads",
  performance_analysis: "Marketing ROI / Performance Analysis",
};

const ENERGY_FIELDS = [
  { key: "dailyLoadWh", label: "Daily energy use (Wh)" },
  { key: "autonomyDays", label: "Backup days needed", default: 1 },
  { key: "systemVoltageV", label: "Battery system voltage (V)", default: 12 },
  { key: "panelWattageW", label: "Solar panel wattage (W)", default: 330 },
  { key: "peakSunHours", label: "Peak sun hours/day", default: 5 },
  { key: "batteryAhCapacity", label: "Battery capacity (Ah)", default: 100 },
  { key: "depthOfDischarge", label: "Depth of discharge (0-1)", default: 0.5 },
  { key: "inverterSafetyFactor", label: "Inverter safety factor", default: 1.25 },
  { key: "peakLoadW", label: "Peak load (W, optional)" },
];

function formatCalculatorMessage(kind, data) {
  if (kind === "marketing" && data.result?.isAnalysis) {
    const { metrics, computedCount, note } = data.result;
    if (computedCount === 0) return `**Marketing ROI / Performance Analysis**\n\n${note}`;
    const lines = ["**Marketing ROI / Performance Analysis**", ""];
    Object.entries(metrics).forEach(([key, m]) => {
      const label = MARKETING_LABELS[key] || key;
      lines.push(`**${label}**: ${m.value === null ? "unavailable" : `${m.value} ${m.unit}`}${m.benchmark ? ` — _${m.benchmark}_` : ""}`);
    });
    lines.push("", `_${note}_`);
    return lines.join("\n");
  }

  if (kind === "marketing") {
    const { calculation, result } = data;
    const label = MARKETING_LABELS[calculation] || calculation;
    const lines = [
      `**${label}**`,
      result.value === null ? "Result: unavailable" : `Result: **${result.value} ${result.unit}**`,
      `Formula: ${result.formula}`,
    ];
    if (result.warnings?.length) lines.push(...result.warnings.map((w) => `⚠️ ${w}`));
    lines.push("_Estimate only — not a guarantee of campaign performance._");
    return lines.join("\n\n");
  }

  const { bom, assumptions, warnings } = data.result;
  const lines = [
    "**Estimated Bill of Materials**",
    `Solar panels: **${bom.solarPanels.quantity}× ${bom.solarPanels.unitWattage}W** (${bom.solarPanels.totalArrayWattage}W total)`,
    `Battery bank: **${bom.batteryBank.quantity}× ${bom.batteryBank.unitAh}Ah** at ${bom.batteryBank.systemVoltageV}V (${bom.batteryBank.totalBankAh}Ah total)`,
    `Inverter: **${bom.inverter.ratingVA} VA**`,
  ];
  if (assumptions?.length) lines.push("Assumptions:", ...assumptions.map((a) => `• ${a}`));
  if (warnings?.length) lines.push(...warnings.map((w) => `⚠️ ${w}`));
  return lines.join("\n\n");
}

// `api` is the chat iframe's widget client (createWidgetClient), so
// calculator calls carry the widget token like every other request.
export default function SectorCalculatorPanel({ api, chatbotId, template, primaryColor, onResult, onClose }) {
  const isMarketing = template === "digital_marketing";
  const [calculation, setCalculation] = useState("roi");
  const [values, setValues] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const fields = isMarketing ? MARKETING_FIELDS[calculation] : ENERGY_FIELDS;

  const setField = (key, raw) => setValues((v) => ({ ...v, [key]: raw === "" ? undefined : Number(raw) }));

  const handleSubmit = async () => {
    setError("");
    setBusy(true);
    try {
      if (isMarketing) {
        const data = await runCalculation(api, chatbotId, "marketing", { calculation, inputs: values });
        onResult(formatCalculatorMessage("marketing", data));
      } else {
        const payload = { ...values };
        ENERGY_FIELDS.forEach((f) => {
          if (payload[f.key] === undefined && f.default !== undefined) payload[f.key] = f.default;
        });
        const data = await runCalculation(api, chatbotId, "energy-bom", payload);
        onResult(formatCalculatorMessage("energy", data));
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Could not run this calculation. Check your inputs and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto px-4 py-4">
      <button
        onClick={onClose}
        className="mb-3 flex items-center gap-1.5 text-[12px] font-medium text-gray-500 hover:text-gray-700"
      >
        <FaArrowLeft size={10} /> Back to chat
      </button>

      <h3 className="mb-3 text-[13.5px] font-semibold text-gray-800">
        {isMarketing ? "Marketing Calculator" : "BOM Calculator"}
      </h3>

      {isMarketing && (
        <select
          value={calculation}
          onChange={(e) => {
            setCalculation(e.target.value);
            setValues({});
          }}
          className="mb-3 w-full rounded-[10px] border border-gray-200 px-3 py-2 text-[13px] outline-none"
        >
          {Object.keys(MARKETING_FIELDS).map((k) => (
            <option key={k} value={k}>
              {MARKETING_LABELS[k]}
            </option>
          ))}
        </select>
      )}

      <div className="space-y-2">
        {fields.map((f) => (
          <div key={f.key}>
            <label className="mb-1 block text-[11px] font-medium text-gray-500">{f.label}</label>
            <input
              type="number"
              step="any"
              defaultValue={f.default ?? ""}
              onChange={(e) => setField(f.key, e.target.value)}
              className="w-full rounded-[10px] border border-gray-200 px-3 py-2 text-[13px] outline-none"
            />
          </div>
        ))}
      </div>

      {error && <p className="mt-3 text-[12px] text-red-600">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={busy}
        style={{ backgroundColor: primaryColor }}
        className="mt-4 w-full rounded-[12px] py-2.5 text-[13px] font-semibold text-white disabled:opacity-60"
      >
        {busy ? "Calculating..." : "Calculate"}
      </button>
    </div>
  );
}
