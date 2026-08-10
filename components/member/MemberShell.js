"use client";

// The gate and the frame.
//
// No entitlement, no access. Everything below the gate assumes a signed-in,
// paying member, so no tab has to ask again.
//
// The locked screen is a recovery screen, not a wall: most people who land on
// it already paid, on a phone or in another browser, and the fix is one tap.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, Lightbulb, Loader2, MessageCircle, PlayCircle, ShieldCheck, User,
} from "lucide-react";
import { useMember } from "./MemberProvider";
import ProviderButtons from "@/components/auth/ProviderButtons";
import { isValidEmail } from "@/lib/checkout";
import { isEntitled } from "@/lib/entitlement";
import { suppressOpenPlan } from "@/lib/openPlan";
import { restorePurchase } from "@/lib/memberBilling";
import { usePrefersReducedMotion } from "./VideoPlayer";

const TABS = [
  { href: "/app", label: "Today", Icon: Home },
  { href: "/app/exercises", label: "Exercises", Icon: PlayCircle },
  { href: "/app/coach", label: "Coach Mia™", Icon: MessageCircle },
  { href: "/app/insights", label: "Insights", Icon: Lightbulb },
  { href: "/app/you", label: "You", Icon: User },
];

/**
 * Where each tab was left, so coming back to it feels like coming back.
 *
 * A UITabBarController gives every tab its own navigation stack and its own
 * scroll offset: she reads half of Insights, checks Today, taps Insights again
 * and she is on the same paragraph. A router swaps one page component for
 * another inside ONE scroll container, and Next then scrolls that container to
 * the top of the new page, so every tab change threw her back to the header.
 * Twelve lines of memory is the difference between "a website with tabs" and
 * "the app".
 *
 * Module scope, not state: it must survive the component remounting, and it is
 * deliberately not persisted — a fresh visit starts at the top, as it does on
 * the phone after a cold launch.
 */
const tabScroll = new Map();

// This is a static export, so every one of these files is also rendered on a
// build machine with no DOM. `useLayoutEffect` warns loudly there and does
// nothing useful, so the server gets the passive one and the browser gets the
// one that runs before paint.
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Below 704px the marketing frame's <main> scrolls; above it the shell does. */
function scrollHost() {
  if (typeof document === "undefined") return null;
  const shellScroller = document.querySelector(".pv-member-scroll");
  if (shellScroller && shellScroller.scrollHeight > shellScroller.clientHeight + 1) {
    return shellScroller;
  }
  return document.querySelector("main") || shellScroller;
}

/** The path whose offset the scroll container is showing right now. */
let showingPath = null;

/** Bank where this tab is. Cheap enough to call on every scroll event. */
function rememberScroll() {
  const host = scrollHost();
  if (host && showingPath) tabScroll.set(showingPath, host.scrollTop);
}

function useTabScrollMemory(pathname) {
  // Record continuously rather than only on the way out: the tab bar is a
  // <Link>, so by the time an effect sees the new path the old page has already
  // been unmounted and its offset is gone.
  //
  // Written straight out of the handler with no rAF in the way: a backgrounded
  // browser tab runs no animation frames, so a rAF here would stop recording at
  // exactly the moment the last offset matters. The tab links call
  // rememberScroll() on the way out too, which is the one that is provably
  // exact — a scroll event can still be in flight when the click lands.
  useEffect(() => {
    const host = scrollHost();
    if (!host) return undefined;
    host.addEventListener("scroll", rememberScroll, { passive: true });
    return () => host.removeEventListener("scroll", rememberScroll);
  }, [pathname]);

  // Restore. The tab links pass `scroll={false}`, so the router leaves the
  // container alone and this is the only thing that moves it — no fighting an
  // ancestor's scroll-to-top, and no frame where she sees the header of a page
  // she was halfway down.
  useIsomorphicLayoutEffect(() => {
    if (showingPath === pathname) return undefined;
    showingPath = pathname;

    const host = scrollHost();
    if (!host) return undefined;
    const target = tabScroll.get(pathname) ?? 0;
    host.scrollTop = target;
    if (host.scrollTop >= target) return undefined;

    // She is coming back to a tab that is still fetching. A shelf of exercises
    // that has not arrived yet cannot be scrolled past, so the browser clamps
    // the offset to whatever is on the page right now and the restore silently
    // becomes "top". Keep re-applying while the page grows, and stop the moment
    // it fits, she touches the screen, or the fetch has plainly failed.
    const stop = () => {
      clearTimeout(timer);
      observer.disconnect();
      for (const type of ["wheel", "touchstart", "keydown"]) {
        host.removeEventListener(type, stop);
      }
    };
    const observer = new ResizeObserver(() => {
      if (host.scrollTop < target) host.scrollTop = target;
      if (host.scrollTop >= target) stop();
    });
    observer.observe(host.firstElementChild || host);
    const timer = setTimeout(stop, 2500);
    for (const type of ["wheel", "touchstart", "keydown"]) {
      host.addEventListener(type, stop, { passive: true });
    }
    return stop;
  }, [pathname]);
}

