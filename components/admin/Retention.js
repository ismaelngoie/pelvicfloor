"use client";

// Retention — who stays, who drifts. Built only from records that exist:
// RevenueCat's trial lifecycle, the app's program progress, last-open dates,
// completions and check-ins. Nothing is modelled or estimated.

import { useMemo } from "react";
import { Bars, Card, CardHead, Heatmap, KpiTile, PageHead, RankedBars, Unavailable, count, percent, ratio } from "./ui";
import { startOfDay } from "@/lib/adminMetrics";
import { rangeLabel } from "@/lib/adminRange";
import { metric, metricInfo } from "./Pulse";

export default function Retention({ range, ownerMetrics, ownerPrevious, compare, members, allPeople, telemetry, now, onGo }) {
  const trialsStarted = metric(ownerMetrics, "trialsStarted");
  const trialsStartedPrev = metric(ownerPrevious, "trialsStarted");
  const converted = metric(ownerMetrics, "trialsConvertedToPaid");
  const convertedPrev = metric(ownerPrevious, "trialsConvertedToPaid");
  const cohortStarts = Number(ownerMetrics?.metrics?.cohortTrialConversions?.cohortStarts);
  const cohortConv = metric(ownerMetrics, "cohortTrialConversions");
  const pending = metric(ownerMetrics, "pendingTrialOutcomes");
  const expired = metric(ownerMetrics, "trialExpirations");
  const conversion = metric(ownerMetrics, "trialConversionRate");
  const conversionPrev = metric(ownerPrevious, "trialConversionRate");
  const trialsLive = metric(ownerMetrics, "activeTrials");
  const trialsCanceled = metric(ownerMetrics, "trialsCanceled");
  const cancels = metric(ownerMetrics, "activeCancellations");

  const stats = useMemo(() => {
    const ids = new Set();
    for (const m of members) { ids.add(m.id); for (const id of m.revenueCat?.identityIds || []) ids.add(id); }
    const active = (rows) => (rows || []).filter((r) => r.memberId && ids.has(r.memberId));
    const completions = active(telemetry?.completions);
    const checkins = active(telemetry?.checkins);
    const monthAgo = new Date(now.getTime() - 30 * 86400000);
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    const started = members.filter((m) => Number.isFinite(m.programDay) && m.programDay > 0).length;
    const day8 = members.filter((m) => Number.isFinite(m.programDay) && m.programDay >= 8).length;
    const day30 = members.filter((m) => Number.isFinite(m.programDay) && m.programDay >= 30).length;
    const day90 = members.filter((m) => Number.isFinite(m.programDay) && m.programDay >= 90).length;
    const monthCompletions = completions.filter((r) => r.completedAt && r.completedAt >= monthAgo);
    const completers = new Set(monthCompletions.map((r) => r.memberId));
    const monthCheckins = checkins.filter((r) => r.date && r.date >= monthAgo);
    const checkers = new Set(monthCheckins.map((r) => r.memberId));
    const today = startOfDay(now);
    const buckets = Array.from({ length: 14 }, (_, i) => { const d = new Date(today.getTime() - (13 - i) * 86400000); return { key: d.toISOString().slice(0, 10), label: i === 13 ? "Today" : d.toLocaleDateString("en-US", { weekday: "narrow" }), value: 0, emph: i === 13 }; });
    for (const m of members) { if (!m.lastSeenAt) continue; const k = startOfDay(m.lastSeenAt).toISOString().slice(0, 10); const b = buckets.find((x) => x.key === k); if (b) b.value += 1; }
    const seen7 = members.filter((m) => m.lastSeenAt && m.lastSeenAt >= weekAgo).length;
    const seenToday = members.filter((m) => m.lastSeenAt && m.lastSeenAt >= today).length;
    const silent14 = members.filter((m) => m.premiumPhase === "paid" && (!m.lastSeenAt || now - m.lastSeenAt > 14 * 86400000)).length;
    const streakBands = [["0", 0, 0], ["1–2", 1, 2], ["3–6", 3, 6], ["7–13", 7, 13], ["14+", 14, Infinity]].map(([label, lo, hi]) => ({ key: label, label, value: members.filter((m) => (m.streak || 0) >= lo && (m.streak || 0) <= hi).length }));
    // Cohorts by join week across every iPhone profile: did they become and stay premium, and how far did they get?
    const weeks = [];
    for (let w = 0; w < 8; w += 1) {
      const end = new Date(today.getTime() - w * 7 * 86400000 + 86400000);
      const start = new Date(end.getTime() - 7 * 86400000);
      const cohort = allPeople.filter((m) => m.joinedAt && m.joinedAt >= start && m.joinedAt < end);
      const n = cohort.length;
      const cell = (pred) => (n ? { value: cohort.filter(pred).length / n, display: `${Math.round((cohort.filter(pred).length / n) * 100)}%`, title: `${cohort.filter(pred).length} of ${n}` } : { value: null, display: "·" });
      weeks.push({ label: `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} · ${n}`, cells: [
        cell((m) => m.isActivePremium),
        cell((m) => Number.isFinite(m.programDay) && m.programDay >= 2),
        cell((m) => Number.isFinite(m.programDay) && m.programDay >= 8),
        cell((m) => m.lastSeenAt && m.lastSeenAt >= weekAgo),
      ] });
    }
    return { started, day8, day30, day90, monthCompletions: monthCompletions.length, completers: completers.size, monthCheckins: monthCheckins.length, checkers: checkers.size, buckets, seen7, seenToday, silent14, streakBands, weeks };
  }, [members, allPeople, telemetry, now]);

  const n = members.length;
  return (
    <div className="pv-rise" style={{ display: "grid", gap: 12 }}>
      <PageHead title="Retention" description={`Trial outcomes for ${rangeLabel(range)} · engagement and program progress for every active premium member right now`} />

      <div className="pv-kpis">
        <KpiTile label="Trials started" value={count(trialsStarted)} current={trialsStarted} previous={compare ? trialsStartedPrev : null} compareLabel="vs prev" stripe="var(--pv-violet)" info={metricInfo(ownerMetrics, "trialsStarted")} />
        <KpiTile label="Converted to paid" value={count(converted)} current={converted} previous={compare ? convertedPrev : null} compareLabel="vs prev" stripe="var(--pv-good)" info={metricInfo(ownerMetrics, "trialsConvertedToPaid")} />
        <KpiTile label="Trial → paid" value={percent(conversion)} current={conversion} previous={compare ? conversionPrev : null} compareLabel="vs prev" stripe="var(--pv-teal)" info={metricInfo(ownerMetrics, "trialConversionRate")} />
        <KpiTile label="Active trials" value={count(trialsLive)} sub={Number.isFinite(trialsCanceled) ? `${count(trialsCanceled)} switched renewal off` : "currently give access"} stripe="var(--pv-accent)" info={metricInfo(ownerMetrics, "activeTrials")} />
        <KpiTile label="Seen · 7 days" value={count(stats.seen7)} sub={`${ratio(stats.seen7, n) || "0%"} of ${count(n)} active · ${stats.seenToday} today`} stripe="var(--pv-good)" />
        <KpiTile label="Paid · silent 14d" value={count(stats.silent14)} sub="paying, not opened in 2 weeks" stripe={stats.silent14 > 0 ? "var(--pv-warn)" : "var(--pv-border-strong)"} onClick={() => onGo("members")} />
      </div>

      <div className="pv-bento">
        <Card className="pv-span-6 pv-half">
          <CardHead label="Trial lifecycle · RevenueCat cohort" info={{ body: "RevenueCat's matched conversion cohort for the selected range: trial starts, how many converted, expired without converting, or are still pending. Recent cohorts change as trials resolve.", source: ownerMetrics?.metrics?.cohortTrialConversions?.source }} />
          <div className="pv-card-pad">
            {Number.isFinite(cohortStarts) ? <RankedBars max={cohortStarts} rows={[
              { key: "s", label: "Trial starts", value: cohortStarts, color: "var(--pv-violet)" },
              { key: "c", label: "Converted", value: cohortConv || 0, sub: ratio(cohortConv, cohortStarts), color: "var(--pv-good)" },
              { key: "p", label: "Still pending", value: pending || 0, sub: ratio(pending, cohortStarts), color: "var(--pv-amber)" },
              { key: "e", label: "Expired", value: expired || 0, sub: ratio(expired, cohortStarts), color: "var(--pv-bad)" },
            ]} /> : <Unavailable reason="RevenueCat did not return the trial conversion cohort for this range." />}
            <div className="pv-faint" style={{ fontSize: 12, marginTop: 10 }}>Set to cancel right now: <b className="pv-ink pv-mono">{count(cancels) ?? "—"}</b> across paid and trials.</div>
          </div>
        </Card>

        <Card className="pv-span-6 pv-half">
          <CardHead label="The 90-day journey · active members" info="Where active premium members are in their program, from the program day stored on each profile." />
          <div className="pv-card-pad">
            <RankedBars max={n || 1} rows={[
              { key: "a", label: "Started a program", value: stats.started, sub: ratio(stats.started, n) },
              { key: "b", label: "Past the first week", sub: `day 8+ · ${ratio(stats.day8, n) || "0%"}`, value: stats.day8 },
              { key: "c", label: "Past day 30", sub: ratio(stats.day30, n), value: stats.day30 },
              { key: "d", label: "Finished 90 days", sub: ratio(stats.day90, n), value: stats.day90, color: "var(--pv-good)" },
            ]} />
            <div className="pv-faint" style={{ fontSize: 12, marginTop: 10 }}>Last 30 days: <b className="pv-ink pv-mono">{count(stats.monthCompletions)}</b> program days completed by <b className="pv-ink pv-mono">{count(stats.completers)}</b> members · <b className="pv-ink pv-mono">{count(stats.monthCheckins)}</b> check-ins by <b className="pv-ink pv-mono">{count(stats.checkers)}</b>.</div>
          </div>
        </Card>

        <Card className="pv-span-8">
          <CardHead label="Cohorts by join week · all iPhone profiles" info={{ body: "Each row is the people whose profile was created that week. Columns: became (and still are) premium now; reached day 2; reached day 8; opened the app in the last 7 days. Built from current profile state, so it shows where each cohort stands today, not a replay of history.", source: "Firestore profiles joined to RevenueCat membership" }} />
          <div className="pv-card-pad">
            <Heatmap rows={stats.weeks} columns={["Premium now", "Day 2+", "Day 8+", "Seen 7d"]} />
            <div className="pv-faint" style={{ fontSize: 11.5, marginTop: 10 }}>Exact D1/D3/D7 return cohorts are recorded by the app as analytics events; they appear here once the BigQuery export is connected.</div>
          </div>
        </Card>

        <Card className="pv-span-4">
          <CardHead label="Last app open · 14 days" info="Each active premium profile counted once, on its latest iPhone app launch stored in Firebase." />
          <div className="pv-card-pad"><Bars items={stats.buckets} height={150} ariaLabel="Active members by day of last app open" /></div>
        </Card>

        <Card className="pv-span-4 pv-half">
          <CardHead label="Streaks" info="Current streak on each active profile." />
          <div className="pv-card-pad"><Bars items={stats.streakBands} height={130} color="var(--pv-good)" ariaLabel="Members by current streak" /></div>
        </Card>
      </div>
    </div>
  );
}
