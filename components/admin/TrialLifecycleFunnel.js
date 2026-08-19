"use client";

import { Card, EmptyState, Pill, SectionHeader } from "./ui";

function finite(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatCount(value) {
  const number = finite(value);
  return number === null ? "N/A" : Math.round(number).toLocaleString("en-US");
}

function formatMoney(value, currency) {
  const number = finite(value);
  if (number === null) return "N/A";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(number);
  } catch {
    return `${currency} ${number.toFixed(2)}`;
  }
}

function percent(value, total) {
  const numerator = finite(value);
  const denominator = finite(total);
  if (numerator === null || denominator === null || denominator <= 0) return "N/A";
  return `${((numerator / denominator) * 100).toLocaleString("en-US", { maximumFractionDigits: 1 })}%`;
}

function Outcome({ label, value, total, note, color, showPercent = true }) {
  const number = finite(value);
  const denominator = finite(total);
  const width = number !== null && denominator > 0
    ? Math.max(number > 0 ? 3 : 0, Math.min(100, (number / denominator) * 100))
    : 0;

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[13px] font-semibold" style={{ color: "var(--pv-ink)" }}>{label}</p>
          <p className="mt-0.5 text-[11px] leading-relaxed" style={{ color: "var(--pv-ink-3)" }}>{note}</p>
        </div>
        <div className="text-right">
          <p className="pv-tabular text-[18px] font-semibold" style={{ color: number === null ? "var(--pv-ink-3)" : "var(--pv-ink)" }}>
            {formatCount(number)}
          </p>
          {showPercent ? <p className="pv-tabular text-[10px]" style={{ color: "var(--pv-ink-3)" }}>{percent(number, denominator)}</p> : null}
        </div>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full" style={{ background: "var(--pv-track)" }} aria-hidden="true">
        <div className="h-full rounded-full" style={{ width: `${width}%`, background: color }} />
      </div>
    </div>
  );
}

function CostCard({ label, value, note, tone = "violet" }) {
  const color = tone === "good" ? "var(--pv-good)" : "var(--pv-violet)";
  return (
    <div className="relative overflow-hidden rounded-2xl p-5" style={{ background: "var(--pv-surface-2)", border: "1px solid var(--pv-border)" }}>
      <span className="absolute -right-6 -top-8 h-20 w-20 rounded-full opacity-20 blur-2xl" style={{ background: color }} aria-hidden="true" />
      <p className="relative text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--pv-ink-3)" }}>{label}</p>
      <p className="pv-figure relative mt-2 text-[30px] font-semibold" style={{ color: value === "N/A" ? "var(--pv-ink-3)" : "var(--pv-ink)" }}>{value}</p>
      <p className="relative mt-1 text-[11px] leading-relaxed" style={{ color: "var(--pv-ink-2)" }}>{note}</p>
    </div>
  );
}

/**
 * A trial lifecycle view. Starts and conversions are selected-period cohorts;
 * active/canceled are RevenueCat's current renewal snapshot. Cost metrics are
 * only calculated automatically when Apple spend and RevenueCat outcomes cover
 * the same window.
 */
