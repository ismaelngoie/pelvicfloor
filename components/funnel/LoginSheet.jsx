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
// WHAT IT DOES NOT DO. It does not check with Stripe first, and that is
// deliberate rather than lazy. A member who bought on her iPhone has NO Stripe
// subscription at all: her purchase lives with Apple and RevenueCat, and the old
// sheet answered her with "we could not find an active plan for that address",
// which was both wrong and the most discouraging sentence we could have picked.
// The link goes to whoever asks for it, the session it produces is verified, and
// what she is entitled to is then decided by the gate, which knows about Apple.
//
// WHAT IT CANNOT DO. It cannot let anyone in by itself. Typing an address proves
// nothing; opening what arrives in that inbox proves everything. That is the
// whole security model of this screen, and it is why there is no "we found your
// plan, come on in" branch anywhere below.

import { useState } from "react";
import { LoaderCircle, MailCheck, X } from "lucide-react";

import { isValidEmail } from "@/lib/checkout";
import { loginErrorMessage, sendLoginLink } from "@/lib/identity";
import { useDialogBehaviour } from "./paywallHooks";

export default function LoginSheet({ open, onClose, email = "" }) {
  const [value, setValue] = useState(email);
  const [state, setState] = useState("idle"); // idle | sending | sent | error
  const [message, setMessage] = useState(null);
  const dialogRef = useDialogBehaviour(open, onClose);

  if (!open) return null;

  const send = async (address) => {
    setState("sending");
    setMessage(null);
    const sent = await sendLoginLink(address);
    if (sent.ok) {
      setState("sent");
      return;
    }
    setState("error");
    setMessage(loginErrorMessage(sent.code));
  };

  const submit = (event) => {
    event.preventDefault();
    if (state === "sending") return;
    const address = value.trim();
    if (!isValidEmail(address)) {
      setState("error");
      setMessage("Please enter the email address you joined with.");
      return;
    }
    send(address);
  };

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
        className="w-full rounded-t-[28px] border border-white/10 bg-[#12121A] px-5 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-5 shadow-2xl sm:max-w-[400px] sm:rounded-[24px] sm:pb-5"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 id="login-sheet-title" className="font-system text-[19px] font-bold text-white">
            {state === "sent" ? "Check your email" : "Log in"}
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

        {state === "sent" ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-app-primary/15">
                <MailCheck size={22} className="text-app-primary" aria-hidden="true" />
              </span>
              <p className="font-system text-[14px] leading-relaxed text-white/75">
                We sent a login link to{" "}
                <span className="font-semibold text-white">{value.trim()}</span>. Open it on this
                phone and your plan, your streak and your history are all there. No password to
                remember.
              </p>
            </div>
            <button
              type="button"
              onClick={() => send(value.trim())}
              className="flex h-12 w-full items-center justify-center rounded-full border border-white/15 font-system text-[15px] font-semibold text-white/85"
            >
              Send it again
            </button>
          </div>
        ) : (
          <>
            <p className="mb-4 font-system text-[14px] leading-relaxed text-white/65">
              Enter the email you joined with and we will send you a link that logs you straight
              in. No password, and it works whether you joined here or on your iPhone.
            </p>

            <form onSubmit={submit} className="flex flex-col gap-4">
              <label htmlFor="login-email" className="sr-only">
                Email address
              </label>
              <input
                id="login-email"
                data-autofocus
                data-clarity-mask="true"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck="false"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder="you@example.com"
                className="h-[52px] w-full rounded-[14px] border border-white/15 bg-white/5 px-4 font-system text-[16px] text-white outline-none transition-colors placeholder:text-white/30 focus:border-app-primary"
              />

              {message && (
                <p
                  role="alert"
                  className="rounded-2xl border border-white/10 bg-white/5 p-3 font-system text-[13px] leading-relaxed text-white/75"
                >
                  {message}
                </p>
              )}

              <button
                type="submit"
                disabled={state === "sending"}
                className="flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-paywall-cta font-system text-[16px] font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-70"
              >
                {state === "sending" ? (
                  <>
                    <LoaderCircle
                      size={20}
                      className="animate-spin motion-reduce:animate-none"
                      aria-hidden="true"
                    />
                    <span>Sending</span>
                  </>
                ) : (
                  "Email me a login link"
                )}
              </button>
            </form>

            {/* /app is the member app's own front door and it carries Google
                sign-in. A plain anchor, because it is a different document. */}
            <a
              href="/app"
              className="mt-3 flex h-11 w-full items-center justify-center font-system text-[13px] font-medium text-white/60 underline underline-offset-4"
            >
              Prefer to use Google? Log in here
            </a>
          </>
        )}
      </div>
    </div>
  );
}
