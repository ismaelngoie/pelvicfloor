"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, LoaderCircle, ShieldCheck } from "lucide-react";
import ProviderButtons from "@/components/auth/ProviderButtons";
import { allowedDiastasisAttribution, canonicalDiastasisReceiptPath, clearDiastasisEntry,
  completeDiastasisSetup, createDiastasisEntry, entryForVerifiedDiastasisPayer, readDiastasisEntry } from "@/lib/diastasisEntry";
import { readPaidIntent, signInFromPayment, stashPaidIntent } from "@/lib/identity";
import { reportVerifiedMetaPurchase } from "@/lib/metaPixel";

// The canonical /welcome remains the receipt/conversion UI. Its provider
// callbacks navigate to /app, so it must not be mounted before setup finishes.
export default function StartClient() {
  const [status, setStatus] = useState("authenticating");
  const [payerEmail, setPayerEmail] = useState("");
  const [message, setMessage] = useState("");
  const [retry, setRetry] = useState(0);
  const entryRef = useRef(null);
  const scopeRef = useRef(null);
  const actionsRef = useRef({});
  const paymentTaskRef = useRef(null);
  const forwardingRef = useRef(false);
  const attributionRef = useRef(typeof window === "undefined" ? "" : window.location.search);
  // Capture before effects scrub the return URL. Never render/log the secret.
  const secretRef = useRef(typeof window === "undefined" ? ""
    : new URLSearchParams(window.location.search).get("payment_intent_client_secret") || readPaidIntent());

  const forwardToReceipt = async () => {
    if (forwardingRef.current) return;
    forwardingRef.current = true;
    const secret = secretRef.current;
    if (secret) stashPaidIntent(secret);
    const target = canonicalDiastasisReceiptPath(attributionRef.current, {
      paid: Boolean(secret), clientSecret: secret && readPaidIntent() !== secret ? secret : "",
    });
    // Bounded, first-party receipt verification; failures never block access.
    // The signed Stripe webhook covers browser closes and delayed settlement.
    if (secret) await reportVerifiedMetaPurchase(secret);
    window.location.replace(target);
  };

  useEffect(() => {
    let mounted = true, generation = 0, unsubscribe = null, deadline = null, runningKey = "";
    let authInstance = null, verifiedEmail = "", paymentChecked = !secretRef.current;
    const initialEntry = readDiastasisEntry();
    const campaign = allowedDiastasisAttribution(attributionRef.current).toString();
    window.history.replaceState({}, "", `${window.location.pathname}${campaign ? `?${campaign}` : ""}`);
    // The existing helper's one-shot session store survives provider redirects.
    if (secretRef.current) stashPaidIntent(secretRef.current);

    const initialize = async (user) => {
      if (!mounted || forwardingRef.current || !paymentChecked) return;
      if (!user?.uid) { generation += 1; runningKey = ""; setStatus("signin"); return; }
      if (verifiedEmail && user.email?.trim().toLowerCase() !== verifiedEmail) {
        generation += 1; runningKey = ""; setStatus("signin");
        setMessage("Choose the account with the checkout email shown below."); return;
      }
      // With no secret (blocked storage), this route still expresses a plan
      // preference. Server-confirmed access for this user is required below.
      const entry = verifiedEmail ? entryRef.current
        : entryRef.current?.email === user.email?.trim().toLowerCase() ? entryRef.current
          : createDiastasisEntry({ email: user.email });
      if (!entry) { setStatus("error"); return; }
      entryRef.current = entry;
      const key = `${user.uid}:${entry.id}`;
      if (runningKey === key) return;
      runningKey = key;
      const run = ++generation;
      scopeRef.current = { uid: user.uid, entryId: entry.id };
      const isCurrent = () => mounted && !forwardingRef.current && run === generation
        && authInstance?.currentUser?.uid === user.uid && scopeRef.current?.entryId === entry.id;
      clearTimeout(deadline); setStatus("checking"); setMessage("");
      deadline = setTimeout(() => {
        if (isCurrent()) { generation += 1; runningKey = ""; setStatus("error"); }
      }, 20000);
      const result = await completeDiastasisSetup({ entry, user, isCurrent, onReady: () => {
        clearTimeout(deadline); clearDiastasisEntry(entry.id); setStatus("ready"); forwardToReceipt();
      } });
      if (!isCurrent()) return;
      clearTimeout(deadline); runningKey = "";
      if (!["stale", "ready"].includes(result.state)) setStatus(result.state === "mismatch" ? "signin" : result.state);
    };
    actionsRef.current = { signedIn: () => initialize(authInstance?.currentUser) };

    const boot = async () => {
      const [firebase, sdk] = await Promise.all([import("@/lib/firebase"), import("firebase/auth")]);
      if (!mounted) return;
      if (!firebase.isFirebaseConfigured()) { setStatus("error"); return; }
      authInstance = firebase.auth();
      unsubscribe = sdk.onAuthStateChanged(authInstance, initialize);
      if (!secretRef.current) { await initialize(authInstance.currentUser); return; }
      // Strict Mode replays effects. Reuse this one authentication request;
      // failed requests without a verified payer remain retryable.
      if (!paymentTaskRef.current || paymentTaskRef.current.retryable) {
        const task = { promise: signInFromPayment(secretRef.current).catch(() => ({ ok: false, code: "signin_failed" })), retryable: false };
        paymentTaskRef.current = task;
        task.promise.then((result) => { task.retryable = !result.ok && !result.email; });
      }
      setStatus("authenticating");
      deadline = setTimeout(() => { if (mounted && !paymentChecked) setStatus("error"); }, 20000);
      const result = await paymentTaskRef.current.promise;
      if (!mounted) return;
      clearTimeout(deadline);
      if (!result.email) {
        setStatus("error"); setMessage("We could not verify this payment yet. Retry or open the payment confirmation."); return;
      }
      // Correct edited checkout emails only from Stripe's verified response.
      verifiedEmail = result.email.trim().toLowerCase();
      entryRef.current = entryForVerifiedDiastasisPayer(initialEntry, verifiedEmail);
      setPayerEmail(verifiedEmail); paymentChecked = true;
      if (!entryRef.current) { setStatus("error"); return; }
      await initialize(authInstance.currentUser);
    };
    boot().catch(() => { if (mounted) setStatus("error"); });
    return () => {
      mounted = false; generation += 1; scopeRef.current = null;
      clearTimeout(deadline); unsubscribe?.(); actionsRef.current = {};
    };
    // Navigation is one-shot; it must not retrigger the authentication effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retry]);

  const working = ["authenticating", "checking"].includes(status);
  const needsSignIn = ["signin", "waiting", "mismatch"].includes(status);
  return <div className="fixed inset-0 overflow-y-auto bg-[#FAF7F4] px-5 py-[max(2rem,env(safe-area-inset-top))] text-[#3A2F44]">
    <section aria-labelledby="dr-setup-title" className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center pb-[max(2rem,env(safe-area-inset-bottom))]">
      <a href="/diastasis-recti" className="font-serif text-2xl tracking-tight">pelvi<span className="text-[#B64B69]">.</span></a>
      <div className="mt-9 rounded-[28px] border border-[#3A2F44]/10 bg-white p-6 shadow-[0_20px_70px_-40px_#3A2F4455] sm:p-8">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#B64B69]/10 text-[#963B57]">{working ? <LoaderCircle className="h-6 w-6 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : status === "ready" ? <Check className="h-6 w-6" aria-hidden="true" /> : <ShieldCheck className="h-6 w-6" aria-hidden="true" />}</div>
        <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.19em] text-[#963B57]">Your private Pelvi plan</p>
        <h1 id="dr-setup-title" className="mt-3 font-serif text-[34px] leading-[1.06]">{status === "authenticating" ? "Checking your payment" : status === "checking" ? "Preparing your plan" : needsSignIn ? "One step to your account" : status === "ready" ? "Your plan is ready" : "Let’s finish setting up"}</h1>
        <p role="status" className="mt-4 text-sm leading-relaxed text-[#3A2F44]/75">{working ? "We are verifying your account and keeping any existing plan unchanged." : needsSignIn ? "Continue with the email you used at checkout. Your plan is applied only after your account and access are verified." : status === "payment_pending" ? "The billing system has not confirmed active access yet. This can take a moment. Retry, or open your payment confirmation." : message || "We could not finish this check. Your payment confirmation remains available. Retry or continue below."}</p>
        {payerEmail && <p className="mt-3 break-all rounded-xl bg-[#FAF7F4] px-3 py-2 text-sm font-semibold">{payerEmail}</p>}
        {needsSignIn && message && <p role="alert" className="mt-3 text-xs leading-relaxed text-[#963B57]">{message}</p>}
        {/* Mounted while hidden so the existing component redeems OAuth redirects
            and captures the provider name; its callback stays on this route. */}
        <div className={working ? "hidden" : "mt-6"}>
          <ProviderButtons onSignedIn={() => actionsRef.current.signedIn?.()} onError={(text) => { if (text) { setMessage(text); setStatus("signin"); } }} />
        </div>
        {!working && <button type="button" onClick={() => setRetry((value) => value + 1)} className="mt-4 min-h-12 w-full rounded-full bg-[#963B57] px-5 text-sm font-semibold text-white">Retry setup</button>}
        <button type="button" onClick={() => { scopeRef.current = null; if (entryRef.current) clearDiastasisEntry(entryRef.current.id); forwardToReceipt(); }} className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 text-sm font-semibold underline underline-offset-4">Open payment confirmation <ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
      </div>
      <p className="mt-5 text-center text-xs leading-relaxed text-[#3A2F44]/60">Need a hand? <a className="underline" href="mailto:contact@pelvi.health">contact@pelvi.health</a></p>
    </section>
  </div>;
}
