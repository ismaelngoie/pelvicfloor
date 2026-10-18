"use client";

// Native tracker models and scales with account-backed web persistence.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, Coffee, Droplet, Flame, GlassWater, Pencil, Play, Plus, Sparkles, Trash2, Wine } from "lucide-react";
import { Sheet } from "./ui";
import { Chevron, Eyebrow, RoseAction, Serif } from "./atelierUI";
import { fetchRecentCheckIns } from "@/lib/memberData";
import { FIXTURES_ON } from "@/lib/devFixtures";
import {
  MENOPAUSE_SYMPTOMS, WATER_DRINKS, asDate, cycleEntries, cycleObservation, cycleSummary,
  cycleTrackerPlan, cycleTrainingContext, dayKey, deleteWaterEntry, logWater, menopausePattern,
  mensPattern, mensTrackerPlan, newTrackerId, normalizeMenopause, normalizeMens, normalizeWater,
  parseDay, recentDays, saveDatedEntry, savePeriod, setWaterGoal, trackerStreak, vesselMilliliters,
  waterEntry, waterStreak,
} from "@/lib/trackerModels";
export { dayKey } from "@/lib/trackerModels";

const cardClass = "rounded-[22px] border border-atelier-line bg-atelier-card p-4";
const fieldClass = "min-h-11 w-full rounded-xl border border-atelier-line bg-white px-3 py-2 text-sm text-atelier-ink";
const quietButton = "min-h-11 rounded-full border border-atelier-line px-4 py-2 text-sm font-semibold text-atelier-ink";
const formatDay = (key) => parseDay(key).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
const liter = (ml) => `${Number((ml / 1000).toFixed(2))} L`;

function useTrackerWriter(member, patchMember) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const latch = useRef(false);
  const write = useCallback(async (key, value) => {
    if (latch.current) return false;
    latch.current = true; setBusy(true); setError("");
    try { await patchMember({ trackers: { ...member?.trackers, [key]: value } }); return true; }
    catch { setError("Your tracker could not save. Please try again."); return false; }
    finally { latch.current = false; setBusy(false); }
  }, [member?.trackers, patchMember]);
  return { trackers: member?.trackers || {}, write, busy, error };
}
function useTrackerRoom(roomOnly, onClose) {
  const [open, setRoomOpen] = useState(roomOnly);
  return [open, (next) => { setRoomOpen(next); if (!next) onClose?.(); }];
}
function TintCard({ children, roomOnly, rose = false }) {
  if (roomOnly) return null;
  return <section className="mt-5 overflow-hidden rounded-[22px] border border-white/50 bg-atelier-card p-4 shadow-sm" style={{ backgroundImage: rose ? "linear-gradient(135deg,#C43E631C,#3A2F440D)" : "linear-gradient(135deg,#3A2F441C,#6F8F7A14)" }}>{children}</section>;
}
function ErrorMessage({ error }) { return error ? <p role="alert" className="mt-3 text-sm text-atelier-rosewood">{error}</p> : null; }
function Rating({ metric, value, onChange }) {
  return <fieldset className="mt-5"><legend className="text-sm font-semibold">{metric.question || metric.title}</legend><div className="mt-3 grid grid-cols-5 gap-2">{[1, 2, 3, 4, 5].map((number) => <button key={number} type="button" aria-label={`${metric.title} ${number} of 5`} aria-pressed={value === number} onClick={() => onChange(number)} className={`min-h-11 rounded-full text-sm font-semibold ${value === number ? "bg-atelier-plum text-white" : "bg-black/5 text-atelier-ink"}`}>{number}</button>)}</div><div className="mt-2 flex justify-between text-xs text-atelier-ink3"><span>{metric.low}</span><span>{metric.high}</span></div></fieldset>;
}
function WeekStrip({ entries }) {
  const keys = new Set(entries.map((entry) => entry.date));
  return <div className={`${cardClass} flex justify-between gap-1`} aria-label="Check-ins during the last seven days">{recentDays(7).map((key) => <div key={key} className="text-center"><span className="block text-[10px] text-atelier-ink3">{parseDay(key).toLocaleDateString(undefined, { weekday: "narrow" })}</span><span className={`mt-2 grid h-7 w-7 place-items-center rounded-full text-xs ${keys.has(key) ? "bg-atelier-plum text-white" : "bg-black/5"}`} aria-label={`${formatDay(key)}: ${keys.has(key) ? "logged" : "not logged"}`}>{keys.has(key) ? "✓" : parseDay(key).getDate()}</span></div>)}</div>;
}
function CycleDial({ summary, size = 64 }) {
  const day = summary.cycleDay; const length = summary.prediction?.length || 28; const radius = (size - 10) / 2; const circumference = Math.PI * 2 * radius;
  const phase = summary.periodActive ? "Period" : summary.prediction?.daysUntil >= 0 && summary.prediction.daysUntil <= 5 ? "Pre-period" : day && day <= 9 ? "Early cycle" : day ? "Mid-cycle" : null;
  return <span className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }} aria-label={day ? `Cycle day ${day}${phase ? `, ${phase}` : ""}` : "No cycle logged yet"}><svg className="absolute inset-0" viewBox={`0 0 ${size} ${size}`} aria-hidden="true"><circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#3A2F4418" strokeWidth="7" /><circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={summary.periodActive ? "#C43E63" : "#3A2F44"} strokeWidth="7" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - Math.min(1, (day || 0) / length))} transform={`rotate(-90 ${size / 2} ${size / 2})`} /></svg><span className="text-center"><span className="block font-serif" style={{ fontSize: size > 100 ? 40 : 21 }}>{day || <Droplet className="h-5 w-5" />}</span>{size > 100 && phase && <span className="block text-[9px] uppercase tracking-wide">{phase}</span>}</span></span>;
}

