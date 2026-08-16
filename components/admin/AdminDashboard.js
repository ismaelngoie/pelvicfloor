"use client";

// /admin - the whole screen.
//
// Access is a Google sign-in and one allowed address. That check runs in the
// browser, which makes it a courtesy and not a lock: the real gate is the
// Firestore rules in firestore.rules at the root of this repo, which refuse to
// hand any member data to anybody else. Publish those, or this page is the only
// thing standing in the way.
//
// Firestore cannot add up numbers at this shape of data, so the whole users
// collection is read once, counted in the browser, and held in state. Every
// number on screen therefore has a timestamp, and the header says what it is.

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from "firebase/auth";
import { ADMIN_EMAIL, auth, isAdminEmail, isFirebaseConfigured } from "@/lib/firebase";
import { fetchAllMembers, fetchRevenueCatMembers } from "@/lib/adminData";
import { fetchAppTelemetry } from "@/lib/adminAppData";
import { formatDateTime, normalizeMember } from "@/lib/adminMetrics";
import { FIXTURES_ON } from "@/lib/devFixtures";
import AppOverview from "./AppOverview";
import Acquisition from "./Acquisition";
import Members, { MembersSkeleton } from "./Members";
import Programs from "./Programs";
import { Button, Card, ErrorState, Segmented } from "./ui";

/** One source of truth for desktop and phone navigation. */
const TABS = [
  { id: "overview", label: "App pulse", hint: "Engagement and program health" },
  { id: "acquisition", label: "Apple Ads", hint: "Install, trial, and paid" },
  { id: "members", label: "Members", hint: "Active premium and all people" },
  { id: "programs", label: "Programs", hint: "Edit workouts remotely" },
];

const THEME_KEY = "pelvi_admin_theme";

/* -------------------------------------------------------------------------
   Chrome
   ------------------------------------------------------------------------- */

function Wordmark() {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="flex h-8 w-8 items-center justify-center rounded-[10px] text-[15px] font-black"
        style={{
          background: "linear-gradient(135deg, var(--pv-rose), var(--pv-violet))",
          color: "var(--pv-accent-ink)",
        }}
        aria-hidden="true"
      >
        P
      </span>
      <span className="text-[15px] font-semibold tracking-tight" style={{ color: "var(--pv-ink)" }}>
        Pelvi
        <span className="ml-1.5 font-normal" style={{ color: "var(--pv-ink-3)" }}>
          Admin
        </span>
      </span>
    </div>
  );
}

/** A calm, centred card. Every signed-out state uses it, so they all match. */
function Gate({ title, description, children, footnote }) {
  return (
    <div className="pv-safe-x flex min-h-full items-center justify-center py-16">
      <Card className="pv-rise w-full max-w-md p-7 text-center">
        <div className="mb-6 flex justify-center">
          <Wordmark />
        </div>
        <h1 className="text-[22px] font-semibold leading-tight" style={{ color: "var(--pv-ink)" }}>
          {title}
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed" style={{ color: "var(--pv-ink-2)" }}>
          {description}
        </p>
        {children ? <div className="mt-6 flex flex-col items-center gap-3">{children}</div> : null}
        {footnote ? (
          <p className="mt-6 text-[12px] leading-relaxed" style={{ color: "var(--pv-ink-3)" }}>
            {footnote}
          </p>
        ) : null}
      </Card>
    </div>
  );
}

/**
 * The desktop navigation, from 1024px up.
 *
 * There are only two sections, which on its own would not justify a sidebar.
 * What justifies it is everything else it holds: when the numbers were counted,
 * the control that counts them again, and who is signed in. In the top bar
 * those sat in a row at the far right of a 1440px screen, a metre away from the
 * numbers they describe. Here they are one column, read top to bottom.
 */
