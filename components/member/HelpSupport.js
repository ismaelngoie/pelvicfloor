"use client";

// Help & Support, ported from "Pelvic Floor/Scene/Main/Hub/Help/Help.swift".
//
// Three options, the phone's three, in the phone's order: talk to a person,
// sort out the subscription, get access back. The refund flow keeps its two
// steps — the six reasons and the free-text box, then the instructions — and it
// writes the same document to the same collection: refund_feedback, which
// firestore.rules allows any signed-in member to create and only the owner to
// read. `platform` is "web" instead of "iOS", which is the only field that
// differs and the only one that should.
//
// WHERE THE REFUND ITSELF HAPPENS IS NOT THE SAME, and that is not a port
// decision, it is a fact about who took the money. A subscription bought here
// was charged by Stripe and we can refund it ourselves; one bought in the app
// was charged by Apple, and only Apple can give it back. The instructions
// branch on `entitlement.source` for exactly that reason, and the App Store
// branch is the phone's own wording.

import { useCallback, useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { LifeBuoy, Mail, RotateCcw, Undo2 } from "lucide-react";
import { Sheet } from "./ui";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { FIXTURES_ON } from "@/lib/devFixtures";
import { openBillingPortal, restorePurchase } from "@/lib/memberBilling";
import { CLAIM_EMAIL } from "@/lib/guaranteeCopy";

const REFUND_REASONS = [
  "It's too expensive",
  "Something is broken",
  "I'm not using it enough",
  "Exercises are too hard",
  "I didn't see results",
  "Other reason",
];

export default function HelpSupport({
  open, onClose, member, email, entitlement, refreshMember, refreshEntitlement,
}) {
  const [view, setView] = useState("menu"); // menu | refund | instructions
  const [message, setMessage] = useState(null);
  const [restoreState, setRestoreState] = useState("idle");

  const close = () => {
    setView("menu");
    setMessage(null);
    onClose();
  };

  const restore = useCallback(async () => {
    if (!email) {
      setMessage("We need an email on your account before we can look you up.");
      return;
    }
    setRestoreState("working");
    setMessage(null);
    try {
      const { isPremium, linked } = await restorePurchase(email);
      if (isPremium) {
        const answer = await refreshEntitlement?.();
        await refreshMember?.();
        setMessage(
          answer?.active || linked
            ? "Found it. Your plan is active."
            : `We found your plan. If it is still not open in a minute, email ${CLAIM_EMAIL}.`
        );
      } else {
        setMessage(
          entitlement?.active
            ? "Nothing extra to restore. Your plan is already active."
            : "No active subscription was found for that email."
        );
      }
    } catch {
      setMessage("We could not reach our billing system. Please try again in a minute.");
    } finally {
      setRestoreState("idle");
    }
  }, [email, entitlement?.active, refreshEntitlement, refreshMember]);

  return (
    <Sheet open={open} onClose={close} title="How can we help?">
      <div className="pb-6">
        {view === "menu" && (
          <>
            <p className="text-[14px] leading-snug text-app-textSecondary">
              We are here to help. Tell us what you need.
            </p>
            <div className="mt-4 space-y-3">
              <OptionCard
                icon={Mail}
                color="#5856D6"
                title="Contact Support"
                subtitle="Talk to a real person"
                href={`mailto:${CLAIM_EMAIL}?subject=Support%20Request`}
              />
              <OptionCard
                icon={Undo2}
                color="#FF2D55"
                title="Cancel or Refund"
                subtitle="Sort out your subscription"
                onClick={() => setView("refund")}
              />
              <OptionCard
                icon={RotateCcw}
                color="#33B373"
                title="Restore Purchase"
                subtitle={restoreState === "working" ? "Checking…" : "Already paid? Get your access back"}
                onClick={restore}
                disabled={restoreState === "working"}
              />
            </div>
            {message && (
              <p role="status" className="mt-4 text-[13.5px] leading-snug text-app-textPrimary">
                {message}
              </p>
            )}
          </>
        )}

        {view === "refund" && (
          <RefundFeedback
            member={member}
            onDone={() => setView("instructions")}
            onCancel={() => setView("menu")}
          />
        )}

        {view === "instructions" && (
          <RefundInstructions source={entitlement?.source} onDone={close} />
        )}
      </div>
    </Sheet>
  );
}

function OptionCard({ icon: Icon, color, title, subtitle, onClick, href, disabled }) {
  const inner = (
    <>
      <span
        className="grid h-12 w-12 shrink-0 place-items-center rounded-full"
        style={{ backgroundColor: `${color}26` }}
      >
        <Icon className="h-5 w-5" style={{ color }} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-bold text-app-textPrimary">{title}</span>
        <span className="block text-[12.5px] text-app-textSecondary">{subtitle}</span>
      </span>
    </>
  );
  const className =
    "flex w-full items-center gap-4 rounded-[18px] border border-black/[0.06] bg-white p-4 text-left disabled:opacity-60";

  return href ? (
    <a href={href} className={className}>{inner}</a>
  ) : (
    <button type="button" onClick={onClick} disabled={disabled} className={className}>
      {inner}
    </button>
  );
}

/**
 * "We're sorry to see you go." Six reasons and a box. It is asked before the
 * instructions and never instead of them: whatever happens to this write, she
 * gets the next screen.
 */
function RefundFeedback({ member, onDone, onCancel }) {
  const [reason, setReason] = useState(null);
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async () => {
    setSending(true);
    // The fixtures branch is not politeness: refund_feedback is a real
    // collection the owner reads, and a QA session clicking through this form
    // while signed in as the admin would file invented complaints in it. The
    // NODE_ENV literal is written here so the whole test folds away in a
    // production bundle — see lib/devFixtures.js.
    const canWrite =
      isFirebaseConfigured() && !(process.env.NODE_ENV !== "production" && FIXTURES_ON);
    try {
      if (canWrite) {
        await addDoc(collection(db(), "refund_feedback"), {
          reason: reason || "Unknown",
          details,
          user_id: member?.id || "Anonymous",
          user_name: member?.name || "",
          timestamp: serverTimestamp(),
          app_version: "web",
          platform: "web",
        });
      }
    } catch {
      // She is not blocked from the refund information by a failed write.
    } finally {
      setSending(false);
      onDone();
    }
  };

  return (
    <div>
      <h3 className="text-[21px] font-bold text-app-textPrimary">We're sorry to see you go.</h3>
      <p className="mt-2 text-[14px] text-app-textSecondary">
        Pick the main reason so we can do better. It takes a second.
      </p>

      <ul className="mt-4 grid grid-cols-2 gap-2.5">
        {REFUND_REASONS.map((option) => {
          const on = reason === option;
          return (
            <li key={option}>
              <button
                type="button"
                onClick={() => setReason(option)}
                aria-pressed={on}
                className={`flex min-h-[60px] w-full items-center justify-center rounded-xl border-2 px-3 py-2 text-center text-[12.5px] font-bold leading-snug ${
                  on
                    ? "border-ios-pink bg-ios-pink/10 text-ios-pink"
                    : "border-app-borderIdle bg-white text-app-textPrimary"
                }`}
              >
                {option}
              </button>
            </li>
          );
        })}
      </ul>

      <label className="mt-4 block">
        <span className="text-[12.5px] font-bold text-app-textSecondary">
          Anything else you'd like to share?
        </span>
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          rows={4}
          className="mt-1.5 w-full resize-none rounded-2xl border border-app-borderIdle bg-white p-3 text-[15px] text-app-textPrimary focus:border-ios-pink focus:outline-none"
        />
      </label>

      <button
        type="button"
        onClick={submit}
        disabled={!reason || sending}
        className="mt-4 h-[52px] w-full rounded-full bg-ios-pink text-[16px] font-bold text-white disabled:bg-app-borderIdle disabled:text-app-textSecondary"
      >
        {sending ? "Sending…" : "Send & Continue"}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="mt-2 h-11 w-full text-[14px] font-semibold text-app-textSecondary"
      >
        Cancel
      </button>
    </div>
  );
}

function RefundInstructions({ source, onDone }) {
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState(null);
  const boughtInTheApp = source === "ios";

  const openPortal = async () => {
    setOpening(true);
    setError(null);
    try {
      const { url, error: portalError } = await openBillingPortal(
        `${window.location.origin}/app/you`
      );
      if (url) {
        window.location.href = url;
        return;
      }
      setError(portalError || `We could not find a billing account for that email. Email ${CLAIM_EMAIL} and we will sort it out.`);
    } catch {
      setError("We could not reach our billing system. Please try again in a minute.");
    } finally {
      setOpening(false);
    }
  };

  return (
    <div>
      <span className="grid h-12 w-12 place-items-center rounded-full bg-app-primary/10">
        <LifeBuoy className="h-6 w-6 text-app-primary" aria-hidden="true" />
      </span>
      <h3 className="mt-3 text-[21px] font-bold text-app-textPrimary">
        {boughtInTheApp ? "How to get your refund" : "Cancelling, and getting your money back"}
      </h3>

      <ol className="mt-4 space-y-3">
        {(boughtInTheApp
          ? [
              "Your plan was bought in the App Store, so Apple took the payment.",
              "That means only Apple can give the money back, not us.",
              "Open Apple's “Report a Problem” page below.",
              "Sign in with your Apple ID and choose “Request a Refund”.",
            ]
          : [
              "Your plan was bought here, so we can cancel it and refund it ourselves.",
              "“Manage or cancel” opens your billing page. Cancelling there stops the next payment straight away and you keep your plan until the day it would have renewed.",
              `For a refund, email ${CLAIM_EMAIL} from the address on your account and say what happened.`,
              "The 90-Day Goal Guarantee is separate from this and does not expire because you cancelled.",
            ]
        ).map((line, index) => (
          <li key={line} className="flex items-start gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-app-textSecondary/20 text-[12px] font-bold text-app-textPrimary">
              {index + 1}
            </span>
            <span className="min-w-0 text-[14.5px] leading-snug text-app-textPrimary">{line}</span>
          </li>
        ))}
      </ol>

      {boughtInTheApp ? (
        <a
          href="https://reportaproblem.apple.com"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 flex h-[52px] w-full items-center justify-center rounded-full bg-ios-pink text-[16px] font-bold text-white"
        >
          Go to Apple Support
        </a>
      ) : (
        <button
          type="button"
          onClick={openPortal}
          disabled={opening}
          className="mt-5 h-[52px] w-full rounded-full bg-ios-pink text-[16px] font-bold text-white disabled:opacity-60"
        >
          {opening ? "Opening…" : "Manage or cancel"}
        </button>
      )}

      <a
        href={`mailto:${CLAIM_EMAIL}?subject=Refund%20request`}
        className="mt-2.5 flex h-[52px] w-full items-center justify-center rounded-full border border-app-borderIdle bg-white text-[15px] font-semibold text-app-textPrimary"
      >
        Email {CLAIM_EMAIL}
      </a>

      {error && (
        <p role="status" className="mt-3 text-[13.5px] leading-snug text-app-textPrimary">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={onDone}
        className="mt-2 h-11 w-full text-[14px] font-semibold text-app-textSecondary"
      >
        Done
      </button>
    </div>
  );
}