export function CycleQuickCard({ member, patchMember, roomOnly = false, onClose }) {
  const { trackers, write, busy, error } = useTrackerWriter(member, patchMember);
  const womens = trackers.womens || {}; const entries = useMemo(() => cycleEntries(womens), [womens]);
  const summary = useMemo(() => cycleSummary(entries), [entries]);
  const [open, setOpen] = useTrackerRoom(roomOnly, onClose); const [logging, setLogging] = useState(false);
  const [start, setStart] = useState(""); const [end, setEnd] = useState(""); const [ongoing, setOngoing] = useState(true); const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [checkIns, setCheckIns] = useState([]); const [flowDate, setFlowDate] = useState(dayKey()); const [flow, setFlow] = useState("light"); const [flowNote, setFlowNote] = useState("");
  const goal = member?.goal || "coreStrength"; const plan = cycleTrackerPlan(goal); const context = cycleTrainingContext(summary);
  useEffect(() => { if (!open || !member?.id || (process.env.NODE_ENV !== "production" && FIXTURES_ON)) return; let disposed = false; fetchRecentCheckIns(member.id, 120).then((values) => { if (!disposed) setCheckIns(values); }).catch(() => {}); return () => { disposed = true; }; }, [open, member?.id]);
  const observation = cycleObservation(entries, checkIns);
  const status = summary.periodActive ? `Period day ${summary.periodDays || "—"} · mark the last day when it ends` : summary.prediction ? summary.prediction.daysUntil < 0 ? `Your period was expected ${formatDay(summary.prediction.nextDate)}. Log it when it starts.` : `Next period ${summary.prediction.daysUntil === 0 ? "expected today" : `in about ${summary.prediction.daysUntil} days`}` : summary.cycleDay ? "Log your next period start to build your own estimate." : "Log a period once and your dial begins.";
  const openLogger = () => { const date = summary.periodActive ? summary.latest : ""; setStart(date || ""); setEnd(""); setOngoing(true); setMonth(date ? new Date(parseDay(date).getFullYear(), parseDay(date).getMonth(), 1) : new Date(new Date().getFullYear(), new Date().getMonth(), 1)); setOpen(true); setLogging(true); };
  const saveEntries = (next) => write("womens", { ...womens, mode: "cycle", cycleEntries: next });
  const save = async () => { if (!start || (!ongoing && !end)) return; if (await saveEntries(savePeriod(entries, start, ongoing ? null : end))) setLogging(false); };
  const pick = (key) => { if (!start || end || key < start) { setStart(key); setEnd(""); setOngoing(true); } else if (key === start) { setEnd(key); setOngoing(false); } else { setEnd(key); setOngoing(false); } };
  const offset = month.getDay(); const monthCount = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  return <>
    <TintCard roomOnly={roomOnly} rose={summary.periodActive}><button type="button" onClick={() => setOpen(true)} className="flex w-full items-center gap-3 text-left"><CycleDial summary={summary} /><span className="min-w-0 flex-1"><strong className="block text-[17px]">Your cycle</strong><span className="mt-1 block text-xs leading-relaxed text-atelier-ink2">{status}</span></span><Chevron /></button><RoseAction className="mt-4" onClick={openLogger}>{summary.periodActive ? "Mark period ended" : "Log period"}</RoseAction></TintCard>
    <Sheet open={open} onClose={() => setOpen(false)} title={logging ? "Log Your Period" : "Your cycle"}>
      <div className="space-y-5 pb-6"><ErrorMessage error={error} />
        {logging ? <>
          <button type="button" className={quietButton} onClick={() => setLogging(false)}>Back to your cycle</button><p className="text-sm text-atelier-ink2">Tap the first day, then the last. Future dates cannot be logged.</p>
          <div className="flex items-center justify-between"><button type="button" className={quietButton} aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></button><Serif size={22}>{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</Serif><button type="button" className={quietButton} aria-label="Next month" disabled={month.getFullYear() === new Date().getFullYear() && month.getMonth() === new Date().getMonth()} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></button></div>
          <div className="grid grid-cols-7 gap-1 rounded-2xl bg-white p-2">{["S", "M", "T", "W", "T", "F", "S"].map((label, i) => <span key={`label-${i}`} className="py-2 text-center text-xs text-atelier-ink3">{label}</span>)}{Array.from({ length: offset }, (_, i) => <span key={`blank-${i}`} />)}{Array.from({ length: monthCount }, (_, index) => { const key = dayKey(new Date(month.getFullYear(), month.getMonth(), index + 1)); const selected = key === start || key === end; const range = start && end && key > start && key < end; const logged = entries.some((entry) => entry.date === key && entry.kind === "periodStarted"); return <button key={key} type="button" disabled={key > dayKey()} aria-label={`${formatDay(key)}${logged ? ", period logged" : ""}`} aria-pressed={selected || Boolean(range)} onClick={() => pick(key)} className={`relative min-h-11 rounded-full text-sm disabled:opacity-25 ${selected ? "bg-atelier-rosewood text-white" : range ? "bg-atelier-rose/15" : "hover:bg-black/5"}`}>{index + 1}{logged && <span className="absolute inset-x-0 bottom-1 text-center text-[8px]">●</span>}</button>; })}</div>
          <label className="flex min-h-11 items-center gap-3 rounded-xl bg-white p-3 text-sm"><input type="checkbox" checked={ongoing} onChange={(event) => { setOngoing(event.target.checked); if (event.target.checked) setEnd(""); }} />Still going</label><p className="text-xs text-atelier-ink3">{start ? `Starts ${formatDay(start)}${ongoing ? " · still going" : end ? ` · ends ${formatDay(end)}` : " · choose the last day"}` : "Choose the first day on the calendar."}</p><RoseAction disabled={busy || !start || (!ongoing && !end)} onClick={save}>{busy ? "Saving…" : "Save period"}</RoseAction>
        </> : <>
          <div className={`${cardClass} flex items-center gap-4`}><CycleDial summary={summary} size={136} /><div className="min-w-0"><Eyebrow>{plan.title}</Eyebrow><Serif size={25} className="mt-2">{summary.prediction ? `~${summary.prediction.length} day cycle` : "Your own history"}</Serif><p className="mt-2 text-xs leading-relaxed text-atelier-ink2">{status}</p></div></div>
          <RoseAction disabled={busy} onClick={openLogger}>{summary.periodActive ? "Mark period ended" : "Log period"}</RoseAction>
          <div className={cardClass}><Eyebrow>FOR YOUR TRAINING</Eyebrow><Serif size={22} className="mt-2">{context[0]}</Serif><p className="mt-2 text-sm leading-relaxed text-atelier-ink2">{context[1]}</p></div>
          <div className={cardClass}><strong className="text-sm">Coach Mia™ {observation ? "noticed a pattern" : "is learning your pattern"}</strong><p className="mt-2 text-sm leading-relaxed text-atelier-ink2">{observation || `Personal observations begin after 3 period starts and 12 daily check-ins. You have ${Math.min(entries.filter((entry) => entry.kind === "periodStarted").length, 3)} of 3 starts and ${Math.min(checkIns.length, 12)} of 12 check-ins.`}</p><p className="mt-2 text-xs text-atelier-ink3">{plan.subtitle} Your daily check-in on Today supplies the symptom observations in this room.</p><a href="/app" className="mt-3 block min-h-11 py-2 text-sm font-semibold text-atelier-rosewood">Open Today’s daily check-in</a></div>
          <details className={cardClass}><summary className="cursor-pointer text-sm font-semibold">Add flow or a private cycle note</summary><label className="mt-4 block text-xs">Date<input type="date" max={dayKey()} value={flowDate} onChange={(event) => setFlowDate(event.target.value)} className={`${fieldClass} mt-2`} /></label><div className="mt-3 grid grid-cols-2 gap-2">{["spotting", "light", "medium", "heavy"].map((value) => <button key={value} type="button" aria-pressed={flow === value} onClick={() => setFlow(value)} className={`${quietButton} capitalize ${flow === value ? "bg-atelier-rose/15" : ""}`}>{value}</button>)}</div><textarea aria-label="Private cycle note" placeholder="Anything you want to remember" value={flowNote} onChange={(event) => setFlowNote(event.target.value)} className={`${fieldClass} mt-3`} /><RoseAction className="mt-3" disabled={busy || !flowDate} onClick={async () => { if (await saveEntries([{ id: newTrackerId(), kind: "flow", date: flowDate, flowRawValue: flow, note: flowNote, goalRawValue: goal }, ...entries])) setFlowNote(""); }}>Save flow note</RoseAction></details>
          <div className={cardClass}><Eyebrow>YOUR TIMELINE</Eyebrow>{!entries.length && <p className="mt-3 text-sm text-atelier-ink2">Your own entries will build this timeline over time.</p>}{[...entries].sort((a, b) => b.date.localeCompare(a.date)).map((entry) => <div key={entry.id} className="flex items-center gap-3 border-b border-atelier-line py-3 last:border-0"><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{entry.kind === "periodStarted" ? "Period started" : entry.kind === "periodEnded" ? "Period ended" : `${entry.flowRawValue || "Cycle"} flow`}</p><p className="mt-1 text-xs text-atelier-ink3">{formatDay(entry.date)}{entry.note ? ` · ${entry.note}` : ""}</p></div><button type="button" aria-label={`Delete ${entry.kind} on ${entry.date}`} disabled={busy} onClick={() => saveEntries(entries.filter((item) => item.id !== entry.id))} className="grid h-11 w-11 shrink-0 place-items-center text-atelier-rosewood"><Trash2 className="h-4 w-4" /></button></div>)}</div>
          <p className="text-xs leading-relaxed text-atelier-ink3">Coach Mia™ reads your own history and does not predict ovulation, fertility, or contraception safety. Apple Health cycle import is available in the iPhone app.</p><button type="button" className={`${quietButton} w-full`} disabled={busy} onClick={async () => { if (await write("womens", { ...womens, mode: "menopause" })) setOpen(false); }}>Track menopause instead</button>
        </>}
      </div>
    </Sheet>
  </>;
}

export function MenopauseQuickCard({ member, patchMember, roomOnly = false, onClose }) {
  const { trackers, write, busy, error } = useTrackerWriter(member, patchMember); const womens = trackers.womens || {};
  const entries = useMemo(() => normalizeMenopause(womens), [womens]);
  const [open, setOpen] = useTrackerRoom(roomOnly, onClose); const [draft, setDraft] = useState(null);
  const today = entries.find((entry) => entry.date === dayKey()); const streak = trackerStreak(entries.map((entry) => entry.date));
  const symptomName = (id) => MENOPAUSE_SYMPTOMS.find(([key]) => key === id)?.[1] || id;
  const status = today ? today.symptoms.length ? `Today: ${today.symptoms.slice(0, 2).map(symptomName).join(", ")}` : "No symptoms logged today" : streak ? `${streak} day check-in streak` : "Track symptoms, sleep, mood and comfort";
  const edit = (entry = today) => { setDraft(entry ? { ...entry, symptoms: [...entry.symptoms], impact: entry.impact || 1, sleepQuality: entry.sleepQuality || 3 } : { id: newTrackerId(), date: dayKey(), symptoms: [], impact: 1, sleepQuality: 3, note: "" }); setOpen(true); };
  const save = async () => { if (!draft?.date || draft.date > dayKey()) return; if (await write("womens", { ...womens, mode: "menopause", menopauseEntries: saveDatedEntry(entries, { ...draft, legacy: false }) })) setDraft(null); };
  return <>
    <TintCard roomOnly={roomOnly} rose><button type="button" onClick={() => setOpen(true)} className="flex w-full items-center gap-3 text-left"><span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-atelier-rose/10"><Sparkles className="h-7 w-7 text-atelier-rosewood" /></span><span className="min-w-0 flex-1"><strong className="block text-[17px]">Menopause</strong><span className="mt-1 block text-xs leading-relaxed text-atelier-ink2">{status}</span></span><Chevron /></button><RoseAction tone="rosewood" className="mt-4" onClick={() => edit()}>{today ? "Update today's check-in" : "Log today's symptoms"}</RoseAction></TintCard>
    <Sheet open={open} onClose={() => setOpen(false)} title={draft ? "Today's symptoms" : "Menopause"}><div className="space-y-5 pb-6"><ErrorMessage error={error} />
      {draft ? <><button type="button" className={quietButton} onClick={() => setDraft(null)}>Back to your timeline</button><Serif size={28}>How are you feeling?</Serif><p className="text-sm text-atelier-ink2">A quick check-in helps you notice changes over time.</p><label className="block text-sm">Date<input type="date" max={dayKey()} value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} className={`${fieldClass} mt-2`} /></label><div><Eyebrow>WHAT DID YOU NOTICE?</Eyebrow><div className="mt-3 grid grid-cols-2 gap-2">{MENOPAUSE_SYMPTOMS.map(([id, title]) => <button key={id} type="button" aria-pressed={draft.symptoms.includes(id)} onClick={() => setDraft({ ...draft, symptoms: draft.symptoms.includes(id) ? draft.symptoms.filter((item) => item !== id) : [...draft.symptoms, id] })} className={`min-h-12 rounded-xl border px-3 py-3 text-left text-xs font-semibold ${draft.symptoms.includes(id) ? "border-atelier-rosewood bg-atelier-rose/10 text-atelier-rosewood" : "border-atelier-line bg-white"}`}>{title}</button>)}</div><button type="button" aria-pressed={!draft.symptoms.length} onClick={() => setDraft({ ...draft, symptoms: [] })} className="mt-2 min-h-11 text-sm font-semibold text-atelier-rosewood">{draft.symptoms.length ? "○" : "✓"} No symptoms today</button></div><Rating metric={{ title: "Symptom impact", question: "How much did symptoms affect your day?", low: "Not at all", high: "A lot" }} value={draft.impact} onChange={(value) => setDraft({ ...draft, impact: value })} /><Rating metric={{ title: "Sleep quality", question: "How was your sleep?", low: "Poor", high: "Restful" }} value={draft.sleepQuality} onChange={(value) => setDraft({ ...draft, sleepQuality: value })} /><label className="block text-sm font-semibold">Private note<textarea value={draft.note || ""} onChange={(event) => setDraft({ ...draft, note: event.target.value })} rows={3} placeholder="Anything else you want to remember?" className={`${fieldClass} mt-2`} /></label><RoseAction disabled={busy || !draft.date || draft.date > dayKey()} onClick={save}>{busy ? "Saving…" : "Save check-in"}</RoseAction></>
        : <><div className={cardClass}><Eyebrow>MENOPAUSE</Eyebrow><Serif size={28} className="mt-2">Your body, your pattern.</Serif><p className="mt-2 text-sm leading-relaxed text-atelier-ink2">A quick daily check-in can reveal changes in hot flashes, sleep, mood, comfort and bladder symptoms over time.</p><p className="mt-3 text-xs font-semibold text-atelier-rosewood">{streak} day check-in streak · {entries.length} check-ins</p></div><WeekStrip entries={entries} /><RoseAction tone="rosewood" onClick={() => edit()}>{today ? "Update today's check-in" : "Log today's symptoms"}</RoseAction><div className={cardClass}><strong className="text-sm">What your check-ins show</strong><p className="mt-2 text-sm leading-relaxed text-atelier-ink2">{menopausePattern(entries.filter((entry) => !entry.legacy))}</p></div><div className={cardClass}><Eyebrow>YOUR TIMELINE</Eyebrow>{!entries.length && <p className="mt-3 text-sm text-atelier-ink2">Your first check-in will begin a private symptom timeline.</p>}{entries.map((entry) => <div key={entry.id} className="border-b border-atelier-line py-4 last:border-0"><div className="flex items-center gap-2"><p className="flex-1 text-sm font-semibold">{formatDay(entry.date)}</p><button type="button" aria-label={`Edit menopause check-in on ${entry.date}`} className="grid h-11 w-11 place-items-center" onClick={() => edit(entry)}><Pencil className="h-4 w-4" /></button><button type="button" aria-label={`Delete menopause check-in on ${entry.date}`} disabled={busy} className="grid h-11 w-11 place-items-center text-atelier-rosewood" onClick={() => write("womens", { ...womens, menopauseEntries: entries.filter((item) => item.id !== entry.id) })}><Trash2 className="h-4 w-4" /></button></div><p className="mt-1 text-xs leading-relaxed text-atelier-ink2">{entry.legacy ? "Earlier tracker entry" : entry.symptoms.length ? entry.symptoms.map(symptomName).join(" · ") : "No symptoms logged"}</p>{!entry.legacy && <p className="mt-2 text-xs text-atelier-ink3">Impact {entry.impact}/5 · Sleep {entry.sleepQuality}/5</p>}{entry.note && <p className="mt-2 whitespace-pre-wrap text-xs text-atelier-ink2">{entry.note}</p>}</div>)}</div><p className="text-xs leading-relaxed text-atelier-ink3">Hot flashes, night sweats, sleep changes, mood changes, vaginal discomfort, bladder changes and joint discomfort are among the changes described during the menopause transition by ACOG and the National Institute on Aging.</p><button type="button" disabled={busy} onClick={async () => { if (await write("womens", { ...womens, mode: "cycle" })) setOpen(false); }} className={`${quietButton} w-full`}>Track my cycle instead</button></>}
    </div></Sheet>
  </>;
}