function Sidebar({ tab, onTab, countedAt, dataState, onRefresh, theme, onTheme, email, onSignOut }) {
  const busy = dataState === "loading" || dataState === "refreshing";

  return (
    <nav className="pv-sidebar" aria-label="Dashboard sections">
      <div className="px-3 pb-6 pt-1">
        <Wordmark />
      </div>

      <ul className="space-y-1">
        {TABS.map((item) => {
          const selected = item.id === tab;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onTab(item.id)}
                aria-current={selected ? "page" : undefined}
                className="flex w-full flex-col items-start gap-0.5 rounded-xl px-3 py-2.5 text-left transition-colors"
                style={
                  selected
                    ? { background: "var(--pv-surface-2)", color: "var(--pv-ink)" }
                    : { background: "transparent", color: "var(--pv-ink-2)" }
                }
              >
                <span className="text-[14px] font-semibold">{item.label}</span>
                <span className="text-[12px]" style={{ color: "var(--pv-ink-3)" }}>
                  {item.hint}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto space-y-3 pt-8">
        <div
          className="rounded-xl px-3 py-3"
          style={{ background: "var(--pv-surface-2)", border: "1px solid var(--pv-border)" }}
        >
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: "var(--pv-ink-3)" }}
          >
            Counted
          </p>
          <p className="mt-1 text-[12px] leading-snug" style={{ color: "var(--pv-ink-2)" }}>
            {countedAt ? formatDateTime(countedAt) : "Counting for the first time"}
          </p>
          <button
            type="button"
            onClick={onRefresh}
            disabled={busy}
            className="mt-3 min-h-[36px] w-full rounded-full px-3 text-[13px] font-semibold"
            style={{
              background: "var(--pv-surface)",
              border: "1px solid var(--pv-border)",
              color: "var(--pv-ink)",
              opacity: busy ? 0.6 : 1,
            }}
          >
            {dataState === "refreshing" ? "Counting" : "Count again"}
          </button>
        </div>

        <div className="px-3">
          <p className="truncate text-[12px]" style={{ color: "var(--pv-ink-2)" }} title={email}>
            {email || "Signed in"}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onTheme}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[14px]"
              style={{
                background: "var(--pv-surface-2)",
                border: "1px solid var(--pv-border)",
                color: "var(--pv-ink)",
              }}
              aria-label={theme === "dark" ? "Switch to the light theme" : "Switch to the dark theme"}
            >
              {theme === "dark" ? "☀" : "☾"}
            </button>
            <button
              type="button"
              onClick={onSignOut}
              className="min-h-[36px] flex-1 rounded-full px-3 text-[13px] font-semibold"
              style={{
                background: "transparent",
                border: "1px solid var(--pv-border)",
                color: "var(--pv-ink-2)",
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

function GoogleMark() {
  return (
    <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.6 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C39.9 35.8 44 30.5 44 24c0-1.3-.1-2.6-.4-3.9z" />
    </svg>
  );
}

/* -------------------------------------------------------------------------
   The page
   ------------------------------------------------------------------------- */

export default function AdminDashboard() {
  const configured = isFirebaseConfigured();

  const [theme, setTheme] = useState("dark");
  const [user, setUser] = useState(null);
  const [authState, setAuthState] = useState(configured ? "loading" : "unconfigured");
  const [authError, setAuthError] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  const [members, setMembers] = useState([]);
  const [telemetry, setTelemetry] = useState({ completions: [], events: [], checkins: [], commands: [], lifecycle: [], lifecycleAvailable: false });
  const [membership, setMembership] = useState(null);
  const [membershipError, setMembershipError] = useState("");
  const [dataState, setDataState] = useState("idle");
  const [dataError, setDataError] = useState("");
  const [countedAt, setCountedAt] = useState(null);
  const [tab, setTab] = useState("overview");
  // Bumped after every refresh so Apple Ads uses the same fresh 28-day window.
  const [reloadToken, setReloadToken] = useState(0);

  const isAdmin = Boolean(user && isAdminEmail(user.email));

  /* --- Theme ----------------------------------------------------------- */

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(THEME_KEY);
      if (saved === "light" || saved === "dark") setTheme(saved);
    } catch {
      // A browser with storage turned off just gets the dark theme.
    }
  }, []);

  const toggleTheme = () => {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      try {
        window.localStorage.setItem(THEME_KEY, next);
      } catch {
        // Nothing to do. The choice simply will not be remembered.
      }
      return next;
    });
  };

  /* --- Auth ------------------------------------------------------------ */

  useEffect(() => {
    // Local QA only, and dead code in a production bundle. The NODE_ENV test is
    // repeated here rather than left to FIXTURES_ON because only a literal at
    // this exact spot lets webpack delete the block, and with it the dynamic
    // import below. See lib/devFixtures.js.
    if (process.env.NODE_ENV !== "production" && FIXTURES_ON) {
      let mounted = true;
      import("@/lib/devFixtureData").then((f) => {
        if (!mounted) return;
        setUser(f.fixtureUser);
        setAuthState("signedIn");
      });
      return () => { mounted = false; };
    }
    if (!configured) return undefined;

    let unsubscribe = () => {};
    try {
      const instance = auth();
      // A phone that fell back to a redirect lands back here.
      getRedirectResult(instance).catch((error) => {
        if (error?.code !== "auth/no-auth-event") setAuthError(describeAuthError(error));
      });
      unsubscribe = onAuthStateChanged(
        instance,
        (next) => {
          setUser(next);
          setAuthState(next ? "signedIn" : "signedOut");
        },
        (error) => {
          setAuthError(describeAuthError(error));
          setAuthState("signedOut");
        }
      );
    } catch (error) {
      setAuthError(describeAuthError(error));
      setAuthState("signedOut");
    }
    return () => unsubscribe();
  }, [configured]);

  const startSignIn = async () => {
    setSigningIn(true);
    setAuthError("");
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    try {
      await signInWithPopup(auth(), provider);
    } catch (error) {
      const code = error?.code || "";
      const popupFailed =
        code === "auth/popup-blocked" ||
        code === "auth/operation-not-supported-in-this-environment" ||
        code === "auth/popup-closed-by-user";
      if (popupFailed) {
        try {
          await signInWithRedirect(auth(), provider);
          return;
        } catch (redirectError) {
          setAuthError(describeAuthError(redirectError));
        }
      } else if (code !== "auth/cancelled-popup-request") {
        setAuthError(describeAuthError(error));
      }
    } finally {
      setSigningIn(false);
    }
  };

  const endSession = async () => {
    try {
      await signOut(auth());
    } catch (error) {
      setAuthError(describeAuthError(error));
    }
    setMembers([]);
    setMembership(null);
    setMembershipError("");
    setDataState("idle");
    setCountedAt(null);
  };

  /* --- Data ------------------------------------------------------------ */

  const load = useCallback(async () => {
    setDataState((current) => (current === "ready" ? "refreshing" : "loading"));
    setDataError("");
    setMembershipError("");
    try {
      let next;
      let nextTelemetry;
      let nextMembership;
      if (process.env.NODE_ENV !== "production" && FIXTURES_ON) {
        const f = await import("@/lib/devFixtureData");
        next = f.fixtureMembers().map((row) => normalizeMember(row));
        nextTelemetry = { completions: [], events: [], checkins: [], commands: [], lifecycle: [], lifecycleAvailable: false };
        const fixtureActive = next.slice(0, 26).map((member, index) => ({
          id: member.id,
          identityIds: [member.id],
          email: member.email,
          displayName: member.name,
          lastSeenAt: member.lastSeenAt?.toISOString() || null,
          isActivePremium: true,
          phase: index < 20 ? "paid" : "trial",
          state: index < 20 ? "paid" : "trial",
          subscription: { autoRenewalStatus: "will_renew", status: index < 20 ? "active" : "trialing" },
        }));
        nextMembership = {
          source: "RevenueCat API v2 fixture",
          fetchedAt: Date.now(),
          customers: fixtureActive,
          totals: { activePremium: 26, paid: 20, trials: 6, syncedActivePremium: 26, syncedPaid: 20, syncedTrials: 6, canceledWithAccess: 0, openedToday: 0, opened7Days: fixtureActive.filter((row) => row.lastSeenAt && new Date(row.lastSeenAt) >= new Date(Date.now() - 7 * 86400000)).length },
        };
      } else {
        const [memberRows, appTelemetry] = await Promise.all([
          fetchAllMembers(),
          fetchAppTelemetry(),
        ]);
        const membershipResult = await fetchRevenueCatMembers(user, memberRows.map((member) => member.id))
          .then((value) => ({ value, error: "" }))
          .catch((error) => ({ value: null, error: error?.message || "RevenueCat memberships did not load." }));
        next = memberRows;
        nextTelemetry = appTelemetry;
        nextMembership = membershipResult.value;
        setMembershipError(membershipResult.error);
      }
      setMembers(next);
      setTelemetry(nextTelemetry);
      setMembership(nextMembership);
      setCountedAt(new Date());
      setDataState("ready");
      setReloadToken((n) => n + 1);
    } catch (error) {
      setDataError(describeDataError(error));
      setDataState("error");
    }
  }, [user]);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  const patchMember = useCallback((id, patch) => {
    setMembers((current) => current.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }, []);

  const now = useMemo(() => countedAt || new Date(), [countedAt]);
  const appMembers = useMemo(() => members.filter((member) => member.platform === "ios"), [members]);
  const memberViews = useMemo(() => joinMembership(appMembers, membership), [appMembers, membership]);

  /* --- Gates ----------------------------------------------------------- */

  let body;

  if (authState === "unconfigured") {
    body = (
      <Gate
        title="This deployment has no Firebase keys"
        description="The dashboard reads members straight from Firestore, so it needs the project keys before it can show anything. Add them to the Cloudflare Pages build environment and deploy again."
        footnote="The names are NEXT_PUBLIC_FIREBASE_API_KEY and NEXT_PUBLIC_FIREBASE_APP_ID. They are not secrets. What keeps member data safe is the rules file, firestore.rules, in the root of this repo."
      />
    );
  } else if (authState === "loading") {
    body = (
      <Gate title="Checking your sign-in" description="One moment. This only takes a second.">
        <div className="pv-skeleton h-11 w-48" />
      </Gate>
    );
  } else if (authState === "signedOut") {
    body = (
      <Gate
        title="Sign in to the dashboard"
        description="This page is for the owner of Pelvi. Sign in with the Google account that owns the business."
        footnote={
          authError ||
          "Only one address gets in. Everybody else is turned away here, and turned away again by the database itself."
        }
      >
        <Button onClick={startSignIn} disabled={signingIn}>
          <GoogleMark />
          {signingIn ? "Opening Google" : "Continue with Google"}
        </Button>
      </Gate>
    );
  } else if (!isAdmin) {
    body = (
      <Gate
        title="This account does not have access"
        description={`You are signed in as ${user?.email || "an account"}, which is not the owner account. Sign out and try the address the business is registered to.`}
        footnote={`Only ${ADMIN_EMAIL} can open this dashboard.`}
      >
        <Button variant="ghost" onClick={endSession}>
          Sign out
        </Button>
      </Gate>
    );
  } else {
    body = (
      <>
        <Sidebar
          tab={tab}
          onTab={setTab}
          countedAt={countedAt}
          dataState={dataState}
          onRefresh={load}
          theme={theme}
          onTheme={toggleTheme}
          email={user?.email}
          onSignOut={endSession}
        />

        <div className="pv-shell-main">
        <header
          className="pv-safe-x sticky top-0 z-30 shrink-0 pb-3 pt-[max(12px,env(safe-area-inset-top))] lg:hidden"
          style={{
            borderBottom: "1px solid var(--pv-border)",
            background: "var(--pv-canvas)",
          }}
        >
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3">
            <Wordmark />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleTheme}
                className="flex h-10 w-10 items-center justify-center rounded-full text-[15px]"
                style={{
                  background: "var(--pv-surface-2)",
                  border: "1px solid var(--pv-border)",
                  color: "var(--pv-ink)",
                }}
                aria-label={theme === "dark" ? "Switch to the light theme" : "Switch to the dark theme"}
              >
                {theme === "dark" ? "☀" : "☾"}
              </button>
              <button
                type="button"
                onClick={load}
                disabled={dataState === "loading" || dataState === "refreshing"}
                className="min-h-[40px] rounded-full px-4 text-[13px] font-semibold"
                style={{
                  background: "var(--pv-surface-2)",
                  border: "1px solid var(--pv-border)",
                  color: "var(--pv-ink)",
                  opacity: dataState === "refreshing" ? 0.6 : 1,
                }}
              >
                {dataState === "refreshing" ? "Counting" : "Count again"}
              </button>
              <button
                type="button"
                onClick={endSession}
                className="min-h-[40px] rounded-full px-4 text-[13px] font-semibold"
                style={{
                  background: "transparent",
                  border: "1px solid var(--pv-border)",
                  color: "var(--pv-ink-2)",
                }}
              >
                Sign out
              </button>
            </div>
          </div>

          <div className="mx-auto mt-3 flex max-w-[1400px] flex-wrap items-center justify-between gap-3">
            <Segmented
              label="Which part of the dashboard to show"
              value={tab}
              onChange={setTab}
              options={TABS.map((item) => ({ value: item.id, label: item.label }))}
            />
            <p className="text-[12px]" style={{ color: "var(--pv-ink-3)" }}>
              {countedAt
                ? `Counted ${formatDateTime(countedAt)}`
                : "Counting for the first time"}
            </p>
          </div>
        </header>

        <div className="pv-scroll">
          {/* 1600px, not 1400: with 264px of it now spent on the sidebar, the
              old cap left the charts narrower on a 1920 screen than they were
              before the sidebar existed. */}
          <main className="pv-safe-x mx-auto w-full max-w-[1600px] py-6 lg:pt-8">
            {dataState === "error" ? (
              <Card className="p-4">
                <ErrorState title="The member list did not load" description={dataError} onRetry={load} />
              </Card>
            ) : dataState === "loading" || dataState === "idle" ? (
              <MembersSkeleton />
            ) : (
              <div style={{ opacity: dataState === "refreshing" ? 0.6 : 1, transition: "opacity 160ms ease" }}>
                {tab === "overview" ? (
                  <AppOverview
                    members={memberViews.activeMembers}
                    allPeople={memberViews.allPeople}
                    membership={membership}
                    membershipError={membershipError}
                    telemetry={telemetry}
                    now={now}
                    user={user}
                    reloadToken={reloadToken}
                    onOpenAcquisition={() => setTab("acquisition")}
                    onRetry={load}
                  />
                ) : tab === "acquisition" ? (
                  <Acquisition user={user} telemetry={telemetry} reloadToken={reloadToken} />
                ) : tab === "programs" ? (
                  <Programs />
                ) : <Members
                  activeMembers={memberViews.activeMembers}
                  allPeople={memberViews.allPeople}
                  activeTotal={membership?.totals?.activePremium}
                  membershipError={membershipError}
                  onRetry={load}
                  onPatched={patchMember}
                />}
              </div>
            )}
          </main>
        </div>
        </div>
      </>
    );
  }

  return (
    // data-clarity-mask: the same second layer the member app carries, and for
    // a stronger reason. This screen lists every member by name, email, goal,
    // app activity, and clinical check-ins. Microsoft Clarity is never injected on /admin
    // (see app/Clarity.jsx), so this only matters if a client-side navigation
    // ever reaches here from a recorded page, which nothing in the product does
    // today. It costs nothing and it fails safe.
    <div className="pv-admin" data-admin-theme={theme} data-clarity-mask="true">
      <div className="pv-shell">
        {authState === "signedIn" && isAdmin ? body : <div className="pv-scroll">{body}</div>}
      </div>
    </div>
  );
}

