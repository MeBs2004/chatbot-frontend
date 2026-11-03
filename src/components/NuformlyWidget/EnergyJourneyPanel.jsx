import { useEffect, useMemo, useRef, useState } from "react";
import { FaArrowLeft, FaArrowRight, FaCheck, FaRegQuestionCircle, FaHeadset, FaTimes, FaPaperclip } from "react-icons/fa";
import {
  getEnergyJourneyConfig,
  getEnergyJourneyOfferings,
  getEnergyJourneyQuestions,
  generateEnergyJourneySolution,
  getEnergySupplierMatches,
  createEnergyEnquiry,
  askEnergyJourneyQuestion,
  requestEnergyJourneyHandoff,
  uploadEnergyJourneyFile,
  trackEnergyJourneyEvent,
} from "./widgetApi.js";
import BomTable from "./BomTable.jsx";

// ======================================================
// PHASE 5 — the live customer journey, driven entirely by what Phases
// 1–4 actually configured and approved for THIS company/chatbot. No
// fuel, project type, question, equipment or supplier is ever
// hardcoded here — everything comes from the /api/widget/energy/*
// endpoints. The structured flow (not free-text AI) is the mechanism;
// the surrounding chat window still lets the visitor talk to the AI
// at any time (see NuformlyWidget.jsx) — this panel never replaces
// that, it's the same "open the calculator" slot the widget already
// had for other sector tools.
//
// Client-side conditional-question display here is a convenience
// only — the backend (solutionEngine.service.js) independently
// recomputes applicability when actually generating a result, so a
// stale/bypassed client check can never produce a wrong technical
// output.
// ======================================================

const UNKNOWN = "__unknown__";
const STAGES = ["intent", "fuel", "project", "questions", "summary", "solution", "suppliers", "rfq", "confirmation"];

function evaluateDisplayCondition(answers, q) {
  if (!q.dependsOnQuestionId) return true;
  const v = answers[q.dependsOnQuestionId];
  if (q.dependsOnCondition === "not_equals") return v !== q.dependsOnValue;
  if (q.dependsOnCondition === "in") return Array.isArray(q.dependsOnValue) && q.dependsOnValue.includes(v);
  return v === q.dependsOnValue;
}

// Phase 5.1 — a "file" question's answer value is the real uploaded
// file's id (never the browser-supplied filename); `meta` carries
// display info (filename/size) alongside it so the UI never needs to
// re-derive it. Upload happens immediately on file selection so the
// visitor sees progress/success/failure before moving on, and can
// replace the file before final submission.
function FileQuestionInput({ api, chatbotId, visitorId, question, value, meta, onChange, onMetaChange }) {
  const [status, setStatus] = useState("idle"); // idle | uploading | done | error
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  const handleFile = async (file) => {
    if (!file) return;
    setStatus("uploading");
    setProgress(0);
    setErrorMsg("");
    try {
      const result = await uploadEnergyJourneyFile(api, chatbotId, question._id, visitorId, file, setProgress);
      onChange(result.fileId);
      onMetaChange({ filename: result.filename, size: result.size });
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err?.response?.data?.message || "Upload failed. Please try again.");
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      {value && status !== "uploading" ? (
        <div className="flex items-center justify-between gap-2 text-[12px] bg-gray-50 border border-gray-200 rounded-[8px] px-2.5 py-2">
          <span className="flex items-center gap-1.5 text-gray-700 truncate">
            <FaPaperclip size={11} className="flex-shrink-0 text-gray-400" /> {meta?.filename || "File uploaded"}
          </span>
          <label className="text-gray-400 hover:text-gray-600 cursor-pointer flex-shrink-0">
            Replace
            <input type="file" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
          </label>
        </div>
      ) : (
        <label className="flex items-center justify-center gap-2 text-[12px] text-gray-500 border border-dashed border-gray-300 rounded-[8px] px-2.5 py-3 cursor-pointer hover:border-gray-400">
          {status === "uploading" ? `Uploading… ${progress != null ? `${progress}%` : ""}` : "Click to choose a file"}
          <input type="file" className="hidden" disabled={status === "uploading"} onChange={(e) => handleFile(e.target.files?.[0])} />
        </label>
      )}
      {status === "error" && <p className="text-[11px] text-red-500">{errorMsg}</p>}
    </div>
  );
}

