"use client";

// The one video player. Today's session, a library shelf, a form lesson and a
// Coach Mia hand-off all open this, so playback behaves the same everywhere.
//
// The rule that shaped it: FINISHING A PLAYLIST MUST NEVER LEAVE HER STUCK.
// The iOS app shipped a build where the last video ended on a black screen with
// no control on it, and the only way out was to force quit. Here the end of a
// playlist is a real screen with two ways forward, the close control is present
// from the first frame to the last, and Escape always works.
//
// Thresholds come from lib/program.js, which is a port of the iOS ProgramEngine:
// a video counts at 80 percent watched, a day counts at 60 percent of its
// videos. Change them there, not here.

import { useMember } from "./MemberProvider";
import { SessionFeedback } from "./MemberTools";
import ExercisePractice from "./ExercisePractice";
import useTVPlayback from "./useTVPlayback";
import WatchOnTV from "./WatchOnTV";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, Check, ChevronLeft, ChevronRight, FlipHorizontal2, Heart,
  Loader2, Pause, Play, Repeat, RotateCcw, RotateCw, Tv, Volume2, VolumeX,
} from "lucide-react";
import { DAY_COMPLETION_THRESHOLD, VIDEO_COMPLETION_THRESHOLD } from "@/lib/program";
import { durationLabel } from "@/lib/library";
import { exerciseGuidance, exerciseTransition } from "@/lib/exercisePrescription";
import {
  addPlaybackDelta, allowsPlaybackShortcut, createPlaybackLedger, finalizePlaybackSession, markExerciseComplete,
  playbackEntry, playbackSummary, resolveExercisePractice, retryPlaybackEvent, takePlaybackEvent,
} from "@/lib/playbackLedger";

const SKIP_SECONDS = 10;

const PLAYER_CSS = `
.pv-range{-webkit-appearance:none;appearance:none;width:100%;height:28px;background:transparent;cursor:pointer}
.pv-range:focus{outline:none}
.pv-range:focus-visible{outline:2px solid #FF2D55;outline-offset:4px;border-radius:8px}
.pv-range::-webkit-slider-runnable-track{height:6px;border-radius:999px;background:var(--pv-track)}
.pv-range::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:18px;height:18px;margin-top:-6px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.5)}
.pv-range::-moz-range-track{height:6px;border-radius:999px;background:var(--pv-track)}
.pv-range::-moz-range-thumb{width:18px;height:18px;border:0;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.5)}
.pv-vol{height:24px}
.pv-vol::-webkit-slider-thumb{width:14px;height:14px;margin-top:-4px}
.pv-vol::-moz-range-thumb{width:14px;height:14px}
`;

