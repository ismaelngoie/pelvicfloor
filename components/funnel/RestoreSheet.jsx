"use client";

// "Restore Purchase", the web version.
//
// On iOS this asks the App Store. On the web there is no store to ask, so it
// asks Stripe by email. That lookup only works because checkout now attaches
// the address to the Stripe customer; before that fix this screen could never
// have found anybody.
//
// Apple's guideline 3.1.1 forbids unlocking an app with a redemption code, so
// the recovery path on both sides has to be an address you own, never a code.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, X } from "lucide-react";

import { isValidEmail } from "@/lib/checkout";
import { markEntitlementActive } from "@/lib/entitlement";
import { useDialogBehaviour } from "./paywallHooks";

export default function RestoreSheet({ open, onClose, email = "" }) {
  const [value, setValue] = useState(email);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const dialogRef = useDialogBehaviour(open, onClose);
  const router = useRouter();

  if (!open) return null;

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    const address = value.trim();
    if (!isValidEmail(address)) {
      setMessage("Please enter the email address you paid with.");
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/restore-purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: address }),
      });
      const data = await res.json().catch(() => null);

      if (data?.isPremium) {
        markEntitlementActive({ source: "stripe", email: address });
        router.push("/welcome?restored=1");
        return;
      }

      setMessage(
        "We could not find an active plan for that address. Check the spelling, or email hello@pelvi.health and we will sort it out."
      );
    } catch {
      setMessage("We could not reach the server. Please check your connection and try again.");
    }
    setBusy(false);
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
        aria-labelledby="restore-sheet-title"
        className="w-full rounded-t-[28px] border border-white/10 bg-[#12121A] px-5 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-5 shadow-2xl sm:max-w-[400px] sm:rounded-[24px] sm:pb-5"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 id="restore-sheet-title" className="font-system text-[19px] font-bold text-white">
            Restore your plan
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close restore"
            className="-mr-1 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <p className="mb-4 font-system text-[14px] leading-relaxed text-white/65">
          Enter the email address you paid with and we will find your plan.
        </p>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <label htmlFor="restore-email" className="sr-only">
            Email address
          </label>
          <input
            id="restore-email"
            data-autofocus
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
            disabled={busy}
            className="flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-paywall-cta font-system text-[16px] font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-70"
          >
            {busy ? (
              <>
                <LoaderCircle size={20} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                <span>Looking</span>
              </>
            ) : (
              "Find my plan"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
