// A rescue can always end immediately. Its optional diary answer is saved here
// before a network request and removed only after that exact entry is accepted.
const memory = new Map();
const memoryFallback = new Set();
const inFlight = new Map();
const keyFor = (memberId) => `pelvi.urgeOutcomeQueue.v1:${memberId}`;

export function pendingUrgeOutcomes(memberId) {
  if (!memberId) return [];
  const cached = memory.get(keyFor(memberId));
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(keyFor(memberId)) : null;
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed)) return memoryFallback.has(keyFor(memberId)) ? cached || parsed : parsed;
  } catch { /* A blocked store still keeps the answer in this tab. */ }
  return cached || [];
}

function persist(memberId, records) {
  memory.set(keyFor(memberId), records);
  try { window.localStorage.setItem(keyFor(memberId), JSON.stringify(records)); memoryFallback.delete(keyFor(memberId)); }
  catch { memoryFallback.add(keyFor(memberId)); /* Keep the memory copy until a retry succeeds. */ }
}

export function queueUrgeOutcome(memberId, { id, outcome, mode, timestamp = new Date().toISOString() }) {
  if (!memberId || !id || !["better", "same", "worse"].includes(outcome)) return null;
  const record = { id, kind: "urge", outcome, mode, timestamp, note: `Urge Rescue · felt ${outcome === "same" ? "the same" : outcome}` };
  const records = pendingUrgeOutcomes(memberId);
  persist(memberId, [record, ...records.filter((entry) => entry.id !== id)]);
  return record;
}

/** write(memberId,record) must use record.id as the server document identity. */
export function flushUrgeOutcomes(memberId, write) {
  if (!memberId) return Promise.resolve();
  if (inFlight.has(memberId)) return inFlight.get(memberId);
  const request = (async () => {
    while (pendingUrgeOutcomes(memberId).length) {
      const record = pendingUrgeOutcomes(memberId).at(-1);
      try { await write(memberId, record); }
      catch { return; } // Keep the durable record; a later online/mount retries it.
      const current = pendingUrgeOutcomes(memberId);
      // Do not remove a newer answer that reused this run's identity mid-write.
      persist(memberId, current.filter((entry) => entry.id !== record.id || entry.outcome !== record.outcome || entry.timestamp !== record.timestamp));
    }
  })().finally(() => inFlight.delete(memberId));
  inFlight.set(memberId, request);
  return request;
}
