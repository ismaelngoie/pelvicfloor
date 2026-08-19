"use client";

// Members — every person, live. The table is the product here: dense rows,
// saved views that answer real questions, keyboard navigation, and a click
// that docks her record in the inspector instead of covering the list.

import { useEffect, useMemo, useState } from "react";
import { displayName, memberInitials, formatRelativeDay } from "@/lib/adminMetrics";
import { Card, CardHead, Chip, Input, PageHead, RankedBars, Segmented, Unavailable, count, ratio, shortDate } from "./ui";

const VIEWS = [
  { id: "active", label: "Active premium", filter: (m) => m.isActivePremium },
  { id: "trials-ending", label: "Trials ending · 7d", filter: (m, now) => m.premiumPhase === "trial" && m.revenueCat?.subscription?.currentPeriodEndsAt && new Date(m.revenueCat.subscription.currentPeriodEndsAt) <= new Date(now.getTime() + 7 * 86400000) },
  { id: "silent", label: "Paid · silent 14d", filter: (m, now) => m.premiumPhase === "paid" && (!m.lastSeenAt || now - m.lastSeenAt > 14 * 86400000) },
  { id: "streaks", label: "Top streaks", filter: (m) => m.isActivePremium && (m.streak || 0) >= 3 },
  { id: "canceling", label: "Set to cancel", filter: (m) => m.revenueCat?.subscription?.autoRenewalStatus && !/will_renew/i.test(m.revenueCat.subscription.autoRenewalStatus) },
  { id: "all", label: "All people", filter: () => true },
];

const COLUMNS = [
  { id: "name", label: "Member", sort: (m) => displayName(m).toLowerCase() },
  { id: "access", label: "Access", sort: (m) => (m.premiumPhase === "paid" ? 2 : m.premiumPhase === "trial" ? 1 : 0) },
  { id: "goal", label: "Goal", sort: (m) => m.goalTitle || "" },
  { id: "day", label: "Day", num: true, sort: (m) => m.programDay || 0 },
  { id: "streak", label: "Streak", num: true, sort: (m) => m.streak || 0 },
  { id: "lastSeenAt", label: "Last open", sort: (m) => m.lastSeenAt?.getTime() || 0 },
  { id: "renews", label: "Renews", sort: (m) => (m.revenueCat?.subscription?.currentPeriodEndsAt ? new Date(m.revenueCat.subscription.currentPeriodEndsAt).getTime() : Infinity) },
  { id: "joined", label: "Joined", sort: (m) => m.joinedAt?.getTime() || 0 },
];

function flag(code) {
  if (!code || code.length !== 2) return "🌐";
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 127397 + c.charCodeAt(0)));
}

