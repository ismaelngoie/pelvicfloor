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
import { captureProviderName, forgetAppleName, peekAppleName } from "@/lib/authProviders";
// REDEEMING, NOT SENDING. `sendLoginLink` is deliberately not imported here any
// more: no screen in this product offers to email a login link, because the mail
// leaves from the default firebaseapp.com sender and Gmail bins it without
// telling us. Redemption stays exactly as it was, so every link already sitting
// in a member's inbox still works. The full reasoning, and what has to be true
// before the send comes back, is at the top of lib/identity.js.
import { completeEmailLinkSignIn, looksLikeSignInLink, loginErrorMessage } from "@/lib/identity";
import {
  fetchCompletions, recordDayCompletion, recordWorkoutEvent, resolveMember, updateMember,
} from "@/lib/memberStore";
import {
  allDays, dateKey, memberGoalById, loadCatalog, loadProgram, programState, totalDays,
  videosForDay, PROGRAM_GOALS, personalizeProgram, refreshNativeContent,
} from "@/lib/program";
import {
  adaptPlaylist as adaptNativePlaylist, adaptedProgramVideos, adaptationSummary as nativeAdaptationSummary,
  continuationState, difficultyAfterFeedback, emptyPlanPreferences, latestSessionFeedback,
  mergePlanPreferences, SESSION_RESPONSES, WORKOUT_DIFFICULTIES,
} from "@/lib/planAdaptation";
import { exercisePrescription } from "@/lib/exercisePrescription";
import { AUDIO_JOURNEY_EVENT, latestAudioOutcome } from "@/lib/audioJourney";
import { queuePostWorkout } from "@/lib/ai/proactiveCoach";
import { entitlementState } from "@/lib/memberEntitlement";
import { fetchEntitlement } from "@/lib/memberBilling";
import { fetchRecentCheckIns, fetchRecentEvents, savedIdsOf, setSavedIds, summarizeEvents } from "@/lib/memberData";
import { FIXTURES_ON } from "@/lib/devFixtures";
import { readPlan } from "@/lib/postPurchase";
import { createAccountEpoch } from "@/lib/accountEpoch";

const MemberContext = createContext(null);

export function useMember() {
  const value = useContext(MemberContext);
  if (!value) throw new Error("useMember must be used inside <MemberProvider>.");
  return value;
}

const DEFAULT_GOAL = "coreStrength";

const EMPTY_PREFERENCES = emptyPlanPreferences();

