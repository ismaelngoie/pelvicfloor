"use client";

// Copy hygiene for generated text, ported from InsightMarkdown.withoutLongDashes
// in "Pelvic Floor/Core/Insights/InsightIndex.swift".
//
// The app's copy rule is that no member ever reads an em dash or an en dash.
// Hand-written copy obeys it because a person wrote it. Generated copy has to
// be cleaned, and this is the only place that does it.

/** Replace every occurrence, without regex escaping games. */
function replaceAll(text, pattern, replacement) {
  return text.split(pattern).join(replacement);
}

export function withoutLongDashes(text) {
  let out = String(text ?? "");

  // A dash between two numbers is a range, not a pause: "5–10 minutes" has to
  // become "5 to 10 minutes", never "5, 10 minutes".
  out = out.replace(/([0-9])\s*[–—]\s*([0-9])/g, "$1 to $2");

  for (const pattern of [" — ", " – ", " —", "— ", " –", "– "]) {
    out = replaceAll(out, pattern, ", ");
  }
  out = replaceAll(out, "—", ", ");
  out = replaceAll(out, "–", ", ");

  // Tidy anything the substitution doubled up. Every replacement is strictly
  // shorter than its pattern, so these loops always terminate.
  const fixups = [
    [", ,", ","], [" ,", ","], [",,", ","],
    [".,", "."], ["?,", "?"], ["!,", "!"], [":,", ":"], [";,", ";"],
  ];
  for (const [pattern, replacement] of fixups) {
    while (out.includes(pattern)) out = replaceAll(out, pattern, replacement);
  }
  // Spaces only: collapsing every whitespace run would flatten the blank lines
  // that separate a section's paragraphs.
  while (out.includes("  ")) out = replaceAll(out, "  ", " ");

  out = out.trim();
  // A dash at the very end became a dangling comma.
  while (out.endsWith(",")) out = out.slice(0, -1).trim();
  return out;
}

/**
 * Trim, strip the dashes the copy rules ban, and truncate on a word boundary so
 * a cap can never cut a word in half. Ported from InsightAnswerPayload.clean.
 */
export function clean(text, limit) {
  if (text == null) return "";
  const normalised = withoutLongDashes(text);
  if (normalised.length <= limit) return normalised;
  const cut = normalised.slice(0, limit);
  const lastSpace = cut.lastIndexOf(" ");
  if (lastSpace > 0) return `${cut.slice(0, lastSpace).trim()}...`;
  return `${cut}...`;
}
