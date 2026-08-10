"use client";

// You. Profile, goal, the guarantee in writing, and the two billing controls
// that the old dashboard promised and never delivered.

import { useCallback, useEffect, useState } from "react";
import {
  CalendarDays, ChevronRight, CreditCard, FileText, LogOut, Mail, RefreshCw,
  Ruler, Scale, ShieldCheck, Smartphone, User as UserIcon,
} from "lucide-react";
import { useMember } from "./MemberProvider";
import { Card, PrimaryButton, Sheet } from "./ui";
import { openBillingPortal, restorePurchase } from "@/lib/memberBilling";
import { GOALS, goalById } from "@/lib/program";
import { goalAccentCSS, pathwaySubtitle, pathwayTitle } from "@/lib/goalCopy";
import {
  CLAIM_EMAIL, COVERAGE_TITLE, LADDER_LINE, coverageBody, day90String,
} from "@/lib/guaranteeCopy";

const APP_STORE_URL = "https://apps.apple.com/us/app/pelvic-floor-core-coach/id6642654729";

export default function You() {
  const {
    member, user, goalId, entitlement, patchMember, refreshMember, refreshEntitlement, signOut,
    completions, history, streak, planLength, dayNumber,
  } = useMember();

  const [showGoals, setShowGoals] = useState(false);
  const [showName, setShowName] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const email = (member?.email || user?.email || "").trim();
  const goal = goalById(goalId);
  const name = (member?.name || "").trim();
  const minutes = Math.round(history.totalSeconds / 60);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-10 pt-4 lg:max-w-5xl lg:px-8 lg:pt-6">
      <header className="px-1">
        <h1 className="text-[30px] font-bold leading-tight tracking-[-0.4px] text-app-textPrimary">
          You
        </h1>
        <p className="mt-1 text-[15px] text-app-textSecondary">
          {name ? `${name}, ` : ""}
          {entitlement.source === "ios"
            ? "your plan came across from the app."
            : "everything about your plan lives here."}
        </p>
      </header>

      {/* Two columns from 1024, in the same reading order as the phone: who she
          is on the left, what she can do about her subscription on the right.
          `items-start` so a short column does not stretch its last card. */}
      <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
        <div>
      {/* Progress summary */}
      <Card className="mt-5">
        <h2 className="text-[17px] font-bold text-app-textPrimary">My progress</h2>
        <dl className="mt-3 grid grid-cols-3 gap-3 text-center">
          <Metric label="Sessions" value={completions.length} />
          <Metric label="Minutes" value={minutes} />
          <Metric label="Best streak" value={streak.best} />
        </dl>
      </Card>

      {/* Goal */}
      <div
        className="mt-5 rounded-[20px] p-4 text-white shadow-[0_5px_14px_rgba(0,0,0,0.14)] ring-1 ring-inset ring-white/30"
        style={{ backgroundImage: goalAccentCSS(goalId) }}
      >
        <p className="text-[11px] font-bold uppercase tracking-wider text-white/80">Your goal</p>
        <p className="mt-1 text-[20px] font-bold leading-tight">{goal?.title}</p>
        <p className="mt-1 text-[13px] text-white/90">{pathwaySubtitle(goalId)}</p>
        <p className="mt-2 text-[12.5px] font-semibold text-white/90">
          {pathwayTitle(goalId)}
          {planLength ? ` · Day ${Math.min(dayNumber, planLength)} of ${planLength}` : ""}
        </p>
        <button
          type="button"
          onClick={() => setShowGoals(true)}
          className="mt-3 h-10 rounded-full bg-white/20 px-4 text-[13.5px] font-semibold ring-1 ring-inset ring-white/30"
        >
          Change my goal
        </button>
      </div>

      {/* Account */}
      <Card className="mt-5 p-0">
        <h2 className="px-4 pt-4 text-[13px] font-bold uppercase tracking-wider text-app-textSecondary">
          Account
        </h2>
        <ul className="mt-1 divide-y divide-black/[0.06]">
          <Row
            icon={UserIcon}
            tint="bg-app-textSecondary/15 text-app-textSecondary"
            label="Name"
            value={name || "Add your name"}
            onClick={() => setShowName(true)}
          />
          <Row
            icon={Mail}
            tint="bg-indigo-500/12 text-indigo-500"
            label="Your email"
            value={email || "No email on this account"}
            hint="This is how we match you to your plan on every device."
          />
          {member?.age ? (
            <Row icon={CalendarDays} tint="bg-app-textSecondary/15 text-app-textSecondary" label="Age" value={`${member.age} years old`} />
          ) : null}
          {member?.heightInches ? (
            <Row icon={Ruler} tint="bg-app-textSecondary/15 text-app-textSecondary" label="Height" value={formatHeight(member.heightInches)} />
          ) : null}
          {member?.weightLbs ? (
            <Row icon={Scale} tint="bg-app-textSecondary/15 text-app-textSecondary" label="Weight" value={`${member.weightLbs} lbs`} />
          ) : null}
        </ul>
      </Card>
        </div>

        <div>
      {/* Guarantee */}
      <Card className="mt-5">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-app-primary/10">
            <ShieldCheck className="h-5 w-5 text-app-primary" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-[16px] font-bold leading-tight text-app-textPrimary">
              90-Day Goal Guarantee
            </h2>
            <p className="mt-1 text-[13px] leading-snug text-app-textSecondary">
              {LADDER_LINE}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowTerms(true)}
          className="mt-3 flex h-11 w-full items-center justify-between rounded-full border border-app-borderIdle bg-white px-4 text-[14px] font-semibold text-app-textPrimary"
        >
          {COVERAGE_TITLE}
          <ChevronRight className="h-4 w-4 text-app-textSecondary" aria-hidden="true" />
        </button>
      </Card>

      <BillingCard
        email={email}
        entitlement={entitlement}
        refreshMember={refreshMember}
        refreshEntitlement={refreshEntitlement}
      />

      {/* Support */}
      <Card className="mt-5 p-0">
        <h2 className="px-4 pt-4 text-[13px] font-bold uppercase tracking-wider text-app-textSecondary">
          Support
        </h2>
        <ul className="mt-1 divide-y divide-black/[0.06]">
          <Row
            icon={Smartphone}
            tint="bg-black/8 text-app-textPrimary"
            label="Get the app"
            value="Your plan, offline, on your phone"
            href={APP_STORE_URL}
          />
          <Row
            icon={Mail}
            tint="bg-app-primary/12 text-app-primary"
            label="Help and refunds"
            value={CLAIM_EMAIL}
            href={`mailto:${CLAIM_EMAIL}`}
          />
          {/* Both of these used to be one row pointing at a static file that
              described a different product and told her, in writing, that we
              do not collect health data. She is looking at her own leak and
              pain check-ins on the next tab. */}
          <Row
            icon={ShieldCheck}
            tint="bg-blue-500/12 text-blue-500"
            label="Privacy policy"
            value="What we collect, and how to delete it"
            href="/privacy-policy"
          />
          <Row
            icon={FileText}
            tint="bg-app-textSecondary/15 text-app-textSecondary"
            label="Terms"
            value="Your subscription and your guarantees"
            href="/terms"
          />
        </ul>
      </Card>

      <button
        type="button"
        onClick={signOut}
        className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-full border border-app-borderIdle bg-white text-[15px] font-semibold text-app-textPrimary"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        Sign out
      </button>
        </div>
      </div>

      <GoalSheet
        open={showGoals}
        onClose={() => setShowGoals(false)}
        currentGoalId={goalId}
        onChoose={async (nextGoal) => {
          await patchMember({ goal: nextGoal.id, goalTitle: nextGoal.title });
          setShowGoals(false);
        }}
      />

      <NameSheet
        open={showName}
        onClose={() => setShowName(false)}
        initial={name}
        onSave={async (nextName) => {
          await patchMember({ name: nextName });
          setShowName(false);
        }}
      />

      <Sheet open={showTerms} onClose={() => setShowTerms(false)} title={COVERAGE_TITLE}>
        <div className="pb-6">
          <ul className="space-y-3">
            {coverageBody(goalId).split("\n").map((line) => (
              <li key={line} className="text-[15px] leading-snug text-app-textPrimary">
                {line.replace(/^•\s*/, "")}
              </li>
            ))}
          </ul>
          <p className="mt-5 text-[13.5px] leading-snug text-app-textSecondary">
            Your day 90 is {day90String(startDateOf(member))}. Email {CLAIM_EMAIL} and we will
            take it from there.
          </p>
        </div>
      </Sheet>
    </div>
  );
}