export default function MemberShell({ children }) {
  const {
    authState, member, entitlement, entitlementChecking, memberError, linkRedeeming,
  } = useMember();
  useTabScrollMemory(usePathname());

  if (authState === "loading" || (authState === "signedIn" && !member && !memberError)) {
    return <Splash label="Opening your plan" />;
  }
  // She tapped the link we emailed her and it is being exchanged for a session
  // right now. Showing a sign-in screen in that second would be asking her to
  // do the thing she has just done.
  if (linkRedeeming) return <Splash label="Signing you in" />;
  if (authState === "signedOut") return <SignInScreen />;
  if (memberError) return <RetryScreen message={memberError} />;
  // Wait for Stripe's first answer before calling anybody locked out, or a
  // paying member watches the recovery screen flash past on every load. Only
  // when nothing has already let her in, so an App Store member is never held
  // up by a Stripe call that was never going to be about her.
  if (!entitlement.active && entitlementChecking) return <Splash label="Checking your plan" />;
  if (!entitlement.active) return <LockedScreen />;

  return (
    <div
      className="pv-member-shell flex min-h-full flex-col bg-app-background tab:fixed tab:inset-0 tab:flex-row tab:overflow-hidden"
      // Belt to the braces in app/Clarity.jsx. Microsoft Clarity is never
      // injected on /app, so on any normal load there is no recorder here to
      // mask anything from. This attribute is what covers the one case the
      // route gate cannot: a client-side navigation from a recorded page into
      // this one commits this DOM before any effect can react. Everything under
      // this element is a member's name, email, symptom check-ins and Coach Mia
      // transcripts, which is special category health data under GDPR Article 9.
      // Removing this line is only safe if you have also proved no soft
      // navigation can reach /app, which is what the plain <a> on /welcome is
      // for. Keep both.
      data-clarity-mask="true"
    >
      <SideNav />

      {/* A flex column, not a plain block: Coach Mia's composer has to be able
          to sit at the bottom of a short conversation. Every tab root inside
          therefore needs `w-full`, because auto side margins on a flex item
          opt it out of stretching and it sizes to its own max-width instead.

          From `tab` this is also the scroll container: the shell owns the
          viewport by then, so the <main> in app/layout.js has nothing left in
          it to scroll. */}
      <div className="pv-member-scroll flex flex-1 flex-col pb-[calc(4.75rem+env(safe-area-inset-bottom))] tab:min-h-0 tab:min-w-0 tab:overflow-y-auto tab:overscroll-contain tab:pb-0">
        {children}
      </div>

      <TabBar />
    </div>
  );
}

/**
 * The phone navigation. Five destinations under the thumb, which is the right
 * answer on a phone and stays exactly as it was; it simply stops existing once
 * the rail takes over at 704px.
 */
function TabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-black/[0.08] bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg tab:hidden"
    >
      <ul className="mx-auto flex max-w-2xl">
        {TABS.map(({ href, label, Icon }) => {
          const active = href === "/app" ? pathname === "/app" : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                // The shell owns the scroll position of every tab (see
                // useTabScrollMemory). Leave this on and the router scrolls the
                // container to the top of the new page after the restore has
                // run, and every tab change lands on the header again.
                scroll={false}
                onClick={rememberScroll}
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

/**
 * The tablet and desktop navigation.
 *
 * Two widths, one component. From 704px it is a 76px icon rail, because an iPad
 * mini in portrait has 744px in total and a labelled 240px sidebar would eat a
 * third of it. From 1024px the labels arrive and it becomes a real sidebar with
 * the plan's progress under them.
 *
 * The labels are present in the markup at both widths and hidden with
 * `sr-only` on the rail, so the accessible name of every link is the same word
 * a sighted member reads one breakpoint up.
 */
function SideNav() {
  const pathname = usePathname();
  // `currentDayNumber` is the day she is on, and the only value allowed to
  // print as "Day N of 90". See lib/program.js, above `programState`.
  const { member, currentDayNumber, planLength } = useMember();
  const firstName = (member?.name || "").trim().split(/\s+/)[0];

  return (
    <nav
      aria-label="Main"
      className="hidden shrink-0 flex-col border-r border-black/[0.07] bg-white tab:flex tab:w-[76px] lg:w-[248px]"
    >
      <div className="flex h-[64px] shrink-0 items-center justify-center lg:justify-start lg:px-5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-cta-gradient text-[16px] font-black text-white">
          P
        </span>
        <span className="ml-2.5 hidden text-[17px] font-bold tracking-tight text-app-textPrimary lg:block">
          Pelvi
        </span>
      </div>

      <ul className="flex flex-1 flex-col gap-1 px-2 pt-2 lg:px-3">
        {TABS.map(({ href, label, Icon }) => {
          const active = href === "/app" ? pathname === "/app" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                scroll={false}
                onClick={rememberScroll}
                aria-current={active ? "page" : undefined}
                title={label}
                className={`flex min-h-[48px] items-center justify-center gap-3 rounded-2xl px-2 lg:justify-start lg:px-3.5 ${
                  active
                    ? "bg-ios-pink/[0.1] text-ios-pink"
                    : "text-app-textSecondary hover:bg-black/[0.04]"
                }`}
              >
                <Icon
                  className="h-[22px] w-[22px] shrink-0"
                  strokeWidth={active ? 2.4 : 1.8}
                  aria-hidden="true"
                />
                <span className="sr-only text-[14.5px] font-semibold lg:not-sr-only">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      {planLength ? (
        <div className="hidden shrink-0 px-3 pb-5 lg:block">
          <div className="rounded-2xl bg-app-background p-3.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-app-textSecondary">
              {firstName ? `${firstName}'s plan` : "Your plan"}
            </p>
            <p className="mt-1 text-[14px] font-bold text-app-textPrimary">
              Day {Math.min(currentDayNumber, planLength)} of {planLength}
            </p>
            <div
              className="mt-2 h-1.5 overflow-hidden rounded-full bg-app-borderIdle"
              role="progressbar"
              aria-valuenow={Math.min(currentDayNumber, planLength)}
              aria-valuemin={0}
              aria-valuemax={planLength}
              aria-label="Progress through your plan"
            >
              <span
                className="block h-full rounded-full bg-ios-pink"
                style={{ width: `${(Math.min(currentDayNumber, planLength) / planLength) * 100}%` }}
              />
            </div>
          </div>
        </div>
      ) : null}
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

/**
 * LOG IN. Not "restore", and not "sign up".
 *
 * Three things about this screen are deliberate.
 *
 * 1. GOOGLE AND APPLE ARE THE ONLY DOORS. THERE IS NO EMAIL FIELD.
 *    This screen used to lead with one, then demoted it to a quiet third
 *    option, and now it does not offer one at all. The reason is one member's
 *    report: she typed her address, the screen told her a link was coming, and
 *    nothing ever arrived. The send SUCCEEDED — the mail went out from the
 *    default firebaseapp.com sender, with no SPF or DKIM aligned to
 *    pelvi.health, and Gmail filtered it. The product could not tell. A door
 *    whose failure this code cannot observe is worse than no door, because she
 *    stands in front of it waiting. Both providers either work or say so
 *    immediately, in the same second she presses them. See the header of
 *    lib/identity.js for what has to be true before an email door comes back.
 *
 * 2. THE TWO PROVIDERS ARE EQUAL, and Google is never withdrawn. Neither is the
 *    fallback; see the header of components/auth/ProviderButtons.jsx. With
 *    Apple not yet configured in Firebase, a browser that has watched it be
 *    refused sees Google alone, full width — which is the last way in that
 *    exists, so nothing on this screen may ever gate it.
 *
 * 3. THERE IS NO "I am new here" LINK ANY MORE, AND ONE MUST NOT COME BACK.
 *    It used to sit at the bottom of this screen pointing at "/", which is the
 *    marketing funnel. A member who had paid ninety seconds earlier, and who was
 *    looking at this screen precisely because the product had failed to sign her
 *    in, tapped it and was walked through the entire eight screen funnel to a
 *    paywall for the plan she already owned. Anybody who reaches this screen has
 *    an account. The way out of here is in, not round again.
 *
 * THE ONE EMAIL FIELD LEFT, and why it is not a contradiction. If she taps a
 * link that reached her inbox back when we were still sending them, and opens
 * it in a browser that does not remember which address it was for, Firebase
 * will not redeem the code until she names the address. That field is part of
 * REDEEMING a link, never of sending one, so it exists only in that state and
 * cannot be reached from anywhere else on this screen.
 */
function SignInScreen() {
  const { configured, memberError, linkState, confirmLinkEmail, refreshMember } = useMember();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [providerError, setProviderError] = useState(null);

  const confirming = linkState.status === "confirm";
  const valid = isValidEmail(email);

  const submit = useCallback(
    async (event) => {
      event.preventDefault();
      if (!valid || busy) return;
      setBusy(true);
      // The only job behind this button: she has opened a link in a browser
      // that does not remember which address it was for, and Firebase needs her
      // to name it before it will redeem the code. Nothing here sends anything.
      await confirmLinkEmail(email.trim());
      setBusy(false);
    },
    [busy, confirmLinkEmail, email, valid]
  );

  if (!configured) {
    return (
      <Frame>
        <h1 className="text-[26px] font-bold leading-tight text-app-textPrimary">
          Your plan is not ready on this address yet.
        </h1>
        {/* Not "open the app on your phone". Google web-app ads land ANDROID
            users in here, and there is no app on their phone to open. */}
        <p className="mt-3 text-[15px] text-app-textSecondary">
          Sign in is switched off on this deployment. Email us at hello@pelvi.health
          and we will open your plan by hand.
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

  // THE "CHECK YOUR EMAIL" SCREEN THAT USED TO LIVE HERE HAS GONE, and it is
  // the screen this entire change exists to delete. Nothing on this site sends
  // a login link any more, so there is no state left in which a member is asked
  // to go and wait somewhere else. If a send is ever offered again, this is
  // where the confirmation belongs — and it does not go back without the spam
  // folder line and the resend that were deleted with it. See lib/identity.js.

  return (
    <Frame>
      <h1 className="text-[28px] font-bold leading-[1.1] tracking-[-0.4px] text-app-textPrimary">
        Welcome back.
      </h1>
      <p className="mt-3 text-[16px] leading-snug text-app-textSecondary">
        {confirming
          ? linkState.message
          : "One tap and your plan, your streak and your history all come back with you."}
      </p>

      <ProviderButtons
        className="mt-7"
        onError={(message) => setProviderError(message)}
        onSignedIn={() => refreshMember()}
      />

      {providerError && (
        <p role="alert" className="mt-4 text-[14px] leading-snug text-app-textPrimary">
          {providerError}
        </p>
      )}

      {/* REDEEMING A LINK, NOT SENDING ONE. The only way this field appears is
          that she has just opened a sign-in link in a browser which does not
          remember which address it was for, and Firebase refuses to spend the
          code until she names it — a rule that exists so a link forwarded to
          somebody else cannot sign THEM in. There is no control anywhere on
          this screen that opens it, because there is nothing left to send. */}
      {confirming && (
        <form onSubmit={submit} className="mt-7 flex flex-col gap-3 text-left">
          <label
            htmlFor="member-login-email"
            className="text-center text-[13px] font-semibold text-app-textSecondary"
          >
            Which address was that link sent to?
          </label>
          <input
            id="member-login-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck="false"
            // Everything under this shell is masked from session replay, and the
            // attribute is repeated on the field itself so it stays masked
            // whatever a dashboard setting does later.
            data-clarity-mask="true"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="h-[54px] w-full rounded-[16px] border border-app-borderIdle bg-white px-4 text-center text-[16px] text-app-textPrimary outline-none transition-colors focus:border-ios-pink"
          />
          <button
            type="submit"
            disabled={!valid || busy}
            className="flex h-12 w-full items-center justify-center rounded-full border border-app-borderIdle bg-white text-[15px] font-semibold text-app-textPrimary disabled:opacity-60"
          >
            {busy ? "One moment..." : "Open my plan"}
          </button>
        </form>
      )}

      {linkState.status === "error" && linkState.message && (
        <p role="alert" className="mt-4 text-[14px] leading-snug text-app-textPrimary">
          {linkState.message}
        </p>
      )}
      {memberError && (
        <p role="alert" className="mt-4 text-sm text-app-primary">{memberError}</p>
      )}

      {/* Not "we will email you". This is the sentence that keeps a member off
          a second account: Firebase is one account per address, so continuing
          with a different Google account makes a brand new, empty one and the
          only symptom she sees is her history apparently gone. */}
      <p className="mt-6 text-[13px] leading-relaxed text-app-textSecondary">
        Use the same email address you joined with and it is the same account, whichever
        button you press and whichever device you pick up.
      </p>
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
 *
 * THE SECOND LOOP, AND IT WAS STILL OPEN. The bug the owner reported was a
 * link on the sign-in screen that walked a member who had just paid back
 * through the eight screen funnel to a paywall for the plan she already owned.
 * That link was removed from SignInScreen and left standing here, on the one
 * screen a paying member is MORE likely to hit: this is what she sees when the
 * entitlement check has not caught up (a first web purchase Stripe has not
 * linked yet), when /api/entitlement cannot be reached at all (offline, a cold
 * Worker, an expired token), and when her iPhone record could not be joined by
 * email. In every one of those cases she has paid and "See the plan and join"
 * was the biggest button under the fold.
 *
 * So the funnel is offered ONLY on positive evidence that she is not a member:
 * Stripe was actually reached, it said no, and nothing on this browser or on
 * her record says otherwise. `state === "none"` is the only state that means
 * that. "idle", "checking", "slow" and "error" all mean WE DO NOT KNOW, and the
 * answer to not knowing is never a price.
 */
function LockedScreen() {
  const { member, user, refreshMember, refreshEntitlement, signOut } = useMember();
  const [state, setState] = useState("idle"); // idle | checking | none | slow | error
  const email = (member?.email || user?.email || "").trim().toLowerCase();

  // Everything that says "this person has already bought something", whether or
  // not Stripe can see it this second. Any one of them is enough to keep the
  // funnel off this screen for good.
  const hasPaidBefore = Boolean(
    isEntitled() ||
      member?.programStartedAt ||
      member?.entitlement ||
      (member?.platform || "").toLowerCase() === "ios"
  );

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

      {/* Three headings, because three different things have happened and only
          one of them is "you have no plan". Telling a member whose card cleared
          an hour ago, or whose phone is on a train with no signal, that we
          cannot see a plan on her account is a claim we have not earned. */}
      <h1 className="mt-5 text-[24px] font-bold leading-tight text-app-textPrimary">
        {state === "checking"
          ? "Looking for your plan"
          : state === "error" || state === "slow"
            ? "We could not check your plan just now."
            : "We cannot see a live plan on this account."}
      </h1>
      <p className="mt-3 text-[15px] leading-snug text-app-textSecondary">
        {state === "checking"
          ? `One moment. We are checking ${email || "this account"} with our billing system.`
          : state === "error"
            ? `You are signed in as ${email || "this account"}. Nothing has changed about your plan, we simply could not reach our billing system. Try again in a moment.`
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

      {/* THE ONLY WAY BACK INTO THE FUNNEL FROM THE PAID AREA, AND IT IS
          FENCED. Read the note on this component before widening either half of
          the condition. `state === "none"` means we reached Stripe and Stripe
          said no; `hasPaidBefore` is every other signal that she has already
          bought something. A member who has paid must never be able to reach a
          paywall from here, and "we do not know yet" is not evidence that she
          has not paid. */}
      {state === "none" && !hasPaidBefore ? (
        <Link
          href="/"
          // AND TURN OFF THE THING THAT WOULD SEND HER STRAIGHT BACK.
          //
          // pelvi.health now redirects any signed-in browser to /app before it
          // paints (lib/openPlan.js), and she is signed in: that is how she got
          // to this screen. Without this call the only link on the site that
          // leads to a price would land on "/", bounce, and put her back here,
          // for ever. It is set on exactly the condition this link is: Stripe
          // was reached and said she has no plan, and nothing else about this
          // browser or her record says she has ever paid. Her next payment
          // clears it again, from lib/entitlement.js.
          onClick={suppressOpenPlan}
          className="mt-6 flex h-12 w-full items-center justify-center rounded-full border border-app-borderIdle bg-white text-[15px] font-semibold text-app-textPrimary"
        >
          See the plan and join
        </Link>
      ) : null}

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