function QuestionInput({ question, value, onChange }) {
  const common = "w-full text-[13px] px-2.5 py-2 rounded-[8px] border border-gray-200 outline-none focus:border-gray-400";
  if (question.type === "long_text") return <textarea rows={3} className={common} value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={question.placeholder} />;
  if (question.type === "number" || question.type === "number_unit") {
    return (
      <div className="flex items-center gap-1.5">
        <input type="number" className={common} value={value === UNKNOWN ? "" : value ?? ""} onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))} placeholder={question.placeholder} />
        {question.type === "number_unit" && question.unit && <span className="text-[12px] text-gray-500 flex-shrink-0">{question.unit}</span>}
      </div>
    );
  }
  if (question.type === "dropdown") {
    return (
      <select className={common} value={value || ""} onChange={(e) => onChange(e.target.value)}>
        <option value="" disabled>Select…</option>
        {question.options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  if (question.type === "single_choice") {
    return (
      <div className="flex flex-col gap-1.5">
        {question.options.map((o) => (
          <label key={o} className="flex items-center gap-2 text-[13px] text-gray-700">
            <input type="radio" name={question._id} checked={value === o} onChange={() => onChange(o)} /> {o}
          </label>
        ))}
      </div>
    );
  }
  if (question.type === "multiple_choice") {
    const arr = Array.isArray(value) ? value : [];
    return (
      <div className="flex flex-col gap-1.5">
        {question.options.map((o) => (
          <label key={o} className="flex items-center gap-2 text-[13px] text-gray-700">
            <input type="checkbox" checked={arr.includes(o)} onChange={() => onChange(arr.includes(o) ? arr.filter((x) => x !== o) : [...arr, o])} /> {o}
          </label>
        ))}
      </div>
    );
  }
  if (question.type === "date") return <input type="date" className={common} value={value || ""} onChange={(e) => onChange(e.target.value)} />;
  // "file" is handled by FileQuestionInput (needs api/chatbotId/visitorId to actually upload) — never reached here.
  return <input type="text" className={common} value={value === UNKNOWN ? "" : value || ""} onChange={(e) => onChange(e.target.value)} placeholder={question.placeholder} />;
}

export default function EnergyJourneyPanel({ api, chatbotId, visitorId, primaryColor, onResult, onClose }) {
  const storageKey = `nuformly-energy-journey-${chatbotId}`;
  // Phase 6 — one id per journey ATTEMPT (not per visitor), so the
  // funnel counts "sessions reaching step X" rather than raw clicks. A
  // refresh restores the same sessionId (see the restore effect below)
  // so an in-progress attempt doesn't fragment into two sessions; a
  // genuinely new visit to the panel (nothing saved) gets a fresh one
  // and that's the only moment "journey started" fires.
  const [sessionId, setSessionId] = useState(null);
  const [stage, setStage] = useState("intent");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [config, setConfig] = useState(null);

  const [fuelKey, setFuelKey] = useState(null);
  const [offerings, setOfferings] = useState(null);
  const [projectType, setProjectType] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [fileMeta, setFileMeta] = useState({}); // questionId -> { filename, size } — display only, the real reference is in `answers`
  const [qIndex, setQIndex] = useState(0);
  const [templateMeta, setTemplateMeta] = useState(null);
  const [noTemplate, setNoTemplate] = useState(false);

  const [solution, setSolution] = useState(null);
  const [solutionContext, setSolutionContext] = useState(null);
  const [supplierMatches, setSupplierMatches] = useState(null);
  const [selectedSuppliers, setSelectedSuppliers] = useState([]);

  const [customer, setCustomer] = useState({ name: "", companyName: "", email: "", phone: "" });
  const [projectLocation, setProjectLocation] = useState("");
  const [location, setLocation] = useState({ city: "", state: "", country: "", postalCode: "" });
  const [purchaseTimeline, setPurchaseTimeline] = useState("");
  const [additionalRequirements, setAdditionalRequirements] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [enquiryResult, setEnquiryResult] = useState(null);
  const [busy, setBusy] = useState(false);

  // Phase 5.1 — AI assistance and human handoff are deliberately kept
  // in their own, separate state, never touching `stage`/`answers`:
  // opening/using either must never advance or lose journey progress.
  const [assistant, setAssistant] = useState(null); // null | "ask" | "handoff"
  const [askText, setAskText] = useState("");
  const [askAnswer, setAskAnswer] = useState("");
  const [askBusy, setAskBusy] = useState(false);
  const [handoffReason, setHandoffReason] = useState("");
  const [handoffBusy, setHandoffBusy] = useState(false);
  const [handoffDone, setHandoffDone] = useState(false);
  const [handoffError, setHandoffError] = useState("");

  // Guards the one-time "generate a session + fire journey_started"
  // work below against firing twice — React 18 StrictMode (dev only)
  // intentionally double-invokes mount effects to surface exactly this
  // kind of non-idempotent side effect; a `ref` survives that
  // double-invocation within the same real mount, so this still only
  // ever fires once per actual visitor session, in dev or production.
  const journeyStartedRef = useRef(false);

  // Restore progress on refresh (Section 10: "visitor closes or refreshes the widget").
  useEffect(() => {
    if (journeyStartedRef.current) return;
    journeyStartedRef.current = true;
    let restoredSessionId = null;
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) || "null");
      if (saved) {
        setStage(saved.stage || "intent");
        setFuelKey(saved.fuelKey || null);
        setProjectType(saved.projectType || null);
        setAnswers(saved.answers || {});
        setFileMeta(saved.fileMeta || {});
        setCustomer(saved.customer || { name: "", companyName: "", email: "", phone: "" });
        setProjectLocation(saved.projectLocation || "");
        setLocation(saved.location || { city: "", state: "", country: "", postalCode: "" });
        restoredSessionId = saved.sessionId || null;
      }
    } catch {
      /* ignore */
    }
    if (restoredSessionId) {
      setSessionId(restoredSessionId);
    } else {
      const freshSessionId = (window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`);
      setSessionId(freshSessionId);
      trackEnergyJourneyEvent(api, chatbotId, { eventName: "energy_journey_started", visitorId, sessionId: freshSessionId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({ stage, fuelKey, projectType, answers, fileMeta, customer, projectLocation, location, sessionId }));
    } catch {
      /* private mode */
    }
  }, [stage, fuelKey, projectType, answers, fileMeta, customer, projectLocation, location, sessionId, storageKey]);

  // Fire-and-forget — analytics must never affect the journey itself.
  const track = (eventName, extra) => trackEnergyJourneyEvent(api, chatbotId, { eventName, visitorId, sessionId, ...extra });

  useEffect(() => {
    let alive = true;
    getEnergyJourneyConfig(api, chatbotId)
      .then((data) => {
        if (!alive) return;
        setConfig(data);
        if (!data.published || data.fuels.length === 0) setError("This company hasn't finished setting up its Energy assistant yet. Please check back soon, or ask to speak with the team.");
      })
      .catch(() => alive && setError("Couldn't load the Energy assistant right now."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [api, chatbotId]);

  const visibleQuestions = useMemo(() => questions.filter((q) => evaluateDisplayCondition(answers, q)), [questions, answers]);
  const currentQuestion = visibleQuestions[qIndex];

  const pickFuel = async (key) => {
    setBusy(true);
    setFuelKey(key);
    try {
      // Tracked server-side as part of this real offerings fetch (see
      // getJourneyOfferings) — not duplicated here.
      const data = await getEnergyJourneyOfferings(api, chatbotId, key, { visitorId, sessionId });
      setOfferings(data);
      setStage("project");
    } catch {
      setError("Couldn't load options for this fuel.");
    } finally {
      setBusy(false);
    }
  };

  const pickProjectType = async (pt) => {
    setBusy(true);
    setProjectType(pt);
    try {
      // Tracked server-side as part of this real questions fetch (see getJourneyQuestions).
      const data = await getEnergyJourneyQuestions(api, chatbotId, fuelKey, pt._id, { visitorId, sessionId });
      setNoTemplate(!data.hasApprovedTemplate);
      setQuestions(data.questions || []);
      setTemplateMeta(data.hasApprovedTemplate ? { templateId: data.templateId, outputTypes: data.outputTypes } : null);
      setQIndex(0);
      const hasQuestions = (data.questions || []).length > 0;
      setStage(hasQuestions ? "questions" : "summary");
      if (hasQuestions) track("energy_questions_started");
      else {
        track("energy_questions_completed");
        track("energy_summary_reviewed");
      }
    } catch {
      setError("Couldn't load questions for this project type.");
    } finally {
      setBusy(false);
    }
  };

  const answerCurrent = (value) => setAnswers((a) => ({ ...a, [currentQuestion._id]: value }));

  // One "displayed" event per question actually shown to this visitor
  // (respecting the same client-side conditional-display logic that
  // decides `visibleQuestions` — a question hidden by a condition was
  // never shown, so it's never tracked as displayed).
  useEffect(() => {
    if (stage === "questions" && currentQuestion) track("energy_question_displayed", { questionId: currentQuestion._id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, currentQuestion?._id, sessionId]);

  const nextQuestion = () => {
    if (currentQuestion) {
      const value = answers[currentQuestion._id];
      track("energy_question_answered", { questionId: currentQuestion._id, metadata: { answeredWithUnknown: value === UNKNOWN } });
    }
    if (qIndex < visibleQuestions.length - 1) setQIndex(qIndex + 1);
    else {
      setStage("summary");
      track("energy_questions_completed");
      track("energy_summary_reviewed");
    }
  };
  const prevQuestion = () => {
    if (qIndex > 0) setQIndex(qIndex - 1);
    else setStage("project");
  };

  const generateSolution = async () => {
    setBusy(true);
    setError("");
    try {
      const data = await generateEnergyJourneySolution(api, chatbotId, { fuelKey, projectTypeId: projectType._id, answers, visitorId, sessionId });
      if (data.noTemplateConfigured) {
        setSolution(null);
        setStage("rfq"); // still allow a general enquiry without an auto-generated BOM
      } else {
        setSolution(data.result);
        setSolutionContext(data.context || null);
        setStage("solution");
        // Also drop a copy of the BOM into the chat transcript itself
        // (as a rich card, not plain text) so it's there as real chat
        // history once this panel closes — not just visible while the
        // overlay happens to be open.
        if (data.result.valid) {
          const subtitle = [data.context?.fuelLabel, data.context?.projectTypeLabel].filter(Boolean).join(" · ");
          onResult({
            type: "bom",
            text: `Here's the indicative bill of materials${subtitle ? ` for ${subtitle}` : ""}. ${data.result.lines.length} line items.`,
            payload: { context: data.context, lines: data.result.lines, requiresEngineeringReview: data.result.requiresEngineeringReview, onShowVendors: findSuppliers, primaryColor },
          });
        }
      }
    } catch {
      setError("Couldn't generate your solution right now.");
    } finally {
      setBusy(false);
    }
  };

  const findSuppliers = async () => {
    setBusy(true);
    try {
      const requiredEquipment = (solution?.lines || []).filter((l) => l.equipmentId).map((l) => ({ equipmentId: l.equipmentId, name: l.name, mandatory: l.mandatory }));
      const hasStructuredLocation = location.city || location.state || location.country;
      const data = await getEnergySupplierMatches(api, chatbotId, { fuelKey, projectTypeId: projectType._id, region: projectLocation, location: hasStructuredLocation ? location : undefined, requiredEquipment, visitorId, sessionId });
      setSupplierMatches(data.result);
      setStage("suppliers");
    } catch {
      setError("Couldn't find suppliers right now.");
    } finally {
      setBusy(false);
    }
  };

  const toggleSupplier = (id) => {
    const turningOn = !selectedSuppliers.includes(id);
    if (turningOn) track("energy_supplier_selected", { supplierId: id });
    setSelectedSuppliers((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  const allSupplierIdsOffered = useMemo(() => {
    if (!supplierMatches) return [];
    const ids = new Set();
    Object.values(supplierMatches.matchesByEquipment || {}).forEach((list) => list.forEach((m) => ids.add(m.supplierId)));
    return [...ids];
  }, [supplierMatches]);

  const submitEnquiry = async () => {
    if (selectedSuppliers.length > 0 && !consent) return;
    setSubmitting(true);
    setError("");
    try {
      const requiredEquipment = (solution?.lines || []).map((l) => ({ equipmentId: l.equipmentId, name: l.name, qty: l.qty, unit: l.unit, mandatory: l.mandatory }));
      // File-type answers hold a real uploaded fileId (see FileQuestionInput) — collect them for the enquiry, never the filename alone.
      const uploadedFileIds = questions.filter((q) => q.type === "file" && answers[q._id]).map((q) => answers[q._id]);
      const data = await createEnergyEnquiry(api, chatbotId, {
        customer,
        visitorId,
        sessionId,
        projectLocation,
        location,
        fuelKey,
        projectTypeId: projectType?._id,
        solutionTemplateId: templateMeta?.templateId || null,
        outputSnapshot: solution || null,
        requiredEquipment,
        uploadedFileIds,
        selectedSupplierIds: selectedSuppliers,
        consent: selectedSuppliers.length > 0 ? { given: consent, consentText: "I agree to share my enquiry and contact details with the supplier(s) I selected above." } : { given: false },
        purchaseTimeline,
        additionalRequirements,
      });
      setEnquiryResult(data.enquiry);
      setStage("confirmation");
      track("energy_confirmation_displayed");
      try {
        sessionStorage.removeItem(storageKey);
      } catch {
        /* ignore */
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Couldn't submit your request right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const journeyContext = () => ({ fuelKey, projectTypeLabel: projectType?.label, stage });

  const askAI = async () => {
    if (!askText.trim()) return;
    setAskBusy(true);
    setAskAnswer("");
    try {
      const data = await askEnergyJourneyQuestion(api, chatbotId, askText.trim(), journeyContext(), { visitorId, sessionId });
      setAskAnswer(data.answer);
    } catch {
      setAskAnswer("Sorry, I couldn't answer that right now. Please try again, or continue with the guided questions.");
    } finally {
      setAskBusy(false);
    }
  };

  const closeAssistant = () => {
    setAssistant(null);
    setAskText("");
    setAskAnswer("");
    setHandoffReason("");
    setHandoffDone(false);
    setHandoffError("");
  };

  const requestHandoff = async () => {
    setHandoffBusy(true);
    setHandoffError("");
    try {
      await requestEnergyJourneyHandoff(api, chatbotId, { visitorId, reason: handoffReason.trim(), context: journeyContext(), sessionId });
      setHandoffDone(true);
    } catch (err) {
      setHandoffError(err?.response?.data?.message || "We couldn't connect you with a human right now. Please try again shortly.");
    } finally {
      setHandoffBusy(false);
    }
  };

  const sendSummaryToChat = () => {
    if (!enquiryResult) return;
    onResult(
      [
        "**Your enquiry has been submitted successfully!**",
        `Reference ID: **${enquiryResult.referenceId}**`,
        `Our team will review your requirements${selectedSuppliers.length > 0 ? " and connect you with the supplier(s) you selected" : ""} and get back to you soon.`,
      ].join("\n\n")
    );
    onClose();
  };

  const back = () => {
    if (stage === "fuel") setStage("intent");
    else if (stage === "project") setStage("fuel");
    else if (stage === "questions") prevQuestion();
    else if (stage === "summary") setStage(questions.length > 0 ? "questions" : "project");
    else if (stage === "solution") setStage("summary");
    else if (stage === "suppliers") setStage("solution");
    else if (stage === "rfq") setStage(noTemplate ? "summary" : supplierMatches ? "suppliers" : "solution");
    else onClose();
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col bg-white">
        <Header onClose={onClose} />
        <div className="flex-1 flex items-center justify-center text-[13px] text-gray-500">Loading…</div>
      </div>
    );
  }
  if (error && stage === "intent" && (!config?.published || config.fuels.length === 0)) {
    return (
      <div className="h-full flex flex-col bg-white">
        <Header onClose={onClose} />
        <div className="flex-1 flex items-center justify-center p-4 text-center text-[13px] text-gray-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white relative">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
        <button onClick={back} className="text-gray-500 hover:text-gray-700" aria-label="Back">
          <FaArrowLeft size={14} />
        </button>
        <span className="text-[13px] font-semibold text-gray-800 flex-1">Energy Assistant</span>
        {stage !== "intent" && stage !== "confirmation" && (
          <>
            <button onClick={() => setAssistant("ask")} className="text-gray-400 hover:text-gray-600" aria-label="Ask a question" title="Ask a question">
              <FaRegQuestionCircle size={15} />
            </button>
            <button onClick={() => setAssistant("handoff")} className="text-gray-400 hover:text-gray-600" aria-label="Talk to a human" title="Talk to a human">
              <FaHeadset size={15} />
            </button>
          </>
        )}
      </div>

      {assistant && (
        <div className="absolute inset-0 z-10 bg-white flex flex-col">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
            <span className="text-[13px] font-semibold text-gray-800 flex-1">{assistant === "ask" ? "Ask a question" : "Talk to a human"}</span>
            <button onClick={closeAssistant} className="text-gray-400 hover:text-gray-600" aria-label="Close">
              <FaTimes size={15} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {assistant === "ask" && (
              <div className="flex flex-col gap-2">
                <p className="text-[12px] text-gray-500">Ask anything about this — it won't change your answers or progress so far.</p>
                <textarea rows={2} value={askText} onChange={(e) => setAskText(e.target.value)} placeholder="e.g. What is a CNG Mother Station?" className="w-full text-[13px] px-2.5 py-2 rounded-[8px] border border-gray-200 outline-none focus:border-gray-400" />
                <button onClick={askAI} disabled={askBusy || !askText.trim()} className="self-start text-[13px] font-semibold text-white rounded-[10px] px-4 py-1.5 disabled:opacity-50" style={{ background: primaryColor }}>
                  {askBusy ? "Thinking…" : "Ask"}
                </button>
                {askAnswer && <p className="text-[13px] text-gray-700 bg-gray-50 rounded-[8px] p-2.5 whitespace-pre-wrap">{askAnswer}</p>}
                <button onClick={closeAssistant} className="self-start text-[12px] text-gray-500 hover:underline mt-1">Back to {stage === "questions" ? "my question" : "where I was"}</button>
              </div>
            )}
            {assistant === "handoff" && (
              <div className="flex flex-col gap-2">
                {handoffDone ? (
                  <>
                    <p className="text-[13px] text-gray-700">We've let our team know — they'll reach out to you shortly.</p>
                    <button onClick={closeAssistant} className="self-start text-[13px] font-semibold text-white rounded-[10px] px-4 py-1.5" style={{ background: primaryColor }}>Continue</button>
                  </>
                ) : (
                  <>
                    <p className="text-[12px] text-gray-500">We'll pass along what you've told us so far. Let us know what you need help with (optional).</p>
                    <textarea rows={3} value={handoffReason} onChange={(e) => setHandoffReason(e.target.value)} placeholder="What would you like help with?" className="w-full text-[13px] px-2.5 py-2 rounded-[8px] border border-gray-200 outline-none focus:border-gray-400" />
                    {handoffError && <p className="text-[12px] text-red-500">{handoffError}</p>}
                    <button onClick={requestHandoff} disabled={handoffBusy} className="self-start text-[13px] font-semibold text-white rounded-[10px] px-4 py-1.5 disabled:opacity-60" style={{ background: primaryColor }}>
                      {handoffBusy ? "Requesting…" : "Request a human"}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3">
        {error && <p className="mb-2 text-[12px] text-red-500">{error}</p>}

        {stage === "intent" && (
          <div className="flex flex-col gap-2">
            <p className="text-[13px] text-gray-600 mb-1">What would you like to do?</p>
            <button onClick={() => { setStage("fuel"); track("energy_intent_selected"); }} className="text-left text-[13px] px-3 py-2.5 rounded-[10px] border border-gray-200 hover:border-gray-400">
              🔧 Explore energy solutions &amp; get a BOM / quote
            </button>
          </div>
        )}

        {stage === "fuel" && (
          <div className="flex flex-col gap-2">
            <p className="text-[13px] text-gray-600 mb-1">What fuel or energy solution are you interested in?</p>
            {config.fuels.map((f) => (
              <button key={f.key} onClick={() => pickFuel(f.key)} disabled={busy} className="text-left text-[13px] px-3 py-2 rounded-[10px] border border-gray-200 hover:border-gray-400 disabled:opacity-50">
                {f.label}
              </button>
            ))}
          </div>
        )}

        {stage === "project" && offerings && (
          <div className="flex flex-col gap-2">
            <p className="text-[13px] text-gray-600 mb-1">What type of project is this?</p>
            {offerings.projectTypes.length === 0 ? (
              <p className="text-[12px] text-gray-400">No project types are set up for this fuel yet.</p>
            ) : (
              offerings.projectTypes.map((p) => (
                <button key={p._id} onClick={() => pickProjectType(p)} disabled={busy} className="text-left text-[13px] px-3 py-2 rounded-[10px] border border-gray-200 hover:border-gray-400 disabled:opacity-50">
                  {p.label}
                  {!p.hasApprovedTemplate && <span className="block text-[11px] text-gray-400">We'll collect your requirements for a manual quote.</span>}
                </button>
              ))
            )}
          </div>
        )}

        {stage === "questions" && currentQuestion && (
          <div className="flex flex-col gap-3">
            <p className="text-[11px] text-gray-400">Question {qIndex + 1} of {visibleQuestions.length}</p>
            <div>
              <p className="text-[13px] font-medium text-gray-800">{currentQuestion.label} {currentQuestion.required && <span className="text-red-400">*</span>}</p>
              {currentQuestion.description && <p className="text-[12px] text-gray-400 mb-1.5">{currentQuestion.description}</p>}
              {currentQuestion.type === "file" ? (
                <FileQuestionInput
                  api={api}
                  chatbotId={chatbotId}
                  visitorId={visitorId}
                  question={currentQuestion}
                  value={answers[currentQuestion._id]}
                  meta={fileMeta[currentQuestion._id]}
                  onChange={answerCurrent}
                  onMetaChange={(m) => setFileMeta((f) => ({ ...f, [currentQuestion._id]: m }))}
                />
              ) : (
                <QuestionInput question={currentQuestion} value={answers[currentQuestion._id]} onChange={answerCurrent} />
              )}
              {currentQuestion.allowUnknown && (
                <button type="button" onClick={() => answerCurrent(UNKNOWN)} className="mt-1.5 text-[11px] text-gray-400 hover:underline">
                  I don&apos;t know
                </button>
              )}
            </div>
            <div className="flex justify-between gap-2 mt-1">
              <button onClick={prevQuestion} className="text-[12px] text-gray-500 hover:underline">Previous</button>
              <button
                onClick={nextQuestion}
                disabled={currentQuestion.required && (answers[currentQuestion._id] === undefined || answers[currentQuestion._id] === "")}
                className="flex items-center gap-1 text-[13px] font-semibold text-white rounded-[10px] px-4 py-1.5 disabled:opacity-50"
                style={{ background: primaryColor }}
              >
                {qIndex === visibleQuestions.length - 1 ? "Review" : "Next"} <FaArrowRight size={11} />
              </button>
            </div>
          </div>
        )}

        {stage === "summary" && (
          <div className="flex flex-col gap-3">
            <p className="text-[13px] font-semibold text-gray-800">Review your requirements</p>
            <div className="text-[12px] text-gray-600 space-y-1">
              <p>Fuel: <b>{config.fuels.find((f) => f.key === fuelKey)?.label}</b></p>
              <p>Project type: <b>{projectType?.label}</b></p>
              {visibleQuestions.map((q) => (
                <p key={q._id}>
                  {q.label}:{" "}
                  <b>
                    {q.type === "file"
                      ? fileMeta[q._id]?.filename || (answers[q._id] ? "File uploaded" : "—")
                      : Array.isArray(answers[q._id])
                      ? answers[q._id].join(", ")
                      : answers[q._id] === UNKNOWN
                      ? "Not sure"
                      : String(answers[q._id] ?? "—")}
                  </b>
                </p>
              ))}
            </div>
            <button onClick={() => { setQIndex(0); setStage("questions"); }} className="self-start text-[12px] text-gray-500 hover:underline">Edit answers</button>
            <button onClick={generateSolution} disabled={busy} className="text-[13px] font-semibold text-white rounded-[10px] py-2 disabled:opacity-60" style={{ background: primaryColor }}>
              {busy ? "Generating…" : noTemplate || questions.length === 0 ? "Continue to request a quote" : "Generate my solution"}
            </button>
          </div>
        )}

        {stage === "solution" && solution && (
          <div className="flex flex-col gap-3">
            {!solution.valid ? (
              <div className="text-[12px] text-red-500 bg-red-50 rounded-[8px] p-2">
                <p className="font-medium mb-1">A few more details are needed:</p>
                {solution.missingInputs.map((m) => <p key={m.questionId}>• {m.label}</p>)}
                <button onClick={() => { setQIndex(0); setStage("questions"); }} className="mt-2 text-[12px] underline">Go back and answer</button>
              </div>
            ) : (
              <>
                <BomTable context={solutionContext} lines={solution.lines} requiresEngineeringReview={solution.requiresEngineeringReview} primaryColor={primaryColor} />
                <button onClick={findSuppliers} disabled={busy} className="text-[13px] font-semibold text-white rounded-[10px] py-2 disabled:opacity-60" style={{ background: primaryColor }}>
                  {busy ? "Finding suppliers…" : "Find suppliers"}
                </button>
              </>
            )}
          </div>
        )}

        {stage === "suppliers" && supplierMatches && (
          <div className="flex flex-col gap-3">
            <p className="text-[13px] font-semibold text-gray-800">Matching suppliers</p>
            {allSupplierIdsOffered.length === 0 ? (
              <p className="text-[12px] text-gray-500">No suppliers are set up for this yet — you can still submit a general enquiry.</p>
            ) : (
              Object.entries(supplierMatches.matchesByEquipment).map(([eqId, matches]) => (
                <div key={eqId}>
                  {matches.map((m) => (
                    <label key={m.supplierId} className="flex items-start gap-2 rounded-[8px] border border-gray-200 p-2 mb-1.5 text-[12px]">
                      <input type="checkbox" checked={selectedSuppliers.includes(m.supplierId)} onChange={() => toggleSupplier(m.supplierId)} className="mt-0.5" />
                      <span>
                        <span className="font-medium">{m.name}</span>{" "}
                        {m.verificationStatus === "verified" && <span className="text-emerald-600">✓ verified</span>}
                        {m.leadTimeDays != null && <span className="text-gray-400"> · ~{m.leadTimeDays}d lead time</span>}
                        <span className="block text-gray-400">{m.reasons.join(" · ")}</span>
                      </span>
                    </label>
                  ))}
                </div>
              ))
            )}
            {supplierMatches.unmatchedEquipment.length > 0 && (
              <p className="text-[11px] text-gray-400">No supplier found yet for: {supplierMatches.unmatchedEquipment.map((e) => e.name).join(", ")}.</p>
            )}
            <button onClick={() => setStage("rfq")} className="text-[13px] font-semibold text-white rounded-[10px] py-2" style={{ background: primaryColor }}>
              Continue
            </button>
          </div>
        )}

        {stage === "rfq" && (
          <div className="flex flex-col gap-2.5">
            <p className="text-[13px] font-semibold text-gray-800">Request your quotation</p>
            <input placeholder="Full name *" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} className="w-full text-[13px] px-2.5 py-2 rounded-[8px] border border-gray-200" />
            <input placeholder="Business email *" type="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} className="w-full text-[13px] px-2.5 py-2 rounded-[8px] border border-gray-200" />
            <input placeholder="Company name" value={customer.companyName} onChange={(e) => setCustomer({ ...customer, companyName: e.target.value })} className="w-full text-[13px] px-2.5 py-2 rounded-[8px] border border-gray-200" />
            <input placeholder="Phone number" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} className="w-full text-[13px] px-2.5 py-2 rounded-[8px] border border-gray-200" />
            <input placeholder="Project location / address" value={projectLocation} onChange={(e) => setProjectLocation(e.target.value)} className="w-full text-[13px] px-2.5 py-2 rounded-[8px] border border-gray-200" />
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="City" value={location.city} onChange={(e) => setLocation({ ...location, city: e.target.value })} className="w-full text-[13px] px-2.5 py-2 rounded-[8px] border border-gray-200" />
              <input placeholder="State" value={location.state} onChange={(e) => setLocation({ ...location, state: e.target.value })} className="w-full text-[13px] px-2.5 py-2 rounded-[8px] border border-gray-200" />
            </div>
            <p className="text-[10px] text-gray-400 -mt-1.5">City/state help us match suppliers who serve your area — optional, but improves matching accuracy.</p>
            <input placeholder="Purchase timeline (e.g. within 1 month)" value={purchaseTimeline} onChange={(e) => setPurchaseTimeline(e.target.value)} className="w-full text-[13px] px-2.5 py-2 rounded-[8px] border border-gray-200" />
            <textarea placeholder="Additional requirements (optional)" rows={2} value={additionalRequirements} onChange={(e) => setAdditionalRequirements(e.target.value)} className="w-full text-[13px] px-2.5 py-2 rounded-[8px] border border-gray-200" />

            {selectedSuppliers.length > 0 && (
              <label className="flex items-start gap-2 text-[11px] text-gray-600 bg-gray-50 rounded-[8px] p-2">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
                I agree to share my name, email, phone and project details with the {selectedSuppliers.length} supplier(s) I selected, so they can prepare a quotation for me.
              </label>
            )}

            <button
              onClick={submitEnquiry}
              disabled={submitting || !customer.name || !customer.email || (selectedSuppliers.length > 0 && !consent)}
              className="text-[13px] font-semibold text-white rounded-[10px] py-2 disabled:opacity-60"
              style={{ background: primaryColor }}
            >
              {submitting ? "Submitting…" : "Submit request"}
            </button>
          </div>
        )}

        {stage === "confirmation" && enquiryResult && (
          <div className="flex flex-col items-center text-center gap-2 py-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <FaCheck size={18} />
            </span>
            <p className="text-[14px] font-semibold text-gray-800">Your enquiry has been submitted!</p>
            <p className="text-[12px] text-gray-500">Reference ID</p>
            <p className="text-[15px] font-mono font-bold" style={{ color: primaryColor }}>{enquiryResult.referenceId}</p>
            <p className="text-[12px] text-gray-500">Our team will review your requirements and get back to you soon.</p>
            <button onClick={sendSummaryToChat} className="mt-2 text-[13px] font-semibold text-white rounded-[10px] px-4 py-2" style={{ background: primaryColor }}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Header({ onClose }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
      <button onClick={onClose} className="text-gray-500 hover:text-gray-700" aria-label="Back to chat">
        <FaArrowLeft size={14} />
      </button>
      <span className="text-[13px] font-semibold text-gray-800">Energy Assistant</span>
    </div>
  );
}
