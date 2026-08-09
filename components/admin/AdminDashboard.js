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
import { formatDateTime } from "@/lib/adminMetrics";
import Overview, { OverviewSkeleton } from "./Overview";
import Members, { MembersSkeleton } from "./Members";
import { Button, Card, ErrorState, Segmented } from "./ui";

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
      const next = await fetchAllMembers();
      setMembers(next);
      setCountedAt(new Date());
      setDataState("ready");
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
        <header
          className="pv-safe-x sticky top-0 z-30 shrink-0 pb-3 pt-[max(12px,env(safe-area-inset-top))]"
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
                {dataState === "refreshing" ? "Counting" : "Refresh"}
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
              options={[
                { value: "overview", label: "Overview" },
                { value: "members", label: "Members" },
              ]}
            />
            <p className="text-[12px]" style={{ color: "var(--pv-ink-3)" }}>
              {countedAt
                ? `Counted ${formatDateTime(countedAt)}`
                : "Counting for the first time"}
            </p>
          </div>
        </header>

        <div className="pv-scroll">
          <main className="pv-safe-x mx-auto w-full max-w-[1400px] py-6">
            {dataState === "error" ? (
              <Card className="p-4">
                <ErrorState title="The member list did not load" description={dataError} onRetry={load} />
              </Card>
            ) : dataState === "loading" || dataState === "idle" ? (
              tab === "overview" ? (
                <OverviewSkeleton />
              ) : (
                <MembersSkeleton />
              )
            ) : (
              <div style={{ opacity: dataState === "refreshing" ? 0.6 : 1, transition: "opacity 160ms ease" }}>
                {tab === "overview" ? (
                  <Overview members={members} now={now} />
                ) : (
                  <Members members={members} onPatched={patchMember} />
                )}
              </div>
            )}
          </main>
        </div>
      </>
    );
  }

  return (
    <div className="pv-admin" data-admin-theme={theme}>
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
