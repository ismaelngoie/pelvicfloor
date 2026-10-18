"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ClipboardCheck } from "lucide-react";
import { useMember } from "./MemberProvider";
import { Card, PrimaryButton, Sheet } from "./ui";
import { fetchCheckIn, saveCheckIn } from "@/lib/memberData";
import { focusData } from "@/components/funnel/appCopy";
import { answersToCheckIn, checkInAnswers, dailyTrackingPlan, canSaveDailyCheckIn } from "@/lib/dailyTracking";
import { FIXTURES_ON } from "@/lib/devFixtures";

export default function CheckInCard({ dateKey, roomOnly = false, onClose, onSaved }) {
  const { member, goalId, focusId, pathway, reloadHistory } = useMember();
  const plan = useMemo(() => dailyTrackingPlan(goalId, pathway || member?.pathway, focusData(pathway || member?.pathway, goalId, focusId)), [goalId, focusId, pathway, member?.pathway]);
  const [open, setOpen] = useState(roomOnly);
  const close = () => { setOpen(false); onClose?.(); };
  const [answers, setAnswers] = useState({});
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);
  const localOnly = process.env.NODE_ENV !== "production" && FIXTURES_ON;
  useEffect(() => {
    let cancelled = false;
    setAnswers({}); setSaved(false); setError(null); setLoadFailed(false); setLoading(true);
    if (!member?.id || localOnly) { setLoading(false); return undefined; }
    fetchCheckIn(member.id, dateKey, goalId).then((record) => {
      if (cancelled || !record) return;
      const next = checkInAnswers(record);
      setAnswers(next); setSaved(Object.keys(next).length > 0);
    }).catch(() => { if (!cancelled) { setLoadFailed(true); setError("We could not load today's answers. Try again before replacing an existing check-in."); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [member?.id, dateKey, goalId, localOnly, reloadToken]);
  const submit = useCallback(async () => {
    if (!member?.id || !canSaveDailyCheckIn({ answers, loading, loadFailed, saving })) return;
    setSaving(true); setError(null);
    try {
      if (!localOnly) await saveCheckIn(member.id, dateKey, answersToCheckIn(answers, goalId));
      setSaved(true); setOpen(false); onSaved?.(answersToCheckIn(answers, goalId)); onClose?.();
      if (!localOnly) { try { await reloadHistory?.(); } catch { /* The check-in itself is already saved. */ } }
    } catch { setError("We could not save that. Check your connection and try again."); }
    finally { setSaving(false); }
  }, [member?.id, dateKey, answers, goalId, localOnly, loading, loadFailed, saving, reloadHistory, onSaved, onClose]);
  return <>
    {!roomOnly && <Card className="mt-5"><div className="flex items-center gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-app-positive/10">{saved ? <Check className="h-6 w-6 text-app-positive" aria-hidden="true" /> : <ClipboardCheck className="h-6 w-6 text-app-positive" aria-hidden="true" />}</span><span><h2 className="text-[17px] font-bold text-app-textPrimary">Today's Check-In</h2><p className="mt-1 text-[13px] text-app-textSecondary">{saved ? plan.completion : plan.subtitle}</p></span></div><button onClick={() => setOpen(true)} className="mt-4 min-h-12 w-full rounded-full border border-app-borderIdle bg-white px-4 text-[15px] font-semibold text-app-textPrimary">{saved ? "Change my answers" : "Start the check-in"}</button></Card>}
    <Sheet open={open} onClose={close} title="Today's Check-In"><div className="space-y-6 pb-4"><p className="text-[13px] leading-snug text-app-textSecondary">One answer is enough. Add the others when you want more context.</p>
      {loading && <p role="status" className="text-[13px] text-atelier-ink3">Loading your saved answers…</p>}
      {plan.prompts.map((prompt) => <fieldset key={prompt.slot} disabled={loading || loadFailed || saving}><legend className="text-[15px] font-bold text-app-textPrimary">{prompt.question}</legend><div className="mt-3 flex gap-2">{prompt.choices.map((choice) => <button key={choice.value} type="button" aria-pressed={answers[prompt.slot] === choice.value} onClick={() => setAnswers((previous) => { const next = { ...previous }; if (next[prompt.slot] === choice.value) delete next[prompt.slot]; else next[prompt.slot] = choice.value; return next; })} className={`min-h-[48px] min-w-0 flex-1 rounded-[14px] border px-2 py-3 text-[13px] font-semibold disabled:opacity-50 ${answers[prompt.slot] === choice.value ? "border-ios-pink bg-ios-pink/10 text-ios-pink" : "border-app-borderIdle bg-white text-app-textPrimary"}`}>{choice.title}</button>)}</div></fieldset>)}
      {error && <p role="alert" className="text-[13px] text-atelier-rose">{error}</p>}
      {loadFailed && <button type="button" onClick={() => setReloadToken((token) => token + 1)} className="min-h-11 text-[13px] font-semibold text-atelier-rose">Try loading again</button>}
      <PrimaryButton onClick={submit} disabled={!canSaveDailyCheckIn({ answers, loading, loadFailed, saving })}>{saving ? "Saving..." : "Save check-in"}</PrimaryButton>
    </div></Sheet>
  </>;
}
