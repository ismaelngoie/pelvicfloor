// The actual native script builders are executed by scripts/sync-native-audio.py.
// This keeps recorded cue IDs, spoken words, reps and release timing identical.
import { SESSION_SCRIPT_DATA } from "../../lib/sessionScriptData.js";

export const PHASE_SCALE = {
  settle: 1, squeeze: 0.84, hold: 0.84, release: 1, rest: 1,
  breatheIn: 1.13, breatheOut: 0.88, closing: 1.02,
};
export function isEffortPhase(phase) { return phase === "squeeze" || phase === "hold"; }
export function durationLabel(seconds) {
  const total = Math.max(0, Math.round(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
export const URGE_MODES = SESSION_SCRIPT_DATA.urgeModes;
export const KEGEL_SETS = SESSION_SCRIPT_DATA.kegelSets;
