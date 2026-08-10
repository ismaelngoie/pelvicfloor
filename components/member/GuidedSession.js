"use client";

// Urge Rescue and Audio Kegels, on the web.
//
// A faithful port of the iOS Core/Sessions screens: the same scripts, the same
// one enormous breathing ring, the same one word and one number readable at
// arm's length, and the same exit at the bottom inside a thumb's reach saying
// "I'm OK now".
//
// The whole point of these two screens is that she stops looking at them. So
// the running state is deliberately almost empty, and the voice does the work.
//
// DELIBERATE BROWSER DIFFERENCES, and why
//   • Voice comes from the Web Speech API rather than recorded clips. Same
//     words. The browser will not speak at all until a real user gesture has
//     happened, which is fine: opening a session is a tap.
//   • Haptics use navigator.vibrate, which Android honours and iOS Safari
//     ignores. It is never the instruction, only reinforcement.
//   • No idle-timer control exists on the web, so a screen can lock mid set.
//     The Wake Lock API is asked for where it exists and silently skipped where
//     it does not, which is the closest a browser gets to iOS's behaviour.
//   • No full-screen "cover" presentation, so this is a fixed overlay that
//     traps focus and closes on Escape, which is what a keyboard user expects
//     from a modal on the web and a phone never has to think about.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, Volume2, VolumeX } from "lucide-react";
import { KEGEL_SETS, PHASE_SCALE, URGE_MODES, durationLabel, isEffortPhase } from "./sessionScripts";
import { usePrefersReducedMotion } from "./VideoPlayer";

const VOICE_KEY = "pelvi.session.voice";
const KEGEL_LEVEL_KEY = "pelvi.kegels.lastSet";

// --- The clock -------------------------------------------------------------

/**
 * Walks a script beat by beat off a single wall-clock anchor, so a dropped
 * frame or a backgrounded tab cannot make the session drift away from the
 * voice. Returns everything the ring needs and nothing it does not.
 */
function useSessionEngine(script, { voiceOn, onFinish }) {
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const startedAt = useRef(0);
  const spoken = useRef(new Set());
  const finishedRef = useRef(false);

  const speak = useCallback(
    (text) => {
      if (!voiceOn || typeof window === "undefined" || !window.speechSynthesis) return;
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.92;
        utterance.pitch = 1.02;
        utterance.lang = "en-US";
        window.speechSynthesis.speak(utterance);
      } catch {
        // A browser that will not speak still shows every word on screen.
      }
    },
    [voiceOn]
  );

  const buzz = useCallback((pattern) => {
    try {
      navigator.vibrate?.(pattern);
    } catch {
      // Desktop, or a browser that does not do haptics. Never load bearing.
    }
  }, []);

  const stop = useCallback(() => {
    setRunning(false);
    try { window.speechSynthesis?.cancel(); } catch { /* nothing to cancel */ }
  }, []);

  const start = useCallback(() => {
    spoken.current = new Set();
    finishedRef.current = false;
    startedAt.current = Date.now();
    setElapsed(0);
    setFinished(false);
    setRunning(true);
  }, []);

  useEffect(() => {
    if (!running || !script) return undefined;
    const id = setInterval(() => {
      setElapsed(Math.min(script.totalDuration, (Date.now() - startedAt.current) / 1000));
    }, 100);
    return () => clearInterval(id);
  }, [running, script]);

  // Where we are in the script, derived rather than stored, so there is exactly
  // one source of truth for the ring, the countdown and the rep line.
  const position = useMemo(() => {
    if (!script) return null;
    const offsets = script.stepOffsets;
    let index = 0;
    for (let i = 0; i < offsets.length; i += 1) {
      if (elapsed >= offsets[i]) index = i;
      else break;
    }
    const step = script.steps[index];
    const into = Math.max(0, elapsed - offsets[index]);
    return {
      index,
      step,
      into,
      phaseProgress: Math.min(1, into / step.duration),
      secondsRemainingInStep: Math.max(0, Math.ceil(step.duration - into)),
      secondsRemainingInSession: Math.max(0, Math.ceil(script.totalDuration - elapsed)),
    };
  }, [script, elapsed]);

  // Cues and the buzz leave together, so the two can never drift apart.
  useEffect(() => {
    if (!running || !position) return;
    const { index, step, into } = position;

    const beatKey = `beat-${index}`;
    if (!spoken.current.has(beatKey)) {
      spoken.current.add(beatKey);
      if (isEffortPhase(step.phase)) buzz([18, 40, 18]);
      else if (step.phase === "release" || step.phase === "breatheOut") buzz(30);
    }

    step.cues.forEach((c, ci) => {
      const key = `${index}-${ci}`;
      if (into >= c.at && !spoken.current.has(key)) {
        spoken.current.add(key);
        speak(c.text);
      }
    });

    if (step.countsAloud) {
      const second = Math.floor(into);
      const key = `${index}-count-${second}`;
      if (second >= 1 && second < step.duration && !spoken.current.has(key)) {
        spoken.current.add(key);
        speak(`${second + 1}.`);
      }
    }

    if (elapsed >= script.totalDuration && !finishedRef.current) {
      finishedRef.current = true;
      setRunning(false);
      setFinished(true);
      buzz([40, 60, 40, 60, 90]);
      onFinish?.();
    }
  }, [running, position, elapsed, script, speak, buzz, onFinish]);

  // Never leave a voice talking to an empty room.
  useEffect(() => () => { try { window.speechSynthesis?.cancel(); } catch { /* ignore */ } }, []);

  return { running, finished, elapsed, position, start, stop };
}

