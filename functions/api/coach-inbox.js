import { requireOwner } from "../../functions-lib/ownerAuth.js";
import { groupCoachConversations, listCoachConversations, writeCoachReply } from "../../functions-lib/coachInbox.js";
import { ipRateLimited, json, readJson } from "../../functions-lib/stripeSync.js";

export async function onRequestPost({ request, env }) {
  const owner = await requireOwner(request, env);
  if (!owner.ok) return json(owner.status, { error: owner.error });
  if (ipRateLimited(request, { windowMs: 60_000, max: 90 })) {
    return json(429, { error: "Coach inbox is receiving too many requests. Wait a moment." });
  }
  const body = await readJson(request, 12 * 1024);
  if (!body) return json(400, { error: "Send a valid Coach inbox request." });
  const action = typeof body.action === "string" ? body.action : "list";
  try {
    if (action === "list") {
      return json(200, { source: "Firestore Coach Mia chat", fetchedAt: Date.now(), ...(await listCoachConversations(env, body.limit)) });
    }
    if (action === "reply") {
      const message = await writeCoachReply(env, body);
      return json(200, { sent: true, message });
    }
    return json(400, { error: "Unknown Coach inbox action." });
  } catch (error) {
    console.error("Coach inbox request failed", { action, message: error?.message || "unknown" });
    const safe = /Type a reply|under 2000|valid member/.test(error?.message || "")
      ? error.message
      : "Coach Mia conversations could not be loaded right now.";
    return json(502, { error: safe });
  }
}

export const __test = { groupCoachConversations };
