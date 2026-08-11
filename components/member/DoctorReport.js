"use client";

// Report for my doctor — the browser's half of
// "Pelvic Floor/Core/Reports/ProgressReportView.swift" and its builder.
//
// The phone renders a real PDF with PDFKit, previews it, and hands it to the
// share sheet. A browser has no PDFKit, but it has the one thing that matters
// here: every operating system's print dialog can write a PDF, and every one of
// them can also just print the page — which is what half these members do with
// it anyway, because they are taking a piece of paper to an appointment.
//
// So: the document is laid out on screen exactly as it will come out, and the
// button opens the print dialog. Nothing is uploaded and nothing is generated on
// a server. Same sections as the phone's builder, same order, same definitions
// printed underneath — including what counts as a night void, because a
// clinician reading a table has to know how it was counted.
//
// HOW THE PRINT ACTUALLY WORKS, because the obvious two ways are both wrong:
//
//   • window.open() + document.write() of the report, then print that window.
//     Tried first, and it is one popup blocker away from printing nothing. A
//     paying member does not need a second thing to go wrong at the printer.
//   • Printing the sheet where it sits. The sheet is a `position: fixed` panel
//     with `max-height: 86vh` and its own scrollbar. Fixed elements print their
//     first page and nothing else, so a 90-day report would come out truncated
//     with no sign that it had been.
//
// What is here instead: the document is rendered a SECOND time, outside the
// sheet, parked off-screen, in ordinary flow. On screen it is 200 viewports to
// the left and nobody ever sees it; in print it is the only thing visible, in
// normal flow, so it paginates properly. The @media print block below also has
// to stand the scroll containers down, because an ancestor with `overflow:
// auto` still clips its children when they are the only visible thing on the
// page — that is what `main, .pv-member-shell, .pv-member-scroll` is doing
// there, and it is the one place this file knows something about MemberShell.

import { useCallback, useMemo } from "react";
import { Printer } from "lucide-react";
import { Sheet } from "./ui";
import { Segmented } from "./youUI";
import {
  NIGHT_WINDOW_DESCRIPTION, milestoneLabel, summariseDiary, toDate, volumeDisplayValue,
  volumeUnit,
} from "./youStore";
import { PFDI_SUBSCALES, iciqSeverity } from "./outcomeMeasures";
import { SESSIONS_PER_WEEK } from "@/lib/guaranteeCopy";

export const REPORT_RANGES = [
  { id: "week", title: "7 days", days: 7, documentTitle: "Last 7 days", caption: "Good for a first appointment, along with your 3-day bladder diary." },
  { id: "month", title: "30 days", days: 30, documentTitle: "Last 30 days", caption: "A good span for a follow-up visit." },
  { id: "quarter", title: "90 days", days: 90, documentTitle: "Last 90 days", caption: "Covers a full 90-day program." },
  { id: "all", title: "All", days: null, documentTitle: "Full history", caption: "Everything you've logged since you joined." },
];

/**
 * The document's own stylesheet. Plain CSS and plain class names rather than
 * utility classes, so the rules that matter at the printer are all in one place
 * and readable as a document rather than as a wall of `text-[11px]`.
 */
