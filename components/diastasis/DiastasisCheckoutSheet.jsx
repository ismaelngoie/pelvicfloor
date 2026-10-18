"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, LinkAuthenticationElement, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { CheckCircle2, LoaderCircle, LockKeyhole, ShieldCheck, X } from "lucide-react";
import ProviderButtons from "@/components/auth/ProviderButtons";
import { createSubscriptionIntent, newAttemptKey } from "@/lib/checkout";
import { BILLING_INTERVAL, DEFAULT_PRICE_LABEL, DEFAULT_PRICE_PERIOD, PRICE_AMOUNT_CENTS, PRICE_CURRENCY } from "@/lib/pricing";
import { submitDiastasisPayment } from "@/lib/diastasisPayment";
import { markEntitlementActive } from "@/lib/entitlement";
import { readPaidIntent, stashPaidIntent } from "@/lib/identity";
import { rememberPrice } from "@/lib/postPurchase";
import { trackCardFormShown, trackCheckoutSetupFailed, trackPaymentFailed, trackPurchaseCompleted } from "@/lib/analytics";
import styles from "./DiastasisCheckoutSheet.module.css";

let stripePromise;
function getStripe() {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!key) return null;
  if (!stripePromise) stripePromise = loadStripe(key);
  return stripePromise;
}

// Deferred Elements renders payment immediately. A customer/subscription is
// created only after Stripe validates this single payment form, including email.
const ELEMENTS_OPTIONS = {
  mode: "subscription",
  amount: PRICE_AMOUNT_CENTS,
  currency: PRICE_CURRENCY.toLowerCase(),
  loader: "auto",
  appearance: {
    theme: "stripe",
    variables: {
      colorPrimary: "#A33752",
      colorBackground: "#FFFFFF",
      colorText: "#1C1820",
      colorTextSecondary: "#746C71",
      colorTextPlaceholder: "#8B8085",
      colorDanger: "#AA2946",
      fontFamily: "Arial, sans-serif",
      fontSizeBase: "16px",
      borderRadius: "12px",
      spacingUnit: "4px",
      focusBoxShadow: "0 0 0 3px rgba(230,84,115,0.15)",
      focusOutline: "none",
    },
    rules: {
      ".Input": { border: "1px solid #E4D8D9", boxShadow: "none", padding: "13px 12px" },
      ".Input:focus": { borderColor: "#E65473", boxShadow: "0 0 0 3px rgba(230,84,115,0.15)" },
      ".Tab": { border: "1px solid #E4D8D9", boxShadow: "none", backgroundColor: "#FFFFFF" },
      ".Tab--selected": { borderColor: "#A33752", backgroundColor: "#FFF4F5", boxShadow: "0 0 0 1px #A33752" },
      ".AccordionItem": { border: "1px solid #E4D8D9", boxShadow: "none" },
      ".AccordionItem--selected": { borderColor: "#A33752", boxShadow: "0 0 0 1px #A33752" },
      ".Label": { color: "#1C1820", fontWeight: "500" },
    },
  },
};

export default function DiastasisCheckoutSheet({ open, onClose, goalId = "", name = "", email = "", uid = "", memberId = "", onPaid, onSetupError, successPath = "/diastasis-recti/start?paid=1" }) {
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [knownEmail, setKnownEmail] = useState("");
  const [providerMessage, setProviderMessage] = useState(null);
  const stripe = getStripe();
  const requestClose = useCallback(() => {
    if (!busyRef.current) onClose?.();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    const returnFocus = document.activeElement;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Native modal focus handling includes Stripe's cross-origin iframes.
    dialog.showModal();
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      dialog.close();
      document.body.style.overflow = oldOverflow;
      if (returnFocus instanceof HTMLElement && returnFocus.isConnected) returnFocus.focus({ preventScroll: true });
    };
  }, [open]);

  const onBusy = useCallback((value) => {
    busyRef.current = value;
    setBusy(value);
  }, []);

  if (!open) return null;
  return createPortal(
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby="dr-checkout-title"
      aria-describedby="dr-checkout-price"
      onCancel={(event) => { event.preventDefault(); requestClose(); }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) requestClose();
      }}
    >
      <div className={styles.panel}>
        <header className={styles.header}>
          <div>
            <span className={styles.brand}>pelvi<span>®</span></span>
            <h2 id="dr-checkout-title">{knownEmail ? "Your plan is already waiting" : "Your diastasis recti plan"}</h2>
            <p id="dr-checkout-price">{knownEmail ? "Sign in to continue your plan." : <><strong>{DEFAULT_PRICE_LABEL} {PRICE_CURRENCY}</strong> / {DEFAULT_PRICE_PERIOD}</>}</p>
          </div>
          <button ref={closeRef} type="button" onClick={requestClose} disabled={busy} aria-label="Close checkout" className={styles.close}><X size={21} aria-hidden="true" /></button>
        </header>
        <div className={styles.content}>
          {knownEmail ? <div className={styles.member}>
            <CheckCircle2 size={30} aria-hidden="true" />
            <p><strong>{knownEmail}</strong> already has a membership. Sign in with the same email to open your plan.</p>
            <ProviderButtons tone="light" onError={setProviderMessage} onSignedIn={() => window.location.assign("/app")} />
            {providerMessage && <p className={styles.error} role="alert">{providerMessage}</p>}
            <button type="button" className={styles.textButton} onClick={() => { setKnownEmail(""); setProviderMessage(null); }}>Use a different email</button>
          </div> : stripe ? <Elements stripe={stripe} options={ELEMENTS_OPTIONS}>
            <PaymentForm {...{ goalId, name, email, uid, memberId, successPath, onPaid, onSetupError, onBusy }} onKnownMember={setKnownEmail} />
          </Elements> : <p className={styles.error} role="alert">Payment could not load. Please refresh the page and try again.</p>}
        </div>
      </div>
    </dialog>, document.body
  );
}

