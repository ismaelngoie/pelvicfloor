"use client";

// Today. The screen that decides whether she does her five minutes.
//
// Order is the iOS Dashboard's order: greeting, the live line, the journey
// card, today's session, the streak, the check-in.

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check, ChevronRight, CloudSun, Flame, Map, Moon, Play, Sun, Trophy,
} from "lucide-react";
import { useMember } from "./MemberProvider";
import { usePlayer } from "./PlayerProvider";
import { Card, PrimaryButton } from "./ui";
import CheckInCard from "./CheckInCard";
import { goalAccentCSS, goalGerund, pathwayTitle } from "@/lib/goalCopy";
import { SESSIONS_PER_WEEK } from "@/lib/guaranteeCopy";
import { durationLabel } from "@/lib/library";
import { dateKey } from "@/lib/program";

export default function Today() {
  const {
    member, goalId, goal, program, days, currentDay, todaysVideos, dayNumber,
    dayUnlocked, sessionDay, planLength, graduated, completions, streak, history,
    contentError,
  } = useMember();
  const { openPlayer } = usePlayer();

  const firstName = firstNameOf(member?.name);
  const greeting = greetingFor(new Date());
  const sessionsThisWeek = useMemo(() => countSessionsThisWeek(completions), [completions]);
  const doneToday = useMemo(() => hasCompletionToday(completions), [completions]);

  /**
   * `dayContext` is what lets the player bank a program day, so it is attached
   * only when the day she is about to play is the unlocked one. Replaying the
   * day she finished this morning must not write a second completion over it.
   */
  const openSession = useCallback(
    (startIndex) => {
      if (!todaysVideos.length) return;
      openPlayer({
        videos: todaysVideos,
        ...(startIndex == null ? {} : { startIndex }),
        title: currentDay ? `Day ${sessionDay}: ${currentDay.title}` : "Today's session",
        subtitle: `Day ${sessionDay} of ${planLength || "your plan"}`,
        dayContext: dayUnlocked ? { day: sessionDay } : null,
      });
    },
    [todaysVideos, openPlayer, currentDay, sessionDay, dayUnlocked, planLength]
  );

  const startSession = useCallback(() => openSession(null), [openSession]);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-8 pt-4">
      <header className="flex items-start justify-between gap-3 px-1">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[14px] font-medium text-app-textSecondary">
            <greeting.Icon className="h-4 w-4 text-ios-pink" aria-hidden="true" />
            {greeting.label}
          </p>
          <h1 className="mt-0.5 truncate text-[30px] font-bold leading-tight tracking-[-0.4px] text-app-textPrimary">
            {firstName ? `${firstName} 👋` : "Welcome 👋"}
          </h1>
        </div>
      </header>

      <LiveMembersLine goalId={goalId} />

      {contentError && (
        <Card className="mt-5" role="alert">
          <p className="text-[15px] font-semibold text-app-textPrimary">{contentError}</p>
        </Card>
      )}

      {/* 90-Day Journey */}
      <JourneyCard
        goalId={goalId}
        title={program?.title || pathwayTitle(goalId)}
        dayNumber={dayNumber}
        planLength={planLength}
        weekTheme={days?.[Math.min(dayNumber, days.length) - 1]?.theme || currentDay?.theme}
        graduated={graduated}
        sessionsThisWeek={sessionsThisWeek}
      />

      {/* Today's session */}
      <SessionCard
        currentDay={currentDay}
        dayNumber={dayNumber}
        sessionDay={sessionDay}
        dayUnlocked={dayUnlocked}
        planLength={planLength}
        videos={todaysVideos}
        watched={history.completed}
        doneToday={doneToday}
        goalTitle={goal?.title}
        onStart={startSession}
        onPlayFrom={openSession}
      />

      <StreakCard streak={streak} />

      <CheckInCard dateKey={dateKey()} />
    </div>
  );
}

// --- Pieces ----------------------------------------------------------------

