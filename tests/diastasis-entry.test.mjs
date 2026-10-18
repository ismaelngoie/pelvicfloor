import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../lib/diastasisEntry.js", import.meta.url), "utf8");
const entryAPI = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
const { DIASTASIS_ENTRY_KEY, DIASTASIS_ENTRY_TTL_MS, rememberDiastasisEntry, readDiastasisEntry,
  clearDiastasisEntry, diastasisProfilePatch, initializeDiastasisEntry, createDiastasisEntry,
  entryForVerifiedDiastasisPayer, completeDiastasisSetup, allowedDiastasisAttribution,
  diastasisSuccessPath, canonicalDiastasisReceiptPath } = entryAPI;
const now = 1800000000000;
const user = { uid: "payer-uid", email: "payer@example.com" };
function storage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) || null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
}
function fresh() { return rememberDiastasisEntry({ email: " Payer@Example.com " }, { storage: storage(), now }); }
function deferred() { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; }

test("purchase context is fresh, session-scoped, and contains only bounded plan intent", () => {
  const store = storage();
  const entry = rememberDiastasisEntry({ email: " Payer@Example.com ", clientSecret: "never-store-a-secret", goalId: "other" }, { storage: store, now });
  assert.equal(entry.email, user.email);
  assert.equal(entry.goalId, "diastasisRecti"); assert.equal(entry.pathway, "womensPelvicHealth");
  assert.doesNotMatch(store.getItem(DIASTASIS_ENTRY_KEY), /never-store-a-secret/);
  assert.equal(readDiastasisEntry({ storage: store, now: now + 100 }).id, entry.id);
  assert.equal(readDiastasisEntry({ storage: store, now: now + DIASTASIS_ENTRY_TTL_MS }), null);
  assert.equal(store.getItem(DIASTASIS_ENTRY_KEY), null);
});

test("invalid or blocked browser storage cannot create a misleading entry", () => {
  assert.equal(rememberDiastasisEntry({ email: "wrong" }, { storage: storage(), now }), null);
  assert.equal(rememberDiastasisEntry({ email: user.email }, { storage: null, now }), null);
  const blocked = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };
  assert.equal(rememberDiastasisEntry({ email: user.email }, { storage: blocked, now }), null);
  assert.equal(readDiastasisEntry({ storage: blocked, now }), null);
});

test("a completed old run cannot clear a newer purchase intent", () => {
  const store = storage();
  const first = rememberDiastasisEntry({ email: user.email }, { storage: store, now });
  const second = rememberDiastasisEntry({ email: user.email }, { storage: store, now: now + 1 });
  clearDiastasisEntry(first.id, { storage: store });
  assert.equal(readDiastasisEntry({ storage: store, now: now + 2 }).id, second.id);
  clearDiastasisEntry(second.id, { storage: store });
  assert.equal(store.getItem(DIASTASIS_ENTRY_KEY), null);
});

test("only missing fields of an unconfigured matching web member are initialized", () => {
  const entry = fresh();
  assert.deepEqual(diastasisProfilePatch({ email: user.email, platform: "web", programDay: 1 }, entry), {
    goal: "diastasisRecti", goalTitle: "Fix Diastasis Recti", pathway: "womensPelvicHealth",
  });
  assert.deepEqual(diastasisProfilePatch({ email: user.email, goal: "diastasisRecti" }, entry), { pathway: "womensPelvicHealth" });
  assert.deepEqual(diastasisProfilePatch({ email: user.email, pathway: "womensPelvicHealth" }, entry), { goal: "diastasisRecti", goalTitle: "Fix Diastasis Recti" });
  assert.equal(diastasisProfilePatch({ email: "someone-else@example.com" }, entry), null);
});

test("configured, native, and established plans are never overwritten", () => {
  const entry = fresh();
  for (const protectedProfile of [{ goal: "pelvicPain" }, { pathway: "mensPelvicHealth" }, { platform: "ios" },
    { isLinkedToApp: true }, { programDay: 2 }, { programStartedAt: "2026-01-01" }, { streak: 1 }, { bestStreak: 7 },
    { goal: "diastasisRecti", pathway: "womensPelvicHealth" }]) {
    assert.deepEqual(diastasisProfilePatch({ email: user.email, ...protectedProfile }, entry), {}, JSON.stringify(protectedProfile));
  }
});

test("an entry or paid query alone can never initialize a profile", async () => {
  let verifies = 0, writes = 0;
  const dependencies = { verify: async () => { verifies += 1; return { active: true }; }, commit: async () => { writes += 1; } };
  assert.equal((await initializeDiastasisEntry({ entry: fresh(), now, ...dependencies })).state, "waiting");
  assert.equal((await initializeDiastasisEntry({ entry: fresh(), user: { ...user, email: "other@example.com" }, now, ...dependencies })).state, "mismatch");
  assert.equal((await initializeDiastasisEntry({ entry: { ...fresh(), createdAt: now - DIASTASIS_ENTRY_TTL_MS }, user, now, ...dependencies })).state, "none");
  assert.equal(verifies, 0); assert.equal(writes, 0);
});

