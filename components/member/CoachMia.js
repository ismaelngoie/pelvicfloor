"use client";

// Coach Mia™, on the web, for real.
//
// She used to take a message, save it, and tell the member to open an app that
// does not exist on her phone. Google web-app ads land Android users on exactly
// this screen, so that was the whole product failing at the last inch.
//
// Now the reply is generated here, by the same model, with the same persona,
// against the same Firebase project the iPhone talks to:
//   lib/ai/coachMia.js   the ported service and system instruction
//   lib/ai/safety.js     the red flag screen, ported phrase for phrase
//   lib/ai/chatSync.js   her reply written back in the shape iOS writes
//
// The transcript is still a live listener on users/{id}/chat, so a conversation
// started in bed carries on at a desk, and the /admin takeover still lands in
// the same place. Message shape: { role, source, text, date }.
//
// THREE RULES THIS FILE ENFORCES:
//   1. ONE REQUEST AT A TIME. Every entry point is gated on `busy`, so a double
//      tap, the Enter key and a prompt chip cannot all bill at once.
//   2. RED FLAGS NEVER REACH THE NETWORK. isRedFlag() answers first, with the
//      exact sentence Mia's own Tier 1 protocol tells her to say.
//   3. NO RAW ERRORS AND NO DEAD ENDS. Anything that goes wrong becomes one
//      calm sentence and a Try again button. There is no "open the app".

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, RefreshCw, Send, Sparkles } from "lucide-react";
import { useMember } from "./MemberProvider";
import { usePlayer } from "./PlayerProvider";
import { usePrefersReducedMotion } from "./VideoPlayer";
import { messageDate, sendChatMessage, subscribeChat } from "@/lib/memberData";
import { saveCoachReply } from "@/lib/ai/chatSync";
import { askCoach, parseCoachReply, HISTORY_WINDOW } from "@/lib/ai/coachMia";
import { isRedFlag, COACH_RED_FLAG_REPLY } from "@/lib/ai/safety";
import { withoutLongDashes } from "@/lib/ai/text";
import { goalPrompt } from "@/lib/goalCopy";
import { durationLabel } from "@/lib/library";
import { FIXTURES_ON } from "@/lib/devFixtures";

const EXTRA_PROMPTS = [
  "Why does drinking water matter?",
  "How do my breath and pelvic floor work together?",
  "How do I know I'm doing it right?",
];

function newMessageId() {
  return `web_${Date.now()}_${Math.round(Math.random() * 1e6)}`;
}

