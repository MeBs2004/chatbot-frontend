// Rich "Bill of materials" chat card for the Energy journey — rendered
// as a chat message once a solution is generated (see
// NuformlyWidget.jsx's handleCalculatorResult / EnergyJourneyPanel's
// generateSolution), instead of the old plain name/qty list.
export default function BomTable({ context, lines, requiresEngineeringReview, onShowVendors, primaryColor }) {
  const subtitle = [context?.fuelLabel, context?.projectTypeLabel].filter(Boolean).join(" · ");
  const specOf = (l) => [l.specs && typeof l.specs === "object" ? Object.values(l.specs).filter(Boolean).join(", ") : l.specs, l.manufacturer, l.modelNumber].filter(Boolean).join(" · ") || l.category || "—";
  const suppliedByOf = (l) => l.manufacturer || context?.companyName || "—";

  return (
    <div className="rounded-[12px] border border-gray-200 bg-white overflow-hidden text-[12px] max-w-full">
      <div className="px-3 py-2.5 border-b border-gray-100 bg-gray-50">
        <p className="text-[13px] font-semibold text-gray-900">Bill of materials</p>
        {subtitle && <p className="text-[11px] text-gray-500 mt-0.5">{subtitle}</p>}
      </div>

      {requiresEngineeringReview && (
        <p className="text-[11px] text-amber-700 bg-amber-50 px-3 py-1.5">⚠ Parts of this result need engineering review before it's final.</p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left text-[11px] text-gray-400 border-b border-gray-100">
              <th className="px-3 py-1.5 font-medium">Item</th>
              <th className="px-3 py-1.5 font-medium">Specification</th>
              <th className="px-3 py-1.5 font-medium">Supplied by</th>
              <th className="px-3 py-1.5 font-medium text-right">Qty</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i} className="border-b border-gray-50 last:border-0 align-top">
                <td className="px-3 py-1.5 text-gray-800 font-medium">
                  {l.name} {!l.mandatory && <span className="text-gray-400 font-normal">(optional)</span>} {l.requiresEngineeringReview && "⚠"}
                </td>
                <td className="px-3 py-1.5 text-gray-500">{specOf(l)}</td>
                <td className="px-3 py-1.5">
                  <span className="inline-block rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                    {suppliedByOf(l)}
                  </span>
                </td>
                <td className="px-3 py-1.5 text-right text-gray-700 whitespace-nowrap">
                  {l.qty ?? "—"} {l.unit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-t border-gray-100 bg-gray-50">
        <p className="text-[10px] text-gray-400 leading-snug">
          Indicative BOM. Final specifications are confirmed after a site survey.
        </p>
        {onShowVendors && (
          <button
            onClick={onShowVendors}
            className="shrink-0 text-[11px] font-semibold text-white rounded-full px-3 py-1.5 whitespace-nowrap"
            style={{ background: primaryColor || "#10b981" }}
          >
            Show vendors by location →
          </button>
        )}
      </div>
    </div>
  );
}
