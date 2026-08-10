// "This browser is already signed in. Do not sell to it."
//
// THE PROBLEM THIS FILE EXISTS FOR. A member pays, closes the tab, and types
// pelvi.health the next morning. What she got was the top of the acquisition
// funnel: a headline aimed at somebody who has never heard of us, a member
// counter, and "Start My 5-Min Journey" as the biggest thing on the screen. Her
// own plan was a 14px line underneath it. She had bought the product and the
// product was still selling itself to her.
//
// The fix is a redirect, and the whole difficulty is WHEN. This site is a static
// export on Cloudflare Pages: there is no server to branch on, and /index.html
// is one file served to every arrival. Anything decided in React runs after
// hydration, which is after the first paint, so a member would see one frame of
// the marketing page before it vanished. On the screen we pay for, a flash like
// that is the tell that this is a website and not an app.
//
// So the decision is made by a synchronous inline script at the very top of
// <body>, before a single pixel of the page exists. The script itself is
// OPEN_PLAN_SCRIPT, in lib/openPlanScript.js; the keys and the reasoning are here.
//
// THREE RULES IT IS BUILT AROUND.
//
//   1. CERTAIN, NEVER A GUESS. The only thing it will act on is a Firebase
//      session sitting in this browser's localStorage. That is not an
//      inference, it is the credential itself. "Paid at some point, according
//      to a note we wrote" is NOT enough: see WHY NOT THE ENTITLEMENT CACHE.
//   2. IT MUST NEVER COST A NEW VISITOR ANYTHING. A browser that has never been
//      here has no such key, so the whole thing is a pathname compare and a
//      short walk over an empty localStorage: tens of microseconds, no network,
//      no parse, no layout. Nothing is deferred and nothing is awaited, so a
//      cold visitor's first paint is byte for byte the paint she had before.
//   3. IT HAS TO BE ESCAPABLE. A redirect with no way out is a trap for the one
//      person it is wrong about. Two exits, below.
//
// WHY NOT THE ENTITLEMENT CACHE (lib/entitlement.js). It is tempting: it says
// "this browser paid", which is the sentence the owner used. But it is a note
// this site wrote about itself, it can outlive the subscription it describes
// (a cancelled plan with no period end reads as active for ever), and it says
// nothing about whether anybody is signed in. Sending a browser that holds a
// stale note but no session to /app lands it on a sign-in wall, and the sign-in
// screen deliberately has no route back to the funnel — so a member who
// cancelled six months ago and came back to buy again would be unable to reach
// the thing she came to buy. A session is the honest signal, and the landing
// page already stops selling to a browser carrying the note: it swaps its
// buttons for "Open your plan" (see WelcomeScreen and LandingScreen). That
// half of the answer was already right and is untouched.
//
// THE TWO EXITS.
//
//   SUPPRESS_KEY, in localStorage. Set by the member app when it has positive
//     evidence that the signed-in person is not a member: Stripe was reached
//     and said no. Without it, tapping "See the plan and join" on the recovery
//     screen would land on "/" and be thrown straight back to /app, which is a
//     loop with a price at the far end of it that she can never reach. Cleared
//     the moment an entitlement is written active, so it cannot outlive the
//     situation it was written for.
//   ?stay=1, remembered for the tab. For support and for QA: it is the way to
//     look at the marketing page while signed in, without signing out.
//
// Anyone genuinely signed in as the wrong person signs out in the You tab, at
// the bottom, and the key this script reads goes with the session. The next
// visit to pelvi.health is the marketing page again, with no flag to clear and
// nothing to explain.

/** localStorage. Durable "do not do this again until she pays". */
export const SUPPRESS_KEY = "pelvi.openPlan.off";

/** sessionStorage. Per-tab override, set by ?stay=1. */
export const STAY_KEY = "pelvi.openPlan.stay";

/** Where a recognised browser is sent. */
export const MEMBER_HOME = "/app";

// --- The same three facts, for code that runs after hydration ---------------

/**
 * Stop the redirect until she pays.
 *
 * Called from exactly one place: the recovery screen in the member app, on the
 * one link that leads back to the funnel, which is itself only shown when
 * Stripe has been reached and has said she has no plan. Read the note on
 * LockedScreen in components/member/MemberShell.js before calling it anywhere
 * else — a wrongly set flag puts a paying member back at the top of a funnel.
 */
export function suppressOpenPlan() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SUPPRESS_KEY, String(Date.now()));
  } catch {
    // Storage off. Nothing to suppress either, because the script that reads
    // this could not have read a session out of the same storage.
  }
}

/**
 * Let it work again.
 *
 * Called whenever an entitlement is written active, which is the moment the
 * situation the flag was written for has ended: she has paid, so the funnel is
 * behind her and the dashboard is where she belongs.
 */
export function allowOpenPlan() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SUPPRESS_KEY);
  } catch {
    /* see suppressOpenPlan */
  }
}
