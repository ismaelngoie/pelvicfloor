"use client";

// Coach Mia™.
//
// The transcript is a live listener on users/{id}/chat, the same subcollection
// the phone reads and writes, so a conversation started in bed carries on at a
// desk. Message shape: { role, source, text, date }.
//
// Replies are composed in the app. The composer says so plainly rather than
// accepting a message and leaving her watching a typing indicator that will
// never resolve, which is the one failure mode worth designing around here.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Send, Smartphone, Sparkles } from "lucide-react";
import { useMember } from "./MemberProvider";
import { usePlayer } from "./PlayerProvider";
import { usePrefersReducedMotion } from "./VideoPlayer";
import { messageDate, sendChatMessage, subscribeChat } from "@/lib/memberData";
import { goalPrompt } from "@/lib/goalCopy";
import { durationLabel } from "@/lib/library";

const APP_STORE_URL = "https://apps.apple.com/us/app/pelvic-floor-core-coach/id6642654729";

const EXTRA_PROMPTS = [
  "Why does drinking water matter?",
  "How do my breath and pelvic floor work together?",
  "How do I know I'm doing it right?",
];

export default function CoachMia() {
  const {
    member, goalId, streak, currentDay, dayUnlocked, sessionDay,
    planLength, todaysVideos,
  } = useMember();
  const { openPlayer } = usePlayer();
  const reduceMotion = usePrefersReducedMotion();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [justSent, setJustSent] = useState(false);

  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!member?.id) return undefined;
    setLoading(true);
    try {
      return subscribeChat(
        member.id,
        (next) => { setMessages(next); setLoading(false); setLoadError(null); },
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

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: reduceMotion ? "auto" : "smooth" });
  }, [messages.length, reduceMotion, loading]);

  const prompts = useMemo(() => {
    const list = ["What's my plan for today?", goalPrompt(goalId)];
    const extras = [...EXTRA_PROMPTS];
    if (streak.current > 10) extras.push("How do I stay motivated?");
    list.push(extras[Math.floor(Math.random() * extras.length)]);
    return list;
    // Regenerated only when the goal or the streak band changes, so the rail
    // does not reshuffle under her thumb on every render.
  }, [goalId, streak.current > 10]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = useCallback(
    async (text) => {
      const body = (text ?? draft).trim();
      if (!body || !member?.id || sending) return;
      setSending(true);
      setSendError(null);
      try {
        await sendChatMessage(member.id, body);
        setDraft("");
        setJustSent(true);
      } catch {
        setSendError("That message did not send. Check your connection and try again.");
      } finally {
        setSending(false);
      }
    },
    [draft, member?.id, sending]
  );

  const firstName = (member?.name || "").trim().split(/\s+/)[0];
  const groups = useMemo(() => groupMessages(messages), [messages]);

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
            {loading ? "Connecting..." : "Online"}
          </p>
        </div>
      </header>

      {/* Transcript. flex-1 so the composer holds the bottom edge even when the
          conversation is two messages long. */}
      <div className="mx-auto w-full max-w-2xl flex-1 px-4 pb-4 pt-4">
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

        {justSent && (
          <p
            role="status"
            className="mt-4 flex items-start gap-2.5 rounded-2xl bg-app-primary/[0.07] p-3.5 text-[13px] leading-snug text-app-textPrimary ring-1 ring-inset ring-app-primary/20"
          >
            <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-app-primary" aria-hidden="true" />
            <span>
              Your message is saved. Mia writes back in the app, and her reply lands right
              here as soon as it is ready.{" "}
              <a
                href={APP_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-app-primary underline underline-offset-2"
              >
                Open the app
              </a>
            </span>
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
        <div className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-10 border-t border-black/[0.06] bg-app-background/95 backdrop-blur tab:bottom-0">
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
                  disabled={sending}
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
                disabled={!draft.trim() || sending}
                aria-label="Send your message to Coach Mia"
                className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-cta-gradient text-white disabled:opacity-40"
              >
                {sending ? (
                  <Loader2 className={`h-5 w-5 ${reduceMotion ? "" : "animate-spin"}`} aria-hidden="true" />
                ) : (
                  <Send className="h-5 w-5" aria-hidden="true" />
                )}
              </button>
            </div>

            <p className="mt-2 px-1 text-[11.5px] leading-snug text-app-textSecondary">
              Mia writes back in the app. Send here and her reply shows up in both places.
            </p>
            {sendError && (
              <p role="alert" className="mt-1 px-1 text-[12px] text-app-primary">{sendError}</p>
            )}
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

/**
 * Mia can point at today's session with a magic token in her reply. Rather than
 * printing the token we draw the card the phone draws.
 */
const ROUTINE_TOKEN = /\[\[\s*START_ROUTINE\s*\]\]/i;

function Bubble({ message, first, last, isLastGroup, onStartRoutine, routineMeta }) {
  const mine = message.role === "user";
  const raw = String(message.text || "");
  const showsRoutine = !mine && ROUTINE_TOKEN.test(raw);
  const text = raw.replace(ROUTINE_TOKEN, "").trim();
  const at = messageDate(message);

  const radius = mine
    ? `rounded-[22px] ${first ? "" : "rounded-tr-lg"} ${last ? "" : "rounded-br-lg"}`
    : `rounded-[22px] ${first ? "" : "rounded-tl-lg"} ${last ? "" : "rounded-bl-lg"}`;

  return (
    <div className={`flex ${mine ? "justify-end pl-14" : "justify-start pr-14"}`}>
      <div className={mine ? "max-w-full" : "max-w-full"}>
        {text && (
          <div
            className={`px-4 py-2.5 text-[15px] leading-snug ${radius} ${
              mine
                ? "bg-cta-gradient text-white"
                : "bg-white text-app-textPrimary shadow-[0_6px_16px_rgba(0,0,0,0.06)]"
            }`}
          >
            <p className="whitespace-pre-wrap break-words">{renderInline(text)}</p>
            {last && at && (
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
      </div>
    </div>
  );
}

/** Mia writes **bold** in her replies. Render it, do not print the asterisks. */
function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
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
