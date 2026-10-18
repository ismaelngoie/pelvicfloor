// Explicit native chat commands. Questions and negated requests never mutate a member's plan.
export function coachAction(question) {
  const text = String(question || "").toLowerCase().replace(/[’‘]/g, "'").trim();
  if (/^(how|where|why|what|when|should|is|are|do|does)\b/.test(text) || /\b(don't|do not|don't|never|not to)\b/.test(text)) return null;
  const explicit = /\b(make my|set my|change my|switch my|can you make my|please make my)\b/.test(text);
  if (explicit && /\b(plan|workout|difficulty)\b/.test(text)) {
    const difficulty = /\b(hard|harder)\b/.test(text) ? "hard" : /\b(medium|moderate)\b/.test(text) ? "medium" : /\b(easy|easier|gentle|gentler)\b/.test(text) ? "easy" : null;
    if (difficulty) return { type: "difficulty", value: difficulty };
  }
  if (/\b(log|add)\b/.test(text) && /\b(water|glass|bottle)\b/.test(text)) {
    // Native action logs one glass or bottle. Send quantities to the tracker for an exact entry.
    if (/\b(two|three|four|five|six|seven|eight|nine|ten|\d+)\b/.test(text)) return { type: "open", href: "/app/you?tool=water", label: "Open water tracker" };
    return { type: "water", value: text.includes("bottle") ? 500 : 250, drink: text.includes("bottle") ? "bottle" : "glass" };
  }
  if (/log my period|period (?:has )?(?:started|ended)/.test(text)) {
    if (/\b(yesterday|ago|tomorrow|last week)\b/.test(text)) return { type: "open", href: "/app/you?tool=cycle", label: "Open cycle tracker" };
    return { type: "period", ended: /ended/.test(text) };
  }
  if (/(mark today|finished today's|finished my workout|completed today's)/.test(text) && /\b(complete|done|finished|completed)\b/.test(text)) return { type: "complete" };
  return null;
}

export function coachTool(question, pathway = "womensPelvicHealth") {
  const text = String(question || "").toLowerCase();
  if (!/\b(open|show|find|where|take me|go to)\b/.test(text)) return null;
  const options = [
    [/urge rescue|urge wave/, "/app?tool=urge", "Open Urge Rescue"],
    [/audio kegel|guided kegel/, "/app?tool=kegels", "Open Audio Kegels"],
    [/guided audio|audio session|private ritual/, "/app?tool=audio", "Open Guided Audio"],
    [/night|nocturia/, "/app/you?tool=night", "Open night tracker"],
    [/water|hydrat/, "/app/you?tool=water", "Open water tracker"],
    [/menopause/, "/app/you?tool=menopause", "Open menopause tracker"],
    [/cycle|period/, "/app/you?tool=cycle", "Open cycle tracker"],
    [/men's|mens|prostate/, "/app/you?tool=mens", "Open men's tracker"],
    [/difficulty|easier|harder/, "/app/you?tool=difficulty", "Open plan difficulty"],
    [/therapist|professional/, "/app/you?tool=therapist", "Find a pelvic health therapist"],
    [/pathway|program map/, "/app/you?tool=pathway", "Open your pathway"],
    [/article|insight|lesson/, "/app/insights", "Open Insights"],
  ];
  const found = options.find(([pattern]) => pattern.test(text));
  if (!found) return null;
  if (pathway === "mensPelvicHealth" && ["/app/you?tool=cycle", "/app/you?tool=menopause"].includes(found[1])) return null;
  return { type: "open", href: found[1], label: found[2] };
}