function clockLabel(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function containModalTab(event) {
  if (event.key !== "Tab") return;
  const nodes = [...event.currentTarget.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), [tabindex="0"]')];
  const first = nodes[0];
  const last = nodes[nodes.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
}

/**
 * @param {object}   props
 * @param {object[]} props.videos    catalog entries, in playing order
 * @param {number}   props.startIndex
 * @param {string}   props.title     what she tapped to get here
 * @param {string}   props.subtitle
 * @param {object}   props.dayContext { day, intention } when this is a program day
 * @param {function} props.onClose
 * @param {function} props.onVideoWatched ({ video, secondsWatched, completed })
 * @param {function} props.onDayComplete  ({ day, secondsWatched })
 * @param {function} props.onToggleSaved
 * @param {string[]} props.savedIds
 */
export default function VideoPlayer({
  videos = [],
  startIndex = 0,
  title = "Your session",
  subtitle = "",
  dayContext = null,
  prescriptionDay = 1,
  playbackContext = "library",
  onClose,
  onVideoWatched,
  onDayComplete,
  onToggleSaved,
  savedIds = [],
}) {
  const { prescriptionForVideo, shouldOpenCoachMode, member, goalId, focusId, difficulty, logSessionComplete } = useMember();
  const [practice, setPractice] = useState(null);
  const videoRef = useRef(null);
  const shellRef = useRef(null);
  const lastTimeRef = useRef(0);
  const ledgerRef = useRef(createPlaybackLedger(videos.length));
  const watchRef = useRef(ledgerRef.current.entries);
  const eventPromisesRef = useRef(new Map());
  const finishInFlightRef = useRef(false);
  const autoCoachOpenedRef = useRef(false);
  const hideTimerRef = useRef(null);
  const remoteHandlersRef = useRef({});
  const tvRef = useRef(null);

  const [index, setIndex] = useState(() =>
    Math.min(Math.max(startIndex, 0), Math.max(videos.length - 1, 0))
  );
  const [playbackRevision, setPlaybackRevision] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [waiting, setWaiting] = useState(true);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [mirrored, setMirrored] = useState(false);
  const [looping, setLooping] = useState(false);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [finished, setFinished] = useState(false);
  const [failed, setFailed] = useState(false);
  const [failureKind, setFailureKind] = useState("format"); // format | network
  const [watchedCount, setWatchedCount] = useState(0);
  // Whether onDayComplete actually fired. The completion screen is not allowed
  // to say "Day 4 is done" unless a day was really banked.
  const [dayCredited, setDayCredited] = useState(false);
  const [savingCompletion, setSavingCompletion] = useState(false);
  const [completionError, setCompletionError] = useState("");
  const [transition, setTransition] = useState(null);
  const [coachMode, setCoachMode] = useState(false);
  const [fullScreenAvailable, setFullScreenAvailable] = useState(false);

  const reduceMotion = usePrefersReducedMotion();
  const current = videos[index] || null;
  const prescription = current ? prescriptionForVideo?.(current, { programDay: prescriptionDay }) : null;
  const isLast = index >= videos.length - 1;
  const savedSet = useMemo(() => new Set(savedIds), [savedIds]);
  const guidance = useMemo(() => exerciseGuidance(current, { goalId }), [current, goalId]);
  const tv = useTVPlayback({ videoRef, video: finished ? null : current, revision: playbackRevision, volume, muted,
    onSample: (value) => remoteHandlersRef.current.sample?.(value),
    onEnded: (value) => remoteHandlersRef.current.ended?.(value),
    onDisconnect: (position) => { lastTimeRef.current = position; setTime(position); setPlaying(false); setWaiting(false); },
  });
  tvRef.current = tv;
  const pauseActive = useCallback(() => {
    videoRef.current?.pause();
    if (tvRef.current?.activeRef.current) tvRef.current.pause();
    setPlaying(false);
  }, []);
  const shouldHoldForCoach = shouldOpenCoachMode && !autoCoachOpenedRef.current;
  useEffect(() => {
    if (shouldOpenCoachMode && !finished && !autoCoachOpenedRef.current) {
      autoCoachOpenedRef.current = true;
      pauseActive();
      setCoachMode(true);
    }
  }, [shouldOpenCoachMode, finished, pauseActive]);

  // --- Progress bookkeeping ------------------------------------------------

  const bucket = useCallback((i) => playbackEntry(ledgerRef.current, i), []);
  const totalSecondsWatched = useCallback(() => playbackSummary(ledgerRef.current).seconds, []);

  // Completion and persistence are separate. A demonstration can qualify at
  // 80%, while its immutable history event waits for all guided work to end.
  const markWatched = useCallback((i) => {
    markExerciseComplete(ledgerRef.current, i);
    setWatchedCount(playbackSummary(ledgerRef.current).completed);
  }, []);

  const flushVideoEvent = useCallback((i, { partial = false } = {}) => {
    if (eventPromisesRef.current.has(i)) return eventPromisesRef.current.get(i);
    const event = takePlaybackEvent(ledgerRef.current, i, { partial });
    if (!event || !videos[i]) return Promise.resolve();
    const pending = (async () => {
      try {
        const result = await onVideoWatched?.({ video: videos[i], ...event,
          programDay: playbackContext === "library" ? null : prescriptionDay, playbackContext,
        });
        if (result === false) retryPlaybackEvent(ledgerRef.current, i);
      } catch { retryPlaybackEvent(ledgerRef.current, i); }
      finally { eventPromisesRef.current.delete(i); }
    })();
    eventPromisesRef.current.set(i, pending);
    return pending;
  }, [videos, onVideoWatched, prescriptionDay, playbackContext]);

  // --- Element wiring ------------------------------------------------------

  useEffect(() => {
    // New clip on the SAME element: the timeline resets, her preferences do not.
    // The element is deliberately not keyed by video id. A keyed element is torn
    // down and rebuilt per clip, which hands the next exercise a fresh element at
    // full volume, unmuted, however she had set it.
    const el = videoRef.current;
    lastTimeRef.current = 0;
    setTime(0);
    setDuration(0);
    setWaiting(true);
    setFailed(false);
    if (!el) return;
    el.load();
    el.volume = volume;
    el.muted = muted;
    if (shouldHoldForCoach || coachMode || tvRef.current?.activeRef.current) return;
    const attempt = el.play();
    if (attempt?.catch) attempt.catch(() => setPlaying(false));
    // volume and muted are applied, not depended on: their own effect below
    // handles a mid-clip change, and re-running this one would restart playback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, playbackRevision]);

  useEffect(() => {
    const el = videoRef.current;
    if (el) {
      el.volume = volume;
      el.muted = muted;
    }
    if (tv.connected) tv.volume(volume, muted);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volume, muted, tv.connected, tv.loading]);

  const handleTimeUpdate = useCallback(() => {
    if (tvRef.current?.activeRef.current) return;
    const el = videoRef.current;
    if (!el) return;
    const now = el.currentTime;
    const delta = now - lastTimeRef.current;
    lastTimeRef.current = now;
    // Only count forward, real-time movement while it is actually playing: a
    // seek, a loop restart or a nudge of the scrubber while paused is not five
    // minutes of exercise.
    const entry = bucket(index);
    addPlaybackDelta(ledgerRef.current, index, delta, !el.paused);
    setTime(now);
    const total = el.duration;
    // 80 percent of the clip WATCHED, not 80 percent of the way along the
    // scrubber. Dragging the handle to the end is not doing the exercise, and
    // WorkoutPlayerCore counts playedSecondsByIndex for exactly this reason.
    if (Number.isFinite(total) && total > 0 && entry.seconds >= total * VIDEO_COMPLETION_THRESHOLD) {
      markWatched(index);
    }
  }, [bucket, index, markWatched]);

  const goTo = useCallback((nextIndex) => {
    if (nextIndex < 0 || nextIndex >= videos.length) return;
    if (nextIndex !== index) void flushVideoEvent(index);
    pauseActive();
    setPractice(null);
    setTransition(null);
    setFinished(false);
    if (nextIndex === index) setPlaybackRevision((value) => value + 1);
    setIndex(nextIndex);
  }, [videos.length, index, flushVideoEvent, pauseActive]);

  // This explicit finish path is the sole place that can bank a program day.
  const finishSession = useCallback(async ({ credit = false } = {}) => {
    if (credit) markWatched(index);
    pauseActive();
    tvRef.current?.stop();
    setFinished(true);
    setChromeVisible(true);
    setCompletionError("");
    const ledger = ledgerRef.current;
    const summary = playbackSummary(ledger);
    setWatchedCount(summary.completed);
    if (!summary.qualifies || ledger.finalizing || finishInFlightRef.current) return;
    finishInFlightRef.current = true;
    setSavingCompletion(true);
    try {
      await Promise.all([...ledger.entries.keys()].map((i) => flushVideoEvent(i)));
      const result = await finalizePlaybackSession(ledger, {
        day: dayContext?.day ?? null,
        onDayComplete,
        requireSessionRecord: !dayContext?.day && ["program", "continuation", "replay"].includes(playbackContext),
        onSessionComplete: (value) => logSessionComplete?.({
          secondsWatched: value.seconds, completedCount: value.completed, videoCount: videos.length,
          programDay: playbackContext === "library" ? null : prescriptionDay, playbackContext,
        }),
      });
      setDayCredited(result.credited);
      if (result.saveFailed) setCompletionError(`Your exercise is finished, but your ${dayContext?.day ? "day" : "session"} could not be saved. Try saving again.`);
    } finally { finishInFlightRef.current = false; setSavingCompletion(false); }
  }, [index, markWatched, flushVideoEvent, dayContext?.day, onDayComplete, logSessionComplete,
    videos.length, playbackContext, prescriptionDay, pauseActive]);

  const advanceAfterExercise = useCallback(() => {
    void flushVideoEvent(index);
    if (isLast) { void finishSession(); return; }
    const next = exerciseTransition(current, videos[index + 1], { member, goalId, focusId, difficulty, programDay: prescriptionDay });
    pauseActive();
    setTransition({ ...next, nextIndex: index + 1, remaining: next.seconds });
  }, [flushVideoEvent, index, isLast, finishSession, current, videos, member, goalId, focusId, difficulty, prescriptionDay, pauseActive]);

  const handleEnded = useCallback((source = {}) => {
    const remote = source.remote === true;
    if (tvRef.current?.activeRef.current && !remote) return;
    const el = videoRef.current;
    if (looping && remote) { tvRef.current.replay(); return; }
    if (looping && el) {
      el.currentTime = 0;
      lastTimeRef.current = 0;
      el.play().catch(() => {});
      return;
    }
    const total = remote ? source.duration : el?.duration;
    if (Number.isFinite(total) && total > 0 && bucket(index).seconds >= total * VIDEO_COMPLETION_THRESHOLD) markWatched(index);
    if (prescription?.offersGuidedPractice && !bucket(index).practiceResolved) {
      pauseActive();
      setPractice({ index });
      return;
    }
    advanceAfterExercise();
  }, [looping, markWatched, index, prescription, bucket, advanceAfterExercise, pauseActive]);

  remoteHandlersRef.current = {
    sample(value) {
      if (!tvRef.current?.activeRef.current || value.contentId !== current?.url) return;
      const entry = addPlaybackDelta(ledgerRef.current, index, value.delta, value.playing);
      setTime(value.time); setDuration(value.duration); setPlaying(value.playing); setWaiting(value.waiting);
      if (value.duration > 0 && entry.seconds >= value.duration * VIDEO_COMPLETION_THRESHOLD) markWatched(index);
    },
    ended(value) { handleEnded({ remote: true, duration: value.duration }); },
  };

  const finishPractice = useCallback((seconds = 0) => {
    if (!practice || practice.index !== index) return;
    resolveExercisePractice(ledgerRef.current, index, seconds);
    setWatchedCount(playbackSummary(ledgerRef.current).completed);
    setPractice(null);
    advanceAfterExercise();
  }, [practice, index, advanceAfterExercise]);

  useEffect(() => {
    if (!transition) return undefined;
    if (transition.remaining <= 0) { goTo(transition.nextIndex); return undefined; }
    const timer = setTimeout(() => {
      setTransition((value) => value ? { ...value, remaining: document.hidden ? value.remaining : value.remaining - 1 } : value);
    }, 1000);
    return () => clearTimeout(timer);
  }, [transition, goTo]);

  const togglePlay = useCallback(() => {
    if (tvRef.current?.activeRef.current) { tvRef.current.toggle(); return; }
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      const attempt = el.play();
      if (attempt?.catch) attempt.catch(() => setPlaying(false));
    } else {
      el.pause();
    }
  }, []);

  const skip = useCallback((seconds) => {
    if (tvRef.current?.activeRef.current) { tvRef.current.seek(time + seconds); return; }
    const el = videoRef.current;
    if (!el || !Number.isFinite(el.duration)) return;
    const next = Math.min(Math.max(el.currentTime + seconds, 0), el.duration);
    el.currentTime = next;
    lastTimeRef.current = next;
    setTime(next);
  }, [time]);

  const seekTo = useCallback((seconds) => {
    if (tvRef.current?.activeRef.current) { tvRef.current.seek(seconds); setTime(seconds); return; }
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = seconds;
    lastTimeRef.current = seconds;
    setTime(seconds);
  }, []);

  // --- Leaving -------------------------------------------------------------

  const close = useCallback(() => {
    pauseActive();
    tvRef.current?.stop();
    for (const i of ledgerRef.current.entries.keys()) void flushVideoEvent(i, { partial: true });
    onClose?.();
  }, [flushVideoEvent, onClose, pauseActive]);

  // --- Keyboard ------------------------------------------------------------

  useEffect(() => {
    const onKey = (event) => {
      const tag = event.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || event.target?.isContentEditable) return;
      const key = event.key.toLowerCase();
      const handled = () => { event.preventDefault(); event.stopPropagation(); };

      if (tv.open) { if (event.key === "Escape") { handled(); tv.setOpen(false); } return; }

      if (practice) { if (event.key === "Escape") { handled(); setPractice(null); } return; }
      if (coachMode) { if (event.key === "Escape") { handled(); setCoachMode(false); } return; }
      if (transition) { if (event.key === "Escape") { handled(); setTransition(null); } return; }
      if (event.key === "Escape") { handled(); close(); return; }
      if (!allowsPlaybackShortcut({ practice, transition, finished, saving: savingCompletion, tagName: tag, isContentEditable: event.target?.isContentEditable })) return;

      switch (key) {
        case " ":
        case "k": handled(); togglePlay(); break;
        case "arrowleft": handled(); skip(-SKIP_SECONDS); break;
        case "arrowright": handled(); skip(SKIP_SECONDS); break;
        case "arrowup": handled(); setVolume((v) => Math.min(1, Math.round((v + 0.1) * 10) / 10)); setMuted(false); break;
        case "arrowdown": handled(); setVolume((v) => Math.max(0, Math.round((v - 0.1) * 10) / 10)); break;
        case "n": handled(); if (!isLast) goTo(index + 1); break;
        case "p": handled(); if (index > 0) goTo(index - 1); break;
        case "m": handled(); if (!tvRef.current?.activeRef.current && !tvRef.current?.airPlaying) setMirrored((v) => !v); break;
        case "l": handled(); setLooping((v) => !v); break;
        default: break;
      }
      if (key !== "escape") setChromeVisible(true);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [close, finished, togglePlay, skip, isLast, index, goTo, practice, coachMode, transition, savingCompletion, tv.open]);

  // --- Chrome auto-hide ----------------------------------------------------

  const wakeChrome = useCallback(() => {
    setChromeVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (!playing || finished || tv.connected || tv.airPlaying) return;
    hideTimerRef.current = setTimeout(() => setChromeVisible(false), 3200);
  }, [playing, finished, tv.connected, tv.airPlaying]);

  useEffect(() => {
    wakeChrome();
    return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); };
  }, [wakeChrome]);

  // --- Keep the screen on while she is working ----------------------------

  useEffect(() => {
    let sentinel = null;
    let cancelled = false;
    if ((playing || practice || tv.connected) && typeof navigator !== "undefined" && navigator.wakeLock?.request) {
      navigator.wakeLock
        .request("screen")
        .then((lock) => { if (cancelled) lock.release().catch(() => {}); else sentinel = lock; })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
      sentinel?.release?.().catch(() => {});
    };
  }, [playing, practice, tv.connected]);

  // Focus the panel so the keyboard map works without a click first.
  useEffect(() => { shellRef.current?.focus(); }, []);
  useEffect(() => { setFullScreenAvailable(Boolean(shellRef.current?.requestFullscreen || videoRef.current?.webkitEnterFullscreen)); }, [finished]);

  const fullScreen = () => {
    const request = shellRef.current?.requestFullscreen?.bind(shellRef.current)
      || videoRef.current?.webkitEnterFullscreen?.bind(videoRef.current);
    try { request?.()?.catch?.(() => {}); } catch { /* Browser decides availability. */ }
  };

  if (!videos.length) return null;

  const upcoming = videos.map((video, i) => ({ video, i }));
  const progressPercent = duration > 0 ? Math.min(100, (time / duration) * 100) : 0;

  return (
    <div
      ref={shellRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={`${title}. Exercise ${index + 1} of ${videos.length}.`}
      // From 1024 the player is two panes: the stage and its transport on the
      // left, the session's clips as a list on the right. A single column at
      // that width means a 1900px-wide scrubber under a video that is mostly
      // black bars, and the next exercise nowhere in sight.
      className="fixed inset-0 z-50 flex flex-col bg-black text-white outline-none lg:flex-row"
      onMouseMove={wakeChrome}
      onTouchStart={wakeChrome}
    >
      <style>{PLAYER_CSS}</style>
      <WatchOnTV tv={tv} onFullScreen={fullScreen} fullScreenAvailable={fullScreenAvailable} />
      {coachMode && <div onKeyDown={containModalTab} role="dialog" aria-modal="true" aria-label="Coach Mode" className="fixed inset-0 z-[75] overflow-y-auto bg-atelier-paper px-5 py-6 text-atelier-ink"><div className="mx-auto max-w-xl"><button type="button" autoFocus onClick={() => setCoachMode(false)} className="min-h-11 px-2 font-semibold text-atelier-rosewood">Back to exercise</button><p className="mt-4 text-xs uppercase tracking-widest text-atelier-rosewood">Coach Mode</p><h2 className="mt-2 font-serif text-[32px]">{current?.title}</h2><p className="mt-3 text-sm text-atelier-ink2">{prescription?.doseLine} · {prescription?.restLine}</p><p className="mt-2 text-sm text-atelier-ink2">{prescription?.setup}</p>{[["Why this helps", guidance.purpose], ["What to feel", guidance.feel], ["How to breathe", guidance.breathe], ["What to avoid", guidance.avoid], ["Make it easier", guidance.easier]].map(([label, text]) => <section key={label} className="mt-4 rounded-2xl border border-atelier-line bg-atelier-card p-4"><h3 className="font-semibold">{label}</h3><p className="mt-2 text-[15px] leading-relaxed text-atelier-ink2">{text}</p></section>)}<button type="button" onClick={() => setCoachMode(false)} className="my-6 min-h-[52px] w-full rounded-full bg-atelier-rosewood font-semibold text-white">Continue Exercise</button></div></div>}
      {practice && prescription && <ExercisePractice key={`${current?.id}-${index}`} video={current} prescription={prescription}
        onClose={() => setPractice(null)}
        onWatch={() => { setPractice(null); if (tvRef.current?.activeRef.current) { tvRef.current.replay(); return; } const el = videoRef.current; if (el) { el.currentTime = 0; lastTimeRef.current = 0; el.play().catch(() => {}); } }}
        onSkip={() => finishPractice(0)}
        onFinish={finishPractice} />}
      {transition && <div onKeyDown={containModalTab} role="dialog" aria-modal="true" aria-label="Next exercise" className="fixed inset-0 z-[65] flex flex-col items-center justify-center bg-black/95 px-6 text-center text-white">
        <p className="text-xs uppercase tracking-widest text-white/60">Up next</p><h2 className="mt-3 text-2xl font-semibold">{videos[transition.nextIndex]?.title}</h2>
        <p className="mt-4 max-w-md text-base text-white/80">{transition.instruction}</p><p aria-live="off" className="my-6 text-6xl font-semibold tabular-nums">{transition.remaining}</p>
        <button type="button" autoFocus onClick={() => goTo(transition.nextIndex)} className="min-h-[52px] w-full max-w-xs rounded-full bg-ios-pink px-6 font-semibold">Start now</button>
        <button type="button" onClick={() => setTransition((value) => value ? { ...value, remaining: Math.min(30, value.remaining + 10), instruction: "Take your time. Start when you feel set up." } : value)} className="mt-3 min-h-[44px] px-6 text-sm text-white/80">Give me 10 more seconds</button>
      </div>}

      {finished ? (
        <CompletionScreen
          title={title}
          dayContext={dayContext}
          dayCredited={dayCredited}
          saving={savingCompletion}
          error={completionError}
          onRetrySave={() => finishSession()}
          videoCount={videos.length}
          watchedCount={watchedCount}
          seconds={totalSecondsWatched()}
          reduceMotion={reduceMotion}
          onReplay={() => {
            // Deliberately keeps what she already earned. Wiping it made a
            // second run through a half-finished day start from zero, so the
            // exercises she had already done had to be redone before the day
            // could reach the 60 percent bar. markWatched is idempotent per
            // index, so nothing is logged twice either.
            goTo(0);
          }}
          onClose={close}
        />
      ) : (
        <>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {/* Stage */}
          <div className="relative flex-1 min-h-0" onClick={() => (chromeVisible ? togglePlay() : wakeChrome())}>
            <video
              ref={videoRef}
              src={current?.url}
              className="absolute inset-0 h-full w-full object-contain"
              style={{ transform: mirrored ? "scaleX(-1)" : undefined }}
              playsInline
              x-webkit-airplay="allow"
              preload="auto"
              onLoadedMetadata={(e) => { if (!tvRef.current?.activeRef.current) { setDuration(e.currentTarget.duration || 0); setWaiting(false); } }}
              onTimeUpdate={handleTimeUpdate}
              onPlay={() => { if (tvRef.current?.activeRef.current) { videoRef.current?.pause(); return; } setPlaying(true); setWaiting(false); }}
              // Pausing always brings the controls back, whatever paused it.
              // The transport must never be hidden behind a still frame.
              onPause={() => { if (!tvRef.current?.activeRef.current) setPlaying(false); setChromeVisible(true); }}
              onWaiting={() => { if (!tvRef.current?.activeRef.current) setWaiting(true); }}
              onPlaying={() => { if (!tvRef.current?.activeRef.current) setWaiting(false); }}
              onEnded={handleEnded}
              onError={(e) => {
                if (tvRef.current?.activeRef.current) return;
                // A dropped connection and a codec this browser cannot open are
                // different problems with different fixes. Telling a woman on a
                // train to install Safari is not help.
                const code = e.currentTarget?.error?.code;
                setFailureKind(code === 2 ? "network" : "format"); // 2 = MEDIA_ERR_NETWORK
                setFailed(true);
                setWaiting(false);
              }}
            />

            {tv.connected && <div className="absolute inset-0 flex flex-col items-center justify-center bg-black px-6 text-center"><Tv className="h-12 w-12 text-white/80" aria-hidden="true" /><p role="status" className="mt-5 text-lg font-semibold">{tv.loading ? "Opening this exercise on your TV…" : `Playing on ${tv.name}`}</p><p className="mt-3 max-w-sm text-sm leading-relaxed text-white/60">Use the controls below. Keep this page open for guided practice and your next exercise.</p></div>}

            {!tv.connected && failed ? (
              <PlaybackProblem
                kind={failureKind}
                isLast={isLast}
                url={current?.url}
                onRetry={() => {
                  const el = videoRef.current;
                  if (!el) return;
                  setFailed(false);
                  setWaiting(true);
                  el.load();
                  el.play()?.catch?.(() => setPlaying(false));
                }}
                onSkip={() => (isLast ? finishSession() : goTo(index + 1))}
                onClose={close}
              />
            ) : (
              !tv.connected && waiting && (
                <div className="pointer-events-none absolute inset-0 grid place-items-center">
                  <Loader2
                    className={`h-9 w-9 text-white/80 ${reduceMotion ? "" : "animate-spin"}`}
                    aria-hidden="true"
                  />
                  <span className="sr-only">Loading this exercise</span>
                </div>
              )
            )}

            {/* Top bar. Deliberately never auto-hides: the transport below can
                fade out of the way, but the way back must always be on screen. */}
            <div
              className="absolute inset-x-0 top-0 flex items-start gap-3 bg-gradient-to-b from-black/80 to-transparent p-4 pt-[max(1rem,env(safe-area-inset-top))]"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={close}
                aria-label="Close the player and go back"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/15 backdrop-blur active:bg-white/25"
              >
                <ArrowLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <div className="min-w-0 flex-1 pt-1">
                <p className="truncate text-[15px] font-semibold leading-tight">{current?.title}</p>
                <p className="truncate text-xs text-white/70">
                  {subtitle ? `${subtitle} · ` : ""}Exercise {index + 1} of {videos.length}
                </p>
              </div>
              <button type="button" onClick={() => tv.setOpen(true)} aria-label={tv.connected || tv.airPlaying ? "TV playback options, connected" : "Watch on TV"} className={`grid h-11 w-11 shrink-0 place-items-center rounded-full backdrop-blur active:bg-white/25 ${tv.connected || tv.airPlaying ? "bg-ios-pink text-white" : "bg-white/15"}`}><Tv className="h-5 w-5" aria-hidden="true" /></button>
              {onToggleSaved && current && (
                <button
                  type="button"
                  onClick={() => onToggleSaved(current.id)}
                  aria-pressed={savedSet.has(current.id)}
                  aria-label={savedSet.has(current.id) ? `Remove ${current.title} from saved` : `Save ${current.title}`}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/15 backdrop-blur active:bg-white/25"
                >
                  <Heart
                    className={`h-5 w-5 ${savedSet.has(current.id) ? "fill-ios-pink text-ios-pink" : ""}`}
                    aria-hidden="true"
                  />
                </button>
              )}
            </div>
          </div>

          {/* Controls */}
          <div
            className={`shrink-0 bg-gradient-to-t from-black via-black/95 to-black/70 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-opacity duration-200 ${
              chromeVisible ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            {/* Everything below is capped and centred. A scrubber the full
                width of a 27 inch monitor is not more precise, it is just a
                longer trip for the mouse, and the transport ends up nowhere
                near the video it controls. */}
            <div className="mx-auto w-full max-w-[1100px]">
            {prescription && (prescription.offersGuidedPractice ? <button type="button" onClick={() => { pauseActive(); setPractice({ index }); }} className="mx-4 mt-3 flex w-[calc(100%-2rem)] items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-left" aria-label={`Exercise plan, ${prescription.doseLine}. ${prescription.setup}`}><span className="flex-1"><span className="block text-[15px] font-semibold">{prescription.doseLine}</span><span className="mt-1 block text-xs text-white/70">{prescription.setup}</span></span><Play className="h-5 w-5 shrink-0" aria-hidden="true" /></button>
              : <div className="mx-4 mt-3 rounded-2xl border border-white/20 bg-white/10 px-4 py-3"><p className="text-[15px] font-semibold">{prescription.doseLine}</p><p className="mt-1 text-xs text-white/70">{prescription.setup}</p></div>)}
            {prescription && <button type="button" onClick={() => { pauseActive(); setCoachMode(true); }} className="mx-4 mt-2 min-h-[44px] rounded-full border border-white/20 px-5 text-sm font-semibold text-white">Coach Mode: what to feel</button>}
            {/* Scrubber */}
            <div className="px-4 pt-2">
              <input
                className="pv-range"
                style={{
                  "--pv-track": `linear-gradient(to right, #FF2D55 ${progressPercent}%, rgba(255,255,255,0.28) ${progressPercent}%)`,
                }}
                type="range"
                disabled={tv.connected && tv.loading}
                min={0}
                max={Math.max(duration, 0.1)}
                step={0.1}
                value={Math.min(time, duration || 0)}
                onChange={(e) => seekTo(Number(e.target.value))}
                aria-label="Seek through this exercise"
                aria-valuetext={`${clockLabel(time)} of ${clockLabel(duration)}`}
              />
              <div className="-mt-1 flex justify-between text-[11px] tabular-nums text-white/60">
                <span>{clockLabel(time)}</span>
                <span>{clockLabel(duration)}</span>
              </div>
            </div>

            {/* Transport */}
            <div className="flex items-center justify-center gap-2 px-4 py-1">
              <ControlButton label="Previous exercise" onClick={() => goTo(index - 1)} disabled={index === 0}>
                <ChevronLeft className="h-6 w-6" aria-hidden="true" />
              </ControlButton>
              <ControlButton label="Back 10 seconds" onClick={() => skip(-SKIP_SECONDS)} disabled={tv.connected && tv.loading}>
                <RotateCcw className="h-5 w-5" aria-hidden="true" />
                <span className="absolute text-[9px] font-bold">10</span>
              </ControlButton>
              <button
                type="button"
                onClick={togglePlay}
                disabled={tv.connected && tv.loading}
                aria-label={tv.connected && tv.loading ? "Connecting to your TV" : playing ? "Pause" : "Play"}
                className="grid h-16 w-16 place-items-center rounded-full bg-ios-pink text-white shadow-lg shadow-ios-pink/40 active:scale-95 disabled:opacity-50"
              >
                {playing ? <Pause className="h-7 w-7 fill-current" aria-hidden="true" />
                         : <Play className="h-7 w-7 translate-x-0.5 fill-current" aria-hidden="true" />}
              </button>
              <ControlButton label="Forward 10 seconds" onClick={() => skip(SKIP_SECONDS)} disabled={tv.connected && tv.loading}>
                <RotateCw className="h-5 w-5" aria-hidden="true" />
                <span className="absolute text-[9px] font-bold">10</span>
              </ControlButton>
              <ControlButton
                label={isLast ? "Finish the session" : "Next exercise"}
                onClick={() => (isLast ? finishSession() : goTo(index + 1))}
              >
                <ChevronRight className="h-6 w-6" aria-hidden="true" />
              </ControlButton>
            </div>

            {/* Toggles */}
            <div className="flex items-center gap-2 overflow-x-auto px-4 pb-2 pt-1 no-scrollbar">
              <ToggleChip
                on={mirrored}
                disabled={tv.connected || tv.airPlaying}
                onClick={() => setMirrored((v) => !v)}
                label={tv.connected || tv.airPlaying ? "Mirror is available on this screen only" : "Mirror the video"}
                hint="Mirror"
                icon={<FlipHorizontal2 className="h-4 w-4" aria-hidden="true" />}
              />
              <ToggleChip
                on={looping}
                onClick={() => setLooping((v) => !v)}
                label="Loop this exercise"
                hint="Loop"
                icon={<Repeat className="h-4 w-4" aria-hidden="true" />}
              />
              <ToggleChip
                on={muted}
                onClick={() => setMuted((v) => !v)}
                label={muted ? "Turn the sound on" : "Mute the sound"}
                hint={muted ? "Muted" : "Sound"}
                icon={muted ? <VolumeX className="h-4 w-4" aria-hidden="true" />
                            : <Volume2 className="h-4 w-4" aria-hidden="true" />}
              />
              <label className="ml-1 hidden min-w-[110px] items-center gap-2 sm:flex">
                <span className="sr-only">Volume</span>
                <input
                  className="pv-range pv-vol"
                  style={{
                    "--pv-track": `linear-gradient(to right, #fff ${volume * 100}%, rgba(255,255,255,0.28) ${volume * 100}%)`,
                  }}
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={muted ? 0 : volume}
                  onChange={(e) => { setVolume(Number(e.target.value)); setMuted(Number(e.target.value) === 0); }}
                  aria-label="Volume"
                />
              </label>
              <p className="ml-auto hidden shrink-0 whitespace-nowrap pl-3 text-[11px] text-white/45 lg:block">
                Space play · Arrows skip 10s · N next · P back · M mirror · L loop · Esc close
              </p>
            </div>

            {/* Filmstrip. Replaced by the rail from lg, never both. */}
            {videos.length > 1 && (
              <div className="border-t border-white/10 px-4 pb-1 pt-3 lg:hidden">
                <p className="pb-2 text-[11px] font-semibold uppercase tracking-wider text-white/50">
                  In this session
                </p>
                <ul className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {upcoming.map(({ video, i }) => {
                    const done = watchRef.current.get(i)?.logged;
                    const isCurrent = i === index;
                    return (
                      <li key={`${video.id}-${i}`}>
                        <button
                          type="button"
                          onClick={() => goTo(i)}
                          aria-current={isCurrent ? "true" : undefined}
                          aria-label={`Exercise ${i + 1}, ${video.title}${done ? ", done" : ""}`}
                          className={`flex h-[68px] w-[128px] flex-col justify-between gap-1 rounded-xl border px-2.5 py-2 text-left ${
                            isCurrent
                              ? "border-ios-pink bg-ios-pink/20"
                              : "border-white/15 bg-white/5 active:bg-white/15"
                          }`}
                        >
                          <span className="line-clamp-2 text-[11px] font-medium leading-[1.25] text-white/90">
                            {video.title}
                          </span>
                          <span className="flex shrink-0 items-center gap-1 text-[10px] text-white/55">
                            {done && <Check className="h-3 w-3 text-app-positive" aria-hidden="true" />}
                            {video.durationSeconds > 0 ? durationLabel(video.durationSeconds) : `#${i + 1}`}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            </div>
          </div>
          </div>

          {/* The session, as a list, from lg. Same targets as the filmstrip and
              the same aria, laid out down the side where there is room for the
              whole title instead of two clamped lines. */}
          {videos.length > 1 && (
            <aside
              aria-label="In this session"
              className="hidden shrink-0 border-l border-white/10 bg-black lg:flex lg:w-[320px] lg:flex-col xl:w-[360px]"
            >
              <p className="shrink-0 border-b border-white/10 px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-white/50">
                In this session · {watchedCount} of {videos.length} done
              </p>
              <ul className="min-h-0 flex-1 overflow-y-auto p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
                {upcoming.map(({ video, i }) => {
                  const done = watchRef.current.get(i)?.logged;
                  const isCurrent = i === index;
                  return (
                    <li key={`${video.id}-${i}`}>
                      <button
                        type="button"
                        onClick={() => goTo(i)}
                        aria-current={isCurrent ? "true" : undefined}
                        aria-label={`Exercise ${i + 1}, ${video.title}${done ? ", done" : ""}`}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ${
                          isCurrent ? "bg-ios-pink/20 ring-1 ring-inset ring-ios-pink" : "hover:bg-white/10"
                        }`}
                      >
                        <span
                          className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                            done ? "bg-app-positive text-white" : "bg-white/10 text-white/70"
                          }`}
                        >
                          {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" /> : i + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13.5px] font-medium text-white/90">
                            {video.title}
                          </span>
                          {video.durationSeconds > 0 && (
                            <span className="block text-[11px] tabular-nums text-white/45">
                              {durationLabel(video.durationSeconds)}
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </aside>
          )}
        </>
      )}
    </div>
  );
}

// --- Pieces ----------------------------------------------------------------

function ControlButton({ label, onClick, disabled, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="relative grid h-12 w-12 place-items-center rounded-full text-white/90 active:bg-white/15 disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function ToggleChip({ on, onClick, label, hint, icon, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      disabled={disabled}
      aria-label={label}
      className={`flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium disabled:opacity-40 ${
        on ? "bg-ios-pink text-white" : "bg-white/10 text-white/80 active:bg-white/20"
      }`}
    >
      {icon}
      <span>{hint}</span>
    </button>
  );
}

/**
 * 115 of the 533 clips are .mov. Safari plays them, Firefox does not, and Chrome
 * depends on the codec inside. A dropped connection looks identical from the
 * outside, so the two are told apart by the media error code and worded
 * separately: a codec problem needs a different browser, a network problem needs
 * another go.
 */
function PlaybackProblem({ kind, isLast, url, onRetry, onSkip, onClose }) {
  const network = kind === "network";
  return (
    <div className="absolute inset-0 grid place-items-center bg-black/85 px-6 text-center">
      <div className="max-w-sm">
        <p className="text-lg font-semibold">
          {network ? "This clip stopped loading." : "This clip will not play in this browser."}
        </p>
        <p className="mt-2 text-sm text-white/70">
          {network
            ? "Your connection dropped part way through. Try it again, or skip ahead and come back to it."
            : "This older video format may need Safari. Try it there, retry this clip, or continue with another exercise."}
        </p>
        {/* Retry is offered either way. Chrome reports a clip that simply failed
            to download as "not supported" too, and one more go costs nothing. */}
        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={network ? onRetry : onSkip}
            className="h-12 rounded-full bg-ios-pink font-semibold text-white"
          >
            {network
              ? "Try this clip again"
              : isLast
                ? "Finish the session"
                : "Skip to the next exercise"}
          </button>
          <button
            type="button"
            onClick={network ? onSkip : onRetry}
            className="h-12 rounded-full border border-white/25 font-semibold text-white"
          >
            {network
              ? isLast
                ? "Finish the session"
                : "Skip to the next exercise"
              : "Try this clip again"}
          </button>
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="h-12 leading-[3rem] text-sm font-medium text-white/70 underline underline-offset-4"
            >
              Open this clip in a new tab
            </a>
          )}
          <button type="button" onClick={onClose} className="text-sm font-medium text-white/60">
            Go back
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * The end of a playlist. Never a blank screen: she always knows what she just
 * did and always has a control that takes her back where she started.
 *
 * It also never claims more than was written. `dayCredited` is the record of
 * whether onDayComplete actually fired; without it this screen used to say
 * "Day 4 is done" and "Today still counts" after a session that banked nothing,
 * and the Today tab then contradicted it.
 */
function CompletionScreen({
  title, dayContext, dayCredited, videoCount, watchedCount, seconds, reduceMotion,
  saving, error, onRetrySave, onReplay, onClose,
}) {
  // A real number, not a flattering one. Under a minute reads as under a minute.
  const minutes = Math.round(seconds / 60);
  const isProgramDay = Boolean(dayContext?.day);
  const heading = saving ? "Saving your progress…" : error ? "Your progress needs saving." : isProgramDay
    ? dayCredited
      ? `Day ${dayContext.day} is done.`
      : `Day ${dayContext.day} is still open.`
    : videoCount > 0 && watchedCount / videoCount >= DAY_COMPLETION_THRESHOLD
      ? "Session complete."
      : "Session ended.";

  // 60 percent of the playlist, rounded up, is what banks the day.
  const needed = Math.ceil(videoCount * DAY_COMPLETION_THRESHOLD);
  const short = Math.max(0, needed - watchedCount);
  const celebrate = !saving && !error && (isProgramDay ? dayCredited : videoCount > 0 && watchedCount / videoCount >= DAY_COMPLETION_THRESHOLD);

  const body = (() => {
    if (saving) return "Saving your completed day…";
    if (error) return error;
    if (watchedCount >= videoCount && videoCount > 0) {
      return "You finished every exercise. That is what makes this stick.";
    }
    if (isProgramDay && !dayCredited) {
      return short === 1
        ? `You finished ${watchedCount} of ${videoCount}. One more exercise and this day counts.`
        : `You finished ${watchedCount} of ${videoCount}. ${short} more and this day counts.`;
    }
    if (isProgramDay) {
      return `You finished ${watchedCount} of ${videoCount}. Today counts, and the rest are here whenever you want them.`;
    }
    return `You finished ${watchedCount} of ${videoCount}. The rest are here whenever you want them.`;
  })();

  return (
    <div className="flex h-full flex-col items-center justify-center px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] text-center">
      <div
        className={`grid h-20 w-20 place-items-center rounded-full ${
          celebrate ? "bg-ios-pink" : "bg-white/15"
        } ${reduceMotion ? "" : "animate-pop-in"}`}
      >
        {celebrate ? (
          <Check className="h-10 w-10" strokeWidth={3} aria-hidden="true" />
        ) : (
          <RotateCcw className="h-9 w-9 text-white/80" strokeWidth={2.4} aria-hidden="true" />
        )}
      </div>

      <h2 className="mt-6 text-2xl font-bold">{heading}</h2>
      <p className="mt-2 max-w-xs text-sm text-white/70">{body}</p>

      <dl className="mt-7 flex gap-8">
        <div>
          <dt className="text-[11px] uppercase tracking-wider text-white/50">Minutes</dt>
          <dd className="text-2xl font-bold tabular-nums">{minutes}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wider text-white/50">Exercises</dt>
          <dd className="text-2xl font-bold tabular-nums">{watchedCount}</dd>
        </div>
      </dl>

      {celebrate && <SessionFeedback programDay={dayContext?.day} dark />}
      {saving && <p role="status" className="mt-4 text-sm text-white/70">Saving…</p>}
      {error && <button type="button" onClick={onRetrySave} disabled={saving} className="mt-5 min-h-[48px] rounded-full bg-ios-pink px-7 font-semibold">Try saving again</button>}
      {/* Two ways forward, always. When the day did not bank, the one that
          banks it is the one under her thumb. */}
      <div className="mt-9 flex w-full max-w-xs flex-col gap-3">
        {celebrate ? (
          <>
            <button
              type="button"
              onClick={onClose}
              autoFocus
              className="h-14 rounded-full bg-ios-pink text-[17px] font-bold text-white"
            >
              Done
            </button>
            <button
              type="button"
              onClick={onReplay}
              className="h-12 text-sm font-medium text-white/70"
            >
              Watch {title} again
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={onReplay}
              autoFocus
              className="h-14 rounded-full bg-ios-pink text-[17px] font-bold text-white"
            >
              {isProgramDay ? "Finish this day" : "Go back to the start"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-12 text-sm font-medium text-white/70"
            >
              Leave it for now
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);
  return reduced;
}

export { usePrefersReducedMotion };