/**
 * Join the app profile to the RevenueCat customer without changing either
 * source. The normal key is the RevenueCat app user id, which is also the
 * Firestore document id. Email is a careful fallback for the handful of
 * profiles that were linked to a Firebase account and therefore changed their
 * Firestore document id.
 */
function joinMembership(appMembers, report) {
  const customers = Array.isArray(report?.customers) ? report.customers : [];
  const byIdentity = new Map();
  const byEmail = new Map();
  for (const customer of customers) {
    const ids = Array.isArray(customer.identityIds) ? customer.identityIds : [customer.id];
    for (const id of ids) if (id) byIdentity.set(id, customer);
    if (customer.email) byEmail.set(customer.email.trim().toLowerCase(), customer);
  }

  const profileById = new Map(appMembers.map((member) => [member.id, member]));
  const profileByEmail = new Map(appMembers.filter((member) => member.email).map((member) => [member.email.toLowerCase(), member]));
  const customerFor = (member) => byIdentity.get(member.id) || (member.email ? byEmail.get(member.email.toLowerCase()) : null) || null;
  const profileFor = (customer) => {
    const ids = Array.isArray(customer.identityIds) ? customer.identityIds : [customer.id];
    for (const id of ids) if (profileById.has(id)) return profileById.get(id);
    return customer.email ? profileByEmail.get(customer.email.toLowerCase()) || null : null;
  };

  const merge = (profile, customer) => {
    const rcSeen = customer?.lastSeenAt ? new Date(customer.lastSeenAt) : null;
    const rcSeenValid = rcSeen && !Number.isNaN(rcSeen.getTime()) ? rcSeen : null;
    const lastSeenAt = profile.lastSeenAt && rcSeenValid
      ? (profile.lastSeenAt > rcSeenValid ? profile.lastSeenAt : rcSeenValid)
      : profile.lastSeenAt || rcSeenValid;
    return {
      ...profile,
      name: profile.name || customer?.displayName || "",
      email: profile.email || customer?.email || "",
      lastSeenAt,
      appVersion: profile.appVersion || customer?.appVersion || "",
      revenueCat: customer,
      premiumState: customer?.state || "inactive",
      premiumPhase: customer?.phase || "inactive",
      isActivePremium: customer?.isActivePremium === true,
    };
  };

  const allPeople = appMembers.map((member) => merge(member, customerFor(member)));
  const activeMembers = customers
    .filter((customer) => customer.isActivePremium === true)
    .map((customer) => {
      const profile = profileFor(customer);
      if (profile) return merge(profile, customer);
      const synthetic = normalizeMember({
        id: customer.id,
        name: customer.displayName,
        email: customer.email,
        platform: "ios",
        lastActiveAt: customer.lastSeenAt,
        appVersion: customer.appVersion,
      });
      return { ...merge(synthetic, customer), isRevenueCatOnly: true };
    });

  return { activeMembers, allPeople };
}

