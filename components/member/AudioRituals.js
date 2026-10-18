"use client";

import { useEffect, useState } from "react";
import { audioSessionById } from "@/lib/audioCatalog";
import { audioPreference, setAudioPreference } from "@/lib/audioJourney";

const beforeIds = ["intimacy_relax_before", "intimacy_sensation_scan", "intimacy_dryness_slow_start", "intimacy_body_safety"];
const prompts = {
  solo: [
    ["Settle", "Take three slow breaths. Let your jaw, belly, and pelvic floor soften together."],
    ["Notice", "Choose one neutral or pleasant body signal. There is no result to chase."],
    ["Choose", "Decide what feels welcome now: continue, change pace, pause, or finish."],
    ["Keep the signal", "Remember the pressure, pace, or position that felt most comfortable."],
  ],
  partner: [
    ["Settle together", "Take three slow breaths without needing to move toward anything else."],
    ["Pressure-free connection", "Choose comfortable, non-goal-directed touch or simply stay close."],
    ["Say what feels good", "Each person can say continue, lighter, slower, pause, or stop. Every answer is welcome."],
    ["Choose the pace", "Continue only at a pace that keeps comfort and choice present for both of you."],
  ],
};

export function readAudioRituals(memberId) {
  return audioPreference(memberId, "dailyRituals", { records: [], intimacyRitualsEnabled: false });
}

function recordRitual(memberId, moment, fields = {}) {
  const store = readAudioRituals(memberId);
  const record = { id: crypto.randomUUID(), date: new Date().toISOString(), goal: "intimacy", moment, ratings: {}, ...fields };
  setAudioPreference(memberId, "dailyRituals", { ...store, records: [record, ...store.records].slice(0, 360) });
}

