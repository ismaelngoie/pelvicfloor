"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Leaf, Flame, Moon, MapPin, PersonStanding } from "lucide-react";
import { Sheet } from "./ui";
import { ACard, Eyebrow, RoseAction, Serif } from "./atelierUI";
import { useMember } from "./MemberProvider";
import { dayKey } from "./TrackerCards";
import { selectableGoalsForPathway } from "@/lib/program";

export const DIFFICULTIES = [
  { id: "easy", title: "Easy", detail: "A gentler dose with more time to learn each movement.", Icon: Leaf },
  { id: "medium", title: "Medium", detail: "The full daily plan with steady progression.", Icon: PersonStanding },
  { id: "hard", title: "Hard", detail: "Advanced exercises, more work, and less rest.", Icon: Flame },
];

export const RESPONSES = [
  ["justRight", "Just right"], ["couldNotFeel", "I could not feel it"],
  ["tooHard", "Too hard"], ["pain", "I felt pain"], ["tooEasy", "Too easy"],
];

export function DifficultyPicker({ open, onClose }) {
  const { difficulty, setDifficulty } = useMember();
  const [selected, setSelected] = useState(difficulty || "easy");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { if (open) setSelected(difficulty || "easy"); }, [open, difficulty]);
  return <Sheet open={open} onClose={onClose} title="Workout Difficulty">
    <div className="space-y-4 pb-5">
      <Serif size={32}>Choose Your Difficulty</Serif>
      <p className="text-[15px] text-atelier-ink2">Your daily exercises, practice time, rounds, and rest will change with this choice.</p>
      {DIFFICULTIES.map(({ id, title, detail, Icon }) => <button key={id} type="button" onClick={() => setSelected(id)} aria-pressed={selected === id} className={`flex min-h-[90px] w-full items-center gap-4 rounded-[22px] border p-4 text-left ${selected === id ? "border-atelier-rosewood bg-atelier-rose/[0.08]" : "border-atelier-line bg-atelier-card"}`}>
        <Icon className="h-7 w-7 shrink-0 text-atelier-rosewood" aria-hidden="true" />
        <span className="flex-1"><span className="block font-serif text-[23px] text-atelier-ink">{title}</span><span className="mt-1 block text-sm text-atelier-ink2">{detail}</span></span>
        {selected === id && <Check className="h-5 w-5 text-atelier-rosewood" aria-hidden="true" />}
      </button>)}
      {error && <p role="alert" className="text-sm text-atelier-rosewood">{error}</p>}
      <RoseAction disabled={saving} onClick={async () => { setSaving(true); try { await setDifficulty(selected); onClose(); } catch { setError("Your difficulty could not be saved. Please try again."); } finally { setSaving(false); } }}>{saving ? "Saving…" : "Use This Difficulty"}</RoseAction>
    </div>
  </Sheet>;
}

const PATHWAYS = [
  { id: "womensPelvicHealth", title: "Women’s pelvic health", detail: "Bladder, intimacy, postpartum, prolapse, pain, and core goals.", goals: ["intimacy", "bladderLeaks", "postpartum", "coreStrength", "pelvicPain", "prolapse", "diastasisRecti", "fitness"] },
  { id: "mensPelvicHealth", title: "Men’s pelvic health", detail: "Erections, lasting longer, leaks, prostate recovery, pain, bowel control, and core goals.", goals: ["intimacy", "bladderLeaks", "prostateRecovery", "pelvicPain", "bowelControl", "coreStrength", "fitness"] },
];

export function PathwayPicker({ open, onClose, required = false }) {
  const { member, goalId, pathway, patchMember } = useMember();
  const [selected, setSelected] = useState(pathway || "womensPelvicHealth");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { if (open) setSelected(pathway || "womensPelvicHealth"); }, [open, pathway]);
  return <Sheet open={open} onClose={onClose} dismissible={!required} title="Pelvic Health Plan"><div className="space-y-4 pb-5">
    <Serif size={32}>Your pelvic health plan</Serif>
    <p className="text-[15px] text-atelier-ink2">We ask so your questions, exercises, and tracking fit your body.</p>
    {PATHWAYS.map((p) => <button type="button" key={p.id} aria-pressed={selected === p.id} onClick={() => setSelected(p.id)} className={`block w-full rounded-[22px] border p-4 text-left ${selected === p.id ? "border-atelier-rosewood bg-atelier-rose/[0.08]" : "border-atelier-line bg-atelier-card"}`}><span className="block font-serif text-[23px] text-atelier-ink">{p.title}</span><span className="mt-1 block text-sm text-atelier-ink2">{p.detail}</span></button>)}
    <p className="text-sm text-atelier-ink2">Changing this updates your available goals, daily exercises, Coach Mia, and health tracking. If your current goal is not part of the new plan, the app will safely move you to pelvic floor and core strength.</p>
    {error && <p role="alert" className="text-sm text-atelier-rosewood">{error}</p>}
    <RoseAction disabled={saving} onClick={async () => { setSaving(true); try { const p = PATHWAYS.find((v) => v.id === selected); await patchMember({ pathway: selected, ...(selected !== pathway ? { focus: null } : {}), ...(!selectableGoalsForPathway(selected).some((goal) => goal.id === goalId) ? { goal: "coreStrength", goalTitle: "Build Core Strength", focus: null, programDay: 1, programStartedAt: new Date().toISOString() } : {}) }); onClose(); } catch { setError("Your plan could not be saved. Please try again."); } finally { setSaving(false); } }}>{saving ? "Saving…" : "Use This Plan"}</RoseAction>
  </div></Sheet>;
}