export default function TrialLifecycleFunnel({
  mode = "lifecycle",
  trialStarts = null,
  activeTrials = null,
  canceledTrials = null,
  convertedTrials = null,
  cohortConversions = null,
  cohortTrialStarts = null,
  paidCustomers = null,
  directPaidCustomers = null,
  introductoryPaidCustomers = null,
  adSpend = null,
  costPerTrialStart = null,
  costPerPayer = null,
  coverageAligned = false,
  currency = "USD",
  periodLabel = "Selected period",
  coverageNote = "Trial outcomes come from RevenueCat. Costs require Apple spend and subscription events covering the same dates.",
  unavailableReason = "Trial lifecycle events have not been connected for this period.",
}) {
  const starts = finite(trialStarts);
  const active = finite(activeTrials);
  const canceled = finite(canceledTrials);
  const converted = finite(convertedTrials);
  const cohortConverted = finite(cohortConversions);
  const cohortStarts = finite(cohortTrialStarts);
  const payers = finite(paidCustomers) ?? converted;
  const directPaid = finite(directPaidCustomers);
  const introductoryPaid = finite(introductoryPaidCustomers);
  const paidWithoutTrial = directPaid !== null || introductoryPaid !== null
    ? (directPaid || 0) + (introductoryPaid || 0)
    : null;
  const currentTrialTotal = active !== null && canceled !== null ? active + canceled : null;
  const spend = finite(adSpend);
  const explicitTrialCost = finite(costPerTrialStart);
  const explicitPayerCost = finite(costPerPayer);
  const calculatedTrialCost = explicitTrialCost ?? (coverageAligned && spend !== null && starts > 0 ? spend / starts : null);
  const calculatedPayerCost = explicitPayerCost ?? (coverageAligned && spend !== null && payers > 0 ? spend / payers : null);

  return (
    <section aria-labelledby="trial-lifecycle-heading">
      <SectionHeader
        id="trial-lifecycle-heading"
        eyebrow={mode === "acquisition" ? "Attributed outcomes" : "Trial lifecycle"}
        title={mode === "acquisition" ? "From trial to first payment" : "Every trial, from start to outcome"}
        description={mode === "acquisition"
          ? "RevenueCat attributes these outcomes to Apple Ads. First paid includes people who converted after a trial and people who paid immediately without a free trial."
          : "Trial starts and first payments are separate event-period counts. Still in trial and canceled show today’s renewal status; the conversion rate uses RevenueCat’s matched trial cohort."}
        action={<Pill tone={coverageAligned ? "good" : "warn"}>{coverageAligned ? "Windows match" : "Partial coverage"}</Pill>}
      />

      {starts === null ? (
        <Card className="p-5">
          <EmptyState title="Trial history is unavailable" description={unavailableReason} icon="○" />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_.85fr]">
          <Card className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--pv-ink-3)" }}>
                  All trial starts
                </p>
                <p className="pv-figure mt-2 text-[44px] font-semibold leading-none" style={{ color: "var(--pv-ink)" }}>{formatCount(starts)}</p>
                <p className="mt-2 text-[12px]" style={{ color: "var(--pv-ink-2)" }}>{periodLabel}</p>
              </div>
              <div className="rounded-2xl px-4 py-3 text-right" style={{ background: "var(--pv-surface-2)", border: "1px solid var(--pv-border)" }}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--pv-ink-3)" }}>Cohort trial → paid</p>
                <p className="pv-tabular mt-1 text-[22px] font-semibold" style={{ color: "var(--pv-good)" }}>{percent(cohortConverted, cohortStarts)}</p>
                <p className="mt-1 text-[9px]" style={{ color: "var(--pv-ink-3)" }}>{cohortStarts === null ? "RevenueCat cohort unavailable" : `${formatCount(cohortConverted)} of ${formatCount(cohortStarts)} converted in matched cohort`}</p>
              </div>
            </div>

            {mode === "acquisition" ? (
              <div className="mt-8 space-y-6">
                <Outcome label="Converted after a trial" value={converted} total={null} showPercent={false} note="First successful payments from subscriptions that began with a trial" color="var(--pv-good)" />
                <Outcome label="Paid without a free trial" value={paidWithoutTrial} total={null} showPercent={false} note="Direct paid subscriptions and paid introductory offers" color="var(--pv-violet)" />
                <Outcome label="All first paid" value={payers} total={null} showPercent={false} note="Every first successful subscription payment attributed to Apple Ads" color="linear-gradient(90deg,var(--pv-rose),var(--pv-good))" />
                {currentTrialTotal !== null ? (
                  <div className="grid grid-cols-2 gap-3 rounded-2xl p-4" style={{ background: "var(--pv-surface-2)", border: "1px solid var(--pv-border)" }}>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.11em]" style={{ color: "var(--pv-ink-3)" }}>Still set to renew</p>
                      <p className="pv-tabular mt-1 text-[22px] font-semibold" style={{ color: "var(--pv-good)" }}>{formatCount(active)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.11em]" style={{ color: "var(--pv-ink-3)" }}>Canceled</p>
                      <p className="pv-tabular mt-1 text-[22px] font-semibold" style={{ color: "var(--pv-warn)" }}>{formatCount(canceled)}</p>
                    </div>
                    <p className="col-span-2 text-[10px] leading-relaxed" style={{ color: "var(--pv-ink-3)" }}>Current App Store trial status across all campaigns. Canceled trials keep access until they expire.</p>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="mt-8 space-y-6">
                <Outcome label="Still set to renew" value={active} total={currentTrialTotal} note="Current trials with renewal still turned on" color="var(--pv-violet)" />
                <Outcome label="Canceled" value={canceled} total={currentTrialTotal} note="Current trials with renewal turned off before expiry" color="var(--pv-warn)" />
                <Outcome label="Reached first payment" value={converted} total={null} showPercent={false} note="Trial subscriptions whose first paid renewal happened during these dates" color="var(--pv-good)" />
              </div>
            )}
          </Card>

          <Card className="p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--pv-ink-3)" }}>Acquisition efficiency</p>
            <h3 className="mt-1 text-[18px] font-semibold" style={{ color: "var(--pv-ink)" }}>What each result costs</h3>
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <CostCard
                label="Cost per trial start"
                value={formatMoney(calculatedTrialCost, currency)}
                note={calculatedTrialCost === null ? "Unavailable until Apple spend and trial starts share one window" : `${formatMoney(spend, currency)} spend ÷ ${formatCount(starts)} ${mode === "acquisition" ? "Apple Ads attributed" : "App Store"} trial starts`}
              />
              <CostCard
                label="Cost per first-paid subscription"
                value={formatMoney(calculatedPayerCost, currency)}
                note={calculatedPayerCost === null ? "Unavailable until first-paid outcomes and ad spend share one window" : `${formatMoney(spend, currency)} spend ÷ ${formatCount(payers)} first-paid subscriptions`}
                tone="good"
              />
            </div>
            <p className="mt-5 text-[11px] leading-relaxed" style={{ color: "var(--pv-ink-3)" }}>{coverageNote}</p>
          </Card>
        </div>
      )}
    </section>
  );
}

export { CostCard, Outcome };
