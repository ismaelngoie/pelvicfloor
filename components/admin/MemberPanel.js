"use client";

// One member, opened up.
//
// Four sections behind a small tab bar so nothing is a wall of text on a phone:
// her profile and the controls, what she has finished, how she says she feels,
// and her Coach Mia transcript.
//
// Two of the controls write in two places on purpose. Changing her goal or her
// program day updates her record (so this dashboard is right immediately) and
// posts a command her phone applies the next time it is opened (so the app
// agrees). Anything that behaves that way says so on screen before it is used.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ASSIGNABLE_GOALS,
  ENTITLEMENT_LABELS,
  ENTITLEMENT_OPTIONS,
  ENTITLEMENT_SOURCE_NOTES,
  PROGRAM_LENGTH_DAYS,
  displayName,
  entitlementOf,
  entitlementSourceOf,
  formatCount,
  formatDate,
  formatDateTime,
  formatRelativeDay,
  memberInitials,
} from "@/lib/adminMetrics";
import {
  fetchMemberDetail,
  sendCoachMiaMessage,
  updateMemberEntitlement,
  updateMemberGoal,
  updateMemberProgramDay,
} from "@/lib/adminData";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Feedback,
  Field,
  Input,
  Pill,
  RowsSkeleton,
  Segmented,
  Select,
  Textarea,
  useEscape,
  useTransientMessage,
} from "./ui";

const TABS = [
  { value: "profile", label: "Profile" },
  { value: "completions", label: "Days done" },
  { value: "checkins", label: "Check-ins" },
  { value: "chat", label: "Coach Mia" },
];

function entitlementTone(value) {
  if (value === "active" || value === "ios") return "good";
  if (value === "trial") return "accent";
  if (value === "retrying") return "warn";
  if (value === "expired") return "crit";
  return "neutral";
}

function formatHeight(inches) {
  if (!Number.isFinite(inches)) return "Not recorded";
  const feet = Math.floor(inches / 12);
  const rest = inches % 12;
  return `${feet}' ${rest}"`;
}

