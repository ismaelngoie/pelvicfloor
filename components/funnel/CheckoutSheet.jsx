"use client";

// Checkout, as one sheet.
//
// Two steps, in this order, and the order is the point:
//
//   1. Her email. Nothing is created in Stripe until we have it. The old flow
//      called stripe.customers.create() with no arguments, which left every
//      paying customer with a null email, which meant "Restore Purchase" and
//      "Cancel my subscription" could never find anyone. Collecting the address
//      first is the whole fix.
//   2. The Stripe Payment Element, with the amount Stripe actually returned,
//      not a number typed into the markup.
//
// Card authentication that needs a redirect (3-D Secure) comes back to
// /welcome, which reads the payment intent and unlocks there. That path used to
// drop the purchase on the floor.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { LoaderCircle, Lock, ShieldCheck, X } from "lucide-react";

import {
  DEFAULT_PRICE_LABEL,
  DEFAULT_PRICE_PERIOD,
  createSubscriptionIntent,
  formatAmount,
  isValidEmail,
  newAttemptKey,
} from "@/lib/checkout";
import { markEntitlementActive } from "@/lib/entitlement";
import {
  trackCardFormShown,
  trackCheckoutSetupFailed,
  trackPaymentFailed,
  trackPurchaseCompleted,
} from "@/lib/analytics";
import { useDialogBehaviour } from "./paywallHooks";

// Loaded on first open, never on paywall paint. stripe.js is ~200 KB and the
// majority of visitors never reach this sheet.
let stripePromise = null;
function getStripe() {
  if (stripePromise) return stripePromise;
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!key) return null;
  stripePromise = loadStripe(key);
  return stripePromise;
}

const APPEARANCE = {
  theme: "night",
  variables: {
    colorPrimary: "#E65473",
    colorBackground: "#15151F",
    colorText: "#FFFFFF",
    colorTextSecondary: "rgba(255,255,255,0.6)",
    colorDanger: "#FF6B81",
    borderRadius: "14px",
    spacingUnit: "4px",
    fontSizeBase: "16px",
  },
  rules: {
    ".Input": { border: "1px solid rgba(255,255,255,0.14)", boxShadow: "none" },
    ".Input:focus": { border: "1px solid #E65473", boxShadow: "none" },
    ".Tab": { border: "1px solid rgba(255,255,255,0.14)" },
    ".Label": { fontWeight: "500" },
  },
};