export default function CoachMia() {
  const {
    member, goal, goalId, streak, currentDay, dayNumber, dayUnlocked, sessionDay,
    planLength, todaysVideos,
  } = useMember();
  const { openPlayer } = usePlayer();
  const reduceMotion = usePrefersReducedMotion();

  // The Firestore transcript, and the handful of messages that are not in it:
  // a live streaming reply, and anything whose write was refused.
  const [saved, setSaved] = useState([]);
  const [unsaved, setUnsaved] = useState([]);
  const [streaming, setStreaming] = useState(null); // { id, text, date }

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [replyError, setReplyError] = useState(null);
  const [lastQuestion, setLastQuestion] = useState("");
  const [saveWarning, setSaveWarning] = useState(false);

  const endRef = useRef(null);
  const inputRef = useRef(null);
  const composerRef = useRef(null);
  // How much room the sticky prompts and composer take at the bottom. The
  // transcript reserves exactly that much, or the last thing Mia said sits
  // underneath them and cannot be scrolled into view. Nobody noticed before
  // because nothing on the web ever wrote a reply long enough to reach it.
  const [composerHeight, setComposerHeight] = useState(0);
  // Only the newest request may write to the screen. A retry started while an
  // older stream is still draining must not be overwritten by it.
  const runRef = useRef(0);
  // THE LATCH THAT ACTUALLY HOLDS. `busy` is state, so every handler reads the
  // value from the render it was created in: two taps landing before React has
  // re-rendered BOTH see false and both bill a request. The composer hides that
  // because sending clears the draft and disables the button, but the starter
  // prompt chips pass their own text and do not care what the draft holds, and
  // they are the first thing a new member touches. A double tap on one chip, or
  // one chip then another, fired two generations and answered only the second:
  // her first question sat in the transcript for ever with no reply, no error
  // and no retry. A ref is written and read in the same tick, so it is the only
  // thing that can gate an event handler.
  const inFlightRef = useRef(false);

  // --- Transcript ----------------------------------------------------------

  useEffect(() => {
    if (!member?.id) return undefined;
    // Local QA only, and deleted from a production bundle: see lib/devFixtures.js.
    if (process.env.NODE_ENV !== "production" && FIXTURES_ON) {
      setLoading(false);
      setLoadError(null);
      return undefined;
    }
    setLoading(true);
    try {
      return subscribeChat(
        member.id,
        (next) => { setSaved(next); setLoading(false); setLoadError(null); },
        () => {
          setLoading(false);
          setLoadError("We could not open your conversation. Check your connection and try again.");
        }
      );
    } catch {
      // Attaching the listener can fail outright, not just error later. Say so
      // rather than leaving her on a spinner that never resolves.
      setLoading(false);
      setLoadError("We could not open your conversation. Check your connection and try again.");
      return undefined;
    }
  }, [member?.id]);

  // A message that reached Firestore is dropped from the local copy, so a
  // bubble never appears twice and never blinks on the way through.
  useEffect(() => {
    if (!saved.length) return;
    const ids = new Set(saved.map((m) => m.id));
    setUnsaved((prev) => (prev.some((m) => ids.has(m.id)) ? prev.filter((m) => !ids.has(m.id)) : prev));
    setStreaming((prev) => (prev && ids.has(prev.id) ? null : prev));
  }, [saved]);

  const messages = useMemo(() => {
    const list = [...saved, ...unsaved];
    if (streaming) list.push({ ...streaming, role: "mia", source: "gemini", live: true });
    return list;
  }, [saved, unsaved, streaming]);

  useEffect(() => {
    const node = composerRef.current;
    if (!node || typeof ResizeObserver === "undefined") {
      setComposerHeight(node?.offsetHeight || 0);
      return undefined;
    }
    const observer = new ResizeObserver(() => setComposerHeight(node.offsetHeight));
    observer.observe(node);
    setComposerHeight(node.offsetHeight);
    return () => observer.disconnect();
  }, [loading]);

  // Follow the conversation down, unless she has scrolled up to re-read
  // something: a streamed reply that yanks the page back every 200ms while she
  // is reading is worse than one she has to scroll to.
  useEffect(() => {
    const end = endRef.current;
    if (!end) return;
    const container = scrollableAncestor(end);
    const distance = container.scrollHeight - container.scrollTop - container.clientHeight;
    if (distance > 400) return;
    container.scrollTo({
      top: container.scrollHeight,
      // A smooth scroll re-targeted on every chunk fights itself. While text is
      // arriving the jump is instant; the arrival of a whole message glides.
      behavior: reduceMotion || streaming ? "auto" : "smooth",
    });
    // `replyError` and `saveWarning` are in here because neither is a message:
    // without them the retry button appears below the fold and she is looking
    // at a question that was never answered and no way to try again.
  }, [messages.length, streaming, composerHeight, replyError, saveWarning, reduceMotion, loading]);

  // --- Asking --------------------------------------------------------------

  const buildContext = useCallback(() => ({
    name: (member?.name || "").trim().split(/\s+/)[0] || "",
    goal: goal?.title || "a stronger pelvic floor",
    streak: streak?.current || 0,
    todaysPlan: todaysVideos.map((v) => v.title),
    programDay: dayNumber || 1,
    weekTheme: currentDay?.theme || null,
  }), [member?.name, goal?.title, streak?.current, todaysVideos, dayNumber, currentDay?.theme]);

  /**
   * Put a message on screen without Firestore.
   *
   * `warn` is false in fixtures mode, where nothing was ever sent, and true
   * when a real write was refused, which is the only case worth telling her
   * about.
   */
  const keepLocally = useCallback((message, { warn = true } = {}) => {
    setUnsaved((prev) => [...prev, message]);
    if (warn) setSaveWarning(true);
  }, []);

  const run = useCallback(
    async (question, { alreadySent = false } = {}) => {
      const body = question.trim();
      if (!body || !member?.id) return;
      // Same tick as the tap, before any await, or it is not a latch.
      if (inFlightRef.current) return;
      inFlightRef.current = true;

      const runId = runRef.current + 1;
      runRef.current = runId;
      setBusy(true);
      setReplyError(null);
      setLastQuestion(body);

      const localOnly = process.env.NODE_ENV !== "production" && FIXTURES_ON;
      const askedAt = new Date();
      const questionId = newMessageId();

      // Her message goes down first, exactly as on the phone. The write is not
      // awaited: Firestore paints it from its local snapshot straight away, and
      // making the reply wait on a round trip would only add a second of
      // silence. A refusal is caught here and the bubble is kept anyway.
      if (!alreadySent) {
        if (localOnly) {
          keepLocally(
            { id: questionId, role: "user", source: "user", text: body, date: askedAt },
            { warn: false }
          );
        } else {
          sendChatMessage(member.id, body).catch(() => {
            keepLocally({ id: questionId, role: "user", source: "user", text: body, date: askedAt });
          });
        }
      }
      setDraft("");

      // GUARD: a red flag is answered here, without a request. Same words the
      // system instruction tells Mia to use, several seconds sooner.
      if (isRedFlag(body)) {
        const replyId = newMessageId();
        inFlightRef.current = false;
        setBusy(false);
        const local = {
          id: replyId, role: "mia", source: "safety", text: COACH_RED_FLAG_REPLY, date: new Date(),
        };
        if (localOnly) {
          keepLocally(local, { warn: false });
        } else {
          saveCoachReply(member.id, COACH_RED_FLAG_REPLY, { id: replyId, source: "safety" })
            .catch(() => keepLocally(local));
        }
        return;
      }

      // History is every turn before this one, oldest first, without the
      // question itself. Same 30 turn window the phone sends.
      const history = messages
        .filter((m) => String(m.text || "").trim())
        .map((m) => ({ role: m.role === "user" ? "user" : "mia", text: String(m.text) }))
        .slice(-HISTORY_WINDOW);
      const fromEnd = [...history].reverse().findIndex((m) => m.role === "user" && m.text === body);
      if (fromEnd >= 0) history.splice(history.length - 1 - fromEnd, 1);

      const replyId = newMessageId();
      let full = "";
      try {
        for await (const chunk of askCoach({ question: body, context: buildContext(), history })) {
          if (runRef.current !== runId) return;
          full += chunk;
          setStreaming({ id: replyId, text: full, date: new Date() });
        }
        if (runRef.current !== runId) return;
        if (!full.trim()) throw new Error("empty-response");

        // The RAW reply is what is stored, markers and all, so the phone can
        // re-derive its routine card the next time it loads the message.
        // Stored with the em dashes and en dashes stripped: this app's copy
        // rules ban them, and a model writes them constantly. The markers the
        // phone parses are untouched.
        const reply = withoutLongDashes(full);
        const local = { id: replyId, role: "mia", source: "gemini", text: reply, date: new Date() };
        if (localOnly) {
          setStreaming(null);
          keepLocally(local, { warn: false });
        } else {
          saveCoachReply(member.id, reply, { id: replyId }).catch(() => {
            setStreaming(null);
            keepLocally(local);
          });
        }
      } catch {
        if (runRef.current !== runId) return;
        setStreaming(null);
        setReplyError(
          "Mia could not answer just now. It is usually the connection, so trying again normally works."
        );
      } finally {
        // Unconditional: the latch is what lets the NEXT question through, so
        // a run that has been superseded must still drop it or the composer is
        // locked for the rest of the session.
        inFlightRef.current = false;
        if (runRef.current === runId) setBusy(false);
      }
    },
    [member?.id, messages, buildContext, keepLocally]
  );

  const send = useCallback(
    (text) => {
      const body = (text ?? draft).trim();
      if (!body || busy) return;
      run(body);
    },
    [draft, busy, run]
  );

  const retry = useCallback(() => {
    if (busy || !lastQuestion) return;
    // Her question is already in the transcript. Only the reply is missing.
    run(lastQuestion, { alreadySent: true });
  }, [busy, lastQuestion, run]);

  // A question handed over from Insights arrives as /app/coach?ask=... It is
  // put in the composer rather than sent, so she can change it first, and the
  // URL is tidied so a refresh does not resurrect it.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const asked = params.get("ask");
    if (!asked) return;
    setDraft(asked.slice(0, 300));
    inputRef.current?.focus();
    params.delete("ask");
    const query = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
  }, []);

  const prompts = useMemo(() => {
    const list = ["What's my plan for today?", goalPrompt(goalId)];
    const extras = [...EXTRA_PROMPTS];
    if (streak.current > 10) extras.push("How do I stay motivated?");
    list.push(extras[Math.floor(Math.random() * extras.length)]);
    return list;
    // Regenerated only when the goal or the streak band changes, so the rail
    // does not reshuffle under her thumb on every render.
  }, [goalId, streak.current > 10]); // eslint-disable-line react-hooks/exhaustive-deps

  const firstName = (member?.name || "").trim().split(/\s+/)[0];
  const groups = useMemo(() => groupMessages(messages), [messages]);
  const waiting = busy && !streaming;

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-black/[0.06] bg-white/90 px-4 py-2.5 backdrop-blur">
        <span className="grid h-[42px] w-[42px] shrink-0 place-items-center overflow-hidden rounded-full bg-app-primary/10 ring-2 ring-app-primary/35">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/coachMiaAvatar.png" alt="" className="h-full w-full object-cover" />
        </span>
        <div className="min-w-0">
          <p className="text-[17px] font-bold leading-tight text-app-textPrimary">Coach Mia™</p>
          <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-app-textSecondary">
            <span className="h-2 w-2 rounded-full bg-app-positive" aria-hidden="true" />
            {loading ? "Connecting..." : busy ? "Typing..." : "Online"}
          </p>
        </div>
      </header>

      {/* Transcript. flex-1 so the composer holds the bottom edge even when the
          conversation is two messages long. */}
      <div
        className="mx-auto w-full max-w-2xl flex-1 px-4 pb-4 pt-4"
        style={{ scrollPaddingBottom: composerHeight, paddingBottom: composerHeight + 16 }}
      >
        {loading && (
          <div className="grid place-items-center py-20">
            <Loader2
              className={`h-7 w-7 text-ios-pink ${reduceMotion ? "" : "animate-spin"}`}
              aria-hidden="true"
            />
            <span className="sr-only">Loading your conversation</span>
          </div>
        )}

        {loadError && (
          <p role="alert" className="rounded-2xl bg-white p-4 text-[14px] text-app-textPrimary">
            {loadError}
          </p>
        )}

        {!loading && !loadError && messages.length === 0 && (
          <EmptyState firstName={firstName} />
        )}

        {!loading && groups.length > 0 && (
          <ol className="space-y-3.5" aria-label="Your conversation with Coach Mia">
            {groups.map((group, gi) => (
              <li key={group.key} className="space-y-1">
                {group.messages.map((message, mi) => (
                  <Bubble
                    key={message.id}
                    message={message}
                    first={mi === 0}
                    last={mi === group.messages.length - 1}
                    isLastGroup={gi === groups.length - 1}
                    onStartRoutine={
                      todaysVideos.length
                        ? () =>
                            openPlayer({
                              videos: todaysVideos,
                              title: currentDay ? `Day ${sessionDay}: ${currentDay.title}` : "Today's session",
                              subtitle: `Day ${sessionDay} of ${planLength || "your plan"}`,
                              // Same rule as the Today tab: no day context when
                              // the next day is held back, so a replay from
                              // Mia's card cannot bank a second completion.
                              dayContext: dayUnlocked ? { day: sessionDay } : null,
                            })
                        : null
                    }
                    routineMeta={{
                      day: sessionDay,
                      planLength,
                      count: todaysVideos.length,
                      seconds: todaysVideos.reduce((s, v) => s + (v.durationSeconds || 0), 0),
                    }}
                  />
                ))}
              </li>
            ))}
          </ol>
        )}

        {waiting && <TypingBubble reduceMotion={reduceMotion} />}

        {replyError && (
          <div
            role="alert"
            className="mt-3.5 rounded-[18px] bg-white p-3.5 shadow-[0_6px_16px_rgba(0,0,0,0.06)]"
          >
            <p className="text-[14px] leading-snug text-app-textPrimary">{replyError}</p>
            <button
              type="button"
              onClick={retry}
              disabled={busy}
              className="mt-2.5 inline-flex items-center gap-2 rounded-full bg-cta-gradient px-4 py-2 text-[13.5px] font-bold text-white disabled:opacity-50"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Try again
            </button>
          </div>
        )}

        {saveWarning && (
          <p role="status" className="mt-3 px-1 text-[12px] leading-snug text-app-textSecondary">
            This part of the conversation is showing on this device only. We could not save it to
            your account, so it may not follow you to your phone.
          </p>
        )}

        <div ref={endRef} />
      </div>

      {/* Prompts */}
      {!loading && (
        // The offset is the height of the phone tab bar, so the composer sits
        // on top of it rather than behind it. From `tab` the tab bar is gone
        // and the rail is beside us, so the offset has to go with it or the
        // composer floats 76px off the bottom of the window.
        <div
          ref={composerRef}
          className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-10 border-t border-black/[0.06] bg-app-background/95 backdrop-blur tab:bottom-0"
        >
          {/* Capped to the transcript's own measure. A composer stretched to
              1300px puts the send button a long way from the last thing she
              read, and the prompt chips end up on a different axis to the
              conversation they belong to. */}
          <ul className="mx-auto flex max-w-2xl gap-2 overflow-x-auto px-4 py-2.5 no-scrollbar">
            {prompts.map((prompt) => (
              <li key={prompt}>
                <button
                  type="button"
                  onClick={() => send(prompt)}
                  disabled={busy}
                  className="flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-app-borderIdle bg-white px-3.5 text-[13px] font-medium text-app-textPrimary disabled:opacity-50"
                >
                  <Sparkles className="h-3.5 w-3.5 shrink-0 text-app-primary" aria-hidden="true" />
                  {prompt}
                </button>
              </li>
            ))}
          </ul>

          {/* Composer */}
          <form
            className="mx-auto max-w-2xl px-4 pb-3"
            onSubmit={(e) => { e.preventDefault(); send(); }}
          >
            <div className="flex items-end gap-2">
              <label className="min-w-0 flex-1">
                <span className="sr-only">Write to Coach Mia</span>
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
                  }}
                  placeholder="Ask Mia anything"
                  className="max-h-32 min-h-[48px] w-full resize-none rounded-[24px] border border-app-borderIdle bg-white px-4 py-3 text-[15px] leading-snug text-app-textPrimary placeholder:text-app-textSecondary focus:border-ios-pink focus:outline-none"
                />
              </label>
              <button
                type="submit"
                disabled={!draft.trim() || busy}
                aria-label="Send your message to Coach Mia"
                className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-cta-gradient text-white disabled:opacity-40"
              >
                {busy ? (
                  <Loader2 className={`h-5 w-5 ${reduceMotion ? "" : "animate-spin"}`} aria-hidden="true" />
                ) : (
                  <Send className="h-5 w-5" aria-hidden="true" />
                )}
              </button>
            </div>

            <p className="mt-2 px-1 text-[11.5px] leading-snug text-app-textSecondary">
              Coach Mia cannot diagnose anything. For anything sudden, painful or new, please see a
              doctor or a pelvic health physiotherapist.
            </p>
          </form>
        </div>
      )}
    </div>
  );
}