export function WomensQuickCard({ member, patchMember }) {
  const mode = member?.trackers?.womens?.mode || (Number(member?.age) >= 45 ? "menopause" : "cycle");
  return mode === "menopause" ? <MenopauseQuickCard member={member} patchMember={patchMember} /> : <CycleQuickCard member={member} patchMember={patchMember} />;
}

export function MensQuickCard({ goalId, member, patchMember, roomOnly = false, onClose }) {
  const { trackers, write, busy, error } = useTrackerWriter(member, patchMember); const mens = trackers.mens || {};
  const goal = goalId || member?.goal || "coreStrength"; const plan = mensTrackerPlan(goal, member?.focus || member?.focusId);
  const allEntries = useMemo(() => normalizeMens(mens), [mens]); const entries = allEntries.filter((entry) => entry.goalRawValue === goal);
  const earlier = allEntries.filter((entry) => entry.goalRawValue === "legacy");
  const [open, setOpen] = useTrackerRoom(roomOnly, onClose); const [draft, setDraft] = useState(null);
  const today = entries.find((entry) => entry.date === dayKey()); const streak = trackerStreak(entries.map((entry) => entry.date));
  const edit = (entry = today) => { setDraft(entry ? { ...entry, ratings: { ...entry.ratings } } : { id: newTrackerId(), date: dayKey(), goalRawValue: goal, ratings: {}, note: "" }); setOpen(true); };
  const complete = draft && plan.metrics.every((metric) => draft.ratings[metric.id] >= 1 && draft.ratings[metric.id] <= 5);
  const save = async () => { if (!complete || !draft.date || draft.date > dayKey()) return; if (await write("mens", { ...mens, entries: saveDatedEntry(allEntries, draft, true) })) setDraft(null); };
  const status = today ? `Logged today · ${plan.metrics.slice(0, 2).map((metric) => `${metric.title} ${today.ratings[metric.id] || "—"}/5`).join(" · ")}` : "Private, only for you. A quick check-in shows your trend.";
  return <>
    <TintCard roomOnly={roomOnly}><button type="button" onClick={() => setOpen(true)} className="flex w-full items-center gap-3 text-left"><span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-atelier-plum/10"><CheckCircle2 className={`h-7 w-7 ${today ? "text-atelier-sage" : "text-atelier-plum"}`} /></span><span className="min-w-0 flex-1"><strong className="block text-[17px]">Men&apos;s Pelvic Health</strong><span className="mt-1 block text-xs leading-relaxed text-atelier-ink2">{status}</span></span><Chevron /></button><RoseAction tone="plum" className="mt-4" onClick={() => edit()}>{today ? "Update today's check-in" : "Log today's progress"}</RoseAction></TintCard>
    <Sheet open={open} onClose={() => setOpen(false)} title={draft ? "Today's check-in" : "Men's Pelvic Health"}><div className="space-y-5 pb-6"><ErrorMessage error={error} />
      {draft ? <><button type="button" className={quietButton} onClick={() => setDraft(null)}>Back to your timeline</button><Serif size={28}>{plan.title}</Serif><p className="text-sm text-atelier-ink2">{plan.subtitle}</p><label className="block text-sm">Date<input type="date" value={draft.date} max={dayKey()} onChange={(event) => setDraft({ ...draft, date: event.target.value })} className={`${fieldClass} mt-2`} /></label>{plan.metrics.map((metric) => <Rating key={metric.id} metric={metric} value={draft.ratings[metric.id]} onChange={(value) => setDraft({ ...draft, ratings: { ...draft.ratings, [metric.id]: value } })} />)}<label className="block text-sm font-semibold">Private note<textarea value={draft.note || ""} rows={3} onChange={(event) => setDraft({ ...draft, note: event.target.value })} placeholder="Anything you want to remember?" className={`${fieldClass} mt-2`} /></label><RoseAction tone="plum" disabled={busy || !complete || !draft.date || draft.date > dayKey()} onClick={save}>{busy ? "Saving…" : complete ? "Save check-in" : "Answer every question to save"}</RoseAction></>
        : <><div className={cardClass}><Eyebrow>YOUR PRIVATE PROGRESS</Eyebrow><Serif size={28} className="mt-2">{plan.title}</Serif><p className="mt-2 text-sm leading-relaxed text-atelier-ink2">{plan.subtitle}</p><p className="mt-3 text-xs font-semibold text-atelier-plum">{streak} day check-in streak · {entries.length} check-ins</p></div><WeekStrip entries={entries} /><RoseAction tone="plum" onClick={() => edit()}>{today ? "Update today's check-in" : "Log today's progress"}</RoseAction><div className={cardClass}><strong className="text-sm">What your check-ins show</strong><p className="mt-2 text-sm leading-relaxed text-atelier-ink2">{mensPattern(entries, plan)}</p></div><div className={cardClass}><Eyebrow>YOUR TIMELINE</Eyebrow>{!entries.length && <p className="mt-3 text-sm text-atelier-ink2">Your first check-in starts your private progress timeline.</p>}{[...entries, ...earlier].sort((a, b) => b.date.localeCompare(a.date)).map((entry) => <div key={entry.id} className="border-b border-atelier-line py-4 last:border-0"><div className="flex items-center gap-2"><p className="flex-1 text-sm font-semibold">{formatDay(entry.date)}</p>{!entry.legacy && <button type="button" aria-label={`Edit men's check-in on ${entry.date}`} className="grid h-11 w-11 place-items-center" onClick={() => edit(entry)}><Pencil className="h-4 w-4" /></button>}<button type="button" aria-label={`Delete men's check-in on ${entry.date}`} disabled={busy} className="grid h-11 w-11 place-items-center text-atelier-rosewood" onClick={() => write("mens", { ...mens, entries: allEntries.filter((item) => item.id !== entry.id) })}><Trash2 className="h-4 w-4" /></button></div><p className="mt-1 text-xs leading-relaxed text-atelier-ink2">{entry.legacy ? "Earlier tracker entry" : plan.metrics.filter((metric) => entry.ratings[metric.id] != null).map((metric) => `${metric.title} ${entry.ratings[metric.id]}/5`).join(" · ")}</p>{entry.note && <p className="mt-2 whitespace-pre-wrap text-xs text-atelier-ink2">{entry.note}</p>}</div>)}</div><p className="text-xs leading-relaxed text-atelier-ink3">Men&apos;s pelvic floor symptoms can involve bladder leaks, urgency, after-dribble, bowel control, pelvic discomfort, erections, and control. Your tracker follows only the signals connected to the goal you selected.</p></>}
    </div></Sheet>
  </>;
}

