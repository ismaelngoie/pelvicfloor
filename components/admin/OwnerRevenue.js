"use client";

import { Card, EmptyState, Pill, SectionHeader } from "./ui";

function finite(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function money(value, currency) {
  const number = finite(value);
  if (number === null) return "—";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(number);
  } catch {
    return `${currency} ${number.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  }
}

function count(value) {
  const number = finite(value);
  return number === null ? "—" : Math.round(number).toLocaleString("en-US");
}

function trendCopy(value, comparisonLabel) {
  const number = finite(value);
  if (number === null) return null;
  if (number === 0) return `No change ${comparisonLabel}`;
  return `${number > 0 ? "Up" : "Down"} ${Math.abs(number).toLocaleString("en-US", {
    maximumFractionDigits: 1,
  })}% ${comparisonLabel}`;
}

function RevenueTile({ label, value, note, tone = "neutral", unavailableReason }) {
  const tones = {
    neutral: "var(--pv-violet)",
    good: "var(--pv-good)",
    warn: "var(--pv-warn)",
    rose: "var(--pv-rose)",
  };
  const available = value !== null && value !== undefined;

  return (
    <Card className="pv-rise relative min-h-[156px] overflow-hidden p-5">
      <span
        className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full opacity-20 blur-2xl"
        style={{ background: tones[tone] || tones.neutral }}
        aria-hidden="true"
      />
      <p className="relative text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--pv-ink-3)" }}>
        {label}
      </p>
      <p className="pv-figure relative mt-3 text-[30px] font-semibold leading-none" style={{ color: available ? "var(--pv-ink)" : "var(--pv-ink-3)" }}>
        {available ? value : "—"}
      </p>
      <p className="relative mt-3 text-[12px] leading-relaxed" style={{ color: "var(--pv-ink-2)" }}>
        {available ? note : unavailableReason || "This value is not available from the connected source yet."}
      </p>
    </Card>
  );
}

/**
 * Owner-level revenue summary.
 *
 * `grossRevenue` must be customer revenue before Apple commission and taxes.
 * Pass null when RevenueCat/App Store has not supplied a trustworthy value.
 */
export default function OwnerRevenue({
  grossRevenue,
  currency = "USD",
  periodLabel = "All time",
  trendPercent = null,
  comparisonLabel = "from the previous period",
  activePaid = null,
  activeTrials = null,
  annualRunRate = null,
  nextRenewalValue = null,
  fetchedAt = null,
  sourceLabel = "RevenueCat",
  unavailableReason = "Gross revenue has not been returned by the connected subscription source.",
  kpis = null,
}) {
  const gross = finite(grossRevenue);
  const trend = trendCopy(trendPercent, comparisonLabel);
  const defaultKpis = [
    {
      label: "Paid and renewing",
      value: finite(activePaid) === null ? null : count(activePaid),
      note: "Active paid App Store subscriptions set to renew",
      tone: "good",
    },
    {
      label: "Trials in progress",
      value: finite(activeTrials) === null ? null : count(activeTrials),
      note: "People still inside their free-trial period",
      tone: "neutral",
    },
    {
      label: "Annual run rate",
      value: finite(annualRunRate) === null ? null : money(annualRunRate, currency),
      note: "Current recurring pace; a projection, not collected cash",
      tone: "rose",
    },
    {
      label: "Upcoming renewals",
      value: finite(nextRenewalValue) === null ? null : money(nextRenewalValue, currency),
      note: "Gross value scheduled in the selected forecast window",
      tone: "warn",
    },
  ];
  const tiles = Array.isArray(kpis) ? kpis : defaultKpis;

  return (
    <section aria-labelledby="owner-revenue-heading">
      <SectionHeader
        id="owner-revenue-heading"
        eyebrow="Revenue command center"
        title="What the business has earned"
        description="Customer revenue is shown gross. Apple commission and taxes are not removed from the headline."
        action={<Pill tone="accent">{sourceLabel}</Pill>}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.25fr_.75fr]">
        <Card className="pv-rise relative min-h-[250px] overflow-hidden p-6 sm:p-7">
          <span
            className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full opacity-25 blur-3xl"
            style={{ background: "var(--pv-violet)" }}
            aria-hidden="true"
          />
          <span
            className="pointer-events-none absolute -bottom-24 left-1/4 h-56 w-56 rounded-full opacity-20 blur-3xl"
            style={{ background: "var(--pv-rose)" }}
            aria-hidden="true"
          />
          <div className="relative flex h-full flex-col justify-between gap-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--pv-ink-3)" }}>
                  Gross customer revenue
                </p>
                <p className="mt-1 text-[12px]" style={{ color: "var(--pv-ink-2)" }}>{periodLabel}</p>
              </div>
              {trend ? <Pill tone={finite(trendPercent) >= 0 ? "good" : "crit"}>{trend}</Pill> : null}
            </div>

            {gross === null ? (
              <EmptyState title="Revenue is not available yet" description={unavailableReason} icon="$" />
            ) : (
              <div>
                <p className="pv-figure text-[46px] font-semibold leading-none tracking-[-0.04em] sm:text-[62px]" style={{ color: "var(--pv-ink)" }}>
                  {money(gross, currency)}
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px]" style={{ color: "var(--pv-ink-2)" }}>
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: "var(--pv-good)" }} aria-hidden="true" />
                    Gross, before Apple commission
                  </span>
                  <span style={{ color: "var(--pv-ink-3)" }}>
                    {fetchedAt ? `Updated ${fetchedAt}` : "Live source timestamp unavailable"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1">
          {tiles.slice(0, 2).map((item, index) => (
            <RevenueTile key={item.id || item.label || index} {...item} />
          ))}
        </div>
      </div>

      {tiles.length > 2 ? (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {tiles.slice(2).map((item, index) => (
            <RevenueTile key={item.id || item.label || index} {...item} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

export { RevenueTile };