/* -------------------------------------------------------------------------
   Turning error codes into sentences
   ------------------------------------------------------------------------- */

function describeAuthError(error) {
  const code = error?.code || "";
  if (code === "auth/unauthorized-domain") {
    return "Google sign-in is not allowed on this web address yet. In Firebase, open Authentication, then Settings, then Authorized domains, and add the address you are on now.";
  }
  if (code === "auth/operation-not-allowed") {
    return "Google sign-in is switched off for this Firebase project. Turn it on under Authentication, then Sign-in method.";
  }
  if (code === "auth/network-request-failed") {
    return "Your connection dropped while signing in. Check the network and try again.";
  }
  if (code === "auth/popup-blocked") {
    return "Your browser blocked the Google window. Allow pop-ups for this site, or try again and it will use a full-page sign-in instead.";
  }
  if (code === "auth/invalid-api-key" || code === "auth/api-key-not-valid") {
    return "The Firebase key this site was built with is not valid. The key is written into lib/firebase.js in the repo, not into a setting, so either it was edited there or the key itself was disabled in the Firebase console.";
  }
  return error?.message || "Sign-in did not work. Try again.";
}

function describeDataError(error) {
  const code = error?.code || "";
  if (code === "permission-denied") {
    return "Firestore refused to hand over the member list. That usually means the rules in firestore.rules have not been published yet, or they were published with a different email address in them. Open the Firebase console, go to Firestore Database, then Rules, and publish the file from the root of this repo.";
  }
  if (code === "unavailable" || code === "failed-precondition") {
    return "Firestore could not be reached. Check the connection and press Refresh.";
  }
  if (code === "unauthenticated") {
    return "Your sign-in expired while the page was open. Sign out and back in.";
  }
  return error?.message || "Something went wrong reading the member list.";
}
