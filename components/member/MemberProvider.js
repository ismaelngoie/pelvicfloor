"use client";

// Everything the five tabs share: who she is, whether she is entitled, her
// program, her history, and the handful of writes that keep the phone and the
// browser telling the same story.
//
// This lives in app/app/layout.js, so it is created once and survives every
// tab change. Switching tabs must never refetch 812 KB of program JSON.

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from "react";
import {
  GoogleAuthProvider, getRedirectResult, onAuthStateChanged,
  signInWithPopup, signInWithRedirect, signOut,
} from "firebase/auth";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import {
  fetchCompletions, recordDayCompletion, recordWorkoutEvent, resolveMember, updateMember,
} from "@/lib/memberStore";
import {
  allDays, currentDayNumber, goalById, isCurrentDayUnlocked, isGraduated,
  loadCatalog, loadProgram, totalDays, videosForDay,
} from "@/lib/program";
import { entitlementState } from "@/lib/memberEntitlement";
import { fetchEntitlement } from "@/lib/memberBilling";
import { fetchRecentEvents, savedIdsOf, setSavedIds, summarizeEvents } from "@/lib/memberData";
import { FIXTURES_ON } from "@/lib/devFixtures";

const MemberContext = createContext(null);

export function useMember() {
  const value = useContext(MemberContext);
  if (!value) throw new Error("useMember must be used inside <MemberProvider>.");
  return value;
}

const DEFAULT_GOAL = "coreStrength";

// The nine files in public/content. Anything else would 404 the plan fetch.
const PROGRAM_GOALS = new Set([
  "pregnancyPrep", "postpartum", "coreStrength", "bladderLeaks", "pelvicPain",
  "intimacy", "fitness", "stability", "diastasisRecti",
]);

