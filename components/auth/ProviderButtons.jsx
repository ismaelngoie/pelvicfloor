"use client";

// GOOGLE AND APPLE, SIDE BY SIDE, EQUAL.
//
// One component, used on every surface that asks a member who she is: the
// member gate, the paywall's log in sheet, the funnel's welcome screen and the
// dialog on /welcome when a payment could not be turned into a session. They
// have to be identical, and the only way four screens stay identical is for
// there to be one of them.
//
// WHY SIDE BY SIDE AND NOT STACKED. Stacking makes the top one the real button
// and the bottom one the fallback, whichever way round you put them. These are
// two doors of equal standing: whichever one she already has an account with is
// the right one for her, and the product has no opinion. Apple's own guidance
// says its button must be at least as prominent as any other sign-in option,
// which a 50/50 row satisfies exactly.
//
// WHY THE LABELS ARE ONE WORD. The content column on the member gate is 272px
// at 320px wide, so each button gets 131px. "Continue with Google" needs about
// 150px on its own. One word plus the vendor mark fits with room to spare, at
// every width this product supports, without wrapping — which is the thing that
// makes a sign-in row look broken. The full sentence is still the accessible
// name of each button, so a screen reader hears "Continue with Google", not
// "Google".
//
// BRAND. Apple's button is the black one with the Apple glyph on light
// backgrounds and the white one on dark, which are two of the three variants
// Apple publishes; Google keeps its four-colour mark on white, which is
// Google's own light button. Neither is pixel-exact to a vendor asset and
// neither needs to be — they need to be unmistakably that vendor's button, and
// they are.

import { useCallback, useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";

import {
  appleSignInLikelyOff, captureProviderName, providerErrorMessage, signInWithProvider,
} from "@/lib/authProviders";

/**
 * @param {object} props
 * @param {"light"|"dark"} [props.tone]  which surface this sits on
 * @param {(kind: string) => void} [props.onSignedIn]  fired after a successful popup
 * @param {(message: string|null, kind: string) => void} [props.onError]
 * @param {string} [props.className]
 */
export default function ProviderButtons({
  tone = "light",
  onSignedIn,
  onError,
  className = "",
}) {
  const [busy, setBusy] = useState(""); // "" | "google" | "apple"

  // DRAWN OPTIMISTICALLY, AND WITHDRAWN HONESTLY.
  //
  // Apple is not configured in this Firebase project yet, and the browser has
  // no way to ask whether it is other than by trying. So the button is here for
  // everybody until this browser has watched one attempt be refused, and then
  // it is not. See the block comment in lib/authProviders.js: the memory
  // expires, so the moment the owner finishes the setup the button comes back
  // on its own, with no deploy.
  //
  // Read in an effect and not during render, because this is a static export
  // and there is no localStorage on the machine that builds these pages.
  //
  // UNKNOWN COUNTS AS "SHOW IT", and that is what keeps the row still. This
  // component is prerendered into every one of these pages with both buttons in
  // it, so for everybody who has never seen Apple fail — which is everybody, on
  // a first visit — the first paint is already the final layout and nothing
  // moves. Treating unknown as "hide it" would have made Google full width for
  // one frame on every load and then snapped it to half. The browser that has
  // seen the failure gets one frame with Apple in it before it goes, which is
  // the right way round: that is the browser where a button disappearing is the
  // feedback, not a glitch.
  //
  // Re-read on every change of `busy`, so a refusal that has just been recorded
  // by an attempt takes the button away immediately rather than at the next
  // page load.
  const [appleOff, setAppleOff] = useState(false);
  useEffect(() => {
    setAppleOff(appleSignInLikelyOff());
  }, [busy]);

  // Finish a sign-in that went out through a full-page redirect because the
  // popup was blocked — an in-app browser from an Instagram or Facebook ad
  // cannot open one, and that is a real slice of this product's traffic.
  //
  // It is also the only chance to catch Apple's name on that path: the popup
  // path reads it in signInWithProvider, and the redirect path comes back to a
  // brand new document where that call never happened.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [{ auth, isFirebaseConfigured }, { getRedirectResult }] = await Promise.all([
          import("@/lib/firebase"),
          import("firebase/auth"),
        ]);
        if (!isFirebaseConfigured()) return;
        const result = await getRedirectResult(auth());
        if (cancelled || !result) return;
        await captureProviderName(result);
        onSignedIn?.(result.user?.providerData?.[0]?.providerId?.includes("apple")
          ? "apple"
          : "google");
      } catch {
        // Nothing pending, or the redirect failed. Either way the buttons
        // below are still the way in.
      }
    })();
    return () => { cancelled = true; };
    // Deliberately once per mount. Re-running would ask Firebase to redeem a
    // redirect that has already been redeemed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = useCallback(
    async (kind) => {
      if (busy) return;
      setBusy(kind);
      onError?.(null, kind);
      const result = await signInWithProvider(kind);
      // The document is being replaced by a full-page redirect. Do not clear
      // the spinner: a button that springs back to life for the half second
      // before the browser navigates reads as a failure.
      if (result.redirecting) return;
      setBusy("");
      if (result.ok) {
        onSignedIn?.(kind);
        return;
      }
      if (result.cancelled) return; // She closed the window. Say nothing.
      onError?.(providerErrorMessage(result.code, kind), kind);
    },
    [busy, onError, onSignedIn]
  );

  const skin = tone === "dark" ? DARK : LIGHT;
  // Apple hidden means Google is the only provider left, and a 131px button
  // marooned in the left half of a 272px row does not read as the primary way
  // in — it reads as a layout that lost something. It takes the whole row.
  //
  // GOOGLE IS NEVER CONDITIONAL, AND MUST NEVER BECOME CONDITIONAL. It is drawn
  // below with no `if` in front of it, on purpose. Now that the email door has
  // been taken off every screen in the product (see the header of
  // lib/identity.js), these buttons are the ENTIRE sign-in surface: a state in
  // which this component renders nothing is a member locked out of a plan she is
  // paying for. Apple may come and go with what this browser has learned about
  // the project. Google may not.
  const showApple = !appleOff;

  return (
    <div className={`grid grid-cols-2 gap-2.5 ${className}`}>
      <button
        type="button"
        onClick={() => start("google")}
        disabled={Boolean(busy)}
        aria-label="Continue with Google"
        className={`${BASE} ${skin.google} ${showApple ? "" : "col-span-2"}`}
      >
        {busy === "google" ? (
          <LoaderCircle
            size={19}
            className="animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
        ) : (
          <GoogleMark />
        )}
        <span className="truncate">Google</span>
      </button>

      {/* Not rendered at all while this browser knows Apple is refused. A
          disabled Apple button, or one that opens a popup and closes it again,
          is a worse answer than no Apple button: it tells a member the product
          is broken rather than that this door is not open yet. */}
      {showApple ? (
        <button
          type="button"
          onClick={() => start("apple")}
          disabled={Boolean(busy)}
          aria-label="Sign in with Apple"
          className={`${BASE} ${skin.apple}`}
        >
          {busy === "apple" ? (
            <LoaderCircle
              size={19}
              className="animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
          ) : (
            <AppleGlyph />
          )}
          <span className="truncate">Apple</span>
        </button>
      ) : null}
    </div>
  );
}

