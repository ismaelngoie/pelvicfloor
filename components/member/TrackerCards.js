"use client";

// The four tracker cards under the progress graph on the phone's Today tab,
// ported from Core/Cycle/CycleContext.swift (CycleContextQuickCard),
// Core/Cycle/WomensHealthTracking.swift (MenopauseQuickCard),
// Core/Tracking/MensPelvicHealth.swift (MensPelvicHealthQuickCard),
// Core/Tracking/Water.swift (WaterDashboardQuickCard) and
// Core/CSection/CSectionEducationView.swift (CSectionEducationQuickCard).
//
// Everything a member logs here is written to `member.trackers` on her member
// document, so it follows her account and not the browser.

import { useCallback, useMemo, useState } from "react";
import { ArrowRight, Droplet, Flame, Play, Sparkles, CheckCircle2 } from "lucide-react";
import { Sheet } from "./ui";
import { Chevron, Eyebrow, RoseAction, Serif } from "./atelierUI";

const DAY_MS = 24 * 60 * 60 * 1000;

export function dayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseKey(key) {
  const [y, m, d] = String(key).split("-").map(Number);
  return new Date(y, m - 1, d);
}

function daysBetween(a, b) {
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}

/** One writer for every tracker, so a card can never clobber another's data. */
function useTrackerWriter(member, patchMember) {
  const trackers = member?.trackers || {};
  const write = useCallback(
    async (key, value) => {
      await patchMember({ trackers: { ...(member?.trackers || {}), [key]: value } });
    },
    [member?.trackers, patchMember]
  );
  return [trackers, write];
}

/** The tinted card shell the trackers share: a wash over #FFFCF8, white hairline, soft shadow. */
function TintCard({ children, wash, shadow, className = "" }) {
  return (
    <section
      className={`mt-5 overflow-hidden rounded-[22px] border border-white/50 bg-atelier-card p-4 ${className}`}
      style={{ backgroundImage: wash, boxShadow: `0 6px 14px ${shadow}` }}
    >
      {children}
    </section>
  );
}