export function MemberProvider({ children }) {
  const [authState, setAuthState] = useState("loading"); // loading | signedOut | signedIn
  const [user, setUser] = useState(null);
  const [member, setMember] = useState(null);
  const [memberError, setMemberError] = useState(null);
  const [signingIn, setSigningIn] = useState(false);

  // Stripe's live answer to "is she paying", and whether we have heard back once
  // for this account yet. See the entitlement section below.
  const [live, setLive] = useState(null);
  const [entitlementChecked, setEntitlementChecked] = useState(false);

  const [program, setProgram] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [completions, setCompletions] = useState([]);
  const [events, setEvents] = useState([]);
  const [contentError, setContentError] = useState(null);

  const configured = isFirebaseConfigured();
  const loadedGoalRef = useRef(null);

  // --- Auth ----------------------------------------------------------------

  useEffect(() => {
    // Local QA only, and dead code in a production bundle. The NODE_ENV test is
    // repeated here rather than left to FIXTURES_ON because only a literal at
    // this exact spot lets webpack delete the block, and with it the dynamic
    // import below. See lib/devFixtures.js.
    if (process.env.NODE_ENV !== "production" && FIXTURES_ON) {
      // Not named `live`: that is already the Stripe answer in state, and
      // shadowing it here would read as this effect setting it.
      let mounted = true;
      import("@/lib/devFixtureData").then((f) => {
        if (!mounted) return;
        setUser(f.fixtureUser);
        setMember(f.fixtureMember);
        setAuthState("signedIn");
        setLive({ active: true, renewsAt: null });
        setEntitlementChecked(true);
        setCompletions(f.fixtureCompletions());
      });
      return () => { mounted = false; };
    }
    if (!configured) {
      setAuthState("signedOut");
      return undefined;
    }
    // A redirect sign-in resolves here rather than in the popup handler.
    getRedirectResult(auth()).catch(() => {});
    return onAuthStateChanged(auth(), (next) => {
      setUser(next || null);
      setAuthState(next ? "signedIn" : "signedOut");
      if (!next) setMember(null);
    });
  }, [configured]);

  const signIn = useCallback(async () => {
    if (!configured) return;
    setSigningIn(true);
    setMemberError(null);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    try {
      await signInWithPopup(auth(), provider);
    } catch (err) {
      const code = err?.code || "";
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        // She changed her mind. Not an error worth a red box.
      } else if (code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-this-environment") {
        try {
          await signInWithRedirect(auth(), provider);
          return;
        } catch {
          setMemberError("We could not open the sign in window. Please try again.");
        }
      } else {
        setMemberError("We could not sign you in. Please try again.");
      }
    } finally {
      setSigningIn(false);
    }
  }, [configured]);

  const signOutMember = useCallback(async () => {
    if (!configured) return;
    await signOut(auth());
    setMember(null);
    setCompletions([]);
    setEvents([]);
  }, [configured]);

  // --- Member record -------------------------------------------------------

  const loadMember = useCallback(async (nextUser) => {
    try {
      const record = await resolveMember(nextUser);
      setMember(record);
      setMemberError(null);
      return record;
    } catch (err) {
      setMemberError(
        "We could not open your account. Check your connection and try again."
      );
      return null;
    }
  }, []);

  useEffect(() => {
    if (FIXTURES_ON) return;
    if (authState !== "signedIn" || !user) return;
    loadMember(user);
  }, [authState, user, loadMember]);

  const refreshMember = useCallback(async () => {
    if (!user) return null;
    return loadMember(user);
  }, [user, loadMember]);

  /** Merge a patch into Firestore and into the copy on screen, in that order. */
  const patchMember = useCallback(
    async (patch) => {
      if (!member?.id) return;
      if (!FIXTURES_ON) await updateMember(member.id, patch);
      setMember((prev) => (prev ? { ...prev, ...patch } : prev));
    },
    [member?.id]
  );

  // --- Entitlement ---------------------------------------------------------
  //
  // This provider is the one place that asks "is she paying", so the question
  // costs one request per session rather than one per screen that wonders.
  //
  // The answer comes from Stripe, live, through /api/entitlement. There is no
  // copy of it in Firestore any more and nothing to keep in sync.

  const checkedForRef = useRef(null);

  /**
   * Ask Stripe. Resolves to the answer, or null when we could not get one.
   *
   * A null answer is never written over a good one. Whether she is paying is
   * not the sort of thing that should flicker off because a fetch failed: the
   * last answer Stripe actually gave us stands, and with no answer at all
   * lib/memberEntitlement.js falls through to the App Store signal and the
   * browser's own note from checkout. Losing this call must cost a paying
   * member nothing.
   */
  const checkEntitlement = useCallback(
    async ({ refresh = false } = {}) => {
      if (!configured || !user) return null;
      const askedFor = user.uid;
      try {
        const answer = await fetchEntitlement({ refresh });
        // Drop an answer that arrived after the account changed under it. Two
        // checks can be in flight across a sign-out and a sign-in, and the
        // slower one must not land on somebody else's session.
        if (answer && checkedForRef.current === askedFor) setLive(answer);
        return answer;
      } finally {
        if (checkedForRef.current === askedFor) setEntitlementChecked(true);
      }
    },
    [configured, user]
  );

  useEffect(() => {
    if (FIXTURES_ON) return;
    if (authState !== "signedIn" || !user) {
      // Signing out has to drop the answer with the account. Leaving it behind
      // would hand the next person to sign in on this laptop the last member's
      // subscription until her own check came back.
      setLive(null);
      setEntitlementChecked(false);
      checkedForRef.current = null;
      return;
    }
    if (checkedForRef.current === user.uid) return;
    // A different account. Clear the last answer before asking about this one,
    // for the same reason: switching accounts does not always pass through a
    // signed-out state, and the incoming member must not be let in on the
    // outgoing member's subscription while her own check is still running.
    checkedForRef.current = user.uid;
    setLive(null);
    setEntitlementChecked(false);
    checkEntitlement();
  }, [authState, user, checkEntitlement]);

  const refreshEntitlement = useCallback(
    () => checkEntitlement({ refresh: true }),
    [checkEntitlement]
  );

  const entitlement = useMemo(() => entitlementState(member, live), [member, live]);

  // True while she is signed in and Stripe has not answered for the first time.
  // The gate uses it to wait instead of showing the recovery screen to a paying
  // member for the half second before the answer lands.
  const entitlementChecking = authState === "signedIn" && !entitlementChecked;

  // --- Content and history -------------------------------------------------

  // `stability` is not on the goal grid any more but a member who chose it
  // before the swap still has a real 90 day program, so it stays loadable.
  const goalId = PROGRAM_GOALS.has(member?.goal) ? member.goal : DEFAULT_GOAL;

  useEffect(() => {
    if (!member?.id || !entitlement.active) return undefined;
    if (loadedGoalRef.current === goalId && program && catalog) return undefined;

    let cancelled = false;
    loadedGoalRef.current = goalId;
    setContentError(null);

    (async () => {
      try {
        const [nextCatalog, nextProgram] = await Promise.all([
          loadCatalog(),
          loadProgram(goalId),
        ]);
        if (cancelled) return;
        setCatalog(nextCatalog);
        setProgram(nextProgram);
      } catch {
        if (!cancelled) {
          setContentError("We could not load your plan. Check your connection and try again.");
          loadedGoalRef.current = null;
        }
      }
    })();

    return () => { cancelled = true; };
  }, [member?.id, entitlement.active, goalId, program, catalog]);

  const reloadHistory = useCallback(async () => {
    if (!member?.id) return;
    if (process.env.NODE_ENV !== "production" && FIXTURES_ON) {
      const f = await import("@/lib/devFixtureData");
      setEvents(f.fixtureEvents(catalog));
      return;
    }
    try {
      const [nextCompletions, nextEvents] = await Promise.all([
        fetchCompletions(member.id),
        fetchRecentEvents(member.id),
      ]);
      setCompletions(nextCompletions);
      setEvents(nextEvents);
    } catch {
      // History is additive. A failed read leaves what she already sees.
    }
  }, [member?.id, catalog]);

  useEffect(() => {
    if (!member?.id || !entitlement.active) return;
    reloadHistory();
  }, [member?.id, entitlement.active, reloadHistory]);

  // --- Derived program state ----------------------------------------------

  const days = useMemo(() => allDays(program), [program]);
  const planLength = useMemo(() => totalDays(program), [program]);
  const dayNumber = useMemo(() => currentDayNumber(completions), [completions]);
  const dayUnlocked = useMemo(() => isCurrentDayUnlocked(completions), [completions]);
  const graduated = useMemo(() => isGraduated(program, completions), [program, completions]);

  /**
   * The day whose exercises the Today tab actually opens. Normally that is the
   * day she is on. When the next day is held back until midnight it is the one
   * she just finished, so there is still something to press: `dayNumber` stays
   * the number the phone shows, and `sessionDay` is what plays.
   */
  const sessionDay = dayUnlocked ? dayNumber : Math.max(1, dayNumber - 1);

  const currentDay = useMemo(() => {
    if (!days.length) return null;
    const index = Math.min(Math.max(sessionDay, 1), days.length) - 1;
    return days[index] || null;
  }, [days, sessionDay]);

  const todaysVideos = useMemo(
    () => videosForDay(currentDay, catalog),
    [currentDay, catalog]
  );

  const history = useMemo(() => summarizeEvents(events), [events]);
  const savedIds = useMemo(() => savedIdsOf(member), [member]);

  const toggleSaved = useCallback(
    async (videoId) => {
      if (!member?.id || !videoId) return;
      const current = savedIdsOf(member);
      const next = current.includes(videoId)
        ? current.filter((id) => id !== videoId)
        : [videoId, ...current];
      setMember((prev) => (prev ? { ...prev, savedExerciseIDs: next } : prev));
      if (FIXTURES_ON) return;
      try {
        await setSavedIds(member.id, next);
      } catch {
        // Put it back rather than let the heart lie about what was saved.
        setMember((prev) => (prev ? { ...prev, savedExerciseIDs: current } : prev));
      }
    },
    [member]
  );

  // --- Streak --------------------------------------------------------------
  // Completions are the source of truth, not a counter that only goes up. Miss
  // a week and the streak is what the calendar says it is.

  const streak = useMemo(() => computeStreak(completions), [completions]);

  // `bestStreak` is the longest run in her whole history, which is the field the
  // phone and /admin read back. Deriving it from `streak.current` meant a member
  // with a 12 day run behind her had a bestStreak of 2 written over the top of
  // it the first time she opened the web app.
  useEffect(() => {
    if (FIXTURES_ON) return;
    if (!member?.id || !completions.length) return;
    const best = Math.max(Number(member.bestStreak) || 0, streak.best);
    if (streak.current === member.streak && best === member.bestStreak) return;
    updateMember(member.id, { streak: streak.current, bestStreak: best }).catch(() => {});
  }, [member?.id, member?.streak, member?.bestStreak, streak.current, streak.best, completions.length]);

  // --- Writes the player makes --------------------------------------------

  const logVideoWatched = useCallback(
    async ({ video, secondsWatched, completed, programDay }) => {
      if (!member?.id || !video) return;
      try {
        await recordWorkoutEvent(member.id, {
          videoID: video.id,
          videoTitle: video.title,
          secondsWatched: Math.max(0, Math.round(secondsWatched || 0)),
          completed: Boolean(completed),
          programDay: programDay ?? null,
          goal: goalId,
        });
      } catch {
        // A lost event costs a "watched" tick, never her progress.
      }
    },
    [member?.id, goalId]
  );

  const logDayComplete = useCallback(
    async ({ day, secondsWatched }) => {
      if (!member?.id || !day) return;
      try {
        await recordDayCompletion(member.id, {
          programID: goalId,
          day,
          secondsWatched,
        });
        await updateMember(member.id, {
          programDay: day + 1,
          ...(member.programStartedAt ? {} : { programStartedAt: new Date().toISOString() }),
        });
      } catch {
        // Fall through: reloadHistory below simply finds nothing new.
      }
      await reloadHistory();
    },
    [member?.id, member?.programStartedAt, goalId, reloadHistory]
  );

  const value = useMemo(
    () => ({
      configured,
      authState,
      signingIn,
      user,
      member,
      memberError,
      contentError,
      entitlement,
      entitlementChecking,
      signIn,
      signOut: signOutMember,
      refreshMember,
      refreshEntitlement,
      patchMember,
      goalId,
      goal: goalById(goalId),
      program,
      catalog,
      days,
      planLength,
      dayNumber,
      dayUnlocked,
      sessionDay,
      currentDay,
      todaysVideos,
      graduated,
      completions,
      events,
      history,
      streak,
      savedIds,
      toggleSaved,
      reloadHistory,
      logVideoWatched,
      logDayComplete,
    }),
    [
      configured, authState, signingIn, user, member, memberError, contentError,
      entitlement, entitlementChecking, signIn, signOutMember, refreshMember,
      refreshEntitlement, patchMember, goalId,
      program, catalog, days, planLength, dayNumber, dayUnlocked, sessionDay,
      currentDay, todaysVideos,
      graduated, completions, events, history, streak, savedIds, toggleSaved,
      reloadHistory, logVideoWatched, logDayComplete,
    ]
  );

  return <MemberContext.Provider value={value}>{children}</MemberContext.Provider>;
}

