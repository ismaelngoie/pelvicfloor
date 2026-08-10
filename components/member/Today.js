"use client";

// Today. The screen that decides whether she does her five minutes.
//
// This is a replica of the iOS Dashboard (Scene/Main/Today/DashboardView.swift),
// card for card and in the same order:
//
//   1. Header          greeting, icon, name and wave, the live community line,
//                      and her photo on the right
//   2. Program card    the one 90-day pathway card, with the guarantee chip
//   3. In the moment   Urge Rescue and Audio Kegels, the two eyes-free sessions
//   4. Daily routine   the 200px ring with the looping preview and the play
//                      button; the hero of the whole app
//   5. Progress card   the goal-aware message and the thin pink bar
//   6. Streak          the milestone ring, opening the streak journey
//   7. Progress graph  Week / Month / Year, the same bars and dashed goal line
//   8. Check-in        iOS presents this as a sheet; see the note on the card
//   9. Coach tip       the rotating gradient pill
//
// DELIBERATE BROWSER DIFFERENCES are commented where they occur. The short
// version: no haptics, no photo picker, no Live Activity, hover states exist
// here and do not on a phone, and a desktop window is far wider than any phone
// so the same cards are laid out in two columns rather than stretched.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AudioLines, CalendarDays, Check, ChevronDown, ChevronRight, CloudSun, Crown,
  Flame, Footprints, Hand, Lock, Map as MapIcon, Medal, Moon, PartyPopper, Play,
  Rocket, Shield, ShieldHalf, Sparkles, Star, Sun, Sunrise, Trophy,
  // `Map` is aliased because the unaliased name shadows the global Map
  // constructor, and `new Map()` in the chart helper below then throws.
} from "lucide-react";
import { useMember } from "./MemberProvider";
import { usePlayer } from "./PlayerProvider";
import { Card, PrimaryButton, Sheet } from "./ui";
import CheckInCard from "./CheckInCard";
import GuidedSession from "./GuidedSession";
import { coachTipsFor } from "./coachTips";
import { progressMessage } from "./progressMessages";
import { usePrefersReducedMotion } from "./VideoPlayer";
import { goalAccentCSS, goalGerund, pathwaySubtitle, pathwayTitle } from "@/lib/goalCopy";
import { SESSIONS_PER_WEEK } from "@/lib/guaranteeCopy";
import { durationLabel } from "@/lib/library";
import { dateKey, videosForDay } from "@/lib/program";

/** iOS counts today's five minutes as 300 seconds of video. So do we. */
const DAILY_TARGET_SECONDS = 300;