// --- Pieces ----------------------------------------------------------------

function EmptyState({ firstName }) {
  return (
    <div className="px-2 py-8 text-center">
      <span className="mx-auto grid h-[92px] w-[92px] place-items-center overflow-hidden rounded-full bg-app-primary/10 shadow-[0_0_30px_rgba(230,84,115,0.25)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/coachMiaAvatar.png" alt="" className="h-full w-full object-cover" />
      </span>
      <h1 className="mt-5 text-[22px] font-bold leading-tight text-app-textPrimary">
        {firstName ? `Hello, ${firstName}! I'm Mia, your personal guide.` : "Hello! I'm Mia, your personal guide."}
      </h1>
      <p className="mx-auto mt-2 max-w-xs text-[15px] font-medium leading-snug text-app-textSecondary">
        Ask me anything about your plan, your exercises, or how you feel today.
      </p>
    </div>
  );
}

/** The three dots, while the first chunk of a reply is still on its way. */
function TypingBubble({ reduceMotion }) {
  return (
    <div className="mt-3.5 flex justify-start pr-14" role="status" aria-label="Coach Mia is typing">
      <div className="flex items-center gap-1.5 rounded-[22px] bg-white px-4 py-3.5 shadow-[0_6px_16px_rgba(0,0,0,0.06)]">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`h-2 w-2 rounded-full bg-app-textSecondary/50 ${reduceMotion ? "" : "animate-bounce"}`}
            style={reduceMotion ? undefined : { animationDelay: `${i * 0.15}s` }}
            aria-hidden="true"
          />
        ))}
      </div>
    </div>
  );
}

