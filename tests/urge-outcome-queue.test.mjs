import assert from "node:assert/strict";
import test from "node:test";
import { flushUrgeOutcomes, pendingUrgeOutcomes, queueUrgeOutcome } from "../lib/urgeOutcomeQueue.js";

const storage = new Map();
globalThis.window = { localStorage: { getItem: (key) => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) } };

test("pending network acknowledgements never prevent locally saving an answer", async () => {
  queueUrgeOutcome("offline-member", { id: "rescue-one", outcome: "better", mode: "knack" });
  let acknowledge;
  const remote = new Promise((resolve) => { acknowledge = resolve; });
  const flush = flushUrgeOutcomes("offline-member", () => remote);
  assert.equal(pendingUrgeOutcomes("offline-member").length, 1);
  const durable = JSON.parse(storage.get("pelvi.urgeOutcomeQueue.v1:offline-member"));
  assert.equal(durable[0].note, "Urge Rescue · felt better");
  assert.equal(durable[0].id, "rescue-one");
  // This point is reached without waiting for any network response.
  acknowledge(); await flush;
  assert.equal(pendingUrgeOutcomes("offline-member").length, 0);
});

test("failed writes remain queued and retry the same document identity", async () => {
  queueUrgeOutcome("retry-member", { id: "stable-diary-id", outcome: "same", mode: "freezeAndSqueeze" });
  const ids = [];
  await flushUrgeOutcomes("retry-member", async (_, entry) => { ids.push(entry.id); throw new Error("offline"); });
  assert.equal(pendingUrgeOutcomes("retry-member").length, 1);
  await flushUrgeOutcomes("retry-member", async (_, entry) => { ids.push(entry.id); });
  assert.deepEqual(ids, ["stable-diary-id", "stable-diary-id"]);
  assert.equal(pendingUrgeOutcomes("retry-member").length, 0);
});

test("queues and retry writers remain isolated to the member", async () => {
  queueUrgeOutcome("member-a", { id: "a", outcome: "worse" });
  queueUrgeOutcome("member-b", { id: "b", outcome: "better" });
  const written = [];
  await flushUrgeOutcomes("member-a", async (member, entry) => { written.push([member, entry.id]); });
  assert.deepEqual(written, [["member-a", "a"]]);
  assert.equal(pendingUrgeOutcomes("member-b").length, 1);
});

test("answers added while an earlier acknowledgement is pending are drained without dropping either", async () => {
  queueUrgeOutcome("parallel-member", { id: "first", outcome: "better" });
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const written = [];
  const write = async (_, entry) => { written.push(entry.id); if (entry.id === "first") await gate; };
  const flush = flushUrgeOutcomes("parallel-member", write);
  queueUrgeOutcome("parallel-member", { id: "second", outcome: "worse" });
  const duplicateFlush = flushUrgeOutcomes("parallel-member", write);
  assert.equal(flush, duplicateFlush);
  release(); await flush;
  assert.deepEqual(written, ["first", "second"]);
  assert.equal(pendingUrgeOutcomes("parallel-member").length, 0);
});

test("editing the current run's answer uses one entry instead of duplicate diary records", async () => {
  queueUrgeOutcome("edit-member", { id: "one-run", outcome: "same" });
  queueUrgeOutcome("edit-member", { id: "one-run", outcome: "better" });
  assert.equal(pendingUrgeOutcomes("edit-member").length, 1);
  assert.equal(pendingUrgeOutcomes("edit-member")[0].outcome, "better");
  await flushUrgeOutcomes("edit-member", async () => {});
});
