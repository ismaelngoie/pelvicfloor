"use client";

// The daily check-in.
//
// Same five questions the phone asks, written to the same
// users/{id}/checkins/{yyyy-MM-dd} document, so answering here means the phone
// does not ask again today. Which questions appear depends on her goal: leaks
// are only asked of the two goals that are about leaks.

import { useCallback, useEffect, useState } from "react";
import { Check, ClipboardCheck } from "lucide-react";
import { useMember } from "./MemberProvider";
import { Card, PrimaryButton, Sheet } from "./ui";
import { fetchCheckIn, saveCheckIn } from "@/lib/memberData";
import { goalFeelingQuestion, showsLeakQuestion, showsPainQuestion } from "@/lib/goalCopy";

const LEAK_LEVELS = ["None", "A Few", "Several"];
const MOODS = [
  { value: "😊", label: "Good" },
  { value: "😐", label: "Okay" },
  { value: "😔", label: "Low" },
];

export default function CheckInCard({ dateKey }) {
  const { member, goalId } = useMember();
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [leakLevel, setLeakLevel] = useState("None");
  const [painLevel, setPainLevel] = useState(0);
  const [mood, setMood] = useState("😊");
  const [energyLevel, setEnergyLevel] = useState(3);
  const [goalFeeling, setGoalFeeling] = useState(3);

  const asksLeaks = showsLeakQuestion(goalId);
  const asksPain = showsPainQuestion(goalId);

  useEffect(() => {
    let cancelled = false;
    if (!member?.id) return undefined;
    fetchCheckIn(member.id, dateKey)
      .then((record) => {
        if (cancelled || !record) return;
        setSaved(record);
        if (record.leakLevel) setLeakLevel(record.leakLevel);
        if (typeof record.painLevel === "number") setPainLevel(record.painLevel);
        if (record.mood) setMood(record.mood);
        if (typeof record.energyLevel === "number") setEnergyLevel(record.energyLevel);
        if (typeof record.goalFeeling === "number") setGoalFeeling(record.goalFeeling);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [member?.id, dateKey]);

  const submit = useCallback(async () => {
    if (!member?.id) return;
    setSaving(true);
    setError(null);
    try {
      const values = {
        leakLevel: asksLeaks ? leakLevel : null,
        painLevel: asksPain ? painLevel : null,
        mood,
        energyLevel,
        goalFeeling,
      };
      await saveCheckIn(member.id, dateKey, values);
      setSaved({ ...values, date: new Date() });
      setOpen(false);
    } catch {
      setError("We could not save that. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }, [member?.id, dateKey, asksLeaks, asksPain, leakLevel, painLevel, mood, energyLevel, goalFeeling]);

  return (
    <>
      <Card className="mt-5">
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-app-positive/12">
            {saved ? (
              <Check className="h-6 w-6 text-app-positive" strokeWidth={3} aria-hidden="true" />
            ) : (
              <ClipboardCheck className="h-6 w-6 text-app-positive" aria-hidden="true" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-[17px] font-bold leading-tight text-app-textPrimary">
              Today&apos;s Check-In
            </h2>
            <p className="mt-0.5 text-[13px] text-app-textSecondary">
              {saved
                ? "Saved. It helps us shape tomorrow."
                : "A few taps. It helps us shape your plan."}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 flex h-12 w-full items-center justify-center rounded-full border border-app-borderIdle bg-white text-[15px] font-semibold text-app-textPrimary"
        >
          {saved ? "Change my answers" : "Start the check-in"}
        </button>
      </Card>

      <Sheet open={open} onClose={() => setOpen(false)} title="Today's Check-In">
        <div className="space-y-6 pb-4">
          {asksLeaks && (
            <fieldset>
              <legend className="text-[15px] font-bold text-app-textPrimary">
                Any leaks yesterday?
              </legend>
              <div className="mt-3 flex gap-2">
                {LEAK_LEVELS.map((level) => (
                  <Choice
                    key={level}
                    label={level}
                    selected={leakLevel === level}
                    onClick={() => setLeakLevel(level)}
                  />
                ))}
              </div>
            </fieldset>
          )}

          {asksPain && (
            <Slider
              label="How much discomfort yesterday?"
              value={painLevel}
              min={0}
              max={10}
              suffix="/ 10"
              onChange={setPainLevel}
            />
          )}

          <fieldset>
            <legend className="text-[15px] font-bold text-app-textPrimary">
              How are you feeling today?
            </legend>
            <div className="mt-3 flex gap-3">
              {MOODS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setMood(option.value)}
                  aria-pressed={mood === option.value}
                  aria-label={option.label}
                  className={`grid h-16 flex-1 place-items-center rounded-2xl border text-3xl ${
                    mood === option.value
                      ? "border-ios-pink bg-ios-pink/8"
                      : "border-app-borderIdle bg-white"
                  }`}
                >
                  <span aria-hidden="true">{option.value}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <Slider
            label="How is your energy today?"
            value={energyLevel}
            min={1}
            max={5}
            suffix="/ 5"
            onChange={setEnergyLevel}
          />

          <Slider
            label={goalFeelingQuestion(goalId)}
            value={goalFeeling}
            min={1}
            max={5}
            suffix="/ 5"
            onChange={setGoalFeeling}
          />

          {error && <p role="alert" className="text-[14px] text-app-primary">{error}</p>}

          <PrimaryButton onClick={submit} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </PrimaryButton>
        </div>
      </Sheet>
    </>
  );
}

function Choice({ label, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`h-12 flex-1 rounded-full border text-[14px] font-semibold ${
        selected
          ? "border-ios-pink bg-ios-pink text-white"
          : "border-app-borderIdle bg-white text-app-textPrimary"
      }`}
    >
      {label}
    </button>
  );
}

function Slider({ label, value, min, max, suffix, onChange }) {
  const id = `checkin-${label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[15px] font-bold text-app-textPrimary">
          {label}
        </label>
        <span className="shrink-0 text-[13px] font-bold tabular-nums text-app-textSecondary">
          {value} {suffix}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-3 h-11 w-full accent-ios-pink"
      />
    </div>
  );
}
