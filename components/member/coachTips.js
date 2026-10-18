// Native CoachTipProvider daily tips and stable reviewed-article destinations.
import { Sparkles, Award } from "lucide-react";

const DECKS = {
  "intimacy": [
    {
      "id": "intimacy-release",
      "goal": "intimacy",
      "symbol": "lock.open.fill",
      "title": "Relaxation makes room for stronger sensation",
      "detail": "A pelvic floor that can fully soften has more usable range when it contracts. Today's release work builds the control behind comfort, sensation, and stronger orgasms.",
      "articleSlug": "reverse-kegels-when-relaxing-beats-squeezing"
    },
    {
      "id": "intimacy-coordinate",
      "goal": "intimacy",
      "symbol": "waveform.path.ecg",
      "title": "Control matters more than squeezing harder",
      "detail": "Breath, relaxation, and a well-timed contraction work as one system. Practicing that sequence builds the body awareness you can use during intimacy.",
      "articleSlug": "better-sensation-starts-with-better-control"
    },
    {
      "id": "intimacy-bloodflow",
      "goal": "intimacy",
      "symbol": "heart.fill",
      "title": "Gentle movement prepares the body for pleasure",
      "detail": "Easy breathing and pelvic movement increase local circulation without forcing tension. That is why today's plan begins with connection before intensity.",
      "articleSlug": "pleasure-orgasm-and-your-pelvic-floor"
    }
  ],
  "bladderLeaks": [
    {
      "id": "bladder-knack",
      "goal": "bladderLeaks",
      "symbol": "shield.checkered",
      "title": "Timing protects you during coughs and lifts",
      "detail": "A gentle pelvic floor lift just before pressure arrives gives the muscles a head start. Today's coordination work practices that timing, not just strength.",
      "articleSlug": "the-knack-brace-before-the-cough"
    },
    {
      "id": "bladder-release",
      "goal": "bladderLeaks",
      "symbol": "arrow.down.to.line",
      "title": "A complete release is part of bladder control",
      "detail": "Holding tension all day can make the next contraction less useful. Training both lift and release gives your bladder support when pressure changes.",
      "articleSlug": "stress-leaks-and-urge-leaks-need-different-skills"
    },
    {
      "id": "bladder-breath",
      "goal": "bladderLeaks",
      "symbol": "lungs.fill",
      "title": "Breathing out keeps pressure manageable",
      "detail": "An exhale during effort lets the deep core and pelvic floor share the load. Practice it here so it is easier to use when you sneeze, stand, or lift.",
      "articleSlug": "breathe-right-activate-your-core-pelvic-floor"
    }
  ],
  "postpartum": [
    {
      "id": "postpartum-exhale",
      "goal": "postpartum",
      "symbol": "lungs.fill",
      "title": "Exhale before the hard part",
      "detail": "Breathing out as you roll, stand, or lift helps your healing core manage pressure. Today's slow practice turns that into an everyday habit.",
      "articleSlug": "postpartum-weeks-1-to-6-gentle-core-reset"
    },
    {
      "id": "postpartum-reconnect",
      "goal": "postpartum",
      "symbol": "link",
      "title": "Connection comes before heavier strength",
      "detail": "Gentle breath-led movement teaches the abdominal wall and pelvic floor to work together again before the plan adds more load.",
      "articleSlug": "your-first-rule-postpartum-rebuild-do-not-rush"
    },
    {
      "id": "postpartum-rest",
      "goal": "postpartum",
      "symbol": "leaf.fill",
      "title": "Recovery is part of the rebuild",
      "detail": "A lighter day gives tired muscles time to absorb the work you have already done. Consistency includes choosing the dose your body can recover from.",
      "articleSlug": "heaviness-and-leaking-after-birth-what-to-track"
    }
  ],
  "diastasisRecti": [
    {
      "id": "diastasis-doming",
      "goal": "diastasisRecti",
      "symbol": "eye.fill",
      "title": "Doming is useful feedback",
      "detail": "A ridge along the midline tells you to reduce range, slow down, or exhale sooner. Adjusting in the moment builds better pressure control.",
      "articleSlug": "doming-is-feedback-not-failure"
    },
    {
      "id": "diastasis-exhale",
      "goal": "diastasisRecti",
      "symbol": "wind",
      "title": "The exhale organizes your deep core",
      "detail": "Breathing out before effort helps the abdominal wall manage pressure without a hard brace. Today's reps make that sequence repeatable.",
      "articleSlug": "your-core-is-a-pressure-system-not-one-muscle"
    },
    {
      "id": "diastasis-life",
      "goal": "diastasisRecti",
      "symbol": "figure.walk.motion",
      "title": "Everyday movement is a meaningful measure",
      "detail": "Notice how rolling out of bed, lifting, and standing feel. Better coordination in those tasks is real progress even before appearance changes.",
      "articleSlug": "measure-diastasis-progress-beyond-the-gap"
    }
  ],
  "pregnancyPrep": [
    {
      "id": "pregnancy-range",
      "goal": "pregnancyPrep",
      "symbol": "arrow.up.and.down",
      "title": "Strength and relaxation belong together",
      "detail": "Pregnancy asks the pelvic floor to support changing pressure and still let go. Today's plan trains both directions instead of squeezing alone.",
      "articleSlug": "a-responsive-pelvic-floor-can-lift-and-let-go"
    },
    {
      "id": "pregnancy-breath",
      "goal": "pregnancyPrep",
      "symbol": "lungs.fill",
      "title": "Breathing is your pressure-control practice",
      "detail": "A steady exhale helps the deep core respond without breath-holding. Building that habit now makes daily movement feel more organized.",
      "articleSlug": "train-for-pregnancy-without-holding-your-breath"
    },
    {
      "id": "pregnancy-mobility",
      "goal": "pregnancyPrep",
      "symbol": "figure.walk",
      "title": "Comfortable mobility protects your options",
      "detail": "Hip and rib movement gives the pelvis room to adapt. Today's gentle range work keeps strength from becoming stiffness.",
      "articleSlug": "pregnancy-exercise-stop-signs-you-should-know"
    }
  ],
  "pelvicPain": [
    {
      "id": "pain-soften",
      "goal": "pelvicPain",
      "symbol": "leaf.fill",
      "title": "Softening is a trainable skill",
      "detail": "Long exhales and supported positions give overactive muscles a clear signal to release. Today's work is control in the direction your body needs most.",
      "articleSlug": "tight-is-not-the-same-as-strong"
    },
    {
      "id": "pain-dose",
      "goal": "pelvicPain",
      "symbol": "slider.horizontal.3",
      "title": "The right dose should not require pushing through pain",
      "detail": "Smaller, calmer movement can build trust without adding another threat signal. Comfort is information that guides the next progression.",
      "articleSlug": "how-to-tell-a-helpful-stretch-from-too-much"
    },
    {
      "id": "pain-whole",
      "goal": "pelvicPain",
      "symbol": "brain.head.profile",
      "title": "Jaw, breath, hips, and pelvic floor can share tension",
      "detail": "Releasing the whole chain often makes pelvic relaxation easier than focusing on one muscle alone. That is why today's plan includes breath and surrounding mobility.",
      "articleSlug": "build-a-pelvic-pain-flare-plan-before-you-need-it"
    }
  ],
  "coreStrength": [
    {
      "id": "core-exhale",
      "goal": "coreStrength",
      "symbol": "lungs.fill",
      "title": "The exhale switches on deep support",
      "detail": "Breathing out during effort helps the deep abdominal wall create support without a rigid brace. Today's slow reps build that coordination first.",
      "articleSlug": "breathe-right-activate-your-core-pelvic-floor"
    },
    {
      "id": "core-control",
      "goal": "coreStrength",
      "symbol": "scope",
      "title": "Precision builds strength you can actually use",
      "detail": "A controlled smaller range keeps the right muscles working. Once that pattern is reliable, added load has a stronger foundation.",
      "articleSlug": "brace-without-gripping"
    },
    {
      "id": "core-transfer",
      "goal": "coreStrength",
      "symbol": "arrow.left.and.right",
      "title": "Your core transfers force between the whole body",
      "detail": "A coordinated center gives your arms and legs a stable base. Today's work carries into lifting, walking, posture, and training.",
      "articleSlug": "why-hips-matter-to-pelvic-floor-strength"
    }
  ],
  "fitness": [
    {
      "id": "fitness-pressure",
      "goal": "fitness",
      "symbol": "bolt.shield.fill",
      "title": "Pressure control makes strength more usable",
      "detail": "Exhaling through effort lets the core and pelvic floor share load during lifting and impact. Today's practice builds that timing before speed.",
      "articleSlug": "lift-without-sending-pressure-down"
    },
    {
      "id": "fitness-impact",
      "goal": "fitness",
      "symbol": "figure.run",
      "title": "Impact tolerance is built progressively",
      "detail": "Controlled strength and landing mechanics prepare the body for running and jumping. The plan adds challenge after your foundation stays steady.",
      "articleSlug": "running-leaks-change-the-load-not-your-confidence"
    },
    {
      "id": "fitness-transfer",
      "goal": "fitness",
      "symbol": "bolt.fill",
      "title": "A stable center transfers more power",
      "detail": "When the trunk manages force well, the hips and shoulders can work from a stronger base. Today's core work carries into the rest of your training.",
      "articleSlug": "know-when-to-progress-an-exercise"
    }
  ],
  "stability": [
    {
      "id": "stability-stack",
      "goal": "stability",
      "symbol": "figure.stand",
      "title": "Stacking reduces unnecessary effort",
      "detail": "Letting the ribs settle over the pelvis gives the deep core a balanced starting point. Today's practice makes that alignment easier to find in motion.",
      "articleSlug": "there-is-no-one-perfect-posture"
    },
    {
      "id": "stability-hips",
      "goal": "stability",
      "symbol": "figure.walk",
      "title": "Hip strength gives the pelvis a steadier base",
      "detail": "The side hips help control each step and single-leg stance. Today's work builds the support your posture uses while moving.",
      "articleSlug": "pelvic-stability-starts-at-the-foot-and-hip"
    },
    {
      "id": "stability-dynamic",
      "goal": "stability",
      "symbol": "arrow.triangle.2.circlepath",
      "title": "Posture is a return point, not a rigid pose",
      "detail": "Real stability means moving and finding center again. Gentle transitions train that skill better than holding yourself stiff all day.",
      "articleSlug": "balance-training-that-carries-into-real-life"
    }
  ],
  "prolapse": [
    {
      "id": "prolapse-load-signals",
      "goal": "prolapse",
      "symbol": "arrow.up.heart.fill",
      "title": "Heaviness tells you when the load needs to change",
      "detail": "Pressure that builds after standing, lifting, or a long day is useful feedback. Today's plan trains support while helping you notice when position, effort, or rest should change.",
      "articleSlug": "heaviness-and-pressure-are-useful-load-signals"
    },
    {
      "id": "prolapse-lift-breathe",
      "goal": "prolapse",
      "symbol": "lungs.fill",
      "title": "Exhale before pressure rises",
      "detail": "Beginning the exhale before standing or lifting lets the trunk and pelvic floor share the work. Today's timing practice builds support without a maximum squeeze.",
      "articleSlug": "lift-and-breathe-without-sending-pressure-down"
    },
    {
      "id": "prolapse-bowel-support",
      "goal": "prolapse",
      "symbol": "figure.seated.side",
      "title": "Less straining protects pelvic support",
      "detail": "Hard straining repeatedly sends pressure downward. Today's breathing and release work supports easier emptying while your strength plan builds control for daily movement.",
      "articleSlug": "bowel-habits-are-part-of-pelvic-support"
    }
  ],
  "prostateRecovery": [
    {
      "id": "prostate-find-muscles",
      "goal": "prostateRecovery",
      "symbol": "scope",
      "title": "Clear technique comes before harder Kegels",
      "detail": "After prostate treatment, a clean pelvic-floor lift with normal breathing is more useful than gripping the stomach and glutes. Today's setup helps the right muscles do the work.",
      "articleSlug": "find-the-correct-muscles-after-prostate-treatment"
    },
    {
      "id": "prostate-daily-timing",
      "goal": "prostateRecovery",
      "symbol": "shield.checkered",
      "title": "Use support before the leak usually happens",
      "detail": "Standing, coughing, and walking can raise pressure quickly during recovery. Today's timing practice teaches a gentle lift before the effort, followed by a full release.",
      "articleSlug": "plan-for-coughs-standing-and-walking"
    },
    {
      "id": "prostate-progress",
      "goal": "prostateRecovery",
      "symbol": "chart.line.uptrend.xyaxis",
      "title": "Recovery is more than one perfectly dry day",
      "detail": "Fewer pads, smaller leaks, longer walks, and more control after standing are all meaningful changes. Today's session adds another measurable step to that pattern.",
      "articleSlug": "recovery-progress-is-more-than-a-dry-day"
    }
  ],
  "bowelControl": [
    {
      "id": "bowel-pattern",
      "goal": "bowelControl",
      "symbol": "list.clipboard.fill",
      "title": "A pattern makes urgency easier to train",
      "detail": "Timing, stool consistency, food, stress, and activity can change urgency. Today's check-in and coordination work help separate a repeatable pattern from a random bad day.",
      "articleSlug": "bowel-urgency-and-accidents-need-a-pattern-not-guesswork"
    },
    {
      "id": "bowel-close-release",
      "goal": "bowelControl",
      "symbol": "arrow.up.arrow.down.circle.fill",
      "title": "Bowel control needs a strong close and a full release",
      "detail": "The pelvic floor must close when control is needed and let go for emptying. Today's lift-and-release practice trains both directions instead of holding tension all day.",
      "articleSlug": "control-requires-a-strong-close-and-a-full-release"
    },
    {
      "id": "bowel-empty",
      "goal": "bowelControl",
      "symbol": "wind",
      "title": "Breathing out reduces straining",
      "detail": "A supported position and an easy exhale help the pelvic floor open without force. Today's release work makes calm emptying part of the same control plan.",
      "articleSlug": "empty-without-straining"
    }
  ]
};
const MENS_INTIMACY = [
  {
    "id": "mens-erection-timing",
    "goal": "intimacy",
    "symbol": "bolt.heart.fill",
    "title": "Better erections start with timing, not constant squeezing",
    "detail": "A clear pelvic-floor lift can support erection rigidity, but the muscle must also release completely. Today's lift-and-release work trains both parts without gripping your stomach, glutes, or breath.",
    "articleSlug": "erection-support-needs-timing-not-constant-squeezing"
  },
  {
    "id": "mens-lasting-control",
    "goal": "intimacy",
    "symbol": "timer",
    "title": "Lasting longer begins before the point of no return",
    "detail": "A slow exhale, a released pelvic floor, and an early pause create more choice as arousal rises. Today's control work helps you notice and change that pattern sooner.",
    "articleSlug": "lasting-longer-starts-with-recognizing-the-rising-signal"
  },
  {
    "id": "mens-sexual-confidence",
    "goal": "intimacy",
    "symbol": "shield.fill",
    "title": "Less pelvic tension gives you more usable control",
    "detail": "Jaw clenching, breath holding, and pelvic gripping can work against erections and ejaculation control. Today's release work helps strength stay responsive instead of tight all day.",
    "articleSlug": "pelvic-tension-can-affect-sexual-confidence"
  }
];

