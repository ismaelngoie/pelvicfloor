"use client";

// The Today tab, a port of "Pelvic Floor/Scene/Main/Today/DashboardView.swift"
// in the Atelier design the phone ships: paper behind everything, the serif
// greeting, the seal card with the week ring, the video session card, the
// guided audio row, the in-the-moment tiles, the progress card, weekly
// consistency, the progress graph, the trackers, the coach insight and the
// private Q&A card. Same order as the phone, top to bottom.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUp, ArrowUpRight, AudioLines, CalendarClock, Check, CheckCircle2, ChevronDown, Clock,
  Droplet, Flame, Heart, HeartPulse, Leaf, Lock, PartyPopper, Play, RefreshCw, ShieldCheck,
  ShieldHalf, Sparkles, Baby, PersonStanding, Hexagon, Activity, Cross, CircleDashed, Footprints,
} from "lucide-react";
import { useMember } from "./MemberProvider";
import { usePlayer } from "./PlayerProvider";
import { Sheet } from "./ui";
import { ACard, ARow, Chevron, Eyebrow, RoseAction, Serif } from "./atelierUI";
import CheckInCard from "./CheckInCard";
import BladderDiary from "./BladderDiary";
import GuidedSession from "./GuidedSession";
import { CSectionQuickCard, MensQuickCard, WaterQuickCard, WomensQuickCard } from "./TrackerCards";
import { coachTipsFor } from "./coachTips";
import { usePrefersReducedMotion } from "./VideoPlayer";
import { deleteDiaryEntry, fetchDiaryEntries, logDiaryEntry } from "./youStore";
import { fetchCheckIn } from "@/lib/memberData";
import { openBillingPortal } from "@/lib/memberBilling";
import { loadInsightArticles } from "@/lib/ai/insightLibrary";
import { pathwaySubtitle, pathwayTitle } from "@/lib/goalCopy";
import { SESSIONS_PER_WEEK } from "@/lib/guaranteeCopy";
import { durationLabel } from "@/lib/library";
import { videosForDay } from "@/lib/program";
import { dashboardSession } from "@/components/funnel/revealCopy";

/** iOS counts today's five minutes as 300 seconds of video. So do we. */
const DAILY_TARGET_SECONDS = 300;
const MENS_ONLY = new Set(["prostateRecovery", "bowelControl"]);