function PaymentForm({ goalId, name, email, uid, memberId, successPath, onPaid, onSetupError, onBusy, onKnownMember }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const submitting = useRef(false);
  const attemptKey = useRef(newAttemptKey());
  const emailRef = useRef(email || "");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [message, setMessage] = useState(null);
  const paymentOptions = useMemo(() => ({
    layout: { type: "accordion", defaultCollapsed: false, radios: false, spacedAccordionItems: true },
    wallets: { applePay: "auto", googlePay: "auto", link: "never" },
    paymentMethodOrder: ["apple_pay", "google_pay", "card"],
    fields: { billingDetails: { email: "never" } },
    ...(name ? { defaultValues: { billingDetails: { name } } } : {}),
  }), [name]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!stripe || !elements || !ready || submitting.current) return;
    submitting.current = true;
    setBusy(true);
    onBusy(true);
    setMessage(null);
    let paid = false;
    try {
      const address = emailRef.current.trim();
      const result = await submitDiastasisPayment({
        stripe, elements, createIntent: createSubscriptionIntent,
        purchase: { email: address, name, uid, memberId, goalId, attemptKey: attemptKey.current },
        returnUrl: new URL(successPath, window.location.origin).toString(),
        expectedPrice: { amount: PRICE_AMOUNT_CENTS, currency: PRICE_CURRENCY, interval: BILLING_INTERVAL },
        beforeConfirm: rememberPrice,
      });
      if (result.kind === "validation_error" || result.kind === "payment_error") {
        if (result.kind === "payment_error") trackPaymentFailed(result.error);
        setMessage(result.error.message || "Please check your payment details and try again.");
      } else if (result.kind === "setup_error") {
        if (result.result.code === "already_subscribed") onKnownMember(address);
        else {
          trackCheckoutSetupFailed(result.result.code);
          setMessage(result.result.message || "Payment could not start. Please try again.");
          onSetupError?.(result.result);
        }
      } else if (result.kind === "price_mismatch") {
        trackCheckoutSetupFailed("price_mismatch");
        setMessage("The price has changed. Please refresh the page before paying.");
      } else if (result.kind === "paid") {
        paid = true;
        const { intent, status } = result;
        trackPurchaseCompleted(status);
        markEntitlementActive({ source: "stripe", priceId: intent.priceId || null, subscriptionId: intent.subscriptionId || null, currentPeriodEnd: intent.currentPeriodEnd || null, email: address, pending: status === "processing" });
        stashPaidIntent(intent.clientSecret);
        try { await onPaid?.({ email: address, status, subscriptionId: intent.subscriptionId || null, customerId: intent.customerId || null, priceId: intent.priceId || null }); } catch { /* A paid member must still reach her plan. */ }
        const destination = new URL(successPath, window.location.origin);
        if (readPaidIntent() !== intent.clientSecret) destination.searchParams.set("payment_intent_client_secret", intent.clientSecret);
        router.push(`${destination.pathname}${destination.search}`);
      } else {
        setMessage("Your payment is not confirmed yet. Check your payment details and try again.");
      }
    } catch {
      setMessage("We could not finish your payment. Please check your connection and try again.");
    } finally {
      if (!paid) {
        submitting.current = false;
        setBusy(false);
        onBusy(false);
      }
    }
  };

  return <form onSubmit={handleSubmit} className={styles.form}>
    <div className={styles.fields} inert={busy ? true : undefined}>
      {!ready && !loadFailed && <p role="status" className={styles.loading}><LoaderCircle size={18} aria-hidden="true" /> Loading payment options…</p>}
      <PaymentElement id="dr-payment-element" options={paymentOptions}
        onReady={() => { setReady(true); setLoadFailed(false); trackCardFormShown(); }}
        onLoadError={() => { setLoadFailed(true); setMessage("Payment could not load. Please refresh the page and try again."); }} />
      <div className={styles.email} data-clarity-mask="true">
        <LinkAuthenticationElement options={{ defaultValues: { email: email || "" } }} onChange={(event) => { emailRef.current = event.value.email; }} />
      </div>
    </div>
    {message && <p className={styles.error} role="alert">{message}</p>}
    <button type="submit" disabled={busy || !stripe || !ready || loadFailed} className={styles.pay}>
      {busy ? <><LoaderCircle size={19} aria-hidden="true" /> Processing…</> : <><LockKeyhole size={17} aria-hidden="true" /> Pay {DEFAULT_PRICE_LABEL}</>}
    </button>
    <p className={styles.renewal}>{DEFAULT_PRICE_LABEL} {PRICE_CURRENCY} today, then every {DEFAULT_PRICE_PERIOD} until you cancel. Cancel anytime in your account. By paying, you agree to our <a href="/terms-of-service" target="_blank" rel="noopener noreferrer">Terms</a> and <a href="/privacy-policy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.</p>
    <div className={styles.guarantee}><ShieldCheck size={23} aria-hidden="true" /><p><strong>Your progress. Or your money back.</strong><span>Not happy within 12 weeks? Get a full refund.</span></p></div>
  </form>;
}