// --- Helpers ---------------------------------------------------------------

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === "function") return value.toDate();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function dayKey(date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/**
 * Current and best run of consecutive calendar days with a completed session.
 * Yesterday still counts as "current" so a streak does not die at midnight
 * before she has had a chance to open the app.
 */
export function computeStreak(completions) {
  const keys = new Set();
  for (const c of completions || []) {
    const d = toDate(c.completedAt);
    if (d) keys.add(dayKey(d));
  }
  if (!keys.size) return { current: 0, best: 0, days: [] };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const walk = (start) => {
    let count = 0;
    const cursor = new Date(start);
    while (keys.has(dayKey(cursor))) {
      count += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  };

  let current = walk(today);
  if (current === 0) {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    current = walk(yesterday);
  }

  // Best run: sort the distinct days and count the longest unbroken chain.
  const sorted = [...keys]
    .map((k) => {
      const [y, m, d] = k.split("-").map(Number);
      return new Date(y, m, d).getTime();
    })
    .sort((a, b) => a - b);
  let best = 1;
  let run = 1;
  const DAY = 24 * 60 * 60 * 1000;
  for (let i = 1; i < sorted.length; i += 1) {
    const gap = Math.round((sorted[i] - sorted[i - 1]) / DAY);
    run = gap === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }

  // The last seven calendar days, oldest first, for the dot row.
  const week = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    week.push({ date: d, done: keys.has(dayKey(d)) });
  }

  return { current, best: Math.max(best, current), days: week };
}
