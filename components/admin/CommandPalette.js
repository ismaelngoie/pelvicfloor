"use client";

// ⌘K. Jump anywhere, find anyone, change the range, switch theme.
// Deliberately dependency-free: a filtered list with arrow keys is all this
// needs to feel like a product.

import { useEffect, useMemo, useRef, useState } from "react";
import { Icons } from "./ui";
import { displayName } from "@/lib/adminMetrics";

export default function CommandPalette({ open, onClose, pages, onPage, members = [], onMember, ranges, onRange, onTheme, theme }) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => { if (open) { setQuery(""); setIndex(0); setTimeout(() => inputRef.current?.focus(), 10); } }, [open]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out = [];
    const push = (group, item) => out.push({ group, ...item });
    for (const p of pages) if (!q || p.label.toLowerCase().includes(q) || p.hint?.toLowerCase().includes(q)) push("Go to", { key: `page:${p.id}`, label: p.label, hint: p.key ? `G ${p.key.toUpperCase()}` : "", icon: p.icon, run: () => onPage(p.id) });
    for (const r of ranges) if (!q || r.label.toLowerCase().includes(q) || "range".includes(q)) push("Date range", { key: `range:${r.id}`, label: `Range · ${r.label}`, hint: "", icon: Icons.revenue, run: () => onRange(r.id) });
    push("Appearance", { key: "theme", label: theme === "dark" ? "Switch to light theme" : "Switch to dark theme", icon: theme === "dark" ? Icons.sun : Icons.moon, run: onTheme });
    if (q.length >= 2) {
      const hits = members.filter((m) => `${m.name} ${m.email} ${m.id}`.toLowerCase().includes(q)).slice(0, 8);
      for (const m of hits) push("Members", { key: `m:${m.id}`, label: displayName(m), hint: m.email || m.id.slice(0, 10), icon: Icons.members, run: () => onMember(m) });
    }
    return out;
  }, [query, pages, ranges, members, theme, onPage, onRange, onTheme, onMember]);

  useEffect(() => { setIndex(0); }, [query]);
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-i="${index}"]`);
    el?.scrollIntoView?.({ block: "nearest" });
  }, [index]);

  if (!open) return null;
  const run = (item) => { onClose(); item.run(); };
  const onKey = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setIndex((i) => Math.min(items.length - 1, i + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setIndex((i) => Math.max(0, i - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); if (items[index]) run(items[index]); }
    else if (e.key === "Escape") onClose();
  };
  let lastGroup = null;
  return (
    <div className="pv-cmdk-overlay" onMouseDown={onClose} role="presentation">
      <div className="pv-cmdk pv-rise" role="dialog" aria-modal="true" aria-label="Command palette" onMouseDown={(e) => e.stopPropagation()}>
        <div className="pv-cmdk-input">
          <Icons.search />
          <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={onKey} placeholder="Jump to a page, find a member, change the range…" aria-label="Command" />
          <span className="pv-kbd">esc</span>
        </div>
        <div className="pv-cmdk-list" ref={listRef} role="listbox">
          {items.length === 0 ? <div className="pv-empty"><p className="d">Nothing matches “{query}”.</p></div> : null}
          {items.map((item, i) => {
            const head = item.group !== lastGroup ? <div className="pv-cmdk-group" key={`g:${item.group}`}>{item.group}</div> : null;
            lastGroup = item.group;
            const Icon = item.icon || Icons.arrow;
            return (
              <div key={item.key}>
                {head}
                <button type="button" className="pv-cmdk-item" role="option" aria-selected={i === index} data-i={i} onMouseEnter={() => setIndex(i)} onClick={() => run(item)}>
                  <Icon />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>
                  {item.hint ? <span className="hint">{item.hint}</span> : null}
                </button>
              </div>
            );
          })}
        </div>
        <div className="pv-cmdk-foot"><span>↑↓ move</span><span>↵ open</span><span>esc close</span></div>
      </div>
    </div>
  );
}