export default function Today() {
  const {
    member, goalId, goal, catalog, days, currentDay, todaysVideos, dayNumber,
    dayUnlocked, sessionDay, planLength, graduated, completions, events, streak,
    history, contentError,
  } = useMember();
  const { openPlayer } = usePlayer();

  const firstName = firstNameOf(member?.name);
  const greeting = greetingFor(new Date());
  const sessionsThisWeek = useMemo(() => countSessionsThisWeek(completions), [completions]);
  const doneToday = useMemo(() => hasCompletionToday(completions), [completions]);
  const todayProgress = useMemo(() => progressToday(events, doneToday), [events, doneToday]);

  /** Which eyes-free session is up, if any. */
  const [session, setSession] = useState(null);
  const [pathwayOpen, setPathwayOpen] = useState(false);

  const graphRef = useRef(null);

  /**
   * Playing a day picked off the pathway. Only the unlocked day banks a
   * completion, exactly as on the phone: revisiting day 6 in week four is a
   * revisit, not a sixth day.
   */
  const playPathwayDay = useCallback(
    (day) => {
      const videos = videosForDay(day, catalog);
      if (!videos.length) return;
      openPlayer({
        videos,
        title: `Day ${day.day}: ${day.title}`,
        subtitle: `Day ${day.day} of ${planLength || "your plan"}`,
        dayContext: day.day === dayNumber && dayUnlocked ? { day: day.day } : null,
      });
    },
    [catalog, openPlayer, planLength, dayNumber, dayUnlocked]
  );

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

  const scrollToGraph = useCallback(() => {
    graphRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-8 pt-4 lg:max-w-5xl lg:px-8 lg:pt-6">
      <DashboardHeader
        greeting={greeting}
        firstName={firstName}
        goalId={goalId}
        name={member?.name}
      />

      {contentError && (
        <Card className="mt-5" role="alert">
          <p className="text-[15px] font-semibold text-app-textPrimary">{contentError}</p>
        </Card>
      )}

      {/* Two columns from 1024, and one below it. The phone order is the iOS
          Dashboard's order top to bottom, and the split keeps it: the cards she
          came here to act on stay first and stay wide, and the ones she came
          here to read move alongside rather than a screen further down.
          `items-start` so a short right column does not stretch its cards. */}
      <div className="lg:grid lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start lg:gap-6">
        <div>
          <JourneyCard
            goalId={goalId}
            // NOT `program.title`. The JSON's own name for the plan is "The
            // 90-Day Leakproof Program"; the name the phone prints on this card
            // (DashboardView reads ProgramStyleProvider.style.pathwayTitle) is
            // "The 90-Day Leakproof Seal". Reading the JSON here gave one plan
            // two names inside one product: this card and the Exercises
            // spotlight said "Program", the You tab said "Seal", and the phone
            // agreed with neither.
            title={pathwayTitle(goalId)}
            dayNumber={dayNumber}
            planLength={planLength}
            weekTheme={days?.[Math.min(dayNumber, days.length) - 1]?.theme || currentDay?.theme}
            graduated={graduated}
            sessionsThisWeek={sessionsThisWeek}
            onOpenPathway={() => setPathwayOpen(true)}
          />

          <InTheMomentCard
            onUrgeRescue={() => setSession("urge")}
            onAudioKegels={() => setSession("kegels")}
          />

          <DailyRoutineCard
            currentDay={currentDay}
            // The day the card is NAMED after, which is the day she is on, not
            // the one she just finished. DashboardView builds this title from
            // `engine.currentDay` (= program.day(currentDayNumber)), so after
            // finishing day 21 the phone's card reads "Day 22: ..." with a full
            // ring and "Day 22 opens tomorrow." under it. Naming day 21 here
            // meant the same member read a different day number on each device.
            headlineDay={days?.[Math.min(dayNumber, days.length || dayNumber) - 1] || currentDay}
            dayNumber={dayNumber}
            sessionDay={sessionDay}
            dayUnlocked={dayUnlocked}
            planLength={planLength}
            graduated={graduated}
            videos={todaysVideos}
            watched={history.completed}
            progress={todayProgress}
            goalTitle={goal?.title}
            onStart={startSession}
            onPlayFrom={openSession}
          />

          <ProgressCard goalId={goalId} progress={todayProgress} onTap={scrollToGraph} />
        </div>

        <div>
          <StreakCard streak={streak} goalId={goalId} completions={completions} />

          <div ref={graphRef}>
            <ProgressGraph events={events} completions={completions} streak={streak} goalId={goalId} />
          </div>

          {/* iOS pops the daily check-in as a sheet a second and a half after
              the dashboard settles. A modal that appears on its own is a dark
              pattern in a browser tab and gets dismissed unread, so the same
              five questions live in a card she opens herself. */}
          <CheckInCard dateKey={dateKey()} />
        </div>
      </div>

      <CoachTipTicker goalId={goalId} />

      <ProgramPathwaySheet
        open={pathwayOpen}
        onClose={() => setPathwayOpen(false)}
        goalId={goalId}
        days={days}
        dayNumber={dayNumber}
        dayUnlocked={dayUnlocked}
        completions={completions}
        planLength={planLength}
        onPlayDay={playPathwayDay}
      />

      {session && (
        <GuidedSession
          kind={session}
          onClose={() => setSession(null)}
          onSessionComplete={() => {
            // A finished eyes-free set is real engagement, but it deliberately
            // does not complete a program day, exactly as on iOS: the 90 days
            // are earned in the guided video sessions.
          }}
        />
      )}
    </div>
  );
}

// --- Header ----------------------------------------------------------------

function DashboardHeader({ greeting, firstName, goalId, name }) {
  return (
    <header className="px-1">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[14px] font-medium text-app-textSecondary">
            <greeting.Icon className={`h-4 w-4 ${greeting.tint}`} aria-hidden="true" />
            {greeting.label}
          </p>
          <h1 className="mt-0.5 truncate text-[32px] font-bold leading-tight tracking-[-0.5px] text-app-textPrimary">
            {firstName ? `${firstName} 👋` : "Welcome 👋"}
          </h1>
        </div>

        {/* iOS lets her tap this to pick a photo from her camera roll. A browser
            upload dialog is a different kind of promise (where does it go, who
            can see it), so the web shows her initials in the same 44px circle
            with the same pink ring. Same anchor, no new data collected. */}
        <span
          aria-hidden="true"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[15px] font-bold text-white ring-2 ring-ios-pink"
          style={{ backgroundImage: "linear-gradient(140deg, #F68AA2 0%, #C33A5C 100%)" }}
        >
          {initialsOf(name)}
        </span>
      </div>

      <LiveMembersLine goalId={goalId} />
    </header>
  );
}

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
    }, 7000); // iOS breathes every 7 seconds.
    return () => clearInterval(id);
  }, []);

  // Always the same box, whether or not the number has landed. The count is
  // seeded in an effect (it has to be: a random number during render is a
  // hydration mismatch), so a 24px placeholder that becomes a two-line 43px
  // sentence pushed the program card, the ring and everything under it down by
  // 19px a frame after first paint. The sentence renders from the first frame
  // with a three-character stand-in, so it wraps to the same number of lines
  // and nothing below it moves.
  const settled = count != null;

  return (
    <p
      aria-live="off"
      className="mt-1 flex items-start gap-2 text-[13px] font-medium text-app-textSecondary"
    >
      <span className="relative mt-[5px] flex h-2 w-2 shrink-0" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full rounded-full bg-app-positive opacity-70 motion-safe:animate-ping" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-app-positive" />
      </span>
      <span className={settled ? undefined : "invisible"}>
        Live: {settled ? count : "000"} members {goalGerund(goalId)} right now
      </span>
    </p>
  );
}

// --- 1. Program pathway card ------------------------------------------------

function JourneyCard({
  goalId, title, dayNumber, planLength, weekTheme, graduated, sessionsThisWeek,
  onOpenPathway,
}) {
  const locked = sessionsThisWeek >= SESSIONS_PER_WEEK;
  const dayLabel = planLength
    ? `Day ${Math.min(dayNumber, planLength)} of ${planLength}`
    : "Getting your plan ready";

  return (
    // A button, because the phone's is one. It carried a chevron.right and no
    // handler: on iOS this card is the door to ProgramPathwayView, and here it
    // was a picture of a door. Anyone who tapped it got nothing.
    <button
      type="button"
      onClick={onOpenPathway}
      className="mt-5 block w-full rounded-[20px] p-4 text-left text-white shadow-[0_5px_14px_rgba(0,0,0,0.14)] ring-1 ring-inset ring-white/30"
      style={{ backgroundImage: goalAccentCSS(goalId) }}
      aria-label={`${title}. Open your 90 day pathway.`}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-[16px] font-bold leading-tight">
            {graduated ? <Trophy className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                       : <MapIcon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />}
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
    </button>
  );
}

/**
 * The 90-day map, the web's ProgramPathwayView.
 *
 * The phone opens this as a full-screen cover from the same card; a browser
 * gets the bottom sheet the rest of this app already uses, because a full-screen
 * takeover with no system back gesture is how a web app traps somebody. Same
 * content and same rules either way: thirteen week chapters, the current one
 * open, a day that is done, a day that is playable, and days that are not yet.
 */