function Choice({ options, value, onChange, label }) {
  return (
    <div role="radiogroup" aria-label={label} className="mt-2 grid grid-cols-3 gap-2">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={value === o}
          onClick={() => onChange(o)}
          className={`min-h-[44px] rounded-[14px] border px-2 text-[13.5px] font-semibold ${
            value === o ? "border-atelier-rose bg-atelier-rose/[0.12] text-atelier-rosewood" : "border-atelier-line bg-white text-atelier-ink"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

// --- Cycle -----------------------------------------------------------------

function cycleSummary(periods) {
  const starts = (periods || [])
    .map((p) => p.start)
    .filter(Boolean)
    .map(parseKey)
    .sort((a, b) => a - b);
  if (!starts.length) return null;
  const gaps = [];
  for (let i = 1; i < starts.length; i += 1) {
    const g = daysBetween(starts[i - 1], starts[i]);
    if (g >= 18 && g <= 45) gaps.push(g);
  }
  const length = gaps.length ? Math.round(gaps.slice(-4).reduce((s, g) => s + g, 0) / Math.min(4, gaps.length)) : 28;
  const last = starts[starts.length - 1];
  const today = parseKey(dayKey());
  const cycleDay = daysBetween(last, today) + 1;
  const current = (periods || []).find((p) => p.start === dayKey(last));
  const periodActive = Boolean(current && !current.end && cycleDay <= 10);
  const daysUntil = length - (cycleDay - 1);
  return { length, cycleDay, periodActive, periodDays: periodActive ? cycleDay : 0, daysUntil, lastStart: last };
}

function CycleDial({ cycleDay, cycleLength, periodActive, size = 56 }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const frac = Math.min(1, Math.max(0, (cycleDay - 1) / Math.max(1, cycleLength)));
  return (
    <span className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 h-full w-full">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(58,47,68,0.12)" strokeWidth="6" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={periodActive ? "#C43E63" : "#3A2F44"} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - frac)} transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="font-serif text-[19px] leading-none text-atelier-ink">{cycleDay > 0 ? cycleDay : <Droplet className="h-4 w-4 text-atelier-plum/60" />}</span>
    </span>
  );
}

export function CycleQuickCard({ member, patchMember }) {
  const [trackers, write] = useTrackerWriter(member, patchMember);
  const womens = trackers.womens || {};
  const periods = womens.periods || [];
  const summary = useMemo(() => cycleSummary(periods), [periods]);
  const [open, setOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);

  const soon = summary && !summary.periodActive && summary.daysUntil >= 0 && summary.daysUntil <= 3;
  const accent = summary?.periodActive || soon ? "rosewood" : "plum";
  const wash = summary?.periodActive
    ? "linear-gradient(135deg, rgba(230,84,115,0.16), rgba(196,62,99,0.06))"
    : soon
      ? "linear-gradient(135deg, rgba(196,62,99,0.14), rgba(230,84,115,0.06))"
      : "linear-gradient(135deg, rgba(58,47,68,0.12), rgba(196,62,99,0.045))";

  const status = !summary
    ? "Log your period once and your cycle wheel starts predicting."
    : summary.periodActive
      ? `Period · day ${summary.periodDays}. Gentle sessions are fine, listen to your body.`
      : summary.daysUntil < 0
        ? `Cycle day ${summary.cycleDay}. Your period is ${-summary.daysUntil} ${-summary.daysUntil === 1 ? "day" : "days"} past the estimate.`
        : summary.daysUntil === 0
          ? `Cycle day ${summary.cycleDay}. Your period is due today.`
          : `Cycle day ${summary.cycleDay}. Next period in about ${summary.daysUntil} ${summary.daysUntil === 1 ? "day" : "days"}.`;

  const logPeriod = useCallback(async () => {
    const today = dayKey();
    let next;
    if (summary?.periodActive) {
      next = periods.map((p) => (p.start === dayKey(summary.lastStart) ? { ...p, end: today } : p));
    } else {
      next = [...periods.filter((p) => p.start !== today), { start: today, end: null }];
    }
    await write("womens", { ...womens, mode: "cycle", periods: next.slice(-24) });
    setLogOpen(false);
  }, [summary, periods, womens, write]);

  return (
    <TintCard wash={wash} shadow={accent === "plum" ? "rgba(58,47,68,0.10)" : "rgba(196,62,99,0.10)"}>
      <button type="button" onClick={() => setOpen(true)} className="flex w-full items-center gap-3 text-left" aria-label={`Your cycle. ${status}`}>
        <CycleDial cycleDay={summary?.cycleDay || 0} cycleLength={summary?.length || 28} periodActive={Boolean(summary?.periodActive)} />
        <span className="min-w-0 flex-1">
          <span className="block text-[17px] font-bold leading-tight text-atelier-ink">Your cycle</span>
          <span className="mt-0.5 block text-[12.5px] leading-snug text-atelier-ink2">{status}</span>
        </span>
        <Chevron />
      </button>
      <RoseAction tone={accent} className="mt-3.5" onClick={() => setLogOpen(true)}>
        <Droplet className="h-4 w-4 fill-current" aria-hidden="true" />
        {summary?.periodActive ? "Mark period ended" : "Log period"}
      </RoseAction>

      <Sheet open={logOpen} onClose={() => setLogOpen(false)} title={summary?.periodActive ? "Mark period ended" : "Log period"} labelledBy="cycle-log">
        <div className="pb-6">
          <p className="text-[15px] leading-relaxed text-atelier-ink2">
            {summary?.periodActive
              ? "Today becomes the last day of this period. Your cycle wheel keeps counting from the start date."
              : "Today becomes day 1 of a new cycle. The wheel estimates your next period from the last few cycles you logged."}
          </p>
          <RoseAction tone={accent} className="mt-5" onClick={logPeriod}>{summary?.periodActive ? "Ended today" : "Started today"}</RoseAction>
          <button type="button" onClick={() => setOpen(true)} className="mt-3 min-h-[44px] w-full text-[13.5px] font-semibold text-atelier-ink2">
            Change tracking
          </button>
        </div>
      </Sheet>

      <Sheet open={open} onClose={() => setOpen(false)} title="Your cycle" labelledBy="cycle-sheet">
        <div className="pb-6">
          <div className="flex items-center gap-4 rounded-[22px] border border-atelier-line bg-atelier-card p-4">
            <CycleDial cycleDay={summary?.cycleDay || 0} cycleLength={summary?.length || 28} periodActive={Boolean(summary?.periodActive)} size={84} />
            <div className="min-w-0">
              <Eyebrow>CYCLE LENGTH</Eyebrow>
              <Serif size={24}>{summary ? `${summary.length} days` : "Not yet known"}</Serif>
              <p className="mt-1 text-[12.5px] text-atelier-ink2">{status}</p>
            </div>
          </div>
          <h3 className="mt-6 font-serif text-[20px] text-atelier-ink">Period history</h3>
          {periods.length === 0 ? (
            <p className="mt-2 text-[14px] text-atelier-ink2">Nothing logged yet.</p>
          ) : (
            <ul className="mt-2 divide-y divide-atelier-line rounded-[16px] border border-atelier-line bg-atelier-card">
              {[...periods].reverse().map((p) => (
                <li key={p.start} className="flex items-center justify-between px-4 py-3 text-[14px]">
                  <span className="text-atelier-ink">{parseKey(p.start).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                  <span className="text-atelier-ink2">{p.end ? `to ${parseKey(p.end).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : "ongoing"}</span>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => write("womens", { ...womens, mode: "menopause" })}
            className="mt-6 min-h-[44px] w-full text-[13.5px] font-semibold text-atelier-ink2"
          >
            Track menopause instead
          </button>
        </div>
      </Sheet>
    </TintCard>
  );
}