function Bubble({ message, first, last, isLastGroup, onStartRoutine, routineMeta }) {
  const mine = message.role === "user";
  const raw = String(message.text || "");
  // Mia points at today's session with the same marker the phone parses:
  // "**Recommendation:** Today's 5-Minute Routine". Rather than printing it we
  // draw the card the phone draws.
  const parsed = mine ? null : parseCoachReply(raw);
  const text = mine ? raw : parsed.body;
  const after = mine ? "" : parsed.after;
  const showsRoutine = !mine && parsed.showsRoutine;
  const at = messageDate(message);

  const radius = mine
    ? `rounded-[22px] ${first ? "" : "rounded-tr-lg"} ${last ? "" : "rounded-br-lg"}`
    : `rounded-[22px] ${first ? "" : "rounded-tl-lg"} ${last ? "" : "rounded-bl-lg"}`;

  const bubbleClass = `px-4 py-2.5 text-[15px] leading-snug ${radius} ${
    mine ? "bg-cta-gradient text-white" : "bg-white text-app-textPrimary shadow-[0_6px_16px_rgba(0,0,0,0.06)]"
  }`;

  return (
    <div className={`flex ${mine ? "justify-end pl-14" : "justify-start pr-14"}`}>
      <div className="max-w-full">
        {text && (
          <div className={bubbleClass} aria-live={message.live ? "polite" : undefined}>
            <p className="whitespace-pre-wrap break-words">{renderInline(text)}</p>
            {last && !after && at && (
              <p className={`mt-1 text-[10.5px] ${mine ? "text-white/70" : "text-app-textSecondary"}`}>
                {at.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
              </p>
            )}
          </div>
        )}

        {showsRoutine && onStartRoutine && (
          <button
            type="button"
            onClick={onStartRoutine}
            className="mt-2 flex w-full items-center gap-3 rounded-[18px] bg-app-primary/[0.07] p-3 text-left ring-1 ring-inset ring-app-primary/25"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-bold text-app-textPrimary">
                Today&apos;s 5-Minute Routine
              </span>
              <span className="mt-0.5 block text-[12.5px] font-medium text-app-textSecondary">
                Day {routineMeta.day}
                {routineMeta.planLength ? ` of ${routineMeta.planLength}` : ""}, {routineMeta.count} short
                {routineMeta.count === 1 ? " move" : " moves"}
                {routineMeta.seconds > 0 ? ` · ${durationLabel(routineMeta.seconds)}` : ""}
              </span>
            </span>
            <span className="shrink-0 rounded-full bg-cta-gradient px-4 py-2 text-[13px] font-bold text-white">
              Start
            </span>
          </button>
        )}

        {/* Whatever she wrote after the routine line, usually the encouragement.
            The phone drops it; there is no reason to lose it here. */}
        {after && (
          <div className={`mt-1 ${bubbleClass}`}>
            <p className="whitespace-pre-wrap break-words">{renderInline(after)}</p>
            {last && at && (
              <p className="mt-1 text-[10.5px] text-app-textSecondary">
                {at.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * The element that actually scrolls. On a phone that is the shell's own
 * scroller, on a laptop it is a different one, and either can change without
 * this file knowing, so it is found rather than named.
 */
function scrollableAncestor(node) {
  let el = node?.parentElement;
  while (el) {
    const overflow = getComputedStyle(el).overflowY;
    if ((overflow === "auto" || overflow === "scroll") && el.scrollHeight > el.clientHeight + 8) {
      return el;
    }
    el = el.parentElement;
  }
  return document.scrollingElement || document.documentElement;
}

/**
 * Her replies are written in a small slice of markdown: `**bold**` and
 * `*emphasis*`. The phone parses both, so printing the asterisks here would
 * make the same message look broken on one device and fine on the other.
 *
 * Read line by line, and an opening asterisk followed by a space is left
 * alone, because that is a bullet: "* Cow Pose" is a list item, not the start
 * of an italic run that swallows the rest of her plan.
 */
function renderInline(text) {
  const nodes = [];

  String(text ?? "").split("\n").forEach((rawLine, index) => {
    if (index > 0) nodes.push({ text: "\n" });
    // She lists today's exercises as "* Cow Pose". A literal asterisk in a chat
    // bubble looks like a bug, so it becomes the bullet it was meant to be.
    let rest = rawLine.replace(/^(\s*)[*-]\s+/, "$1• ");
    // A bound, not a belief: a pathological string cannot spin here.
    for (let guard = 0; rest && guard < 200; guard += 1) {
      const bold = rest.match(/\*\*([^*]+)\*\*/);
      const emphasis = rest.match(/\*([^*\s][^*]*?)\*/);
      const useBold = bold && (!emphasis || bold.index <= emphasis.index);
      const found = useBold ? bold : emphasis;
      if (!found) break;
      if (found.index > 0) nodes.push({ text: rest.slice(0, found.index) });
      nodes.push({ text: found[1], strong: useBold, em: !useBold });
      rest = rest.slice(found.index + found[0].length);
    }
    if (rest) nodes.push({ text: rest });
  });

  return nodes.map((node, i) => {
    if (node.strong) return <strong key={i}>{node.text}</strong>;
    if (node.em) return <em key={i}>{node.text}</em>;
    return <span key={i}>{node.text}</span>;
  });
}

/** A new group starts on a speaker change or a five minute pause, as on iOS. */
function groupMessages(messages) {
  const groups = [];
  let current = null;
  for (const message of messages) {
    const at = messageDate(message);
    const sameSpeaker = current && current.role === message.role;
    const closeInTime =
      current && at && current.lastAt ? at - current.lastAt < 5 * 60 * 1000 : Boolean(current);
    if (sameSpeaker && closeInTime) {
      current.messages.push(message);
      current.lastAt = at || current.lastAt;
    } else {
      current = {
        key: message.id,
        role: message.role,
        messages: [message],
        lastAt: at,
      };
      groups.push(current);
    }
  }
  return groups;
}
