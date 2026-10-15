import { useState } from "react";
import axios from "axios";
import { FaArrowLeft } from "react-icons/fa";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

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
  leads_from_budget: [{ key: "budget", label: "Budget" }, { key: "costPerLead", label: "Cost per Lead" }],
  budget_from_leads: [{ key: "targetLeads", label: "Target Leads" }, { key: "costPerLead", label: "Cost per Lead" }],
};

const MARKETING_LABELS = {
  roi: "ROI",
  roas: "ROAS",
  cpc: "CPC",
  cpm: "CPM",
  ctr: "CTR",
  conversion_rate: "Conversion Rate",
  cpl: "CPL",
  leads_from_budget: "Estimated Leads from Budget",
  budget_from_leads: "Estimated Budget from Target Leads",
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

export default function SectorCalculatorPanel({ chatbotId, template, primaryColor, onResult, onClose }) {
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
        const res = await axios.post(`${BACKEND_URL}api/widget/calculate/${chatbotId}/marketing`, {
          calculation,
          inputs: values,
        });
        onResult(formatCalculatorMessage("marketing", res.data));
      } else {
        const payload = { ...values };
        ENERGY_FIELDS.forEach((f) => {
          if (payload[f.key] === undefined && f.default !== undefined) payload[f.key] = f.default;
        });
        const res = await axios.post(`${BACKEND_URL}api/widget/calculate/${chatbotId}/energy-bom`, payload);
        onResult(formatCalculatorMessage("energy", res.data));
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
