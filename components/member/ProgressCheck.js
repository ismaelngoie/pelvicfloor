"use client";

// The progress check: ICIQ-UI SF and PFDI-20, ported from
// "Pelvic Floor/Core/Clinical/OutcomeMeasures.swift" (ProgressCheckView).
//
// One question per screen, on purpose. Twenty-four questions in a single scroll
// looks like homework; twenty-four single taps feels like a conversation, and it
// keeps every screen readable at any text size.
//
// Two things are carried over exactly and must not be softened:
//   • The item wording is the standard wording. See outcomeMeasures.js.
//   • Interference is eleven tap targets, not a slider. A slider parked at the
//     far left looks answered and never fires its setter, so an untouched item
//     gets filed as a real 0 and can drop her a whole severity band. Every
//     value, including 0, needs a tap, and an unanswered item stays null so the
//     total correctly refuses to publish a number.

import { useEffect, useMemo, useState } from "react";
import { ClipboardList } from "lucide-react";
import { Sheet } from "./ui";
import { AnswerButton } from "./youUI";
import {
  ICIQ, PFDI, PFDI_ITEMS, PFDI_SUBSCALES, iciqSeverity, iciqTotal, pfdiPlainBand,
  pfdiSubscaleScore, pfdiTotal,
} from "./outcomeMeasures";
import { saveOutcomeCheck } from "./youStore";

const TOTAL_QUESTIONS = 4 + PFDI_ITEMS.length; // 24
const SUMMARY_STEP = TOTAL_QUESTIONS + 1;