export function SessionFeedback({ programDay, graduation = false, onSaved, dark = false }) {
  const { saveSessionFeedback } = useMember();
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  return <div className={`mt-5 w-full max-w-md rounded-[22px] border p-4 text-left ${dark ? "border-white/20 bg-white/10 text-white" : "border-atelier-line bg-atelier-card text-atelier-ink"}`}>
    <p className="font-serif text-[23px]">{graduation ? "How does your body feel now?" : "How did that feel?"}</p>
    <p className={`mt-1 text-sm ${dark ? "text-white/70" : "text-atelier-ink2"}`}>Your answer shapes the next session.</p>
    <div className="mt-3 flex flex-wrap gap-2">{RESPONSES.map(([id, title]) => <button key={id} type="button" disabled={saving} aria-pressed={selected === id} onClick={async () => { setSaving(true); setError(""); try { await saveSessionFeedback(id, { programDay, graduation }); setSelected(id); onSaved?.(id); } catch { setError("Could not save your answer. Please try again."); } finally { setSaving(false); } }} className={`min-h-[44px] rounded-full border px-4 text-sm ${selected === id ? "border-atelier-rose bg-atelier-rose text-white" : dark ? "border-white/25" : "border-atelier-line"}`}>{title}</button>)}</div>
    {selected === "pain" && <p className="mt-3 text-sm">Stop any movement that hurts. Your plan will ease back. If pain persists, speak with a pelvic health professional.</p>}
    {selected && selected !== "pain" && <p className="mt-3 text-sm">Saved. Your next session will use this feedback.</p>}
    {error && <p role="alert" className="mt-2 text-sm">{error}</p>}
  </div>;
}

function localDate(key) { const [y, m, d] = key.split("-").map(Number); return new Date(y, m - 1, d); }