export default function CheckoutSheet({
  open,
  onClose,
  goalId = "",
  name = "",
  email = "",
  uid = "",
  memberId = "",
  onPaid,
  onSetupError,
  successPath = "/welcome?paid=1",
}) {
  const [step, setStep] = useState("email");
  const [emailValue, setEmailValue] = useState(email || "");
  const [emailTouched, setEmailTouched] = useState(false);
  const [error, setError] = useState(null);
  const [intent, setIntent] = useState(null);
  const [attemptKey, setAttemptKey] = useState(() => newAttemptKey());

  // A member cannot dismiss the sheet while her card is being charged. Losing
  // the screen mid-confirm is how someone ends up paying and never seeing it.
  const stepRef = useRef(step);
  stepRef.current = step;
  const requestClose = useCallback(() => {
    if (stepRef.current === "paying") return;
    onClose?.();
  }, [onClose]);

  const dialogRef = useDialogBehaviour(open, requestClose);
  const stripe = getStripe();

  // Reset every time the sheet opens so a member who backed out and came back
  // is not looking at last attempt's error.
  const autoStarted = useRef(false);
  useEffect(() => {
    if (!open) {
      autoStarted.current = false;
      return;
    }
    setError(null);
    setEmailTouched(false);
    setEmailValue((current) => current || email || "");
  }, [open, email]);

  const start = useCallback(
    async (address) => {
      setError(null);
      setStep("loading");
      const key = attemptKey;
      const result = await createSubscriptionIntent({
        email: address,
        name,
        uid,
        memberId,
        goalId,
        attemptKey: key,
      });
      if (!result.ok) {
        setError(result.message);
        setStep("email");
        // The code, not the message. Codes are stable and countable
        // (already_subscribed, price_unresolved, network_error, http_500);
        // the message is copy and will be reworded.
        trackCheckoutSetupFailed(result.code);
        onSetupError?.(result);
        // A fresh key for the next try, unless the failure was purely a
        // duplicate: reusing the key there would just replay the same answer.
        if (result.code !== "already_subscribed") setAttemptKey(newAttemptKey());
        return;
      }
      setIntent(result);
      setStep("pay");
      // She has an address in and Stripe has answered, so the card form is
      // about to mount. This is the last rung the recorder can see her cross.
      trackCardFormShown();
    },
    [attemptKey, goalId, memberId, name, uid, onSetupError]
  );

  // If the funnel already knows her address, skip straight to the card form.
  // Once only: a failed attempt must land back on the form, not retry forever.
  useEffect(() => {
    if (!open || autoStarted.current || intent) return;
    if (!isValidEmail(email)) return;
    autoStarted.current = true;
    start(email.trim());
  }, [open, email, intent, start]);

  const priceLabel = intent ? formatAmount(intent.amount, intent.currency) : DEFAULT_PRICE_LABEL;
  const period = intent?.interval || DEFAULT_PRICE_PERIOD;

  const elementsOptions = useMemo(
    () => (intent?.clientSecret ? { clientSecret: intent.clientSecret, appearance: APPEARANCE } : null),
    [intent]
  );

  if (!open) return null;

  const emailInvalid = emailTouched && !isValidEmail(emailValue);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-sheet-title"
        className="relative flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-[28px] border border-white/10 bg-[#12121A] pb-[env(safe-area-inset-bottom)] shadow-2xl sm:max-w-[440px] sm:rounded-[24px] sm:pb-0"
      >
        <header className="flex items-start justify-between gap-3 px-5 pb-3 pt-5">
          <div>
            <h2 id="checkout-sheet-title" className="font-system text-[19px] font-bold text-white">
              Secure checkout
            </h2>
            <p className="mt-1 font-system text-[13px] text-white/60">
              {priceLabel} per {period}, billed until you cancel.
            </p>
          </div>
          <button
            type="button"
            onClick={requestClose}
            disabled={step === "paying"}
            aria-label="Close checkout"
            className="-mr-1 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 disabled:opacity-40"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 pb-5">
          {!stripe && (
            <p className="rounded-2xl border border-white/10 bg-white/5 p-4 font-system text-[14px] text-white/80">
              Checkout is not available on this deployment yet. Please email
              hello@pelvi.health and we will set you up by hand.
            </p>
          )}

          {stripe && step !== "pay" && step !== "paying" && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                setEmailTouched(true);
                if (!isValidEmail(emailValue)) return;
                start(emailValue.trim());
              }}
              className="flex flex-col gap-4"
            >
              <div>
                <label
                  htmlFor="checkout-email"
                  className="mb-2 block font-system text-[14px] font-medium text-white/85"
                >
                  Your email
                </label>
                <input
                  id="checkout-email"
                  data-autofocus
                  // Masked in session replay. Clarity masks input values by
                  // default and this pins it, so the project's masking mode
                  // cannot be loosened in the dashboard and start capturing the
                  // address of everyone who reaches checkout.
                  data-clarity-mask="true"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck="false"
                  value={emailValue}
                  onChange={(event) => setEmailValue(event.target.value)}
                  onBlur={() => setEmailTouched(true)}
                  placeholder="you@example.com"
                  aria-invalid={emailInvalid ? "true" : "false"}
                  aria-describedby="checkout-email-help"
                  className="h-[52px] w-full rounded-[14px] border border-white/15 bg-white/5 px-4 font-system text-[16px] text-white outline-none transition-colors placeholder:text-white/30 focus:border-app-primary"
                />
                <p id="checkout-email-help" className="mt-2 font-system text-[12px] text-white/50">
                  Your receipt, your plan and your guarantee all go here. It is
                  also how you get back in on a new phone.
                </p>
                {emailInvalid && (
                  <p role="alert" className="mt-2 font-system text-[13px] text-[#FF8FA1]">
                    Please enter a valid email address.
                  </p>
                )}
              </div>

              {error && (
                <p
                  role="alert"
                  className="rounded-2xl border border-[#FF6B81]/25 bg-[#FF6B81]/10 p-3 font-system text-[13px] text-[#FFB3BF]"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={step === "loading"}
                className="flex h-[54px] w-full items-center justify-center gap-2 rounded-full bg-paywall-cta font-system text-[17px] font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-70"
              >
                {step === "loading" ? (
                  <>
                    <LoaderCircle size={20} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                    <span>Setting up</span>
                  </>
                ) : (
                  "Continue to payment"
                )}
              </button>
            </form>
          )}

          {stripe && elementsOptions && (step === "pay" || step === "paying") && (
            <Elements stripe={stripe} options={elementsOptions}>
              <PaymentStep
                email={emailValue.trim()}
                name={name}
                priceLabel={priceLabel}
                period={period}
                intent={intent}
                successPath={successPath}
                onPaying={(paying) => setStep(paying ? "paying" : "pay")}
                onPaid={onPaid}
                onEditEmail={() => {
                  setIntent(null);
                  setStep("email");
                }}
              />
            </Elements>
          )}
        </div>
      </div>
    </div>
  );
}

