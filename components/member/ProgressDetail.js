"use client";

// What each stat opens, ported from ProfileView.handleStatTap:
//
//   Sessions     → WorkoutHistoryView   sessions grouped by day, newest first
//   Minutes      → TimeAnalyticsView    this week's total and a 7-day bar chart
//   Best streak  → StreakJourneyView    the three headline numbers, this
//                                       month's calendar, and the badge row
//
// On the phone the numbers are pills you can tap and nothing says so. The pills
// here are the same pills, but the three that open something carry a chevron
// next to their label, because a browser has no press state to discover.
//
// Every figure comes from her own records — completions and workout events —
// and never from a counter that only goes up.

import { useMemo } from "react";
import { Award, Crown, Flame, Medal, Rocket, Shield, Sparkles } from "lucide-react";
import { Sheet } from "./ui";
import { startOfDay } from "./youStore";

/** The phone's six badges, same day counts, same order. */
const MILESTONES = [
  { days: 3, Icon: Flame },
  { days: 7, Icon: Crown },
  { days: 14, Icon: Medal },
  { days: 30, Icon: Shield },
  { days: 50, Icon: Rocket },
  { days: 100, Icon: Sparkles },
];

export function WorkoutHistorySheet({ open, onClose, events, catalog }) {
  const sections = useMemo(() => groupByDay(events, catalog), [events, catalog]);

  return (
    <Sheet open={open} onClose={onClose} title="Workout History">
      <div className="pb-6">
        {sections.length === 0 ? (
          <Empty
            title="No workouts yet"
            body="Your completed workouts will appear here after your first session."
          />
        ) : (
          sections.map((section) => (
            <section key={section.key} className="mt-4 first:mt-0">
              <h3 className="px-1 text-[13px] font-bold uppercase tracking-wider text-app-textSecondary">
                {section.date.toLocaleDateString(undefined, {
                  month: "short", day: "numeric", year: "numeric",
                })}
              </h3>
              <ul className="mt-2 divide-y divide-black/[0.06] overflow-hidden rounded-[18px] border border-black/[0.06] bg-white">
                {section.items.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                    <span
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg"
                      style={{ backgroundImage: "linear-gradient(180deg, #4E9BE6 0%, #2A72C4 100%)" }}
                    >
                      <Award className="h-4 w-4 text-white" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14.5px] font-semibold text-app-textPrimary">
                        {item.title}
                      </span>
                      <span className="block text-[12px] text-app-textSecondary">
                        {durationText(item.seconds)}
                      </span>
                    </span>
                    <span className="shrink-0 text-[12px] tabular-nums text-app-textSecondary">
                      {item.date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </Sheet>
  );
}

export function MinutesSheet({ open, onClose, events }) {
  const week = useMemo(() => minutesByDay(events, 7), [events]);
  const weekTotal = week.reduce((sum, day) => sum + day.minutes, 0);
  const max = Math.max(1, ...week.map((d) => d.minutes));
  const hasAny = (events || []).length > 0;

  return (
    <Sheet open={open} onClose={onClose} title="Your Minutes">
      <div className="pb-6">
        {!hasAny ? (
          <Empty
            title="No activity yet"
            body="Your minutes will show up here after your first session."
          />
        ) : (
          <>
            <p className="text-[13px] font-bold uppercase tracking-wider text-app-textSecondary">
              This week
            </p>
            <p className="mt-1 text-[34px] font-bold leading-none tabular-nums text-app-primary">
              {weekTotal} min
            </p>

            <div className="mt-6 flex h-[180px] items-end gap-2">
              {week.map((day) => (
                <div key={day.key} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                  <span className="text-[11px] tabular-nums text-app-textSecondary">
                    {day.minutes || ""}
                  </span>
                  <div
                    className="w-full rounded-t-md bg-ios-purple"
                    style={{ height: `${day.minutes ? Math.max(4, (day.minutes / max) * 100) : 0}%` }}
                    aria-hidden="true"
                  />
                  <span className="text-[11px] font-medium text-app-textSecondary">
                    {day.date.toLocaleDateString(undefined, { weekday: "narrow" })}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[12.5px] leading-snug text-app-textSecondary">
              Counted from the time you actually spent watching, not from how long a
              session was scheduled to be.
            </p>
          </>
        )}
      </div>
    </Sheet>
  );
}

export function StreakJourneySheet({ open, onClose, streak, completions }) {
  const workoutDays = useMemo(() => {
    const set = new Set();
    for (const c of completions || []) {
      const d = c.completedAt instanceof Date ? c.completedAt : new Date(c.completedAt);
      if (!Number.isNaN(d.getTime())) set.add(startOfDay(d).getTime());
    }
    return set;
  }, [completions]);

  const month = useMemo(() => monthGrid(new Date()), []);

  return (
    <Sheet open={open} onClose={onClose} title="Your Streak">
      <div className="pb-6">
        <div className="grid grid-cols-3 gap-2.5">
          <HeadlineStat Icon={Flame} tint="#FF2D55" value={streak?.current ?? 0} label="Current streak" />
          <HeadlineStat Icon={Crown} tint="#E8843A" value={streak?.best ?? 0} label="Best streak" />
          <HeadlineStat Icon={Award} tint="#AF52DE" value={(completions || []).length} label="Total sessions" />
        </div>

        <div className="mt-4 rounded-[20px] border border-black/[0.06] bg-white p-4">
          <p className="text-center text-[15px] font-bold text-app-textPrimary">
            {new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </p>
          <div className="mt-3 grid grid-cols-7 gap-1 text-center">
            {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
              <span key={index} className="text-[11px] font-medium text-app-textSecondary">
                {day}
              </span>
            ))}
            {month.map((cell, index) =>
              cell ? (
                <span
                  key={index}
                  className={`mx-auto grid h-8 w-8 place-items-center rounded-full text-[12px] font-bold ${
                    workoutDays.has(cell.getTime())
                      ? "bg-ios-pink text-white"
                      : "text-app-textPrimary"
                  }`}
                >
                  {cell.getDate()}
                </span>
              ) : (
                <span key={index} aria-hidden="true" />
              )
            )}
          </div>
        </div>

        <p className="mt-5 px-1 text-[15px] font-bold text-app-textPrimary">Badges</p>
        <ul className="mt-2 flex gap-3 overflow-x-auto pb-2 no-scrollbar">
          {MILESTONES.map(({ days, Icon }) => {
            const unlocked = (streak?.best ?? 0) >= days;
            return (
              <li
                key={days}
                className={`flex h-[104px] w-[100px] shrink-0 flex-col items-center justify-center gap-2 rounded-[18px] border border-black/[0.06] bg-white ${
                  unlocked ? "" : "opacity-60"
                }`}
              >
                <Icon
                  className="h-8 w-8"
                  style={{ color: unlocked ? "#FFCC00" : "#D1D1D6" }}
                  aria-hidden="true"
                />
                <span
                  className={`text-[12px] font-bold ${
                    unlocked ? "text-app-textPrimary" : "text-app-textSecondary"
                  }`}
                >
                  {days} Days
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </Sheet>
  );
}

// --- Pieces ----------------------------------------------------------------

function HeadlineStat({ Icon, tint, value, label }) {
  return (
    <div className="rounded-[18px] border border-black/[0.06] bg-white px-2 py-3 text-center">
      <Icon className="mx-auto h-5 w-5" style={{ color: tint }} aria-hidden="true" />
      <p className="mt-1.5 text-[24px] font-bold leading-none tabular-nums text-app-textPrimary">
        {value}
      </p>
      <p className="mt-1 text-[11px] leading-tight text-app-textSecondary">{label}</p>
    </div>
  );
}

function Empty({ title, body }) {
  return (
    <div className="rounded-[20px] border border-black/[0.06] bg-white p-5 text-center">
      <p className="text-[16px] font-bold text-app-textPrimary">{title}</p>
      <p className="mt-1.5 text-[13.5px] leading-snug text-app-textSecondary">{body}</p>
    </div>
  );
}

// --- Helpers ---------------------------------------------------------------

function eventDate(event) {
  const raw = event?.date;
  if (!raw) return null;
  if (raw instanceof Date) return raw;
  if (typeof raw?.toDate === "function") return raw.toDate();
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function groupByDay(events, catalog) {
  const titles = new Map((catalog?.videos || []).map((v) => [v.id, v.title]));
  const byDay = new Map();
  for (const event of events || []) {
    const date = eventDate(event);
    if (!date) continue;
    const key = startOfDay(date).getTime();
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push({
      id: event.id || `${event.videoID}-${date.getTime()}`,
      title: event.videoTitle || titles.get(event.videoID || event.videoId) || "Workout",
      seconds: Number(event.secondsWatched) || 0,
      date,
    });
  }
  return [...byDay.keys()]
    .sort((a, b) => b - a)
    .map((key) => ({
      key,
      date: new Date(key),
      items: byDay.get(key).sort((a, b) => b.date - a.date),
    }));
}

function minutesByDay(events, days) {
  const totals = new Map();
  for (const event of events || []) {
    const date = eventDate(event);
    if (!date) continue;
    const key = startOfDay(date).getTime();
    totals.set(key, (totals.get(key) || 0) + (Number(event.secondsWatched) || 0));
  }
  const today = startOfDay(new Date());
  const out = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - offset);
    out.push({
      key: d.getTime(),
      date: d,
      minutes: Math.round((totals.get(d.getTime()) || 0) / 60),
    });
  }
  return out;
}

/** This month, padded to start on the right weekday. Null cells are blanks. */
function monthGrid(now) {
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const cells = new Array(first.getDay()).fill(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(now.getFullYear(), now.getMonth(), day));
  }
  return cells;
}

function durationText(seconds) {
  return seconds >= 60
    ? `${Math.floor(seconds / 60)} min ${seconds % 60} sec`
    : `${seconds} sec`;
}
