"use client";

import { useMemo } from "react";
import { Bars, Card, CardHead, Heatmap, KpiTile, PageHead, RankedBars, count, ratio } from "./ui";
import { startOfDay } from "@/lib/adminMetrics";
import { rangeLabel } from "@/lib/adminRange";
import { metric, metricInfo } from "./Pulse";

export default function Retention({ range, ownerMetrics, ownerPrevious, compare, members, allPeople, telemetry, now, onGo }) {
  const firstPayments = metric(ownerMetrics, "firstPayments");
  const firstPaymentsPrev = metric(ownerPrevious, "firstPayments");
  const activePaid = metric(ownerMetrics, "activeSubscriptions");
  const renewing = metric(ownerMetrics, "paidSetToRenew");
  const renewalOff = metric(ownerMetrics, "activeCancellations");
  const refunds = metric(ownerMetrics, "refundedTransactions");

  const stats = useMemo(() => {
    const ids = new Set();
    for (const member of members) {
      ids.add(member.id);
      for (const id of member.revenueCat?.identityIds || []) ids.add(id);
    }
    const activeRows = (rows) => (rows || []).filter((row) => row.memberId && ids.has(row.memberId));
    const completions = activeRows(telemetry?.completions);
    const checkins = activeRows(telemetry?.checkins);
    const monthAgo = new Date(now.getTime() - 30 * 86400000);
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    const started = members.filter((member) => Number.isFinite(member.programDay) && member.programDay > 0).length;
    const day8 = members.filter((member) => Number.isFinite(member.programDay) && member.programDay >= 8).length;
    const day30 = members.filter((member) => Number.isFinite(member.programDay) && member.programDay >= 30).length;
    const day90 = members.filter((member) => Number.isFinite(member.programDay) && member.programDay >= 90).length;
    const monthCompletions = completions.filter((row) => row.completedAt && row.completedAt >= monthAgo);
    const completers = new Set(monthCompletions.map((row) => row.memberId));
    const monthCheckins = checkins.filter((row) => row.date && row.date >= monthAgo);
    const checkers = new Set(monthCheckins.map((row) => row.memberId));
    const today = startOfDay(now);
    const buckets = Array.from({ length: 14 }, (_, index) => {
      const date = new Date(today.getTime() - (13 - index) * 86400000);
      return { key: date.toISOString().slice(0, 10), label: index === 13 ? "Today" : date.toLocaleDateString("en-US", { weekday: "narrow" }), value: 0, emph: index === 13 };
    });
    for (const member of members) {
      if (!member.lastSeenAt) continue;
      const key = startOfDay(member.lastSeenAt).toISOString().slice(0, 10);
      const bucket = buckets.find((item) => item.key === key);
      if (bucket) bucket.value += 1;
    }
    const seen7 = members.filter((member) => member.lastSeenAt && member.lastSeenAt >= weekAgo).length;
    const seenToday = members.filter((member) => member.lastSeenAt && member.lastSeenAt >= today).length;
    const silent14 = members.filter((member) => !member.lastSeenAt || now - member.lastSeenAt > 14 * 86400000).length;
    const streakBands = [["0", 0, 0], ["1–2", 1, 2], ["3–6", 3, 6], ["7–13", 7, 13], ["14+", 14, Infinity]].map(([label, low, high]) => ({ key: label, label, value: members.filter((member) => (member.streak || 0) >= low && (member.streak || 0) <= high).length }));
    const weeks = [];
    for (let week = 0; week < 8; week += 1) {
      const end = new Date(today.getTime() - week * 7 * 86400000 + 86400000);
      const start = new Date(end.getTime() - 7 * 86400000);
      const cohort = allPeople.filter((member) => member.joinedAt && member.joinedAt >= start && member.joinedAt < end);
      const size = cohort.length;
      const cell = (predicate) => {
        const matched = cohort.filter(predicate).length;
        return size ? { value: matched / size, display: `${Math.round((matched / size) * 100)}%`, title: `${matched} of ${size}` } : { value: null, display: "·" };
      };
      weeks.push({ label: `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} · ${size}`, cells: [
        cell((member) => member.premiumPhase === "paid" && member.isActivePremium),
        cell((member) => Number.isFinite(member.programDay) && member.programDay >= 2),
        cell((member) => Number.isFinite(member.programDay) && member.programDay >= 8),
        cell((member) => member.lastSeenAt && member.lastSeenAt >= weekAgo),
      ] });
    }
    return { started, day8, day30, day90, monthCompletions: monthCompletions.length, completers: completers.size, monthCheckins: monthCheckins.length, checkers: checkers.size, buckets, seen7, seenToday, silent14, streakBands, weeks };
  }, [members, allPeople, telemetry, now]);

  const totalMembers = members.length;
  return (
    <div className="pv-rise" style={{ display: "grid", gap: 12 }}>
      <PageHead title="Retention" description={`Paid member health, engagement and 90-day progress · ${rangeLabel(range)}`} />

      <div className="pv-kpis">
        <KpiTile label="First payments" value={count(firstPayments)} current={firstPayments} previous={compare ? firstPaymentsPrev : null} compareLabel="vs previous" stripe="var(--pv-good)" info={metricInfo(ownerMetrics, "firstPayments")} />
        <KpiTile label="Active paid" value={count(activePaid)} sub="RevenueCat right now" stripe="var(--pv-good)" info={metricInfo(ownerMetrics, "activeSubscriptions")} />
        <KpiTile label="Paid and renewing" value={count(renewing)} sub={Number.isFinite(activePaid) ? `${ratio(renewing, activePaid, 1) || "0%"} of active paid` : "renewal remains on"} stripe="var(--pv-teal)" info={metricInfo(ownerMetrics, "paidSetToRenew")} />
        <KpiTile label="Renewal off" value={count(renewalOff)} sub="paid access still active" stripe={renewalOff > 0 ? "var(--pv-warn)" : "var(--pv-border-strong)"} info={metricInfo(ownerMetrics, "activeCancellations")} onClick={() => onGo("members")} />
        <KpiTile label="Seen · 7 days" value={count(stats.seen7)} sub={`${ratio(stats.seen7, totalMembers) || "0%"} of ${count(totalMembers)} paid · ${stats.seenToday} today`} stripe="var(--pv-good)" />
        <KpiTile label="Silent · 14 days" value={count(stats.silent14)} sub="paid, not opened in 2 weeks" stripe={stats.silent14 > 0 ? "var(--pv-warn)" : "var(--pv-border-strong)"} onClick={() => onGo("members")} />
      </div>

      <div className="pv-bento">
        <Card className="pv-span-6 pv-half">
          <CardHead label="Paid subscription health" info="RevenueCat's current paid subscription status. Renewing and renewal-off counts remain active access; refunds are transactions inside the selected range." />
          <div className="pv-card-pad">
            <RankedBars max={activePaid || 1} rows={[
              { key: "active", label: "Active paid", value: activePaid || 0, color: "var(--pv-good)" },
              { key: "renew", label: "Renewal on", value: renewing || 0, sub: ratio(renewing, activePaid, 1), color: "var(--pv-teal)" },
              { key: "off", label: "Renewal off", value: renewalOff || 0, sub: ratio(renewalOff, activePaid, 1), color: "var(--pv-amber)" },
            ]} />
            <div className="pv-faint" style={{ fontSize: 12, marginTop: 10 }}>Refunded transactions in {rangeLabel(range)}: <b className="pv-ink pv-mono">{count(refunds) ?? "—"}</b>.</div>
          </div>
        </Card>

        <Card className="pv-span-6 pv-half">
          <CardHead label="The 90-day journey · paid members" info="Where paid members are in their program, from the program day stored on each profile." />
          <div className="pv-card-pad">
            <RankedBars max={totalMembers || 1} rows={[
              { key: "a", label: "Started a program", value: stats.started, sub: ratio(stats.started, totalMembers) },
              { key: "b", label: "Past the first week", sub: `day 8+ · ${ratio(stats.day8, totalMembers) || "0%"}`, value: stats.day8 },
              { key: "c", label: "Past day 30", sub: ratio(stats.day30, totalMembers), value: stats.day30 },
              { key: "d", label: "Finished 90 days", sub: ratio(stats.day90, totalMembers), value: stats.day90, color: "var(--pv-good)" },
            ]} />
            <div className="pv-faint" style={{ fontSize: 12, marginTop: 10 }}>Last 30 days: <b className="pv-ink pv-mono">{count(stats.monthCompletions)}</b> program days completed by <b className="pv-ink pv-mono">{count(stats.completers)}</b> members · <b className="pv-ink pv-mono">{count(stats.monthCheckins)}</b> check-ins by <b className="pv-ink pv-mono">{count(stats.checkers)}</b>.</div>
          </div>
        </Card>

        <Card className="pv-span-8">
          <CardHead label="Cohorts by join week · all iPhone profiles" info={{ body: "Each row shows profiles created that week. Columns show paid now, reached day 2, reached day 8, and opened in the last 7 days. This is current profile state, not invented historical state.", source: "Firestore profiles joined to RevenueCat" }} />
          <div className="pv-card-pad"><Heatmap rows={stats.weeks} columns={["Paid now", "Day 2+", "Day 8+", "Seen 7d"]} /></div>
        </Card>

        <Card className="pv-span-4">
          <CardHead label="Last app open · 14 days" info="Each paid profile counted once on its latest iPhone app launch stored in Firebase." />
          <div className="pv-card-pad"><Bars items={stats.buckets} height={150} ariaLabel="Paid members by day of last app open" /></div>
        </Card>

        <Card className="pv-span-4 pv-half">
          <CardHead label="Streaks" info="Current streak on each paid profile." />
          <div className="pv-card-pad"><Bars items={stats.streakBands} height={130} color="var(--pv-good)" ariaLabel="Paid members by current streak" /></div>
        </Card>
      </div>
    </div>
  );
}
