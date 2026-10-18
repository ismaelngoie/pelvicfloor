import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";

const root = new URL("../", import.meta.url);

test("native article covers exist and do not collide with legacy Cloudflare redirects", async () => {
  const { articles } = JSON.parse(await readFile(new URL("public/content/insights.json", root), "utf8"));
  const rules = (await readFile(new URL("public/_redirects", root), "utf8")).split("\n")
    .filter((line) => line.trim() && !line.trim().startsWith("#"))
    .map((line) => line.trim().split(/\s+/));
  for (const article of articles) {
    assert.ok(article.imageURL?.startsWith("/images/insights/"), article.id);
    assert.ok((await stat(new URL(`public${article.imageURL}`, root))).size > 0, article.id);
    for (const [pattern, destination, status] of rules) {
      if (!/^30[1278]$/.test(status || "")) continue;
      const prefix = pattern.split("*")[0];
      assert.ok(!(pattern.includes("*") ? article.imageURL.startsWith(prefix) : article.imageURL === pattern),
        `${article.id} would redirect to ${destination}`);
    }
  }
});
