"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { displayName, formatCount, formatDate, formatDateTime, formatRelativeDay, memberInitials, PROGRAM_LENGTH_DAYS } from "@/lib/adminMetrics";
import { fetchMemberDetail, grantMemberStreakRestore, resetMemberProgram, sendCoachMiaMessage, updateMemberProgramDay } from "@/lib/adminData";
import { Button, Card, EmptyState, ErrorState, Feedback, Field, Input, Pill, RowsSkeleton, Segmented, Textarea, useEscape, useTransientMessage } from "./ui";

const TABS = [
  { value: "member", label: "Member" },
  { value: "days", label: "Days done" },
  { value: "checkins", label: "Check-ins" },
  { value: "activity", label: "App activity" },
  { value: "chat", label: "Coach Mia" },
];

function Fact({ label, value }) {
  return <div className="min-w-0"><p className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--pv-ink-3)" }}>{label}</p><p className="mt-1 truncate text-[14px] font-medium" style={{ color: "var(--pv-ink)" }} title={String(value)}>{value}</p></div>;
}

function MemberSection({ member, detail, onPatched, onReload }) {
  const [day, setDay] = useState(String(member.programDay || 1));
  const [busy, setBusy] = useState("");
  const [message, showMessage] = useTransientMessage(6500);
  const validDay = Number.isFinite(Number(day)) && Number(day) >= 1 && Number(day) <= PROGRAM_LENGTH_DAYS;

  useEffect(() => setDay(String(member.programDay || 1)), [member.id, member.programDay]);

  const run = async (name, action, success) => {
    setBusy(name);
    showMessage(null);
    try {
      await action();
      showMessage({ tone: "ok", text: success });
      await onReload();
    } catch (error) {
      showMessage({ tone: "error", text: error?.message || "The command was not sent." });
    } finally {
      setBusy("");
    }
  };

  const recentCommands = detail?.commands?.slice(0, 6) || [];

  return <div className="space-y-6">
    <Card flat className="p-4" style={{ background: "var(--pv-surface-2)" }}>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Fact label="Goal" value={member.goalTitle} />
        <Fact label="Program" value={Number.isFinite(member.programDay) ? `Day ${member.programDay} of 90` : "Not started"} />
        <Fact label="Streak" value={`${formatCount(member.streak)} days`} />
        <Fact label="Best streak" value={`${formatCount(member.bestStreak)} days`} />
        <Fact label="Last app open" value={formatRelativeDay(member.lastSeenAt)} />
        <Fact label="App version" value={member.appVersion || "Not recorded"} />
        <Fact label="Joined" value={formatDate(member.joinedAt, "Not recorded")} />
        <Fact label="Age" value={Number.isFinite(member.age) ? member.age : "Not recorded"} />
        <Fact label="iPhone account" value={member.email || "Anonymous"} />
      </div>
    </Card>

    <div>
      <p className="text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--pv-ink-3)" }}>App controls</p>
      <p className="mt-2 text-[13px] leading-relaxed" style={{ color: "var(--pv-ink-2)" }}>These commands are delivered by Firebase and applied by the approved iPhone app the next time it is open.</p>
    </div>

    <Card flat className="p-4" style={{ background: "var(--pv-surface-2)" }}>
      <Field label="Move her to a program day" htmlFor={`day-${member.id}`} hint="The phone safely rebuilds the completion record so the selected day becomes the next session.">
        <Input id={`day-${member.id}`} type="number" min="1" max="90" inputMode="numeric" value={day} onChange={(event) => setDay(event.target.value)} />
      </Field>
      <div className="mt-3"><Button disabled={!validDay || busy === "day" || Number(day) === member.programDay} onClick={() => run("day", async () => { await updateMemberProgramDay(member.id, member.goalId, Number(day)); onPatched({ programDay: Math.round(Number(day)) }); }, `Day ${Math.round(Number(day))} was sent to her iPhone.`)}>{busy === "day" ? "Sending" : "Set program day"}</Button></div>
    </Card>

    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Card flat className="p-4" style={{ background: "var(--pv-surface-2)" }}>
        <p className="text-[14px] font-semibold" style={{ color: "var(--pv-ink)" }}>Restore a missed streak day</p>
        <p className="mt-2 text-[12px] leading-relaxed" style={{ color: "var(--pv-ink-2)" }}>Useful after illness, travel, or a support issue.</p>
        <div className="mt-4"><Button variant="ghost" disabled={Boolean(busy)} onClick={() => run("streak", () => grantMemberStreakRestore(member.id), "A streak restore was sent to her iPhone.")}>{busy === "streak" ? "Sending" : "Restore streak"}</Button></div>
      </Card>
      <Card flat className="p-4" style={{ background: "var(--pv-surface-2)" }}>
        <p className="text-[14px] font-semibold" style={{ color: "var(--pv-ink)" }}>Restart the current program</p>
        <p className="mt-2 text-[12px] leading-relaxed" style={{ color: "var(--pv-ink-2)" }}>Returns this goal to day one on her iPhone.</p>
        <div className="mt-4"><Button variant="ghost" disabled={Boolean(busy)} onClick={() => run("reset", () => resetMemberProgram(member.id, member.goalId), "A program restart was sent to her iPhone.")}>{busy === "reset" ? "Sending" : "Restart at day 1"}</Button></div>
      </Card>
    </div>
    <Feedback message={message} />

    <div>
      <p className="text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--pv-ink-3)" }}>Recent command delivery</p>
      <div className="mt-3 space-y-2">{recentCommands.length ? recentCommands.map((command) => <div key={command.id} className="flex items-center justify-between gap-3 rounded-xl px-3 py-3" style={{ background: "var(--pv-surface-2)", border: "1px solid var(--pv-border)" }}><div><p className="text-[13px] font-semibold" style={{ color: "var(--pv-ink)" }}>{commandLabel(command)}</p><p className="mt-0.5 text-[11px]" style={{ color: "var(--pv-ink-3)" }}>{formatDateTime(command.createdAt, "No time recorded")}</p></div><Pill tone={command.status === "applied" ? "good" : command.status === "rejected" ? "crit" : "warn"}>{command.status}</Pill></div>) : <p className="text-[13px]" style={{ color: "var(--pv-ink-2)" }}>No admin commands have been sent.</p>}</div>
    </div>
  </div>;
}

