// Native InsightMarkdown block structure, including inline exercise and action markers.
export function parseInsightBody(raw) {
  const blocks = [];
  let pending = null;
  let video = 0;
  const flush = () => { if (pending) blocks.push(pending); pending = null; };
  const append = (type, text) => {
    if (pending?.type !== type) { flush(); pending = { type, items: [] }; }
    pending.items.push(text);
  };
  for (const value of String(raw || "").split(/\r?\n/)) {
    const line = value.trim();
    if (!line) { flush(); continue; }
    if (/^#{1,6}\s+/.test(line)) { flush(); blocks.push({ type: "heading", text: line.replace(/^#{1,6}\s+/, "") }); }
    else if (/^(---+|\*\*\*+|___+)$/.test(line)) { flush(); blocks.push({ type: "divider" }); }
    else if (line === "[VIDEO]") { flush(); blocks.push({ type: "video", index: video++ }); }
    else if (/^\[ACTION:[^\]]+\]$/.test(line)) { flush(); blocks.push({ type: "action", action: line.slice(8, -1) }); }
    else if (/^[*•-]\s+/.test(line)) append("bullets", line.replace(/^[*•-]\s+/, ""));
    else if (/^\d{1,2}\.\s+/.test(line)) append("numbered", line.replace(/^\d{1,2}\.\s+/, ""));
    else append("paragraph", line);
  }
  flush();
  return blocks;
}

export function insightReadingMinutes(raw) {
  const words = parseInsightBody(raw).flatMap((block) => block.text ? [block.text] : block.items || [])
    .join(" ").replace(/\*\*|__|`/g, "").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 180));
}