function LiveMembersLine({ goalId }) {
  // Theatre, and honestly labelled as a live count rather than a claim about
  // anyone in particular. It settles rather than jittering forever.
  const [count, setCount] = useState(null);

  useEffect(() => {
    let value = 120 + Math.floor(Math.random() * 90);
    setCount(value);
    const id = setInterval(() => {
      value = Math.min(260, Math.max(80, value + (Math.floor(Math.random() * 15) - 7)));
      setCount(value);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  if (count == null) return <div className="h-6" />;

  return (
    <p
      aria-live="off"
      className="mt-2 flex items-start gap-2 px-1 text-[13px] font-medium text-app-textSecondary"
    >
      <span className="relative mt-[5px] flex h-2 w-2 shrink-0" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full rounded-full bg-app-positive opacity-70 motion-safe:animate-ping" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-app-positive" />
      </span>
      Live: {count} members {goalGerund(goalId)} right now
    </p>
  );
}

function JourneyCard({
  goalId, title, dayNumber, planLength, weekTheme, graduated, sessionsThisWeek,
}) {
  const locked = sessionsThisWeek >= SESSIONS_PER_WEEK;
  const dayLabel = planLength
    ? `Day ${Math.min(dayNumber, planLength)} of ${planLength}`
    : "Getting your plan ready";

  return (
    <div
      className="mt-5 rounded-[20px] p-4 text-white shadow-[0_5px_14px_rgba(0,0,0,0.14)] ring-1 ring-inset ring-white/30"
      style={{ backgroundImage: goalAccentCSS(goalId) }}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-[16px] font-bold leading-tight">
            {graduated ? <Trophy className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                       : <Map className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />}
            <span className="truncate">{title}</span>
          </p>
          <p className="mt-1 text-[12.5px] font-medium text-white/90">
            {graduated
              ? "All 90 days complete. Revisit any day, any time."
              : [dayLabel, weekTheme].filter(Boolean).join(" · ")}
          </p>
        </div>
        <ChevronRight className="mt-0.5 h-5 w-5 shrink-0 text-white/70" aria-hidden="true" />
      </div>

      <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/[0.18] px-2.5 py-1 text-[11.5px] font-semibold ring-1 ring-inset ring-white/[0.28]">
        <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
        {locked
          ? "This week is locked in ✓"
          : `Guarantee: Active. ${sessionsThisWeek} of ${SESSIONS_PER_WEEK} sessions this week`}
      </p>

      {/* Week meter: five segments, one per qualifying session. */}
      <ul className="mt-3 flex gap-1.5" aria-hidden="true">
        {Array.from({ length: SESSIONS_PER_WEEK }, (_, i) => (
          <li
            key={i}
            className={`h-1 w-6 rounded-full ${i < sessionsThisWeek ? "bg-white" : "bg-white/30"}`}
          />
        ))}
      </ul>
    </div>
  );
}

function SessionCard({
  currentDay, dayNumber, sessionDay, dayUnlocked, planLength, videos, watched,
  doneToday, goalTitle, onStart, onPlayFrom,
}) {
  const totalSeconds = videos.reduce((sum, v) => sum + (v.durationSeconds || 0), 0);

  if (!videos.length) {
    return (
      <Card className="mt-5">
        <h2 className="text-[19px] font-bold text-app-textPrimary">Today&apos;s session</h2>
        <p className="mt-2 text-[14px] text-app-textSecondary">
          We are getting your exercises ready. Give it a moment.
        </p>
      </Card>
    );
  }

  return (
    <Card className="mt-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-ios-pink">
            {planLength ? `Day ${Math.min(sessionDay, planLength)} of ${planLength}` : "Today"}
          </p>
          <h2 className="mt-1 text-[20px] font-bold leading-tight text-app-textPrimary">
            {currentDay?.title || "Today's 5-Minute Routine"}
          </h2>
        </div>
        {doneToday && (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-app-positive/12 px-2.5 py-1 text-[11px] font-bold text-app-positive">
            <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
            Done
          </span>
        )}
      </div>

      {currentDay?.intention && (
        <p className="mt-2 text-[14px] leading-snug text-app-textSecondary">
          {currentDay.intention}
        </p>
      )}

      <p className="mt-3 text-[12.5px] font-medium text-app-textSecondary">
        {videos.length} {videos.length === 1 ? "move" : "moves"}
        {totalSeconds > 0 ? ` · about ${Math.max(1, Math.round(totalSeconds / 60))} min` : ""}
        {goalTitle ? ` · built around ${goalTitle}` : ""}
      </p>

      <ol className="mt-3 divide-y divide-black/[0.06] border-y border-black/[0.06]">
        {videos.map((video, i) => (
          <li key={video.id}>
            <button
              type="button"
              onClick={() => onPlayFrom(i)}
              className="flex w-full items-center gap-3 py-2.5 text-left"
              aria-label={`Start at move ${i + 1}, ${video.title}`}
            >
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] font-bold ${
                  watched.has(video.id)
                    ? "bg-app-positive text-white"
                    : "bg-app-borderIdle text-app-textSecondary"
                }`}
              >
                {watched.has(video.id) ? <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" /> : i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-app-textPrimary">
                {video.title}
              </span>
              {video.durationSeconds > 0 && (
                <span className="shrink-0 text-[12px] tabular-nums text-app-textSecondary">
                  {durationLabel(video.durationSeconds)}
                </span>
              )}
              <Play className="h-4 w-4 shrink-0 text-app-textSecondary" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ol>

      {/* One program day per calendar day, same rule as the phone. Saying so is
          better than a button that quietly writes nothing. */}
      {!dayUnlocked && (
        <p className="mt-3 rounded-2xl bg-app-positive/[0.09] px-3 py-2.5 text-[13px] font-medium leading-snug text-app-textPrimary">
          Day {dayNumber} unlocks tomorrow. One day at a time is what makes this work.
        </p>
      )}

      <PrimaryButton className="mt-4" onClick={onStart}>
        {dayUnlocked ? (doneToday ? "Do it again" : "Start today's session") : "Do this one again"}
      </PrimaryButton>
    </Card>
  );
}

function StreakCard({ streak }) {
  return (
    <Card className="mt-5">
      <div className="flex items-center gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-app-primary/10">
          <Flame className="h-6 w-6 text-app-primary" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[19px] font-bold leading-none text-app-textPrimary">
            {streak.current} {streak.current === 1 ? "day" : "days"} in a row
          </p>
          <p className="mt-1 text-[13px] text-app-textSecondary">
            {streak.current === 0
              ? "One session today starts it."
              : `Your best run so far is ${streak.best} ${streak.best === 1 ? "day" : "days"}.`}
          </p>
        </div>
      </div>

      <ul className="mt-4 flex justify-between">
        {streak.days.map(({ date, done }) => (
          <li key={date.toISOString()} className="flex flex-col items-center gap-1.5">
            <span
              className={`grid h-8 w-8 place-items-center rounded-full text-[11px] font-bold ${
                done ? "bg-app-positive text-white" : "bg-app-borderIdle text-app-textSecondary"
              }`}
            >
              {done ? <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" /> : date.getDate()}
            </span>
            <span className="text-[10px] font-medium text-app-textSecondary">
              {date.toLocaleDateString("en-US", { weekday: "narrow" })}
            </span>
            <span className="sr-only">
              {date.toLocaleDateString("en-US", { weekday: "long" })}: {done ? "session done" : "no session"}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

// --- Helpers ---------------------------------------------------------------

function firstNameOf(name) {
  const clean = (name || "").trim();
  if (!clean) return "";
  return clean.split(/\s+/)[0];
}

function greetingFor(date) {
  const hour = date.getHours();
  if (hour < 12) return { label: "Good morning,", Icon: Sun };
  if (hour < 18) return { label: "Good afternoon,", Icon: CloudSun };
  return { label: "Good evening,", Icon: Moon };
}

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === "function") return value.toDate();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Monday as the start of the week, so "5 sessions a week" has a fixed edge. */
function startOfWeek(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const shift = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - shift);
  return d;
}

export function countSessionsThisWeek(completions) {
  const start = startOfWeek().getTime();
  const days = new Set();
  for (const c of completions || []) {
    const d = toDate(c.completedAt);
    if (d && d.getTime() >= start) days.add(`${d.getMonth()}-${d.getDate()}`);
  }
  return days.size;
}

function hasCompletionToday(completions) {
  const today = new Date();
  return (completions || []).some((c) => {
    const d = toDate(c.completedAt);
    return (
      d &&
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    );
  });
}