export const REPORT_CSS = `
.pv-report { color: #1A1A26; font: 400 13px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
.pv-report h1 { font-size: 20px; font-weight: 700; margin: 0; letter-spacing: -0.2px; }
.pv-report h2 { font-size: 13px; font-weight: 700; margin: 22px 0 8px; text-transform: uppercase; letter-spacing: 0.06em; color: #737380; border-bottom: 1px solid #EBEBF0; padding-bottom: 5px; }
.pv-report .pv-sub { color: #737380; font-size: 12px; margin: 4px 0 0; }
.pv-report .pv-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.pv-report .pv-cell { border: 1px solid #EBEBF0; border-radius: 10px; padding: 9px 11px; }
.pv-report .pv-cell dt { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.05em; color: #737380; margin: 0; }
.pv-report .pv-cell dd { font-size: 17px; font-weight: 700; margin: 2px 0 0; font-variant-numeric: tabular-nums; }
.pv-report .pv-cell .pv-caption { font-size: 10.5px; color: #737380; font-weight: 400; display: block; }
.pv-report table { width: 100%; border-collapse: collapse; font-size: 12px; }
.pv-report th { text-align: left; font-size: 11px; font-weight: 700; color: #737380; border-bottom: 1px solid #EBEBF0; padding: 5px 6px; white-space: nowrap; }
.pv-report td { padding: 5px 6px; border-bottom: 1px solid #F4F4F7; font-variant-numeric: tabular-nums; }
.pv-report th.pv-num, .pv-report td.pv-num { text-align: right; }
.pv-report .pv-note { font-size: 11px; color: #737380; margin: 8px 0 0; }
.pv-report .pv-empty { font-size: 12.5px; color: #737380; margin: 0; }
.pv-report .pv-scroll { overflow-x: auto; }

/* The off-screen copy that the printer gets. See the block comment at the top
   of this file for why it exists rather than a popup. */
.pv-print-root { position: absolute; left: -200vw; top: 0; width: 720px; }

@media print {
  @page { margin: 14mm; }
  html, body { height: auto !important; overflow: visible !important; background: #fff !important; }
  /* Everything on the page disappears except the report. visibility rather than
     display, so nothing reflows and no ancestor collapses under it. */
  body * { visibility: hidden !important; }
  .pv-print-root, .pv-print-root * { visibility: visible !important; }
  .pv-print-root { position: static !important; left: auto !important; width: auto !important; }
  /* A hidden ancestor still clips. These three are the member shell's scroll
     containers, and they have to stand down or the report prints one page. */
  main, .pv-member-shell, .pv-member-scroll {
    position: static !important; overflow: visible !important;
    height: auto !important; max-height: none !important;
  }
  .pv-report { font-size: 11.5px; }
  .pv-report h2 { break-after: avoid; }
  .pv-report tr { break-inside: avoid; }
  .pv-report .pv-scroll { overflow: visible !important; }
}
`;

export default function DoctorReport({
  open, onClose, range, onRangeChange, member, goal, currentDayNumber, planLength,
  completions, totalSeconds, streak, checkIns, diaryEntries, outcomeChecks,
}) {
  const rangeMeta = REPORT_RANGES.find((r) => r.id === range) || REPORT_RANGES[1];

  const print = useCallback(() => {
    window.print();
  }, []);

  const body = (
    <ReportBody
      rangeMeta={rangeMeta}
      member={member}
      goal={goal}
      currentDayNumber={currentDayNumber}
      planLength={planLength}
      completions={completions}
      totalSeconds={totalSeconds}
      streak={streak}
      checkIns={checkIns}
      diaryEntries={diaryEntries}
      outcomeChecks={outcomeChecks}
    />
  );

  return (
    <>
    <Sheet open={open} onClose={onClose} title="Health Report">
      <div className="pb-6">
        <p className="text-[13.5px] leading-snug text-app-textSecondary">
          Everything you have logged, set out the way a pelvic floor therapist likes
          to read it. Print it, or save it as a PDF and email it.
        </p>

        <div className="mt-4">
          <p className="mb-2 text-[13px] font-bold uppercase tracking-wider text-app-textSecondary">
            How far back?
          </p>
          <Segmented
            label="Date range"
            options={REPORT_RANGES}
            value={rangeMeta.id}
            onChange={onRangeChange}
          />
          <p className="mt-2 text-[12px] text-app-textSecondary">{rangeMeta.caption}</p>
        </div>

        <button
          type="button"
          onClick={print}
          className="mt-4 flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-ios-pink text-[16px] font-bold text-white"
        >
          <Printer className="h-4 w-4" aria-hidden="true" />
          Print or save as PDF
        </button>

        <div className="mt-5 rounded-[20px] border border-black/[0.06] bg-white p-4">
          <style>{REPORT_CSS}</style>
          {body}
        </div>

        <p className="mt-3 text-center text-[12px] text-app-textSecondary">
          The report is built in this browser from your own records. It only leaves
          your computer when you print it or send it.
        </p>
      </div>
    </Sheet>

    {/* The copy the printer gets: same component, outside the sheet, parked
        off-screen. `aria-hidden` because a screen reader must not read the
        document twice, and no tab stops because it contains none. */}
    {open && (
      <div className="pv-print-root" aria-hidden="true">
        {body}
      </div>
    )}
    </>
  );
}

