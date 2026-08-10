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
// WHAT THIS SCREEN CANNOT DO, and the reason it emails rather than opens.
// She TYPED that address. Typing an address proves nothing at all: anybody can
// type anybody's. Signing her in on the strength of it would mean that knowing a
// member's email address is the same as owning her account, including her
// symptom check-ins and her Coach Mia transcripts. So the check decides what we
// SHOW her, and the link in her inbox decides who she IS. One tap, no password,
// and the session it produces carries a verified address.
//
// Compare the path after payment, which genuinely is zero clicks: there the
// address comes from Stripe, off a payment the server verified, and never from
// this browser. See functions/api/session-from-payment.js.

import { useEffect, useRef, useState } from "react";
import { LoaderCircle, MailCheck } from "lucide-react";

import { loginErrorMessage, sendLoginLink } from "@/lib/identity";
import { BackButton, PrimaryButton } from "./ui";

export default function RecognisedScreen({ email, onBack, onNotMe, onContinueAnyway }) {
  const [state, setState] = useState("sending"); // sending | sent | error
  const [message, setMessage] = useState(null);
  const sentOnce = useRef(false);

  const send = async () => {
    setState("sending");
    setMessage(null);
    const result = await sendLoginLink(email);
    if (result.ok) {
      setState("sent");
      return;
    }
    setState("error");
    setMessage(loginErrorMessage(result.code));
  };

  // On arrival, not on a button press. She has already told us who she is; the
  // ref stops React's development double render from sending two.
  useEffect(() => {
    if (sentOnce.current || !email) return;
    sentOnce.current = true;
    send();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

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
          {state === "sending" ? (
            <LoaderCircle
              size={28}
              className="animate-spin text-app-primary motion-reduce:animate-none"
            />
          ) : (
            <MailCheck size={28} className="text-app-primary" />
          )}
        </span>

        <h1 className="mt-6 text-[26px] font-medium leading-[1.06] tracking-[-0.4px] text-app-textPrimary sm:text-[30px]">
          You are already a member.
        </h1>

        <p className="mx-auto mt-3 max-w-[22rem] text-[15px] leading-snug text-app-textSecondary">
          {state === "sent" ? (
            <>
              There is nothing to buy. We sent a login link to{" "}
              <span className="font-semibold text-app-textPrimary">{email}</span>. Open it on this
              phone and your plan, your day count and your streak are all exactly where you left
              them.
            </>
          ) : state === "sending" ? (
            <>
              That email already has a Pelvi plan, so there is nothing to buy. Sending you a link
              to get back in.
            </>
          ) : (
            // Whatever went wrong with the email, the fact stands and it has to
            // be said first: she has a plan, and we are not going to sell her
            // another one because our own mail failed.
            <>
              That email already has a Pelvi plan, so there is nothing to buy. {message}
            </>
          )}
        </p>

        <div className="mx-auto mt-8 max-w-[22rem] rounded-[22px] border border-app-borderIdle bg-app-background p-5 text-left">
          <p className="text-[13px] leading-relaxed text-app-textSecondary">
            No password to remember and no account to create. The link works once, and it opens
            the same plan you use on your phone.
          </p>
        </div>
      </div>

      <div className="shrink-0 space-y-3 px-7 pb-[max(env(safe-area-inset-bottom),16px)] pt-3 tab:pb-5">
        {/* WHEN THE LINK CANNOT BE SENT, IT STOPS BEING THE BUTTON.
            This screen is where the funnel puts a member it has just
            recognised, so the one loud control on it has to be one that can
            work. If the send was refused, and it is refused for everybody while
            "Email link (passwordless sign-in)" is off in the Firebase console,
            then "Send it again" is a promise to fail again and /app, which
            carries Google, is the door that is actually open. So they swap
            places. The retry stays underneath in case the switch has been
            thrown since this browser last asked. */}
        {state === "error" ? (
          <a
            href="/app"
            className="flex h-14 w-full items-center justify-center rounded-[28px] bg-app-primary px-4 text-center text-[17px] font-bold leading-tight text-white shadow-[0_6px_18px_rgba(230,84,115,0.3)] sm:text-[18px]"
          >
            Log in another way
          </a>
        ) : (
          <PrimaryButton onClick={send} disabled={state === "sending"} variant="rose">
            {state === "sent" ? "Send it again" : "Email me the login link"}
          </PrimaryButton>
        )}

        {/* A plain anchor: /app is a different document, and it carries the
            other ways in, Google included. */}
        {state === "error" ? (
          <button
            type="button"
            onClick={send}
            className="flex h-11 w-full items-center justify-center text-[14px] font-semibold text-app-primaryInk"
          >
            Try the email link again
          </button>
        ) : (
          <a
            href="/app"
            className="flex h-11 w-full items-center justify-center text-[14px] font-semibold text-app-primaryInk"
          >
            Log in another way
          </a>
        )}

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