export function MemberProvider({ children }) {
  const [authState, setAuthState] = useState("loading"); // loading | signedOut | signedIn
  const [user, setUser] = useState(null);
  const [member, setMember] = useState(null);
  const [memberError, setMemberError] = useState(null);
  const [signingIn, setSigningIn] = useState(false);

  // REDEEMING A LINK THAT IS ALREADY IN HER INBOX. `linkRedeeming` is true
  // while one is being exchanged for a session, and the gate has to wait on it:
  // without that, the sign-in screen paints for the second it takes, and the
  // member who just tapped the link is looking at a login page.
  //
  // `linkState` has only two live statuses left, and both are outcomes of a
  // redemption rather than of a send: "confirm" (the link opened in a browser
  // that does not remember which address it was for, so Firebase will not spend
  // the code until she names it) and "error" (spent, expired, or the provider
  // has since been switched off). The old "sending" and "sent" went with the
  // screens that offered to email one.
  const [linkRedeeming, setLinkRedeeming] = useState(false);
  const [linkState, setLinkState] = useState({ status: "idle", email: "", message: null });

  // Stripe's live answer to "is she paying", and whether we have heard back once
  // for this account yet. See the entitlement section below.
  const [live, setLive] = useState(null);
  const [entitlementChecked, setEntitlementChecked] = useState(false);

  const [program, setProgram] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [completions, setCompletions] = useState([]);
  const [events, setEvents] = useState([]);
  const [checkIns, setCheckIns] = useState([]);
  const [preferenceRecord, setPreferenceRecord] = useState({ memberId: null, data: EMPTY_PREFERENCES });
  const [audioChangeToken, setAudioChangeToken] = useState(0);
  const [contentError, setContentError] = useState(null);

  const configured = isFirebaseConfigured();
  const loadedGoalRef = useRef(null);
  const pendingCompletionsRef = useRef(new Set());
  const remoteContentRef = useRef(null);
  const appliedRemoteContentRef = useRef(null);
  const accountEpochRef = useRef(createAccountEpoch());
  const checkedForRef = useRef(null);

  const clearMemberUI = useCallback(() => {
    setMember(null);
    setMemberError(null);
    setProgram(null);
    setCatalog(null);
    setCompletions([]);
    setEvents([]);
    setCheckIns([]);
    setPreferenceRecord({ memberId: null, data: EMPTY_PREFERENCES });
    setContentError(null);
    loadedGoalRef.current = null;
    appliedRemoteContentRef.current = null;
    pendingCompletionsRef.current.clear();
  }, []);

  const clearAccountUI = useCallback(() => {
    clearMemberUI();
    setLinkRedeeming(false);
    setLinkState({ status: "idle", email: "", message: null });
    // Reset account-scoped answers; the existing billing check owns reloading.
    checkedForRef.current = null;
    setLive(null);
    setEntitlementChecked(false);
  }, [clearMemberUI]);

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
        accountEpochRef.current.switchUser(f.fixtureUser.uid);
        accountEpochRef.current.bindMember(f.fixtureMember.id);
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
    //
    // THE RESULT IS NOT THROWN AWAY ANY MORE, and that matters for exactly one
    // reason: Apple. Apple sends the member's display name on the very first
    // authorisation and never again (see lib/authProviders.js), and on the
    // redirect path — which is what an in-app browser from an Instagram ad
    // gets, because it cannot open a popup — this call is the ONLY place that
    // name is ever visible. A bare .catch() here silently spent the redirect
    // and dropped it, and she was nameless for the life of the account.
    getRedirectResult(auth())
      .then((result) => (result ? captureProviderName(result) : null))
      .catch(() => {});
    return onAuthStateChanged(auth(), (next) => {
      if (accountEpochRef.current.switchUser(next?.uid)) clearAccountUI();
      setUser(next || null);
      setAuthState(next ? "signedIn" : "signedOut");
      if (!next) setMember(null);
    });
  }, [configured, clearAccountUI]);

  // A link from her inbox can land on any page of the member app, so it is
  // redeemed here rather than on one screen that happens to know about it.
  //
  // Kept out of the effect above deliberately: that one owns the auth listener
  // and must not be re-run, and this one has to be able to report a spent or
  // expired link to the screen without disturbing it.
  useEffect(() => {
    if (!configured || FIXTURES_ON) return undefined;
    if (!looksLikeSignInLink()) return undefined;

    let cancelled = false;
    setLinkRedeeming(true);
    // The .catch is not decoration. `linkRedeeming` holds the gate on a
    // spinner, so a rejection with nothing to clear it would leave a member
    // watching "Signing you in" for ever.
    completeEmailLinkSignIn().catch(() => ({ done: false })).then((result) => {
      if (cancelled) return;
      setLinkRedeeming(false);
      if (result.done) return; // onAuthStateChanged takes it from here.
      if (result.needsEmail) {
        setLinkState({
          status: "confirm",
          email: "",
          message: "Confirm the email address we sent that link to and you are in.",
        });
        return;
      }
      setLinkState({ status: "error", email: "", message: loginErrorMessage(result.code) });
    });

    return () => {
      cancelled = true;
    };
  }, [configured]);

  /**
   * Finish a link that arrived in a browser which did not remember the address.
   *
   * The last thing in this provider that still touches the email path, and it
   * is the half that must never be taken out: it is what makes a link that
   * reached a real member's inbox still open her plan, months after we stopped
   * sending them. `signInWithLink`, which used to sit here and SEND one, is
   * gone with the screens that called it.
   */
  const confirmLinkEmail = useCallback(async (email) => {
    setLinkRedeeming(true);
    const result = await completeEmailLinkSignIn(email).catch(() => ({ done: false }));
    setLinkRedeeming(false);
    if (result.done) return { ok: true };
    setLinkState({
      status: result.needsEmail ? "confirm" : "error",
      email,
      message: loginErrorMessage(result.code),
    });
    return { ok: false };
  }, []);

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
    // Drop the parked Apple name with the account. It is keyed to a browser and
    // not to a person, so a name that outlived the session it came from would
    // be written onto whoever signs in next on this laptop — which for this
    // product is a real scenario and not a theoretical one.
    if (accountEpochRef.current.currentUID == null) {
      forgetAppleName();
      clearAccountUI();
    }
  }, [configured, clearAccountUI]);

  // --- Member record -------------------------------------------------------

  const loadMember = useCallback(async (nextUser) => {
    const scope = accountEpochRef.current.beginProfileLoad(nextUser?.uid);
    if (!accountEpochRef.current.isCurrentProfile(scope)) return null;
    try {
      const record = await resolveMember(nextUser);
      if (!accountEpochRef.current.isCurrentProfile(scope)) return null;
      if (accountEpochRef.current.currentMemberId && accountEpochRef.current.currentMemberId !== record.id) clearMemberUI();
      accountEpochRef.current.bindMember(record.id);
      setMember(record);
      setMemberError(null);
      return record;
    } catch (err) {
      if (!accountEpochRef.current.isCurrentProfile(scope)) return null;
      setMemberError(
        "We could not open your account. Check your connection and try again."
      );
      return null;
    }
  }, [clearMemberUI]);

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
      const scope = accountEpochRef.current.captureMember(member.id);
      if (!accountEpochRef.current.isCurrentMember(scope)) return;
      if (!FIXTURES_ON) await updateMember(member.id, patch);
      if (!accountEpochRef.current.isCurrentMember(scope)) return;
      setMember((prev) => (prev?.id === scope.memberId ? { ...prev, ...patch } : prev));
    },
    [member?.id]
  );

  // THE FOCUS SHE TAPPED IN THE FUNNEL, CARRIED INTO THE MEMBER AREA.
  //
  // The checkout sends only her goal to the server, so her record is created
  // without a focus. The paywall remembered it in the plan record
  // (lib/postPurchase, written on arrival at the paywall), and the first time
  // her record resolves here without one, while the remembered goal still
  // matches, it is written once. Today only the web-only "Tighten Vaginal
  // Canal" focus changes any words; the field stays generic so the phone can
  // adopt it later.
  const focusId = typeof member?.focus === "string" && member.focus ? member.focus : null;
  useEffect(() => {
    if (!member?.id || focusId || FIXTURES_ON) return;
    const plan = readPlan();
    if (!plan?.focusId || !plan.goalId || plan.goalId !== member.goal) return;
    patchMember({ focus: plan.focusId }).catch(() => {
      // Her record simply keeps the goal's own words. Nothing to recover.
    });
  }, [member?.id, member?.goal, focusId, patchMember]);

  // THE NAME APPLE ONLY EVER SAYS ONCE, PUT SOMEWHERE PERMANENT.
  //
  // lib/authProviders.js catches it the instant the Apple popup closes and
  // parks it in localStorage, because at that moment there may be no member
  // record to write it to: she can sign in from the paywall's log in sheet, on
  // a different document entirely, and only reach /app a page load later.
  //
  // This is where it lands. It runs whenever a record is resolved, so it covers
  // every ordering — the sign-in that happened a second ago on this page, and
  // the one that happened on the funnel before she ever got here — and it is
  // deliberately not a race with resolveMember: whichever of the two writes the
  // name first, the other finds it already there and stops.
  //
  // The stash is cleared once her record has a name, from either source. It has
  // to be: it is keyed to a browser, not to an account, and a name left lying
  // around would be written onto the next person who signs in on this laptop.
  useEffect(() => {
    if (FIXTURES_ON) return;
    if (!member?.id) return;
    const stashed = peekAppleName();
    if (!stashed) return;
    const scope = accountEpochRef.current.captureMember(member.id);
    if (!accountEpochRef.current.isCurrentMember(scope)) return;
    if ((member.name || "").trim()) {
      forgetAppleName();
      return;
    }
    updateMember(member.id, { name: stashed })
      .then(() => {
        if (!accountEpochRef.current.isCurrentMember(scope)) return;
        forgetAppleName();
        setMember((prev) => (prev?.id === scope.memberId && !prev.name ? { ...prev, name: stashed } : prev));
      })
      .catch(() => {
        // Leave it in the stash. The next load tries again, and a member
        // without a first name on one screen is not worth a failed sign-in.
      });
  }, [member?.id, member?.name]);

  // --- Entitlement ---------------------------------------------------------
  //
  // This provider is the one place that asks "is she paying", so the question
  // costs one request per session rather than one per screen that wonders.
  //
  // The answer comes from Stripe, live, through /api/entitlement. There is no
  // copy of it in Firestore any more and nothing to keep in sync.

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
  const pathway = member?.pathway === "mensPelvicHealth" || ["prostateRecovery", "bowelControl"].includes(goalId)
    ? "mensPelvicHealth" : "womensPelvicHealth";

  // Native preferences use device storage plus iCloud. The browser keeps an
  // account-scoped local copy and mirrors it to this member's document so web
  // preferences survive changing browsers without leaking between accounts.
  const planPreferences = preferenceRecord.memberId === member?.id ? preferenceRecord.data : EMPTY_PREFERENCES;
  useEffect(() => {
    if (!member?.id) return;
    const scope = accountEpochRef.current.captureMember(member.id);
    if (!accountEpochRef.current.isCurrentMember(scope)) return;
    const local = readPlanPreferences(member.id);
    const merged = mergePlanPreferences(local, member.planPreferences);
    setPreferenceRecord({ memberId: member.id, data: merged });
    storePlanPreferences(member.id, merged);
  }, [member?.id, member?.planPreferences]);

  useEffect(() => {
    const changed = (event) => {
      if (!event.detail?.memberId || event.detail.memberId === member?.id) setAudioChangeToken((value) => value + 1);
    };
    window.addEventListener(AUDIO_JOURNEY_EVENT, changed);
    window.addEventListener("storage", changed);
    return () => {
      window.removeEventListener(AUDIO_JOURNEY_EVENT, changed);
      window.removeEventListener("storage", changed);
    };
  }, [member?.id]);

  const persistPreferences = useCallback(async (next) => {
    if (!member?.id) return;
    const scope = accountEpochRef.current.captureMember(member.id);
    if (!accountEpochRef.current.isCurrentMember(scope)) return;
    const data = { ...next, modifiedAt: new Date().toISOString() };
    setPreferenceRecord({ memberId: member.id, data });
    storePlanPreferences(member.id, data);
    try { await patchMember({ planPreferences: data }); } catch { /* The account-scoped local copy remains usable offline. */ }
  }, [member?.id, patchMember]);

  const difficulty = WORKOUT_DIFFICULTIES.some((item) => item.id === planPreferences.difficultyByGoal?.[goalId])
    ? planPreferences.difficultyByGoal[goalId] : "easy";
  const sessionFeedback = useMemo(() => latestSessionFeedback(planPreferences.feedbackRecords, goalId), [planPreferences, goalId]);
  const setDifficulty = useCallback(async (value) => {
    if (!WORKOUT_DIFFICULTIES.some((item) => item.id === value)) return;
    await persistPreferences({ ...planPreferences, difficultyByGoal: { ...planPreferences.difficultyByGoal, [goalId]: value } });
  }, [goalId, planPreferences, persistPreferences]);

  const saveSessionFeedback = useCallback(async (response, { programDay = null, graduation = false } = {}) => {
    if (!SESSION_RESPONSES.some((item) => item.id === response)) return;
    const now = new Date().toISOString();
    const record = { id: globalThis.crypto?.randomUUID?.() || `web_${Date.now()}_${Math.random().toString(36).slice(2)}`, goal: goalId, programDay, response, date: now };
    await persistPreferences({
      ...planPreferences,
      feedbackRecords: [...(planPreferences.feedbackRecords || []), record].slice(-180),
      difficultyByGoal: { ...planPreferences.difficultyByGoal, [goalId]: difficultyAfterFeedback(response, difficulty, graduation) },
      graduationCheckIns: { ...planPreferences.graduationCheckIns, ...(graduation ? { [goalId]: true } : {}) },
    });
  }, [goalId, difficulty, planPreferences, persistPreferences]);

  useEffect(() => {
    if (!member?.id || !entitlement.active) return undefined;
    const scope = accountEpochRef.current.captureMember(member.id);
    if (!accountEpochRef.current.isCurrentMember(scope)) return undefined;
    const contentKey = `${goalId}:${pathway}`;
    if (loadedGoalRef.current === contentKey && program && catalog) return undefined;

    let cancelled = false;
    loadedGoalRef.current = contentKey;
    setContentError(null);

    (async () => {
      try {
        const [nextCatalog, nextProgram] = await Promise.all([
          loadCatalog(),
          loadProgram(goalId),
        ]);
        if (cancelled || !accountEpochRef.current.isCurrentMember(scope)) return;
        setCatalog(nextCatalog);
        setProgram(personalizeProgram(nextProgram, pathway));
      } catch {
        if (!cancelled && accountEpochRef.current.isCurrentMember(scope)) {
          setContentError("We could not load your plan. Check your connection and try again.");
          loadedGoalRef.current = null;
        }
      }
    })();

    return () => { cancelled = true; };
  }, [member?.id, entitlement.active, goalId, pathway, program, catalog]);

  useEffect(() => {
    if (!member?.id || !entitlement.active || !program || !catalog) return undefined;
    const scope = accountEpochRef.current.captureMember(member.id);
    if (!accountEpochRef.current.isCurrentMember(scope)) return undefined;
    const contentKey = `${member.id}:${goalId}:${pathway}`;
    if (appliedRemoteContentRef.current === contentKey || FIXTURES_ON) return undefined;
    if (!remoteContentRef.current) remoteContentRef.current = refreshNativeContent();
    let cancelled = false;
    remoteContentRef.current.then((pair) => {
      if (cancelled || !pair || !accountEpochRef.current.isCurrentMember(scope)) return;
      const nextProgram = pair.programs.programs.find((item) => item.goal === goalId);
      if (!nextProgram) return;
      appliedRemoteContentRef.current = contentKey;
      setCatalog(pair.catalog);
      setProgram(personalizeProgram(nextProgram, pathway));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [member?.id, entitlement.active, program, catalog, goalId, pathway]);

  const reloadHistory = useCallback(async () => {
    if (!member?.id) return;
    const scope = accountEpochRef.current.captureMember(member.id);
    if (!accountEpochRef.current.isCurrentMember(scope)) return;
    if (process.env.NODE_ENV !== "production" && FIXTURES_ON) {
      const f = await import("@/lib/devFixtureData");
      if (!accountEpochRef.current.isCurrentMember(scope)) return;
      setEvents(f.fixtureEvents(catalog));
      return;
    }
    try {
      const [nextCompletions, nextEvents, nextCheckIns] = await Promise.allSettled([
        fetchCompletions(member.id),
        fetchRecentEvents(member.id),
        fetchRecentCheckIns(member.id),
      ]);
      if (!accountEpochRef.current.isCurrentMember(scope)) return;
      if (nextCompletions.status === "fulfilled") setCompletions(nextCompletions.value);
      if (nextEvents.status === "fulfilled") setEvents(nextEvents.value);
      if (nextCheckIns.status === "fulfilled") setCheckIns(nextCheckIns.value);
    } catch {
      // History is additive. A failed read leaves what she already sees.
    }
  }, [member?.id, catalog]);

  useEffect(() => {
    if (!member?.id || !entitlement.active) return;
    reloadHistory();
  }, [member?.id, member?.programDay, member?.lastActiveAt, entitlement.active, reloadHistory]);

  useEffect(() => {
    if (!member?.id || !entitlement.active) return undefined;
    let lastRefresh = 0;
    const refreshVisibleHistory = () => {
      if (document.visibilityState === "hidden" || Date.now() - lastRefresh < 1000) return;
      lastRefresh = Date.now();
      void reloadHistory(); // The captured member epoch rejects stale results.
    };
    window.addEventListener("focus", refreshVisibleHistory);
    document.addEventListener("visibilitychange", refreshVisibleHistory);
    return () => {
      window.removeEventListener("focus", refreshVisibleHistory);
      document.removeEventListener("visibilitychange", refreshVisibleHistory);
    };
  }, [member?.id, entitlement.active, reloadHistory]);

  // --- Derived program state ----------------------------------------------

  const days = useMemo(() => allDays(program), [program]);
  const planLength = useMemo(() => totalDays(program), [program]);

  /**
   * The web's port of ProgramEngine.dayChangeToken. The midnight rule is the one
   * piece of state the clock moves on its own, and a browser tab left open
   * overnight has nothing to redraw against: without this, a member who finished
   * at 22:00 still reads "Day 22 opens tomorrow" at 00:01. iOS listens for
   * NSCalendarDayChanged; the nearest thing here is a timer to the next local
   * midnight, plus a check when the tab is brought back to the front (a
   * suspended tab does not fire its timers).
   */
  const [dayChangeToken, setDayChangeToken] = useState(0);
  useEffect(() => {
    let timer;
    const tick = () => setDayChangeToken((n) => n + 1);
    const arm = () => {
      clearTimeout(timer);
      const now = new Date();
      // Two seconds past midnight, not midnight exactly: a timer that fires a
      // hair early would still be reading yesterday's date and would re-arm for
      // a delay of zero, spinning until the clock caught up.
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 2, 0);
      // setTimeout takes a 32-bit signed millisecond count, so anything past
      // ~24.8 days silently fires at once. A day is well inside that; clamp
      // anyway, because a machine that wakes with a wrong clock is a real thing.
      timer = setTimeout(() => { tick(); arm(); },
        Math.min(Math.max(midnight - now, 1000), 2147483647));
    };
    arm();
    // A suspended tab runs no timers, so coming back has to re-ask by itself.
    // Deliberately not gated on `visibilityState === "visible"`: recomputing on
    // the way out costs nothing, and an embedded or prerendered view can report
    // a state that never satisfies that test, which would leave the member
    // looking at yesterday until she reloaded.
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("pageshow", tick);
    window.addEventListener("focus", tick);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("pageshow", tick);
      window.removeEventListener("focus", tick);
    };
  }, []);

  /**
   * "yyyy-MM-dd" in her own calendar, recomputed on the midnight tick above.
   * Anything scoped to "today" (has she finished a session today, how full is
   * today's ring, which day the check-in belongs to) must depend on this and
   * not on a bare `new Date()` inside a `useMemo`, or it keeps yesterday's
   * answer until she reloads. That is how a tab left open overnight came to say
   * "Today's plan is done" at one minute past midnight.
   */
  // eslint-disable-next-line react-hooks/exhaustive-deps -- dayChangeToken is the tick.
  const todayKey = useMemo(() => dateKey(new Date()), [dayChangeToken]);

  /**
   * ONE source of truth for every day number on every screen. Read the block
   * comment above `programState` in lib/program.js before using any of these:
   * `currentDayNumber` is her position and is the only one that may be printed
   * as "Day N of 90"; `replayDayNumber` is a day she has already finished and
   * must carry the word "Replay"; `sessionDayNumber` is a content lookup.
   */
  const state = useMemo(
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dayChangeToken is
    // the midnight tick: it carries no value, it exists to re-run this.
    () => programState(program, completions, new Date()),
    [program, completions, dayChangeToken]
  );
  const {
    currentDayNumber, currentDayUnlocked, graduated, replayDayNumber,
    sessionDayNumber: stateSessionDayNumber, bankableDayNumber, completedDayCount, highestUnlockedDay,
  } = state;

  const continuation = useMemo(() => graduated ? {
    ...continuationState(completions, goalId, new Date()),
    needsCheckIn: !planPreferences.graduationCheckIns?.[goalId],
  } : null, [graduated, completions, goalId, planPreferences, dayChangeToken]);
  const sessionDayNumber = continuation?.sourceDayNumber || stateSessionDayNumber;

  const currentDay = useMemo(() => {
    if (!days.length) return null;
    const index = Math.min(Math.max(sessionDayNumber, 1), days.length) - 1;
    return days[index] || null;
  }, [days, sessionDayNumber]);

  /**
   * The day the Today card is NAMED after, which is always the day she is on.
   * On the evening she finishes day 21 the phone's card reads "Day 22: ..." while
   * the ring replays day 21, so `currentDay` (what plays) and `headlineDay` (what
   * the card is called) are deliberately different objects that evening.
   */
  const headlineDay = useMemo(() => {
    if (!days.length) return null;
    const index = Math.min(Math.max(currentDayNumber, 1), days.length) - 1;
    return days[index] || null;
  }, [days, currentDayNumber]);

  const audioOutcome = useMemo(() => latestAudioOutcome(member?.id, goalId), [member?.id, goalId, audioChangeToken, dayChangeToken]);
  const adaptationOptions = useMemo(() => ({ goalId, focusId, catalog, difficulty, feedback: sessionFeedback, audioOutcome }),
    [goalId, focusId, catalog, difficulty, sessionFeedback, audioOutcome]);
  const adaptPlaylist = useCallback((videos, { programDay } = {}) => adaptNativePlaylist(videos, { ...adaptationOptions, programDay }), [adaptationOptions]);
  const videosForProgramDay = useCallback((day, { includeForm = false } = {}) => {
    const authored = videosForDay(day, catalog);
    const options = { ...adaptationOptions, programDay: day?.day };
    return includeForm ? adaptedProgramVideos(authored, options) : adaptNativePlaylist(authored, options);
  }, [catalog, adaptationOptions]);
  const todaysVideos = useMemo(() => videosForProgramDay(currentDay, { includeForm: !graduated }),
    [currentDay, graduated, videosForProgramDay]);
  const adaptationSummary = useMemo(() => nativeAdaptationSummary(adaptationOptions), [adaptationOptions]);
  const shouldOpenCoachMode = sessionFeedback?.response === "couldNotFeel";
  const prescriptionForVideo = useCallback((video, { programDay = sessionDayNumber } = {}) => exercisePrescription(video,
    { member, goalId, focusId, difficulty, programDay }), [member, goalId, focusId, difficulty, sessionDayNumber]);

  const history = useMemo(() => summarizeEvents(events), [events]);
  const savedIds = useMemo(() => savedIdsOf(member), [member]);

  const toggleSaved = useCallback(
    async (videoId) => {
      if (!member?.id || !videoId) return;
      const scope = accountEpochRef.current.captureMember(member.id);
      if (!accountEpochRef.current.isCurrentMember(scope)) return;
      const current = savedIdsOf(member);
      const next = current.includes(videoId)
        ? current.filter((id) => id !== videoId)
        : [videoId, ...current];
      setMember((prev) => (prev?.id === scope.memberId ? { ...prev, savedExerciseIDs: next } : prev));
      if (FIXTURES_ON) return;
      try {
        await setSavedIds(member.id, next);
      } catch {
        if (!accountEpochRef.current.isCurrentMember(scope)) return;
        // Put it back rather than let the heart lie about what was saved.
        setMember((prev) => (prev?.id === scope.memberId ? { ...prev, savedExerciseIDs: current } : prev));
      }
    },
    [member]
  );

  // --- Streak --------------------------------------------------------------
  // Completions are the source of truth, not a counter that only goes up. Miss
  // a week and the streak is what the calendar says it is.

  const dailySessionCompletions = useMemo(() => events.filter((event) => event.sessionCompleted
    && ["program", "continuation", "replay"].includes(event.playbackContext))
    .map((event) => ({ ...event, completedAt: event.date })), [events]);
  const streak = useMemo(() => computeStreak([...completions, ...dailySessionCompletions]),
    [completions, dailySessionCompletions, dayChangeToken]);

  // `bestStreak` is the longest run in her whole history, which is the field the
  // phone and /admin read back. Deriving it from `streak.current` meant a member
  // with a 12 day run behind her had a bestStreak of 2 written over the top of
  // it the first time she opened the web app.
  useEffect(() => {
    if (FIXTURES_ON) return;
    if (!member?.id || !completions.length) return;
    const scope = accountEpochRef.current.captureMember(member.id);
    if (!accountEpochRef.current.isCurrentMember(scope)) return;
    const best = Math.max(Number(member.bestStreak) || 0, streak.best);
    if (streak.current === member.streak && best === member.bestStreak) return;
    updateMember(member.id, { streak: streak.current, bestStreak: best }).catch(() => {});
  }, [member?.id, member?.streak, member?.bestStreak, streak.current, streak.best, completions.length]);

  // --- Writes the player makes --------------------------------------------

  const logVideoWatched = useCallback(
    async ({ video, secondsWatched, completed, programDay, playbackContext = "library" }) => {
      if (!member?.id || !video) return false;
      const scope = accountEpochRef.current.captureMember(member.id);
      if (!accountEpochRef.current.isCurrentMember(scope)) return false;
      try {
        const event = {
          videoID: video.id,
          videoTitle: video.title,
          secondsWatched: Math.max(0, Math.round(secondsWatched || 0)),
          completed: Boolean(completed),
          programDay: programDay ?? null,
          goal: goalId,
          playbackContext,
        };
        const eventId = FIXTURES_ON ? `local_${Date.now()}_${video.id}` : await recordWorkoutEvent(member.id, event);
        if (accountEpochRef.current.isCurrentMember(scope)) setEvents((current) => [{ ...event, id: eventId, date: new Date().toISOString() }, ...current]);
        return true;
      } catch {
        // A lost event costs a "watched" tick, never her progress.
        return false;
      }
    },
    [member?.id, goalId]
  );

  const logSessionComplete = useCallback(async ({ secondsWatched, completedCount, videoCount, programDay, playbackContext = "library" }) => {
    if (!member?.id) return false;
    const scope = accountEpochRef.current.captureMember(member.id);
    if (!accountEpochRef.current.isCurrentMember(scope)) return false;
    const event = {
      eventType: "session_completed", sessionCompleted: true, completed: true,
      secondsWatched: 0, sessionSecondsWatched: Math.max(0, Math.round(secondsWatched || 0)),
      completedCount, videoCount, programDay: programDay ?? null, playbackContext, goal: goalId,
    };
    try {
      const eventId = FIXTURES_ON ? `local_session_${Date.now()}` : await recordWorkoutEvent(member.id, event);
      if (accountEpochRef.current.isCurrentMember(scope)) setEvents((current) => [{ ...event, id: eventId, date: new Date().toISOString() }, ...current]);
      if (["continuation", "replay"].includes(playbackContext)) queuePostWorkout({ memberId: member.id, goalId, pathway,
        programDay, workoutTitle: currentDay?.title || "Your session", streak: streak.current });
      return true;
    } catch { return false; }
  }, [member?.id, goalId, pathway, currentDay, streak.current]);

  const logDayComplete = useCallback(
    async ({ day, secondsWatched }) => {
      if (!member?.id || !day) return false;
      const scope = accountEpochRef.current.captureMember(member.id);
      if (!accountEpochRef.current.isCurrentMember(scope)) return false;
      // ProgramEngine.completeDay opens with `guard !completedDays.contains(day)`.
      // Same guard, same reason: a replay must never write a second record over
      // the day it is replaying, and a graduate must never bank a 91st day.
      const completionKey = `${scope.uid}:${scope.memberId}:${goalId}:${day}`;
      if (day !== bankableDayNumber || pendingCompletionsRef.current.has(completionKey)) return false;
      pendingCompletionsRef.current.add(completionKey);
      try {
        await recordDayCompletion(member.id, {
          programID: goalId,
          day,
          secondsWatched,
        });
        const completedAt = new Date().toISOString();
        if (accountEpochRef.current.isCurrentMember(scope)) setCompletions((current) => [...current.filter((record) => !(record.programID === goalId && Number(record.day) === day)),
          { id: `${goalId}_${day}`, programID: goalId, day, secondsWatched, completedAt }]);
        queuePostWorkout({ memberId: member.id, goalId, pathway, programDay: day, workoutTitle: currentDay?.title || "Your session", streak: streak.current });
        await updateMember(member.id, {
          // The same number the phone syncs (CloudSync writes
          // `engine.currentDayNumber`, which the engine caps at the plan
          // length). `day + 1` unguarded is how /admin came to show "Day 91 of 90".
          programDay: Math.min(day + 1, planLength || day + 1),
          ...(member.programStartedAt ? {} : { programStartedAt: new Date().toISOString() }),
        }).catch(() => {});
      } catch {
        return false;
      } finally {
        pendingCompletionsRef.current.delete(completionKey);
      }
      await reloadHistory();
      return true;
    },
    [member?.id, member?.programStartedAt, goalId, pathway, currentDay, streak.current, reloadHistory, bankableDayNumber, planLength]
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
      linkRedeeming,
      linkState,
      signIn,
      confirmLinkEmail,
      signOut: signOutMember,
      refreshMember,
      refreshEntitlement,
      patchMember,
      goalId,
      focusId,
      pathway,
      goal: memberGoalById(goalId, pathway),
      difficulty,
      setDifficulty,
      sessionFeedback,
      saveSessionFeedback,
      adaptationSummary,
      shouldOpenCoachMode,
      continuation,
      adaptPlaylist,
      videosForProgramDay,
      prescriptionForVideo,
      checkIns,
      program,
      catalog,
      days,
      planLength,
      todayKey,

      // --- Day numbers. See the block comment above `programState`. ---------
      /** CANONICAL: the day she is on. The only one that may print as "Day N of 90". */
      currentDayNumber,
      /** Whether the day she is on can be played right now (midnight rule). */
      currentDayUnlocked,
      /** A day she has ALREADY FINISHED that the ring is offering again, or null. */
      replayDayNumber,
      /** Which day's videos are loaded. A content lookup, never a label. */
      sessionDayNumber,
      /** The day a finished session may bank, or null. */
      bankableDayNumber,
      /** How many days she has finished. Never printed as "Day N". */
      completedDayCount,
      /** Highest day the pathway renders as tappable. */
      highestUnlockedDay,

      currentDay,
      headlineDay,
      todaysVideos,
      graduated,
      completions,
      dailySessionCompletions,
      events,
      history,
      streak,
      savedIds,
      toggleSaved,
      reloadHistory,
      logVideoWatched,
      logSessionComplete,
      logDayComplete,
    }),
    [
      configured, authState, signingIn, user, member, memberError, contentError,
      entitlement, entitlementChecking, linkRedeeming, linkState,
      signIn, confirmLinkEmail, signOutMember, refreshMember,
      refreshEntitlement, patchMember, goalId, focusId,
      pathway, difficulty, setDifficulty, sessionFeedback, saveSessionFeedback,
      adaptationSummary, shouldOpenCoachMode, continuation, adaptPlaylist,
      videosForProgramDay, prescriptionForVideo, checkIns,
      program, catalog, days, planLength, todayKey,
      currentDayNumber, currentDayUnlocked, replayDayNumber, sessionDayNumber,
      bankableDayNumber, completedDayCount, highestUnlockedDay,
      currentDay, headlineDay, todaysVideos,
      graduated, completions, dailySessionCompletions, events, history, streak, savedIds, toggleSaved,
      reloadHistory, logVideoWatched, logSessionComplete, logDayComplete,
    ]
  );

  return <MemberContext.Provider value={value}>{children}</MemberContext.Provider>;
}

// --- Helpers ---------------------------------------------------------------

function readPlanPreferences(memberId) {
  try { return JSON.parse(window.localStorage.getItem(`pelvi.planPreferences.v1:${memberId}`) || "null"); }
  catch { return null; }
}

function storePlanPreferences(memberId, preferences) {
  try { window.localStorage.setItem(`pelvi.planPreferences.v1:${memberId}`, JSON.stringify(preferences)); }
  catch { /* Storage can be unavailable in a private browser. */ }
}

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
