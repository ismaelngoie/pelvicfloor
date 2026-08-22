"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchCoachInbox, sendCoachInboxReply } from "@/lib/adminData";
import { FIXTURES_ON } from "@/lib/devFixtures";
import { formatDateTime, memberInitials } from "@/lib/adminMetrics";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Feedback,
  Icons,
  PageHead,
  Pill,
  RowsSkeleton,
  Segmented,
  Textarea,
  relativeTime,
  useTransientMessage,
} from "./ui";

const FILTERS = [
  { value: "needs", label: "Needs reply" },
  { value: "all", label: "All members" },
];

function memberIndex(allPeople) {
  const index = new Map();
  for (const member of allPeople || []) {
    if (member?.id) index.set(member.id, member);
    for (const id of member?.revenueCat?.identityIds || []) if (id) index.set(id, member);
  }
  return index;
}

function unknownMember(id) {
  return { id, name: "Anonymous member", email: "", goalTitle: "", premiumPhase: "inactive", revenueCat: null };
}

function conversationName(member) {
  return member?.name || member?.email || "Anonymous member";
}

function updateAfterReply(current, memberId, message) {
  if (!current) return current;
  const existing = current.conversations.some((conversation) => conversation.memberId === memberId);
  const source = existing ? current.conversations : [...current.conversations, {
    memberId,
    latestAt: "",
    latestText: "",
    latestRole: "",
    needsReply: false,
    unansweredCount: 0,
    lastMemberAt: "",
    lastMiaAt: "",
    messages: [],
  }];
  const conversations = source.map((conversation) => {
    if (conversation.memberId !== memberId) return conversation;
    return {
      ...conversation,
      latestAt: message.date,
      latestText: message.text,
      latestRole: "mia",
      needsReply: false,
      unansweredCount: 0,
      lastMiaAt: message.date,
      messages: [...conversation.messages, message].slice(-120),
    };
  }).sort((left, right) => {
    if (left.needsReply !== right.needsReply) return left.needsReply ? -1 : 1;
    return new Date(right.latestAt || 0) - new Date(left.latestAt || 0);
  });
  return {
    ...current,
    conversations,
    summary: {
      ...current.summary,
      needsReply: conversations.filter((row) => row.needsReply).length,
      unansweredMessages: conversations.reduce((sum, row) => sum + row.unansweredCount, 0),
    },
  };
}

