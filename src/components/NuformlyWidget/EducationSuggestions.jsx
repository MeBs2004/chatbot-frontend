import { useEffect, useState } from "react";
import { getEducationCategories, getEducationFaqs, createEducationLead } from "./widgetApi.js";

// ======================================================
// Education template's ShikshaGPT-style experience: a category tab
// bar above a scrollable list of suggested questions, and a "Get Free
// Counselling" pill that opens an inline lead-capture form. Replaces
// the generic flat suggestion-chip list for Education chatbots only
// (see NuformlyWidget.jsx's `template === "education"` branch).
//
// Clicking a question pushes the REAL stored FAQ answer verbatim via
// `onAnswer` — never routed through the generic AI as plain text (the
// exact bug class the Energy "Bill of Materials" chip had before it
// was fixed: a chip that looks structured must resolve to real data).
// ======================================================
export default function EducationSuggestions({ client, chatbotId, onAnswer, primaryColor = "#1D4ED8" }) {
  const [categories, setCategories] = useState([]);
  const [ctaLabel, setCtaLabel] = useState("Get Free Counselling");
  const [activeCategory, setActiveCategory] = useState("all");
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [leadOpen, setLeadOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [catRes, faqRes] = await Promise.all([getEducationCategories(client, chatbotId), getEducationFaqs(client, chatbotId)]);
        if (cancelled) return;
        setCategories(catRes.categories || []);
        setCtaLabel(catRes.counsellingCtaLabel || "Get Free Counselling");
        setFaqs(faqRes.faqs || []);
      } catch {
        // Fails quietly — the normal chat input still works even if this enrichment can't load.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatbotId]);

  if (loading) return null;
  if (categories.length === 0 && faqs.length === 0) return null;

  const visibleFaqs = activeCategory === "all" ? faqs : faqs.filter((f) => f.categoryKey === activeCategory);
  const categoryLabel = (key) => categories.find((c) => c.key === key)?.label || key;

  return (
    <div className="mt-3 animate-[fadeIn_0.25s_ease]">
      {categories.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          <button
            onClick={() => setActiveCategory("all")}
            className="shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all"
            style={activeCategory === "all" ? { background: primaryColor, color: "#fff" } : { background: "#F3F4F6", color: "#374151" }}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c.key}
              onClick={() => setActiveCategory(c.key)}
              className="shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all"
              style={activeCategory === c.key ? { background: primaryColor, color: "#fff" } : { background: "#F3F4F6", color: "#374151" }}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {visibleFaqs.length > 0 && (
        <div className="mt-2 flex flex-col gap-1.5">
          {visibleFaqs.map((f, i) => (
            <button
              key={f._id || i}
              onClick={() => onAnswer({ question: f.question, answer: f.answer, categoryLabel: categoryLabel(f.categoryKey) })}
              className="rounded-xl border border-gray-100 bg-white px-3 py-2 text-left text-[12px] text-gray-700 shadow-sm transition-all hover:-translate-y-[1px] hover:shadow-md"
              style={{ animation: `fadeIn 0.2s ease ${i * 0.03}s both` }}
            >
              {f.question}
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        <span className="text-[11px] text-gray-400">You might be interested in:</span>
        <button
          onClick={() => setLeadOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm transition-transform hover:scale-[1.03]"
          style={{ background: primaryColor }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-white/80" /> {ctaLabel}
        </button>
      </div>

      {leadOpen && (
        <LeadForm
          client={client}
          chatbotId={chatbotId}
          primaryColor={primaryColor}
          onClose={() => setLeadOpen(false)}
          onSubmitted={(referenceId) => {
            setLeadOpen(false);
            onAnswer({
              question: ctaLabel,
              answer: `Thanks! We've got your details (reference ${referenceId}) and a counsellor will reach out to you shortly.`,
              categoryLabel: "",
            });
          }}
        />
      )}
    </div>
  );
}

function LeadForm({ client, chatbotId, primaryColor, onClose, onSubmitted }) {
  const [form, setForm] = useState({ name: "", phone: "", email: "", courseInterest: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || (!form.phone.trim() && !form.email.trim())) {
      setError("Please share your name and a phone number or email.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await createEducationLead(client, chatbotId, form);
      onSubmitted(res.lead.referenceId);
    } catch (err) {
      setError(err?.response?.data?.message || "Couldn't submit — please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="mt-3 animate-[fadeIn_0.2s_ease] rounded-2xl border border-gray-100 bg-white p-3.5 shadow-md"
    >
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[12px] font-semibold text-gray-800">Get Free Counselling</p>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>
      <div className="flex flex-col gap-2">
        <input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Your name"
          className="rounded-lg border border-gray-200 px-3 py-2 text-[12px] outline-none focus:border-blue-400"
        />
        <input
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          placeholder="Phone number"
          className="rounded-lg border border-gray-200 px-3 py-2 text-[12px] outline-none focus:border-blue-400"
        />
        <input
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          placeholder="Email (optional if phone given)"
          className="rounded-lg border border-gray-200 px-3 py-2 text-[12px] outline-none focus:border-blue-400"
        />
        <input
          value={form.courseInterest}
          onChange={(e) => setForm((f) => ({ ...f, courseInterest: e.target.value }))}
          placeholder="Course you're interested in (optional)"
          className="rounded-lg border border-gray-200 px-3 py-2 text-[12px] outline-none focus:border-blue-400"
        />
      </div>
      {error && <p className="mt-2 text-[11px] text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="mt-3 w-full rounded-lg py-2 text-[12px] font-semibold text-white transition-opacity disabled:opacity-60"
        style={{ background: primaryColor }}
      >
        {submitting ? "Submitting…" : "Request a callback"}
      </button>
    </form>
  );
}
