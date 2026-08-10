"use client";

// "We know you. Come in."
//
// The funnel asks for an email address one screen before the plan reveal and
// two before the price. If that address is already paying us, then everything
// after this point is wrong: the timeline is selling her a plan she owns, the
// paywall is quoting a price she is already being charged, and the only way she
// had back to her own account was a 13px "Restore Purchase" link at the bottom
// of the money screen. So the funnel stops here instead.
//
// WHAT THIS SCREEN CANNOT DO, and the reason it asks for one tap rather than
// simply opening the plan. She TYPED that address. Typing an address proves
// nothing at all: anybody can type anybody's. Signing her in on the strength of
// it would mean that knowing a member's email address is the same as owning her
// account, including her symptom check-ins and her Coach Mia transcripts. So
// the check decides what we SHOW her, and Google or Apple decides who she IS.
//
// WHY IT NO LONGER EMAILS HER A LINK. It used to send one the moment this
// screen mounted, and say "check your email". The send resolves successfully
// even when the mail is filed as spam — which is what happens, every time,
// because it leaves from the default firebaseapp.com sender with no SPF or DKIM
// aligned to pelvi.health. So the funnel's single most important screen, the
// one it puts a paying member on to stop selling to her, ended in a promise
// this code could not keep and could not even detect breaking. She was left
// watching an inbox. Now she is given the two doors that answer in the same
// second she presses them. See the header of lib/identity.js.
//
// THE ADDRESS STILL MATTERS, so this screen says it out loud: Firebase is one
// account per email address, and continuing with a DIFFERENT Google account
// makes a clean, empty second account rather than an error. The only symptom
// she would see is her plan apparently gone.
//
// Compare the path after payment, which genuinely is zero clicks: there the
// address comes from Stripe, off a payment the server verified, and never from
// this browser. See functions/api/session-from-payment.js.

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

import ProviderButtons from "@/components/auth/ProviderButtons";
import { BackButton } from "./ui";

/**
 * A plain navigation, not the router. /app is a different document, and
 * app/Clarity.jsx keeps Microsoft Clarity out of the member area by never
 * injecting it on that document — a client-side route change would carry a live
 * session recording into her check-ins and her Coach Mia transcripts. The same
 * note is on the anchors in LoginSheet, WelcomeClient and ProgramIntro.
 */
function openTheApp() {
  if (typeof window !== "undefined") window.location.assign("/app");
}

export default function RecognisedScreen({ email, onBack, onNotMe, onContinueAnyway }) {
  const [providerMessage, setProviderMessage] = useState(null);

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-white font-system">
      <div className="shrink-0 px-5 pt-[max(env(safe-area-inset-top),14px)] tab:pt-4">
        <div className="flex h-11 items-center">
          <BackButton onClick={onBack} />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain no-scrollbar px-7 pb-4 text-center">
        <span
          aria-hidden="true"
          className="mx-auto mt-6 flex h-16 w-16 items-center justify-center rounded-full bg-app-primary/10"
        >
          <CheckCircle2 size={28} className="text-app-primary" />
        </span>

        <h1 className="mt-6 text-[26px] font-medium leading-[1.06] tracking-[-0.4px] text-app-textPrimary sm:text-[30px]">
          You are already a member.
        </h1>

        <p className="mx-auto mt-3 max-w-[22rem] text-[15px] leading-snug text-app-textSecondary">
          <span className="font-semibold text-app-textPrimary">{email}</span> already has a Pelvi
          plan, so there is nothing to buy. One tap below and your plan, your day count and your
          streak are all exactly where you left them.
        </p>

        {/* The two doors, on the screen she is standing on. Not a link to
            another page: she has stopped shopping and there is nothing left
            between her and her own account. */}
        <div className="mx-auto mt-7 max-w-[22rem]">
          <ProviderButtons onError={(next) => setProviderMessage(next)} onSignedIn={openTheApp} />
          {providerMessage && (
            <p
              role="alert"
              className="mt-3 rounded-[18px] border border-app-borderIdle bg-app-background p-3.5 text-left text-[13px] leading-relaxed text-app-textPrimary"
            >
              {providerMessage}
            </p>
          )}
        </div>

        <div className="mx-auto mt-6 max-w-[22rem] space-y-2.5 rounded-[22px] border border-app-borderIdle bg-app-background p-5 text-left">
          {/* THE ONE INSTRUCTION THIS SCREEN EXISTS TO GIVE. Everything she owns
              is attached to the address above; a different one is a different
              account with nothing in it. */}
          <p className="text-[13px] leading-relaxed text-app-textSecondary">
            Use the same address you paid with —{" "}
            <span className="font-semibold text-app-textPrimary">{email}</span> — and everything
            comes back with you.
          </p>
          <p className="text-[13px] leading-relaxed text-app-textSecondary">
            No password to remember and no account to create. It is the same plan you use on your
            phone.
          </p>
        </div>
      </div>

      <div className="shrink-0 space-y-2 px-7 pb-[max(env(safe-area-inset-bottom),16px)] pt-3 tab:pb-5">
        {/* The escape hatch, and it has to exist. One address can be shared, and
            a woman buying this for her mother must not be trapped on a screen
            that insists she already owns it. */}
        <button
          type="button"
          onClick={onNotMe}
          className="flex h-11 w-full items-center justify-center text-[13px] text-app-textSecondary"
        >
          Use a different email
        </button>
        <button
          type="button"
          onClick={onContinueAnyway}
          className="flex h-9 w-full items-center justify-center text-[12px] text-app-textSecondary underline underline-offset-4"
        >
          This is not me, show me the plan
        </button>
      </div>
    </div>
  );
}