export default function CoachInbox({ user, reloadToken, allPeople, onOpenMember }) {
  const [inbox, setInbox] = useState(null);
  const [state, setState] = useState("loading");
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("needs");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [message, showMessage] = useTransientMessage(7000);
  const endRef = useRef(null);
  const people = useMemo(() => memberIndex(allPeople), [allPeople]);

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setState("loading");
    setError("");
    try {
      const result = process.env.NODE_ENV !== "production" && FIXTURES_ON
        ? await import("@/lib/devFixtureData").then((fixtures) => fixtures.fixtureCoachInbox())
        : await fetchCoachInbox(user);
      setInbox(result);
      setState("ready");
    } catch (reason) {
      setError(reason?.message || "Coach Mia conversations did not load.");
      if (!quiet) setState("error");
    }
  }, [user]);

  useEffect(() => {
    load();
    const timer = setInterval(() => load({ quiet: true }), 30_000);
    return () => clearInterval(timer);
  }, [load, reloadToken]);

  const availableConversations = useMemo(() => {
    const byMember = new Map((inbox?.conversations || []).map((conversation) => [conversation.memberId, conversation]));
    for (const member of allPeople || []) {
      if (!member?.id || byMember.has(member.id)) continue;
      byMember.set(member.id, {
        memberId: member.id,
        latestAt: "",
        latestText: "No conversation yet · start one",
        latestRole: "",
        needsReply: false,
        unansweredCount: 0,
        lastMemberAt: "",
        lastMiaAt: "",
        messages: [],
      });
    }
    return [...byMember.values()].sort((left, right) => {
      if (left.needsReply !== right.needsReply) return left.needsReply ? -1 : 1;
      return new Date(right.latestAt || 0) - new Date(left.latestAt || 0);
    });
  }, [inbox?.conversations, allPeople]);

  const conversations = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return availableConversations.filter((conversation) => {
      if (filter === "needs" && !conversation.needsReply) return false;
      if (!needle) return true;
      const member = people.get(conversation.memberId) || unknownMember(conversation.memberId);
      return [member.name, member.email, member.goalTitle, conversation.memberId, conversation.latestText]
        .some((value) => String(value || "").toLocaleLowerCase().includes(needle));
    });
  }, [availableConversations, filter, query, people]);

  useEffect(() => {
    if (!conversations.length) { setSelectedId(""); return; }
    if (!conversations.some((row) => row.memberId === selectedId)) setSelectedId(conversations[0].memberId);
  }, [conversations, selectedId]);

  useEffect(() => { setDraft(""); showMessage(null); }, [selectedId, showMessage]);

  const selected = availableConversations.find((row) => row.memberId === selectedId) || null;
  const selectedMember = selected ? people.get(selected.memberId) || unknownMember(selected.memberId) : null;
  useEffect(() => { endRef.current?.scrollIntoView?.({ block: "end" }); }, [selected?.messages?.length]);

  const send = async () => {
    if (!selected || !draft.trim() || sending) return;
    const requestId = typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    setSending(true);
    showMessage(null);
    try {
      const result = process.env.NODE_ENV !== "production" && FIXTURES_ON
        ? { message: { id: `mia_${requestId}`, memberId: selected.memberId, role: "mia", source: "admin", text: draft.trim(), date: new Date().toISOString() } }
        : await sendCoachInboxReply(user, selected.memberId, draft, requestId);
      setInbox((current) => updateAfterReply(current, selected.memberId, result.message));
      setDraft("");
      showMessage({ tone: "ok", text: "Your reply is now in her Coach Mia conversation." });
    } catch (reason) {
      showMessage({ tone: "error", text: reason?.message || "The reply was not sent." });
    } finally {
      setSending(false);
    }
  };

  const needsReply = Number(inbox?.summary?.needsReply) || 0;
  const conversationCount = Number(inbox?.summary?.conversations) || 0;
  const memberCount = availableConversations.length;
  return (
    <div className="pv-rise" style={{ display: "grid", gap: 12 }}>
      <PageHead
        title="Coach Mia inbox"
        description="See every member question and reply inside the same Coach Mia conversation she already uses in the app."
        right={<div style={{ display: "flex", gap: 8, alignItems: "center" }}><Pill tone={needsReply > 0 ? "warn" : "good"} dot>{needsReply} need{needsReply === 1 ? "s" : ""} reply</Pill><Button size="sm" variant="ghost" onClick={() => load()}><Icons.refresh style={{ width: 14, height: 14 }} />Refresh</Button></div>}
      />
      {inbox?.summary?.truncated ? <div className="pv-alert"><span className="pv-dot" style={{ background: "var(--pv-warn)" }} /><span>The inbox reached its safety limit. The newest visible conversations remain usable, but older history may be incomplete.</span></div> : null}
      <Card className="pv-coach-inbox">
        <section className="pv-coach-list" aria-label="Coach Mia conversations">
          <div style={{ padding: 12, borderBottom: "1px solid var(--pv-border)", display: "grid", gap: 10 }}>
            <Segmented options={FILTERS} value={filter} onChange={setFilter} label="Conversation filter" />
            <label className="pv-input" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Icons.search style={{ width: 14, height: 14, color: "var(--pv-ink-3)" }} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search member or message" aria-label="Search Coach Mia conversations" style={{ border: 0, outline: 0, background: "transparent", width: "100%", minWidth: 0 }} />
            </label>
            <div className="pv-faint" style={{ fontSize: 11.5 }}>{memberCount} members · {conversationCount} conversations · refreshed {inbox?.fetchedAt ? relativeTime(inbox.fetchedAt) : "just now"}</div>
          </div>
          <div className="pv-scroll" style={{ minHeight: 0 }}>
            {state === "loading" ? <div style={{ padding: 14 }}><RowsSkeleton rows={7} /></div> : state === "error" ? <div style={{ padding: 14 }}><ErrorState title="Coach Mia inbox did not load" description={error} onRetry={() => load()} /></div> : conversations.length ? conversations.map((conversation) => {
              const member = people.get(conversation.memberId) || unknownMember(conversation.memberId);
              return (
                <button key={conversation.memberId} type="button" className="pv-coach-thread" aria-current={selectedId === conversation.memberId ? "true" : undefined} onClick={() => setSelectedId(conversation.memberId)}>
                  <span className="pv-avatar">{memberInitials(member)}</span>
                  <span style={{ minWidth: 0, display: "grid", gap: 2, textAlign: "left" }}>
                    <span className="pv-ink" style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{conversationName(member)}</span>
                    <span className="pv-faint" style={{ fontSize: 11.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{conversation.latestText}</span>
                    <span className="pv-faint pv-mono" style={{ fontSize: 10.5 }}>{conversation.latestAt ? relativeTime(conversation.latestAt) : "No timestamp"}</span>
                  </span>
                  {conversation.needsReply ? <span className="pv-pill" data-tone="warn">{conversation.unansweredCount}</span> : conversation.messages.length ? <Icons.check style={{ width: 15, height: 15, color: "var(--pv-good)" }} /> : <Icons.send style={{ width: 15, height: 15, color: "var(--pv-ink-3)" }} />}
                </button>
              );
            }) : <div style={{ padding: 18 }}><EmptyState title={filter === "needs" ? "Every question has an answer" : "No member matches"} description={filter === "needs" ? "New member questions will appear here automatically." : "Try a different name, email, member ID or goal."} /></div>}
          </div>
        </section>

        <section className="pv-coach-conversation" aria-label={selectedMember ? `Conversation with ${conversationName(selectedMember)}` : "Selected Coach Mia conversation"}>
          {!selected ? <EmptyState title="Choose a conversation" description="Select a member question to read the full thread and reply as Coach Mia." /> : (
            <>
              <header style={{ padding: "12px 14px", borderBottom: "1px solid var(--pv-border)", display: "flex", alignItems: "center", gap: 10 }}>
                <span className="pv-avatar" data-lg="">{memberInitials(selectedMember)}</span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="pv-title" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{conversationName(selectedMember)}</div>
                  <div className="pv-faint" style={{ fontSize: 11.5 }}>{selectedMember.email || selectedMember.goalTitle || selected.memberId}</div>
                </div>
                {people.has(selected.memberId) ? <Button size="sm" variant="ghost" onClick={() => onOpenMember(selectedMember)}>Open member</Button> : null}
                <Pill tone={selected.needsReply ? "warn" : selected.messages.length ? "good" : "neutral"}>{selected.needsReply ? `${selected.unansweredCount} waiting` : selected.messages.length ? "Answered" : "New conversation"}</Pill>
              </header>
              <div className="pv-scroll pv-coach-messages">
                {!selected.messages.length ? <EmptyState title="No conversation yet" description="Write below to start a private Coach Mia conversation with this member." /> : selected.messages.map((row) => {
                  const hers = row.role === "user";
                  return (
                    <div key={row.id} style={{ display: "flex", justifyContent: hers ? "flex-end" : "flex-start" }}>
                      <div style={{ maxWidth: "min(82%, 680px)", borderRadius: 14, padding: "9px 12px", background: hers ? "var(--pv-accent)" : "var(--pv-raised)", color: hers ? "var(--pv-accent-ink)" : "var(--pv-ink)", border: hers ? 0 : "1px solid var(--pv-border)" }}>
                        <p style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 13.5, lineHeight: 1.5 }}>{row.text}</p>
                        <p style={{ margin: "5px 0 0", fontSize: 10.5, opacity: .72, fontFamily: "var(--font-mono)" }}>{hers ? "Member" : row.source === "admin" ? "You as Coach Mia" : "Coach Mia"} · {formatDateTime(row.date ? new Date(row.date) : null, "No time")}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>
              <footer style={{ borderTop: "1px solid var(--pv-border)", padding: 12, display: "grid", gap: 9 }}>
                <Textarea rows={3} maxLength={2000} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter") { event.preventDefault(); send(); } }} placeholder="Reply with a clear, personal answer. She will see it as Coach Mia inside the app." aria-label={`Reply to ${conversationName(selectedMember)} as Coach Mia`} />
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <Button variant="primary" disabled={sending || !draft.trim()} onClick={send}><Icons.send style={{ width: 14, height: 14 }} />{sending ? "Sending" : "Reply as Coach Mia"}</Button>
                  <span className="pv-faint pv-mono" style={{ fontSize: 11 }}>{draft.trim().length} / 2000 · ⌘ Enter to send</span>
                  <span className="pv-faint" style={{ marginLeft: "auto", fontSize: 11.5 }}>Appears live if her app is open, otherwise on her next app open.</span>
                </div>
                <Feedback message={message} />
              </footer>
            </>
          )}
        </section>
      </Card>
    </div>
  );
}
