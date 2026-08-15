"use client";

import { useMemo } from "react";
import { Card, EmptyState, SectionHeader } from "./ui";
import { formatCount, formatPercent, formatRelativeDay } from "@/lib/adminMetrics";

function Metric({ label, value, note, tone = "default" }) {
  const color = tone === "good" ? "var(--pv-good)" : tone === "warn" ? "var(--pv-warn)" : "var(--pv-ink)";
  return (
    <Card className="pv-rise p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--pv-ink-3)" }}>{label}</p>
      <p className="pv-figure mt-2 text-[38px] font-semibold leading-none" style={{ color }}>{value}</p>
      <p className="mt-3 text-[13px] leading-relaxed" style={{ color: "var(--pv-ink-2)" }}>{note}</p>
    </Card>
  );
}

function Signal({ title, value, note, width, color }) {
  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[13px] font-semibold" style={{ color: "var(--pv-ink)" }}>{title}</p>
          <p className="mt-0.5 text-[12px]" style={{ color: "var(--pv-ink-3)" }}>{note}</p>
        </div>
        <p className="pv-tabular text-[15px] font-semibold" style={{ color: "var(--pv-ink)" }}>{value}</p>
      </div>
      <div className="h-2 overflow-hidden rounded-full" style={{ background: "var(--pv-surface-2)" }}>
        <div className="h-full rounded-full" style={{ width: `${Math.max(2, Math.min(100, width))}%`, background: color }} />
      </div>
    </div>
  );
}

export default function AppOverview({ members, telemetry, now }) {
  const stats = useMemo(() => {
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    const monthAgo = new Date(now.getTime() - 30 * 86400000);
    const ios = members.filter((member) => member.platform === "ios");
    const active = ios.filter((member) => member.lastSeenAt && member.lastSeenAt >= weekAgo);
    const started = ios.filter((member) => Number.isFinite(member.programDay) && member.programDay > 0);
    const retained = ios.filter((member) => Number.isFinite(member.programDay) && member.programDay >= 8);
    const monthCompletions = telemetry.completions.filter((row) => row.completedAt && row.completedAt >= monthAgo);
    const activeCompleters = new Set(monthCompletions.map((row) => row.memberId).filter(Boolean));
    const finished = ios.filter((member) => member.programDay >= 90);
    const videoFailures = telemetry.events.filter((event) => {
      if (!event.date || event.date < weekAgo) return false;
      return /fail|error/i.test(event.type) || Boolean(event.error);
    });
    const pending = telemetry.commands.filter((command) => command.status === "pending");
    const rejected = telemetry.commands.filter((command) => command.status === "rejected");
    const avgDay = started.length ? started.reduce((sum, member) => sum + member.programDay, 0) / started.length : null;
    return { ios, active, started, retained, monthCompletions, activeCompleters, finished, videoFailures, pending, rejected, avgDay };
  }, [members, telemetry, now]);

  if (!stats.ios.length) {
    return <Card className="p-5"><EmptyState title="No iPhone members yet" description="The dashboard is now app-only. A member appears after the approved iOS app creates her Firebase profile." /></Card>;
  }

  const mostRecent = [...stats.ios].sort((a, b) => (b.lastSeenAt?.getTime() || 0) - (a.lastSeenAt?.getTime() || 0))[0];

  return (
    <div className="space-y-10">
      <section>
        <SectionHeader eyebrow="App pulse" title="What members are doing now" description="Every number below comes directly from the iPhone app and Firebase." />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="iPhone members" value={formatCount(stats.ios.length)} note="App profiles currently visible in Firebase." />
          <Metric label="Active this week" value={formatCount(stats.active.length)} note={`${formatPercent(stats.active.length, stats.ios.length)} opened Pelvi in the last 7 days.`} tone="good" />
          <Metric label="Workout days · 30d" value={formatCount(stats.monthCompletions.length)} note={`${formatCount(stats.activeCompleters.size)} members completed at least one program day.`} />
          <Metric label="Reached day 8" value={formatCount(stats.retained.length)} note={`${formatPercent(stats.retained.length, stats.started.length, "No starts yet")} of members who started made it beyond the first week.`} tone="good" />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_.65fr]">
        <Card className="p-6">
          <SectionHeader eyebrow="Program health" title="The 90-day journey" description="A quick view of activation, consistency, and completion." />
          <div className="mt-7 space-y-6">
            <Signal title="Started a program" value={formatCount(stats.started.length)} note="Has a program day on the phone" width={(stats.started.length / stats.ios.length) * 100} color="linear-gradient(90deg,var(--pv-rose),var(--pv-violet))" />
            <Signal title="Made it past the first week" value={formatCount(stats.retained.length)} note="Reached day 8 or later" width={(stats.retained.length / stats.ios.length) * 100} color="var(--pv-violet)" />
            <Signal title="Completed all 90 days" value={formatCount(stats.finished.length)} note="Reached the end of the program" width={(stats.finished.length / stats.ios.length) * 100} color="var(--pv-good)" />
          </div>
        </Card>

        <Card className="p-6">
          <SectionHeader eyebrow="Operations" title="Needs attention" description="Only items that may require a human look." />
          <div className="mt-6 space-y-3">
            <StatusRow label="Commands waiting for a phone" value={stats.pending.length} tone={stats.pending.length ? "warn" : "good"} />
            <StatusRow label="Commands rejected by a phone" value={stats.rejected.length} tone={stats.rejected.length ? "crit" : "good"} />
            <StatusRow label="Playback failures · 7d" value={stats.videoFailures.length} tone={stats.videoFailures.length ? "warn" : "good"} />
          </div>
          <div className="mt-6 border-t pt-5" style={{ borderColor: "var(--pv-border)" }}>
            <p className="text-[12px]" style={{ color: "var(--pv-ink-3)" }}>Most recent app activity</p>
            <p className="mt-1 text-[15px] font-semibold" style={{ color: "var(--pv-ink)" }}>{formatRelativeDay(mostRecent?.lastSeenAt, now)}</p>
            <p className="mt-1 truncate text-[12px]" style={{ color: "var(--pv-ink-2)" }}>{mostRecent?.email || mostRecent?.id}</p>
          </div>
        </Card>
      </section>
    </div>
  );
}

function StatusRow({ label, value, tone }) {
  const colors = { good: "var(--pv-good)", warn: "var(--pv-warn)", crit: "var(--pv-crit)" };
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl px-4 py-3" style={{ background: "var(--pv-surface-2)" }}>
      <span className="text-[13px]" style={{ color: "var(--pv-ink-2)" }}>{label}</span>
      <span className="pv-tabular text-[16px] font-semibold" style={{ color: colors[tone] }}>{formatCount(value)}</span>
    </div>
  );
}
