import { useEffect, useState } from "react";
import { getMarketingWidgetConfig, createMarketingLead } from "./widgetApi.js";

// ======================================================
// Digital Marketing template's lead-capture CTA: a pill below the
// suggestion chips that opens an inline "Request a Quote" form,
// mirroring EducationSuggestions.jsx's LeadForm. Only renders once
// the chatbot's published config says lead capture is actually
// enabled — never shown as a dead/no-op button.
// ======================================================
export default function MarketingLeadCapture({ client, chatbotId, onSubmitted, primaryColor = "#5B21B6" }) {
  const [cfg, setCfg] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMarketingWidgetConfig(client, chatbotId)
      .then((res) => { if (!cancelled) setCfg(res); })
      .catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatbotId]);

  if (!cfg || !cfg.leadCaptureEnabled) return null;

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-gray-400">You might be interested in:</span>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm transition-transform hover:scale-[1.03]"
          style={{ background: primaryColor }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-white/80" /> {cfg.ctaLabel}
        </button>
      </div>

      {open && (
        <LeadForm
          client={client}
          chatbotId={chatbotId}
          requiredFields={cfg.requiredFields}
          primaryColor={primaryColor}
          ctaLabel={cfg.ctaLabel}
          onClose={() => setOpen(false)}
          onSubmitted={(referenceId) => {
            setOpen(false);
            onSubmitted({
              question: cfg.ctaLabel,
              answer: `Thanks! We've got your details (reference ${referenceId}) and our team will reach out to you shortly.`,
            });
          }}
        />
      )}
    </div>
  );
}

const FIELD_META = {
  name: { placeholder: "Your name", type: "text" },
  email: { placeholder: "Email", type: "email" },
  phone: { placeholder: "Phone number", type: "text" },
  companyName: { placeholder: "Company name", type: "text" },
  website: { placeholder: "Website", type: "text" },
  budget: { placeholder: "Marketing budget (optional)", type: "text" },
  timeline: { placeholder: "Project timeline (optional)", type: "text" },
};

function LeadForm({ client, chatbotId, requiredFields, primaryColor, ctaLabel, onClose, onSubmitted }) {
  const fields = (requiredFields?.length ? requiredFields : ["name", "phone"]).filter((f) => FIELD_META[f]);
  const [form, setForm] = useState(Object.fromEntries(fields.map((f) => [f, ""])));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name?.trim?.() && fields.includes("name")) {
      setError("Please share your name.");
      return;
    }
    if (fields.includes("phone") || fields.includes("email")) {
      if (!form.phone?.trim?.() && !form.email?.trim?.()) {
        setError("Please share a phone number or email so we can follow up.");
        return;
      }
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await createMarketingLead(client, chatbotId, form);
      onSubmitted(res.lead.referenceId);
    } catch (err) {
      setError(err?.response?.data?.message || "Couldn't submit — please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-3 animate-[fadeIn_0.2s_ease] rounded-2xl border border-gray-100 bg-white p-3.5 shadow-md">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[12px] font-semibold text-gray-800">{ctaLabel}</p>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>
      <div className="flex flex-col gap-2">
        {fields.map((f) => (
          <input
            key={f}
            type={FIELD_META[f].type}
            value={form[f] || ""}
            onChange={(e) => setForm((p) => ({ ...p, [f]: e.target.value }))}
            placeholder={FIELD_META[f].placeholder}
            className="rounded-lg border border-gray-200 px-3 py-2 text-[12px] outline-none focus:border-violet-400"
          />
        ))}
      </div>
      {error && <p className="mt-2 text-[11px] text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="mt-3 w-full rounded-lg py-2 text-[12px] font-semibold text-white transition-opacity disabled:opacity-60"
        style={{ background: primaryColor }}
      >
        {submitting ? "Submitting…" : "Submit"}
      </button>
    </form>
  );
}