function commandLabel(command) {
  if (command.type === "setProgramDay") return `Move to day ${command.day || "—"}`;
  if (command.type === "resetProgram") return "Restart program";
  if (command.type === "grantStreakRestore") return "Restore streak";
  return command.type;
}

function DaysSection({ rows }) {
  if (!rows.length) return <EmptyState title="No completed program days" description="A day appears after the app credits the session." />;
  return <ol className="space-y-2">{rows.map((row) => <li key={row.id} className="flex items-center justify-between gap-4 rounded-xl px-4 py-3" style={{ background: "var(--pv-surface-2)", border: "1px solid var(--pv-border)" }}><div><p className="text-[14px] font-semibold" style={{ color: "var(--pv-ink)" }}>Day {row.day ?? "—"}</p><p className="mt-0.5 text-[12px]" style={{ color: "var(--pv-ink-3)" }}>{formatDateTime(row.completedAt, "No date recorded")}</p></div><span className="pv-tabular text-[12px]" style={{ color: "var(--pv-ink-2)" }}>{Math.round((row.secondsWatched || 0) / 60)} min</span></li>)}</ol>;
}

function CheckinsSection({ rows }) {
  if (!rows.length) return <EmptyState title="No check-ins yet" description="Comfort, confidence, symptoms, and sensation appear after she checks in." />;
  return <ol className="space-y-2">{rows.map((row) => <li key={row.id} className="rounded-xl px-4 py-3" style={{ background: "var(--pv-surface-2)", border: "1px solid var(--pv-border)" }}><p className="text-[13px] font-semibold" style={{ color: "var(--pv-ink)" }}>{formatDate(row.date, row.id)}</p><div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3"><Fact label="Comfort / pain" value={Number.isFinite(row.painLevel) ? `${row.painLevel} / 10` : "Not answered"} /><Fact label="Leaks" value={row.leakLevel || "Not answered"} /><Fact label="Toward goal" value={Number.isFinite(row.goalFeeling) ? `${row.goalFeeling} / 10` : "Not answered"} /></div></li>)}</ol>;
}

function ActivitySection({ rows }) {
  if (!rows.length) return <EmptyState title="No detailed activity yet" description="Video starts, completions, and playback problems appear here as the current app records them." />;
  return <ol className="space-y-2">{rows.slice(0, 150).map((row) => <li key={row.id} className="rounded-xl px-4 py-3" style={{ background: "var(--pv-surface-2)", border: `1px solid ${row.error ? "var(--pv-crit)" : "var(--pv-border)"}` }}><div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="truncate text-[13px] font-semibold" style={{ color: "var(--pv-ink)" }}>{row.videoTitle || activityLabel(row.type)}</p><p className="mt-1 text-[11px]" style={{ color: "var(--pv-ink-3)" }}>{formatDateTime(row.date, "No date recorded")}{row.day ? ` · Day ${row.day}` : ""}</p>{row.error ? <p className="mt-2 text-[12px]" style={{ color: "var(--pv-crit)" }}>{row.error}</p> : null}</div><Pill tone={row.error ? "crit" : row.completed ? "good" : "neutral"}>{row.error ? "Needs attention" : row.completed ? "Completed" : row.secondsWatched ? `${Math.round(row.secondsWatched / 60)} min` : "Recorded"}</Pill></div></li>)}</ol>;
}

function activityLabel(type) { return (type || "App event").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }

function ChatSection({ member, rows, onSent }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [message, showMessage] = useTransientMessage(6000);
  const send = async () => { setSending(true); showMessage(null); try { const written = await sendCoachMiaMessage(member.id, text); onSent(written); setText(""); showMessage({ tone: "ok", text: "Sent to her iPhone as Coach Mia." }); } catch (error) { showMessage({ tone: "error", text: error?.message || "The message was not sent." }); } finally { setSending(false); } };
  return <div className="space-y-4"><div className="max-h-[46vh] space-y-3 overflow-y-auto rounded-xl p-3" style={{ background: "var(--pv-surface-2)", border: "1px solid var(--pv-border)" }}>{rows.length ? rows.map((row) => { const hers = row.role === "user"; return <div key={row.id} className={`flex ${hers ? "justify-end" : "justify-start"}`}><div className="max-w-[86%] rounded-2xl px-3.5 py-2.5" style={hers ? { background: "linear-gradient(135deg,#E65473,#C33A5C)", color: "#fff" } : { background: "var(--pv-surface-solid)", border: "1px solid var(--pv-border)", color: "var(--pv-ink)" }}><p className="whitespace-pre-wrap text-[14px] leading-relaxed">{row.text}</p><p className="mt-1.5 text-[11px]" style={{ color: hers ? "rgba(255,255,255,.72)" : "var(--pv-ink-3)" }}>{hers ? "Member" : row.source === "admin" ? "You as Coach Mia" : "Coach Mia"} · {formatDateTime(row.date, "No date")}</p></div></div>; }) : <EmptyState title="No Coach Mia conversation yet" description="Your message can start the conversation." />}</div><Field label="Send a one-to-one message as Coach Mia" htmlFor={`chat-${member.id}`} hint="Keep it practical, warm, and specific to her program."><Textarea id={`chat-${member.id}`} rows={3} maxLength={2000} value={text} onChange={(event) => setText(event.target.value)} placeholder="You are doing well. Keep today gentle and focus on the breathing cue before each movement." /></Field><div className="flex items-center gap-3"><Button disabled={sending || !text.trim()} onClick={send}>{sending ? "Sending" : "Send to her app"}</Button><span className="text-[12px]" style={{ color: "var(--pv-ink-3)" }}>{text.trim().length} / 2000</span></div><Feedback message={message} /></div>;
}

export default function MemberPanel({ member, onClose, onPatched }) {
  const [tab, setTab] = useState("member");
  const [detail, setDetail] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const closeRef = useRef(null);
  useEscape(onClose, true);

  const load = useCallback(async () => { setStatus("loading"); setError(""); try { setDetail(await fetchMemberDetail(member.id)); setStatus("ready"); } catch (reason) { setError(reason?.message || "The app history did not load."); setStatus("error"); } }, [member.id]);
  useEffect(() => { setTab("member"); load(); }, [load]);
  useEffect(() => { closeRef.current?.focus(); }, [member.id]);
  const onSent = (written) => setDetail((current) => current ? { ...current, chat: [...current.chat, written] } : current);
  const counts = useMemo(() => ({ days: detail?.completions?.length || 0, checkins: detail?.checkins?.length || 0, activity: detail?.events?.length || 0, chat: detail?.chat?.length || 0 }), [detail]);

  return <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={`${displayName(member)}, app member details`}><div aria-hidden="true" onClick={onClose} className="absolute inset-0" style={{ background: "rgba(4,2,8,.62)", backdropFilter: "blur(2px)" }} /><div className="pv-sheet-in relative flex h-full w-full flex-col md:max-w-[610px] xl:max-w-[720px]" style={{ background: "var(--pv-canvas)", borderLeft: "1px solid var(--pv-border)", boxShadow: "var(--pv-shadow)" }}>
    <div className="shrink-0 px-5 pb-4 pt-[max(16px,env(safe-area-inset-top))]" style={{ borderBottom: "1px solid var(--pv-border)" }}><div className="flex items-start gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[15px] font-bold" style={{ background: "linear-gradient(135deg,var(--pv-rose),var(--pv-violet))", color: "var(--pv-accent-ink)" }}>{memberInitials(member)}</div><div className="min-w-0 flex-1"><h3 className="truncate text-[18px] font-semibold" style={{ color: "var(--pv-ink)" }}>{displayName(member)}</h3><p className="truncate text-[13px]" style={{ color: "var(--pv-ink-2)" }}>{member.email || "Anonymous iPhone member"}</p><p className="mt-0.5 truncate text-[11px]" style={{ color: "var(--pv-ink-3)" }}>{member.id}</p></div><button ref={closeRef} type="button" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-full" style={{ background: "var(--pv-surface-2)", border: "1px solid var(--pv-border)", color: "var(--pv-ink)" }} aria-label="Close member details">✕</button></div><div className="mt-3 flex flex-wrap gap-2"><Pill>{member.goalTitle}</Pill><Pill>{Number.isFinite(member.programDay) ? `Day ${member.programDay} of 90` : "Not started"}</Pill><Pill>{formatCount(member.streak)} day streak</Pill></div><div className="mt-4 overflow-x-auto"><Segmented label="Member app information" value={tab} onChange={setTab} options={TABS.map((item) => ({ value: item.value, label: item.value === "member" ? item.label : `${item.label}${status === "ready" ? ` (${counts[item.value]})` : ""}` }))} /></div></div>
    <div className="pv-scroll flex-1 px-5 py-5">{status === "loading" ? <RowsSkeleton rows={6} /> : status === "error" ? <ErrorState title="Her app history did not load" description={error} onRetry={load} /> : tab === "member" ? <MemberSection member={member} detail={detail} onPatched={onPatched} onReload={load} /> : tab === "days" ? <DaysSection rows={detail.completions} /> : tab === "checkins" ? <CheckinsSection rows={detail.checkins} /> : tab === "activity" ? <ActivitySection rows={detail.events} /> : <ChatSection member={member} rows={detail.chat} onSent={onSent} />}</div>
  </div></div>;
}