export function coachTipsFor(goalId, pathway = "womensPelvicHealth") {
  const deck = goalId === "intimacy" && pathway === "mensPelvicHealth" ? MENS_INTIMACY : DECKS[goalId] || DECKS.coreStrength;
  return deck.map((tip) => ({ ...tip, Icon: Sparkles, eyebrow: "WHY THIS HELPS TODAY" }));
}

export function postSessionCoachTip({ goalId, workoutCount = 1, seconds = 0, feedback, audioPattern }) {
  const copy = {
    justRight: ["Today's dose felt right", "You marked today's session “Just right.” Coach Mia™ will keep this pace as the reference point for your next plan."],
    couldNotFeel: ["You asked for a clearer connection", "You marked that you could not feel the work. Coach Mia™ uses that feedback to favor clearer setup and connection cues."],
    tooHard: ["Your next step should feel gentler", "You marked today's session “Too hard.” Coach Mia™ uses that feedback to favor a gentler setup and slower progression."],
    pain: ["Comfort comes first next time", "You recorded pain after today's session. Coach Mia™ uses that feedback to prioritize release, comfort, and gentler options."],
    tooEasy: ["You are ready for a little more", "You marked today's session “Too easy.” Coach Mia™ uses that feedback to progress control or challenge without skipping your foundation."],
  }[feedback];
  const count = Math.max(0, workoutCount);
  const duration = seconds < 60 ? `${Math.max(0, Math.floor(seconds))} seconds` : `${Math.floor(seconds / 60)} minute${Math.floor(seconds / 60) === 1 ? "" : "s"}`;
  const fact = seconds > 0 ? `Coach Mia™ recorded ${duration} across ${count} completed workout${count === 1 ? "" : "s"}.` : `Coach Mia™ recorded ${count} completed workout${count === 1 ? "" : "s"} today.`;
  return {
    ...(coachTipsFor(goalId)[0] || {}),
    id: `learned-${goalId}`, Icon: Sparkles, isLearned: true, eyebrow: "WHAT COACH MIA™ LEARNED",
    title: copy?.[0] || (audioPattern ? "Your audio feedback is forming a pattern" : "Today's practice is saved"),
    detail: copy?.[1] || audioPattern || `${fact} Add feedback after a future session and this note can become more personal.`,
  };
}

export { DECKS as COACH_TIP_DECKS, Award };