export default function Members({ members, allPeople, activeTotal, membershipError, onRetry, onOpenMember, inspectedId, now, ownerMetrics }) {
  const [view, setView] = useState("active");
  const [term, setTerm] = useState("");
  const [sort, setSort] = useState({ key: "lastSeenAt", dir: "desc" });
  const [density, setDensity] = useState("comfortable");
  const [cursor, setCursor] = useState(-1);

  const source = view === "all" ? allPeople : members;
  const rows = useMemo(() => {
    const v = VIEWS.find((x) => x.id === view) || VIEWS[0];
    const q = term.trim().toLowerCase();
    const col = COLUMNS.find((c) => c.id === sort.key) || COLUMNS[5];
    const filtered = source.filter((m) => v.filter(m, now) && (!q || `${m.name} ${m.email} ${m.id} ${m.goalTitle}`.toLowerCase().includes(q)));
    return filtered.sort((a, b) => { const x = col.sort(a); const y = col.sort(b); const r = x < y ? -1 : x > y ? 1 : 0; return sort.dir === "asc" ? r : -r; });
  }, [source, view, term, sort, now]);

  useEffect(() => { setCursor(-1); }, [view, term]);
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target; if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (e.key === "j") setCursor((c) => Math.min(rows.length - 1, c + 1));
      else if (e.key === "k") setCursor((c) => Math.max(0, c - 1));
      else if (e.key === "Enter" && cursor >= 0 && rows[cursor]) onOpenMember(rows[cursor]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rows, cursor, onOpenMember]);

  const counts = useMemo(() => Object.fromEntries(VIEWS.map((v) => [v.id, (v.id === "all" ? allPeople : members).filter((m) => v.filter(m, now)).length])), [members, allPeople, now]);
  const countries = useMemo(() => (Array.isArray(ownerMetrics?.geography?.countries) ? ownerMetrics.geography.countries : []).map((c) => ({ key: c.code, label: `${flag(c.code)}  ${c.name}`, sub: `${c.paid || 0} paid · ${c.trials || 0} trial`, value: c.activePremium || 0 })).sort((a, b) => b.value - a.value), [ownerMetrics]);
  const th = (c) => (
    <th key={c.id} className={c.num ? "num" : ""} aria-sort={sort.key === c.id ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}>
      <button type="button" onClick={() => setSort((s) => ({ key: c.id, dir: s.key === c.id && s.dir === "desc" ? "asc" : "desc" }))}>{c.label}{sort.key === c.id ? (sort.dir === "asc" ? " ↑" : " ↓") : ""}</button>
    </th>
  );

  return (
    <div className="pv-rise" style={{ display: "grid", gap: 12 }}>
      <PageHead title="Members" description={`${count(activeTotal ?? members.length)} active premium verified by RevenueCat · ${count(allPeople.length)} iPhone profiles in total`} right={<Segmented label="Row density" value={density} onChange={setDensity} options={[{ value: "comfortable", label: "Comfortable" }, { value: "compact", label: "Compact" }]} />} />
      {membershipError ? <Unavailable reason={`Live RevenueCat membership: ${membershipError}`} onRetry={onRetry} /> : null}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {VIEWS.map((v) => <Chip key={v.id} on={view === v.id} onClick={() => setView(v.id)}>{v.label}<span className="pv-kbd" style={{ marginLeft: 4 }}>{counts[v.id]}</span></Chip>)}
        <div style={{ flex: 1 }} />
        <Input type="search" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search name, email, id, goal" aria-label="Search members" style={{ maxWidth: 280 }} />
      </div>

      <div className="pv-bento">
        <Card className="pv-span-12">
          <div className="pv-table-wrap" style={{ maxHeight: "calc(100dvh - 300px)", overflowY: "auto" }}>
            <table className="pv-table" data-density={density}>
              <thead><tr>{COLUMNS.map(th)}</tr></thead>
              <tbody>
                {rows.length === 0 ? <tr><td colSpan={COLUMNS.length} style={{ textAlign: "center", color: "var(--pv-ink-3)", height: 96 }}>{term ? `No one matches “${term}”.` : "Nobody in this view."}</td></tr> : null}
                {rows.map((m, i) => (
                  <tr key={m.id} aria-selected={m.id === inspectedId || i === cursor} onClick={() => onOpenMember(m)} onMouseEnter={() => setCursor(i)}>
                    <td className="ink"><span style={{ display: "inline-flex", alignItems: "center", gap: 10, minWidth: 0 }}><span className="pv-avatar">{memberInitials(m)}</span><span style={{ minWidth: 0 }}><span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220 }}>{displayName(m)}</span><span className="pv-faint" style={{ fontSize: 11, display: "block", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220 }}>{m.email || m.id}</span></span></span></td>
                    <td><span className="pv-pill" data-tone={m.premiumPhase === "paid" ? "good" : m.premiumPhase === "trial" ? "accent" : m.premiumState === "canceled_with_access" ? "warn" : "neutral"}>{m.premiumPhase === "paid" ? "Paid" : m.premiumPhase === "trial" ? "Trial" : m.premiumState === "canceled_with_access" ? "Canceled" : "No access"}</span></td>
                    <td>{m.goalTitle || <span className="pv-faint">—</span>}</td>
                    <td className="num">{Number.isFinite(m.programDay) ? `${m.programDay}` : <span className="pv-faint">—</span>}</td>
                    <td className="num">{m.streak || 0}</td>
                    <td>{m.lastSeenAt ? formatRelativeDay(m.lastSeenAt, now) : <span className="pv-faint">Never</span>}</td>
                    <td className="pv-mono">{m.revenueCat?.subscription?.currentPeriodEndsAt ? shortDate(m.revenueCat.subscription.currentPeriodEndsAt.slice(0, 10)) : <span className="pv-faint">—</span>}</td>
                    <td className="pv-mono">{m.joinedAt ? shortDate(m.joinedAt.toISOString().slice(0, 10)) : <span className="pv-faint">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pv-faint" style={{ padding: "8px 12px", fontSize: 11, fontFamily: "var(--font-mono)", borderTop: "1px solid var(--pv-border)" }}>{rows.length} shown · j / k move · ↵ open · esc close</div>
        </Card>
        {countries.length ? (
          <Card className="pv-span-4 pv-half">
            <CardHead label="Where renewing members are" info={{ body: "Country attached to current production App Store paid subscriptions and trials that are set to renew. Real aggregate countries from RevenueCat, not GPS.", source: ownerMetrics?.geography?.source }} />
            <div className="pv-card-pad"><RankedBars rows={countries} color="var(--pv-accent)" /></div>
            <div className="pv-faint" style={{ padding: "0 16px 12px", fontSize: 11 }}>{countries.length} countr{countries.length === 1 ? "y" : "ies"} · {ratio(countries[0]?.value, countries.reduce((s, c) => s + c.value, 0))} in {countries[0]?.label.replace(/^\S+\s+/, "")}</div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