function WaterBottle({ fill = 0, small = false }) {
  return <span className={`relative block shrink-0 overflow-hidden rounded-[18px] border border-atelier-line bg-white/70 ${small ? "h-16 w-11" : "h-40 w-24"}`} aria-hidden="true"><span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-atelier-plum to-atelier-sage transition-[height] duration-500" style={{ height: `${Math.max(3, Math.min(1, fill) * 100)}%` }} /><span className="absolute inset-y-3 left-2 w-1 rounded-full bg-white/45" /></span>;
}
export function WaterQuickCard({ member, patchMember, roomOnly = false, onClose }) {
  const { trackers, write, busy, error } = useTrackerWriter(member, patchMember);
  const water = useMemo(() => normalizeWater(trackers.water), [trackers.water]); const today = dayKey(); const ml = water.days[today] || 0;
  const [open, setOpen] = useTrackerRoom(roomOnly, onClose); const [draft, setDraft] = useState(null); const [vesselError, setVesselError] = useState(""); const [pendingDelete, setPendingDelete] = useState(null);
  const streak = waterStreak(water); const history = Object.keys(water.entries).filter((key) => water.entries[key].length).sort().reverse();
  const status = ml >= water.goalML ? "Goal reached. Your bladder likes steady, not sudden." : ml ? `${liter(water.goalML - ml)} to go. Steady sips, not big gulps.` : "Sip steadily through the day. Big gulps wake the bladder up.";
  const irritants = (water.entries[today] || []).filter((entry) => waterEntry(entry).irritant).length;
  const log = (drink) => write("water", logWater(water, drink));
  const editVessel = (vessel) => { setVesselError(""); setDraft(vessel ? { ...vessel, amount: String(Number((vessel.preferredUnit === "fluidOunces" ? vessel.milliliters / 29.5735 : vessel.milliliters).toFixed(1))) } : { id: newTrackerId(), name: "", amount: "", preferredUnit: "milliliters" }); };
  const saveVessel = async () => {
    const name = draft.name.trim(); const volume = vesselMilliliters(draft.amount, draft.preferredUnit);
    if (!name || name.length > 40) { setVesselError("Use a name between 1 and 40 characters."); return; }
    if (!volume) { setVesselError(draft.preferredUnit === "fluidOunces" ? "Enter a volume from 2 to 135 fl oz." : "Enter a volume from 50 to 4000 ml."); return; }
    if (water.customVessels.some((vessel) => vessel.id !== draft.id && vessel.name.toLowerCase() === name.toLowerCase())) { setVesselError("A bottle with this name already exists. Choose another name."); return; }
    const vessel = { id: draft.id, name, milliliters: volume, preferredUnit: draft.preferredUnit };
    if (await write("water", { ...water, customVessels: [...water.customVessels.filter((item) => item.id !== draft.id), vessel] })) setDraft(null);
  };
  const measurement = (vessel) => vessel.preferredUnit === "fluidOunces" ? `${Number((vessel.milliliters / 29.5735).toFixed(1))} fl oz` : `${vessel.milliliters} ml`;
  return <>
    <TintCard roomOnly={roomOnly}><button type="button" onClick={() => setOpen(true)} className="flex w-full items-center gap-4 text-left"><WaterBottle fill={ml / water.goalML} small /><span className="min-w-0 flex-1"><strong className="block text-[17px]">Track water</strong><span className="mt-1 block text-xs leading-relaxed text-atelier-ink2">{status}</span><span className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-atelier-plum">{liter(ml)} of {liter(water.goalML)}{streak > 0 && <><span> · </span><Flame className="h-3 w-3" />{streak} day streak</>}</span></span><Chevron /></button></TintCard>
    <Sheet open={open} onClose={() => setOpen(false)} title={draft ? "Custom bottle" : "Water"}><div className="space-y-5 pb-6"><ErrorMessage error={error} />
      {draft ? <><button type="button" className={quietButton} onClick={() => setDraft(null)}>Back to water</button><Serif size={28}>{water.customVessels.some((vessel) => vessel.id === draft.id) ? "Edit your bottle" : "Add your bottle"}</Serif><p className="text-sm leading-relaxed text-atelier-ink2">Use the name you recognize at a glance. Editing or deleting this bottle never changes past water entries.</p><label className="block text-sm font-semibold">Bottle name<input value={draft.name} maxLength={40} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Gym bottle" className={`${fieldClass} mt-2`} /></label><div><label className="block text-sm font-semibold" htmlFor="water-vessel-volume">Volume</label><div className="mt-2 flex gap-2"><input id="water-vessel-volume" type="number" inputMode="decimal" step="any" value={draft.amount} onChange={(event) => setDraft({ ...draft, amount: event.target.value })} className={fieldClass} /><select aria-label="Bottle volume unit" value={draft.preferredUnit} onChange={(event) => { const volume = vesselMilliliters(draft.amount, draft.preferredUnit); const unit = event.target.value; setDraft({ ...draft, preferredUnit: unit, amount: volume ? String(Number((unit === "fluidOunces" ? volume / 29.5735 : volume).toFixed(1))) : draft.amount }); }} className="min-h-11 rounded-xl border border-atelier-line bg-white px-3 text-sm"><option value="milliliters">ml</option><option value="fluidOunces">fl oz</option></select></div><p className="mt-2 text-xs text-atelier-ink3">{draft.preferredUnit === "fluidOunces" ? "2–135 fl oz" : "50–4000 ml"}</p></div><ErrorMessage error={vesselError} /><RoseAction disabled={busy} onClick={saveVessel}>{busy ? "Saving…" : "Save bottle"}</RoseAction></>
        : <><div className={`${cardClass} flex items-center justify-center gap-6 py-6`}><WaterBottle fill={ml / water.goalML} /><div className="min-w-0"><Eyebrow>TODAY</Eyebrow><Serif size={34} className="mt-2">{liter(ml)}</Serif><p className="text-sm text-atelier-ink2">of {liter(water.goalML)}</p><p className="mt-3 text-xs leading-relaxed text-atelier-ink3">{irritants} caffeine or alcohol {irritants === 1 ? "drink" : "drinks"}</p></div></div>
          <fieldset><legend className="mb-2 text-xs font-semibold text-atelier-ink3">DAILY GOAL · {liter(water.goalML).toUpperCase()}</legend><div className="flex gap-2">{[1500, 2000, 2500].map((goal) => <button key={goal} type="button" aria-pressed={water.goalML === goal} disabled={busy} onClick={() => write("water", setWaterGoal(water, goal))} className={`${quietButton} flex-1 ${goal === water.goalML ? "bg-atelier-plum text-white" : ""}`}>{liter(goal)}</button>)}</div></fieldset>
          <div className={cardClass}><Eyebrow>YOUR WATER STREAK</Eyebrow><Serif size={26} className="mt-2">{streak} steady {streak === 1 ? "day" : "days"}</Serif><div className="mt-4 flex gap-3 overflow-x-auto pb-2" aria-label="Fourteen day water history">{recentDays(14).map((key) => { const goal = water.dailyGoals[key] || water.goalML; const total = water.days[key] || 0; return <div key={key} className="w-12 shrink-0 text-center" aria-label={`${formatDay(key)}: ${total} of ${goal} ml`}><span className="block text-[10px] text-atelier-ink3">{parseDay(key).toLocaleDateString(undefined, { weekday: "narrow" })}</span><div className="mt-2 flex justify-center"><WaterBottle fill={total / goal} small /></div><span className={`mt-1 block text-[10px] ${total >= goal ? "font-bold text-atelier-sage" : "text-atelier-ink3"}`}>{total >= goal ? "✓ " : ""}{parseDay(key).getDate()}</span></div>; })}</div><p className="mt-3 text-xs leading-relaxed text-atelier-ink3">A day fills when your logged water reaches that day’s goal. An unfinished today never erases yesterday’s streak.</p></div>
          <div><Serif size={22}>Log a drink</Serif><div className="mt-3 grid grid-cols-2 gap-3">{WATER_DRINKS.map((drink) => { const Icon = drink.id === "coffee" || drink.id === "tea" ? Coffee : drink.id === "wine" ? Wine : GlassWater; return <button key={drink.id} type="button" disabled={busy} onClick={() => log(drink)} className="min-h-24 rounded-2xl border border-atelier-line bg-white p-4 text-left disabled:opacity-50"><Icon className="mb-2 h-5 w-5 text-atelier-plum" /><strong className="block text-sm">{drink.title}</strong><span className="mt-1 block text-xs text-atelier-ink3">{drink.milliliters} ml{drink.irritant ? " · caffeine or alcohol" : ""}</span></button>; })}{water.customVessels.map((vessel) => <div key={vessel.id} className="rounded-2xl border border-atelier-line bg-white p-3"><button type="button" disabled={busy} onClick={() => log(vessel)} className="min-h-16 w-full text-left"><GlassWater className="mb-2 h-5 w-5 text-atelier-plum" /><strong className="block text-sm">{vessel.name}</strong><span className="mt-1 block text-xs text-atelier-ink3">{measurement(vessel)}</span></button><div className="mt-2 flex justify-end gap-1 border-t border-atelier-line"><button type="button" aria-label={`Edit ${vessel.name}`} onClick={() => editVessel(vessel)} className="grid h-11 w-11 place-items-center"><Pencil className="h-4 w-4" /></button><button type="button" aria-label={`Delete ${vessel.name}`} onClick={() => setPendingDelete(vessel.id)} className="grid h-11 w-11 place-items-center text-atelier-rosewood"><Trash2 className="h-4 w-4" /></button></div>{pendingDelete === vessel.id && <div className="mt-2 rounded-xl bg-atelier-rose/10 p-3 text-xs"><p>Delete {vessel.name}? Past drinks stay in your log.</p><div className="mt-2 flex gap-2"><button type="button" className="min-h-11 font-semibold text-atelier-rosewood" disabled={busy} onClick={async () => { if (await write("water", { ...water, customVessels: water.customVessels.filter((item) => item.id !== vessel.id) })) setPendingDelete(null); }}>Delete bottle</button><button type="button" className="min-h-11" onClick={() => setPendingDelete(null)}>Keep bottle</button></div></div>}</div>)}<button type="button" onClick={() => editVessel(null)} className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-atelier-plum/40 p-4 text-sm font-semibold text-atelier-plum"><Plus className="h-6 w-6" />Add a custom bottle</button></div></div>
          <div className={cardClass}><Eyebrow>YOUR DRINK LOG</Eyebrow>{!history.length && <p className="mt-3 text-sm text-atelier-ink2">Tap a drink to begin your own diary.</p>}{history.map((key) => <div key={key} className="mt-4"><p className="border-b border-atelier-line pb-2 text-sm font-semibold">{formatDay(key)} · {liter(water.days[key] || 0)}</p>{[...water.entries[key]].sort((a, b) => (b.at || "").localeCompare(a.at || "")).map((entry) => { const drink = waterEntry(entry); return <div key={entry.id} className="flex items-center gap-3 border-b border-atelier-line py-3 last:border-0"><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{drink.title} <span className="font-normal text-atelier-ink3">· {drink.milliliters} ml</span></p><p className="mt-1 text-xs text-atelier-ink3">{entry.at ? asDate(entry.at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "Earlier total · time not recorded"}{drink.irritant ? " · caffeine or alcohol" : ""}</p></div><button type="button" disabled={busy} onClick={() => write("water", deleteWaterEntry(water, key, entry.id))} aria-label={`Remove ${drink.title} from ${key}`} className="grid h-11 w-11 place-items-center text-atelier-rosewood"><Trash2 className="h-4 w-4" /></button></div>; })}</div>)}</div>
          <div className={cardClass}><strong className="text-sm">Protect your night</strong><p className="mt-2 text-sm leading-relaxed text-atelier-ink2">Front-load your water before the evening and keep the last 2–3 hours before bed to small sips. Fewer night trips show up right in Your Nights.</p></div><p className="text-xs leading-relaxed text-atelier-ink3">Many adults do well on roughly 1.5–2 liters of fluids spread across the day; the right amount is individual, and clinicians tune it up for infection-prone bladders and down for very overactive ones. Caffeine and alcohol can irritate the bladder. This is your own diary, not medical advice.</p>
        </>}
    </div></Sheet>
  </>;
}
// --- C-section education ---------------------------------------------------------

const CSECTION = {
  title: "4 stages wound healing",
  subtitle: "how to massage Scar",
  video: "https://firebasestorage.googleapis.com/v0/b/pelvic-floor-exercise-908ed.appspot.com/o/C%20Sections%2F4%20stages%20wound%20healing.mp4?alt=media",
};

export function CSectionQuickCard() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative mt-5 block w-full overflow-hidden rounded-[24px] border border-white/35 p-5 text-left text-white"
        style={{ minHeight: 174, backgroundImage: "linear-gradient(135deg, #C43E63 0%, #E65473 100%)" }}
      >
        <span aria-hidden="true" className="absolute -right-10 -top-16 h-[170px] w-[170px] rounded-full bg-white/10" />
        <span aria-hidden="true" className="absolute -left-14 bottom-[-40px] h-[108px] w-[108px] rounded-full bg-atelier-paper/[0.08]" />
        <span className="relative flex items-start gap-4">
          <span className="min-w-0 flex-1">
            <Eyebrow tone="nightInk" className="!text-white/75">C-SECTION EDUCATION</Eyebrow>
            <span className="mt-1.5 block font-serif text-[29px] leading-[1.05]">{CSECTION.title}</span>
            <span className="mt-1 block text-[14px] font-medium text-white/85">{CSECTION.subtitle}</span>
            <span className="mt-3 inline-flex h-[30px] items-center gap-1.5 rounded-full bg-white/[0.13] px-3 text-[12px] font-semibold text-white/90">
              <Play className="h-3 w-3 fill-current" aria-hidden="true" /> Clinical guide · 40 sec video
            </span>
          </span>
          <span className="flex shrink-0 flex-col items-center gap-3">
            <span aria-hidden="true" className="grid h-[78px] w-[78px] place-items-center rounded-full border-2 border-white/60">
              <span className="block h-[3px] w-10 rounded-full bg-white/90" />
            </span>
            <span className="grid h-[34px] w-[34px] place-items-center rounded-full bg-white text-atelier-rosewood">
              <ArrowRight className="h-4 w-4" strokeWidth={2.6} aria-hidden="true" />
            </span>
          </span>
        </span>
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="C-section education" labelledBy="csection-sheet">
        <div className="pb-6">
          <Eyebrow>CLINICAL GUIDE</Eyebrow>
          <Serif size={26} className="mt-1">Understand what your scar is doing before you touch it.</Serif>
          <p className="mt-3 text-[15px] leading-relaxed text-atelier-ink2">
            This visual lesson explains the four stages of healing, when gentle massage may begin, and which changes mean you should stop and contact your clinician.
          </p>
          <div className="mt-4 overflow-hidden rounded-[22px] bg-atelier-night">
            <video src={CSECTION.video} controls playsInline preload="metadata" className="aspect-video w-full" />
          </div>
          <p className="mt-2 text-[12px] text-atelier-ink3">Turn on sound for the full explanation.</p>
          <p className="mt-4 text-[14.5px] leading-relaxed text-atelier-ink">The massage lesson is for people who are at least 6 weeks postpartum and whose incision is fully healed.</p>
          <p className="mt-2 text-[14.5px] font-semibold text-atelier-ink">Fully healed means:</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-[14px] text-atelier-ink2">
            <li>The incision is closed along its whole length, with no scabs or openings.</li>
            <li>No drainage, warmth, spreading redness or swelling.</li>
            <li>No fever and no pain that is getting worse.</li>
          </ul>
          <p className="mt-4 rounded-[16px] bg-atelier-rose/[0.08] p-3 text-[13.5px] leading-relaxed text-atelier-rosewood">
            Get medical advice for an opening incision, drainage, spreading redness, warmth, swelling, fever, a bad smell or pain that is getting worse.
          </p>
          <p className="mt-3 text-[12.5px] text-atelier-ink3">This guide provides general education and does not replace advice from the clinician who knows your surgery and recovery.</p>
        </div>
      </Sheet>
    </>
  );
}
