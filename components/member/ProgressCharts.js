"use client";

// Is it actually working?
//
// Three answers, all drawn from records she can point at: sessions per week
// from her completions, minutes from her workout events, and how she has been
// feeling from her own check-ins. Nothing here is simulated.

import { useEffect, useMemo, useState } from "react";
import { Clock, Flame, TrendingUp } from "lucide-react";
import { useMember } from "./MemberProvider";
import { Card, SectionHeader } from "./ui";
import { fetchRecentCheckIns } from "@/lib/memberData";
import { goalFeelingQuestion } from "@/lib/goalCopy";
import { SESSIONS_PER_WEEK } from "@/lib/guaranteeCopy";

const WEEKS_SHOWN = 8;

export default function ProgressCharts() {
  const { member, goalId, completions, history, streak } = useMember();
  const [checkIns, setCheckIns] = useState([]);

  useEffect(() => {
    let cancelled = false;
    if (!member?.id) return undefined;
    fetchRecentCheckIns(member.id, 60)
      .then((rows) => { if (!cancelled) setCheckIns(rows); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [member?.id]);

  const weeks = useMemo(() => sessionsByWeek(completions, WEEKS_SHOWN), [completions]);
  const minutes = Math.round(history.totalSeconds / 60);
  const feelings = useMemo(() => feelingSeries(checkIns, 14), [checkIns]);
  const maxSessions = Math.max(SESSIONS_PER_WEEK, ...weeks.map((w) => w.count));

  const hasAnything = completions.length > 0 || history.totalSeconds > 0;

  return (
    <section className="mt-6" aria-labelledby="your-progress">
      <SectionHeader id="your-progress" title="Your progress" subtitle="Straight from your own sessions." />

      <div className="mt-3 grid grid-cols-3 gap-3">
        <Stat icon={Flame} label="Day streak" value={streak.current} />
        <Stat icon={TrendingUp} label="Sessions" value={completions.length} />
        <Stat icon={Clock} label="Minutes" value={minutes} />
      </div>

      {!hasAnything ? (
        <Card className="mt-3">
          <p className="text-[15px] font-bold text-app-textPrimary">Start here</p>
          <p className="mt-1.5 text-[14px] text-app-textSecondary">
            Your progress shows up here after your first session.
          </p>
        </Card>
      ) : (
        <Card className="mt-3">
          <h3 className="text-[15px] font-bold text-app-textPrimary">Sessions a week</h3>
          <p className="mt-0.5 text-[12.5px] text-app-textSecondary">
            The guarantee asks for {SESSIONS_PER_WEEK} a week. The line is where that sits.
          </p>

          <div className="relative mt-4 flex h-[120px] items-end gap-2">
            {/* The guarantee line, drawn behind the bars. */}
            <div
              className="pointer-events-none absolute inset-x-0 border-t border-dashed border-app-primary/50"
              style={{ bottom: `${(SESSIONS_PER_WEEK / maxSessions) * 100}%` }}
              aria-hidden="true"
            />
            {weeks.map((week) => (
              <div key={week.key} className="flex h-full flex-1 flex-col justify-end gap-1.5">
                {/* A week with no sessions gets no bar. A 2 percent stub of the
                    same pink read as "a bit of activity" on the one chart that
                    is supposed to answer whether this is working. */}
                <div
                  className={`w-full rounded-t-md ${
                    week.count === 0
                      ? "bg-app-borderIdle"
                      : week.count >= SESSIONS_PER_WEEK
                        ? "bg-app-positive"
                        : "bg-ios-pink/70"
                  }`}
                  style={{
                    height: week.count === 0 ? "2px" : `${Math.max((week.count / maxSessions) * 100, 6)}%`,
                  }}
                />
                <span className="text-center text-[10px] font-medium text-app-textSecondary">
                  {week.label}
                </span>
              </div>
            ))}
          </div>

          <table className="sr-only">
            <caption>Sessions completed each week</caption>
            <thead>
              <tr><th scope="col">Week beginning</th><th scope="col">Sessions</th></tr>
            </thead>
            <tbody>
              {weeks.map((week) => (
                <tr key={week.key}>
                  <td>{week.full}</td>
                  <td>{week.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {feelings.length > 1 && (
        <Card className="mt-3">
          <h3 className="text-[15px] font-bold text-app-textPrimary">How you have been feeling</h3>
          <p className="mt-0.5 text-[12.5px] leading-snug text-app-textSecondary">
            {goalFeelingQuestion(goalId)} Your answers, most recent on the right.
          </p>

          <div className="mt-4 flex h-[92px] items-end gap-1.5">
            {feelings.map((point) => (
              <div key={point.key} className="flex h-full flex-1 flex-col justify-end">
                <div
                  className="w-full rounded-t-md bg-app-primary"
                  style={{ height: `${(point.value / 5) * 100}%`, opacity: 0.35 + (point.value / 5) * 0.65 }}
                />
              </div>
            ))}
          </div>

          <table className="sr-only">
            <caption>Your goal feeling score out of 5, by day</caption>
            <thead>
              <tr><th scope="col">Day</th><th scope="col">Score out of 5</th></tr>
            </thead>
            <tbody>
              {feelings.map((point) => (
                <tr key={point.key}><td>{point.key}</td><td>{point.value}</td></tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </section>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-[18px] border border-app-borderIdle bg-white p-3 text-center">
      <Icon className="mx-auto h-4 w-4 text-app-primary" aria-hidden="true" />
      <p className="mt-1.5 text-[22px] font-bold leading-none tabular-nums text-app-textPrimary">
        {value}
      </p>
      <p className="mt-1 text-[11px] font-medium text-app-textSecondary">{label}</p>
    </div>
  );
}

// --- Maths -----------------------------------------------------------------

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === "function") return value.toDate();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Monday
  return d;
}

function sessionsByWeek(completions, count) {
  const buckets = new Map();
  const thisWeek = startOfWeek(new Date());

  for (let i = count - 1; i >= 0; i -= 1) {
    const start = new Date(thisWeek);
    start.setDate(start.getDate() - i * 7);
    buckets.set(start.getTime(), {
      key: start.toISOString().slice(0, 10),
      label: start.toLocaleDateString("en-US", { day: "numeric" }),
      full: start.toLocaleDateString("en-US", { month: "long", day: "numeric" }),
      count: 0,
    });
  }

  const seen = new Set();
  for (const c of completions || []) {
    const d = toDate(c.completedAt);
    if (!d) continue;
    // One session per calendar day, matching how the guarantee counts.
    const dayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (seen.has(dayKey)) continue;
    seen.add(dayKey);
    const week = startOfWeek(d).getTime();
    const bucket = buckets.get(week);
    if (bucket) bucket.count += 1;
  }

  return [...buckets.values()];
}

function feelingSeries(checkIns, count) {
  return (checkIns || [])
    .filter((c) => typeof c.goalFeeling === "number")
    .slice(0, count)
    .reverse()
    .map((c) => ({ key: c.id, value: Math.min(5, Math.max(1, c.goalFeeling)) }));
}
