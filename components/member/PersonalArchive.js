"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, Clock, FileText, Headphones, Share2 } from "lucide-react";
import { Sheet } from "./ui";
import { useMember } from "./MemberProvider";
import AudioHub from "./AudioHub";
import { archiveDay, archiveDuration, archiveSnapshot, weeklyReportText } from "@/lib/personalArchive";
import { readAudioJourney, AUDIO_JOURNEY_EVENT } from "@/lib/audioJourney";
import { audioSessionById, audioSessionsFor } from "@/lib/audioCatalog";
import { readAudioRituals } from "./AudioRituals";
import { savedCoachAnswers, toggleCoachAnswer } from "@/lib/ai/savedCoachAnswers";
import { parseCoachReply } from "@/lib/ai/coachMia";
import { loadInsightArticles } from "@/lib/ai/insightLibrary";
import { focusData } from "@/components/funnel/appCopy";
import { fetchRecentCheckIns, fetchRecentEvents } from "@/lib/memberData";
import { fetchCompletions } from "@/lib/memberStore";
import { FIXTURES_ON } from "@/lib/devFixtures";
import { memberPathway } from "@/lib/dailyTracking";

const PAGES = [["history", "Activity History", Clock], ["reports", "Weekly Reports", FileText], ["audio", "Saved Audios", Headphones], ["answers", "Saved Coach Answers", Bookmark], ["reading", "Saved Reading", Bookmark]];
const merge = (a = [], b = []) => [...new Map([...a, ...b].map((row) => [row.id || row.checkID || `${row.programID}:${row.day}`, row])).values()];
const dateLabel = (date) => new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });

export default function PersonalArchive({ open, onClose, member, events = [], completions = [], checkIns = [], outcomeChecks = [], diaryEntries = [] }) {
  const provider = useMember();
  const router = useRouter();
  const [page, setPage] = useState("history");
  const [month, setMonth] = useState("");
  const [week, setWeek] = useState("");
  const [journey, setJourney] = useState({ records: [], favorites: {} });
  const [rituals, setRituals] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [articles, setArticles] = useState([]);
  const [accountData, setAccountData] = useState({});
  const [historyWarning, setHistoryWarning] = useState(null);
  const [shareStatus, setShareStatus] = useState(null);
  const [audioId, setAudioId] = useState(null);
  const goalId = member?.goal || provider.goalId;
  const pathway = provider.pathway || memberPathway(member, goalId);
  const refresh = useCallback(() => {
    setJourney(readAudioJourney(member?.id));
    setRituals(readAudioRituals(member?.id).records || []);
    setAnswers(savedCoachAnswers(member?.id));
  }, [member?.id]);
  useEffect(() => {
    if (!open) return undefined;
    refresh();
    loadInsightArticles().then(setArticles).catch(() => {});
    window.addEventListener(AUDIO_JOURNEY_EVENT, refresh); window.addEventListener("storage", refresh);
    return () => { window.removeEventListener(AUDIO_JOURNEY_EVENT, refresh); window.removeEventListener("storage", refresh); };
  }, [open, refresh]);
  useEffect(() => {
    if (!open || !member?.id) return undefined;
    setAccountData({}); setHistoryWarning(null);
    if (process.env.NODE_ENV !== "production" && FIXTURES_ON) return undefined;
    let cancelled = false;
    Promise.allSettled([fetchRecentEvents(member.id, 5000), fetchRecentCheckIns(member.id, 1000), fetchCompletions(member.id)]).then((results) => {
      if (cancelled) return;
      const [watch, checks, days] = results;
      setAccountData({ events: watch.status === "fulfilled" ? watch.value : [], checkIns: checks.status === "fulfilled" ? checks.value : [], completions: days.status === "fulfilled" ? days.value : [] });
      if (results.some((result) => result.status === "rejected")) setHistoryWarning("Some older account records could not load. The available records are shown below.");
    });
    return () => { cancelled = true; };
  }, [open, member?.id]);
  const snapshot = useMemo(() => archiveSnapshot({ member, goalId, events: merge(events, accountData.events), completions: merge(completions, accountData.completions), checkIns: merge(checkIns, accountData.checkIns), audioRecords: journey.records, ritualRecords: rituals, answers, outcomeChecks, diaryEntries, focus: focusData(pathway, goalId, provider.focusId) }), [member, goalId, pathway, provider.focusId, events, completions, checkIns, accountData, journey, rituals, answers, outcomeChecks, diaryEntries]);
  const report = snapshot.weeklyReports.find((entry) => entry.id === week) || snapshot.weeklyReports[0];
  const days = snapshot.days.filter((entry) => !month || entry.date.startsWith(month));
  const savedAudio = audioSessionsFor(goalId, pathway, provider.focusId).filter((session) => journey.favorites[session.id]?.isFavorite);
  const readings = (member?.savedArticleIDs || []).map((id) => articles.find((article) => article.id === id)).filter(Boolean);
  const share = async () => {
    const text = weeklyReportText(report, provider.goal?.title);
    try {
      if (navigator.share) await navigator.share({ title: "My Weekly Progress", text });
      else { await navigator.clipboard.writeText(text); setShareStatus("Weekly report copied."); }
    } catch (error) { if (error?.name !== "AbortError") setShareStatus("Sharing was unavailable. You can select and copy the weekly summary below."); }
  };
  return <>
    <Sheet open={open} onClose={onClose} title="Your Progress History">
      <div className="pb-6"><p className="font-serif text-[26px] text-atelier-ink">Everything You Have Done</p><p className="mt-2 text-[13px] leading-snug text-atelier-ink2">Your recorded workouts, guided audio and private check-ins, together by date.</p>
        <nav className="mt-4 flex gap-2 overflow-x-auto pb-2 no-scrollbar" aria-label="Archive sections">{PAGES.map(([id, label, Icon]) => <button key={id} type="button" aria-pressed={page === id} onClick={() => setPage(id)} className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-[12px] font-semibold ${page === id ? "border-atelier-rose bg-atelier-rose/10 text-atelier-rose" : "border-atelier-line text-atelier-ink2"}`}><Icon className="h-4 w-4" aria-hidden="true" />{label}</button>)}</nav>
        {historyWarning && <p role="status" className="mt-3 text-[12px] text-atelier-ink3">{historyWarning}</p>}
        {page === "history" && <section className="mt-5"><h3 className="font-serif text-[23px] text-atelier-ink">Your Progress by Date</h3><label className="mt-3 block text-[12px] font-semibold text-atelier-ink2">Month<select value={month} onChange={(event) => setMonth(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-atelier-line bg-white px-3"><option value="">Available history · last 2 years</option>{snapshot.months.map((value) => <option key={value} value={value}>{new Date(`${value}-01T12:00:00`).toLocaleDateString(undefined, { month: "long", year: "numeric" })}</option>)}</select></label>{days.length ? days.map((day) => <section key={day.date} className="mt-6"><h4 className="text-[13px] font-bold text-atelier-ink">{dateLabel(day.date)}</h4><ol className="mt-2 space-y-2">{day.entries.map((entry) => <li key={entry.id} className="rounded-[16px] border border-atelier-line bg-atelier-paper p-3"><p className="text-[11px] capitalize text-atelier-ink3">{entry.kind.replace(/([A-Z])/g, " $1")}</p><p className="mt-1 text-[14px] font-semibold text-atelier-ink">{entry.title}</p><p className="mt-1 text-[12px] leading-snug text-atelier-ink2">{entry.detail}</p></li>)}</ol></section>) : <Empty text="Complete a session or save a check-in to begin your timeline." />}</section>}
        {page === "reports" && report && <section className="mt-5"><label className="block text-[12px] font-semibold text-atelier-ink2">Week<select value={report.id} onChange={(event) => setWeek(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-atelier-line bg-white px-3">{snapshot.weeklyReports.map((entry) => <option key={entry.id} value={entry.id}>{entry.isCurrent ? "This Week So Far" : `Week of ${entry.start.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`}</option>)}</select></label><div className="mt-4 grid grid-cols-2 gap-3">{[["Completed sessions", report.workoutSessions], ["Workout time", archiveDuration(report.workoutSeconds)], ["Guided audios", report.audioSessions], ["Audio time", archiveDuration(report.audioSeconds)], ["Daily check-ins", report.checkInCount], ["Body tracking", report.bodyTrackingCount], ["Private rituals", report.ritualCount], ["Saved Coach answers", report.savedAnswerCount]].map(([title, value]) => <div key={title} className="rounded-[16px] border border-atelier-line bg-atelier-paper p-3"><p className="text-[20px] font-bold text-atelier-ink">{value}</p><p className="mt-1 text-[11px] text-atelier-ink3">{title}</p></div>)}</div>{report.promptTrends.length > 0 && <section className="mt-5"><h4 className="text-[15px] font-bold text-atelier-ink">Daily tracking</h4>{report.promptTrends.map((trend) => <p key={trend.title} className="mt-2 text-[13px] text-atelier-ink2">{trend.title}: {trend.count === 1 ? `1 answer · ${trend.latest}` : `${trend.count} answers · ${trend.first} → ${trend.latest}`}</p>)}</section>}{report.mostHelpful && <p className="mt-4 rounded-xl bg-atelier-sage/10 p-3 text-[13px] text-atelier-ink">Your feedback shows {report.mostHelpful.title} felt better after {report.mostHelpful.better} of {report.mostHelpful.total} completed listens.</p>}{report.isCurrent && provider.adaptationSummary && <p className="mt-4 text-[13px] text-atelier-ink2">{provider.adaptationSummary}</p>}<button onClick={share} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-atelier-rose px-5 text-[13px] font-semibold text-white"><Share2 className="h-4 w-4" aria-hidden="true" />Share weekly report</button>{shareStatus && <p role="status" className="mt-2 text-[12px] text-atelier-ink3">{shareStatus}</p>}<details className="mt-4"><summary className="text-[12px] text-atelier-ink3">Plain text summary</summary><pre className="mt-3 whitespace-pre-wrap text-[12px] leading-relaxed text-atelier-ink2">{weeklyReportText(report, provider.goal?.title)}</pre></details></section>}
        {page === "audio" && <section className="mt-5"><h3 className="font-serif text-[23px] text-atelier-ink">Your Sessions, Ready Again</h3>{savedAudio.length ? savedAudio.map((session) => <button key={session.id} onClick={() => setAudioId(session.id)} className="mt-3 block min-h-14 w-full rounded-[18px] border border-atelier-line bg-atelier-paper p-4 text-left"><strong className="text-[14px] text-atelier-ink">{session.title}</strong><span className="mt-1 block text-[12px] text-atelier-ink3">{session.subtitle}</span></button>) : <Empty text="Tap the heart on a guided audio to keep it here." />}</section>}
        {page === "answers" && <section className="mt-5"><h3 className="font-serif text-[23px] text-atelier-ink">Answers You Chose to Keep</h3>{answers.length ? answers.map((answer) => <article key={answer.id} className="mt-3 rounded-[18px] border border-atelier-line bg-atelier-paper p-4"><p className="whitespace-pre-wrap text-[14px] leading-relaxed text-atelier-ink">{parseCoachReply(answer.text).body}</p><button className="mt-3 min-h-9 text-[12px] font-semibold text-atelier-rose" onClick={() => setAnswers(toggleCoachAnswer(member?.id, answer, answer.goal))}>Remove saved answer</button></article>) : <Empty text="Save a helpful Coach Mia answer with its bookmark to keep it here." />}</section>}
        {page === "reading" && <section className="mt-5"><h3 className="font-serif text-[23px] text-atelier-ink">Saved Reading</h3>{readings.length ? readings.map((article) => <button key={article.id} onClick={() => { onClose(); router.push(`/app/insights?article=${encodeURIComponent(article.id)}`); }} className="mt-3 block w-full rounded-[18px] border border-atelier-line bg-atelier-paper p-4 text-left"><strong className="text-[14px] text-atelier-ink">{article.title}</strong><span className="mt-1 block text-[12px] text-atelier-ink2">{article.summary}</span><span className="mt-2 block text-[11px] text-atelier-ink3">Reviewed {article.clinical?.reviewedDate} · Sources included</span></button>) : <Empty text="Bookmark an Insights article to keep it here." />}</section>}
        <p className="mt-6 text-[11px] leading-snug text-atelier-ink3">Only recorded activity is included. Audio history, private rituals and saved Coach answers are stored in this browser. The archive does not infer intimacy or intercourse from cycle records.</p>
      </div>
    </Sheet>
    {audioId && <AudioHub memberId={member?.id} goalId={goalId} pathway={pathway} focusId={provider.focusId} programDay={provider.currentDayNumber} graduated={provider.graduated} completions={completions} initialSessionId={audioId} onClose={() => { setAudioId(null); refresh(); }} />}
  </>;
}
function Empty({ text }) { return <p className="mt-5 rounded-[18px] bg-atelier-paper p-5 text-[14px] leading-snug text-atelier-ink2">{text}</p>; }