export default function Today() {
  const {
    member, goalId, focusId, goal, catalog, days, currentDay, headlineDay, todaysVideos,
    currentDayNumber, currentDayUnlocked, replayDayNumber, sessionDayNumber,
    bankableDayNumber, completedDayCount, highestUnlockedDay, todayKey,
    planLength, graduated, completions, events, streak, history, contentError,
    patchMember, entitlement,
  } = useMember();
  const { openPlayer } = usePlayer();
  const router = useRouter();
  const mens = member?.pathway === "mensPelvicHealth" || MENS_ONLY.has(goalId);
  const pathway = mens ? "mensPelvicHealth" : "womensPelvicHealth";
  const firstName = firstNameOf(member?.name);
  const greeting = greetingFor(new Date());

  const sessionsThisWeek = useMemo(() => countSessionsThisWeek(completions), [completions, todayKey]);
  const doneToday = useMemo(() => hasCompletionToday(completions), [completions, todayKey]);
  const todayProgress = useMemo(() => progressToday(events, doneToday), [events, doneToday, todayKey]);
  const started = completedDayCount > 0 || currentDayNumber > 1 || todayProgress > 0;
  const programWeek = Math.min(13, Math.floor((Math.max(1, currentDayNumber) - 1) / 7) + 1);
  const weekDone = useMemo(() => countWeekDone(completions, currentDayNumber), [completions, currentDayNumber]);

  const [session, setSession] = useState(null);
  const [pathwayOpen, setPathwayOpen] = useState(false);
  const graphRef = useRef(null);

  const playPathwayDay = useCallback(
    (day) => {
      const videos = videosForDay(day, catalog);
      if (!videos.length) return;
      const banks = day.day === bankableDayNumber;
      openPlayer({
        videos,
        title: `Day ${day.day}: ${day.title}`,
        subtitle: banks ? `Day ${day.day} of ${planLength || "your plan"}` : `Replay of Day ${day.day}`,
        dayContext: banks ? { day: day.day } : null,
      });
    },
    [catalog, openPlayer, planLength, bankableDayNumber]
  );

  const openSession = useCallback(
    (startIndex) => {
      if (!todaysVideos.length) return;
      const banks = sessionDayNumber === bankableDayNumber;
      openPlayer({
        videos: todaysVideos,
        ...(startIndex == null ? {} : { startIndex }),
        title: currentDay ? `Day ${sessionDayNumber}: ${currentDay.title}` : "Today's session",
        subtitle: banks ? `Day ${sessionDayNumber} of ${planLength || "your plan"}` : `Replay of Day ${sessionDayNumber}`,
        dayContext: banks ? { day: sessionDayNumber } : null,
      });
    },
    [todaysVideos, openPlayer, currentDay, sessionDayNumber, bankableDayNumber, planLength]
  );
  const startSession = useCallback(() => openSession(null), [openSession]);
  const scrollToGraph = useCallback(() => {
    graphRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const audio = dashboardSession(goalId, pathway, focusId);
  // The web-only "Tighten Vaginal Canal" focus names her plan; every other
  // member reads her goal tile's title.
  const planLabel = goalId === "intimacy" && focusId === "intimacy.tightening" ? "Tighten Vaginal Canal" : goal?.title;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-8 pt-4 lg:max-w-5xl lg:px-8 lg:pt-6">
      <DashboardHeader greeting={greeting} firstName={firstName} goalId={goalId} mens={mens} name={member?.name} started={started} currentDayNumber={currentDayNumber} />

      {contentError && (
        <ACard className="mt-5 p-4" role="alert">
          <p className="text-[15px] font-semibold text-atelier-ink">{contentError}</p>
        </ACard>
      )}

      <div className="lg:grid lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start lg:gap-6">
        <div>
          <SealCard
            title={journeyTitle(goalId, mens, focusId)}
            subtitle={
              graduated
                ? "All 90 days complete. Revisit any day, any time."
                : started
                  ? `Week ${programWeek} · ${headlineDay?.theme || currentDay?.theme || ""}`.replace(/ · $/, "")
                  : "Your complete 90-day plan is ready"
            }
            dayNumber={graduated ? null : Math.min(Math.max(1, currentDayNumber), planLength || 90)}
            total={planLength || 90}
            weekDone={started ? weekDone : 0}
            sessionsThisWeek={sessionsThisWeek}
            programWeek={started ? programWeek : 1}
            graduated={graduated}
            onTap={() => setPathwayOpen(true)}
          />
          <CanceledAccessCard entitlement={entitlement} />
          <DailySessionCard
            currentDay={currentDay}
            headlineDay={headlineDay || currentDay}
            currentDayNumber={currentDayNumber}
            replayDayNumber={replayDayNumber}
            currentDayUnlocked={currentDayUnlocked}
            planLength={planLength}
            graduated={graduated}
            videos={todaysVideos}
            watched={history?.completed || new Set()}
            progress={todayProgress}
            goalTitle={planLabel}
            onStart={startSession}
            onPlayFrom={openSession}
          />
          {audio && (
            <GuidedAudioCard
              session={audio}
              onOpen={() => setSession(goalId === "bladderLeaks" || goalId === "postpartum" ? "urge" : "kegels")}
            />
          )}
          {(goalId === "bladderLeaks" || goalId === "postpartum") && (
            <InTheMomentCard goalId={goalId} onUrgeRescue={() => setSession("urge")} onAudioKegels={() => setSession("kegels")} />
          )}
          <ProgressCard progress={todayProgress} goalTitle={planLabel} onTap={todayProgress > 0 ? scrollToGraph : startSession} />
        </div>
        <div>
          <WeeklyConsistencyCard completions={completions} streak={streak} goalId={goalId} mens={mens} todayKey={todayKey} />
          <div ref={graphRef}>
            <ProgressGraph events={events} completions={completions} streak={streak} goalId={goalId} mens={mens} />
          </div>
          <TrackCard goalId={goalId} focusId={focusId} mens={mens} member={member} todayKey={todayKey} />
          {mens
            ? <MensQuickCard goalId={goalId} member={member} patchMember={patchMember} />
            : <WomensQuickCard member={member} patchMember={patchMember} />}
          <WaterQuickCard member={member} patchMember={patchMember} />
          {!mens && <CSectionQuickCard />}
          <CoachInsightCard goalId={goalId} mens={mens} router={router} />
          <AskAnythingCard mens={mens} onOpen={() => router.push("/app/insights?ask=1")} />
        </div>
      </div>

      <ProgramPathwaySheet
        open={pathwayOpen}
        onClose={() => setPathwayOpen(false)}
        goalId={goalId}
        focusId={focusId}
        days={days}
        currentDayNumber={currentDayNumber}
        currentDayUnlocked={currentDayUnlocked}
        highestUnlockedDay={highestUnlockedDay}
        completedDayCount={completedDayCount}
        graduated={graduated}
        completions={completions}
        planLength={planLength}
        onPlayDay={playPathwayDay}
      />
      {session && (
        <GuidedSession kind={session} onClose={() => setSession(null)} onSessionComplete={() => {}} />
      )}
    </div>
  );
}

// --- Header ------------------------------------------------------------------

function DashboardHeader({ greeting, firstName, goalId, mens, name, started, currentDayNumber }) {
  const weekday = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const eyebrow = started && currentDayNumber <= 90
    ? `${weekday} · Week ${Math.min(13, Math.floor((currentDayNumber - 1) / 7) + 1)}`
    : weekday;
  return (
    <header className="flex items-start justify-between gap-3 px-1">
      <div className="min-w-0">
        <Eyebrow tone="ink2">{eyebrow}</Eyebrow>
        <h1 className="mt-1.5 font-serif text-[33px] leading-[1.06] text-atelier-ink">
          {greeting.replace(",", "")},<br />
          <em className="italic">{firstName ? `${firstName}.` : "welcome."}</em>
        </h1>
        <CommunityPulse goalId={goalId} mens={mens} />
      </div>
      <span
        aria-hidden="true"
        className="mt-3.5 grid h-[42px] w-[42px] shrink-0 place-items-center rounded-full border border-atelier-line bg-atelier-card text-[15px] font-bold text-atelier-ink3"
      >
        {initialsOf(name)}
      </span>
    </header>
  );
}

/** CommunityPulseViewModel, ported: hour-banded ranges, a nudge every 7 seconds. */
function CommunityPulse({ goalId, mens }) {
  const [count, setCount] = useState(null);
  useEffect(() => {
    const range = () => {
      const h = new Date().getHours();
      if ((h >= 6 && h <= 9) || (h >= 18 && h <= 21)) return [900, 1200];
      if (h >= 10 && h <= 17) return [600, 850];
      if (h >= 22 || h <= 5) return [400, 550];
      return [500, 650];
    };
    const [lo, hi] = range();
    let value = lo + Math.floor(Math.random() * (hi - lo + 1));
    setCount(value);
    const id = setInterval(() => {
      const [a, b] = range();
      let next = Math.min(Math.max(value + (Math.floor(Math.random() * 31) - 12), a), b);
      if (next === value) next = value >= b ? value - 6 : value + 6;
      value = next;
      setCount(value);
    }, 7000);
    return () => clearInterval(id);
  }, []);
  const phrase = pulsePhrase(goalId, mens);
  const settled = count != null;
  return (
    <p aria-live="off" className="mt-2 flex items-center gap-2 text-[13px] font-medium text-atelier-ink2">
      <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-60 motion-safe:animate-ping" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
      </span>
      <span className={settled ? "tabular-nums" : "invisible"}>Live · {settled ? count : "000"} members {phrase} now</span>
    </p>
  );
}

function pulsePhrase(goalId, mens) {
  switch (goalId) {
    case "intimacy": return mens ? "improving erections and control" : "improving intimacy";
    case "bladderLeaks": return "improving bladder control";
    case "postpartum": return "supporting postpartum recovery";
    case "pregnancyPrep": return "preparing for pregnancy";
    case "pelvicPain": return "easing pelvic discomfort";
    case "diastasisRecti": return "fixing diastasis recti";
    case "fitness": return "building whole-body strength";
    case "prolapse": return "building pelvic support";
    case "prostateRecovery": return "rebuilding control after prostate treatment";
    case "bowelControl": return "improving bowel control";
    case "coreStrength":
    case "stability": return "building core stability";
    default: return "improving pelvic health";
  }
}

// --- The seal card ---------------------------------------------------------------

function journeyTitle(goalId, mens, focusId) {
  switch (goalId) {
    case "intimacy":
      if (mens) return "90-Day Erection and Control Plan";
      return focusId === "intimacy.tightening" ? "90-Day Vaginal Tightening Journey" : "90-Day Intimacy Journey";
    case "bladderLeaks": return "90-Day Bladder Control Journey";
    case "postpartum": return "90-Day Postpartum Recovery";
    case "pregnancyPrep": return "90-Day Pregnancy Preparation";
    case "diastasisRecti": return "90-Day Diastasis Recovery";
    case "pelvicPain": return "90-Day Pelvic Comfort Journey";
    case "coreStrength": return "90-Day Core Strength Journey";
    case "fitness": return "90-Day Fitness Journey";
    case "stability": return "90-Day Stability Journey";
    case "prolapse": return "90-Day Pelvic Support Journey";
    case "prostateRecovery": return "90-Day Prostate Recovery Journey";
    case "bowelControl": return "90-Day Bowel Control Journey";
    default: return "90-Day Core Strength Journey";
  }
}

function guaranteeHeadline(sessions, week) {
  return sessions >= SESSIONS_PER_WEEK ? `Week ${week} goal complete ✓` : `Week ${week}: ${sessions} of ${SESSIONS_PER_WEEK} sessions`;
}

/** SealRing: seven segments, the done ones filled. */
function SealRing({ done, total = 7, size, lineWidth, color, children }) {
  const r = (size - lineWidth) / 2;
  const c = 2 * Math.PI * r;
  const gap = 0.018;
  return (
    <span className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 h-full w-full" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => {
          const start = i / total + gap;
          const end = (i + 1) / total - gap;
          const filled = i < done;
          return (
            <circle
              key={i}
              cx={size / 2} cy={size / 2} r={r} fill="none"
              stroke={filled ? color : "rgba(28,24,32,0.08)"} strokeWidth={lineWidth} strokeLinecap="round"
              strokeDasharray={`${(end - start) * c} ${c}`}
              strokeDashoffset={-start * c}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          );
        })}
      </svg>
      <span className="relative flex flex-col items-center">{children}</span>
    </span>
  );
}

function SealCard({ title, subtitle, dayNumber, total, weekDone, sessionsThisWeek, programWeek, graduated, onTap }) {
  const locked = sessionsThisWeek >= SESSIONS_PER_WEEK;
  const ring = locked ? "#6F8F7A" : "#E65473";
  const size = 124;
  return (
    <button type="button" onClick={onTap} className="mt-5 block w-full text-left" aria-label={`${title}. ${subtitle}. ${guaranteeHeadline(sessionsThisWeek, programWeek)}`}>
      <ACard className="flex items-center gap-4 p-4">
        {dayNumber != null ? (
          <SealRing done={weekDone} size={size} lineWidth={size * 0.068} color={ring}>
            <span className="font-mono text-[9.5px] font-medium uppercase tracking-[0.14em] text-atelier-ink2">DAY</span>
            <span className="font-serif leading-none text-atelier-ink" style={{ fontSize: size * 0.33 }}>{dayNumber}</span>
            <span className="text-[9.5px] font-medium text-atelier-ink2">of {total}</span>
          </SealRing>
        ) : (
          <SealRing done={7} size={size} lineWidth={8} color="#6F8F7A">
            <PartyPopper className="h-8 w-8 text-atelier-sage" aria-hidden="true" />
          </SealRing>
        )}
        <span className="min-w-0 flex-1">
          <span className="block font-serif text-[23px] leading-[1.08] text-atelier-ink">{title}</span>
          <span className="mt-1.5 block text-[12.5px] font-medium leading-snug text-atelier-ink2">{subtitle}</span>
          <span className="mt-2 flex gap-1" aria-hidden="true">
            {Array.from({ length: SESSIONS_PER_WEEK }, (_, i) => (
              <span key={i} className="h-1 w-[26px] max-w-full rounded-full" style={{ background: i < sessionsThisWeek ? ring : "rgba(28,24,32,0.10)" }} />
            ))}
          </span>
          <span className={`mt-1.5 block text-[11.5px] font-semibold ${locked ? "text-atelier-sage" : "text-atelier-rosewood"}`}>
            {graduated ? "All 90 days complete" : guaranteeHeadline(sessionsThisWeek, programWeek)}
          </span>
        </span>
        <Chevron />
      </ACard>
    </button>
  );
}

