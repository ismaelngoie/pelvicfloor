"use client";

// The docked inspector: one member's record and the actions you can take on
// it, beside the list instead of over it. Same data calls as before.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { displayName, formatCount, formatDate, formatDateTime, formatRelativeDay, memberInitials, PROGRAM_LENGTH_DAYS } from "@/lib/adminMetrics";
import { fetchMemberDetail, grantMemberStreakRestore, resetMemberProgram, sendCoachMiaMessage, updateMemberProgramDay } from "@/lib/adminData";
import { FIXTURES_ON } from "@/lib/devFixtures";
import { Button, EmptyState, ErrorState, Feedback, Field, IconButton, Icons, Input, Pill, RowsSkeleton, Segmented, Textarea, shortDate, useTransientMessage } from "./ui";

const TABS = [
  { value: "overview", label: "Overview" },
  { value: "timeline", label: "Timeline" },
  { value: "checkins", label: "Check-ins" },
  { value: "chat", label: "Coach Mia" },
];

function Fact({ label, value }) {
  return <div style={{ minWidth: 0 }}><div className="pv-label" style={{ fontSize: 10 }}>{label}</div><div className="pv-ink" style={{ fontSize: 13, fontWeight: 500, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={String(value)}>{value}</div></div>;
}

function commandLabel(command) {
  if (command.type === "setProgramDay") return `Move to day ${command.day || "—"}`;
  if (command.type === "resetProgram") return "Restart program";
  if (command.type === "grantStreakRestore") return "Restore streak";
  return command.type;
}

function Overview({ member, detail, onPatched, onReload }) {
  const [day, setDay] = useState(String(member.programDay || 1));
  const [busy, setBusy] = useState("");
  const [message, showMessage] = useTransientMessage(6000);
  const validDay = Number.isFinite(Number(day)) && Number(day) >= 1 && Number(day) <= PROGRAM_LENGTH_DAYS;
  useEffect(() => setDay(String(member.programDay || 1)), [member.id, member.programDay]);
  const run = async (name, action, success) => {
    setBusy(name); showMessage(null);
    try { await action(); showMessage({ tone: "ok", text: success }); await onReload(); }
    catch (error) { showMessage({ tone: "error", text: error?.message || "The command was not sent." }); }
    finally { setBusy(""); }
  };
  const sub = member.revenueCat?.subscription;
  const recent = detail?.commands?.slice(0, 5) || [];
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="pv-inset" style={{ padding: 12, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <Fact label="Goal" value={member.goalTitle || "—"} />
        <Fact label="Program" value={Number.isFinite(member.programDay) ? `Day ${member.programDay} of 90` : "Not started"} />
        <Fact label="Streak" value={`${formatCount(member.streak)} · best ${formatCount(member.bestStreak)}`} />
        <Fact label="Last open" value={formatRelativeDay(member.lastSeenAt)} />
        <Fact label="Joined" value={formatDate(member.joinedAt, "—")} />
        <Fact label="App" value={member.appVersion || "—"} />
        <Fact label={sub?.status === "trialing" || member.premiumPhase === "trial" ? "Trial ends" : "Renews"} value={sub?.currentPeriodEndsAt ? shortDate(sub.currentPeriodEndsAt.slice(0, 10)) : "—"} />
        <Fact label="Product" value={sub?.productId ? sub.productId.replace(/^product\./i, "") : "—"} />
        <Fact label="Renewal" value={sub?.autoRenewalStatus ? sub.autoRenewalStatus.replace(/_/g, " ") : "—"} />
      </div>

      <div>
        <div className="pv-label" style={{ marginBottom: 8 }}>Actions · delivered by Firebase, applied by her iPhone</div>
        <div className="pv-inset" style={{ padding: 12 }}>
          <Field label="Move her to a program day" htmlFor={`day-${member.id}`}>
            <div style={{ display: "flex", gap: 8 }}>
              <Input id={`day-${member.id}`} type="number" min="1" max="90" inputMode="numeric" value={day} onChange={(e) => setDay(e.target.value)} style={{ maxWidth: 110 }} />
              <Button disabled={!validDay || busy === "day" || Number(day) === member.programDay} onClick={() => run("day", async () => { await updateMemberProgramDay(member.id, member.goalId, Number(day)); onPatched({ programDay: Math.round(Number(day)) }); }, `Day ${Math.round(Number(day))} was sent to her iPhone.`)}>{busy === "day" ? "Sending" : "Set day"}</Button>
            </div>
          </Field>
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <Button variant="ghost" size="sm" disabled={Boolean(busy)} onClick={() => run("streak", () => grantMemberStreakRestore(member.id), "A streak restore was sent to her iPhone.")}>{busy === "streak" ? "Sending" : "Restore a streak day"}</Button>
            <Button variant="ghost" size="sm" disabled={Boolean(busy)} onClick={() => run("reset", () => resetMemberProgram(member.id, member.goalId), "A program restart was sent to her iPhone.")}>{busy === "reset" ? "Sending" : "Restart at day 1"}</Button>
          </div>
        </div>
      </div>

      <div>
        <div className="pv-label" style={{ marginBottom: 6 }}>Recent commands</div>
        <div className="pv-rows">
          {recent.length ? recent.map((c) => <div className="pv-row" key={c.id}><div style={{ minWidth: 0 }}><div className="t">{commandLabel(c)}</div><div className="d">{formatDateTime(c.createdAt, "No time recorded")}</div></div><span className="v"><Pill tone={c.status === "applied" ? "good" : c.status === "rejected" ? "bad" : "warn"}>{c.status}</Pill></span></div>) : <div className="pv-faint" style={{ fontSize: 12.5 }}>No commands sent yet.</div>}
        </div>
      </div>
      <Feedback message={message} />
    </div>
  );
}

function Timeline({ detail }) {
  const events = useMemo(() => {
    const out = [];
    for (const row of detail?.completions || []) out.push({ at: row.completedAt, kind: "day", title: `Completed day ${row.day ?? "—"}`, sub: `${Math.round((row.secondsWatched || 0) / 60)} min`, tone: "good" });
    for (const row of detail?.events || []) out.push({ at: row.date, kind: "event", title: row.videoTitle || (row.type || "App event").replaceAll("_", " "), sub: row.error ? row.error : row.completed ? "Completed" : row.secondsWatched ? `${Math.round(row.secondsWatched / 60)} min` : "", tone: row.error ? "bad" : "neutral" });
    for (const row of detail?.commands || []) out.push({ at: row.createdAt, kind: "cmd", title: commandLabel(row), sub: row.status, tone: row.status === "applied" ? "good" : row.status === "rejected" ? "bad" : "warn" });
    return out.filter((e) => e.at).sort((a, b) => b.at - a.at).slice(0, 120);
  }, [detail]);
  if (!events.length) return <EmptyState title="No activity yet" description="Completed days, playback and commands appear here as the app records them." />;
  return (
    <ol style={{ listStyle: "none", margin: 0, padding: 0, position: "relative" }}>
      <span aria-hidden="true" style={{ position: "absolute", left: 7, top: 6, bottom: 6, width: 1, background: "var(--pv-border)" }} />
      {events.map((e, i) => (
        <li key={i} style={{ display: "grid", gridTemplateColumns: "16px 1fr auto", gap: 10, alignItems: "start", padding: "8px 0" }}>
          <span className="pv-dot" style={{ marginTop: 6, background: e.tone === "good" ? "var(--pv-good)" : e.tone === "bad" ? "var(--pv-bad)" : e.tone === "warn" ? "var(--pv-warn)" : "var(--pv-ink-3)", outline: "3px solid var(--pv-surface)" }} />
          <div style={{ minWidth: 0 }}><div className="pv-ink" style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.title}</div>{e.sub ? <div className="pv-faint" style={{ fontSize: 12 }}>{e.sub}</div> : null}</div>
          <span className="pv-faint pv-mono" style={{ fontSize: 11 }}>{formatDateTime(e.at, "")}</span>
        </li>
      ))}
    </ol>
  );
}

function Checkins({ rows }) {
  if (!rows?.length) return <EmptyState title="No check-ins yet" description="Comfort, leaks and confidence appear after she checks in." />;
  return (
    <div className="pv-rows">
      {rows.map((row) => (
        <div className="pv-row" key={row.id} style={{ alignItems: "flex-start" }}>
          <div style={{ width: 90 }}><div className="t pv-mono" style={{ fontSize: 12 }}>{formatDate(row.date, row.id)}</div></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, flex: 1 }}>
            <Fact label="Comfort / pain" value={Number.isFinite(row.painLevel) ? `${row.painLevel} / 10` : "—"} />
            <Fact label="Leaks" value={row.leakLevel || "—"} />
            <Fact label="Toward goal" value={Number.isFinite(row.goalFeeling) ? `${row.goalFeeling} / 10` : "—"} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Chat({ member, rows, onSent }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [message, showMessage] = useTransientMessage(6000);
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView?.({ block: "end" }); }, [rows?.length]);
  const send = async () => {
    setSending(true); showMessage(null);
    try { const written = await sendCoachMiaMessage(member.id, text); onSent(written); setText(""); showMessage({ tone: "ok", text: "Sent to her iPhone as Coach Mia." }); }
    catch (error) { showMessage({ tone: "error", text: error?.message || "The message was not sent." }); }
    finally { setSending(false); }
  };
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div className="pv-inset" style={{ padding: 10, maxHeight: "44vh", overflowY: "auto", display: "grid", gap: 8 }}>
        {rows?.length ? rows.map((row) => {
          const hers = row.role === "user";
          return (
            <div key={row.id} style={{ display: "flex", justifyContent: hers ? "flex-end" : "flex-start" }}>
              <div style={{ maxWidth: "86%", borderRadius: 12, padding: "8px 11px", background: hers ? "var(--pv-accent)" : "var(--pv-surface)", color: hers ? "var(--pv-accent-ink)" : "var(--pv-ink)", border: hers ? "0" : "1px solid var(--pv-border)" }}>
                <p style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.5 }}>{row.text}</p>
                <p style={{ margin: "4px 0 0", fontSize: 10.5, opacity: .7, fontFamily: "var(--font-mono)" }}>{hers ? "Member" : row.source === "admin" ? "You as Coach Mia" : "Coach Mia"} · {formatDateTime(row.date, "")}</p>
              </div>
            </div>
          );
        }) : <EmptyState title="No conversation yet" description="Your message can start it." />}
        <div ref={endRef} />
      </div>
      <Field label="Message as Coach Mia" htmlFor={`chat-${member.id}`}>
        <Textarea id={`chat-${member.id}`} rows={3} maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} placeholder="You are doing well. Keep today gentle and focus on the breathing cue before each movement." />
      </Field>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Button variant="primary" disabled={sending || !text.trim()} onClick={send}><Icons.send style={{ width: 14, height: 14 }} />{sending ? "Sending" : "Send to her app"}</Button>
        <span className="pv-faint pv-mono" style={{ fontSize: 11 }}>{text.trim().length} / 2000</span>
      </div>
      <Feedback message={message} />
    </div>
  );
}