export default function AudioRituals({ memberId, pathway, onAudio }) {
  const [enabled, setEnabled] = useState(false);
  const [page, setPage] = useState(null);
  const [bodyState, setBodyState] = useState(null);
  const [ratings, setRatings] = useState({});
  const [mode, setMode] = useState(null);
  const [index, setIndex] = useState(0);
  const [saved, setSaved] = useState(false);
  useEffect(() => { setEnabled(readAudioRituals(memberId).intimacyRitualsEnabled); }, [memberId]);
  const enable = (value) => { setEnabled(value); setAudioPreference(memberId, "dailyRituals", { ...readAudioRituals(memberId), intimacyRitualsEnabled: value }); };
  const back = () => { setPage(null); setMode(null); setIndex(0); setSaved(false); };
  const rowClass = "min-h-12 w-full rounded-2xl border border-atelier-line bg-white/80 p-4 text-left";
  return <section className="my-6 rounded-[22px] border border-atelier-line bg-white/50 p-5">
    <details><summary className="cursor-pointer font-serif text-xl">Private Rituals</summary><p className="mt-3 text-sm leading-relaxed text-atelier-ink3">Use these only when they fit your life. The app never asks whether intimacy happened.</p>
      {!enabled ? <div className="mt-4 space-y-3 text-sm"><p>Before: choose preparation that matches your body</p><p>After: optional private comfort and sensation check</p><p>No sexual-activity log and no partner assumption</p><button type="button" onClick={() => enable(true)} className="min-h-12 w-full rounded-full bg-cta-gradient p-3 font-semibold text-white">Add My Private Rituals</button></div>
        : <div className="mt-4 space-y-4">
          {page && <button type="button" onClick={back} className="min-h-11 text-sm font-semibold text-atelier-rose">Back to private rituals</button>}
          {!page && <><button type="button" className={rowClass} onClick={() => setPage("before")}><strong className="block text-sm">Before Intimacy</strong><span className="mt-1 block text-xs text-atelier-ink3">Check how your body feels, then choose a guided audio preparation.</span></button><button type="button" className={rowClass} onClick={() => setPage("after")}><strong className="block text-sm">After Intimacy</strong><span className="mt-1 block text-xs text-atelier-ink3">Privately note comfort, sensation, confidence, and any discomfort.</span></button><button type="button" className={rowClass} onClick={() => setPage("connection")}><strong className="block text-sm">Solo or Partner Mode</strong><span className="mt-1 block text-xs text-atelier-ink3">Choose pressure-free connection prompts alone or with someone.</span></button><button type="button" className="min-h-11 w-full text-sm text-atelier-rose" onClick={() => enable(false)}>Turn Off Private Rituals</button></>}
          {page === "before" && <><h4 className="text-lg font-semibold">How does your body feel right now?</h4><p className="text-sm text-atelier-ink3">This only helps Coach Mia™ show a better preparation. It is not a test.</p><Rating label="Body readiness" value={bodyState} onChange={setBodyState} low="Guarded" high="Ready" /><p className="font-semibold">Choose your preparation</p>{(pathway === "mensPelvicHealth" ? ["mens_intimacy_release", "mens_erection_support", "mens_control_before_intimacy", "mens_confidence_reset"] : beforeIds).map((id) => { const session = audioSessionById(id); return <button type="button" key={id} disabled={bodyState == null} className={`${rowClass} disabled:opacity-50`} onClick={() => { recordRitual(memberId, "beforeIntimacy", { audioSessionID: id, bodyState }); onAudio(session); }}><strong className="block text-sm">{session.title}</strong><span className="mt-1 block text-xs text-atelier-ink3">{session.subtitle}</span></button>; })}</>}
          {page === "after" && (saved ? <p role="status" className="py-5 font-semibold text-atelier-rose">Private check-in saved in this browser.</p> : <><h4 className="text-lg font-semibold">What do you want to remember?</h4><p className="text-sm text-atelier-ink3">Answer any one or all four. This is private and optional.</p>{[["comfort", "Comfort", "Low", "High"], ["sensation", "Sensation", "Low", "Clear"], ["confidence", "Confidence", "Low", "Strong"], ["discomfort", "Discomfort afterward", "None", "High"]].map(([id, title, low, high]) => <Rating key={id} label={title} value={ratings[id]} onChange={(value) => setRatings((previous) => ({ ...previous, [id]: value }))} low={low} high={high} />)}<button type="button" disabled={!Object.keys(ratings).length} onClick={() => { recordRitual(memberId, "afterIntimacy", { ratings }); setSaved(true); }} className="min-h-12 w-full rounded-full bg-cta-gradient p-3 font-semibold text-white disabled:opacity-50">Save Private Check-In</button></>)}
          {page === "connection" && (!mode ? <><h4 className="text-lg font-semibold">Choose what fits today</h4><p className="text-sm text-atelier-ink3">Both paths are pressure-free. You can stop at any point.</p><button type="button" className={rowClass} onClick={() => setMode("solo")}><strong>Solo</strong><span className="mt-1 block text-xs text-atelier-ink3">Reconnect with breath, sensation, and choice.</span></button><button type="button" className={rowClass} onClick={() => setMode("partner")}><strong>With a Partner</strong><span className="mt-1 block text-xs text-atelier-ink3">Breathe together, communicate, and choose a comfortable pace.</span></button></> : <div className="py-5 text-center"><h4 className="font-serif text-2xl">{prompts[mode][index][0]}</h4><p className="my-4 text-sm leading-relaxed text-atelier-ink3">{prompts[mode][index][1]}</p><p className="text-xs">{index + 1} of 4</p><button type="button" className="mt-5 min-h-12 w-full rounded-full bg-cta-gradient p-3 font-semibold text-white" onClick={() => { if (index === 3) { recordRitual(memberId, mode === "solo" ? "soloConnection" : "partnerConnection"); back(); } else setIndex((value) => value + 1); }}>{index === 3 ? "Finish" : "Next"}</button></div>)}
        </div>}
    </details>
  </section>;
}

function Rating({ label, value, onChange, low, high }) {
  return <div><p className="mb-2 text-sm font-semibold">{label}</p><div className="flex gap-2" role="group" aria-label={label}>{[1, 2, 3, 4, 5].map((number) => <button key={number} type="button" aria-pressed={value === number} aria-label={`${label} ${number} of 5`} onClick={() => onChange(number)} className={`min-h-11 flex-1 rounded-xl ${value === number ? "bg-atelier-rose text-white" : "bg-black/5"}`}>{number}</button>)}</div><div className="mt-2 flex justify-between text-xs text-atelier-ink3"><span>{low}</span><span>{high}</span></div></div>;
}
