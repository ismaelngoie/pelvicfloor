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
import { fetchAllMembers } from "@/lib/adminData";
import { formatDateTime, normalizeMember } from "@/lib/adminMetrics";
import { FIXTURES_ON } from "@/lib/devFixtures";
import Overview, { OverviewSkeleton } from "./Overview";
import Members, { MembersSkeleton } from "./Members";
import Audience from "./Audience";
import { Button, Card, ErrorState, Segmented } from "./ui";

/**
 * The three sections, named once. The sidebar, the phone segmented control and
 * the skeleton picker all read this, so a fourth tab is one entry rather than
 * three edits that can disagree.
 */
const TABS = [
  { id: "overview", label: "Overview", hint: "Numbers and charts" },
  { id: "members", label: "Members", hint: "Everyone, one by one" },
  { id: "audience", label: "Audience", hint: "Every email, and the CSV" },
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
  const [dataState, setDataState] = useState("idle");
  const [dataError, setDataError] = useState("");
  const [countedAt, setCountedAt] = useState(null);
  const [tab, setTab] = useState("overview");
  // Bumped by every press of "Count again". The Audience tab reads Stripe
  // through its own endpoint rather than off this Firestore read, so it needs a
  // signal to refetch; a counter is one, and it does not fire on first mount of
  // the dashboard, only when the tab is actually opened.
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
    setDataState("idle");
    setCountedAt(null);
  };

  /* --- Data ------------------------------------------------------------ */

  const load = useCallback(async () => {
    setDataState((current) => (current === "ready" ? "refreshing" : "loading"));
    setDataError("");
    try {
      let next;
      if (process.env.NODE_ENV !== "production" && FIXTURES_ON) {
        const f = await import("@/lib/devFixtureData");
        next = f.fixtureMembers().map((row) => normalizeMember(row));
      } else {
        next = await fetchAllMembers();
      }
      setMembers(next);
      setCountedAt(new Date());
      setDataState("ready");
      setReloadToken((n) => n + 1);
    } catch (error) {
      setDataError(describeDataError(error));
      setDataState("error");
    }
  }, []);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  const patchMember = useCallback((id, patch) => {
    setMembers((current) => current.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }, []);

  const now = useMemo(() => countedAt || new Date(), [countedAt]);

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
              // The Audience tab waits for the member list too: it joins Stripe
              // to Firestore on the email address, and joining against a list
              // that has not arrived would show every payer as a stranger.
              tab === "overview" ? <OverviewSkeleton /> : <MembersSkeleton />
            ) : (
              <div style={{ opacity: dataState === "refreshing" ? 0.6 : 1, transition: "opacity 160ms ease" }}>
                {tab === "overview" ? (
                  <Overview members={members} now={now} />
                ) : tab === "audience" ? (
                  <Audience members={members} user={user} reloadToken={reloadToken} />
                ) : (
                  <Members members={members} onPatched={patchMember} />
                )}
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
    // a stronger reason. This screen lists every member by name, email, goal
    // and billing state at once. Microsoft Clarity is never injected on /admin
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