const BASE =
  "flex h-[52px] min-w-0 items-center justify-center gap-2 rounded-full " +
  "px-2 text-[15.5px] font-semibold tracking-[-0.1px] whitespace-nowrap " +
  "transition-transform active:scale-[0.98] motion-reduce:active:scale-100 " +
  "disabled:opacity-60";

const LIGHT = {
  // Google's own light button: white, a hairline grey border, near-black text.
  google: "border border-[#DADCE0] bg-white text-[#1F1F1F]",
  // Apple's black variant, which is the one for light backgrounds.
  apple: "bg-black text-white",
};

const DARK = {
  // Google's light button is permitted on any background and is the only one
  // that stays visible on a #12121A sheet; Google's own dark variant is #131314
  // and would vanish into it.
  google: "bg-white text-[#1F1F1F]",
  // Apple's white variant, which is the one for dark backgrounds. A black
  // button here would be a black rectangle on a black sheet.
  apple: "bg-white text-black",
};

/** Google's four-colour mark, at the proportions Google publishes. */
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" className="shrink-0">
      <path
        fill="#FFC107"
        d="M43.6 20.1H42V20H24v8h11.3C33.6 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C39.9 35.8 44 30.5 44 24c0-1.3-.1-2.6-.4-3.9z"
      />
    </svg>
  );
}

/**
 * The Apple logo, in one path, inheriting the button's text colour so the same
 * glyph serves the black button and the white one.
 */
function AppleGlyph() {
  return (
    <svg
      width="17"
      height="20"
      viewBox="0 0 814 1000"
      aria-hidden="true"
      className="mb-[2px] shrink-0"
      fill="currentColor"
    >
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57-155.5-127C46.7 790.7 0 663 0 541.8c0-194.4 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z" />
    </svg>
  );
}