function ProgramPathwaySheet({ open, onClose, goalId, days, dayNumber, dayUnlocked, completions, planLength, onPlayDay }) {
  const currentWeek = Math.floor((dayNumber - 1) / 7) + 1;
  const [expanded, setExpanded] = useState(currentWeek);

  // Reopen on the week she is in, every time. Coming back to a sheet that is
  // still showing week 2 in the eleventh week is a sheet she has to scroll.
  useEffect(() => { if (open) setExpanded(currentWeek); }, [open, currentWeek]);

  const weeks = useMemo(() => {
    const out = new Map();
    for (const day of days || []) {
      const n = day.week || Math.floor((day.day - 1) / 7) + 1;
      if (!out.has(n)) out.set(n, { week: n, theme: day.theme, themeSubtitle: day.themeSubtitle, days: [] });
      out.get(n).days.push(day);
    }
    return [...out.values()].sort((a, b) => a.week - b.week);
  }, [days]);

  const done = useMemo(() => {
    const set = new Set();
    for (const c of completions || []) {
      const n = Number(c.day);
      if (Number.isFinite(n)) set.add(n);
    }
    return set;
  }, [completions]);

  const total = planLength || days?.length || 0;
  const pct = total ? Math.round((done.size / total) * 100) : 0;

  return (
    <Sheet open={open} onClose={onClose} title={pathwayTitle(goalId)} labelledBy="pathway-title">
      <div className="pb-6">
        <p className="text-[14px] leading-snug text-app-textSecondary">{pathwaySubtitle(goalId)}</p>

        {/* ProgramPathwayView.howItWorksLine, word for word. */}
        <p className="mt-3 flex items-start gap-2 rounded-2xl bg-white p-3 text-[12.5px] leading-snug text-app-textSecondary ring-1 ring-inset ring-black/[0.05]">
          <CalendarDays className="mt-px h-4 w-4 shrink-0 text-app-primary" aria-hidden="true" />
          One day at a time. Miss a day? Nothing is lost, you just carry on.
        </p>

        <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-inset ring-black/[0.05]">
          <p className="flex items-baseline justify-between text-[13px] font-semibold text-app-textSecondary">
            <span>{done.size} of {total} days complete</span>
            <span className="tabular-nums text-app-textPrimary">{pct}%</span>
          </p>
          <span className="mt-2 block h-1.5 w-full overflow-hidden rounded-full bg-app-borderIdle">
            <span className="block h-full rounded-full bg-ios-pink" style={{ width: `${pct}%` }} />
          </span>
        </div>

        <ul className="mt-4 space-y-2.5">
          {weeks.map((week) => {
            const openWeek = expanded === week.week;
            const weekDone = week.days.every((d) => done.has(d.day));
            return (
              <li key={week.week} className="overflow-hidden rounded-2xl bg-white ring-1 ring-inset ring-black/[0.05]">
                <button
                  type="button"
                  onClick={() => setExpanded(openWeek ? 0 : week.week)}
                  aria-expanded={openWeek}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
                >
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[12px] font-bold ${
                    weekDone ? "bg-app-positive text-white" : "bg-black/[0.06] text-app-textSecondary"
                  }`}>
                    {weekDone ? <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" /> : week.week}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[10.5px] font-bold uppercase tracking-[1.4px] text-app-textSecondary">
                      Week {week.week}
                    </span>
                    <span className="block truncate text-[15px] font-bold text-app-textPrimary">{week.theme}</span>
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-app-textSecondary transition-transform ${openWeek ? "rotate-180" : ""}`}
                    aria-hidden="true"
                  />
                </button>

                {openWeek && (
                  <ul className="border-t border-black/[0.06]">
                    {week.themeSubtitle && (
                      <li className="px-4 pb-1 pt-2.5 text-[12.5px] leading-snug text-app-textSecondary">
                        {week.themeSubtitle}
                      </li>
                    )}
                    {week.days.map((day) => {
                      const isDone = done.has(day.day);
                      // The same rule the engine uses: everything before today
                      // is open, today is open unless it is being held back
                      // until midnight, and tomorrow is not.
                      const playable = day.day < dayNumber || (day.day === dayNumber && dayUnlocked);
                      const isToday = day.day === dayNumber;
                      return (
                        <li key={day.day}>
                          <button
                            type="button"
                            disabled={!playable}
                            onClick={() => { onPlayDay(day); onClose(); }}
                            className={`flex w-full items-center gap-3 px-4 py-3 text-left ${playable ? "" : "opacity-45"}`}
                          >
                            <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11.5px] font-bold ${
                              isDone ? "bg-app-positive text-white"
                                     : playable ? "bg-ios-pink text-white"
                                                : "bg-app-borderIdle text-app-textSecondary"
                            }`}>
                              {isDone ? <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
                                      : playable ? <Play className="h-3 w-3 fill-white" aria-hidden="true" />
                                                 : <Lock className="h-3 w-3" aria-hidden="true" />}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-[10.5px] font-semibold uppercase tracking-wider text-app-textSecondary">
                                Day {day.day}{isToday ? " · Today" : ""}
                              </span>
                              <span className="block truncate text-[14.5px] font-semibold text-app-textPrimary">
                                {day.title}
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </Sheet>
  );
}

// --- 2. In the moment -------------------------------------------------------

/**
 * The two things she may need between sessions: a 60-second reset for an urge
 * that has already arrived, and a set she can do with her eyes shut.
 *
 * Sits directly under the program card because "right now" outranks "later
 * today", and styled as part of the product, never as a toolbar. Same words,
 * same two tiles and the same rose wash as the iOS InTheMomentCard.
 */
function InTheMomentCard({ onUrgeRescue, onAudioKegels }) {
  return (
    <section
      aria-labelledby="in-the-moment"
      className="mt-5 rounded-[22px] border border-white/50 p-4 shadow-[0_6px_14px_rgba(230,84,115,0.13)]"
      style={{ backgroundImage: "linear-gradient(135deg, rgba(230,84,115,0.10) 0%, rgba(230,84,115,0.03) 100%)" }}
    >
      <p id="in-the-moment" className="flex items-center gap-1.5 text-[10.5px] font-semibold tracking-[1.4px] text-app-textSecondary">
        <Hand className="h-[11px] w-[11px] text-app-primary" aria-hidden="true" />
        IN THE MOMENT
      </p>

      <div className="mt-3.5 grid grid-cols-2 gap-3">
        <MomentTile
          Icon={ShieldHalf}
          title="Urge Rescue"
          subtitle="60 seconds. Right now."
          onClick={onUrgeRescue}
        />
        <MomentTile
          Icon={AudioLines}
          title="Audio Kegels"
          subtitle="Eyes closed. Voice on."
          onClick={onAudioKegels}
        />
      </div>
    </section>
  );
}

function MomentTile({ Icon, title, subtitle, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full flex-col items-start gap-2.5 rounded-2xl border border-app-primary/[0.18] bg-black/[0.035] p-3.5 text-left hover:bg-black/[0.055]"
    >
      <span className="grid h-[38px] w-[38px] place-items-center rounded-full bg-app-primary/[0.15]">
        <Icon className="h-4 w-4 text-app-primary" aria-hidden="true" />
      </span>
      <span className="block text-[15px] font-bold leading-tight text-app-textPrimary">{title}</span>
      <span className="block text-[11.5px] font-medium leading-snug text-app-textSecondary">{subtitle}</span>
    </button>
  );
}

// --- 3. The daily routine ring ---------------------------------------------

/**
 * The hero of the iOS dashboard, rebuilt: a 200px circle carrying a looping,
 * muted preview of today's first exercise, a pink to purple progress arc, and a
 * play button that breathes until she has done something.
 *
 * The still frame paints first and the loop is a decoration, the same contract
 * as `DailyRoutineView` on the phone: first paint never waits on a video
 * stream. The browser cannot ask about Low Data Mode, so it uses
 * `navigator.connection.saveData` and reduced motion instead, which is the same
 * question in the vocabulary a browser actually has.
 */
function DailyRoutineCard({
  currentDay, headlineDay, dayNumber, sessionDay, dayUnlocked, planLength,
  graduated, videos, watched, progress, goalTitle, onStart, onPlayFrom,
}) {
  const reduceMotion = usePrefersReducedMotion();
  const [showMoves, setShowMoves] = useState(false);
  const [loopOn, setLoopOn] = useState(false);
  const complete = progress >= 1;
  const previewUrl = videos[0]?.url || null;

  // The loop only starts once the card has settled, and never on a metered
  // connection or when she has asked for less motion.
  useEffect(() => {
    if (!previewUrl || reduceMotion) return undefined;
    if (typeof navigator !== "undefined" && navigator.connection?.saveData) return undefined;
    const id = setTimeout(() => setLoopOn(true), 800);
    return () => clearTimeout(id);
  }, [previewUrl, reduceMotion]);

  // `headlineDay` is the day she is ON; `currentDay` is the day that plays.
  // They are the same day every day except the evening she finishes one, when
  // the phone still names the next day here. Match the phone.
  const named = headlineDay || currentDay;
  const title = graduated
    ? "Your Daily Mix"
    : named
      ? `Day ${dayNumber}: ${named.title}`
      : "Today's 5-Minute Routine";

  const subtitle = graduated
    ? `You finished all 90 days. Here is a fresh 5 minutes for ${goalTitle || "your goal"}`
    : currentDay
      ? `Today's plan, tailored to ${goalTitle || "your goal"}`
      : `Tailored for your goal: ${goalTitle || "your goal"}`;

  if (!videos.length) {
    // Same silhouette as the real card so nothing jumps when content lands.
    return (
      <Card className="mt-5">
        <div className="h-4 w-[190px] animate-pulse rounded-full bg-black/[0.07]" />
        <div className="mt-2 h-3 w-[240px] animate-pulse rounded-full bg-black/[0.07]" />
        <div className="mx-auto mt-4 h-[200px] w-[200px] animate-pulse rounded-full bg-black/[0.06]" />
        <p className="mt-4 text-center text-[13px] text-app-textSecondary">Preparing today's plan</p>
      </Card>
    );
  }

  const totalSeconds = videos.reduce((sum, v) => sum + (v.durationSeconds || 0), 0);
  const ringLabel = complete
    ? "Today's plan is done 🎉"
    : progress > 0
      ? (graduated ? "Daily Mix" : `Day ${Math.min(dayNumber, planLength || dayNumber)} of ${planLength || 90}`)
      : "Tap to Begin Today's Plan";

  return (
    <Card className="mt-5">
      {/* DailyRoutineView labels this row `star.fill` on a program day and
          `flame.fill` on the daily mix. It was a sparkle here, which is the
          glyph the phone reserves for the Insights tab. */}
      <p className="flex items-center gap-2 text-[17px] font-bold leading-tight text-app-textPrimary">
        {graduated
          ? <Flame className="h-[17px] w-[17px] shrink-0 fill-ios-pink text-ios-pink" aria-hidden="true" />
          : <Star className="h-[17px] w-[17px] shrink-0 fill-ios-pink text-ios-pink" aria-hidden="true" />}
        <span className="min-w-0">{title}</span>
      </p>
      <p className="mt-1 text-[12.5px] text-app-textSecondary">{subtitle}</p>

      <button
        type="button"
        onClick={onStart}
        className="mt-4 flex w-full flex-col items-center"
        aria-label={complete ? "Do today's plan again" : "Start today's plan"}
      >
        <span className="relative block h-[200px] w-[200px]">
          {/* The glass disc under everything. */}
          <span className="absolute inset-0 rounded-full bg-white/70 shadow-[0_5px_10px_rgba(0,0,0,0.10)] ring-1 ring-white/60" />

          {/* The preview, clipped to the circle and inset by 8px like iOS. */}
          <span
            className={`absolute inset-2 overflow-hidden rounded-full ${complete ? "opacity-60 blur-[6px]" : ""}`}
            style={{ backgroundImage: "linear-gradient(135deg, rgba(255,45,85,0.35) 0%, rgba(175,82,222,0.35) 100%)" }}
          >
            {previewUrl && (
              <video
                key={previewUrl}
                src={loopOn ? previewUrl : `${previewUrl}#t=0.6`}
                className="h-full w-full object-cover"
                muted
                playsInline
                loop={loopOn}
                autoPlay={loopOn}
                preload="metadata"
                tabIndex={-1}
                aria-hidden="true"
              />
            )}
          </span>

          {/* The progress arc. */}
          <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full" aria-hidden="true">
            <defs>
              <linearGradient id="pv-ring" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FF2D55" />
                <stop offset="50%" stopColor="#AF52DE" />
                <stop offset="100%" stopColor="#FF2D55" />
              </linearGradient>
            </defs>
            {/* The track. iOS gets this edge free from the glass circle's white
                stroke; on paper it has to be drawn or a fresh day shows a
                video with no ring around it at all. */}
            <circle cx="100" cy="100" r="96" fill="none" stroke="rgba(26,26,38,0.08)" strokeWidth="8" />
            <circle
              cx="100" cy="100" r="96"
              fill="none" stroke="url(#pv-ring)" strokeWidth="8" strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 96}
              strokeDashoffset={2 * Math.PI * 96 * (1 - Math.min(1, Math.max(0, progress)))}
              transform="rotate(-90 100 100)"
              style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.2, 0.8, 0.2, 1)" }}
            />
          </svg>

          {/* The play button, or the tick. */}
          <span className="absolute inset-0 grid place-items-center">
            {complete ? (
              // iOS draws checkmark.circle.fill in the pink to purple gradient
              // on a soft white bloom. Same two layers here.
              <span className="grid h-[74px] w-[74px] place-items-center rounded-full bg-white/85 shadow-[0_0_18px_10px_rgba(255,255,255,0.7)]">
                <Check className="h-11 w-11 text-ios-pink" strokeWidth={3.5} aria-hidden="true" />
              </span>
            ) : (
              <Play
                className={`h-11 w-11 fill-white text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)] ${
                  progress === 0 && !reduceMotion ? "motion-safe:animate-breathe" : ""
                }`}
                aria-hidden="true"
              />
            )}
          </span>
        </span>

        <span className={`mt-2 block text-center text-[13px] ${complete || progress === 0 ? "font-bold text-app-textPrimary" : "text-app-textSecondary"}`}>
          {ringLabel}
        </span>
        {complete && (
          <span className="mt-0.5 block text-center text-[13px] text-app-textPrimary">
            {graduated ? "A fresh mix lands tomorrow." : dayUnlocked ? "A new plan opens tomorrow." : `Day ${dayNumber} opens tomorrow.`}
          </span>
        )}
      </button>

      {/* The card is named after the day she is on, so a replay button has to
          name the day it actually plays or the two disagree on screen. The
          phone has no replay here at all: tapping the ring opens the pathway. */}
      <PrimaryButton className="mt-4" onClick={onStart}>
        {dayUnlocked
          ? (complete ? "Do it again" : "Start today's session")
          : graduated ? "Do this one again" : `Do Day ${sessionDay} again`}
      </PrimaryButton>

      {/* One program day per calendar day, same rule as the phone. Saying so is
          better than a button that quietly writes nothing. Suppressed once the
          ring is full, because the line under the ring has just said it. */}
      {!dayUnlocked && !complete && (
        <p className="mt-3 rounded-2xl bg-app-positive/[0.09] px-3 py-2.5 text-[13px] font-medium leading-snug text-app-textPrimary">
          Day {dayNumber} unlocks tomorrow. One day at a time is what makes this work.
        </p>
      )}

      {/* The move list. The phone has no equivalent, because tapping the ring
          takes over the whole screen and the player's own list is right there.
          A browser tab is not a full-screen cover, so the same information gets
          a disclosure here rather than a second navigation. */}
      <button
        type="button"
        onClick={() => setShowMoves((v) => !v)}
        aria-expanded={showMoves}
        className="mt-3 flex w-full items-center justify-between gap-2 text-[12.5px] font-semibold text-app-textSecondary"
      >
        <span>
          {videos.length} {videos.length === 1 ? "move" : "moves"}
          {totalSeconds > 0 ? ` · about ${Math.max(1, Math.round(totalSeconds / 60))} min` : ""}
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${showMoves ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {showMoves && (
        <ol className="mt-2 divide-y divide-black/[0.06] border-t border-black/[0.06]">
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
                    watched.has(video.id) ? "bg-app-positive text-white" : "bg-app-borderIdle text-app-textSecondary"
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
      )}
    </Card>
  );
}

// --- 4. Progress card -------------------------------------------------------

/** The goal-aware line and the thin bar, turning pink to purple once she is done. */
function ProgressCard({ goalId, progress, onTap }) {
  const complete = progress >= 1;
  const message = progressMessage(goalId, progress);
  const Icon = complete ? PartyPopper : progress > 0 ? Footprints : Sparkles;

  return (
    <button
      type="button"
      onClick={onTap}
      className={`mt-5 block w-full rounded-[20px] border p-4 text-left ${
        complete ? "border-white/25 text-white" : "border-black/[0.08] bg-black/[0.035] text-app-textPrimary"
      }`}
      style={complete ? { backgroundImage: "linear-gradient(135deg, #FF2D55 0%, #AF52DE 100%)" } : undefined}
    >
      <span className="flex items-center gap-4">
        <Icon className={`h-6 w-6 shrink-0 ${complete ? "text-white" : "text-ios-pink"}`} aria-hidden="true" />
        <span className="min-w-0 flex-1 text-[16px] font-bold leading-snug">{message}</span>
      </span>

      {!complete && (
        <span className="mt-2.5 block h-1.5 w-full overflow-hidden rounded-full bg-black/10">
          <span
            className="block h-full rounded-full bg-ios-pink transition-[width] duration-500"
            style={{ width: `${Math.round(Math.min(1, progress) * 100)}%` }}
          />
        </span>
      )}
    </button>
  );
}

// --- 5. Streak --------------------------------------------------------------

const MILESTONES = [
  { days: 3, Icon: Flame },
  { days: 7, Icon: Crown },
  { days: 14, Icon: Medal },
  { days: 30, Icon: Shield },
  { days: 50, Icon: Rocket },
  { days: 100, Icon: Sparkles },
];

/** The goal-personalized badge names, same table as StreakManager on iOS. */
const MILESTONE_TITLES = {
  bladderLeaks: { 7: "Leakproof Warrior", 14: "Confidence Champion", 30: "Control Captain" },
  intimacy: { 7: "Sensation Seeker", 14: "Pleasure Pro", 30: "Intimacy Icon" },
  postpartum: { 7: "Healing Hero", 14: "Recovery Rockstar", 30: "Core Queen" },
};
const FALLBACK_TITLES = { 7: "Weekly Warrior", 14: "Two-Week Triumph", 30: "Month Master" };

function badgeName(goalId, days) {
  return (MILESTONE_TITLES[goalId] || FALLBACK_TITLES)[days] || FALLBACK_TITLES[days] || "Big Win";
}

function StreakCard({ streak, goalId, completions }) {
  const [open, setOpen] = useState(false);
  const count = streak.current;

  const next = MILESTONES.find((m) => m.days > count)?.days ?? count + 1;
  const previous = [...MILESTONES].reverse().find((m) => m.days <= count)?.days ?? 0;
  const toNext = next - previous > 0 ? (count - previous) / (next - previous) : 0;
  const hitToday = MILESTONES.some((m) => m.days === count);

  const Icon = count === 0 ? Sunrise : hitToday ? (MILESTONES.find((m) => m.days === count)?.Icon || Flame) : Flame;
  const title = count === 0
    ? "Start Your First Streak"
    : hitToday
      ? badgeName(goalId, count)
      : `${count}-Day Streak`;
  const body = count === 0
    ? "Finish today's plan and your streak begins."
    : hitToday
      ? `You earned the ${badgeName(goalId, count)} badge. Look at you go.`
      : `Next badge at ${next} days`;

  const size = 56;
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`mt-5 flex w-full items-center gap-4 rounded-[20px] border bg-white p-4 text-left shadow-[0_5px_14px_rgba(0,0,0,0.04)] ${
          hitToday ? "border-ios-yellow" : "border-black/[0.06]"
        }`}
      >
        <span className="relative grid h-14 w-14 shrink-0 place-items-center">
          <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 h-full w-full" aria-hidden="true">
            <defs>
              <linearGradient id="pv-streak" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FF2D55" />
                <stop offset="100%" stopColor="#AF52DE" />
              </linearGradient>
            </defs>
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,45,85,0.2)" strokeWidth="8" />
            <circle
              cx={size / 2} cy={size / 2} r={radius}
              fill="none" stroke="url(#pv-streak)" strokeWidth="8" strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - Math.min(1, Math.max(0, toNext)))}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              style={{ transition: "stroke-dashoffset 1s ease-in-out" }}
            />
          </svg>
          <Icon className="relative h-5 w-5 text-ios-pink" aria-hidden="true" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-[17px] font-bold leading-tight text-app-textPrimary">{title}</span>
          <span className="mt-0.5 block text-[13.5px] leading-snug text-app-textSecondary">{body}</span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-app-textSecondary" aria-hidden="true" />
      </button>

      <StreakJourneySheet
        open={open}
        onClose={() => setOpen(false)}
        streak={streak}
        goalId={goalId}
        completions={completions}
      />
    </>
  );
}

/** iOS presents this as a sheet from the streak card. So does the web. */
function StreakJourneySheet({ open, onClose, streak, goalId, completions }) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstOffset = new Date(year, month, 1).getDay();

  // The whole month, not just the last seven days: this is the calendar iOS
  // fills from `fullWorkoutHistory`, and a month with three dots in it is the
  // reason the sheet is worth opening at all.
  const doneDays = useMemo(() => {
    const set = new Set();
    for (const c of completions || []) {
      const d = toDate(c.completedAt);
      if (d && d.getFullYear() === year && d.getMonth() === month) set.add(d.getDate());
    }
    return set;
  }, [completions, year, month]);

  return (
    <Sheet open={open} onClose={onClose} title="Your Streak" labelledBy="streak-journey">
      <div className="pb-6">
        <ul className="grid grid-cols-3 gap-3">
          <JourneyStat Icon={Flame} label="Current Streak" value={streak.current} tint="text-ios-pink" />
          <JourneyStat Icon={Crown} label="Best Streak" value={streak.best} tint="text-orange-500" />
          <JourneyStat Icon={Footprints} label="Total Sessions" value={completions?.length ?? 0} tint="text-ios-purple" />
        </ul>

        <section className="mt-5 rounded-2xl bg-white p-4" aria-label="This month">
          <p className="text-center text-[15px] font-bold text-app-textPrimary">
            {today.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </p>
          <ul className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] text-app-textSecondary" aria-hidden="true">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <li key={`${d}-${i}`}>{d}</li>)}
          </ul>
          <ul className="mt-1 grid grid-cols-7 gap-1">
            {Array.from({ length: firstOffset }, (_, i) => <li key={`pad-${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const done = doneDays.has(day);
              return (
                <li key={day} className="grid place-items-center">
                  <span
                    className={`grid h-8 w-8 place-items-center rounded-full text-[12px] font-bold ${
                      done ? "bg-ios-pink text-white" : "text-app-textPrimary"
                    }`}
                  >
                    {day}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="mt-5" aria-label="Badges">
          <h3 className="text-[15px] font-bold text-app-textPrimary">Badges</h3>
          <ul className="mt-3 flex gap-3 overflow-x-auto pb-2 no-scrollbar">
            {MILESTONES.map(({ days, Icon }) => {
              const unlocked = streak.best >= days;
              return (
                <li key={days}>
                  <div className={`grid h-[100px] w-[100px] place-items-center rounded-2xl bg-white ${unlocked ? "" : "opacity-60"}`}>
                    <Icon className={`h-9 w-9 ${unlocked ? "text-ios-yellow" : "text-app-borderIdle"}`} aria-hidden="true" />
                    <p className={`mt-1 text-[11px] font-bold ${unlocked ? "text-app-textPrimary" : "text-app-textSecondary"}`}>
                      {days} Days
                    </p>
                    <p className="sr-only">{badgeName(goalId, days)}, {unlocked ? "earned" : "not earned yet"}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </Sheet>
  );
}

function JourneyStat({ Icon, label, value, tint }) {
  return (
    <li className="flex flex-col items-center rounded-2xl bg-white p-3 text-center">
      <Icon className={`h-5 w-5 ${tint}`} aria-hidden="true" />
      <span className="mt-1 text-[24px] font-bold leading-none tabular-nums text-app-textPrimary">{value}</span>
      <span className="mt-1 text-[11px] text-app-textSecondary">{label}</span>
    </li>
  );
}

// --- 6. Progress graph ------------------------------------------------------

const RANGES = [
  { id: "week", label: "Week", title: "This Week's Progress" },
  { id: "month", label: "Month", title: "This Month's Progress" },
  { id: "year", label: "Year", title: "This Year's Progress" },
];

/**
 * The iOS ProgressGraphView: a segmented Week / Month / Year picker, bars that
 * darken as they hit the goal, a dashed goal line across the top, and a streak
 * pill above it all. The drag-to-inspect tooltip on the phone becomes a tap on
 * a bar here, because a finger dragging across a web page scrolls it.
 */
function ProgressGraph({ events, completions, streak, goalId }) {
  const [range, setRange] = useState("week");
  const [picked, setPicked] = useState(null);
  const data = useMemo(() => graphData(events, completions, range), [events, completions, range]);
  const meta = RANGES.find((r) => r.id === range);
  const empty = data.every((d) => d.rawValue === 0);

  useEffect(() => { setPicked(null); }, [range]);

  return (
    <Card className="mt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[17px] font-bold text-app-textPrimary">{meta.title}</h2>
        <div role="tablist" aria-label="How far back" className="flex rounded-lg bg-black/[0.06] p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.id}
              role="tab"
              type="button"
              aria-selected={range === r.id}
              onClick={() => setRange(r.id)}
              className={`h-7 rounded-md px-3 text-[12.5px] font-semibold ${
                range === r.id ? "bg-white text-app-textPrimary shadow-sm" : "text-app-textSecondary"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {streak.current > 0 && (
        <p className="mt-2 flex items-center gap-1.5 text-[12.5px] font-semibold text-ios-pink">
          <Flame className="h-3.5 w-3.5" aria-hidden="true" />
          {streak.current}-Day Streak! Keep the flame alive.
        </p>
      )}

      {empty ? (
        <div className="grid h-[150px] place-items-center text-center">
          <div>
            <p className="text-[15px] font-bold text-app-textPrimary">Start Here</p>
            <p className="mt-1 text-[13px] text-app-textSecondary">
              Your progress shows up here after your first session.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex gap-1">
          <ul className="flex h-[120px] w-[30px] shrink-0 flex-col justify-between text-[9px] font-medium text-app-textSecondary" aria-hidden="true">
            <li>100%</li><li>50%</li><li>0%</li>
          </ul>

          <div className="relative min-w-0 flex-1">
            <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-app-textSecondary/30" aria-hidden="true" />
            <ul className="flex h-[120px] items-end gap-2">
              {data.map((point, i) => (
                <li key={point.label + i} className="flex h-full min-w-0 flex-1 items-end">
                  <button
                    type="button"
                    onClick={() => setPicked(picked === i ? null : i)}
                    aria-label={`${point.label}: ${point.rawValue} ${point.rawValue === 1 ? "workout" : "workouts"}`}
                    className="relative flex h-full w-full items-end"
                  >
                    {picked === i && (
                      <span className="absolute inset-x-0 bottom-full mb-1 flex justify-center">
                        <span className="whitespace-nowrap rounded-full bg-white px-2 py-1 text-[10px] font-bold text-app-textPrimary shadow-md ring-1 ring-black/10">
                          {point.rawValue} {point.rawValue === 1 ? "workout" : "workouts"}
                        </span>
                      </span>
                    )}
                    <span
                      className={`block w-full rounded-full ${
                        point.rawValue === 0
                          ? "bg-black/[0.08]"
                          : point.isToday
                            ? "bg-ios-purple"
                            : point.value >= 1
                              ? "bg-ios-pink"
                              : "bg-ios-pink/60"
                      }`}
                      style={{ height: `${Math.max(2, Math.min(1, point.value) * 100)}%`, transition: "height 500ms cubic-bezier(0.2,0.8,0.2,1)" }}
                    />
                  </button>
                </li>
              ))}
            </ul>
            <ul className="mt-1.5 flex gap-2 text-center text-[10px] font-medium text-app-textSecondary" aria-hidden="true">
              {data.map((point, i) => (
                <li key={point.label + i} className="min-w-0 flex-1 truncate">
                  {point.label.slice(0, 3)}
                  {point.isMilestone ? " ★" : ""}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <table className="sr-only">
        <caption>{meta.title}</caption>
        <thead><tr><th scope="col">Period</th><th scope="col">Workouts</th></tr></thead>
        <tbody>
          {data.map((point, i) => (
            <tr key={point.label + i}><td>{point.label}</td><td>{point.rawValue}</td></tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

// --- 7. Coach tip ticker ----------------------------------------------------

/** The rotating gradient pill from the bottom of the iOS dashboard. */
function CoachTipTicker({ goalId }) {
  const tips = useMemo(() => coachTipsFor(goalId), [goalId]);
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(null);

  useEffect(() => { setIndex(0); }, [goalId]);

  useEffect(() => {
    if (!tips.length) return undefined;
    const id = setInterval(() => setIndex((i) => (i + 1) % tips.length), 5000);
    return () => clearInterval(id);
  }, [tips.length]);

  if (!tips.length) return null;
  const tip = tips[index];
  const { Icon } = tip;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(tip)}
        className="mt-5 flex w-full items-center gap-2 rounded-[15px] px-3 py-2.5 text-left shadow-[0_5px_12px_rgba(175,82,222,0.28)]"
        style={{ backgroundImage: "linear-gradient(135deg, rgba(255,45,85,0.86) 0%, rgba(175,82,222,0.86) 100%)" }}
      >
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/25">
          <Icon className="h-4 w-4 text-white" aria-hidden="true" />
        </span>
        {/* No entry animation on the text itself: a keyed remount every five
            seconds restarts it, and a member who glances at the wrong moment
            reads a blank pill. The icon carries the change instead. */}
        <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-white/90">
          {tip.title}
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-white/70" aria-hidden="true" />
      </button>

      <Sheet open={Boolean(open)} onClose={() => setOpen(null)} title="From your coach" labelledBy="coach-tip">
        {open && (
          <div className="pb-6">
            <span
              className="grid h-12 w-12 place-items-center rounded-2xl"
              style={{ backgroundImage: "linear-gradient(135deg, #FF2D55 0%, #AF52DE 100%)" }}
            >
              <open.Icon className="h-6 w-6 text-white" aria-hidden="true" />
            </span>
            <h3 className="mt-3 text-[20px] font-bold leading-tight text-app-textPrimary">{open.title}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-app-textSecondary">{open.detail}</p>
          </div>
        )}
      </Sheet>
    </>
  );
}

// --- Helpers ---------------------------------------------------------------

function firstNameOf(name) {
  const clean = (name || "").trim();
  if (!clean) return "";
  return clean.split(/\s+/)[0];
}

function initialsOf(name) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "P";
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}

/** Same three bands and the same three icons as `updateGreeting` on iOS. */
function greetingFor(date) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return { label: "Good morning,", Icon: Sun, tint: "text-ios-yellow" };
  if (hour >= 12 && hour < 18) return { label: "Good afternoon,", Icon: CloudSun, tint: "text-app-textSecondary" };
  return { label: "Good evening,", Icon: Moon, tint: "text-ios-purple" };
}

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === "function") return value.toDate();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
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
    return d && isSameDay(d, today);
  });
}

/**
 * Today's ring fill: seconds of video watched today over the five-minute
 * target, exactly as `todaySeconds() / 300` on iOS. A banked day always reads
 * as full, because the day is done whatever the event log says.
 */
function progressToday(events, doneToday) {
  if (doneToday) return 1;
  const today = new Date();
  let seconds = 0;
  for (const e of events || []) {
    const d = toDate(e.date);
    if (d && isSameDay(d, today)) seconds += Number(e.secondsWatched) || 0;
  }
  return Math.min(1, seconds / DAILY_TARGET_SECONDS);
}

/**
 * The bar data. Same three shapes and the same three goals as iOS: six workouts
 * a day, forty-two a week, one hundred and eighty a month.
 */
function graphData(events, completions, range) {
  const counts = new Map();
  const bump = (date) => {
    const d = toDate(date);
    if (!d) return;
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  };
  for (const e of events || []) bump(e.date);
  // A member whose event log has not synced still has her completed days, so
  // the chart is never mysteriously empty for someone who has clearly shown up.
  if (!counts.size) for (const c of completions || []) bump(c.completedAt);

  const at = (d) => counts.get(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`) || 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (range === "week") {
    const start = startOfWeek(today);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const raw = at(d);
      return {
        label: d.toLocaleDateString("en-US", { weekday: "short" }),
        value: Math.min(raw / 6, 1.2),
        rawValue: raw,
        isToday: isSameDay(d, today),
        isMilestone: raw >= 6,
      };
    });
  }

  if (range === "month") {
    return Array.from({ length: 4 }, (_, i) => {
      const end = new Date(today);
      end.setDate(end.getDate() - (3 - i) * 7);
      let raw = 0;
      for (let k = 0; k < 7; k += 1) {
        const d = new Date(end);
        d.setDate(d.getDate() - k);
        raw += at(d);
      }
      return {
        label: `W${i + 1}`,
        value: Math.min(raw / 42, 1.2),
        rawValue: raw,
        isToday: i === 3,
        isMilestone: raw >= 42,
      };
    });
  }

  return Array.from({ length: 12 }, (_, i) => {
    const month = new Date(today.getFullYear(), i, 1);
    let raw = 0;
    for (const [key, value] of counts) {
      const [y, m] = key.split("-").map(Number);
      if (y === today.getFullYear() && m === i) raw += value;
    }
    return {
      label: month.toLocaleDateString("en-US", { month: "short" }),
      value: Math.min(raw / 180, 1.2),
      rawValue: raw,
      isToday: i === today.getMonth(),
      isMilestone: raw > 200,
    };
  });
}
