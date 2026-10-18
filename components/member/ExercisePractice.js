"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, Pause, Play, RotateCcw } from "lucide-react";
import { practiceSegments } from "@/lib/playbackLedger";
export { practiceSegments } from "@/lib/playbackLedger";

export default function ExercisePractice({ video, prescription, onFinish, onSkip, onClose, onWatch }) {
  const segments = useMemo(() => practiceSegments(prescription), [prescription]);
  const [index, setIndex] = useState(-1);
  const [remaining, setRemaining] = useState(segments[0]?.seconds || 0);
  const [paused, setPaused] = useState(false);
  const elapsed = useRef(0);
  const lastTick = useRef(null);
  const panelRef = useRef(null);
  useEffect(() => { panelRef.current?.querySelector("button")?.focus(); }, []);
  const completed = index >= segments.length;
  const segment = segments[index];
  const active = index >= 0 && !completed;
  useEffect(() => {
    if (!active || paused) return undefined;
    lastTick.current = performance.now();
    const timer = setInterval(() => {
      if (document.hidden) { lastTick.current = performance.now(); return; }
      const now = performance.now();
      const delta = Math.min(1, (now - lastTick.current) / 1000);
      lastTick.current = now;
      elapsed.current += delta;
      setRemaining((value) => Math.max(0, value - delta));
    }, 200);
    return () => clearInterval(timer);
  }, [active, paused, index]);
  useEffect(() => {
    if (!active || remaining > 0) return;
    const next = index + 1;
    setIndex(next);
    setRemaining(segments[next]?.seconds || 0);
  }, [active, remaining, index, segments]);
  const advance = () => { setIndex((i) => i + 1); setRemaining(segments[index + 1]?.seconds || 0); };
  return <div ref={panelRef} onKeyDown={(event) => {
    if (event.key !== "Tab") return;
    const buttons = [...event.currentTarget.querySelectorAll("button:not([disabled])")];
    if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons[buttons.length - 1]?.focus(); }
    else if (!event.shiftKey && document.activeElement === buttons[buttons.length - 1]) { event.preventDefault(); buttons[0]?.focus(); }
  }} role="dialog" aria-modal="true" aria-label={`Guided practice: ${video?.title}`} className="fixed inset-0 z-[70] flex flex-col overflow-y-auto bg-atelier-paper text-atelier-ink">
    <header className="mx-auto flex w-full max-w-xl items-center gap-3 px-5 pt-[max(1rem,env(safe-area-inset-top))]"><button type="button" onClick={onClose} aria-label="Close practice" className="grid h-11 w-11 place-items-center rounded-full border border-atelier-line"><ArrowLeft className="h-5 w-5" /></button><div className="flex-1"><p className="font-mono text-[10px] uppercase tracking-widest text-atelier-ink3">Guided practice</p><p className="mt-1 font-serif text-[23px]">{video?.title}</p></div><p className="text-xs text-atelier-ink2">Round {Math.min(segment?.round || prescription?.rounds || 1, prescription?.rounds || 1)} of {prescription?.rounds || 1}</p></header>
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-6 py-6 text-center"><h1 className="font-serif text-[34px]">{completed ? "Practice complete" : !active ? "Watch once, then practice" : segment.stage === "resting" ? "Rest and breathe" : segment.stage === "sideChange" ? "Change sides" : prescription?.practiceType === "repetitions" ? "Slow and controlled" : "Keep breathing"}</h1><p className="mt-2 text-[15px] text-atelier-ink2">{prescription?.doseLine}</p>
      <div className="relative my-7 grid h-[220px] w-[220px] place-items-center rounded-full border-[10px] border-atelier-rose/[0.18]" style={{ background: `conic-gradient(#E6547329 ${active ? (1 - remaining / segment.seconds) * 360 : completed ? 360 : 0}deg, transparent 0)` }}><div><p className="font-serif text-[66px] leading-none">{completed ? <Check className="h-16 w-16 text-atelier-sage" /> : active ? Math.ceil(remaining) : <Play className="h-14 w-14 text-atelier-rosewood" />}</p>{active && <p className="mt-2 text-xs uppercase tracking-wider text-atelier-ink2">{segment.side} · {prescription?.practiceType === "repetitions" && segment.stage === "working" ? `Rep ${Math.min(prescription.repetitions || 6, Math.floor((segment.seconds - remaining) / Math.max(1, prescription.secondsPerRep || 4)) + 1)} of ${prescription.repetitions || 6}` : "seconds"}</p>}</div></div>
      <p className="max-w-md text-[15px] leading-relaxed text-atelier-ink2">{completed ? "You completed the prescribed work, not just the demonstration." : active && segment.stage === "resting" ? "Let the effort go. Keep breathing before the next round." : prescription?.setup}</p><p className="mt-4 max-w-md text-sm italic text-atelier-rosewood">{prescription?.goalCue}</p>
      <div className="mt-7 flex w-full flex-col gap-3"><button type="button" onClick={() => { if (completed) onFinish(Math.round(elapsed.current)); else if (index < 0) { setIndex(0); setRemaining(segments[0].seconds); } else setPaused((p) => !p); }} className="flex min-h-[54px] items-center justify-center gap-2 rounded-full bg-atelier-rosewood px-5 font-semibold text-white">{completed ? <Check className="h-5 w-5" /> : active && !paused ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}{completed ? "Finish practice" : !active ? "Start practice" : paused ? "Resume practice" : "Pause"}</button>{index < 0 && <button type="button" onClick={onWatch} className="flex min-h-[44px] items-center justify-center gap-2 font-semibold text-atelier-rosewood"><RotateCcw className="h-4 w-4" />Watch demonstration again</button>}{active && segment.stage !== "working" && <button type="button" onClick={advance} className="min-h-[44px] text-sm font-semibold text-atelier-rosewood">Continue when ready</button>}{!completed && <button type="button" onClick={onSkip} className="min-h-[44px] text-sm text-atelier-ink2">Skip practice</button>}</div>
    </main>
  </div>;
}