// --- The ring --------------------------------------------------------------

/**
 * The breathing ring: it draws in on effort, opens out on the inhale, and
 * carries the one word and the one number that matter right now.
 */
function SessionRing({ label, seconds, progress, scale, effort, complete, reduceMotion }) {
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

// --- The screen ------------------------------------------------------------

/**
 * @param {"urge"|"kegels"} kind
 */
export default function GuidedSession({ kind, onClose, onSessionComplete }) {
  const reduceMotion = usePrefersReducedMotion();
  const overlayRef = useRef(null);

  const [voiceOn, setVoiceOn] = useState(true);
  const [urgeMode, setUrgeMode] = useState(URGE_MODES[0].id);
  const [kegelLevel, setKegelLevel] = useState(KEGEL_SETS[0].id);

  // Her level is remembered: most women settle on one and stay there for weeks.
  useEffect(() => {
    try {
      const storedVoice = window.localStorage.getItem(VOICE_KEY);
      if (storedVoice != null) setVoiceOn(storedVoice === "1");
      const storedLevel = window.localStorage.getItem(KEGEL_LEVEL_KEY);
      if (storedLevel && KEGEL_SETS.some((s) => s.id === storedLevel)) setKegelLevel(storedLevel);
    } catch {
      // Private browsing. Defaults are good defaults.
    }
  }, []);

  const setVoice = useCallback((next) => {
    setVoiceOn(next);
    try { window.localStorage.setItem(VOICE_KEY, next ? "1" : "0"); } catch { /* ignore */ }
    if (!next) { try { window.speechSynthesis?.cancel(); } catch { /* ignore */ } }
  }, []);

  const chooseLevel = useCallback((id) => {
    setKegelLevel(id);
    try { window.localStorage.setItem(KEGEL_LEVEL_KEY, id); } catch { /* ignore */ }
  }, []);

  const isUrge = kind === "urge";
  const chosen = isUrge
    ? URGE_MODES.find((m) => m.id === urgeMode) || URGE_MODES[0]
    : KEGEL_SETS.find((s) => s.id === kegelLevel) || KEGEL_SETS[0];
  const script = chosen.script;

  const finish = useCallback(() => {
    // A finished set is real engagement, so it is banked. It deliberately does
    // NOT complete a program day: the 90 days are earned in the guided video
    // sessions, and inflating them here would quietly devalue the guarantee.
    onSessionComplete?.({ kind, id: script.id, seconds: Math.round(script.totalDuration) });
  }, [kind, script, onSessionComplete]);

  const { running, finished, position, start, stop } = useSessionEngine(script, { voiceOn, onFinish: finish });

  // Urge Rescue starts the moment it appears. No menu, no start button: she is
  // standing very still in a supermarket aisle and has no attention to spare.
  const autoStarted = useRef(false);
  useEffect(() => {
    if (!isUrge || autoStarted.current) return;
    autoStarted.current = true;
    start();
  }, [isUrge, start]);

  // A screen that locks halfway through an eyes-closed set ends the set.
  useEffect(() => {
    if (!running || typeof navigator === "undefined" || !navigator.wakeLock) return undefined;
    let sentinel = null;
    navigator.wakeLock.request("screen").then((s) => { sentinel = s; }).catch(() => {});
    return () => { try { sentinel?.release(); } catch { /* already gone */ } };
  }, [running]);

  const close = useCallback(() => { stop(); onClose(); }, [stop, onClose]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    overlayRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  const step = position?.step;
  const phase = step?.phase || "settle";
  const title = isUrge ? "URGE RESCUE" : "AUDIO KEGELS";

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={isUrge ? "Urge Rescue" : "Audio Kegels"}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex flex-col overflow-y-auto outline-none"
      style={{
        // The soft blush wash both session screens sit on, matching iOS.
        backgroundImage: "linear-gradient(180deg, #FFF9FB 0%, #FEE6ED 100%)",
      }}
    >
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(0.9rem,env(safe-area-inset-top))]">
        {/* Header */}
        <header className="flex items-baseline gap-3">
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="-ml-2 grid h-9 w-9 shrink-0 place-items-center self-center rounded-full text-app-textSecondary"
          >
            <ChevronLeft className="h-6 w-6" aria-hidden="true" />
          </button>
          <p className="text-[11px] font-semibold tracking-[1.6px] text-app-textSecondary">{title}</p>
          <span className="flex-1" />
          {running && (
            <p className="text-[15px] font-semibold tabular-nums text-app-textSecondary">
              {durationLabel(position?.secondsRemainingInSession || 0)}
            </p>
          )}
          <button
            type="button"
            onClick={() => setVoice(!voiceOn)}
            aria-pressed={voiceOn}
            aria-label={voiceOn ? "Turn the voice off" : "Turn the voice on"}
            className="grid h-9 w-9 shrink-0 place-items-center self-center rounded-full text-app-textSecondary"
          >
            {voiceOn ? <Volume2 className="h-5 w-5" aria-hidden="true" /> : <VolumeX className="h-5 w-5" aria-hidden="true" />}
          </button>
        </header>

        {/* Session progress, the thin bar at the top of the screen. */}
        {running && (
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-black/[0.07]" aria-hidden="true">
            <span
              className="block h-full rounded-full bg-app-primary transition-[width] duration-200 ease-linear"
              style={{ width: `${Math.min(100, ((script.totalDuration - (position?.secondsRemainingInSession || 0)) / script.totalDuration) * 100)}%` }}
            />
          </div>
        )}

        {/* Idle: the chooser. Audio Kegels only. Urge Rescue never waits. */}
        {!running && !finished && !isUrge && (
          <Chooser
            heading="Pick your set"
            options={KEGEL_SETS.map((s) => ({ id: s.id, title: s.title, blurb: s.blurb, length: durationLabel(s.script.totalDuration) }))}
            selected={kegelLevel}
            onSelect={chooseLevel}
            onStart={start}
            startLabel="Start the set"
          />
        )}

        {/* Running, or done. */}
        {(running || finished) && (
          <div className="flex flex-1 flex-col items-center justify-center py-6">
            <SessionRing
              label={finished ? "Done" : step?.label || ""}
              seconds={position?.secondsRemainingInStep ?? 0}
              progress={finished ? 1 : position?.phaseProgress ?? 0}
              scale={finished ? 1 : PHASE_SCALE[phase] ?? 1}
              effort={isEffortPhase(phase)}
              complete={finished}
              reduceMotion={reduceMotion}
            />

            <p
              aria-live="polite"
              className="mt-7 max-w-[19rem] text-center text-[16px] font-medium leading-snug text-app-textPrimary"
            >
              {finished
                ? (isUrge ? "That is the whole technique. Use it any time." : "Set complete. That counts.")
                : step?.detail}
            </p>

            {!finished && script.repTotal > 0 && step?.rep ? (
              <p className="mt-3 text-[13px] font-semibold tracking-wide text-app-textSecondary">
                Rep {step.rep} of {script.repTotal}
              </p>
            ) : null}
          </div>
        )}

        <div className="mt-auto pt-6">
          {/* Urge Rescue offers the other technique without leaving the screen. */}
          {isUrge && !running && (
            <div className="mb-4 flex gap-2" role="group" aria-label="Choose a technique">
              {URGE_MODES.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => { setUrgeMode(mode.id); setTimeout(start, 0); }}
                  className={`flex-1 rounded-2xl border px-3 py-3 text-left ${
                    mode.id === urgeMode ? "border-app-primary bg-white" : "border-app-primary/20 bg-white/60"
                  }`}
                >
                  <span className="block text-[14px] font-bold text-app-textPrimary">{mode.title}</span>
                  <span className="mt-0.5 block text-[11.5px] leading-snug text-app-textSecondary">{mode.tagline}</span>
                </button>
              ))}
            </div>
          )}

          {/* One action, never two. The kegel chooser owns its own start
              button, so the bar below it stays out of the way until the set is
              actually running. */}
          {running && (
            <button
              type="button"
              onClick={close}
              className="flex h-14 w-full items-center justify-center rounded-full border border-app-primary/25 bg-white/80 text-[17px] font-bold text-app-textPrimary"
            >
              {isUrge ? "I'm OK now" : "Stop"}
            </button>
          )}
          {finished && (
            <button
              type="button"
              onClick={close}
              className="flex h-14 w-full items-center justify-center rounded-full bg-cta-gradient text-[17px] font-bold text-white"
            >
              Done
            </button>
          )}
          {!running && !finished && isUrge && (
            <button
              type="button"
              onClick={start}
              className="flex h-14 w-full items-center justify-center rounded-full bg-cta-gradient text-[17px] font-bold text-white"
            >
              Start
            </button>
          )}
        </div>
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