test("server-confirmed active entitlement is required before resolving or writing any member", async () => {
  let resolves = 0, writes = 0;
  const options = { entry: fresh(), user, now, resolve: async () => { resolves += 1; }, commit: async () => { writes += 1; } };
  assert.equal((await initializeDiastasisEntry({ ...options, verify: async () => ({ active: false }) })).state, "payment_pending");
  assert.equal((await initializeDiastasisEntry({ ...options, verify: async () => { throw new Error("offline"); } })).state, "error");
  assert.equal(resolves, 0); assert.equal(writes, 0);
});

test("successful setup passes the authenticated payer and guard to a single atomic commit", async () => {
  const member = { id: "member-doc", email: user.email };
  let writes = 0;
  const result = await initializeDiastasisEntry({ entry: fresh(), user, now,
    verify: async (verifiedUser) => { assert.equal(verifiedUser.uid, user.uid); return { active: true }; },
    resolve: async () => member,
    commit: async (context) => { writes += 1; assert.equal(context.member, member); assert.equal(context.user, user); assert.equal(context.isCurrent(), true); return { changed: true }; },
  });
  assert.deepEqual(result, { state: "ready", changed: true }); assert.equal(writes, 1);
});

test("account changes during entitlement verification prevent every profile write", async () => {
  const gate = deferred(); let current = true, resolves = 0;
  const pending = initializeDiastasisEntry({ entry: fresh(), user, now, isCurrent: () => current,
    verify: () => gate.promise, resolve: async () => { resolves += 1; }, commit: async () => { throw new Error("must not run"); },
  });
  current = false; gate.resolve({ active: true });
  assert.equal((await pending).state, "stale"); assert.equal(resolves, 0);
});

test("the transactional re-read preserves a plan configured while entitlement was loading", async () => {
  let currentProfile = { email: user.email }, actualWrites = 0;
  const result = await initializeDiastasisEntry({ entry: fresh(), user, now, verify: async () => ({ active: true }),
    resolve: async () => ({ id: "member-doc", email: user.email }),
    commit: async ({ entry }) => {
      currentProfile = { ...currentProfile, goal: "pelvicPain", pathway: "womensPelvicHealth" };
      const patch = diastasisProfilePatch(currentProfile, entry);
      if (Object.keys(patch).length) { actualWrites += 1; Object.assign(currentProfile, patch); }
      return { changed: false };
    },
  });
  assert.deepEqual(result, { state: "ready", changed: false }); assert.equal(actualWrites, 0);
  assert.equal(currentProfile.goal, "pelvicPain");
});

test("failed profile initialization remains retryable without inventing success", async () => {
  const options = { entry: fresh(), user, now, verify: async () => ({ active: true }), resolve: async () => ({ id: "m", email: user.email }) };
  assert.equal((await initializeDiastasisEntry({ ...options, commit: async () => { throw new Error("network"); } })).state, "error");
  assert.equal((await initializeDiastasisEntry({ ...options, commit: async () => ({ changed: true }) })).state, "ready");
});

test("provider completion waits for committed setup before handing off to the receipt", async () => {
  const commit = deferred(); let started = false, handoffs = 0;
  const pending = completeDiastasisSetup({ entry: fresh(), user, now,
    verify: async () => ({ active: true }), resolve: async () => ({ id: "payer", email: user.email }),
    commit: async () => { started = true; return commit.promise; }, onReady: () => { handoffs += 1; },
  });
  await new Promise((done) => setImmediate(done));
  assert.equal(started, true); assert.equal(handoffs, 0, "sign-in alone cannot navigate past setup");
  commit.resolve({ changed: true });
  assert.equal((await pending).state, "ready"); assert.equal(handoffs, 1);
});

test("a stale provider account cannot complete the canonical receipt handoff", async () => {
  let current = true, handoffs = 0;
  const gate = deferred();
  const pending = completeDiastasisSetup({ entry: fresh(), user, now, isCurrent: () => current,
    verify: async () => ({ active: true }), resolve: async () => ({ id: "payer", email: user.email }),
    commit: () => gate.promise, onReady: () => { handoffs += 1; },
  });
  await new Promise((done) => setImmediate(done));
  current = false; gate.resolve({ changed: true });
  assert.equal((await pending).state, "stale"); assert.equal(handoffs, 0);
});

test("server-verified edited checkout email replaces only the intended payer binding", async () => {
  const store = storage(), original = fresh();
  const corrected = entryForVerifiedDiastasisPayer(original, "Actual-Payer@Example.com", { storage: store, now });
  assert.equal(corrected.id, original.id); assert.equal(corrected.goalId, original.goalId);
  assert.equal(corrected.email, "actual-payer@example.com");
  assert.equal(readDiastasisEntry({ storage: store, now }).email, corrected.email);
  let writes = 0;
  const result = await completeDiastasisSetup({ entry: corrected, user: { uid: "actual", email: corrected.email }, now,
    verify: async () => ({ active: true }), resolve: async () => ({ id: "actual-member", email: corrected.email }),
    commit: async () => { writes += 1; return { changed: true }; },
  });
  assert.equal(result.state, "ready"); assert.equal(writes, 1);
  assert.equal((await initializeDiastasisEntry({ entry: corrected, user, now })).state, "mismatch");
});

