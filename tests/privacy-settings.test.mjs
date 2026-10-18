import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// Evaluate the actual pure permission reducer without importing the JSX UI or
// browser-only Next hooks into Node's test runner.
const source = await readFile(new URL("../components/MarketingChoices.jsx", import.meta.url), "utf8");
const start = source.indexOf("export function privacyOptOutChoice(");
const end = source.indexOf("export function PrivacyChoicesButton(", start);
assert.ok(start >= 0 && end > start);
const { privacyOptOutChoice } = await import(`data:text/javascript;base64,${Buffer.from(source.slice(start, end)).toString("base64")}`);

test("every privacy-settings action can only narrow currently effective permissions", () => {
  for (const analytics of [false, true]) for (const advertising of [false, true]) for (const matching of [false, true]) {
    const current = Object.freeze({ analytics, advertising, matching });
    for (const target of ["analytics", "advertising", "matching", "all", undefined]) {
      const next = privacyOptOutChoice(current, target);
      for (const key of ["analytics", "advertising", "matching"]) assert.ok(next[key] !== true || current[key] === true, `${target} must not grant ${key}`);
      assert.ok(!next.matching || next.advertising, "matching always requires advertising");
      if (target === "analytics") assert.equal(next.analytics, false);
      if (target === "advertising") assert.deepEqual([next.advertising, next.matching], [false, false]);
      if (target === "matching") assert.equal(next.matching, false);
      if (target === "all" || target === undefined) assert.deepEqual(Object.values(next), [false, false, false]);
    }
  }
});

test("undecided, malformed and truthy values never create a permission or consent identifier", () => {
  for (const current of [null, undefined, {}, { analytics: "true", advertising: 1, matching: "yes", consentId: "private", email: "person@example.com" }]) {
    for (const target of ["analytics", "advertising", "matching", "all"]) assert.deepEqual(privacyOptOutChoice(current, target), { analytics: false, advertising: false, matching: false });
  }
});

test("a targeted opt-out preserves only the other currently active permissions", () => {
  const current = { analytics: true, advertising: true, matching: true };
  assert.deepEqual(privacyOptOutChoice(current, "analytics"), { analytics: false, advertising: true, matching: true });
  assert.deepEqual(privacyOptOutChoice(current, "advertising"), { analytics: true, advertising: false, matching: false });
  assert.deepEqual(privacyOptOutChoice(current, "matching"), { analytics: true, advertising: true, matching: false });
  assert.deepEqual(current, { analytics: true, advertising: true, matching: true });
});
