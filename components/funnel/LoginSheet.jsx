"use client";

// "Already have an account? Log in."
//
// THIS REPLACES "RESTORE PURCHASE", AND THE RENAME IS THE POINT.
//
// On iOS, "Restore Purchase" is App Store language with a fixed meaning: ask
// Apple for a receipt this device has lost. Apple requires the button and every
// iPhone owner knows the phrase. On the web there is no store to ask and nothing
// to restore. There is a woman who already has an account and wants to get into
// it, and the word for that is log in. The old sheet was also hidden in a row of
// 13px legal links under the paywall, which is where you put a thing you hope
// nobody presses. This one is offered in plain sight.
//
// GOOGLE AND APPLE, AND NOTHING ELSE ON THE SHEET.
//
// This sheet has been through three versions and the direction was always the
// same. It started as an email field with a 13px "Prefer to use Google?" link
// under it. Then the providers moved to the top and the field became a folded
// away third option. Now the field has gone entirely, and the reason is the one
// that was true at every step: the mail goes out from the default
// firebaseapp.com sender with no SPF or DKIM aligned to pelvi.health, Gmail
// files it as spam, and sendSignInLinkToEmail resolves SUCCESSFULLY when that
// happens. So the sheet cheerfully said "check your email" and a member sat
// waiting for something this code had no way of knowing would never appear.
// A door that fails silently is worse than no door. See the header of
// lib/identity.js for what has to be true before it comes back.
//
// WHAT THIS SHEET CANNOT DO, and never could. It cannot let anyone in on the
// strength of a typed address: typing one proves nothing, and signing her in on
// it would mean knowing a member's address is the same as owning her symptom
// check-ins and her Coach Mia transcripts. The provider is the proof.
//
// WHAT IT DELIBERATELY DOES NOT CHECK. It does not ask Stripe first. A member
// who bought on her iPhone has NO Stripe subscription at all — her purchase
// lives with Apple and RevenueCat — and the old sheet answered her with "we
// could not find an active plan for that address", which was both wrong and the
// most discouraging sentence we could have picked. Whoever gets in is decided
// by the gate at /app, which knows about Apple.

import { useState } from "react";
import { X } from "lucide-react";

import ProviderButtons from "@/components/auth/ProviderButtons";
import { useDialogBehaviour } from "./paywallHooks";

/**
 * Where a member goes the moment a provider lets her in.
 *
 * NOT "close the sheet". Behind this sheet is the paywall, and the whole reason
 * she opened it is that she already has a plan. Dropping her back onto a price
 * she is already paying is the funnel loop the owner reported, in miniature.
 * /app is the gate: it asks Stripe what she is entitled to and opens her plan.
 *
 * A hard navigation, not next/link and not the router. /app must arrive as a
 * fresh document — app/Clarity.jsx keeps the session recorder out of the member
 * area by never injecting it on that document, and a client-side route change
 * would commit her name, her check-ins and her Coach Mia transcripts inside a
 * live recording. The same note is on the anchors in WelcomeClient and
 * ProgramIntro; keep all three.
 */
function openTheApp() {
  if (typeof window !== "undefined") window.location.assign("/app");
}

export default function LoginSheet({ open, onClose }) {
  const [providerMessage, setProviderMessage] = useState(null);
  const dialogRef = useDialogBehaviour(open, onClose);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-sheet-title"
        // Capped and scrollable for the same reason as the dialog in
        // app/welcome/WelcomeClient.jsx: this sheet is anchored to the bottom of
        // the viewport, so anything it cannot fit is lost off the TOP, taking
        // the title and the close button with it. It is short now, but a
        // provider error message is two or three lines on a 320px phone and it
        // must not be able to push the heading out of the world.
        className="max-h-[calc(100dvh-1.5rem)] w-full overflow-y-auto overscroll-contain rounded-t-[28px] border border-white/10 bg-[#12121A] px-5 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-5 shadow-2xl sm:max-w-[400px] sm:rounded-[24px] sm:pb-5"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 id="login-sheet-title" className="font-system text-[19px] font-bold text-white">
            Log in
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close log in"
            className="-mr-1 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <p className="mb-4 font-system text-[14px] leading-relaxed text-white/65">
          One tap and your plan, your streak and your history are all there. It is the same
          account whether you joined here or on your iPhone.
        </p>

        <ProviderButtons
          tone="dark"
          onError={(next) => setProviderMessage(next)}
          onSignedIn={openTheApp}
        />

        {providerMessage && (
          <p
            role="alert"
            className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-3 font-system text-[13px] leading-relaxed text-white/75"
          >
            {providerMessage}
          </p>
        )}

        {/* THE SENTENCE THAT DOES THE WORK NOW THE FIELD HAS GONE. Firebase is
            one account per email address, so a member who presses Google with a
            different account gets a clean empty account rather than an error,
            and the only thing she sees is her plan apparently missing. */}
        <p className="mt-4 font-system text-[12.5px] leading-relaxed text-white/50">
          Use the same email address you joined with. That is what your plan, your day count
          and your history are attached to.
        </p>

        <p className="mt-3 font-system text-[12.5px] leading-relaxed text-white/40">
          Stuck? Email contact@pelvi.health and we will open your plan by hand.
        </p>
      </div>
    </div>
  );
}