test("blocked or expired storage still permits verified payer setup in memory", async () => {
  const blocked = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };
  const expired = { ...fresh(), createdAt: now - DIASTASIS_ENTRY_TTL_MS };
  const entry = entryForVerifiedDiastasisPayer(expired, user.email, { storage: blocked, now });
  assert.ok(entry); assert.notEqual(entry.id, expired.id); assert.equal(entry.createdAt, now);
  assert.equal(readDiastasisEntry({ storage: blocked, now }), null);
  let writes = 0, handoffs = 0;
  const result = await completeDiastasisSetup({ entry, user, now, isCurrent: () => true,
    verify: async () => ({ active: true }), resolve: async () => ({ id: "payer", email: user.email }),
    commit: async () => { writes += 1; return { changed: true }; }, onReady: () => { handoffs += 1; },
  });
  assert.equal(result.state, "ready"); assert.equal(writes, 1); assert.equal(handoffs, 1);
});

test("without a secret or entry, the route preference still requires authenticated server access", async () => {
  const entry = createDiastasisEntry({ email: user.email }, { now });
  let writes = 0, handoffs = 0;
  const options = { entry, user, now, resolve: async () => ({ id: "payer", email: user.email }),
    commit: async () => { writes += 1; return { changed: true }; }, onReady: () => { handoffs += 1; } };
  assert.equal((await completeDiastasisSetup({ ...options, verify: async () => ({ active: false }) })).state, "payment_pending");
  assert.equal(writes, 0); assert.equal(handoffs, 0);
  assert.equal((await completeDiastasisSetup({ ...options, verify: async () => ({ active: true }) })).state, "ready");
  assert.equal(writes, 1); assert.equal(handoffs, 1);
});

test("campaign handoffs preserve only named attribution keys and never arbitrary secrets or redirects", () => {
  const incoming = "?gclid=ad-click&gbraid=braid&wbraid=w&ut" + "m_source=google&utm_campaign=core&utm_term=tummy+gap&email=private@example.com&token=secret&payment_intent_client_secret=pi_bad_secret_bad&redirect=https://evil.example";
  const success = new URL(diastasisSuccessPath(incoming), "https://pelvi.health");
  assert.equal(success.pathname, "/diastasis-recti/start"); assert.equal(success.searchParams.get("paid"), "1");
  assert.equal(success.searchParams.get("gclid"), "ad-click"); assert.equal(success.searchParams.get("utm_term"), "tummy gap");
  for (const key of ["email", "token", "payment_intent_client_secret", "redirect"]) assert.equal(success.searchParams.has(key), false, key);
  const receipt = new URL(canonicalDiastasisReceiptPath(incoming), "https://pelvi.health");
  assert.equal(receipt.pathname, "/welcome"); assert.equal(receipt.searchParams.get("utm_campaign"), "core");
  for (const key of ["email", "token", "payment_intent_client_secret", "redirect"]) assert.equal(receipt.searchParams.has(key), false, key);
});

test("attribution values are bounded, scrub control characters, and cannot change the destination", () => {
  const filtered = allowedDiastasisAttribution(`?utm_source=hello%00%0Aworld&gclid=${"a".repeat(900)}&utm_source=ignored&next=/app`);
  assert.equal(filtered.get("utm_source"), "helloworld"); assert.equal(filtered.get("gclid").length, 512);
  assert.equal(filtered.has("next"), false);
  const target = new URL(canonicalDiastasisReceiptPath("?utm_campaign=https%3A%2F%2Fevil.example", { paid: false }), "https://pelvi.health");
  assert.equal(target.pathname, "/welcome"); assert.equal(target.origin, "https://pelvi.health");
  assert.equal(target.searchParams.has("paid"), false);
});

test("blocked-store receipt fallback carries only an explicitly supplied valid Stripe proof", () => {
  const secret = "pi_verified123_secret_proof456";
  const target = new URL(canonicalDiastasisReceiptPath("?gclid=click&client_secret=ignored", { clientSecret: secret }), "https://pelvi.health");
  assert.equal(target.searchParams.get("payment_intent_client_secret"), secret);
  assert.equal(target.searchParams.get("gclid"), "click"); assert.equal(target.searchParams.has("client_secret"), false);
  assert.equal(canonicalDiastasisReceiptPath("", { paid: false }), "/welcome");
  assert.equal(new URL(canonicalDiastasisReceiptPath("", { clientSecret: "https://evil.example" }), "https://pelvi.health").searchParams.has("payment_intent_client_secret"), false);
});
