import { useState } from "react";

// The pre-chat form (config.forms): collects only the fields the admin
// enabled before the visitor can chat. "classic" shows every field at
// once; "conversational" asks one at a time. Every enabled field is
// required — the config has no per-field optional flag.
const FIELDS = {
  name: { label: "Name", type: "text", placeholder: "Jane Doe", autoComplete: "name" },
  email: { label: "Email", type: "email", placeholder: "jane@company.com", autoComplete: "email" },
  phone: { label: "Phone", type: "tel", placeholder: "+1 555 000 1234", autoComplete: "tel" },
  company: { label: "Company", type: "text", placeholder: "Acme Inc.", autoComplete: "organization" },
};
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function problem(field, value) {
  const v = (value || "").trim();
  if (!v) return `${FIELDS[field].label} is required.`;
  if (field === "email" && !EMAIL_RE.test(v)) return "Enter a valid email address.";
  if (field === "phone" && !/^[0-9+()\-\s.]{5,40}$/.test(v)) return "Enter a valid phone number.";
  return "";
}

export default function PreChatForm({ fields, style, look, onSubmit, texts = {} }) {
  const label = { title: texts.title || "Before we start", subtitle: texts.subtitle || "A few details so we can help you faster.", button: texts.button || "Start Chat" };
  const ordered = (fields || []).filter((f) => FIELDS[f]);
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(0);

  const inputBg = look.dark ? "#0f1512" : "#ffffff";
  const inputStyle = { background: inputBg, borderColor: look.border, color: look.baseText };
  const f = look.form;
  const button = { background: look.primary, color: look.sendText, minHeight: f.buttonHeight, fontSize: f.fontSize };
  const fieldStyle = { ...inputStyle, minHeight: f.fieldHeight, fontSize: f.fontSize };

  const set = (f, v) => {
    setValues((p) => ({ ...p, [f]: v }));
    if (errors[f]) setErrors((p) => ({ ...p, [f]: "" }));
  };

  if (ordered.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-[13px]">Let&apos;s get started.</p>
        <button type="button" onClick={() => onSubmit({})} className="rounded-full px-5 font-semibold" style={button}>
          {label.button}
        </button>
      </div>
    );
  }

  if (style === "conversational") {
    const field = ordered[step];
    const meta = FIELDS[field];
    const last = step === ordered.length - 1;
    const next = () => {
      const err = problem(field, values[field]);
      if (err) return setErrors((p) => ({ ...p, [field]: err }));
      if (last) onSubmit(values);
      else setStep((s) => s + 1);
    };
    return (
      <div className="h-full flex flex-col justify-center gap-4 px-5">
        <div className="rounded-2xl px-4 py-3 text-[13px]" style={{ background: look.botBubble, color: look.botText }}>
          What&apos;s your {meta.label.toLowerCase()}?
        </div>
        <div>
          <input
            key={field}
            autoFocus
            type={meta.type}
            autoComplete={meta.autoComplete}
            value={values[field] || ""}
            onChange={(e) => set(field, e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && next()}
            placeholder={meta.placeholder}
            aria-label={meta.label}
            className="w-full rounded-lg border px-3 outline-none"
            style={fieldStyle}
          />
          {errors[field] && <p className="mt-1 text-[11px] text-red-500">{errors[field]}</p>}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] opacity-50">
            {step + 1} / {ordered.length}
          </span>
          <button type="button" onClick={next} className="rounded-full px-4 font-semibold" style={button}>
            {last ? label.button : "Next"}
          </button>
        </div>
      </div>
    );
  }

  const submit = (e) => {
    e.preventDefault();
    const found = {};
    ordered.forEach((f) => {
      const err = problem(f, values[f]);
      if (err) found[f] = err;
    });
    setErrors(found);
    if (Object.keys(found).length === 0) onSubmit(values);
  };

  return (
    <form onSubmit={submit} noValidate className="h-full overflow-y-auto flex flex-col justify-center gap-3.5 px-5 py-4">
      <div>
        <h3 className="text-[14px] font-semibold">{label.title}</h3>
        <p className="mt-0.5 text-[12px] opacity-60">{label.subtitle}</p>
      </div>
      {ordered.map((f) => (
        <label key={f} className="block">
          <span className="mb-1 block text-[12px] font-medium">
            {FIELDS[f].label} <span className="text-red-500">*</span>
          </span>
          <input
            type={FIELDS[f].type}
            autoComplete={FIELDS[f].autoComplete}
            value={values[f] || ""}
            onChange={(e) => set(f, e.target.value)}
            placeholder={FIELDS[f].placeholder}
            className="w-full rounded-lg border px-3 outline-none"
            style={fieldStyle}
          />
          {errors[f] && <p className="mt-1 text-[11px] text-red-500">{errors[f]}</p>}
        </label>
      ))}
      <button type="submit" className="mt-1 rounded-full font-semibold" style={button}>
        {label.button}
      </button>
    </form>
  );
}