// --- Cancelled but still open ------------------------------------------------------

function CanceledAccessCard({ entitlement }) {
  const [busy, setBusy] = useState(false);
  const end = entitlement?.currentPeriodEnd ? new Date(entitlement.currentPeriodEnd) : null;
  const cancelled = Boolean(entitlement?.cancelAtPeriodEnd || entitlement?.status === "canceled" || entitlement?.willRenew === false);
  if (!cancelled || !end || Number.isNaN(end.getTime()) || end.getTime() < Date.now()) return null;
  return (
    <section className="mt-5 rounded-[22px] border border-atelier-rose/[0.22] bg-atelier-rose/[0.08] p-[17px]">
      <div className="flex items-center gap-[11px]">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-atelier-rose text-white" aria-hidden="true">
          <CalendarClock className="h-5 w-5" />
        </span>
        <div>
          <Eyebrow>YOUR PLAN IS STILL OPEN</Eyebrow>
          <p className="text-[17px] font-bold text-atelier-ink">Full access until {end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
        </div>
      </div>
      <p className="mt-3 text-[14px] leading-snug text-atelier-ink2">
        Keep using every workout, audio, tracker and report. If your plan is helping, you can turn renewal back on before access ends.
      </p>
      <RoseAction
        className="mt-3.5 rounded-full"
        onClick={async () => {
          setBusy(true);
          try { await openBillingPortal(window.location.href); } finally { setBusy(false); }
        }}
        disabled={busy}
      >
        <RefreshCw className="h-4 w-4" aria-hidden="true" /> Keep My Plan Active
      </RoseAction>
    </section>
  );
}

// --- Today's session ---------------------------------------------------------------

function DailySessionCard({
  currentDay, headlineDay, currentDayNumber, replayDayNumber, currentDayUnlocked, planLength,
  graduated, videos, watched, progress, goalTitle, onStart, onPlayFrom,
}) {
  const reduceMotion = usePrefersReducedMotion();
  const [showMoves, setShowMoves] = useState(false);
  const [loopOn, setLoopOn] = useState(false);
  const complete = progress >= 1;
  const previewUrl = videos[0]?.url || null;
  useEffect(() => {
    if (!previewUrl || reduceMotion) return undefined;
    if (typeof navigator !== "undefined" && navigator.connection?.saveData) return undefined;
    const id = setTimeout(() => setLoopOn(true), 800);
    return () => clearTimeout(id);
  }, [previewUrl, reduceMotion]);

  const isChallenge = !graduated && Boolean(headlineDay);
  const dayNumber = Math.min(currentDayNumber, planLength || currentDayNumber);
  const title = graduated ? "Your Daily Mix" : headlineDay ? headlineDay.title : "Today's 5-Minute Routine";
  const eyebrow = isChallenge ? `DAY ${dayNumber} · 5 MIN` : "5 MIN";
  const progressText = isChallenge ? `Day ${dayNumber} of ${planLength || 90}` : `${Math.floor((progress * 300) / 60)}min / 5min`;
  const nextOpens = graduated
    ? "A fresh mix lands tomorrow."
    : isChallenge && !currentDayUnlocked
      ? `Day ${dayNumber} opens tomorrow.`
      : "A new plan opens tomorrow.";
  const totalSeconds = videos.reduce((sum, v) => sum + (v.durationSeconds || 0), 0);

  if (!videos.length) {
    return (
      <section className="mt-6" aria-label="Preparing today's plan">
        <div className="h-4 w-[190px] animate-pulse rounded-full bg-atelier-ink/[0.07]" />
        <div className="mt-2 h-3 w-[240px] animate-pulse rounded-full bg-atelier-ink/[0.07]" />
        <div className="mt-3 h-[212px] w-full animate-pulse rounded-[22px] bg-atelier-ink/[0.06]" />
      </section>
    );
  }

  return (
    <section className="mt-6">
      <div className="flex items-baseline justify-between px-1">
        <Serif size={22} as="h2">Today&apos;s session</Serif>
        <Eyebrow>{eyebrow}</Eyebrow>
      </div>
      <button
        type="button"
        onClick={onStart}
        className="relative mt-2.5 block h-[212px] w-full overflow-hidden rounded-[22px] border border-atelier-line text-left shadow-[0_16px_22px_-6px_rgba(58,47,68,0.16)]"
        style={{ backgroundImage: "linear-gradient(135deg, #3A2F44 0%, #15121A 100%)" }}
        aria-label={`Today's plan, ${isChallenge ? `Day ${dayNumber}: ` : ""}${title}`}
      >
        {previewUrl && (
          <video
            key={previewUrl}
            src={loopOn ? previewUrl : `${previewUrl}#t=0.6`}
            className="absolute inset-0 h-full w-full object-cover"
            muted playsInline loop={loopOn} autoPlay={loopOn} preload="metadata" tabIndex={-1} aria-hidden="true"
          />
        )}
        <span aria-hidden="true" className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(21,18,26,0) 0%, rgba(21,18,26,0) 45%, rgba(21,18,26,0.82) 100%)" }} />
        {complete ? (
          <span className="absolute inset-0 flex flex-col items-center justify-center bg-atelier-night/45 pb-14 text-center">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-atelier-nightInk">
              <Check className="h-8 w-8 text-atelier-night" strokeWidth={3.2} aria-hidden="true" />
            </span>
            <span className="mt-2 text-[13px] font-semibold text-atelier-nightInk">Done for today</span>
            <span className="text-[12px] text-atelier-nightInk/75">{nextOpens}</span>
          </span>
        ) : (
          <span className="absolute inset-0 grid place-items-center">
            <span className="grid h-[62px] w-[62px] place-items-center rounded-full bg-atelier-nightInk/95 shadow-[0_8px_16px_rgba(0,0,0,0.28)]">
              <Play className="ml-0.5 h-6 w-6 fill-atelier-night text-atelier-night" aria-hidden="true" />
            </span>
          </span>
        )}
        <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-3.5">
          <span className="min-w-0">
            <span className="block font-serif text-[21px] leading-tight text-atelier-nightInk">{title}</span>
            <span className="mt-0.5 block truncate text-[12px] text-atelier-nightInk/80">
              {graduated ? "A fresh goal-based session for " : isChallenge ? "Today's plan, tailored to " : "Tailored for your goal: "}
              <b className="font-semibold text-atelier-nightInk">{goalTitle || "your goal"}</b>
            </span>
          </span>
          {progress > 0 && !complete && <span className="shrink-0 font-mono text-[11px] text-atelier-nightInk/80">{progressText}</span>}
        </span>
        <span aria-hidden="true" className="absolute bottom-0 left-0 h-[3px] bg-atelier-rose transition-[width] duration-700" style={{ width: `${Math.min(100, Math.max(0, progress) * 100)}%` }} />
      </button>
      {replayDayNumber != null && !graduated && !complete && (
        <p className="mt-2 px-1 text-[12.5px] text-atelier-ink2">Day {currentDayNumber} unlocks tomorrow. One day at a time is what makes this work.</p>
      )}
      <button
        type="button"
        onClick={() => setShowMoves((v) => !v)}
        aria-expanded={showMoves}
        className="mt-1 flex min-h-[44px] w-full items-center justify-between gap-2 px-1 text-[12.5px] font-semibold text-atelier-ink2"
      >
        <span>{videos.length} {videos.length === 1 ? "move" : "moves"}{totalSeconds > 0 ? ` · about ${Math.max(1, Math.round(totalSeconds / 60))} min` : ""}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${showMoves ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {showMoves && (
        <ol className="divide-y divide-atelier-line rounded-[16px] border border-atelier-line bg-atelier-card px-3">
          {videos.map((video, i) => (
            <li key={video.id}>
              <button type="button" onClick={() => onPlayFrom(i)} className="flex w-full items-center gap-3 py-2.5 text-left" aria-label={`Start at move ${i + 1}, ${video.title}`}>
                <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] font-bold ${watched.has(video.id) ? "bg-atelier-sage text-white" : "bg-atelier-ink/[0.06] text-atelier-ink2"}`}>
                  {watched.has(video.id) ? <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" /> : i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-atelier-ink">{video.title}</span>
                {video.durationSeconds > 0 && <span className="shrink-0 font-mono text-[11px] text-atelier-ink3">{durationLabel(video.durationSeconds)}</span>}
                <Play className="h-4 w-4 shrink-0 text-atelier-ink3" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

// --- Guided audio ----------------------------------------------------------------------

function GuidedAudioCard({ session, onOpen }) {
  return (
    <button type="button" onClick={onOpen} className="mt-4 block w-full text-left" aria-label={`Guided audio. ${session.title}. ${session.subtitle}`}>
      <ARow className="flex items-center gap-3.5 p-3.5">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] bg-atelier-plum text-atelier-nightInk" aria-hidden="true">
          <AudioLines className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <Eyebrow>GUIDED AUDIO</Eyebrow>
          <span className="mt-0.5 block truncate text-[15px] font-semibold text-atelier-ink">{session.title}</span>
          <span className="block text-[12px] leading-snug text-atelier-ink2">{session.subtitle}</span>
        </span>
        <Chevron />
      </ARow>
    </button>
  );
}

// --- In the moment ---------------------------------------------------------------------

function InTheMomentCard({ goalId, onUrgeRescue, onAudioKegels }) {
  const showsUrge = goalId === "bladderLeaks" || goalId === "postpartum";
  const showsKegels = goalId !== "pelvicPain" && goalId !== "intimacy";
  return (
    <ACard className="mt-4 p-4" shadow={false} aria-labelledby="in-the-moment">
      <Eyebrow>IN THE MOMENT</Eyebrow>
      <p className="mt-2 flex flex-wrap items-baseline gap-x-1.5 text-[10.5px] font-medium text-atelier-ink2">
        <span className="font-semibold uppercase tracking-[0.1em]">Eyes-free audio</span>
        <span className="text-atelier-ink2/80">Keep the phone down. Follow the voice.</span>
      </p>
      <div className="mt-2.5 grid grid-cols-2 gap-3">
        {showsUrge && <MomentTile Icon={ShieldHalf} title="Urge Rescue" subtitle="One minute to settle the urge." onClick={onUrgeRescue} />}
        {showsKegels && <MomentTile Icon={AudioLines} title="Audio Kegels" subtitle="A voice keeps the timing for you." onClick={onAudioKegels} />}
      </div>
    </ACard>
  );
}

function MomentTile({ Icon, title, subtitle, onClick }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full flex-col items-start gap-2.5 rounded-[16px] border border-atelier-rose/[0.18] bg-atelier-paper p-3.5 text-left">
      <span className="grid h-[38px] w-[38px] place-items-center rounded-full bg-atelier-rose/[0.15]">
        <Icon className="h-4 w-4 text-atelier-rose" aria-hidden="true" />
      </span>
      <span className="block text-[15px] font-bold leading-tight text-atelier-ink">{title}</span>
      <span className="block text-[11.5px] font-medium leading-snug text-atelier-ink2">{subtitle}</span>
    </button>
  );
}

// --- Progress card --------------------------------------------------------------------------

function ProgressCard({ progress, goalTitle, onTap }) {
  const complete = progress >= 1;
  const p = Math.min(1, Math.max(0, progress));
  const Icon = complete ? CheckCircle2 : progress > 0 ? Play : Sparkles;
  const message = complete ? "See today's result" : progress > 0 ? "Today's progress" : "Your first 5 minutes";
  const remaining = Math.max(1, Math.ceil((1 - p) * 5));
  const supporting = complete
    ? "Today's saved workout, exercises, and time"
    : progress > 0
      ? `${Math.round(p * 100)}% complete · about ${remaining} minute${remaining === 1 ? "" : "s"} left`
      : `Five focused minutes toward ${goalTitle || "your goal"}`;
  return (
    <button
      type="button"
      onClick={onTap}
      className={`mt-4 block w-full rounded-[20px] border p-4 text-left ${complete ? "border-white/20 text-white" : "border-atelier-ink/[0.10] bg-atelier-ink/[0.045] text-atelier-ink"}`}
      style={complete ? { backgroundImage: "linear-gradient(135deg, #E65473 0%, #C43E63 100%)" } : undefined}
      aria-label={`${message}. ${supporting}`}
    >
      <span className="flex items-center gap-[15px]">
        <Icon className={`h-[26px] w-[26px] shrink-0 ${complete ? "text-white" : "text-atelier-rose"}`} aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block text-[17px] font-bold leading-snug">{message}</span>
          <span className={`block text-[12px] ${complete ? "text-white/80" : "text-atelier-ink2"}`}>{supporting}</span>
        </span>
      </span>
      {!complete && (
        <span className="mt-2.5 block h-1.5 w-full overflow-hidden rounded-full bg-black/10">
          <span className="block h-full rounded-full bg-atelier-rose transition-[width] duration-500" style={{ width: `${Math.round(p * 100)}%` }} />
        </span>
      )}
    </button>
  );
}

// --- Weekly consistency ---------------------------------------------------------------------

const MILESTONE_TITLES = {
  intimacyMens: { 7: "Erection Control Foundation", 14: "Lasting Control Building", 30: "One Month of Erection and Control Practice" },
  intimacy: { 7: "Sensation Foundation", 14: "Relaxation and Control", 30: "One Month of Intimacy Practice" },
  bladderLeaks: { 7: "Control Foundation", 14: "Coordination Building", 30: "One Month of Bladder Training" },
  postpartum: { 7: "Recovery Foundation", 14: "Core Reconnection", 30: "One Month of Recovery Practice" },
  pregnancyPrep: { 7: "Preparation Foundation", 14: "Pressure Control Building", 30: "One Month of Pregnancy Preparation" },
  diastasisRecti: { 7: "Deep Core Foundation", 14: "Pressure Control Building", 30: "One Month of Diastasis Recovery" },
  pelvicPain: { 7: "Release Foundation", 14: "Comfort Building", 30: "One Month of Pelvic Comfort Practice" },
  coreStrength: { 7: "Core Foundation", 14: "Control Building", 30: "One Month of Core Training" },
  fitness: { 7: "Movement Foundation", 14: "Strength Building", 30: "One Month of Fitness Support" },
  stability: { 7: "Stability Foundation", 14: "Balance Building", 30: "One Month of Stability Training" },
  prolapse: { 7: "Support Foundation", 14: "Pressure Control Building", 30: "One Month of Pelvic Support" },
  prostateRecovery: { 7: "Recovery Control Foundation", 14: "Bladder Control Building", 30: "One Month of Prostate Recovery" },
  bowelControl: { 7: "Control Foundation", 14: "Closure and Release Building", 30: "One Month of Bowel Control Training" },
};

function milestoneTitle(goalId, mens, days) {
  const key = goalId === "intimacy" && mens ? "intimacyMens" : goalId;
  return (MILESTONE_TITLES[key] || MILESTONE_TITLES.coreStrength)[days];
}

function WeeklyConsistencyCard({ completions, streak, goalId, mens, todayKey }) {
  const [open, setOpen] = useState(false);
  const week = useMemo(() => lastSevenDays(completions), [completions, todayKey]);
  const count = week.filter((d) => d.done).length;
  const progress = Math.min(1, count / SESSIONS_PER_WEEK);
  const remaining = Math.max(SESSIONS_PER_WEEK - count, 0);
  const summary = count >= SESSIONS_PER_WEEK
    ? "Your five-session week is complete. Recovery days remain part of the plan."
    : streak.current === 0 && (completions?.length || 0) > 0
      ? "One missed day does not erase your progress. Continue with today's plan when you are ready."
      : `${remaining} more ${remaining === 1 ? "session" : "sessions"} completes your five-session week.`;
  const r = 25.5;
  const c = 2 * Math.PI * r;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="mt-5 block w-full text-left lg:mt-0" aria-label={`Weekly consistency. ${count} sessions in the last seven days. ${summary}`}>
        <ACard className={`p-4 ${count >= SESSIONS_PER_WEEK ? "border-atelier-rose/45" : ""}`} shadow={false}>
          <div className="flex items-center gap-[15px]">
            <span className="relative grid h-[58px] w-[58px] shrink-0 place-items-center" aria-hidden="true">
              <svg viewBox="0 0 58 58" className="absolute inset-0 h-full w-full">
                <defs>
                  <linearGradient id="pv-week-ring" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#E65473" /><stop offset="100%" stopColor="#C43E63" />
                  </linearGradient>
                </defs>
                <circle cx="29" cy="29" r={r} fill="none" stroke="rgba(230,84,115,0.14)" strokeWidth="7" />
                <circle cx="29" cy="29" r={r} fill="none" stroke="url(#pv-week-ring)" strokeWidth="7" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - progress)} transform="rotate(-90 29 29)" style={{ transition: "stroke-dashoffset 600ms ease" }} />
              </svg>
              <span className="relative flex flex-col items-center leading-none">
                <span className="font-serif text-[23px] text-atelier-ink">{count}</span>
                <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-atelier-ink2">Goal 5</span>
              </span>
            </span>
            <span className="min-w-0 flex-1">
              <Eyebrow>WEEKLY CONSISTENCY</Eyebrow>
              <span className="mt-0.5 block font-serif text-[21px] leading-tight text-atelier-ink">{count} {count === 1 ? "session" : "sessions"} in the last 7 days</span>
              <span className="mt-0.5 block text-[13.5px] text-atelier-ink2">Five sessions build the week. Two days stay flexible for recovery.</span>
            </span>
          </div>
          <ul className="mt-4 grid grid-cols-7 gap-1.5" aria-label="Completed sessions in the last seven days">
            {week.map((d) => (
              <li key={d.key} className="flex flex-col items-center gap-1.5">
                <span className="text-[10px] font-semibold text-atelier-ink2">{d.letter}</span>
                <span
                  className={`grid h-[34px] w-[34px] place-items-center rounded-full text-[12px] font-semibold ${
                    d.done ? "bg-atelier-rose text-white" : d.today ? "text-atelier-rose ring-2 ring-atelier-rose/75" : "bg-atelier-ink/[0.07] text-atelier-ink2"
                  }`}
                  aria-label={`${d.label}. ${d.done ? "Plan session completed" : d.today ? "Today, no session completed yet" : "Recovery day or no session logged"}`}
                >
                  {d.day}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 flex items-start gap-2 text-[13px] font-medium text-atelier-ink2">
            <Heart className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />{summary}
          </p>
        </ACard>
      </button>
      <ConsistencySheet open={open} onClose={() => setOpen(false)} count={count} streak={streak} completions={completions} goalId={goalId} mens={mens} />
    </>
  );
}

function ConsistencySheet({ open, onClose, count, streak, completions, goalId, mens }) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstOffset = new Date(year, month, 1).getDay();
  const doneDays = useMemo(() => {
    const set = new Set();
    for (const c of completions || []) {
      const d = toDate(c.completedAt);
      if (d && d.getFullYear() === year && d.getMonth() === month) set.add(d.getDate());
    }
    return set;
  }, [completions, year, month]);
  const stats = [
    ["Last 7 Days", count, "text-atelier-rose"],
    ["Current Run", streak.current, "text-atelier-rosewood"],
    ["Total Sessions", completions?.length ?? 0, "text-atelier-plum"],
  ];
  return (
    <Sheet open={open} onClose={onClose} title="Your Consistency" labelledBy="consistency-sheet">
      <div className="pb-6">
        <ul className="grid grid-cols-3 gap-3">
          {stats.map(([label, value, tint]) => (
            <li key={label} className="flex flex-col items-center rounded-[16px] border border-atelier-line bg-atelier-card p-3 text-center">
              <span className={`font-serif text-[26px] leading-none ${tint}`}>{value}</span>
              <span className="mt-1.5 text-[11px] font-medium text-atelier-ink2">{label}</span>
            </li>
          ))}
        </ul>
        <section className="mt-5 rounded-[22px] border border-atelier-line bg-atelier-card p-4" aria-label="This month">
          <p className="text-center font-serif text-[19px] text-atelier-ink">{today.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
          <ul className="mt-3 grid grid-cols-7 gap-1 text-center font-mono text-[10px] text-atelier-ink3" aria-hidden="true">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <li key={`${d}-${i}`}>{d}</li>)}
          </ul>
          <ul className="mt-1 grid grid-cols-7 gap-1">
            {Array.from({ length: firstOffset }, (_, i) => <li key={`pad-${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const done = doneDays.has(day);
              return (
                <li key={day} className="grid place-items-center">
                  <span className={`grid h-8 w-8 place-items-center rounded-full text-[12px] font-semibold ${done ? "bg-atelier-rose text-white" : "text-atelier-ink"}`}>{day}</span>
                </li>
              );
            })}
          </ul>
        </section>
        <section className="mt-5" aria-label="Achievements">
          <h3 className="font-serif text-[20px] text-atelier-ink">Achievements</h3>
          <ul className="mt-3 space-y-2">
            {[7, 14, 30].map((d) => {
              const unlocked = (streak.best || 0) >= d;
              return (
                <li key={d} className={`flex items-center gap-3 rounded-[16px] border border-atelier-line bg-atelier-card p-3 ${unlocked ? "" : "opacity-60"}`}>
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${unlocked ? "bg-atelier-amber/[0.18] text-atelier-amber" : "bg-atelier-ink/[0.06] text-atelier-ink3"}`}>
                    <Flame className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14.5px] font-semibold text-atelier-ink">{milestoneTitle(goalId, mens, d)}</span>
                    <span className="block text-[12px] text-atelier-ink2">{d}-day run · {unlocked ? "earned" : "not yet"}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </Sheet>
  );
}

// --- Progress graph ---------------------------------------------------------------------------

const RANGES = [
  { id: "week", label: "Week", title: "Your Weekly Progress" },
  { id: "month", label: "Month", title: "Your Last 30 Days" },
  { id: "year", label: "Year", title: "Your Last 12 Months" },
];

function ProgressGraph({ events, completions, streak, goalId, mens }) {
  const [range, setRange] = useState("week");
  const [picked, setPicked] = useState(null);
  const data = useMemo(() => graphData(events, completions, range), [events, completions, range]);
  const meta = RANGES.find((r) => r.id === range);
  const empty = data.every((d) => d.rawValue === 0);
  const average = range !== "week" && !empty ? data.reduce((s, d) => s + Math.min(1, d.value), 0) / data.length : null;
  useEffect(() => { setPicked(null); }, [range]);
  const milestone = [30, 14, 7].find((m) => m === streak.current);
  const pill = milestone
    ? `Badge earned: ${milestoneTitle(goalId, mens, milestone)}`
    : streak.current > 0 ? `${streak.current}-day streak` : null;
  return (
    <ACard className="mt-5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Serif size={21} as="h2">{meta.title}</Serif>
        <div role="tablist" aria-label="How far back" className="flex rounded-lg bg-atelier-ink/[0.06] p-0.5">
          {RANGES.map((r) => (
            <button key={r.id} role="tab" type="button" aria-selected={range === r.id} onClick={() => setRange(r.id)}
              className={`h-7 rounded-md px-3 text-[12.5px] font-semibold ${range === r.id ? "bg-atelier-card text-atelier-ink shadow-sm" : "text-atelier-ink2"}`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>
      {pill && (
        <p className="mt-2 flex items-center gap-1.5 text-[12.5px] font-semibold text-atelier-rose">
          <Flame className="h-3.5 w-3.5" aria-hidden="true" />{pill}
        </p>
      )}
      {empty ? (
        <div className="grid h-[150px] place-items-center text-center">
          <div>
            <p className="text-[15px] font-bold text-atelier-ink">No saved dates yet</p>
            <p className="mt-1 text-[13px] text-atelier-ink2">Completed and partial sessions will appear here without filling missed dates.</p>
          </div>
        </div>
      ) : (
        <>
          <ul className="mt-3 flex items-center gap-3.5 font-mono text-[9px] uppercase tracking-[0.1em] text-atelier-ink3" aria-label="Pink is completed, orange is partial, gray is rest or no saved session">
            {[["#E65473", "Completed"], ["#C58A2A", "Partial"], ["rgba(28,24,32,0.24)", "Rest"]].map(([color, label]) => (
              <li key={label} className="flex items-center gap-1.5"><span className="h-[7px] w-[7px] rounded-full" style={{ background: color }} />{label}</li>
            ))}
          </ul>
          <div className="mt-3 flex gap-1">
            <ul className="flex h-[120px] w-[30px] shrink-0 flex-col justify-between font-mono text-[9px] text-atelier-ink3" aria-hidden="true">
              <li>100</li><li>50</li><li>0</li>
            </ul>
            <div className="relative min-w-0 flex-1">
              <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-atelier-ink3/40" aria-hidden="true" />
              {average != null && (
                <div className="pointer-events-none absolute inset-x-0 flex justify-end border-t border-dashed border-atelier-rosewood/50" style={{ top: `${(1 - average) * 100}%` }} aria-hidden="true">
                  <span className="-mt-2.5 rounded-full border border-atelier-rosewood/30 bg-atelier-card px-1.5 py-0.5 font-mono text-[8px] tracking-[0.08em] text-atelier-rosewood">AVG {Math.round(average * 100)}</span>
                </div>
              )}
              <ul className="flex h-[120px] items-end gap-2">
                {data.map((point, i) => {
                  const status = point.rawValue === 0 ? "rest" : point.value >= 1 ? "completed" : "partial";
                  return (
                    <li key={point.label + i} className="flex h-full min-w-0 flex-1 items-end">
                      <button type="button" onClick={() => setPicked(picked === i ? null : i)} aria-label={`${point.label}, ${status}, ${point.rawValue} ${point.rawValue === 1 ? "workout" : "workouts"}`} className="relative flex h-full w-full items-end">
                        {picked === i && (
                          <span className="absolute inset-x-0 bottom-full mb-1 flex justify-center">
                            <span className="whitespace-nowrap rounded-full border border-atelier-line bg-atelier-card px-2 py-1 font-mono text-[9px] text-atelier-ink shadow-md">{point.rawValue} {point.rawValue === 1 ? "workout" : "workouts"}</span>
                          </span>
                        )}
                        <span
                          className={`block w-full rounded-full ${point.isToday ? "ring-2 ring-atelier-rosewood/80" : ""}`}
                          style={{
                            height: `${Math.max(3, Math.min(1, point.value) * 100)}%`,
                            background: status === "completed" ? "linear-gradient(180deg, #E65473, #C43E63)" : status === "partial" ? "#C58A2A" : "rgba(28,24,32,0.24)",
                            transition: "height 500ms cubic-bezier(0.2,0.8,0.2,1)",
                          }}
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
              <ul className="mt-1.5 flex gap-2 text-center font-mono text-[9px] uppercase tracking-[0.08em] text-atelier-ink3" aria-hidden="true">
                {data.map((point, i) => (
                  <li key={point.label + i} className="min-w-0 flex-1 truncate">{point.label.slice(0, 3)}{point.isMilestone ? " ★" : ""}</li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
      <p className="mt-3 text-[11px] text-atelier-ink3">Only activity saved by the app is shown here</p>
    </ACard>
  );
}

// --- Track what matters today ----------------------------------------------------------------

const TRACK_PLANS = {
  intimacy: ["Comfort, sensation and confidence, private and only for you.", Heart],
  intimacyTightening: ["Comfort, tone and confidence, private and only for you.", Heart],
  intimacyMens: ["Erection support, lasting control and confidence, private and only for you.", HeartPulse],
  bladderLeaks: ["See changes in leaks, urge control and confidence.", Droplet],
  postpartum: ["Notice recovery comfort, energy and core connection.", Baby],
  pregnancyPrep: ["Track comfort, energy and how ready your body feels.", PersonStanding],
  diastasisRecti: ["Watch doming, core connection and movement confidence.", CircleDashed],
  pelvicPain: ["Track discomfort, muscle ease and movement confidence.", Leaf],
  coreStrength: ["Notice comfort, deep-core connection and control.", Hexagon],
  fitness: ["Track pressure, energy and confidence while you move.", Activity],
  stability: ["Track balance, comfort and strength.", PersonStanding],
  prolapse: ["Track heaviness, pelvic support and confidence during daily movement.", HeartPulse],
  prostateRecovery: ["Track leaks, bladder control and recovery confidence.", Cross],
  bowelControl: ["Track urgency, control and confidence.", ShieldCheck],
};

const QUICK_LOG = [
  { kind: "void", label: "Void", entry: {} },
  { kind: "leak", label: "Leak", entry: { leakSize: "small" } },
  { kind: "urge", label: "Urge", entry: { urgencyLevel: 2 } },
  { kind: "fluid", label: "Fluid", entry: { volumeML: 240, fluidType: "water" } },
];

function TrackCard({ goalId, focusId, mens, member, todayKey }) {
  const planKey =
    goalId === "intimacy" && mens ? "intimacyMens"
    : goalId === "intimacy" && focusId === "intimacy.tightening" ? "intimacyTightening"
    : goalId;
  const [subtitle, Icon] = TRACK_PLANS[planKey] || TRACK_PLANS.coreStrength;
  const bladder = goalId === "bladderLeaks" || goalId === "prostateRecovery";
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const [entries, setEntries] = useState([]);
  const [diaryOpen, setDiaryOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const memberId = member?.id;

  useEffect(() => {
    if (!memberId) return undefined;
    let cancelled = false;
    fetchCheckIn(memberId, todayKey).then((r) => { if (!cancelled) setChecked(Boolean(r)); }).catch(() => {});
    return () => { cancelled = true; };
  }, [memberId, todayKey, checkInOpen]);

  const reload = useCallback(async () => {
    if (!memberId || !bladder) return;
    try { setEntries(await fetchDiaryEntries(memberId)); } catch { /* keeps what is on screen */ }
  }, [memberId, bladder]);
  useEffect(() => { reload(); }, [reload]);
  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(id);
  }, [toast]);

  const week = useMemo(() => {
    const out = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
      const n = entries.filter((e) => { const t = toDate(e.timestamp); return t && isSameDay(t, d); }).length;
      out.push({ letter: d.toLocaleDateString("en-US", { weekday: "narrow" }), n, today: i === 0 });
    }
    return out;
  }, [entries]);
  const max = Math.max(1, ...week.map((w) => w.n));
  const todayCount = week[6]?.n || 0;

  const quickLog = useCallback(async (item) => {
    if (!memberId) return;
    const record = await logDiaryEntry(memberId, { kind: item.kind, ...item.entry });
    if (record) { setToast({ id: record.id, label: item.label }); reload(); }
  }, [memberId, reload]);
  const undo = useCallback(async () => {
    if (!memberId || !toast) return;
    await deleteDiaryEntry(memberId, toast.id);
    setToast(null);
    reload();
  }, [memberId, toast, reload]);

  return (
    <section
      className="mt-5 overflow-hidden rounded-[22px] border border-white/50 bg-atelier-card p-4"
      style={{ backgroundImage: "linear-gradient(135deg, rgba(230,84,115,0.12), rgba(196,62,99,0.045))", boxShadow: "0 6px 14px rgba(230,84,115,0.10)" }}
      aria-label="Track what matters today"
    >
      <div className="flex items-center gap-3">
        <span className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[14px] text-white" style={{ backgroundImage: "linear-gradient(135deg, #E65473, #C43E63)" }} aria-hidden="true">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[17px] font-bold leading-tight text-atelier-ink">Track what matters today</p>
          <p className="mt-0.5 text-[12px] leading-snug text-atelier-ink2">{subtitle}</p>
        </div>
        {checked && <span className="flex shrink-0 items-center gap-1 text-[12px] font-semibold text-atelier-sage"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />Done</span>}
      </div>
      <RoseAction className="mt-3.5" onClick={() => setCheckInOpen(true)}>
        {checked ? "Update today's check-in" : "Log today's check-in"}
      </RoseAction>
      {bladder && (
        <>
          <div className="my-4 border-t border-atelier-line/70" />
          <div className="flex items-baseline justify-between">
            <p className="text-[15px] font-bold text-atelier-ink">Bladder diary</p>
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-atelier-ink3">{todayCount} today</span>
          </div>
          <ul className="mt-3 flex h-[52px] items-end gap-1.5" aria-label="Diary entries in the last seven days">
            {week.map((d, i) => (
              <li key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <span className={`block w-full rounded-full ${d.today ? "bg-atelier-rose" : "bg-atelier-rose/40"}`} style={{ height: `${Math.max(8, (d.n / max) * 100)}%` }} aria-label={`${d.n} entries`} />
                <span className="font-mono text-[9px] text-atelier-ink3">{d.letter}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {QUICK_LOG.map((item) => (
              <button key={item.kind} type="button" onClick={() => quickLog(item)} className="min-h-[44px] rounded-[14px] border border-atelier-line bg-white text-[13px] font-semibold text-atelier-ink">
                {item.label}
              </button>
            ))}
          </div>
          {toast && (
            <p className="mt-2.5 flex items-center justify-between rounded-[12px] bg-atelier-ink/[0.05] px-3 py-2 text-[12.5px] text-atelier-ink2" role="status">
              <span>{toast.label} logged.</span>
              <button type="button" onClick={undo} className="font-semibold text-atelier-rosewood">Undo</button>
            </p>
          )}
          <button type="button" onClick={() => setDiaryOpen(true)} className="mt-2 flex min-h-[40px] w-full items-center justify-between text-[13px] font-semibold text-atelier-rosewood">
            Open your full diary <Chevron className="text-atelier-rosewood" />
          </button>
          <BladderDiary open={diaryOpen} onClose={() => setDiaryOpen(false)} memberId={memberId} entries={entries} onChange={reload} />
        </>
      )}
      <Sheet open={checkInOpen} onClose={() => setCheckInOpen(false)} title="Today's check-in" labelledBy="checkin-sheet">
        <div className="pb-6"><CheckInCard dateKey={todayKey} /></div>
      </Sheet>
    </section>
  );
}

// --- Coach insight -------------------------------------------------------------------------

const DEFAULT_ARTICLE = {
  intimacy: "better-sensation-starts-with-better-control",
  intimacyMens: "erection-support-needs-timing-not-constant-squeezing",
  bladderLeaks: "stress-leaks-and-urge-leaks-need-different-skills",
  postpartum: "your-first-rule-postpartum-rebuild-do-not-rush",
  pregnancyPrep: "train-for-pregnancy-without-holding-your-breath",
  diastasisRecti: "doming-is-feedback-not-failure",
  pelvicPain: "tight-is-not-the-same-as-strong",
  coreStrength: "your-core-is-a-pressure-system-not-one-muscle",
  fitness: "know-when-to-progress-an-exercise",
  stability: "pelvic-stability-starts-at-the-foot-and-hip",
  prolapse: "pelvic-pressure-is-information-not-failure",
  prostateRecovery: "rebuild-control-after-prostate-treatment",
  bowelControl: "bowel-control-starts-with-coordination",
};

function CoachInsightCard({ goalId, mens, router }) {
  const tips = useMemo(() => coachTipsFor(goalId), [goalId]);
  const [article, setArticle] = useState(null);
  const [open, setOpen] = useState(false);
  const slug = DEFAULT_ARTICLE[goalId === "intimacy" && mens ? "intimacyMens" : goalId] || DEFAULT_ARTICLE.coreStrength;
  useEffect(() => {
    let cancelled = false;
    loadInsightArticles().then((list) => {
      if (cancelled) return;
      const all = list || [];
      const found = all.find((a) => a.id === slug || a.slug === slug) || bestArticleFor(all, tips);
      setArticle(found || null);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [slug, tips]);
  if (!tips.length) {
    return (
      <p className="mt-5 flex items-center gap-2 rounded-[18px] border border-atelier-line bg-atelier-card p-3.5 text-[12px] text-atelier-ink2">
        <Sparkles className="h-4 w-4" aria-hidden="true" /> Coach Mia™ will add today&apos;s insight here
      </p>
    );
  }
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  const tip = tips[(dayOfYear - 1 + tips.length) % tips.length];
  const minutes = article ? Math.max(1, Math.round(String(article.body || "").split(/\s+/).length / 200)) : null;
  const openArticle = () => {
    if (article) router.push(`/app/insights?article=${encodeURIComponent(article.id)}`);
    else setOpen(true);
  };
  return (
    <>
      <button type="button" onClick={openArticle} className="relative mt-5 block min-h-[224px] w-full overflow-hidden rounded-[22px] border border-white/15 text-left shadow-[0_7px_14px_rgba(58,47,68,0.16)]" aria-label={`Why this helps today. ${tip.title}. ${tip.detail}`}>
        <span aria-hidden="true" className="absolute inset-0" style={{ backgroundImage: "linear-gradient(135deg, #3A2F44 0%, #C43E63 100%)" }} />
        <span aria-hidden="true" className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(21,18,26,0.10), rgba(21,18,26,0.46) 50%, rgba(21,18,26,0.92))" }} />
        <span className="absolute inset-x-5 top-4 flex items-center justify-between text-atelier-nightInk/85">
          <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.13em]"><tip.Icon className="h-3 w-3" aria-hidden="true" />Why this helps today</span>
          <span className="flex items-center gap-1 text-[11px] font-semibold"><ShieldCheck className="h-3 w-3" aria-hidden="true" />Reviewed</span>
        </span>
        <span className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-5">
          <span className="font-serif text-[25px] leading-[1.08] text-atelier-nightInk">{tip.title}</span>
          <span className="line-clamp-3 text-[14px] font-medium leading-snug text-atelier-nightInk/80">{tip.detail}</span>
          <span className="mt-1 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.13em] text-atelier-rose">
            Read article{minutes ? ` · ${minutes} min` : ""} <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
          </span>
        </span>
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="From your coach" labelledBy="coach-tip">
        <div className="pb-6">
          <Serif size={24}>{tip.title}</Serif>
          <p className="mt-3 text-[15px] leading-relaxed text-atelier-ink2">{tip.detail}</p>
        </div>
      </Sheet>
    </>
  );
}

// --- Ask anything -----------------------------------------------------------------------------

const ASK_SAMPLES_WOMEN = [
  "Why do I leak when I laugh?",
  "Is it normal to feel sore after day one?",
  "How do I know I'm using the right muscles?",
  "Can I train during my period?",
  "Why does my bladder wake me at night?",
];
const ASK_SAMPLES_MEN = [
  "How do I stop leaks and drips?",
  "How can pelvic floor training improve erections?",
  "How do I know I'm using the right muscles?",
  "How can I last longer during sex?",
  "Why does my bladder wake me at night?",
];

/** The article whose title and summary share the most words with today's tip. */
function bestArticleFor(articles, tips) {
  const stop = new Set(["about", "their", "these", "those", "which", "while", "would", "could", "there", "where", "every", "pelvic", "floor", "muscles", "muscle", "exercise", "exercises"]);
  const words = (text) => new Set(String(text || "").toLowerCase().split(/[^a-z]+/).filter((w) => w.length >= 5 && !stop.has(w)));
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  const tip = tips[(dayOfYear - 1 + tips.length) % tips.length];
  if (!tip) return null;
  const wanted = words(`${tip.title} ${tip.detail}`);
  let best = null;
  let bestScore = 0;
  for (const a of articles) {
    const have = words(`${a.title} ${a.summary}`);
    let score = 0;
    for (const w of wanted) if (have.has(w)) score += 1;
    if (score > bestScore) { bestScore = score; best = a; }
  }
  return bestScore >= 2 ? best : null;
}

function AskAnythingCard({ mens, onOpen }) {
  const samples = mens ? ASK_SAMPLES_MEN : ASK_SAMPLES_WOMEN;
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  const sample = samples[(dayOfYear - 1 + samples.length) % samples.length];
  return (
    <button type="button" onClick={onOpen} className="mt-5 block w-full text-left" aria-label="Ask anything about your pelvic floor">
      <ACard className="p-[18px]" shadow={false}>
        <span className="flex items-center gap-2 text-atelier-ink3">
          <Lock className="h-3 w-3" aria-hidden="true" />
          <Eyebrow>PRIVATE Q&amp;A · COACH MIA™</Eyebrow>
        </span>
        <span className="mt-3 block font-serif text-[23px] leading-[1.08] text-atelier-ink">Ask anything about your pelvic floor.</span>
        <span className="mt-3 flex items-center gap-3 rounded-full border border-atelier-line bg-atelier-paper py-2 pl-3.5 pr-2">
          <span className="min-w-0 flex-1 truncate font-serif text-[16px] italic text-atelier-ink2">“{sample}”</span>
          <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-atelier-rose text-white"><ArrowUp className="h-4 w-4" strokeWidth={2.6} aria-hidden="true" /></span>
        </span>
      </ACard>
    </button>
  );
}

// --- The 90-day map (ProgramPathwayView) --------------------------------------------------

function ProgramPathwaySheet({
  open, onClose, goalId, focusId, days, currentDayNumber, currentDayUnlocked,
  highestUnlockedDay, completedDayCount, graduated, completions, planLength, onPlayDay,
}) {
  const currentWeek = Math.floor((currentDayNumber - 1) / 7) + 1;
  const [expanded, setExpanded] = useState(currentWeek);
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
    for (const c of completions || []) { const n = Number(c.day); if (Number.isFinite(n)) set.add(n); }
    return set;
  }, [completions]);
  const total = planLength || days?.length || 0;
  const pct = total ? Math.round((Math.min(completedDayCount, total) / total) * 100) : 0;
  return (
    <Sheet open={open} onClose={onClose} title={pathwayTitle(goalId, focusId)} labelledBy="pathway-title">
      <div className="pb-6">
        <p className="text-[14px] leading-snug text-atelier-ink2">{pathwaySubtitle(goalId, focusId)}</p>
        <p className="mt-3 flex items-start gap-2 rounded-[16px] border border-atelier-line bg-atelier-card p-3 text-[12.5px] leading-snug text-atelier-ink2">
          <CalendarClock className="mt-px h-4 w-4 shrink-0 text-atelier-rose" aria-hidden="true" />
          One day at a time. Miss a day? Nothing is lost, you just carry on.
        </p>
        <div className="mt-4 rounded-[16px] border border-atelier-line bg-atelier-card p-4">
          <p className="flex items-baseline justify-between gap-3 text-[13px] font-semibold text-atelier-ink2">
            <span className="font-serif text-[18px] text-atelier-ink">{graduated ? `All ${total} days complete` : `Day ${Math.min(currentDayNumber, total || currentDayNumber)} of ${total}`}</span>
            <span className="shrink-0 font-mono text-[11px] tabular-nums">{Math.min(completedDayCount, total)} DAYS DONE · {pct}%</span>
          </p>
          <span className="mt-2 block h-1.5 w-full overflow-hidden rounded-full bg-atelier-ink/[0.08]">
            <span className="block h-full rounded-full bg-atelier-rose" style={{ width: `${pct}%` }} />
          </span>
        </div>
        <ul className="mt-4 space-y-2.5">
          {weeks.map((week) => {
            const openWeek = expanded === week.week;
            const weekDone = week.days.every((d) => done.has(d.day));
            return (
              <li key={week.week} className="overflow-hidden rounded-[16px] border border-atelier-line bg-atelier-card">
                <button type="button" onClick={() => setExpanded(openWeek ? 0 : week.week)} aria-expanded={openWeek} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[12px] font-bold ${weekDone ? "bg-atelier-sage text-white" : "bg-atelier-ink/[0.06] text-atelier-ink2"}`}>
                    {weekDone ? <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" /> : week.week}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-[10px] uppercase tracking-[0.13em] text-atelier-ink3">Week {week.week}</span>
                    <span className="block truncate text-[15px] font-semibold text-atelier-ink">{week.theme}</span>
                  </span>
                  <ChevronDown className={`h-4 w-4 shrink-0 text-atelier-ink3 transition-transform ${openWeek ? "rotate-180" : ""}`} aria-hidden="true" />
                </button>
                {openWeek && (
                  <ul className="border-t border-atelier-line">
                    {week.themeSubtitle && <li className="px-4 pb-1 pt-2.5 text-[12.5px] leading-snug text-atelier-ink2">{week.themeSubtitle}</li>}
                    {week.days.map((day) => {
                      const isDone = done.has(day.day);
                      const isCurrent = day.day === currentDayNumber;
                      const opensTomorrow = isCurrent && !currentDayUnlocked && !isDone;
                      const playable = day.day <= highestUnlockedDay && !opensTomorrow;
                      const dim = !playable && !opensTomorrow;
                      const badge = opensTomorrow ? " · Opens tomorrow" : isCurrent && !isDone ? " · Today" : "";
                      return (
                        <li key={day.day}>
                          <button type="button" disabled={!playable} onClick={() => { onPlayDay(day); onClose(); }} className={`flex w-full items-center gap-3 px-4 py-3 text-left ${dim ? "opacity-45" : ""}`}>
                            <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11.5px] font-bold ${
                              isDone ? "bg-atelier-sage text-white" : opensTomorrow ? "bg-atelier-amber text-white" : playable ? "bg-atelier-rose text-white" : "bg-atelier-ink/[0.08] text-atelier-ink2"
                            }`}>
                              {isDone ? <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" /> : opensTomorrow ? <Clock className="h-3.5 w-3.5" aria-hidden="true" /> : playable ? <Play className="h-3 w-3 fill-white" aria-hidden="true" /> : <Lock className="h-3 w-3" aria-hidden="true" />}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block font-mono text-[10px] uppercase tracking-[0.1em] text-atelier-ink3">Day {day.day}{badge}</span>
                              <span className="block truncate text-[14.5px] font-semibold text-atelier-ink">{day.title}</span>
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

// --- Helpers -----------------------------------------------------------------------------------

function firstNameOf(name) {
  const clean = (name || "").trim();
  return clean ? clean.split(/\s+/)[0] : "";
}
function initialsOf(name) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "";
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}
function greetingFor(date) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "Good morning,";
  if (hour >= 12 && hour < 18) return "Good afternoon,";
  return "Good evening,";
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
function countWeekDone(completions, currentDayNumber) {
  const day = Math.max(1, Math.min(90, currentDayNumber || 1));
  const first = Math.floor((day - 1) / 7) * 7 + 1;
  const set = new Set();
  for (const c of completions || []) { const n = Number(c.day); if (Number.isFinite(n) && n >= first && n <= Math.min(90, first + 6)) set.add(n); }
  return set.size;
}
function hasCompletionToday(completions) {
  const today = new Date();
  return (completions || []).some((c) => { const d = toDate(c.completedAt); return d && isSameDay(d, today); });
}
function progressToday(events, doneToday) {
  if (doneToday) return 1;
  const today = new Date();
  let seconds = 0;
  for (const e of events || []) { const d = toDate(e.date); if (d && isSameDay(d, today)) seconds += Number(e.secondsWatched) || 0; }
  return Math.min(1, seconds / DAILY_TARGET_SECONDS);
}
function lastSevenDays(completions) {
  const doneKeys = new Set();
  for (const c of completions || []) { const d = toDate(c.completedAt); if (d) doneKeys.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`); }
  const out = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    out.push({
      key, day: d.getDate(), letter: d.toLocaleDateString("en-US", { weekday: "narrow" }),
      label: d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }),
      done: doneKeys.has(key), today: i === 0,
    });
  }
  return out;
}
function graphData(events, completions, range) {
  const counts = new Map();
  const bump = (date) => {
    const d = toDate(date);
    if (!d) return;
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  };
  for (const e of events || []) bump(e.date);
  if (!counts.size) for (const c of completions || []) bump(c.completedAt);
  const at = (d) => counts.get(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`) || 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (range === "week") {
    const start = startOfWeek(today);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start); d.setDate(d.getDate() + i);
      const raw = at(d);
      return { label: d.toLocaleDateString("en-US", { weekday: "short" }), value: Math.min(raw / 6, 1.2), rawValue: raw, isToday: isSameDay(d, today), isMilestone: raw >= 6 };
    });
  }
  if (range === "month") {
    return Array.from({ length: 4 }, (_, i) => {
      const end = new Date(today); end.setDate(end.getDate() - (3 - i) * 7);
      let raw = 0;
      for (let k = 0; k < 7; k += 1) { const d = new Date(end); d.setDate(d.getDate() - k); raw += at(d); }
      return { label: `W${i + 1}`, value: Math.min(raw / 42, 1.2), rawValue: raw, isToday: i === 3, isMilestone: raw >= 42 };
    });
  }
  return Array.from({ length: 12 }, (_, i) => {
    const month = new Date(today.getFullYear(), i, 1);
    let raw = 0;
    for (const [key, value] of counts) { const [y, m] = key.split("-").map(Number); if (y === today.getFullYear() && m === i) raw += value; }
    return { label: month.toLocaleDateString("en-US", { month: "short" }), value: Math.min(raw / 180, 1.2), rawValue: raw, isToday: i === today.getMonth(), isMilestone: raw > 200 };
  });
}
