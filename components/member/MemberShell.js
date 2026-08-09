"use client";

// The gate and the frame.
//
// No entitlement, no access. Everything below the gate assumes a signed-in,
// paying member, so no tab has to ask again.
//
// The locked screen is a recovery screen, not a wall: most people who land on
// it already paid, on a phone or in another browser, and the fix is one tap.

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, Lightbulb, Loader2, MessageCircle, PlayCircle, ShieldCheck, User,
} from "lucide-react";
import { useMember } from "./MemberProvider";
import { restorePurchase } from "@/lib/memberBilling";
import { usePrefersReducedMotion } from "./VideoPlayer";

const TABS = [
  { href: "/app", label: "Today", Icon: Home },
  { href: "/app/exercises", label: "Exercises", Icon: PlayCircle },
  { href: "/app/coach", label: "Coach Mia™", Icon: MessageCircle },
  { href: "/app/insights", label: "Insights", Icon: Lightbulb },
  { href: "/app/you", label: "You", Icon: User },
];

export default function MemberShell({ children }) {
  const { authState, member, entitlement, entitlementChecking, memberError } = useMember();

  if (authState === "loading" || (authState === "signedIn" && !member && !memberError)) {
    return <Splash label="Opening your plan" />;
  }
  if (authState === "signedOut") return <SignInScreen />;
  if (memberError) return <RetryScreen message={memberError} />;
  // Wait for Stripe's first answer before calling anybody locked out, or a
  // paying member watches the recovery screen flash past on every load. Only
  // when nothing has already let her in, so an App Store member is never held
  // up by a Stripe call that was never going to be about her.
  if (!entitlement.active && entitlementChecking) return <Splash label="Checking your plan" />;
  if (!entitlement.active) return <LockedScreen />;

  return (
    <div className="flex min-h-full flex-col bg-app-background">
      {/* A flex column, not a plain block: Coach Mia's composer has to be able
          to sit at the bottom of a short conversation. Every tab root inside
          therefore needs `w-full`, because auto side margins on a flex item
          opt it out of stretching and it sizes to its own max-width instead. */}
      <div className="flex flex-1 flex-col pb-[calc(4.75rem+env(safe-area-inset-bottom))]">
        {children}
      </div>
      <TabBar />
    </div>
  );
}

function TabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-black/[0.08] bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg"
    >
      <ul className="mx-auto flex max-w-2xl">
        {TABS.map(({ href, label, Icon }) => {
          const active = href === "/app" ? pathname === "/app" : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex h-[62px] flex-col items-center justify-center gap-1 ${
                  active ? "text-ios-pink" : "text-app-textSecondary"
                }`}
              >
                <Icon
                  className="h-[22px] w-[22px]"
                  strokeWidth={active ? 2.4 : 1.8}
                  aria-hidden="true"
                />
                <span className="text-[10px] font-semibold leading-none">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// --- Gate screens ----------------------------------------------------------

function Splash({ label }) {
  const reduceMotion = usePrefersReducedMotion();
  return (
    <div className="grid min-h-full place-items-center bg-app-background px-6">
      <div className="text-center">
        <Loader2
          className={`mx-auto h-8 w-8 text-ios-pink ${reduceMotion ? "" : "animate-spin"}`}
          aria-hidden="true"
        />
        <p className="mt-4 text-sm text-app-textSecondary">{label}</p>
      </div>
    </div>
  );
}

function Frame({ children }) {
  return (
    <div className="flex min-h-full flex-col justify-center bg-app-background px-6 py-12">
      <div className="mx-auto w-full max-w-sm text-center">{children}</div>
    </div>
  );
}

function SignInScreen() {
  const { signIn, signingIn, configured, memberError } = useMember();

  if (!configured) {
    return (
      <Frame>
        <h1 className="text-[26px] font-bold leading-tight text-app-textPrimary">
          Your plan is not ready on this address yet.
        </h1>
        <p className="mt-3 text-[15px] text-app-textSecondary">
          Sign in is switched off on this deployment. Open the app on your phone, or
          email us at hello@pelvi.health and we will sort it out.
        </p>
        <a
          href="mailto:hello@pelvi.health"
          className="mt-8 flex h-14 items-center justify-center rounded-full bg-ios-pink text-[17px] font-bold text-white"
        >
          Email us
        </a>
      </Frame>
    );
  }

  return (
    <Frame>
      <h1 className="text-[28px] font-bold leading-[1.1] tracking-[-0.4px] text-app-textPrimary">
        Welcome back.
      </h1>
      <p className="mt-3 text-[16px] leading-snug text-app-textSecondary">
        Sign in with the email you used when you joined, and your plan, your streak and
        your history come straight across from the app.
      </p>

      <button
        type="button"
        onClick={signIn}
        disabled={signingIn}
        className="mt-8 flex h-14 w-full items-center justify-center gap-3 rounded-full bg-ios-pink text-[17px] font-bold text-white disabled:opacity-60"
      >
        {signingIn ? "Opening..." : "Continue with Google"}
      </button>

      {memberError && (
        <p role="alert" className="mt-4 text-sm text-app-primary">{memberError}</p>
      )}

      <p className="mt-6 text-[13px] leading-relaxed text-app-textSecondary">
        We match you by your email address. It is the same account, whichever device you
        pick up.
      </p>

      <Link href="/" className="mt-8 inline-block text-[14px] font-semibold text-ios-pink">
        I am new here
      </Link>
    </Frame>
  );
}

function RetryScreen({ message }) {
  const { refreshMember } = useMember();
  return (
    <Frame>
      <h1 className="text-[24px] font-bold leading-tight text-app-textPrimary">
        Something got in the way.
      </h1>
      <p className="mt-3 text-[15px] text-app-textSecondary">{message}</p>
      <button
        type="button"
        onClick={refreshMember}
        className="mt-8 flex h-14 w-full items-center justify-center rounded-full bg-ios-pink text-[17px] font-bold text-white"
      >
        Try again
      </button>
    </Frame>
  );
}

/**
 * Signed in, no live subscription on the record. Almost always this is someone
 * who paid somewhere else, so the first thing offered is the lookup, not a
 * price.
 */
function LockedScreen() {
  const { member, user, refreshMember, refreshEntitlement, signOut } = useMember();
  const [state, setState] = useState("idle"); // idle | checking | none | slow | error
  const email = (member?.email || user?.email || "").trim().toLowerCase();

  const restore = useCallback(async () => {
    if (!email) { setState("none"); return; }
    setState("checking");
    try {
      // Two steps, and the second is the one that opens the door. The restore
      // call links her subscription to her record; the gate is decided by
      // Stripe's live answer, so that answer has to be asked for again. It has
      // to skip the endpoint's one minute memo as well, or she would sit here
      // looking at a "no" that was cached before she proved otherwise.
      const { isPremium } = await restorePurchase(email);
      if (isPremium) {
        const answer = await refreshEntitlement();
        await refreshMember();
        // Entitled: this screen unmounts on the next render. No reload, no
        // second sign in.
        if (answer?.active) return;
        // Found in Stripe, but the gate still will not open. Rare, and worth
        // saying out loud rather than leaving a spinner running for ever.
        setState("slow");
        return;
      }
      setState("none");
    } catch {
      setState("error");
    }
  }, [email, refreshMember, refreshEntitlement]);

  // A first web purchase happens before she has ever signed in, so the
  // subscription Stripe creates carries no Firebase id, and nothing on this
  // side can tie it to her until somebody looks it up by email address. Asking
  // Stripe straight away turns that into a second of waiting instead of a wall
  // telling a member who paid an hour ago that she has no plan. She can still
  // press the button if the automatic attempt fails.
  const triedOnce = useRef(false);
  useEffect(() => {
    if (triedOnce.current || !email) return;
    triedOnce.current = true;
    restore();
  }, [email, restore]);

  return (
    <Frame>
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-app-primary/10">
        <ShieldCheck className="h-7 w-7 text-app-primary" aria-hidden="true" />
      </div>

      <h1 className="mt-5 text-[24px] font-bold leading-tight text-app-textPrimary">
        {state === "checking" ? "Looking for your plan" : "We cannot see a live plan on this account."}
      </h1>
      <p className="mt-3 text-[15px] leading-snug text-app-textSecondary">
        {state === "checking"
          ? `One moment. We are checking ${email || "this account"} with our billing system.`
          : `You are signed in as ${email || "this account"}. If you already joined, tap below and we will find your subscription and open everything up.`}
      </p>

      <button
        type="button"
        onClick={restore}
        disabled={state === "checking"}
        className="mt-7 flex h-14 w-full items-center justify-center rounded-full bg-ios-pink text-[17px] font-bold text-white disabled:opacity-60"
      >
        {state === "checking" ? "Checking..." : "Find my subscription"}
      </button>

      {state === "none" && (
        <p role="alert" className="mt-4 text-[14px] leading-snug text-app-textPrimary">
          We could not find a live plan for that email. If you joined on your iPhone, open
          the app once on your phone and give us that same email in the You tab, then come
          back here.
        </p>
      )}
      {state === "slow" && (
        <p role="alert" className="mt-4 text-[14px] leading-snug text-app-textPrimary">
          We can see your subscription, but it has not opened up yet. Give it a minute and
          reload this page. If it still will not open, email hello@pelvi.health and we will
          do it by hand.
        </p>
      )}
      {state === "error" && (
        <p role="alert" className="mt-4 text-[14px] text-app-textPrimary">
          We could not reach our billing system. Please try again in a minute.
        </p>
      )}

      <Link
        href="/"
        className="mt-6 flex h-12 w-full items-center justify-center rounded-full border border-app-borderIdle bg-white text-[15px] font-semibold text-app-textPrimary"
      >
        See the plan and join
      </Link>

      <div className="mt-8 space-y-3 text-[13px] text-app-textSecondary">
        <a href="mailto:hello@pelvi.health" className="block font-semibold text-ios-pink">
          Email hello@pelvi.health
        </a>
        <button type="button" onClick={signOut} className="font-medium underline underline-offset-4">
          Use a different account
        </button>
      </div>
    </Frame>
  );
}