function PaymentStep({
  email,
  name,
  priceLabel,
  period,
  intent,
  successPath,
  onPaying,
  onPaid,
  onEditEmail,
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [ready, setReady] = useState(false);

  // The Pay button waits for the card form to mount, but it must never wait
  // forever: if Stripe's onReady does not fire, a permanently dead button is a
  // worse failure than letting Stripe reject the submit with a real message.
  useEffect(() => {
    if (ready) return undefined;
    const timer = setTimeout(() => setReady(true), 6000);
    return () => clearTimeout(timer);
  }, [ready]);

  const paymentElementOptions = useMemo(
    () => ({
      layout: { type: "accordion", defaultCollapsed: false, radios: false, spacedAccordionItems: true },
      wallets: { applePay: "auto", googlePay: "auto" },
      // We already have her address and show it above, so the card form should
      // not ask for it twice. It is handed to Stripe on confirm instead.
      fields: { billingDetails: { email: "never" } },
      ...(name ? { defaultValues: { billingDetails: { name } } } : {}),
    }),
    [name]
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!stripe || !elements || busy) return;

    setBusy(true);
    setMessage(null);
    onPaying?.(true);

    const returnUrl =
      typeof window !== "undefined"
        ? new URL(successPath, window.location.origin).toString()
        : successPath;

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: returnUrl,
        receipt_email: email,
        payment_method_data: { billing_details: { email, name: name || undefined } },
      },
      redirect: "if_required",
    });

    if (error) {
      // Two codes, because they answer two different questions. error.code is
      // what went wrong at Stripe (card_declined, incomplete_number,
      // payment_intent_authentication_failure). error.decline_code is the
      // issuing bank's reason (insufficient_funds, do_not_honor, lost_card),
      // and it is the one that says whether the price or the card is the
      // problem. Nothing about the card itself is available here or anywhere
      // else on this origin.
      trackPaymentFailed(error);
      setMessage(
        error.message ||
          "That payment did not go through. Please check the card details and try again."
      );
      setBusy(false);
      onPaying?.(false);
      return;
    }

    const status = paymentIntent?.status;

    if (status === "succeeded" || status === "processing") {
      // Fired before the redirect to /welcome, because router.push unmounts
      // this component and anything queued in an effect would never run.
      trackPurchaseCompleted(status);
      markEntitlementActive({
        source: "stripe",
        priceId: intent?.priceId || null,
        subscriptionId: intent?.subscriptionId || null,
        currentPeriodEnd: intent?.currentPeriodEnd || null,
        email,
        pending: status === "processing",
      });
      try {
        await onPaid?.({
          email,
          status,
          subscriptionId: intent?.subscriptionId || null,
          customerId: intent?.customerId || null,
          priceId: intent?.priceId || null,
        });
      } catch {
        // Never let a bookkeeping failure strand someone who has paid.
      }
      router.push(successPath);
      return;
    }

    setMessage(
      "We could not confirm that payment. Nothing has been charged. Please try again."
    );
    setBusy(false);
    onPaying?.(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
        <div className="min-w-0">
          <p className="font-system text-[12px] uppercase tracking-wide text-white/45">Receipt to</p>
          <p className="truncate font-system text-[14px] text-white/90">{email}</p>
        </div>
        <button
          type="button"
          onClick={onEditEmail}
          disabled={busy}
          className="shrink-0 rounded-full px-3 py-2 font-system text-[13px] font-medium text-app-primary underline decoration-app-primary/40 underline-offset-2 disabled:opacity-40"
        >
          Change
        </button>
      </div>

      {/* THE CARD FIELDS ARE NOT RECORDABLE, AND THAT IS DELIBERATE.
          Do not "fix" this, and do not go looking for a Clarity setting that
          turns it on. There isn't one, and there could not be one.

          <PaymentElement /> renders an iframe served from js.stripe.com. That
          is a different origin from pelvi.health, so the browser's same-origin
          policy means this page cannot read its DOM, cannot see its keystrokes
          and cannot screenshot its pixels. Microsoft Clarity is ordinary
          JavaScript running on this origin, so the card number, the expiry and
          the CVC are invisible to it in the same way they are invisible to
          every other line of code in this repo. What session replay shows is an
          empty rectangle where the card form is, and taps landing on it.

          Two reasons that is the right outcome and not a gap:

            PCI-DSS. Card data never touching this origin is precisely what
            keeps this site on SAQ A, the shortest self-assessment there is.
            Any arrangement in which the number does reach our JavaScript, and
            therefore our analytics vendor, moves us to SAQ A-EP and drags
            Microsoft into our cardholder data environment as a service
            provider. That is a different company and a different audit.

            Stripe's terms. Stripe Elements exist to keep the number inside
            Stripe's frame. Instrumenting around that, by rebuilding the fields
            as our own inputs so they can be watched, breaks the Services
            Agreement and is grounds for losing the account we take money with.

          What we DO capture about payments, and it is enough to run the
          business on, is in lib/analytics.js: the stage she reached, whether
          Stripe declined, the decline code the bank gave, and whether it
          completed. */}
      <PaymentElement
        id="payment-element"
        options={paymentElementOptions}
        onReady={() => setReady(true)}
      />

      {message && (
        <p
          role="alert"
          className="rounded-2xl border border-[#FF6B81]/25 bg-[#FF6B81]/10 p-3 font-system text-[13px] text-[#FFB3BF]"
        >
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={busy || !stripe || !ready}
        className="flex h-[54px] w-full items-center justify-center gap-2 rounded-full bg-paywall-cta font-system text-[17px] font-bold text-white shadow-[0_0_24px_rgba(230,84,115,0.45)] transition-transform active:scale-[0.98] disabled:opacity-70"
      >
        {busy ? (
          <>
            <LoaderCircle size={20} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
            <span>Processing</span>
          </>
        ) : (
          <>
            <Lock size={18} aria-hidden="true" />
            <span>Pay {priceLabel}</span>
          </>
        )}
      </button>

      <p className="font-system text-[12px] leading-relaxed text-white/55">
        You are starting a subscription of {priceLabel} per {period}. It renews
        every {period} until you cancel, and you can cancel anytime from your
        account.
      </p>

      <p className="flex items-start gap-2 font-system text-[12px] leading-relaxed text-white/55">
        <ShieldCheck size={15} className="mt-[2px] shrink-0 text-app-primary" aria-hidden="true" />
        <span>
          Cancel in the first 7 days for any reason and pay nothing. Payments are
          handled by Stripe. We never see your card number.
        </span>
      </p>
    </form>
  );
}
