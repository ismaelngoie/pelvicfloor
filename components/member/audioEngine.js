"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { audioURL, cueClip } from "@/lib/audioCatalog";
import { isEffortPhase } from "./sessionScripts";

// Recorded audio and the visible script share one clock. Pauses and seeks move
// both; cue-based sessions pause when a backgrounded browser cannot run them.
export function useSessionEngine(script, { voiceOn = true, onFinish } = {}) {
  const [state, setState] = useState("idle");
  const [elapsed, setElapsed] = useState(0);
  const [playbackMessage, setPlaybackMessage] = useState(null);
  const clock = useRef({ offset: 0, startedAt: 0 });
  const stateRef = useRef("idle");
  const spoken = useRef(new Set());
  const track = useRef(null);
  const cueAudio = useRef(null);
  const cueQueue = useRef([]);
  const cueBusy = useRef(false);
  const cueGeneration = useRef(0);
  const finishRef = useRef(onFinish);
  const voiceRef = useRef(voiceOn);
  finishRef.current = onFinish;
  voiceRef.current = voiceOn;

  const silence = useCallback(() => {
    cueGeneration.current += 1;
    cueQueue.current = [];
    cueBusy.current = false;
    if (cueAudio.current) { cueAudio.current.onended = null; cueAudio.current.onerror = null; cueAudio.current.pause(); cueAudio.current = null; }
    try { window.speechSynthesis?.cancel(); } catch { /* unavailable */ }
  }, []);

  const speak = useCallback((text, clipID) => {
    if (!voiceRef.current) return;
    cueQueue.current.push({ text, clipID: clipID || cueClip(text) });
    if (cueBusy.current) return;
    const drain = () => {
      const next = cueQueue.current.shift();
      if (!next || !voiceRef.current || stateRef.current !== "running") { cueBusy.current = false; return; }
      cueBusy.current = true;
      const generation = cueGeneration.current;
      const done = () => { if (generation === cueGeneration.current) drain(); };
      const synthesise = () => {
        if (generation !== cueGeneration.current) return;
        if (!window.speechSynthesis) { done(); return; }
        const utterance = new SpeechSynthesisUtterance(next.text);
        utterance.lang = "en-US"; utterance.rate = 0.92; utterance.pitch = 1.02;
        utterance.onend = done; utterance.onerror = done;
        window.speechSynthesis.speak(utterance);
      };
      if (next.clipID) {
        const audio = new Audio(audioURL(next.clipID));
        cueAudio.current = audio;
        audio.onended = done; audio.onerror = synthesise;
        audio.play().catch(synthesise);
      } else synthesise();
    };
    drain();
  }, []);

  const stop = useCallback(() => {
    stateRef.current = "idle"; setState("idle");
    track.current?.pause(); silence();
  }, [silence]);

  const start = useCallback(() => {
    if (!script) return;
    track.current?.pause(); silence();
    spoken.current = new Set(); clock.current = { offset: 0, startedAt: Date.now() };
    setElapsed(0); stateRef.current = "running"; setState("running"); setPlaybackMessage(null);
    track.current = null;
    if (script.continuousTrackID) {
      const audio = new Audio(script.audioSource || audioURL(script.continuousTrackID));
      track.current = audio; audio.muted = !voiceRef.current;
      audio.onerror = () => {
        if (track.current !== audio) return;
        clock.current = { offset: audio.currentTime || 0, startedAt: Date.now() };
        audio.pause(); track.current = null;
        setPlaybackMessage("The recording could not load. Spoken cues will use your device voice.");
      };
      audio.play().catch(() => {
        if (track.current !== audio) return;
        audio.pause(); track.current = null;
        setPlaybackMessage("The recording could not start. Tap Pause, then Resume to try again.");
        stateRef.current = "paused"; setState("paused"); clock.current.offset = 0;
      });
    }
  }, [script, silence]);

  const pause = useCallback(() => {
    if (stateRef.current !== "running") return;
    clock.current.offset = Math.min(script.totalDuration, track.current ? track.current.currentTime : (Date.now() - clock.current.startedAt) / 1000 + clock.current.offset);
    stateRef.current = "paused"; setState("paused");
    track.current?.pause(); silence();
  }, [script, silence]);

  const resume = useCallback(() => {
    if (stateRef.current !== "paused") return;
    clock.current.startedAt = Date.now(); stateRef.current = "running"; setState("running");
    if (script.continuousTrackID && !track.current) {
      track.current = new Audio(script.audioSource || audioURL(script.continuousTrackID));
      track.current.currentTime = clock.current.offset;
    }
    if (track.current) {
      track.current.muted = !voiceRef.current;
      track.current.play().then(() => setPlaybackMessage(null)).catch(() => {
        stateRef.current = "paused"; setState("paused");
        setPlaybackMessage("Your browser could not play the recording. Check your connection and tap Resume.");
      });
    }
  }, [script]);

  const seek = useCallback((seconds) => {
    const now = track.current ? track.current.currentTime : stateRef.current === "running" ? (Date.now() - clock.current.startedAt) / 1000 + clock.current.offset : clock.current.offset;
    const next = Math.max(0, Math.min(script.totalDuration - 0.1, now + seconds));
    clock.current = { offset: next, startedAt: Date.now() }; setElapsed(next); silence();
    spoken.current = new Set();
    if (track.current) track.current.currentTime = next;
  }, [script, silence]);

  useEffect(() => {
    if (track.current) track.current.muted = !voiceOn;
    if (!voiceOn) silence();
  }, [voiceOn, silence]);

  useEffect(() => {
    if (state !== "running" || !script) return;
    const tick = () => {
      // A stalled recording must not silently finish its session while loading.
      const next = Math.min(script.totalDuration, track.current ? track.current.currentTime : clock.current.offset + (Date.now() - clock.current.startedAt) / 1000);
      setElapsed(next);
      if (next >= script.totalDuration && stateRef.current === "running") {
        stateRef.current = "finished"; setState("finished"); track.current?.pause(); silence(); finishRef.current?.();
      }
    };
    tick(); const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [state, script, silence]);

  const position = useMemo(() => {
    if (!script?.steps.length) return null;
    let index = 0;
    for (let i = 0; i < script.stepOffsets.length; i += 1) if (elapsed >= script.stepOffsets[i]) index = i;
    const step = script.steps[index]; const into = Math.max(0, elapsed - script.stepOffsets[index]);
    return { index, step, into, phaseProgress: Math.min(1, into / step.duration), secondsRemainingInStep: Math.max(0, Math.ceil(step.duration - into)), secondsRemainingInSession: Math.max(0, Math.ceil(script.totalDuration - elapsed)) };
  }, [script, elapsed]);

  useEffect(() => {
    if (state !== "running" || !position) return;
    const { index, step, into } = position;
    if (!spoken.current.has(`beat-${index}`)) {
      spoken.current.add(`beat-${index}`);
      try { navigator.vibrate?.(isEffortPhase(step.phase) ? [18, 40, 18] : 30); } catch { /* device dependent */ }
    }
    if (track.current) return;
    for (const [ci, cue] of step.cues.entries()) {
      const key = `${index}-${ci}`;
      if (into >= cue.at && !spoken.current.has(key)) {
        spoken.current.add(key);
        if (into - cue.at < 1.5) speak(cue.text, cue.clipID);
      }
    }
    const second = Math.floor(into);
    const key = `${index}-count-${second}`;
    if (step.countsAloud && second >= 1 && second < step.duration && !spoken.current.has(key)) {
      spoken.current.add(key); speak(`${second + 1}.`);
    }
  }, [state, position, speak]);

  useEffect(() => {
    const onVisibility = () => { if (document.hidden && !track.current) pause(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [pause]);

  useEffect(() => {
    if (state !== "running" || !navigator.wakeLock) return;
    let sentinel; let disposed = false;
    navigator.wakeLock.request("screen").then((value) => { if (disposed) value.release(); else sentinel = value; }).catch(() => {});
    return () => { disposed = true; sentinel?.release().catch(() => {}); };
  }, [state]);

  useEffect(() => {
    if (!navigator.mediaSession || !script?.continuousTrackID) return;
    if (typeof MediaMetadata !== "undefined") navigator.mediaSession.metadata = new MediaMetadata({ title: script.title, artist: "Coach Mia · Pelvi" });
    const handlers = { play: resume, pause, seekbackward: () => seek(-10), seekforward: () => seek(10), stop };
    for (const [name, handler] of Object.entries(handlers)) { try { navigator.mediaSession.setActionHandler(name, handler); } catch { /* unsupported action */ } }
    return () => { for (const name of Object.keys(handlers)) { try { navigator.mediaSession.setActionHandler(name, null); } catch { /* unsupported */ } } };
  }, [script, resume, pause, seek, stop]);

  useEffect(() => {
    if (navigator.mediaSession && script?.continuousTrackID) {
      try { navigator.mediaSession.playbackState = state === "running" ? "playing" : state === "paused" ? "paused" : "none"; } catch { /* unsupported browser */ }
    }
  }, [state, script]);

  useEffect(() => () => { track.current?.pause(); silence(); }, [silence]);
  return { state, running: state === "running", paused: state === "paused", finished: state === "finished", elapsed, position, start, stop, pause, resume, seek, playbackMessage };
}
