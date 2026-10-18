import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const root = new URL("../", import.meta.url);
const baseline = JSON.parse(await readFile(new URL("./fixtures/protected-surfaces-sha256.json", import.meta.url), "utf8"));

test("welcome, public home, paywall, checkout and shared payment dependencies remain unchanged", async () => {
  for (const [file, expected] of Object.entries(baseline.files)) {
    const digest = createHash("sha256").update(await readFile(new URL(file, root))).digest("hex");
    assert.equal(digest, expected, `Protected surface changed: ${file}`);
  }
  const profile = await readFile(new URL("components/member/You.js", root), "utf8");
  const billing = profile.match(/function BillingCard\([\s\S]*?(?=\nfunction StatPill\()/)?.[0];
  assert.ok(billing, "Existing subscription controls are present");
  assert.equal(createHash("sha256").update(billing).digest("hex"), baseline.memberBillingCardSha256);
});
