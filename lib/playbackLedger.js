// Honest playback accounting shared by the browser player and its tests.
// Mirrors native completedIndices, resolvedPracticeIndices and immutable events.
export function createPlaybackLedger(videoCount) {
  return { videoCount, entries: new Map(), finalizing: false, finalized: false, dayCredited: false };
}

export function normalizePlaybackRequest(options = {}) {
  const videos = (options.videos || []).filter(Boolean);
  return {
    videos, startIndex: Math.min(Math.max(options.startIndex || 0, 0), Math.max(0, videos.length - 1)),
    title: options.title || "Your session", subtitle: options.subtitle || "", dayContext: options.dayContext || null,
    prescriptionDay: options.prescriptionDay ?? options.dayContext?.day ?? 1,
    playbackContext: options.playbackContext || (options.dayContext?.day ? "program" : "library"),
  };
}

export function allowsPlaybackShortcut({ practice, transition, finished, saving, tagName, isContentEditable } = {}) {
  return !practice && !transition && !finished && !saving && !isContentEditable
    && !["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A"].includes(tagName?.toUpperCase());
}

export function playbackEntry(ledger, index) {
  if (!ledger.entries.has(index)) ledger.entries.set(index, { seconds: 0, logged: false, recorded: false, partialLogged: false, practiceResolved: false });
  return ledger.entries.get(index);
}

export function addPlaybackDelta(ledger, index, delta, playing = true) {
  const entry = playbackEntry(ledger, index);
  if (playing && Number.isFinite(delta) && delta > 0 && delta < 2) entry.seconds += delta;
  return entry;
}

export function markExerciseComplete(ledger, index) {
  playbackEntry(ledger, index).logged = true;
}

export function resolveExercisePractice(ledger, index, elapsedSeconds = 0) {
  const entry = playbackEntry(ledger, index);
  entry.seconds += Math.max(0, Number(elapsedSeconds) || 0);
  entry.practiceResolved = true;
  entry.logged = true;
  return entry;
}

// A completed event is exposed only once and after the final practice duration
// is known. An early departure can expose an honest partial event instead.
export function takePlaybackEvent(ledger, index, { partial = false } = {}) {
  const entry = playbackEntry(ledger, index);
  if (entry.recorded || (!entry.logged && (!partial || entry.seconds <= 3))) return null;
  entry.recorded = true;
  entry.partialLogged = !entry.logged;
  return { secondsWatched: entry.seconds, completed: entry.logged };
}

export function retryPlaybackEvent(ledger, index) {
  playbackEntry(ledger, index).recorded = false;
}

export function playbackSummary(ledger, threshold = 0.6) {
  let seconds = 0;
  let completed = 0;
  for (const entry of ledger.entries.values()) { seconds += entry.seconds; if (entry.logged) completed += 1; }
  return { seconds, completed, qualifies: ledger.videoCount > 0 && completed / ledger.videoCount >= threshold };
}

// Only the explicit session-finish path calls this. Threshold crossings never
// bank a day. Rejected day writes remain retryable with the same earned work.
export async function finalizePlaybackSession(ledger, { day = null, onDayComplete, onSessionComplete, requireSessionRecord = false, threshold = 0.6 } = {}) {
  const summary = playbackSummary(ledger, threshold);
  if (!summary.qualifies) return { ...summary, credited: false, success: false };
  if (ledger.finalized) return { ...summary, credited: ledger.dayCredited, success: true };
  if (ledger.finalizing) return { ...summary, credited: ledger.dayCredited, success: false, pending: true };
  ledger.finalizing = true;
  try {
    if (day != null && !ledger.dayCredited) {
      const saved = await onDayComplete?.({ day, secondsWatched: summary.seconds });
      if (saved !== true) return { ...summary, credited: false, success: false, saveFailed: true };
      ledger.dayCredited = true;
    }
    let sessionSaved = false;
    try { sessionSaved = await onSessionComplete?.(summary); }
    catch { /* A banked program day remains authoritative. */ }
    // Continuation/replay have no new program day. Their session event is the
    // completion record, so a failed save must preserve an honest retry path.
    if (requireSessionRecord && !ledger.dayCredited && sessionSaved !== true) {
      return { ...summary, credited: false, success: false, saveFailed: true };
    }
    ledger.finalized = true;
    return { ...summary, credited: ledger.dayCredited, success: true };
  } catch {
    return { ...summary, credited: false, success: false, saveFailed: true };
  } finally {
    ledger.finalizing = false;
  }
}

export function practiceSegments(prescription = {}) {
  const work = Math.max(1, prescription.workSegmentSeconds || prescription.workSeconds || (prescription.repetitions || 6) * (prescription.secondsPerRep || 4));
  const sides = prescription.sides === "eachSide" ? ["First side", "Second side"] : [prescription.sides === "shownSide" ? "Shown side" : "Both sides"];
  const result = [];
  for (let round = 1; round <= Math.max(1, prescription.rounds || 1); round += 1) {
    sides.forEach((side, index) => {
      result.push({ stage: "working", seconds: work, round, side });
      if (index < sides.length - 1) result.push({ stage: "sideChange", seconds: 8, round, side: "Change sides" });
    });
    if (round < (prescription.rounds || 1) && prescription.restSeconds > 0) result.push({ stage: "resting", seconds: prescription.restSeconds, round, side: "Rest" });
  }
  return result;
}
