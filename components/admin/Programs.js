"use client";

// Programs — edit the app's content like a playlist. Left: the 90-day grid
// for a goal, edited days marked. Right: the day, with reorder, remove, add
// from the library, and a publish bar that shows exactly what changed. The
// approved iPhone app validates and downloads the new version on its own.

import { useEffect, useMemo, useState } from "react";
import { APP_GOAL_IDS, fetchProgramContent, publishProgramContent, validateProgramContent } from "@/lib/adminAppData";
import { FIXTURES_ON } from "@/lib/devFixtures";
import { Button, Card, CardHead, EmptyState, ErrorState, Icons, Input, KpiTile, PageHead, Pill, Select, Skeleton, count } from "./ui";

const TITLES = { pregnancyPrep: "Pregnancy prep", postpartum: "Postpartum recovery", coreStrength: "Core strength", bladderLeaks: "Bladder control", pelvicPain: "Pelvic pain", intimacy: "Intimacy", fitness: "Strength & fitness", stability: "Pelvic stability", diastasisRecti: "Diastasis recti" };

function findDay(programs, goal, dayNumber) {
  const program = programs?.programs?.find((item) => item.goal === goal);
  if (!program) return null;
  for (const week of program.weeks || []) { const day = (week.days || []).find((item) => item.day === dayNumber); if (day) return day; }
  return null;
}
const clone = (v) => JSON.parse(JSON.stringify(v));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export default function Programs() {
  const [state, setState] = useState("loading");
  const [catalog, setCatalog] = useState(null);
  const [programs, setPrograms] = useState(null);
  const [original, setOriginal] = useState(null);
  const [error, setError] = useState("");
  const [goal, setGoal] = useState(APP_GOAL_IDS[0]);
  const [day, setDay] = useState(1);
  const [term, setTerm] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState(null);
  const [drag, setDrag] = useState(null);

  const load = async () => {
    setState("loading"); setError("");
    try { const next = process.env.NODE_ENV !== "production" && FIXTURES_ON ? (await import("@/lib/devFixtureData")).fixtureProgramContent() : await fetchProgramContent(); setCatalog(next.catalog); setPrograms(next.programs); setOriginal(clone(next.programs)); setState("ready"); }
    catch (reason) { setError(reason?.message || "The program library did not load."); setState("error"); }
  };
  useEffect(() => { load(); }, []);

  const currentDay = useMemo(() => findDay(programs, goal, Number(day)), [programs, goal, day]);
  const originalDay = useMemo(() => findDay(original, goal, Number(day)), [original, goal, day]);
  const byId = useMemo(() => new Map((catalog?.videos || []).map((v) => [v.id, v])), [catalog]);
  const matches = useMemo(() => {
    const q = term.trim().toLowerCase(); if (!q) return [];
    const selected = new Set(currentDay?.videoIDs || []);
    return (catalog?.videos || []).filter((v) => !selected.has(v.id) && `${v.title} ${v.coach} ${(v.tags || []).join(" ")}`.toLowerCase().includes(q)).slice(0, 10);
  }, [term, catalog, currentDay]);
  const validation = useMemo(() => (catalog && programs ? validateProgramContent(catalog, programs) : []), [catalog, programs]);
  const editedDays = useMemo(() => {
    const out = new Set();
    const p = programs?.programs?.find((x) => x.goal === goal); const o = original?.programs?.find((x) => x.goal === goal);
    for (const week of p?.weeks || []) for (const d of week.days || []) { const od = o ? findDay(original, goal, d.day) : null; if (!od || !same(od.videoIDs, d.videoIDs)) out.add(d.day); }
    return out;
  }, [programs, original, goal]);
  const totalEdits = useMemo(() => {
    let n = 0;
    for (const p of programs?.programs || []) for (const week of p.weeks || []) for (const d of week.days || []) { const od = findDay(original, p.goal, d.day); if (!od || !same(od.videoIDs, d.videoIDs)) n += 1; }
    return n;
  }, [programs, original]);
  const dirty = totalEdits > 0;

  const changeVideos = (nextIDs) => { const draft = clone(programs); const t = findDay(draft, goal, Number(day)); if (!t) return; t.videoIDs = nextIDs; setPrograms(draft); setMessage(null); };
  const move = (from, to) => { const ids = [...(currentDay?.videoIDs || [])]; if (to < 0 || to >= ids.length) return; const [x] = ids.splice(from, 1); ids.splice(to, 0, x); changeVideos(ids); };
  const publish = async () => {
    if (!dirty || validation.length) return;
    setPublishing(true); setMessage(null);
    try {
      const next = clone(programs);
      next.version = Math.max(Number(programs.version) || 0, Number(catalog.version) || 0) + 1;
      await publishProgramContent(catalog, next);
      setPrograms(next); setOriginal(clone(next));
      setMessage({ tone: "good", text: `Published program version ${next.version}. Phones validate it and pick it up automatically.` });
    } catch (reason) { setMessage({ tone: "crit", text: reason?.message || "The update was not published." }); }
    finally { setPublishing(false); }
  };

  if (state === "loading") return <div style={{ display: "grid", gap: 12 }}><Skeleton style={{ height: 96 }} /><Skeleton style={{ height: 420 }} /></div>;
  if (state === "error") return <Card pad><ErrorState title="The app program library did not load" description={error} onRetry={load} /></Card>;
  if (!catalog || !programs) return <Card pad><EmptyState title="No remote library is published" description="Publish catalog_v1 and programs_v1 in Firebase before editing workouts here." /></Card>;

  const program = programs.programs?.find((x) => x.goal === goal);
  const days = (program?.weeks || []).flatMap((w) => w.days || []);
  const totalDays = (programs.programs || []).reduce((s, p) => s + (p.weeks || []).reduce((c, w) => c + (w.days || []).length, 0), 0);

  return (
    <div className="pv-rise" style={{ display: "grid", gap: 12 }}>
      <PageHead title="Programs" description="Change the videos assigned to any day. The approved iPhone app validates and downloads the new version automatically — no App Review." right={<Pill tone={dirty ? "accent" : "good"} dot>{dirty ? `${totalEdits} day${totalEdits === 1 ? "" : "s"} edited` : `Version ${programs.version} live`}</Pill>} />
      <div className="pv-kpis" style={{ gridTemplateColumns: "repeat(3, minmax(0,1fr))" }}>
        <KpiTile label="Programs" value={count(programs.programs?.length || 0)} sub="personalised goals" />
        <KpiTile label="Program days" value={count(totalDays)} sub="90 per goal" />
        <KpiTile label="Video library" value={count(catalog.videos?.length || 0)} sub={`catalog version ${catalog.version}`} />
      </div>

      <div className="pv-bento">
        <Card className="pv-span-4">
          <CardHead label="Goal" right={<Select value={goal} onChange={(e) => { setGoal(e.target.value); setDay(1); }} style={{ minHeight: 30, width: "auto", padding: "2px 28px 2px 8px" }}>{APP_GOAL_IDS.map((id) => <option key={id} value={id}>{TITLES[id] || id}</option>)}</Select>} />
          <div className="pv-card-pad">
            <div className="pv-label" style={{ marginBottom: 8 }}>90 days · {editedDays.size ? `${editedDays.size} edited` : "no local edits"}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(10, minmax(0,1fr))", gap: 4 }}>
              {days.map((d) => (
                <button key={d.day} type="button" onClick={() => setDay(d.day)} title={`Day ${d.day}: ${d.title}`} aria-pressed={Number(day) === d.day} className="pv-mono" style={{ height: 28, borderRadius: 6, fontSize: 11, border: `1px solid ${Number(day) === d.day ? "var(--pv-accent)" : editedDays.has(d.day) ? "color-mix(in srgb, var(--pv-accent) 50%, transparent)" : "var(--pv-border)"}`, background: Number(day) === d.day ? "var(--pv-accent-soft)" : editedDays.has(d.day) ? "color-mix(in srgb, var(--pv-accent) 10%, transparent)" : "var(--pv-raised)", color: Number(day) === d.day ? "var(--pv-accent)" : "var(--pv-ink-2)" }}>{d.day}</button>
              ))}
            </div>
            <div className="pv-faint" style={{ fontSize: 11.5, marginTop: 10 }}>Rose outline = changed since the live version.</div>
          </div>
        </Card>

        <Card className="pv-span-8">
          <CardHead label={<>Day {day} <span className="pv-ink" style={{ textTransform: "none", letterSpacing: 0, fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600, marginLeft: 6 }}>{currentDay?.title || "Untitled day"}</span></>} right={<span className="pv-faint" style={{ fontSize: 12 }}>{count(currentDay?.videoIDs?.length || 0)} videos{originalDay && !same(originalDay.videoIDs, currentDay?.videoIDs) ? " · edited" : ""}</span>} />
          <div className="pv-card-pad">
            {currentDay?.intention ? <p className="pv-muted" style={{ margin: "0 0 12px", fontSize: 13, maxWidth: "70ch" }}>{currentDay.intention}</p> : null}
            <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6 }}>
              {(currentDay?.videoIDs || []).map((id, index) => {
                const v = byId.get(id);
                const wasHere = originalDay?.videoIDs?.includes(id);
                return (
                  <li key={`${id}-${index}`} draggable onDragStart={() => setDrag(index)} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (drag !== null && drag !== index) move(drag, index); setDrag(null); }} className="pv-inset" style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", opacity: drag === index ? .5 : 1, borderColor: wasHere ? "var(--pv-border)" : "color-mix(in srgb, var(--pv-accent) 50%, transparent)" }}>
                    <span className="pv-faint" style={{ cursor: "grab", display: "inline-flex" }}><Icons.grip style={{ width: 14, height: 14 }} /></span>
                    <span className="pv-mono pv-faint" style={{ width: 18, fontSize: 11 }}>{index + 1}</span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="pv-ink" style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v?.title || id}{!wasHere ? <span className="pv-pill" data-tone="accent" style={{ marginLeft: 8 }}>new</span> : null}</div>
                      <div className="pv-faint" style={{ fontSize: 11.5 }}>{v?.coach || (v?.tags || []).slice(0, 3).join(" · ") || (v ? "" : "Not in catalog")}{v?.durationSeconds ? ` · ${Math.round(v.durationSeconds / 60)} min` : ""}</div>
                    </div>
                    <span style={{ display: "inline-flex", gap: 2 }}>
                      <button type="button" className="pv-icon-btn" aria-label="Move up" onClick={() => move(index, index - 1)} disabled={index === 0}><Icons.up /></button>
                      <button type="button" className="pv-icon-btn" aria-label="Move down" onClick={() => move(index, index + 1)} disabled={index === (currentDay?.videoIDs?.length || 0) - 1}><Icons.down /></button>
                      <button type="button" className="pv-icon-btn" aria-label="Remove" onClick={() => changeVideos(currentDay.videoIDs.filter((_, p) => p !== index))}><Icons.close /></button>
                    </span>
                  </li>
                );
              })}
            </ol>
            {originalDay && currentDay && originalDay.videoIDs.some((id) => !currentDay.videoIDs.includes(id)) ? (
              <div className="pv-faint" style={{ fontSize: 12, marginTop: 10 }}>Removed: {originalDay.videoIDs.filter((id) => !currentDay.videoIDs.includes(id)).map((id) => byId.get(id)?.title || id).join(", ")}</div>
            ) : null}
            <div style={{ marginTop: 16, borderTop: "1px solid var(--pv-border)", paddingTop: 14 }}>
              <div className="pv-label" style={{ marginBottom: 8 }}>Add from the library</div>
              <Input type="search" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search exercise, coach, or body area" />
              {matches.length ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 6, marginTop: 8 }}>
                  {matches.map((v) => (
                    <button type="button" key={v.id} className="pv-inset" style={{ textAlign: "left", padding: "8px 10px" }} onClick={() => { changeVideos([...(currentDay.videoIDs || []), v.id]); setTerm(""); }}>
                      <div className="pv-ink" style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.title}</div>
                      <div className="pv-faint" style={{ fontSize: 11.5 }}>{v.coach || (v.tags || []).slice(0, 3).join(" · ")}{v.durationSeconds ? ` · ${Math.round(v.durationSeconds / 60)} min` : ""}</div>
                    </button>
                  ))}
                </div>
              ) : term ? <div className="pv-faint" style={{ fontSize: 12.5, marginTop: 8 }}>No library video matches “{term}”.</div> : null}
            </div>
          </div>
        </Card>

        <Card className="pv-span-12" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "12px 16px", flexWrap: "wrap" }}>
          <div style={{ minWidth: 0 }}>
            <div className="pv-title" style={{ color: validation.length ? "var(--pv-bad)" : "var(--pv-ink)" }}>{validation.length ? `${validation.length} validation issue${validation.length === 1 ? "" : "s"}` : dirty ? `${totalEdits} change${totalEdits === 1 ? "" : "s"} ready to publish` : "Live program is valid"}</div>
            <div className="pv-faint" style={{ fontSize: 12.5, marginTop: 2 }}>{validation[0] || message?.text || (dirty ? "Publishing creates a new program version. Phones keep the current known-good version if validation ever fails." : `Program version ${programs.version} is live.`)}</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {dirty ? <Button variant="ghost" onClick={() => { setPrograms(clone(original)); setMessage(null); }}>Discard edits</Button> : null}
            <Button variant="primary" onClick={publish} disabled={!dirty || Boolean(validation.length) || publishing}>{publishing ? "Publishing…" : "Publish to the app"}</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
