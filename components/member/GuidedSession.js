"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { KEGEL_SETS, PHASE_SCALE, URGE_MODES, durationLabel, isEffortPhase } from "./sessionScripts";
import { usePrefersReducedMotion } from "./VideoPlayer";
import { useSessionEngine } from "./audioEngine";
import { audioPreference, setAudioPreference } from "@/lib/audioJourney";
import { flushUrgeOutcomes, pendingUrgeOutcomes, queueUrgeOutcome } from "@/lib/urgeOutcomeQueue";
import { writeQueuedUrgeOutcome } from "@/lib/urgeOutcomeSync";

export function useAudioDialog(ref, onClose) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    const onKey = (event) => {
      if (event.key === "Escape") { event.stopPropagation(); closeRef.current(); }
      if (event.key !== "Tab") return;
      const items = [...(ref.current?.querySelectorAll('button:not([disabled]), a[href], input, summary, [tabindex="0"]') || [])].filter((item) => item.getClientRects().length);
      if (!items.length) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === items[0] || document.activeElement === ref.current)) { event.preventDefault(); items.at(-1).focus(); }
      else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0].focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = overflow; window.removeEventListener("keydown", onKey); previous?.focus?.(); };
  }, [ref]);
}

export default function GuidedSession({ kind, onClose, onSessionComplete, memberId, goalId }) {
  const reduceMotion = usePrefersReducedMotion();
  const overlayRef = useRef(null);
  const [voiceOn, setVoiceOn] = useState(true);
  const [urgeMode, setUrgeMode] = useState("freezeAndSqueeze");
  const [kegelLevel, setKegelLevel] = useState("standard");
  const [outcome, setOutcome] = useState(null);
  const outcomeRef = useRef(null);
  const outcomeId = useRef(null);
  const [saveError, setSaveError] = useState(null);
  const [restartToken, setRestartToken] = useState(0);
  const isUrge = kind === "urge";
  const chosen = isUrge ? URGE_MODES.find((mode) => mode.id === urgeMode) || URGE_MODES[0] : KEGEL_SETS.find((set) => set.id === kegelLevel) || KEGEL_SETS[2];
  const script = chosen.script;
  const finish = useCallback(() => {
    if (!isUrge) onSessionComplete?.({ kind, id: script.id, title: script.title, seconds: Math.round(script.totalDuration) });
  }, [isUrge, onSessionComplete, kind, script]);
  const engine = useSessionEngine(script, { voiceOn, onFinish: finish });
  const { running, paused, finished, position, start, stop } = engine;
  useEffect(() => {
    try { const value = window.localStorage.getItem("pelvi.session.voice"); if (value != null) setVoiceOn(value === "1"); } catch { /* defaults on */ }
    const level = audioPreference(memberId, "kegelLevel", "standard");
    if (KEGEL_SETS.some((set) => set.id === level)) setKegelLevel(level);
  }, [memberId]);
  useEffect(() => { if (isUrge) start(); }, [isUrge, urgeMode, restartToken, start]);
  useEffect(() => {
    if (!memberId) return;
    let mounted = true;
    const retry = () => {
      if (pendingUrgeOutcomes(memberId).length && mounted) setSaveError("Your feedback is saved in this browser and will retry when your diary is available.");
      void flushUrgeOutcomes(memberId, writeQueuedUrgeOutcome).then(() => {
        if (mounted && !pendingUrgeOutcomes(memberId).length) setSaveError(null);
      });
    };
    retry(); window.addEventListener("online", retry);
    const onVisible = () => { if (!document.hidden) retry(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { mounted = false; window.removeEventListener("online", retry); document.removeEventListener("visibilitychange", onVisible); };
  }, [memberId]);
  const persistOutcome = useCallback((value) => {
    if (!value || !memberId) return;
    outcomeId.current ||= globalThis.crypto?.randomUUID?.() || `urge_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    queueUrgeOutcome(memberId, { id: outcomeId.current, outcome: value, mode: urgeMode });
    // Never wait for an online acknowledgement before ending a rescue.
    void flushUrgeOutcomes(memberId, writeQueuedUrgeOutcome);
  }, [memberId, urgeMode]);
  const saveOutcome = useCallback(() => {
    persistOutcome(outcomeRef.current);
    outcomeRef.current = null; setOutcome(null);
  }, [persistOutcome]);
  const close = useCallback(() => { saveOutcome(); stop(); onClose(); }, [saveOutcome, stop, onClose]);
  useAudioDialog(overlayRef, close);
  const restart = (mode = urgeMode) => { saveOutcome(); stop(); outcomeId.current = null; setOutcome(null); setUrgeMode(mode); setRestartToken((value) => value + 1); };
  const setVoice = (next) => { setVoiceOn(next); try { window.localStorage.setItem("pelvi.session.voice", next ? "1" : "0"); } catch { /* unavailable */ } };
  const step = position?.step; const phase = step?.phase || "settle";
  return (
    <div ref={overlayRef} role="dialog" aria-modal="true" aria-label={isUrge ? "Urge Rescue" : "Audio Kegels"} tabIndex={-1} className="fixed inset-0 z-[70] flex flex-col overflow-y-auto bg-atelier-paper outline-none" style={{ backgroundImage: "linear-gradient(180deg,#F6F1EA,#EFE3DE)" }}>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(0.9rem,env(safe-area-inset-top))]">
        <header className="flex items-center gap-3">
          <button type="button" onClick={close} aria-label="Close" className="grid h-11 w-11 place-items-center"><ChevronLeft className="h-6 w-6" /></button>
          <p className="text-[11px] font-semibold tracking-[1.6px] text-app-textSecondary">{isUrge ? "URGE RESCUE" : "AUDIO KEGELS"}</p><span className="flex-1" />
          {(running || paused) && <p className="text-sm tabular-nums">{durationLabel(position?.secondsRemainingInSession || 0)}</p>}
          <button type="button" onClick={() => setVoice(!voiceOn)} aria-pressed={voiceOn} aria-label={voiceOn ? "Turn the voice off" : "Turn the voice on"} className="grid h-11 w-11 place-items-center">{voiceOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}</button>
        </header>
        {isUrge && <div className="mt-4 flex gap-2" role="group" aria-label="Choose a technique">{URGE_MODES.map((mode) => <button key={mode.id} type="button" aria-pressed={mode.id === urgeMode} onClick={() => restart(mode.id)} className={`min-h-11 flex-1 rounded-full px-3 py-2 text-sm font-semibold ${mode.id === urgeMode ? "bg-atelier-rose text-white" : "bg-white/70"}`}>{mode.title}</button>)}</div>}
        {engine.playbackMessage && <p role="status" className="mt-3 text-sm text-app-textSecondary">{engine.playbackMessage}</p>}
        {saveError && <p role="alert" className="mt-3 text-sm text-red-700">{saveError}</p>}
        {!running && !paused && !finished && !isUrge && <Chooser heading="Train with your eyes closed." options={KEGEL_SETS.map((set) => ({ ...set, length: durationLabel(set.script.totalDuration) }))} selected={kegelLevel} onSelect={(id) => { setKegelLevel(id); setAudioPreference(memberId, "kegelLevel", id); }} onStart={start} startLabel="Start the set" />}
        {(running || paused || finished) && <div className="flex flex-1 flex-col items-center justify-center py-8">
          <SessionRing label={finished ? (isUrge ? "You're okay" : "Done") : paused ? "Paused" : step?.label || ""} seconds={position?.secondsRemainingInStep || 0} progress={finished ? 1 : position?.phaseProgress || 0} scale={finished || paused ? 1 : PHASE_SCALE[phase] || 1} effort={isEffortPhase(phase)} complete={finished} reduceMotion={reduceMotion} />
          <p aria-live="polite" className="mt-8 max-w-xs text-center text-base font-medium">{finished ? (isUrge ? urgeMode === "knack" ? "Brace first, and you stay dry. Use it before the next cough." : "That's it. Walk when you're ready. You're in control." : "Set complete. That counts.") : step?.detail}</p>
          {!finished && script.repTotal > 0 && step?.rep && <p className="mt-3 text-sm">Rep {step.rep} of {script.repTotal}</p>}
          {paused && <p className="mt-3 text-center text-sm text-app-textSecondary">Session paused. Return to this screen and resume when you are ready.</p>}
        </div>}
        {finished && isUrge && <div className="mb-4"><p className="mb-2 text-center text-sm font-semibold">How does the urge feel now?</p><div className="flex gap-2">{["better", "same", "worse"].map((value) => <button type="button" key={value} aria-pressed={outcome === value} onClick={() => { outcomeRef.current = value; setOutcome(value); persistOutcome(value); }} className={`min-h-11 flex-1 rounded-xl p-3 capitalize ${outcome === value ? "bg-atelier-rose text-white" : "bg-white/70"}`}>{value}</button>)}</div><button type="button" onClick={() => restart()} className="mt-3 min-h-11 w-full rounded-full border border-app-primary/25">Run it again</button></div>}
        {(running || paused) && <button type="button" onClick={paused ? engine.resume : engine.pause} className="mb-3 flex min-h-11 items-center justify-center gap-2 rounded-full bg-white/60">{paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}{paused ? "Resume" : "Pause"}</button>}
        {(running || paused || finished) && <button type="button" onClick={close} className="min-h-14 w-full rounded-full bg-cta-gradient px-4 py-4 text-base font-bold text-white">{finished ? "Done" : isUrge ? "I'm OK now" : "Stop"}</button>}
        <p className="mt-4 text-center text-xs text-app-textSecondary">Recorded cues · vibration follows your device. Cue sessions pause when this tab is hidden.</p>
      </div>
    </div>
  );
}

export function SessionRing({ label, seconds, progress, scale, effort, complete, reduceMotion }) {
  const size = 268;
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div
      className="relative grid place-items-center"
      style={{
        width: size,
        height: size,
        transform: reduceMotion ? undefined : `scale(${scale})`,
        transition: reduceMotion ? undefined : "transform 900ms cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      {/* The soft glow behind the ring, warmer while she is working. */}
      <span
        aria-hidden="true"
        className="absolute inset-4 rounded-full blur-2xl"
        style={{ backgroundColor: effort ? "rgba(230,84,115,0.30)" : "rgba(230,84,115,0.16)" }}
      />

      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="absolute inset-0">
        <defs>
          <linearGradient id="pv-session-ring" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F68AA2" />
            <stop offset="50%" stopColor="#E65473" />
            <stop offset="100%" stopColor="#C33A5C" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="rgba(26,26,38,0.10)" strokeWidth={stroke} strokeLinecap="round"
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="url(#pv-session-ring)" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - Math.min(1, Math.max(0, progress)))}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 120ms linear" }}
        />
      </svg>

      <div className="relative text-center">
        <p className="text-[34px] font-bold leading-tight tracking-[-0.5px] text-app-textPrimary">{label}</p>
        {complete ? (
          <p className="mt-1 text-[40px] leading-none" aria-hidden="true">✓</p>
        ) : (
          <p className="mt-1 text-[44px] font-bold leading-none tabular-nums text-app-primary">{seconds}</p>
        )}
      </div>
    </div>
  );
}


function Chooser({ heading, options, selected, onSelect, onStart, startLabel }) {
  return (
    <div className="flex flex-1 flex-col justify-center py-6">
      <h2 className="text-[22px] font-bold leading-tight text-app-textPrimary">{heading}</h2>
      <ul className="mt-4 space-y-2.5">
        {options.map((option) => {
          const on = option.id === selected;
          return (
            <li key={option.id}>
              <button
                type="button"
                onClick={() => onSelect(option.id)}
                aria-pressed={on}
                className={`flex w-full items-center gap-3 rounded-[18px] border-2 bg-white px-4 py-3.5 text-left ${
                  on ? "border-app-primary" : "border-transparent"
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-bold text-app-textPrimary">{option.title}</span>
                  <span className="mt-0.5 block text-[12.5px] leading-snug text-app-textSecondary">{option.blurb}</span>
                </span>
                <span className="shrink-0 text-[13px] font-semibold tabular-nums text-app-textSecondary">
                  {option.length}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={onStart}
        className="mt-6 flex h-14 w-full items-center justify-center rounded-full bg-cta-gradient text-[17px] font-bold text-white"
      >
        {startLabel}
      </button>
    </div>
  );
}