export default function ProgressCheck({
  open, onClose, memberId, milestone = 0, programDay = 0, onSaved,
}) {
  const [step, setStep] = useState(0);
  const [iciq, setIciq] = useState({ frequency: null, amount: null, interference: null, situations: [] });
  const [pfdi, setPfdi] = useState({});
  const [saved, setSaved] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setIciq({ frequency: null, amount: null, interference: null, situations: [] });
    setPfdi({});
    setSaved(false);
    setSaveFailed(false);
  }, [open]);

  const total = iciqTotal(iciq);
  const severity = iciqSeverity(total);
  const pfdiScore = pfdiTotal(pfdi);

  const finish = async () => {
    if (saved) return;
    setSaved(true);
    try {
      await store();
    } catch {
      // Three minutes of answers that did not reach her account. She is told,
      // on the summary, rather than left to find out at an appointment.
      setSaveFailed(true);
    }
  };

  const store = async () => {
    const record = await saveOutcomeCheck(memberId, {
      milestone,
      programDay,
      iciqTotal: total,
      iciqFrequency: iciq.frequency,
      iciqAmount: iciq.amount,
      iciqInterference: iciq.interference,
      iciqSituations: iciq.situations.length ? iciq.situations.join(",") : null,
      popdiScore: pfdiSubscaleScore(pfdi, "popdi"),
      cradiScore: pfdiSubscaleScore(pfdi, "cradi"),
      udiScore: pfdiSubscaleScore(pfdi, "udi"),
      pfdiTotal: pfdiScore,
      answersJSON: JSON.stringify({ iciq, pfdi }),
    });
    if (record) onSaved?.(record);
  };

  const advance = () => {
    const next = step + 1;
    if (next === SUMMARY_STEP) finish();
    setStep(next);
  };

  const goBack = () => setStep((s) => Math.max(0, s - 1));

  const toggleSituation = (id) => {
    setIciq((prev) => {
      // "Never" cannot sit alongside a list of times it happens.
      if (id === "never") {
        return { ...prev, situations: prev.situations.includes("never") ? [] : ["never"] };
      }
      const without = prev.situations.filter((s) => s !== "never");
      return {
        ...prev,
        situations: without.includes(id) ? without.filter((s) => s !== id) : [...without, id],
      };
    });
  };

  const title = step === SUMMARY_STEP ? "All done" : "Progress Check";

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="pb-6">
        {step > 0 && step < SUMMARY_STEP && (
          <div className="mb-4">
            <div
              className="h-1.5 overflow-hidden rounded-full bg-app-borderIdle"
              role="progressbar"
              aria-valuenow={step}
              aria-valuemin={0}
              aria-valuemax={TOTAL_QUESTIONS}
              aria-label={`Question ${step} of ${TOTAL_QUESTIONS}`}
            >
              <span
                className="block h-full rounded-full bg-app-primary transition-[width]"
                style={{ width: `${(step / TOTAL_QUESTIONS) * 100}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={goBack}
                className="text-[13.5px] font-semibold text-app-textSecondary"
              >
                Back
              </button>
              <p className="text-[12px] tabular-nums text-app-textSecondary">
                Question {step} of {TOTAL_QUESTIONS}
              </p>
            </div>
          </div>
        )}

        {step === 0 && <Intro milestone={milestone} onStart={advance} onClose={onClose} />}

        {step === 1 && (
          <Question
            question={ICIQ.frequencyQuestion}
            hint="Think about the last 4 weeks."
            options={ICIQ.frequencyOptions}
            selected={iciq.frequency}
            onPick={(score) => { setIciq((p) => ({ ...p, frequency: score })); advance(); }}
          />
        )}

        {step === 2 && (
          <Question
            question={ICIQ.amountQuestion}
            hint="Protection means a pad, a liner or period pants."
            options={ICIQ.amountOptions}
            selected={iciq.amount}
            onPick={(score) => { setIciq((p) => ({ ...p, amount: score })); advance(); }}
          />
        )}

        {step === 3 && (
          <Question
            question={ICIQ.interferenceQuestion}
            hint="0 means not at all, 10 means a great deal. Tap the number that fits."
            options={Array.from({ length: 11 }, (_, score) => ({
              score,
              text:
                score === 0
                  ? `0. ${ICIQ.interferenceLowLabel}`
                  : score === 10
                    ? `10. ${ICIQ.interferenceHighLabel}`
                    : `${score}`,
            }))}
            selected={iciq.interference}
            onPick={(score) => { setIciq((p) => ({ ...p, interference: score })); advance(); }}
          />
        )}

        {step === 4 && (
          <div>
            <Prompt question={ICIQ.situationQuestion} hint={ICIQ.situationHelp} />
            <div className="mt-4 space-y-2.5">
              {ICIQ.situations.map((situation) => (
                <AnswerButton
                  key={situation.id}
                  title={situation.text}
                  checkmark
                  selected={iciq.situations.includes(situation.id)}
                  onClick={() => toggleSituation(situation.id)}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={advance}
              className="mt-5 h-[52px] w-full rounded-full bg-ios-pink text-[16px] font-bold text-white"
            >
              Next
            </button>
          </div>
        )}

        {step >= 5 && step <= TOTAL_QUESTIONS && (
          <BotherItem
            item={PFDI_ITEMS[step - 5]}
            value={pfdi[PFDI_ITEMS[step - 5].id]}
            onSet={(value) => setPfdi((p) => ({ ...p, [PFDI_ITEMS[step - 5].id]: value }))}
            onAdvance={advance}
            onSkip={() => {
              setPfdi((p) => {
                const next = { ...p };
                delete next[PFDI_ITEMS[step - 5].id];
                return next;
              });
              advance();
            }}
          />
        )}

        {step === SUMMARY_STEP && (
          <Summary
            total={total}
            severity={severity}
            pfdi={pfdi}
            pfdiScore={pfdiScore}
            saveFailed={saveFailed}
            onDone={onClose}
          />
        )}
      </div>
    </Sheet>
  );
}

function Intro({ milestone, onStart, onClose }) {
  return (
    <div>
      <span
        className="grid h-14 w-14 place-items-center rounded-2xl"
        style={{ backgroundImage: "linear-gradient(180deg, #F0708C 0%, #E65473 100%)" }}
      >
        <ClipboardList className="h-7 w-7 text-white" aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-[24px] font-bold leading-tight text-app-textPrimary">
        {milestone === 1 ? "Let's get your starting point" : "Time for a progress check"}
      </h3>
      <p className="mt-2 text-[15px] leading-snug text-app-textSecondary">
        These are the same two sets of questions a pelvic floor doctor or therapist
        uses. Answering them now gives your progress a number, and puts it on the
        report you can hand over at an appointment.
      </p>
      <ul className="mt-4 space-y-2.5">
        <Bullet>About 3 minutes. One question at a time.</Bullet>
        <Bullet>Private. It is stored on your own account and only leaves it when you share it.</Bullet>
        <Bullet>Some questions are personal. Skip any you would rather not answer.</Bullet>
      </ul>
      <button
        type="button"
        onClick={onStart}
        className="mt-6 h-[52px] w-full rounded-full bg-ios-pink text-[16px] font-bold text-white"
      >
        Start
      </button>
      <button
        type="button"
        onClick={onClose}
        className="mt-3 h-11 w-full text-[14px] font-semibold text-app-textSecondary"
      >
        Not now
      </button>
    </div>
  );
}

function Bullet({ children }) {
  return (
    <li className="flex items-start gap-2.5 text-[14px] leading-snug text-app-textSecondary">
      <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-app-primary" aria-hidden="true" />
      <span className="min-w-0">{children}</span>
    </li>
  );
}

function Prompt({ question, hint }) {
  return (
    <div>
      <h3 className="text-[19px] font-semibold leading-snug text-app-textPrimary">{question}</h3>
      {hint && <p className="mt-2 text-[14px] leading-snug text-app-textSecondary">{hint}</p>}
    </div>
  );
}

function Question({ question, hint, options, selected, onPick }) {
  return (
    <div>
      <Prompt question={question} hint={hint} />
      <div className="mt-4 space-y-2.5">
        {options.map((option) => (
          <AnswerButton
            key={option.score}
            title={option.text}
            selected={selected === option.score}
            onClick={() => onPick(option.score)}
          />
        ))}
      </div>
    </div>
  );
}

function BotherItem({ item, value, onSet, onAdvance, onSkip }) {
  const present = (value ?? 0) > 0;
  return (
    <div>
      <Prompt question={item.question} hint={item.hint} />
      <div className="mt-4 space-y-2.5">
        <AnswerButton
          title={PFDI.absentText}
          selected={value === 0}
          onClick={() => { onSet(0); onAdvance(); }}
        />
        <AnswerButton
          title="Yes, I do"
          selected={present}
          onClick={() => { if (!present) onSet(1); }}
        />
        {present && (
          <div className="pt-2">
            <p className="mb-2 text-[14px] font-semibold text-app-textPrimary">
              {PFDI.botherQuestion}
            </p>
            <div className="space-y-2.5">
              {PFDI.botherOptions.map((option) => (
                <AnswerButton
                  key={option.score}
                  title={option.text}
                  selected={value === option.score}
                  onClick={() => { onSet(option.score); onAdvance(); }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onSkip}
        className="mt-4 h-11 w-full text-[14px] font-semibold text-app-textSecondary"
      >
        Skip this one
      </button>
    </div>
  );
}

function Summary({ total, severity, pfdi, pfdiScore, saveFailed, onDone }) {
  const subscales = useMemo(
    () =>
      PFDI_SUBSCALES.map((s) => ({ ...s, score: pfdiSubscaleScore(pfdi, s.id) })).filter(
        (s) => s.score != null
      ),
    [pfdi]
  );

  return (
    <div>
      <h3 className="text-[21px] font-bold text-app-textPrimary">
        {saveFailed ? "Here are your scores." : "Thank you. That is logged."}
      </h3>
      <p className="mt-2 text-[14px] leading-snug text-app-textSecondary">
        Here is where you are today. Lower numbers mean fewer symptoms. What matters
        most is how these move over the next few weeks.
      </p>
      {saveFailed && (
        <p
          role="status"
          className="mt-3 rounded-2xl bg-app-primary/10 px-4 py-3 text-[13.5px] leading-snug text-app-textPrimary"
        >
          We could not save this to your account just now, so it will not be on your
          report. Write the numbers down if you need them, and try again when your
          connection is back.
        </p>
      )}

      {total != null && severity && (
        <ResultCard
          title="Bladder leaking"
          clinicalName="ICIQ-UI SF"
          value={`${total}`}
          outOf={`out of ${ICIQ.maximumTotal}`}
          plain={severity.plain}
        />
      )}

      {pfdiScore != null && (
        <>
          <ResultCard
            title="Pelvic floor bother"
            clinicalName="PFDI-20"
            value={`${Math.round(pfdiScore)}`}
            outOf="out of 300"
            plain={pfdiPlainBand(pfdiScore / 3)}
          />
          <ul className="mt-3 divide-y divide-black/[0.06] overflow-hidden rounded-[16px] bg-app-background">
            {subscales.map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] text-app-textPrimary">{s.plainTitle}</span>
                  <span className="block text-[11.5px] text-app-textSecondary">{s.shortName}</span>
                </span>
                <span className="shrink-0 text-[16px] font-bold tabular-nums text-app-primary">
                  {Math.round(s.score)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="mt-4 text-[12.5px] leading-snug text-app-textSecondary">
        These scores now appear on your health report, under the names your doctor
        or therapist already uses. You can share it any time from this tab.
      </p>

      <button
        type="button"
        onClick={onDone}
        className="mt-5 h-[52px] w-full rounded-full bg-ios-pink text-[16px] font-bold text-white"
      >
        Done
      </button>
    </div>
  );
}

function ResultCard({ title, clinicalName, value, outOf, plain }) {
  return (
    <div className="mt-4 rounded-[20px] border border-black/[0.06] bg-white p-4">
      <p className="text-[14px] font-semibold text-app-textPrimary">{title}</p>
      <p className="mt-1 flex items-baseline gap-2">
        <span className="text-[36px] font-bold leading-none tabular-nums text-app-primary">
          {value}
        </span>
        <span className="text-[13px] text-app-textSecondary">{outOf}</span>
      </p>
      <p className="mt-2 text-[14.5px] text-app-textPrimary">{plain}</p>
      <p className="mt-1 text-[12px] text-app-textSecondary">
        Your clinician knows this one as {clinicalName}.
      </p>
    </div>
  );
}