export function NightWaking({ open, onClose }) {
  const { member, patchMember } = useMember();
  const counts = member?.trackers?.nights?.counts || {};
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const today = dayKey();
  const history = Array.from({ length: 14 }, (_, index) => { const date = new Date(); date.setDate(date.getDate() - index); return dayKey(date); });
  const mornings = useMemo(() => Array.from({ length: 42 }, (_, i) => { const date = new Date(); date.setDate(date.getDate() - (41 - i)); const key = dayKey(date); return { key, count: counts[key] }; }), [counts, today]);
  const answered = mornings.filter((m) => m.count != null);
  const average = answered.length ? answered.reduce((n, m) => n + m.count, 0) / answered.length : 0;
  async function save(key, value) {
    setSaving(true); setError("");
    try { const next = { ...counts }; if (value == null) delete next[key]; else next[key] = value; await patchMember({ trackers: { ...member?.trackers, nights: { ...member?.trackers?.nights, counts: next } } }); } catch { setError("Your answer could not be saved. Please try again."); } finally { setSaving(false); }
  }
  return <Sheet open={open} onClose={onClose} title="Your Nights"><div className="space-y-5 pb-5">
    <div><Eyebrow>Night waking</Eyebrow><Serif size={30} className="mt-2">Your nights, morning by morning.</Serif><p className="mt-2 text-sm text-atelier-ink2">Getting up at night is one of the clearest symptoms your training can move. Answer one question each morning and watch it.</p></div>
    <ACard className="p-4"><Eyebrow>{counts[today] == null ? "How many times did you get up last night?" : "Last night"}</Eyebrow>{counts[today] != null && <p className="mt-3 font-serif text-5xl text-atelier-ink">{counts[today] === 3 ? "3+" : counts[today]} <span className="text-xl italic text-atelier-ink2">{counts[today] === 0 ? "a dry night" : counts[today] === 1 ? "time up" : "times up"}</span></p>}<div className="mt-4 grid grid-cols-4 gap-2">{[0, 1, 2, 3].map((n) => <button key={n} disabled={saving} type="button" aria-label={`${n === 3 ? "3 or more" : n} times up last night`} aria-pressed={counts[today] === n} onClick={() => save(today, n)} className={`h-12 rounded-full border text-lg font-semibold ${counts[today] === n ? "border-atelier-rose bg-atelier-rose text-white" : "border-atelier-line text-atelier-ink"}`}>{n === 3 ? "3+" : n}</button>)}</div></ACard>
    {answered.length >= 2 && <ACard className="p-4"><div className="flex justify-between gap-3"><Serif size={22}>Six weeks of nights</Serif><span className="text-xs text-atelier-rosewood">AVG {average.toFixed(1)}</span></div><div role="img" aria-label={`Six week chart of night waking. Average ${average.toFixed(1)} times per night.`} className="mt-4 flex h-[88px] items-end gap-[2px]">{mornings.map(({ key, count }) => <span key={key} title={`${key}: ${count == null ? "No answer" : count === 3 ? "3+" : count}`} className="min-w-0 flex-1 rounded-full" style={{ height: count == null ? 5 : count === 0 ? 12 : 20 + count * 22, background: count == null ? "#3A2F4419" : count === 0 ? "#6F8F7A" : count === 3 ? "#C43E63" : "#E65473" }} />)}</div><p className="mt-3 text-[11px] text-atelier-ink2">DRY NIGHT · 1–2 · 3+ · NO ANSWER</p></ACard>}
    {error && <p role="alert" className="text-sm text-atelier-rosewood">{error}</p>}
    <ACard className="divide-y divide-atelier-line px-4"><p className="py-3 font-serif text-[21px]">Your mornings</p>{history.length ? history.slice(0, 90).map((key) => <div key={key} className="flex items-center gap-3 py-3 text-sm"><span className="flex-1 text-atelier-ink">{localDate(key).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span><div className="flex gap-1">{[0, 1, 2, 3].map((value) => <button type="button" key={value} disabled={saving} aria-label={`${key}: ${value === 3 ? "3 or more" : value} times up`} aria-pressed={counts[key] === value} onClick={() => save(key, value)} className={`min-h-[44px] min-w-[38px] rounded-full border px-2 text-sm ${counts[key] === value ? "border-atelier-rose bg-atelier-rose text-white" : "border-atelier-line"}`}>{value === 3 ? "3+" : value}</button>)}</div>{counts[key] != null && <button type="button" onClick={() => save(key, null)} disabled={saving} className="min-h-[44px] px-2 text-atelier-rosewood" aria-label={`Remove night waking answer for ${key}`}>×</button>}</div>) : <p className="py-4 text-sm text-atelier-ink2">Your first answer starts your timeline.</p>}</ACard>
  </div></Sheet>;
}

export function TherapistFinder({ open, onClose }) {
  const [location, setLocation] = useState("");
  const [query, setQuery] = useState("");
  return <Sheet open={open} onClose={onClose} title="Find a Pelvic Therapist"><div className="space-y-4 pb-5"><MapPin className="h-9 w-9 text-atelier-rosewood" aria-hidden="true" /><Serif size={30}>Find care near you.</Serif><p className="text-sm text-atelier-ink2">Search your city or ZIP code for pelvic floor physical therapists, addresses and contact details.</p><form onSubmit={(e) => { e.preventDefault(); if (location.trim()) setQuery(`pelvic floor physical therapist near ${location.trim()}`); }} className="flex gap-2"><input value={location} onChange={(e) => setLocation(e.target.value)} aria-label="City or ZIP code" placeholder="City or ZIP code" className="min-w-0 flex-1 rounded-xl border border-atelier-line bg-white px-3 py-3 text-atelier-ink" /><button type="submit" className="rounded-xl bg-atelier-rosewood px-4 text-sm font-semibold text-white">Search</button></form>{query && <><iframe title="Nearby pelvic floor therapists" src={`https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed`} className="h-[340px] w-full rounded-[20px] border border-atelier-line" loading="lazy" referrerPolicy="no-referrer" /><a href={`https://www.google.com/maps/search/${encodeURIComponent(query)}`} target="_blank" rel="noopener noreferrer" className="block min-h-[44px] py-3 text-center font-semibold text-atelier-rosewood">Open addresses and contact details in Maps</a></>}</div></Sheet>;
}