function ReportBody({
  rangeMeta, member, goal, currentDayNumber, planLength, completions, totalSeconds,
  streak, checkIns, diaryEntries, outcomeChecks,
}) {
  const now = new Date();
  const start = useMemo(() => {
    if (!rangeMeta.days) return new Date(0);
    const d = new Date(now);
    d.setDate(d.getDate() - rangeMeta.days);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [rangeMeta.days, now.getTime()]); // eslint-disable-line react-hooks/exhaustive-deps

  const inRange = (value) => {
    const d = toDate(value);
    return d ? d >= start && d <= now : false;
  };

  const rangeCompletions = (completions || []).filter((c) => inRange(c.completedAt));
  const rangeSeconds = rangeCompletions.reduce((sum, c) => sum + (Number(c.secondsWatched) || 0), 0);
  const practiceMinutes = Math.round((rangeSeconds || totalSeconds || 0) / 60);
  const spanDays = rangeMeta.days || Math.max(1, Math.round((now - firstDate(completions, now)) / 86400000));
  const weeks = Math.max(spanDays / 7, 1 / 7);
  const adherence = Math.min(
    100,
    Math.round((rangeCompletions.length / weeks / SESSIONS_PER_WEEK) * 100)
  );

  const diaryDays = useMemo(
    () => summariseDiary((diaryEntries || []).filter((e) => inRange(e.timestamp))),
    [diaryEntries, start] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Deliberately NOT clipped to the range: four checks over 90 days would
  // vanish from a 7-day report, and the baseline is the single most useful
  // number on the page. Same rule as ReportOutcomeGatherer on the phone.
  const checks = (outcomeChecks || []).filter((c) => {
    const d = toDate(c.date);
    return d && d <= now && (c.iciqTotal != null || c.pfdiTotal != null);
  });

  const rangeCheckIns = (checkIns || [])
    .filter((c) => inRange(c.date) || inRange(c.id))
    .sort((a, b) => (toDate(a.date) || 0) - (toDate(b.date) || 0));

  const unit = volumeUnit();

  return (
    <div className="pv-report">
      <h1>Pelvic floor progress report</h1>
      <p className="pv-sub">
        {[(member?.name || "").trim() || "Pelvi member", goal?.title, rangeMeta.documentTitle]
          .filter(Boolean)
          .join(" · ")}
      </p>
      <p className="pv-sub">
        Prepared {now.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })} from
        the member's own logs in the Pelvi app.
      </p>

      <h2>Summary</h2>
      <dl className="pv-grid">
        <Cell
          label="Program"
          value={planLength ? `Day ${Math.min(currentDayNumber, planLength)} of ${planLength}` : "—"}
          caption={goal?.title}
        />
        <Cell label="Sessions completed" value={`${rangeCompletions.length}`} caption="In this period" />
        <Cell label="Practice time" value={durationText(practiceMinutes)} caption="In this period" />
        <Cell label="Current streak" value={`${streak?.current ?? 0} ${plural(streak?.current ?? 0, "day")}`} />
        <Cell label="Best streak" value={`${streak?.best ?? 0} ${plural(streak?.best ?? 0, "day")}`} />
        <Cell
          label="Sticking with it"
          value={`${adherence}%`}
          caption={`vs ${SESSIONS_PER_WEEK} sessions a week`}
        />
      </dl>

      <h2>Outcome measures</h2>
      {checks.length === 0 ? (
        <p className="pv-empty">
          No progress check has been completed yet. The ICIQ-UI SF and PFDI-20 can be
          answered from the You tab in about three minutes, and their scores appear here.
        </p>
      ) : (
        <>
          <div className="pv-scroll">
            <table>
              <caption className="pv-sub" style={{ captionSide: "top", textAlign: "left", paddingBottom: 4 }}>
                ICIQ-UI SF (0 to 21, lower is better)
              </caption>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Administered</th>
                  <th className="pv-num">Total</th>
                  <th className="pv-num">Severity</th>
                </tr>
              </thead>
              <tbody>
                {checks.map((check) => (
                  <tr key={`iciq-${check.id || check.checkID}`}>
                    <td>{shortDate(check.date)}</td>
                    <td>{milestoneLabel(Number(check.milestone) || 0)}</td>
                    <td className="pv-num">{check.iciqTotal ?? "—"}</td>
                    <td className="pv-num">{iciqSeverity(check.iciqTotal)?.clinical || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pv-scroll" style={{ marginTop: 14 }}>
            <table>
              <caption className="pv-sub" style={{ captionSide: "top", textAlign: "left", paddingBottom: 4 }}>
                PFDI-20 (subscales 0 to 100, total 0 to 300, lower is better)
              </caption>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Administered</th>
                  {PFDI_SUBSCALES.map((s) => (
                    <th key={s.id} className="pv-num">{s.shortName}</th>
                  ))}
                  <th className="pv-num">Total</th>
                </tr>
              </thead>
              <tbody>
                {checks.map((check) => (
                  <tr key={`pfdi-${check.id || check.checkID}`}>
                    <td>{shortDate(check.date)}</td>
                    <td>{milestoneLabel(Number(check.milestone) || 0)}</td>
                    <td className="pv-num">{round(check.popdiScore)}</td>
                    <td className="pv-num">{round(check.cradiScore)}</td>
                    <td className="pv-num">{round(check.udiScore)}</td>
                    <td className="pv-num">{round(check.pfdiTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {leakSituationLine(checks) && <p className="pv-note">{leakSituationLine(checks)}</p>}
        </>
      )}

      <h2>Bladder diary</h2>
      {diaryDays.length === 0 ? (
        <p className="pv-empty">
          No diary entries in this period. A 3-day diary is the usual ask before a
          first appointment.
        </p>
      ) : (
        <div className="pv-scroll">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th className="pv-num">Trips</th>
                <th className="pv-num">Night</th>
                <th className="pv-num">Leaks</th>
                <th className="pv-num">Urges</th>
                <th className="pv-num">Urge level</th>
                <th className="pv-num">Fluid ({unit})</th>
              </tr>
            </thead>
            <tbody>
              {diaryDays.map((day) => (
                <tr key={day.date.getTime()}>
                  <td>{shortDate(day.date)}</td>
                  <td className="pv-num">{day.voids}</td>
                  <td className="pv-num">{day.nightVoids}</td>
                  <td className="pv-num">
                    {day.leaks}
                    {day.largerLeaks > 0 ? ` (${day.largerLeaks} larger)` : ""}
                  </td>
                  <td className="pv-num">{day.urges}</td>
                  <td className="pv-num">
                    {day.averageUrgency == null ? "—" : day.averageUrgency.toFixed(1)}
                  </td>
                  <td className="pv-num">
                    {day.fluidMillilitres > 0 ? volumeDisplayValue(day.fluidMillilitres) : "—"}
                    {day.irritantDrinks > 0 ? ` (${day.irritantDrinks} irritant)` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2>Daily check-ins</h2>
      {rangeCheckIns.length === 0 ? (
        <p className="pv-empty">No check-ins in this period.</p>
      ) : (
        <div className="pv-scroll">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Leaks</th>
                <th className="pv-num">Discomfort (0–10)</th>
                <th className="pv-num">Energy (1–5)</th>
                <th>Mood</th>
              </tr>
            </thead>
            <tbody>
              {rangeCheckIns.map((row) => (
                <tr key={row.id}>
                  <td>{row.id || shortDate(row.date)}</td>
                  <td>{row.leakLevel || "—"}</td>
                  <td className="pv-num">{row.painLevel ?? "—"}</td>
                  <td className="pv-num">{row.energyLevel ?? "—"}</td>
                  <td>{row.mood || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2>How to read this</h2>
      <p className="pv-note">
        Bladder diary events are logged at the moment they happen rather than recalled
        later. {NIGHT_WINDOW_DESCRIPTION}. Sessions are counted when a day of the
        program was finished. "Sticking with it" compares completed sessions against{" "}
        {SESSIONS_PER_WEEK} a week, which is what the program asks for.
      </p>
      <p className="pv-note">
        Pelvi is an exercise program, not a diagnosis. Nothing in this report is a
        clinical assessment.
      </p>
    </div>
  );
}

function Cell({ label, value, caption }) {
  return (
    <div className="pv-cell">
      <dt>{label}</dt>
      <dd>
        {value}
        {caption ? <span className="pv-caption">{caption}</span> : null}
      </dd>
    </div>
  );
}

// --- Helpers ---------------------------------------------------------------

function shortDate(value) {
  const d = toDate(value);
  if (!d) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "2-digit" });
}

function round(value) {
  return value == null ? "—" : Math.round(value);
}

function plural(count, word) {
  return count === 1 ? word : `${word}s`;
}

function durationText(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

function firstDate(completions, fallback) {
  const dates = (completions || []).map((c) => toDate(c.completedAt)).filter(Boolean);
  if (!dates.length) return fallback;
  return new Date(Math.min(...dates.map((d) => d.getTime())));
}

/** Which leak patterns she ticked, spelled out for the clinician. */
function leakSituationLine(checks) {
  const latest = [...checks].reverse().find((c) => c.iciqSituations);
  if (!latest?.iciqSituations) return null;
  const labels = {
    never: "never",
    beforeToilet: "before reaching the toilet",
    coughSneeze: "with coughing or sneezing",
    asleep: "when asleep",
    activity: "with physical activity",
    afterFinishing: "after finishing and dressed",
    noReason: "for no obvious reason",
    allTheTime: "all the time",
  };
  const list = String(latest.iciqSituations)
    .split(",")
    .map((id) => labels[id.trim()])
    .filter(Boolean);
  if (!list.length) return null;
  return `Self-reported leak pattern (ICIQ item 4, unscored): ${list.join(", ")}.`;
}