// --- Menopause ---------------------------------------------------------------

const MENO_FIELDS = [
  ["hotFlashes", "Hot flashes", ["None", "Some", "Many"]],
  ["sleep", "Sleep", ["Poor", "Okay", "Good"]],
  ["mood", "Mood", ["Low", "Okay", "Good"]],
  ["dryness", "Dryness", ["None", "Some", "A lot"]],
];

function Bloom({ size = 58, filled }) {
  return (
    <span className="grid shrink-0 place-items-center rounded-full" style={{ width: size, height: size, background: filled ? "rgba(196,62,99,0.16)" : "rgba(58,47,68,0.08)" }} aria-hidden="true">
      <Sparkles className={`h-6 w-6 ${filled ? "text-atelier-rosewood" : "text-atelier-plum"}`} />
    </span>
  );
}

export function MenopauseQuickCard({ member, patchMember }) {
  const [trackers, write] = useTrackerWriter(member, patchMember);
  const womens = trackers.womens || {};
  const days = womens.menopause || {};
  const today = days[dayKey()] || null;
  const [open, setOpen] = useState(false);
  const [checkIn, setCheckIn] = useState(false);
  const [draft, setDraft] = useState(() => today || {});

  const status = today
    ? `Logged today · sleep ${today.sleep || "–"}, hot flashes ${(today.hotFlashes || "–").toLowerCase()}`
    : "No check-in yet today. Thirty seconds keeps your pattern honest.";

  const save = useCallback(async () => {
    const next = { ...days, [dayKey()]: { ...draft, at: new Date().toISOString() } };
    const keys = Object.keys(next).sort().slice(-120);
    const trimmed = Object.fromEntries(keys.map((k) => [k, next[k]]));
    await write("womens", { ...womens, mode: "menopause", menopause: trimmed });
    setCheckIn(false);
  }, [days, draft, womens, write]);

  const history = Object.keys(days).sort().reverse().slice(0, 14);

  return (
    <TintCard wash="linear-gradient(135deg, rgba(196,62,99,0.11), rgba(58,47,68,0.055))" shadow="rgba(196,62,99,0.10)">
      <button type="button" onClick={() => setOpen(true)} className="flex w-full items-center gap-3 text-left" aria-label={`Menopause tracker. ${status}`}>
        <Bloom filled={Boolean(today)} />
        <span className="min-w-0 flex-1">
          <span className="block text-[17px] font-bold leading-tight text-atelier-ink">Menopause</span>
          <span className="mt-0.5 block text-[12.5px] leading-snug text-atelier-ink2">{status}</span>
        </span>
        <Chevron />
      </button>
      <RoseAction tone="rosewood" className="mt-3.5" onClick={() => { setDraft(today || {}); setCheckIn(true); }}>
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        {today ? "Update today's check-in" : "Log today's symptoms"}
      </RoseAction>

      <Sheet open={checkIn} onClose={() => setCheckIn(false)} title="Today's symptoms" labelledBy="meno-checkin">
        <div className="pb-6">
          {MENO_FIELDS.map(([key, label, options]) => (
            <div key={key} className="mt-4 first:mt-0">
              <p className="text-[14.5px] font-semibold text-atelier-ink">{label}</p>
              <Choice label={label} options={options} value={draft[key]} onChange={(v) => setDraft((d) => ({ ...d, [key]: v }))} />
            </div>
          ))}
          <RoseAction tone="rosewood" className="mt-6" onClick={save}>Save</RoseAction>
        </div>
      </Sheet>

      <Sheet open={open} onClose={() => setOpen(false)} title="Menopause" labelledBy="meno-sheet">
        <div className="pb-6">
          <p className="text-[15px] leading-relaxed text-atelier-ink2">Your last two weeks, newest first. Patterns matter more than any single day.</p>
          {history.length === 0 ? (
            <p className="mt-3 text-[14px] text-atelier-ink2">No check-ins yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-atelier-line rounded-[16px] border border-atelier-line bg-atelier-card">
              {history.map((k) => (
                <li key={k} className="px-4 py-3 text-[13.5px]">
                  <span className="font-semibold text-atelier-ink">{parseKey(k).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
                  <span className="mt-0.5 block text-atelier-ink2">
                    {MENO_FIELDS.map(([key, label]) => `${label} ${days[k][key] || "–"}`).join(" · ")}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <button type="button" onClick={() => write("womens", { ...womens, mode: "cycle" })} className="mt-6 min-h-[44px] w-full text-[13.5px] font-semibold text-atelier-ink2">
            Track my cycle instead
          </button>
        </div>
      </Sheet>
    </TintCard>
  );
}

/** The phone shows one women's card, chosen by her tracking preference. */
export function WomensQuickCard({ member, patchMember }) {
  const mode = member?.trackers?.womens?.mode || ((member?.age || 0) >= 50 ? "menopause" : "cycle");
  return mode === "menopause"
    ? <MenopauseQuickCard member={member} patchMember={patchMember} />
    : <CycleQuickCard member={member} patchMember={patchMember} />;
}

// --- Men's pelvic health -------------------------------------------------------

const MENS_FIELDS = {
  bladderLeaks: [["leaks", "Leaks or drips", ["None", "A few", "Several"]], ["control", "Urge control", ["Hard", "Sometimes", "In control"]], ["confidence", "Confidence", ["Low", "Growing", "Strong"]]],
  prostateRecovery: [["leaks", "Leaks or drips", ["None", "A few", "Several"]], ["control", "Bladder control", ["Low", "Mixed", "In control"]], ["confidence", "Recovery confidence", ["Low", "Growing", "Strong"]]],
  intimacy: [["tension", "Pelvic tension", ["High", "Some", "Relaxed"]], ["support", "Erection support", ["Low", "Mixed", "Strong"]], ["control", "Lasting control", ["Low", "Mixed", "In control"]]],
  bowelControl: [["urges", "Sudden urges", ["Several", "A few", "None"]], ["control", "Control", ["Low", "Mixed", "In control"]], ["confidence", "Confidence away from home", ["Low", "Growing", "Strong"]]],
  default: [["comfort", "Comfort", ["Uncomfortable", "Okay", "Comfortable"]], ["control", "Control", ["Low", "Building", "Steady"]], ["confidence", "Confidence", ["Low", "Growing", "Strong"]]],
};

export function MensQuickCard({ goalId, member, patchMember }) {
  const [trackers, write] = useTrackerWriter(member, patchMember);
  const mens = trackers.mens || {};
  const days = mens.days || {};
  const today = days[dayKey()] || null;
  const fields = MENS_FIELDS[goalId] || MENS_FIELDS.default;
  const [open, setOpen] = useState(false);
  const [checkIn, setCheckIn] = useState(false);
  const [draft, setDraft] = useState(() => today || {});
  const status = today
    ? `Logged today · ${fields.map(([k, l]) => `${l.toLowerCase()} ${today[k] || "–"}`).slice(0, 2).join(", ")}`
    : "Private, only for you. Thirty seconds a day shows the trend.";

  const save = useCallback(async () => {
    const next = { ...days, [dayKey()]: { ...draft, at: new Date().toISOString() } };
    const keys = Object.keys(next).sort().slice(-120);
    await write("mens", { ...mens, days: Object.fromEntries(keys.map((k) => [k, next[k]])) });
    setCheckIn(false);
  }, [days, draft, mens, write]);

  const history = Object.keys(days).sort().reverse().slice(0, 14);

  return (
    <TintCard wash="linear-gradient(135deg, rgba(58,47,68,0.10), rgba(111,143,122,0.08))" shadow="rgba(58,47,68,0.10)">
      <button type="button" onClick={() => setOpen(true)} className="flex w-full items-center gap-3 text-left" aria-label={`Men's pelvic health tracker. ${status}`}>
        <span className="grid h-[58px] w-[58px] shrink-0 place-items-center rounded-full bg-atelier-plum/[0.12]" aria-hidden="true">
          <CheckCircle2 className={`h-6 w-6 ${today ? "text-atelier-sage" : "text-atelier-plum"}`} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[17px] font-bold leading-tight text-atelier-ink">Men&apos;s Pelvic Health</span>
          <span className="mt-0.5 block text-[12.5px] leading-snug text-atelier-ink2">{status}</span>
        </span>
        <Chevron />
      </button>
      <RoseAction tone="plum" className="mt-3.5" onClick={() => { setDraft(today || {}); setCheckIn(true); }}>
        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        {today ? "Update today's check-in" : "Log today's progress"}
      </RoseAction>
      <Sheet open={checkIn} onClose={() => setCheckIn(false)} title="Today's check-in" labelledBy="mens-checkin">
        <div className="pb-6">
          {fields.map(([key, label, options]) => (
            <div key={key} className="mt-4 first:mt-0">
              <p className="text-[14.5px] font-semibold text-atelier-ink">{label}</p>
              <Choice label={label} options={options} value={draft[key]} onChange={(v) => setDraft((d) => ({ ...d, [key]: v }))} />
            </div>
          ))}
          <RoseAction tone="plum" className="mt-6" onClick={save}>Save</RoseAction>
        </div>
      </Sheet>
      <Sheet open={open} onClose={() => setOpen(false)} title="Men's Pelvic Health" labelledBy="mens-sheet">
        <div className="pb-6">
          {history.length === 0 ? (
            <p className="text-[14px] text-atelier-ink2">No check-ins yet.</p>
          ) : (
            <ul className="divide-y divide-atelier-line rounded-[16px] border border-atelier-line bg-atelier-card">
              {history.map((k) => (
                <li key={k} className="px-4 py-3 text-[13.5px]">
                  <span className="font-semibold text-atelier-ink">{parseKey(k).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
                  <span className="mt-0.5 block text-atelier-ink2">{fields.map(([key, label]) => `${label} ${days[k][key] || "–"}`).join(" · ")}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Sheet>
    </TintCard>
  );
}

// --- Water ---------------------------------------------------------------------

const WATER_PRESETS = [120, 240, 350, 475, 600];
const DEFAULT_GOAL_ML = 2000;

function liter(ml) {
  return `${(ml / 1000).toFixed(ml % 1000 === 0 ? 0 : 1)} L`;
}

function waterStreak(days, goalML) {
  let streak = 0;
  const cursor = new Date();
  for (let i = 0; i < 365; i += 1) {
    const key = dayKey(cursor);
    const ml = days[key] || 0;
    if (ml >= goalML) streak += 1;
    else if (i > 0 || ml === 0) { if (i === 0) { cursor.setDate(cursor.getDate() - 1); continue; } break; }
    else break;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function WaterQuickCard({ member, patchMember }) {
  const [trackers, write] = useTrackerWriter(member, patchMember);
  const water = trackers.water || {};
  const goalML = water.goalML || DEFAULT_GOAL_ML;
  const days = water.days || {};
  const todayML = days[dayKey()] || 0;
  const fill = Math.min(1, todayML / goalML);
  const streak = useMemo(() => waterStreak(days, goalML), [days, goalML]);
  const [open, setOpen] = useState(false);

  const status = todayML >= goalML
    ? "Goal reached. Your bladder likes steady, not sudden."
    : todayML === 0
      ? "Sip steadily through the day. Big gulps wake the bladder up."
      : `${liter(goalML - todayML)} to go. Steady sips, not big gulps.`;

  const log = useCallback(async (ml) => {
    const next = { ...days, [dayKey()]: Math.max(0, todayML + ml) };
    const keys = Object.keys(next).sort().slice(-120);
    await write("water", { goalML, days: Object.fromEntries(keys.map((k) => [k, next[k]])) });
  }, [days, todayML, goalML, write]);

  const bottle = (
    <span className="relative block h-[58px] w-[42px] shrink-0 overflow-hidden rounded-[14px] bg-atelier-card/80 ring-1 ring-atelier-line" aria-hidden="true">
      <span className="absolute inset-x-0 bottom-0 transition-[height] duration-700" style={{ height: `${Math.max(6, fill * 100)}%`, background: "linear-gradient(180deg, rgba(111,143,122,0.85), rgba(58,47,68,0.85))" }} />
    </span>
  );

  return (
    <TintCard wash="linear-gradient(135deg, rgba(58,47,68,0.13), rgba(111,143,122,0.08) 60%, #FFFCF8)" shadow="rgba(58,47,68,0.11)">
      <button type="button" onClick={() => setOpen(true)} className="flex w-full items-center gap-4 text-left" aria-label={`Track water. ${status} ${liter(todayML)} of ${liter(goalML)} today`}>
        {bottle}
        <span className="min-w-0 flex-1">
          <span className="block text-[17px] font-bold leading-tight text-atelier-ink">Track water</span>
          <span className="mt-0.5 block text-[12.5px] leading-snug text-atelier-ink2">{status}</span>
          <span className="mt-1 flex items-center gap-1.5 font-mono text-[10px] text-atelier-plum">
            {liter(todayML)} of {liter(goalML)}
            {streak > 0 && (<><span>·</span><Flame className="h-3 w-3" aria-hidden="true" />{streak} day streak</>)}
          </span>
        </span>
        <Chevron />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Water" labelledBy="water-sheet">
        <div className="pb-6">
          <div className="flex items-center gap-4 rounded-[22px] border border-atelier-line bg-atelier-card p-4">
            {bottle}
            <div>
              <Eyebrow>TODAY</Eyebrow>
              <Serif size={26}>{liter(todayML)} <span className="text-atelier-ink2">of {liter(goalML)}</span></Serif>
              <p className="mt-1 text-[12.5px] text-atelier-ink2">{status}</p>
            </div>
          </div>
          <p className="mt-5 text-[14.5px] font-semibold text-atelier-ink">Log a drink</p>
          <div className="mt-2 grid grid-cols-5 gap-2">
            {WATER_PRESETS.map((ml) => (
              <button key={ml} type="button" onClick={() => log(ml)} className="min-h-[48px] rounded-[14px] border border-atelier-line bg-white text-[13px] font-semibold text-atelier-ink">
                {ml} ml
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between text-[13px] text-atelier-ink2">
            <button type="button" onClick={() => log(-240)} className="min-h-[44px] font-semibold text-atelier-ink2" disabled={todayML === 0}>Undo a glass</button>
            <span>Goal {liter(goalML)}</span>
          </div>
          <div className="mt-2 flex gap-2">
            {[1500, 2000, 2500, 3000].map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => write("water", { goalML: g, days })}
                className={`min-h-[40px] flex-1 rounded-full border text-[12.5px] font-semibold ${g === goalML ? "border-atelier-plum bg-atelier-plum text-white" : "border-atelier-line bg-white text-atelier-ink2"}`}
              >
                {liter(g)}
              </button>
            ))}
          </div>
        </div>
      </Sheet>
    </TintCard>
  );
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