// --- Billing ---------------------------------------------------------------

function BillingCard({ email, entitlement, refreshMember, refreshEntitlement }) {
  const [portalState, setPortalState] = useState("idle");
  const [restoreState, setRestoreState] = useState("idle");
  const [message, setMessage] = useState(null);

  const openPortal = useCallback(async () => {
    if (!email) { setMessage("We need an email on your account before we can open billing."); return; }
    setPortalState("working");
    setMessage(null);
    try {
      const { url, error } = await openBillingPortal(`${window.location.origin}/app/you`);
      if (url) {
        window.location.href = url;
        return;
      }
      setMessage(
        error ||
          (entitlement.source === "ios"
            ? "Your plan was bought in the App Store, so Apple handles the billing. Open Settings on your iPhone, tap your name, then Subscriptions."
            : "We could not find a billing account for that email. Email hello@pelvi.health and we will sort it out.")
      );
    } catch {
      setMessage("We could not reach our billing system. Please try again in a minute.");
    } finally {
      setPortalState("idle");
    }
  }, [email, entitlement.source]);

  const restore = useCallback(async () => {
    if (!email) { setMessage("We need an email on your account before we can look you up."); return; }
    setRestoreState("working");
    setMessage(null);
    try {
      // The restore call links her subscription to her record. What decides the
      // gate is Stripe's live answer, so ask for it again afterwards, skipping
      // the endpoint's one minute memo — otherwise the screen would still be
      // reading a "no" that was cached before she pressed the button.
      const { isPremium, linked } = await restorePurchase(email);
      if (isPremium) {
        const answer = await refreshEntitlement();
        await refreshMember();
        setMessage(
          answer?.active || linked
            ? "Found it. Your plan is active."
            : "We found your plan. If it is still not open in a minute, email hello@pelvi.health."
        );
      } else {
        setMessage(
          entitlement.active
            ? "Nothing extra to restore. Your plan is already active."
            : "No active subscription was found for that email."
        );
      }
    } catch {
      setMessage("We could not reach our billing system. Please try again in a minute.");
    } finally {
      setRestoreState("idle");
    }
  }, [email, refreshMember, refreshEntitlement, entitlement.active]);

  return (
    <Card className="mt-5">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-app-positive/12">
          <CreditCard className="h-5 w-5 text-app-positive" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-[16px] font-bold leading-tight text-app-textPrimary">Subscription</h2>
          <p className="mt-1 text-[13px] leading-snug text-app-textSecondary">
            {entitlement.active ? "Active" : "Not active"}
            {entitlement.source === "ios" ? " · bought in the App Store" : ""}
            {entitlement.renewsAt
              ? ` · renews ${entitlement.renewsAt.toLocaleDateString("en-US", { month: "long", day: "numeric" })}`
              : ""}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2.5">
        <PrimaryButton className="h-12 text-[15px]" onClick={openPortal} disabled={portalState === "working"}>
          {portalState === "working" ? "Opening..." : "Manage or cancel"}
        </PrimaryButton>
        <button
          type="button"
          onClick={restore}
          disabled={restoreState === "working"}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-app-borderIdle bg-white text-[15px] font-semibold text-app-textPrimary disabled:opacity-60"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          {restoreState === "working" ? "Checking..." : "Restore purchase"}
        </button>
      </div>

      {message && (
        <p role="status" className="mt-3 text-[13.5px] leading-snug text-app-textPrimary">
          {message}
        </p>
      )}
    </Card>
  );
}

