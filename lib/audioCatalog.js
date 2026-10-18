import { AUDIO_CATALOG_DATA } from "./audioCatalogData.js";

export const AUDIO_SESSIONS = AUDIO_CATALOG_DATA.sessions;
export const AUDIO_ASSETS = new Set(AUDIO_CATALOG_DATA.assets);
export const cueClip = (text) => AUDIO_CATALOG_DATA.cueClips[text] || null;
export const audioURL = (id) => `/audio/${encodeURIComponent(id)}.mp3`;
export const audioSessionById = (id) => AUDIO_SESSIONS.find((session) => session.id === id) || null;

export function audioJourneyDay(programDay, graduated, completions = [], now = new Date()) {
  if (!graduated) return Math.max(programDay || 1, 1);
  const dates = completions.filter((record) => Number(record.day) === 90).map((record) => {
    const value = record.completedAt;
    return value?.toDate ? value.toDate() : new Date(value);
  }).filter((date) => !Number.isNaN(date.getTime()));
  const graduation = dates.length ? new Date(Math.max(...dates.map((date) => date.getTime()))) : now;
  // Calendar components avoid shifting a day at daylight-saving boundaries.
  const calendarDay = (date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return 91 + Math.max(0, Math.round((calendarDay(now) - calendarDay(graduation)) / 86400000));
}

export function audioSessionsFor(goalId, pathway, focusId) {
  let sessions = AUDIO_SESSIONS.filter((session) => session.goal === goalId);
  if (goalId === "intimacy") {
    const mens = pathway === "mensPelvicHealth";
    sessions = sessions.filter((session) => session.id.startsWith("mens_") === mens);
  }
  const preferred = AUDIO_CATALOG_DATA.focusSessions[focusId];
  const index = sessions.findIndex((session) => session.id === preferred);
  if (index > 0) sessions = [sessions[index], ...sessions.slice(0, index), ...sessions.slice(index + 1)];
  return sessions;
}

export function dashboardAudioSession(goalId, pathway) {
  const ids = {
    intimacy: pathway === "mensPelvicHealth" ? "mens_control_before_intimacy" : "intimacy_relax_before",
    bladderLeaks: "bladder_urge_wave", postpartum: "postpartum_recovery_reset",
    diastasisRecti: "diastasis_doming_check", pregnancyPrep: "pregnancy_pressure_reset",
    pelvicPain: "pain_flare", coreStrength: "core_find_deep", fitness: "fitness_brace_lifting",
    prolapse: "prolapse_heaviness_reset", stability: "stability_core_find_deep",
    prostateRecovery: "prostate_recovery_control", bowelControl: "bowel_urge_control",
  };
  return audioSessionById(ids[goalId]) || audioSessionsFor(goalId, pathway)[0] || null;
}

export function audioScript(session) {
  let totalDuration = 0;
  const stepOffsets = [];
  const steps = session.beats.map((beat, index) => {
    stepOffsets.push(totalDuration);
    totalDuration += beat.duration;
    return { ...beat, id: index, cues: [{ text: beat.spoken, clipID: beat.id, at: 0 }] };
  });
  return { id: `premium-audio-${session.id}`, title: session.title, subtitle: session.subtitle,
    continuousTrackID: session.continuousTrackID, audioSource: session.audioSource, steps, stepOffsets, totalDuration, repTotal: 0 };
}