function Fact({ label, value }) {
  return (
    <div className="min-w-0">
      <p
        className="text-[11px] font-semibold uppercase tracking-[0.12em]"
        style={{ color: "var(--pv-ink-3)" }}
      >
        {label}
      </p>
      <p className="mt-1 truncate text-[14px] font-medium" style={{ color: "var(--pv-ink)" }} title={value}>
        {value}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------
   Sections
   ------------------------------------------------------------------------- */

function ProfileSection({ member, onPatched }) {
  const [goal, setGoal] = useState(member.goalId || "");
  const [day, setDay] = useState(String(member.programDay ?? 1));
  // Seeded from the hand-written note, not from the answer on screen. Seeding
  // it from the answer meant an iPhone member showed as "Paying" in the
  // dropdown, and pressing save quietly froze a live signal from her phone into
  // a note nothing could move again.
  const [entitlement, setEntitlement] = useState(member.entitlementOverride || "");

  const [savingGoal, setSavingGoal] = useState(false);
  const [savingDay, setSavingDay] = useState(false);
  const [savingEnt, setSavingEnt] = useState(false);

  const [goalMessage, showGoalMessage] = useTransientMessage();
  const [dayMessage, showDayMessage] = useTransientMessage();
  const [entMessage, showEntMessage] = useTransientMessage();

  // The version of the app on the App Store never reads her goal back down. It
  // only pushes its own up, on every launch. So a goal changed here holds on
  // the website and is overwritten on her phone the next time she opens it.
  // The day control is different: that one posts a command the phone applies.
  const onPhone = member.platform === "ios";

  useEffect(() => {
    setGoal(member.goalId || "");
    setDay(String(member.programDay ?? 1));
    setEntitlement(member.entitlementOverride || "");
  }, [member.id, member.goalId, member.programDay, member.entitlementOverride]);

  const saveGoal = async () => {
    setSavingGoal(true);
    showGoalMessage(null);
    try {
      await updateMemberGoal(member.id, goal);
      const title = ASSIGNABLE_GOALS.find((g) => g.id === goal)?.title || "";
      onPatched({ goalId: goal, goalTitle: title });
      showGoalMessage({
        tone: "ok",
        text: onPhone
          ? `Saved here and on the website. Her iPhone will set this back to ${member.goalTitle} the next time she opens the app.`
          : `Saved. Her goal is now ${title}.`,
      });
    } catch (error) {
      showGoalMessage({ tone: "error", text: error.message || "That did not save. Try again." });
    } finally {
      setSavingGoal(false);
    }
  };

  const saveDay = async () => {
    setSavingDay(true);
    showDayMessage(null);
    try {
      const value = Number(day);
      // The command has to name the program she is actually on, which is the
      // saved goal, not whatever the goal dropdown above happens to be showing.
      await updateMemberProgramDay(member.id, member.goalId, value);
      onPatched({ programDay: Math.round(value) });
      showDayMessage({
        tone: "ok",
        text: `Saved. She is on day ${Math.round(value)}. Her phone catches up the next time she opens it.`,
      });
    } catch (error) {
      showDayMessage({ tone: "error", text: error.message || "That did not save. Try again." });
    } finally {
      setSavingDay(false);
    }
  };

  const saveEntitlement = async () => {
    setSavingEnt(true);
    showEntMessage(null);
    try {
      // An empty selection CLEARS the note. Without a way out of one, a member
      // marked "Not paying" by hand stayed locked out of the app for ever, even
      // after she subscribed again and was being charged every month.
      const next = entitlement || null;
      await updateMemberEntitlement(member.id, next);
      // All three, so the row behind the panel stops disagreeing with it: the
      // note that was written, what the answer becomes without it, and where
      // that answer now comes from, which is what the Overview tiles count.
      const patchedRaw = { ...(member.raw || {}), entitlementOverride: next };
      onPatched({
        entitlementOverride: next || "",
        entitlement: entitlementOf(patchedRaw),
        entitlementSource: entitlementSourceOf(patchedRaw),
      });
      const cleared = entitlementOf(patchedRaw);
      showEntMessage({
        tone: "ok",
        text: next
          ? `Saved. This dashboard now counts her as ${ENTITLEMENT_LABELS[next].toLowerCase()}. Stripe is not told, and it is not asked.`
          : `Note cleared. She now counts as "${ENTITLEMENT_LABELS[cleared]}" here. ${ENTITLEMENT_SOURCE_NOTES[cleared]}`,
      });
    } catch (error) {
      showEntMessage({ tone: "error", text: error.message || "That did not save. Try again." });
    } finally {
      setSavingEnt(false);
    }
  };

  const dayIsValid = Number.isFinite(Number(day)) && Number(day) >= 1 && Number(day) <= PROGRAM_LENGTH_DAYS;

  return (
    <div className="space-y-6">
      <Card className="p-4" flat style={{ background: "var(--pv-surface-2)" }}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Fact label="Goal" value={member.goalTitle} />
          <Fact
            label="Program day"
            value={
              Number.isFinite(member.programDay)
                ? `Day ${member.programDay} of ${PROGRAM_LENGTH_DAYS}`
                : "Not started"
            }
          />
          <Fact label="Streak" value={`${formatCount(member.streak)} days`} />
          <Fact label="Best streak" value={`${formatCount(member.bestStreak)} days`} />
          <Fact label="Joined" value={formatDate(member.joinedAt, "Not recorded")} />
          <Fact label="Last seen" value={formatRelativeDay(member.lastSeenAt)} />
          <Fact label="Age" value={Number.isFinite(member.age) ? `${member.age}` : "Not recorded"} />
          <Fact label="Height" value={formatHeight(member.heightInches)} />
          <Fact
            label="Weight"
            value={Number.isFinite(member.weightLbs) ? `${member.weightLbs} lbs` : "Not recorded"}
          />
          <Fact label="Signed up on" value={member.platform === "ios" ? "iPhone" : member.platform === "web" ? "The website" : "Not recorded"} />
          <Fact label="App version" value={member.appVersion || "Not recorded"} />
          <Fact label="Email" value={member.email || "None on record"} />
        </div>
      </Card>

      <div className="space-y-5">
        <h4 className="text-[13px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--pv-ink-3)" }}>
          Change something for her
        </h4>

        {/* Goal ------------------------------------------------------------ */}
        <Card className="p-4" flat style={{ background: "var(--pv-surface-2)" }}>
          <Field
            label="Her goal"
            htmlFor={`goal-${member.id}`}
            hint={
              onPhone
                ? "This is the program she is on when she uses the website, and it is what this dashboard counts. Her day number stays where it is. It does NOT change the program on her iPhone: the app on the App Store cannot be told to switch goals, and it puts her own choice back the next time she opens it. To move an iPhone member, ask her to change her goal in the app."
                : "This is the program she is on. Her day number stays where it is."
            }
          >
            <Select id={`goal-${member.id}`} value={goal} onChange={(e) => setGoal(e.target.value)}>
              <option value="">Pick a goal</option>
              {ASSIGNABLE_GOALS.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </Select>
          </Field>
          <div className="mt-3">
            <Button
              onClick={saveGoal}
              disabled={savingGoal || !goal || goal === member.goalId}
            >
              {savingGoal ? "Saving" : "Save her goal"}
            </Button>
          </div>
          <Feedback message={goalMessage} />
        </Card>

        {/* Program day ----------------------------------------------------- */}
        <Card className="p-4" flat style={{ background: "var(--pv-surface-2)" }}>
          <Field
            label="Her program day"
            htmlFor={`day-${member.id}`}
            hint={`A number from 1 to ${PROGRAM_LENGTH_DAYS}. Her phone will mark every day before this one as done, and clear anything she had finished after it. Use this to put someone back where she should be, not as a shortcut.`}
          >
            <Input
              id={`day-${member.id}`}
              type="number"
              inputMode="numeric"
              min="1"
              max={PROGRAM_LENGTH_DAYS}
              value={day}
              onChange={(e) => setDay(e.target.value)}
            />
          </Field>
          <div className="mt-3">
            <Button
              onClick={saveDay}
              disabled={savingDay || !dayIsValid || Number(day) === member.programDay}
            >
              {savingDay ? "Saving" : "Save her day"}
            </Button>
          </div>
          {!dayIsValid ? (
            <p className="mt-2 text-xs font-semibold" style={{ color: "var(--pv-crit)" }}>
              Pick a day between 1 and {PROGRAM_LENGTH_DAYS}.
            </p>
          ) : null}
          <Feedback message={dayMessage} />
        </Card>

        {/* Entitlement ----------------------------------------------------- */}
        <Card className="p-4" flat style={{ background: "var(--pv-surface-2)" }}>
          <Field
            label="Her subscription"
            htmlFor={`ent-${member.id}`}
            hint="This is a note you write on her record, and it is all this dashboard knows about who is paying. It does not charge or refund anybody, it does not talk to Stripe or to Apple, and nothing outside this dashboard reads it except the gate that lets her into the member app. To find out whether she is really subscribed on the website, look her up by email in your Stripe dashboard."
          >
            <Select id={`ent-${member.id}`} value={entitlement} onChange={(e) => setEntitlement(e.target.value)}>
              <option value="">No note (leave it unknown)</option>
              {ENTITLEMENT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <p className="mt-1.5 text-xs" style={{ color: "var(--pv-ink-3)" }}>
            {entitlement
              ? ENTITLEMENT_OPTIONS.find((o) => o.value === entitlement)?.hint
              : `No note on her record. She counts as "${ENTITLEMENT_LABELS[member.entitlement]}" today. ${ENTITLEMENT_SOURCE_NOTES[member.entitlement]}`}
          </p>
          <div className="mt-3">
            <Button
              onClick={saveEntitlement}
              disabled={savingEnt || entitlement === (member.entitlementOverride || "")}
            >
              {savingEnt ? "Saving" : "Save her subscription"}
            </Button>
          </div>
          <Feedback message={entMessage} />
        </Card>
      </div>
    </div>
  );
}

function CompletionsSection({ completions }) {
  if (completions.length === 0) {
    return (
      <EmptyState
        title="She has not finished a day yet"
        description="A day lands here when she watches at least 60% of that day's videos, on the phone or on the web."
      />
    );
  }
  return (
    <ol className="space-y-2">
      {completions.map((c) => (
        <li
          key={c.id}
          className="flex items-center justify-between gap-3 rounded-xl px-3.5 py-3"
          style={{ background: "var(--pv-surface-2)", border: "1px solid var(--pv-border)" }}
        >
          <div className="min-w-0">
            <p className="text-[14px] font-semibold" style={{ color: "var(--pv-ink)" }}>
              Day {Number.isFinite(c.day) ? c.day : "unknown"}
            </p>
            <p className="mt-0.5 text-[12px]" style={{ color: "var(--pv-ink-3)" }}>
              {formatDateTime(c.completedAt, "No date on record")}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {c.creditedFromLegacy ? <Pill>Credited</Pill> : null}
            <span className="pv-tabular text-[12px]" style={{ color: "var(--pv-ink-2)" }}>
              {Math.round((c.secondsWatched || 0) / 60)} min
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}

function CheckinsSection({ checkins }) {
  if (checkins.length === 0) {
    return (
      <EmptyState
        title="No check-ins yet"
        description="The app asks how she is feeling once a day. Her answers show up here."
      />
    );
  }
  const scale = (n) => (Number.isFinite(n) ? `${n} out of 10` : "Not answered");
  return (
    <ol className="space-y-2">
      {checkins.map((c) => (
        <li
          key={c.id}
          className="rounded-xl px-3.5 py-3"
          style={{ background: "var(--pv-surface-2)", border: "1px solid var(--pv-border)" }}
        >
          <p className="text-[13px] font-semibold" style={{ color: "var(--pv-ink)" }}>
            {formatDate(c.date, c.id)}
          </p>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
            <Fact label="Mood" value={c.mood || "Not answered"} />
            <Fact label="Leaks" value={c.leakLevel || "Not answered"} />
            <Fact label="Pain" value={scale(c.painLevel)} />
            <Fact label="Energy" value={scale(c.energyLevel)} />
            <Fact label="Toward her goal" value={scale(c.goalFeeling)} />
          </div>
        </li>
      ))}
    </ol>
  );
}

function ChatSection({ member, chat, onSent }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [message, showMessage] = useTransientMessage(6000);
  const endRef = useRef(null);

  useEffect(() => {
    if (endRef.current) endRef.current.scrollIntoView({ block: "nearest" });
  }, [chat.length]);

  const send = async () => {
    setSending(true);
    showMessage(null);
    try {
      const written = await sendCoachMiaMessage(member.id, text);
      onSent(written);
      setText("");
      showMessage({
        tone: "ok",
        text: "Sent. It appears in her chat as Coach Mia, straight away if her app is open.",
      });
    } catch (error) {
      showMessage({ tone: "error", text: error.message || "That did not send. Try again." });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div
        className="max-h-[46vh] space-y-3 overflow-y-auto rounded-xl p-3"
        style={{ background: "var(--pv-surface-2)", border: "1px solid var(--pv-border)" }}
      >
        {chat.length === 0 ? (
          <EmptyState
            title="No messages yet"
            description="Anything you send below starts the conversation, and she sees it as Coach Mia."
          />
        ) : (
          chat.map((m) => {
            const fromHer = m.role === "user";
            return (
              <div key={m.id} className={`flex ${fromHer ? "justify-end" : "justify-start"}`}>
                <div
                  className="max-w-[85%] rounded-2xl px-3.5 py-2.5"
                  style={
                    fromHer
                      ? { background: "linear-gradient(135deg, #E65473, #C33A5C)", color: "#FFFFFF" }
                      : { background: "var(--pv-surface-solid)", border: "1px solid var(--pv-border)", color: "var(--pv-ink)" }
                  }
                >
                  <p className="whitespace-pre-wrap text-[14px] leading-relaxed">{m.text}</p>
                  <p
                    className="mt-1.5 text-[11px]"
                    style={{ color: fromHer ? "rgba(255,255,255,0.75)" : "var(--pv-ink-3)" }}
                  >
                    {fromHer ? "Her" : m.source === "admin" ? "You, as Coach Mia" : "Coach Mia"}
                    {" · "}
                    {formatDateTime(m.date, "No date on record")}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <div>
        <Field
          label="Send her a message as Coach Mia"
          htmlFor={`chat-${member.id}`}
          hint="She sees this as a message from Coach Mia. She is not told an admin wrote it, so write it in Mia's voice."
        >
          <Textarea
            id={`chat-${member.id}`}
            rows={3}
            maxLength={2000}
            value={text}
            placeholder="Great work this week. Day 12 is a short one, so it is a good day to keep the streak going."
            onChange={(e) => setText(e.target.value)}
          />
        </Field>
        <div className="mt-3 flex items-center gap-3">
          <Button onClick={send} disabled={sending || !text.trim()}>
            {sending ? "Sending" : "Send as Coach Mia"}
          </Button>
          <span className="pv-tabular text-[12px]" style={{ color: "var(--pv-ink-3)" }}>
            {text.trim().length} / 2000
          </span>
        </div>
        <Feedback message={message} />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
   The panel
   ------------------------------------------------------------------------- */

export default function MemberPanel({ member, onClose, onPatched }) {
  const [tab, setTab] = useState("profile");
  const [detail, setDetail] = useState(null);
  const [status, setStatus] = useState("loading");
  const [errorText, setErrorText] = useState("");
  const closeRef = useRef(null);

  useEscape(onClose, true);

  const load = useCallback(async () => {
    setStatus("loading");
    setErrorText("");
    try {
      const next = await fetchMemberDetail(member.id);
      setDetail(next);
      setStatus("ready");
    } catch (error) {
      setErrorText(
        error?.code === "permission-denied"
          ? "Firestore refused to read this member's history. Publish the rules in firestore.rules and try again."
          : error?.message || "Something went wrong reading her history."
      );
      setStatus("error");
    }
  }, [member.id]);

  useEffect(() => {
    setTab("profile");
    load();
  }, [load]);

  useEffect(() => {
    if (closeRef.current) closeRef.current.focus();
  }, [member.id]);

  const handleSent = (written) => {
    setDetail((prev) => (prev ? { ...prev, chat: [...prev.chat, written] } : prev));
  };

  const counts = useMemo(
    () => ({
      completions: detail?.completions.length ?? 0,
      checkins: detail?.checkins.length ?? 0,
      chat: detail?.chat.length ?? 0,
    }),
    [detail]
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={`${displayName(member)}, member details`}>
      {/* The scrim closes on a click, but it is not a tab stop: keyboard users
          get Escape and the close button, and an unlabelled stop in front of
          the panel would only be in the way. */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 h-full w-full"
        style={{ background: "rgba(4, 2, 8, 0.62)", backdropFilter: "blur(2px)" }}
      />

      <div
        className="pv-sheet-in relative flex h-full w-full flex-col md:max-w-[560px]"
        style={{
          background: "var(--pv-canvas)",
          borderLeft: "1px solid var(--pv-border)",
          boxShadow: "var(--pv-shadow)",
        }}
      >
        {/* Header */}
        <div
          className="shrink-0 px-5 pb-4 pt-[max(16px,env(safe-area-inset-top))]"
          style={{ borderBottom: "1px solid var(--pv-border)" }}
        >
          <div className="flex items-start gap-3">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[15px] font-bold"
              style={{
                background: "linear-gradient(135deg, var(--pv-rose), var(--pv-violet))",
                color: "var(--pv-accent-ink)",
              }}
              aria-hidden="true"
            >
              {memberInitials(member)}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-[18px] font-semibold" style={{ color: "var(--pv-ink)" }}>
                {displayName(member)}
              </h3>
              <p className="truncate text-[13px]" style={{ color: "var(--pv-ink-2)" }}>
                {member.email || "No email on record"}
              </p>
              <p className="mt-0.5 truncate text-[11px]" style={{ color: "var(--pv-ink-3)" }} title={member.id}>
                id {member.id}
              </p>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg"
              style={{ background: "var(--pv-surface-2)", border: "1px solid var(--pv-border)", color: "var(--pv-ink)" }}
              aria-label="Close member details"
            >
              ✕
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Pill tone={entitlementTone(member.entitlement)}>{ENTITLEMENT_LABELS[member.entitlement]}</Pill>
            <Pill>{member.goalTitle}</Pill>
            <Pill>
              {Number.isFinite(member.programDay)
                ? `Day ${member.programDay} of ${PROGRAM_LENGTH_DAYS}`
                : "Not started"}
            </Pill>
            <Pill>{`${formatCount(member.streak)} day streak`}</Pill>
          </div>

          <div className="mt-4 overflow-x-auto">
            <Segmented
              label="Which part of her record to look at"
              value={tab}
              onChange={setTab}
              options={TABS.map((t) => ({
                value: t.value,
                label:
                  t.value === "profile"
                    ? t.label
                    : `${t.label}${status === "ready" ? ` (${counts[t.value]})` : ""}`,
              }))}
            />
          </div>
        </div>

        {/* Body */}
        <div className="pv-scroll flex-1 px-5 py-5">
          {tab === "profile" ? (
            <ProfileSection member={member} onPatched={onPatched} />
          ) : status === "loading" ? (
            <RowsSkeleton rows={5} />
          ) : status === "error" ? (
            <ErrorState
              title="Her history did not load"
              description={errorText}
              onRetry={load}
            />
          ) : tab === "completions" ? (
            <CompletionsSection completions={detail.completions} />
          ) : tab === "checkins" ? (
            <CheckinsSection checkins={detail.checkins} />
          ) : (
            <ChatSection member={member} chat={detail.chat} onSent={handleSent} />
          )}
        </div>
      </div>
    </div>
  );
}