// --- Pieces ----------------------------------------------------------------

function Metric({ label, value }) {
  // Column reversed so the number reads first while the markup keeps the
  // term before its definition.
  return (
    <div className="flex flex-col-reverse">
      <dt className="mt-1 text-[11px] font-medium text-app-textSecondary">{label}</dt>
      <dd className="text-[22px] font-bold leading-none tabular-nums text-app-textPrimary">{value}</dd>
    </div>
  );
}

function Row({ icon: Icon, tint, label, value, hint, onClick, href }) {
  const inner = (
    <>
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${tint}`}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium text-app-textPrimary">{label}</span>
        <span className="block truncate text-[12.5px] text-app-textSecondary">{value}</span>
        {hint && <span className="mt-0.5 block text-[11.5px] text-app-textSecondary">{hint}</span>}
      </span>
      {(onClick || href) && (
        <ChevronRight className="h-4 w-4 shrink-0 text-app-textSecondary" aria-hidden="true" />
      )}
    </>
  );

  const className = "flex w-full items-center gap-3 px-4 py-3 text-left";

  return (
    <li>
      {href ? (
        <a
          href={href}
          className={className}
          {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          {inner}
        </a>
      ) : onClick ? (
        <button type="button" onClick={onClick} className={className}>{inner}</button>
      ) : (
        <div className={className}>{inner}</div>
      )}
    </li>
  );
}

function GoalSheet({ open, onClose, currentGoalId, onChoose }) {
  const [pending, setPending] = useState(null);
  useEffect(() => { if (!open) setPending(null); }, [open]);

  if (pending) {
    return (
      <Sheet open={open} onClose={onClose} title="Change your main goal?">
        <div className="pb-6">
          <p className="text-[15px] leading-snug text-app-textPrimary">
            Sticking with one goal for 3 to 4 weeks gives your body time to change.
          </p>
          <p className="mt-3 text-[15px] leading-snug text-app-textPrimary">
            Are you sure you want to switch to {pending.title}?
          </p>
          <p className="mt-3 text-[13px] leading-snug text-app-textSecondary">
            Your sessions and your streak stay exactly as they are. Your daily plan changes
            from tomorrow.
          </p>
          <div className="mt-6 space-y-2.5">
            <PrimaryButton onClick={() => onChoose(pending)}>Change Goal</PrimaryButton>
            <button
              type="button"
              onClick={() => setPending(null)}
              className="h-12 w-full rounded-full border border-app-borderIdle bg-white text-[15px] font-semibold text-app-textPrimary"
            >
              Keep My Goal
            </button>
          </div>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onClose={onClose} title="Your goal">
      <div className="pb-6">
        <p className="text-[13.5px] leading-snug text-app-textSecondary">
          Pick the one that matters most. Your plan is built around it.
        </p>
        <ul className="mt-4 grid grid-cols-2 gap-3">
          {GOALS.map((option) => {
            const selected = option.id === currentGoalId;
            return (
              <li key={option.id}>
                <button
                  type="button"
                  onClick={() => (selected ? onClose() : setPending(option))}
                  aria-pressed={selected}
                  className={`flex h-[104px] w-full flex-col items-center justify-center gap-2 rounded-[22px] border-2 bg-white px-2 text-center ${
                    selected ? "border-ios-pink" : "border-app-borderIdle"
                  }`}
                >
                  <span className="text-2xl" aria-hidden="true">{option.emoji}</span>
                  <span
                    className={`text-[13.5px] font-semibold leading-tight ${
                      selected ? "text-ios-pink" : "text-app-textPrimary"
                    }`}
                  >
                    {option.title}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </Sheet>
  );
}

function NameSheet({ open, onClose, initial, onSave }) {
  const [value, setValue] = useState(initial || "");
  useEffect(() => { if (open) setValue(initial || ""); }, [open, initial]);
  const valid = value.trim().length >= 2;

  return (
    <Sheet open={open} onClose={onClose} title="What should Mia call you?">
      <form
        className="pb-6"
        onSubmit={(e) => { e.preventDefault(); if (valid) onSave(value.trim()); }}
      >
        <label className="block">
          <span className="sr-only">Your first name</span>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoComplete="given-name"
            placeholder="Your first name"
            className="h-14 w-full rounded-2xl border border-app-borderIdle bg-white px-4 text-[17px] font-medium text-app-textPrimary placeholder:text-app-textSecondary focus:border-ios-pink focus:outline-none"
          />
        </label>
        <PrimaryButton className="mt-5" type="submit" disabled={!valid}>
          Save Changes
        </PrimaryButton>
      </form>
    </Sheet>
  );
}

// --- Helpers ---------------------------------------------------------------

function formatHeight(inches) {
  const total = Number(inches) || 0;
  const feet = Math.floor(total / 12);
  const rest = total % 12;
  return `${feet}'${rest}"`;
}

function startDateOf(member) {
  const raw = member?.programStartedAt || member?.joinDate;
  if (!raw) return new Date();
  if (typeof raw?.toDate === "function") return raw.toDate();
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}
