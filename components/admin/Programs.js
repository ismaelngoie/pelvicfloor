"use client";

import { useEffect, useMemo, useState } from "react";
import { APP_GOAL_IDS, fetchProgramContent, publishProgramContent, validateProgramContent } from "@/lib/adminAppData";
import { Button, Card, EmptyState, ErrorState, Input, SectionHeader, Select } from "./ui";
import { formatCount } from "@/lib/adminMetrics";

const TITLES = {
  pregnancyPrep: "Pregnancy prep",
  postpartum: "Postpartum recovery",
  coreStrength: "Core strength",
  bladderLeaks: "Bladder control",
  pelvicPain: "Pelvic pain",
  intimacy: "Intimacy",
  fitness: "Strength and fitness",
  stability: "Pelvic stability",
  diastasisRecti: "Diastasis recti",
};

function findDay(programs, goal, dayNumber) {
  const program = programs?.programs?.find((item) => item.goal === goal);
  if (!program) return null;
  for (const week of program.weeks || []) {
    const day = (week.days || []).find((item) => item.day === dayNumber);
    if (day) return day;
  }
  return null;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export default function Programs() {
  const [state, setState] = useState("loading");
  const [catalog, setCatalog] = useState(null);
  const [programs, setPrograms] = useState(null);
  const [error, setError] = useState("");
  const [goal, setGoal] = useState(APP_GOAL_IDS[0]);
  const [day, setDay] = useState(1);
  const [term, setTerm] = useState("");
  const [dirty, setDirty] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState(null);

  const load = async () => {
    setState("loading");
    setError("");
    try {
      const next = await fetchProgramContent();
      setCatalog(next.catalog);
      setPrograms(next.programs);
      setDirty(false);
      setState("ready");
    } catch (reason) {
      setError(reason?.message || "The program library did not load.");
      setState("error");
    }
  };

  useEffect(() => { load(); }, []);

  const currentDay = useMemo(() => findDay(programs, goal, Number(day)), [programs, goal, day]);
  const byId = useMemo(() => new Map((catalog?.videos || []).map((video) => [video.id, video])), [catalog]);
  const matches = useMemo(() => {
    const query = term.trim().toLowerCase();
    if (!query) return [];
    const selected = new Set(currentDay?.videoIDs || []);
    return (catalog?.videos || []).filter((video) => !selected.has(video.id) && `${video.title} ${video.coach} ${(video.tags || []).join(" ")}`.toLowerCase().includes(query)).slice(0, 12);
  }, [term, catalog, currentDay]);
  const validation = useMemo(() => catalog && programs ? validateProgramContent(catalog, programs) : [], [catalog, programs]);

  const changeVideos = (nextIDs) => {
    const draft = clone(programs);
    const target = findDay(draft, goal, Number(day));
    if (!target) return;
    target.videoIDs = nextIDs;
    setPrograms(draft);
    setDirty(true);
    setMessage(null);
  };

  const publish = async () => {
    if (!dirty || validation.length) return;
    setPublishing(true);
    setMessage(null);
    try {
      const nextPrograms = clone(programs);
      nextPrograms.version = Math.max(Number(programs.version) || 0, Number(catalog.version) || 0) + 1;
      await publishProgramContent(catalog, nextPrograms);
      setPrograms(nextPrograms);
      setDirty(false);
      setMessage({ tone: "good", text: `Published program version ${nextPrograms.version}. Phones validate it and pick it up automatically.` });
    } catch (reason) {
      setMessage({ tone: "crit", text: reason?.message || "The update was not published." });
    } finally {
      setPublishing(false);
    }
  };

  if (state === "loading") return <div className="space-y-4"><div className="pv-skeleton h-36 w-full" /><div className="pv-skeleton h-96 w-full" /></div>;
  if (state === "error") return <Card className="p-4"><ErrorState title="The app program library did not load" description={error} onRetry={load} /></Card>;
  if (!catalog || !programs) return <Card className="p-5"><EmptyState title="No remote library is published" description="Publish catalog_v1 and programs_v1 in Firebase before editing workouts here." /></Card>;

  return (
    <div className="space-y-10">
      <section>
        <SectionHeader eyebrow="Remote app content" title="Programs and workouts" description="Change the videos assigned to any day. The approved iPhone app validates and downloads the new version automatically, so these edits do not need App Review." />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Summary label="Clinical programs" value={programs.programs?.length || 0} note="Nine personalized goals" />
          <Summary label="Program days" value={(programs.programs || []).reduce((sum, program) => sum + (program.weeks || []).reduce((count, week) => count + (week.days || []).length, 0), 0)} note="90 days per goal" />
          <Summary label="Video library" value={catalog.videos?.length || 0} note={`Catalog version ${catalog.version}`} />
        </div>
      </section>

      <Card className="p-5 sm:p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_180px]">
          <label className="space-y-2"><span className="text-[12px] font-semibold" style={{ color: "var(--pv-ink-2)" }}>Program</span><Select value={goal} onChange={(event) => setGoal(event.target.value)}>{APP_GOAL_IDS.map((id) => <option value={id} key={id}>{TITLES[id] || id}</option>)}</Select></label>
          <label className="space-y-2"><span className="text-[12px] font-semibold" style={{ color: "var(--pv-ink-2)" }}>Day</span><Input type="number" min="1" max="90" value={day} onChange={(event) => setDay(Math.max(1, Math.min(90, Number(event.target.value) || 1)))} /></label>
        </div>

        <div className="mt-7 flex flex-wrap items-start justify-between gap-4 border-t pt-6" style={{ borderColor: "var(--pv-border)" }}>
          <div><p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--pv-ink-3)" }}>Day {day}</p><h3 className="mt-1 text-[20px] font-semibold" style={{ color: "var(--pv-ink)" }}>{currentDay?.title || "Untitled day"}</h3><p className="mt-2 max-w-2xl text-[13px] leading-relaxed" style={{ color: "var(--pv-ink-2)" }}>{currentDay?.intention || ""}</p></div>
          <span className="rounded-full px-3 py-1.5 text-[12px] font-semibold" style={{ background: "var(--pv-surface-2)", color: "var(--pv-ink-2)" }}>{formatCount(currentDay?.videoIDs?.length || 0)} videos</span>
        </div>

        <div className="mt-6 space-y-2">
          {(currentDay?.videoIDs || []).map((id, index) => {
            const video = byId.get(id);
            return <div key={`${id}-${index}`} className="flex items-center gap-3 rounded-xl p-3" style={{ background: "var(--pv-surface-2)" }}>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold" style={{ background: "var(--pv-surface)", color: "var(--pv-ink-2)" }}>{index + 1}</span>
              <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-semibold" style={{ color: "var(--pv-ink)" }}>{video?.title || id}</p><p className="truncate text-[11px]" style={{ color: "var(--pv-ink-3)" }}>{video?.coach || (video?.tags || []).slice(0, 3).join(" · ")}</p></div>
              <button type="button" onClick={() => changeVideos(currentDay.videoIDs.filter((_, position) => position !== index))} className="min-h-[40px] rounded-full px-3 text-[12px] font-semibold" style={{ border: "1px solid var(--pv-border)", color: "var(--pv-ink-2)" }}>Remove</button>
            </div>;
          })}
        </div>

        <div className="mt-7 border-t pt-6" style={{ borderColor: "var(--pv-border)" }}>
          <p className="text-[13px] font-semibold" style={{ color: "var(--pv-ink)" }}>Add a video from the clinical library</p>
          <Input className="mt-3" type="search" value={term} onChange={(event) => setTerm(event.target.value)} placeholder="Search by exercise, coach, or body area" />
          {matches.length ? <div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-2">{matches.map((video) => <button type="button" key={video.id} onClick={() => { changeVideos([...(currentDay.videoIDs || []), video.id]); setTerm(""); }} className="rounded-xl p-3 text-left" style={{ background: "var(--pv-surface-2)", border: "1px solid var(--pv-border)" }}><p className="text-[13px] font-semibold" style={{ color: "var(--pv-ink)" }}>{video.title}</p><p className="mt-1 text-[11px]" style={{ color: "var(--pv-ink-3)" }}>{video.coach || (video.tags || []).slice(0, 4).join(" · ")}</p></button>)}</div> : null}
        </div>
      </Card>

      <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[14px] font-semibold" style={{ color: validation.length ? "var(--pv-crit)" : "var(--pv-ink)" }}>{validation.length ? `${validation.length} validation issue${validation.length === 1 ? "" : "s"}` : dirty ? "Changes are ready to publish" : "Live program is valid"}</p>
          <p className="mt-1 max-w-3xl text-[12px] leading-relaxed" style={{ color: "var(--pv-ink-3)" }}>{validation[0] || message?.text || (dirty ? "Publishing creates a new program version. The app keeps the current known-good version if validation ever fails." : `Program version ${programs.version} is live.`)}</p>
        </div>
        <Button onClick={publish} disabled={!dirty || Boolean(validation.length) || publishing}>{publishing ? "Publishing" : "Publish to the app"}</Button>
      </Card>
    </div>
  );
}

function Summary({ label, value, note }) {
  return <Card className="p-5"><p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--pv-ink-3)" }}>{label}</p><p className="pv-figure mt-2 text-[34px] font-semibold" style={{ color: "var(--pv-ink)" }}>{formatCount(value)}</p><p className="mt-1 text-[12px]" style={{ color: "var(--pv-ink-2)" }}>{note}</p></Card>;
}