export default function MemberInspector({ member, onClose, onPatched }) {
  const [tab, setTab] = useState("overview");
  const [detail, setDetail] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setStatus("loading"); setError("");
    try {
      if (process.env.NODE_ENV !== "production" && FIXTURES_ON) {
        const f = await import("@/lib/devFixtureData");
        const completions = (f.fixtureCompletions ? f.fixtureCompletions() : []).slice(0, 12);
        setDetail({ completions, events: f.fixtureEvents ? f.fixtureEvents([]).slice(0, 20) : [], checkins: [], commands: [], chat: [] });
        setStatus("ready");
        return;
      }
      setDetail(await fetchMemberDetail(member.id)); setStatus("ready");
    }
    catch (reason) { setError(reason?.message || "The app history did not load."); setStatus("error"); }
  }, [member.id]);
  useEffect(() => { setTab("overview"); load(); }, [load]);
  const onSent = (written) => setDetail((current) => current
    ? { ...current, chat: [...(current.chat || []), written] }
    : { completions: [], events: [], checkins: [], commands: [], chat: [written] });
  const counts = useMemo(() => ({ timeline: (detail?.completions?.length || 0) + (detail?.events?.length || 0), checkins: detail?.checkins?.length || 0, chat: detail?.chat?.length || 0 }), [detail]);

  return (
    <aside className="pv-inspector pv-rise" aria-label={`${displayName(member)} — member details`}>
      <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid var(--pv-border)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <span className="pv-avatar" data-lg="">{memberInitials(member)}</span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="pv-title" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName(member)}</div>
            <div className="pv-muted" style={{ fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{member.email || "Anonymous iPhone member"}</div>
            <div className="pv-faint pv-mono" style={{ fontSize: 10.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{member.id}</div>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setTab("chat")}><Icons.send style={{ width: 14, height: 14 }} />Message</Button>
          <IconButton label="Close member details" onClick={onClose}><Icons.close /></IconButton>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
          <Pill tone={member.premiumPhase === "paid" ? "good" : member.premiumPhase === "trial" ? "accent" : "neutral"} dot>{member.premiumPhase === "paid" ? "Paid" : member.premiumPhase === "trial" ? "Trial" : member.premiumState === "canceled_with_access" ? "Canceled · access" : "No access"}</Pill>
          {member.goalTitle ? <Pill>{member.goalTitle}</Pill> : null}
          <Pill>{Number.isFinite(member.programDay) ? `Day ${member.programDay}` : "Not started"}</Pill>
          <Pill>{formatCount(member.streak)}-day streak</Pill>
        </div>
        <div style={{ marginTop: 12, overflowX: "auto" }}>
          <Segmented label="Member sections" value={tab} onChange={setTab} options={TABS.map((t) => ({ value: t.value, label: t.value === "overview" ? t.label : `${t.label}${status === "ready" ? ` ${counts[t.value]}` : ""}` }))} />
        </div>
      </div>
      <div className="pv-scroll" style={{ padding: 16 }}>
        {tab === "chat" ? <Chat member={member} rows={detail?.chat || []} onSent={onSent} />
          : status === "loading" ? <RowsSkeleton rows={6} /> : status === "error" ? <ErrorState title="Her app history did not load" description={error} onRetry={load} />
          : tab === "overview" ? <Overview member={member} detail={detail} onPatched={onPatched} onReload={load} />
          : tab === "timeline" ? <Timeline detail={detail} />
          : <Checkins rows={detail.checkins} />}
      </div>
    </aside>
  );
}
