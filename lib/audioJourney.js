// Private audio history mirrors AudioJourneyStore. Browser storage is scoped to
// the signed-in member; it does not claim iCloud or cross-device synchronization.
export const AUDIO_JOURNEY_EVENT = "pelvi-audio-journey-change";
const keyFor = (memberId) => `pelvi.audioJourney.v1:${memberId || "guest"}`;
const memory = new Map();
const empty = () => ({ version: 1, records: [], favorites: {} });
const dateValue = (value) => new Date(value || 0).getTime() || 0;

export function audioPreference(memberId, name, fallback) {
  try {
    const value = window.localStorage.getItem(`pelvi.audioPreference:${memberId || "guest"}:${name}`);
    return value == null ? fallback : JSON.parse(value);
  } catch { return fallback; }
}

export function setAudioPreference(memberId, name, value) {
  try { window.localStorage.setItem(`pelvi.audioPreference:${memberId || "guest"}:${name}`, JSON.stringify(value)); } catch { /* unavailable */ }
}

export function readAudioJourney(memberId) {
  try {
    const raw = typeof window === "undefined" ? null : window.localStorage.getItem(keyFor(memberId));
    if (raw) {
      const data = JSON.parse(raw);
      if (Array.isArray(data.records) && data.favorites && typeof data.favorites === "object") {
        const cached = memory.get(keyFor(memberId));
        return cached && dateValue(cached.modifiedAt) > dateValue(data.modifiedAt) ? cached : data;
      }
    }
  } catch { /* Blocked storage still permits a session in this tab. */ }
  return memory.get(keyFor(memberId)) || empty();
}

function write(memberId, data) {
  const next = { ...data, records: [...data.records].sort((a, b) => dateValue(b.startedAt) - dateValue(a.startedAt)).slice(0, 250), modifiedAt: new Date().toISOString() };
  memory.set(keyFor(memberId), next);
  try { window.localStorage.setItem(keyFor(memberId), JSON.stringify(next)); } catch { /* Private browser memory fallback. */ }
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(AUDIO_JOURNEY_EVENT, { detail: { memberId } }));
  return next;
}

export function beginAudioListen(memberId, session, beforeComfort) {
  const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `audio_${Date.now()}_${Math.random()}`;
  const record = { id, sessionID: session.id, goal: session.goal, startedAt: new Date().toISOString(), completedAt: null, beforeComfort, outcome: null };
  const data = readAudioJourney(memberId);
  write(memberId, { ...data, records: [record, ...data.records] });
  return id;
}

export function completeAudioListen(memberId, recordId, outcome = null) {
  const data = readAudioJourney(memberId);
  return write(memberId, { ...data, records: data.records.map((record) => record.id === recordId ? {
    ...record, completedAt: record.completedAt || new Date().toISOString(), outcome: ["better", "same", "worse"].includes(outcome) ? outcome : record.outcome,
  } : record) });
}

export function toggleAudioFavorite(memberId, sessionId) {
  const data = readAudioJourney(memberId);
  return write(memberId, { ...data, favorites: { ...data.favorites, [sessionId]: { isFavorite: !isAudioFavorite(data, sessionId), updatedAt: new Date().toISOString() } } });
}

export const isAudioFavorite = (journey, id) => Boolean(journey.favorites[id]?.isFavorite);
export const completedAudioCount = (journey, id) => journey.records.filter((record) => record.sessionID === id && record.completedAt).length;

export function recommendAudio(sessions, journey, programDay = 1) {
  if (!sessions.length) return null;
  const allowed = new Set(sessions.map((session) => session.id));
  const unfinished = journey.records.find((record) => allowed.has(record.sessionID) && !record.completedAt);
  if (unfinished) return sessions.find((session) => session.id === unfinished.sessionID);
  const recent = journey.records.find((record) => allowed.has(record.sessionID) && record.completedAt && record.outcome);
  if (recent?.outcome === "better") return sessions.find((session) => session.id === recent.sessionID);
  if (recent?.outcome === "worse") {
    const alternative = sessions.find((session) => session.id !== recent.sessionID && !completedAudioCount(journey, session.id));
    if (alternative) return alternative;
  }
  const index = Math.max(programDay - 1, 0) % sessions.length;
  const ordered = [...sessions.slice(index), ...sessions.slice(0, index)];
  return ordered.find((session) => !completedAudioCount(journey, session.id))
    || sessions.find((session) => session.id === journey.records.find((record) => allowed.has(record.sessionID))?.sessionID)
    || ordered[0];
}

export function latestAudioOutcome(memberId, goalId, withinDays = 7) {
  const cutoff = Date.now() - Math.max(withinDays, 1) * 86400000;
  return readAudioJourney(memberId).records.find((record) => record.goal === goalId && record.completedAt && record.outcome && dateValue(record.startedAt) >= cutoff)?.outcome || null;
}

export function audioWhatHelped(journey, goalId, sessions) {
  const records = journey.records.filter((record) => record.goal === goalId && record.completedAt && record.outcome);
  if (records.length < 2) return null;
  const grouped = new Map();
  for (const record of records) {
    const value = grouped.get(record.sessionID) || { total: 0, better: 0 };
    value.total += 1; value.better += record.outcome === "better" ? 1 : 0;
    grouped.set(record.sessionID, value);
  }
  const ranked = [...grouped].filter(([, value]) => value.better > 0).sort(([, a], [, b]) => b.better / b.total - a.better / a.total || b.better - a.better);
  const [id, value] = ranked[0] || [];
  const session = sessions.find((item) => item.id === id);
  return session ? `${session.title} helped you feel better after ${value.better} of ${value.total} completed listens.` : null;
}
