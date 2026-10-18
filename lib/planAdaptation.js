// Pure ports of PlanAdaptationEngine and ContinuationPlanEngine in
// Core/Premium/PremiumCareExperience.swift. Persistence belongs to MemberProvider.

export const SESSION_RESPONSES = [
  { id: "justRight", title: "Just right" },
  { id: "couldNotFeel", title: "I could not feel it" },
  { id: "tooHard", title: "Too hard" },
  { id: "pain", title: "I felt pain" },
  { id: "tooEasy", title: "Too easy" },
];
export const WORKOUT_DIFFICULTIES = [
  { id: "easy", title: "Easy", detail: "A gentler dose with more time to learn each movement." },
  { id: "medium", title: "Medium", detail: "The full daily plan with steady progression." },
  { id: "hard", title: "Hard", detail: "Advanced exercises, more work, and less rest." },
];

export function latestSessionFeedback(records, goalId) {
  return (records || []).filter((r) => r.goal === goalId && SESSION_RESPONSES.some((v) => v.id === r.response))
    .sort((a, b) => timeOf(b.date) - timeOf(a.date))[0] || null;
}

function timeOf(value) {
  if (typeof value?.toDate === "function") return value.toDate().getTime();
  const date = value instanceof Date ? value : new Date(value || 0);
  return Number.isFinite(date.getTime()) ? date.getTime() : 0;
}

// Calendar day components, including whole-day timing and daylight saving.
export function wholeCalendarDays(from, to) {
  const a = new Date(timeOf(from));
  const b = new Date(timeOf(to));
  const utcDay = (d) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  let days = Math.round((utcDay(b) - utcDay(a)) / 86400000);
  const anniversary = new Date(a);
  anniversary.setDate(anniversary.getDate() + days);
  if (days > 0 && anniversary > b) days -= 1;
  if (days < 0 && anniversary < b) days += 1;
  return days;
}

function uniqueURLs(videos) {
  const seen = new Set();
  return videos.filter((video) => {
    if (seen.has(video.url)) return false;
    seen.add(video.url);
    return true;
  });
}

export function adaptationScore(video, focusId) {
  const focus = FOCUS_RULES[focusId];
  if (!focus) return 0;
  const tags = new Set((video.tags || []).map((tag) => tag.toLowerCase()));
  const title = (video.title || "").toLowerCase();
  return focus.tags.reduce((score, tag) => score + (tags.has(tag.toLowerCase()) ? 4 : 0), 0)
    + focus.keywords.reduce((score, word) => score + (title.includes(word.toLowerCase()) ? 7 : 0), 0);
}

export function focusAdapted(videos, { goalId, focusId, programDay, catalog } = {}) {
  if (!programDay || !FOCUS_RULES[focusId]) return videos;
  const ids = goalId === "intimacy" && programDay >= 1 && programDay <= 7
    ? INTIMACY_FIRST_WEEK[focusId]?.[programDay] : null;
  if (ids) {
    const byId = catalog?.byId || new Map((catalog?.videos || []).map((video) => [video.id, video]));
    const selected = ids.map((id) => byId.get(id)).filter(Boolean);
    if (selected.length === ids.length && new Set(ids).size === ids.length
      && selected.every((video) => /^https:\/\//i.test(video.url))) return selected;
    return videos; // Keep the whole authored day if a remote catalog lacks a variant.
  }
  return videos.map((video, index) => ({ video, index, score: adaptationScore(video, focusId) }))
    .sort((a, b) => b.score - a.score || a.index - b.index).map((v) => v.video);
}

export function replacementScore(video, response) {
  const tags = new Set((video.tags || []).map((tag) => tag.toLowerCase()));
  const title = (video.title || "").toLowerCase();
  let score = 0;
  if (response === "couldNotFeel") {
    if (tags.has("form")) score += 10;
    if (tags.has("breathing")) score += 8;
    if (title.includes("breath") || title.includes("pelvic floor")) score += 5;
  } else if (response === "tooHard" || response === "pain") {
    if (tags.has("relaxation")) score += 12;
    if (tags.has("breathing")) score += 10;
    if (tags.has("stretch") || tags.has("mobility")) score += 7;
    if (title.includes("child") || title.includes("butterfly")) score += 4;
    if (tags.has("cardio") || title.includes("plank")) score -= 8;
  } else if (response === "tooEasy") {
    if (tags.has("strength")) score += 18;
    if (tags.has("core")) score += 13;
    if (tags.has("balance")) score += 8;
    if (tags.has("cardio")) score += 7;
    if (["single leg", "single-leg", "plank", "lunge", "squat", "mountain climber", "advanced", "power"].some((s) => title.includes(s))) score += 12;
    if (tags.has("relaxation")) score -= 10;
  }
  if (video.durationSeconds > 0 && video.durationSeconds <= 180) score += 2;
  return score;
}

export function bestReplacements(catalog, { response, goalId, excluding = [], count = 1 } = {}) {
  const excluded = new Set(excluding);
  const forbidden = goalId === "pregnancyPrep" ? ["headstand", "burpee", "jump", "inverted"]
    : goalId === "pelvicPain" ? ["burpee", "jump", "mountain climber"]
      : goalId === "prolapse" ? ["burpee", "jump", "mountain climber", "jack"] : [];
  return (catalog?.videos || []).filter((video) => !excluded.has(video.id) && /^https:\/\//i.test(video.url)
    && !forbidden.some((s) => (video.title || "").toLowerCase().includes(s)))
    // Native sorts only by score. Catalog order is the deterministic tie-break on web.
    .map((video, index) => ({ video, index, score: replacementScore(video, response) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, Math.max(0, count)).map((entry) => entry.video);
}

export function adaptPlaylist(videos, options = {}) {
  if (!videos?.length) return videos || [];
  const { goalId, catalog, difficulty = "easy", feedback, audioOutcome, now = new Date() } = options;
  let result = focusAdapted(videos, options);
  const replaceEnd = (response, count) => {
    const replacements = bestReplacements(catalog, { response, goalId, excluding: result.map((v) => v.id), count });
    result = [...result];
    replacements.forEach((replacement, index) => { result[Math.max(0, result.length - 1 - index)] = replacement; });
    result = uniqueURLs(result);
  };
  if (difficulty !== "easy") replaceEnd("tooEasy", difficulty === "hard" ? Math.min(3, result.length) : 1);
  const recentFeedback = feedback && wholeCalendarDays(feedback.date, now) <= 7 && feedback.response !== "justRight";
  if (!recentFeedback) {
    if (audioOutcome !== "worse") return result;
    const replacement = bestReplacements(catalog, { response: "pain", goalId, excluding: result.map((v) => v.id) })[0];
    return replacement ? uniqueURLs([replacement, ...result.slice(1)]) : result;
  }
  if (["couldNotFeel", "pain", "tooHard"].includes(feedback.response)) {
    const replacement = bestReplacements(catalog, { response: feedback.response, goalId, excluding: result.map((v) => v.id) })[0];
    if (replacement) result = [replacement, ...result.slice(1)];
  } else if (feedback.response === "tooEasy") replaceEnd("tooEasy", Math.min(2, result.length));
  return uniqueURLs(result);
}

export function adaptiveFormLesson(catalog, goalId, response) {
  let title;
  if (response === "couldNotFeel") title = ["intimacy", "pelvicPain"].includes(goalId) ? "Child's Pose" : "Heel Slides";
  if (response === "tooEasy") title = ["diastasisRecti", "postpartum"].includes(goalId) ? "Opposite Arm and Leg Lift"
    : goalId === "prolapse" ? "Standing Glute Toner"
      : ["intimacy", "pelvicPain", "pregnancyPrep"].includes(goalId) ? "Figure Four Squat" : "Split Squat Rotation";
  return title ? (catalog?.videos || []).find((video) => video.id.startsWith("perfect-your-form-") && video.title === title) || null : null;
}

export function adaptedProgramVideos(videos, options = {}) {
  const adapted = adaptPlaylist(videos, options);
  const lesson = adaptiveFormLesson(options.catalog, options.goalId, options.feedback?.response);
  return lesson && !adapted.some((video) => video.url === lesson.url) ? [lesson, ...adapted] : adapted;
}

export function adaptationSummary({ difficulty = "easy", feedback, audioOutcome } = {}) {
  const messages = {
    justRight: "Your next session keeps the same pace.",
    couldNotFeel: "Your next session starts with a clearer technique exercise and Coach Mode.",
    tooHard: "Your next session starts more gently, then builds when you are ready.",
    pain: "Your next session begins with breathing and release. Stop if pain continues or increases.",
    tooEasy: "Your next session adds a little more challenge without skipping control.",
  };
  if (messages[feedback?.response]) return messages[feedback.response];
  if (difficulty === "hard") return "Your plan is set to Hard with advanced exercises, more work, and less rest.";
  if (difficulty === "medium") return "Your plan is set to Medium with the full daily dose and steady progression.";
  return {
    better: "Coach Mia™ keeps the audio that helped within easy reach.",
    same: "Coach Mia™ will offer a different audio next so you can compare what feels useful.",
    worse: "Your next session begins more gently after your audio feedback.",
  }[audioOutcome] || null;
}

export function difficultyAfterFeedback(response, current = "easy", graduation = false) {
  if (response === "tooEasy") return "hard";
  if (response === "tooHard" || response === "pain") return "easy";
  if (graduation && response === "couldNotFeel") return "medium";
  return current;
}

export function continuationState(completions, goalId, now = new Date()) {
  const graduation = (completions || []).find((record) => Number(record.day) === 90
    && (!record.programID || record.programID === goalId));
  const cycleDay = (Math.max(0, wholeCalendarDays(graduation?.completedAt || now, now)) % 30) + 1;
  const phases = [
    ["Stabilize Your Results", "Keep the gains from your 90-day plan reliable in daily life."],
    ["Build More Capacity", "Add strength and control without losing the foundation you built."],
    ["Real-Life Strength", "Use your control during lifting, exercise and longer days."],
    ["Maintain and Advance", "A fresh goal-based mix keeps your results moving forward."],
    ["Refresh and Recheck", "Finish the cycle, notice what changed and begin again at your new level."],
  ];
  const index = Math.min(4, Math.floor((cycleDay - 1) / 7));
  return { cycleDay, sourceDayNumber: 60 + cycleDay, phase: { title: phases[index][0], subtitle: phases[index][1], week: index + 1 } };
}

export function emptyPlanPreferences() {
  return { version: 1, difficultyByGoal: {}, feedbackRecords: [], graduationCheckIns: {}, modifiedAt: null };
}

export function mergePlanPreferences(local, cloud) {
  const a = local || emptyPlanPreferences();
  const b = cloud || emptyPlanPreferences();
  const newer = timeOf(a.modifiedAt) >= timeOf(b.modifiedAt) ? a : b;
  const older = newer === a ? b : a;
  const records = new Map();
  for (const record of [...(a.feedbackRecords || []), ...(b.feedbackRecords || [])]) {
    if (record?.id && SESSION_RESPONSES.some((value) => value.id === record.response)) records.set(record.id, record);
  }
  return {
    version: 1,
    difficultyByGoal: { ...older.difficultyByGoal, ...newer.difficultyByGoal },
    feedbackRecords: [...records.values()].sort((x, y) => timeOf(x.date) - timeOf(y.date)).slice(-180),
    graduationCheckIns: { ...a.graduationCheckIns, ...b.graduationCheckIns },
    modifiedAt: newer.modifiedAt || null,
  };
}
// Native focus rules from Core/GoalFocus.swift; update with the native catalog.
export const FOCUS_RULES = {
  "maleSexual.erectionQuality": {
    "tags": [
      "strength",
      "core",
      "breathing"
    ],
    "keywords": [
      "pelvic floor",
      "bridge",
      "breath",
      "brace"
    ]
  },
  "maleSexual.ejaculationControl": {
    "tags": [
      "relaxation",
      "breathing",
      "form"
    ],
    "keywords": [
      "breath",
      "release",
      "pelvic floor"
    ]
  },
  "maleSexual.pelvicTension": {
    "tags": [
      "relaxation",
      "breathing",
      "mobility"
    ],
    "keywords": [
      "breath",
      "child",
      "hip",
      "release"
    ]
  },
  "maleSexual.confidence": {
    "tags": [
      "form",
      "strength",
      "breathing"
    ],
    "keywords": [
      "pelvic floor",
      "bridge",
      "breath"
    ]
  },
  "bladder.stressLeaks": {
    "tags": [
      "form",
      "strength",
      "core"
    ],
    "keywords": [
      "lifting",
      "brace",
      "dead bug",
      "bridge"
    ]
  },
  "bladder.afterDribble": {
    "tags": [
      "form",
      "breathing"
    ],
    "keywords": [
      "pelvic floor",
      "seated",
      "breath"
    ]
  },
  "bladder.urgency": {
    "tags": [
      "breathing",
      "relaxation",
      "form"
    ],
    "keywords": [
      "breath",
      "child",
      "seated"
    ]
  },
  "bladder.frequency": {
    "tags": [
      "breathing",
      "form",
      "strength"
    ],
    "keywords": [
      "breath",
      "pelvic floor",
      "bridge"
    ]
  },
  "bladder.confidence": {
    "tags": [
      "strength",
      "core",
      "form"
    ],
    "keywords": [
      "bridge",
      "brace",
      "pelvic floor"
    ]
  },
  "intimacy.sensation": {
    "tags": [
      "mobility",
      "yoga",
      "strength"
    ],
    "keywords": [
      "bridge",
      "cat",
      "cow",
      "cobra",
      "hip"
    ]
  },
  "intimacy.comfort": {
    "tags": [
      "relaxation",
      "stretch",
      "mobility"
    ],
    "keywords": [
      "child",
      "butterfly",
      "happy baby",
      "breath"
    ]
  },
  "intimacy.relaxation": {
    "tags": [
      "relaxation",
      "breathing",
      "stretch",
      "yoga"
    ],
    "keywords": [
      "breath",
      "child",
      "butterfly",
      "pigeon",
      "90-90"
    ]
  },
  "intimacy.dryness": {
    "tags": [
      "relaxation",
      "mobility",
      "breathing"
    ],
    "keywords": [
      "breath",
      "child",
      "butterfly",
      "hip"
    ]
  },
  "intimacy.confidence": {
    "tags": [
      "strength",
      "core",
      "balance"
    ],
    "keywords": [
      "bridge",
      "breath",
      "plie",
      "warrior"
    ]
  },
  "intimacy.postpartum": {
    "tags": [
      "postpartum",
      "breathing",
      "relaxation",
      "core"
    ],
    "keywords": [
      "breath",
      "brace",
      "bridge",
      "child"
    ]
  },
  "bladder.nighttime": {
    "tags": [
      "relaxation",
      "breathing",
      "mobility"
    ],
    "keywords": [
      "breath",
      "child",
      "seated"
    ]
  },
  "prolapse.pressure": {
    "tags": [
      "breathing",
      "relaxation",
      "form"
    ],
    "keywords": [
      "breath",
      "rest",
      "child",
      "pelvic floor"
    ]
  },
  "prolapse.heaviness": {
    "tags": [
      "breathing",
      "core",
      "form"
    ],
    "keywords": [
      "breath",
      "brace",
      "bridge",
      "pelvic floor"
    ]
  },
  "prolapse.support": {
    "tags": [
      "form",
      "core",
      "strength"
    ],
    "keywords": [
      "pelvic floor",
      "brace",
      "bridge",
      "breath"
    ]
  },
  "prolapse.dailyMovement": {
    "tags": [
      "form",
      "core",
      "balance"
    ],
    "keywords": [
      "walk",
      "lifting",
      "squat",
      "brace"
    ]
  },
  "prolapse.exercise": {
    "tags": [
      "form",
      "core",
      "strength"
    ],
    "keywords": [
      "brace",
      "squat",
      "bridge",
      "dead bug"
    ]
  },
  "postpartum.reconnect": {
    "tags": [
      "postpartum",
      "breathing",
      "form"
    ],
    "keywords": [
      "pelvic floor",
      "breath",
      "seated"
    ]
  },
  "postpartum.core": {
    "tags": [
      "postpartum",
      "core",
      "breathing"
    ],
    "keywords": [
      "brace",
      "dead bug",
      "bridge",
      "transverse"
    ]
  },
  "postpartum.leaks": {
    "tags": [
      "postpartum",
      "form",
      "strength"
    ],
    "keywords": [
      "lifting",
      "brace",
      "pelvic floor",
      "bridge"
    ]
  },
  "postpartum.pressure": {
    "tags": [
      "postpartum",
      "relaxation",
      "breathing"
    ],
    "keywords": [
      "breath",
      "child",
      "rest"
    ]
  },
  "postpartum.return": {
    "tags": [
      "postpartum",
      "form",
      "core",
      "strength"
    ],
    "keywords": [
      "brace",
      "bridge",
      "squat",
      "dead bug"
    ]
  },
  "diastasis.doming": {
    "tags": [
      "form",
      "core",
      "breathing"
    ],
    "keywords": [
      "brace",
      "dead bug",
      "breath"
    ]
  },
  "diastasis.connection": {
    "tags": [
      "core",
      "form",
      "breathing"
    ],
    "keywords": [
      "transverse",
      "brace",
      "dead bug",
      "bridge"
    ]
  },
  "diastasis.pressure": {
    "tags": [
      "form",
      "breathing",
      "core"
    ],
    "keywords": [
      "lifting",
      "brace",
      "breath",
      "squat"
    ]
  },
  "diastasis.dailyMovement": {
    "tags": [
      "form",
      "core",
      "strength"
    ],
    "keywords": [
      "lifting",
      "squat",
      "bridge",
      "brace"
    ]
  },
  "diastasis.return": {
    "tags": [
      "strength",
      "core",
      "form"
    ],
    "keywords": [
      "plank",
      "dead bug",
      "bear",
      "squat"
    ]
  },
  "pregnancy.relaxation": {
    "tags": [
      "relaxation",
      "breathing",
      "stretch"
    ],
    "keywords": [
      "breath",
      "child",
      "butterfly",
      "happy baby"
    ]
  },
  "pregnancy.support": {
    "tags": [
      "strength",
      "core",
      "form"
    ],
    "keywords": [
      "bridge",
      "brace",
      "squat",
      "pelvic floor"
    ]
  },
  "pregnancy.breathing": {
    "tags": [
      "breathing",
      "form",
      "core"
    ],
    "keywords": [
      "breath",
      "brace",
      "lifting"
    ]
  },
  "pregnancy.comfort": {
    "tags": [
      "mobility",
      "stretch",
      "relaxation",
      "yoga"
    ],
    "keywords": [
      "hip",
      "child",
      "cat",
      "cow",
      "pigeon"
    ]
  },
  "pregnancy.movement": {
    "tags": [
      "balance",
      "form",
      "strength"
    ],
    "keywords": [
      "walk",
      "squat",
      "bridge",
      "warrior"
    ]
  },
  "pain.flares": {
    "tags": [
      "relaxation",
      "breathing",
      "stretch"
    ],
    "keywords": [
      "child",
      "breath",
      "butterfly",
      "happy baby"
    ]
  },
  "pain.tightness": {
    "tags": [
      "relaxation",
      "breathing",
      "mobility"
    ],
    "keywords": [
      "breath",
      "child",
      "90-90",
      "butterfly"
    ]
  },
  "pain.sitting": {
    "tags": [
      "mobility",
      "stretch",
      "relaxation"
    ],
    "keywords": [
      "hip",
      "figure four",
      "90-90",
      "pigeon"
    ]
  },
  "pain.intimacy": {
    "tags": [
      "relaxation",
      "breathing",
      "stretch"
    ],
    "keywords": [
      "breath",
      "butterfly",
      "child",
      "happy baby"
    ]
  },
  "pain.movement": {
    "tags": [
      "mobility",
      "balance",
      "form"
    ],
    "keywords": [
      "walk",
      "hip",
      "cat",
      "cow"
    ]
  },
  "core.connection": {
    "tags": [
      "core",
      "form",
      "breathing"
    ],
    "keywords": [
      "transverse",
      "brace",
      "dead bug",
      "bridge"
    ]
  },
  "core.bracing": {
    "tags": [
      "core",
      "breathing",
      "form"
    ],
    "keywords": [
      "brace",
      "breath",
      "lifting",
      "dead bug"
    ]
  },
  "core.backSupport": {
    "tags": [
      "core",
      "glutes",
      "form"
    ],
    "keywords": [
      "bridge",
      "bird dog",
      "dead bug",
      "hip"
    ]
  },
  "core.posture": {
    "tags": [
      "posture",
      "core",
      "balance"
    ],
    "keywords": [
      "wall",
      "bird dog",
      "standing",
      "brace"
    ]
  },
  "core.endurance": {
    "tags": [
      "core",
      "strength",
      "balance"
    ],
    "keywords": [
      "plank",
      "bear",
      "hold",
      "bridge"
    ]
  },
  "fitness.leaks": {
    "tags": [
      "form",
      "core",
      "strength"
    ],
    "keywords": [
      "brace",
      "lifting",
      "squat",
      "bridge"
    ]
  },
  "fitness.lifting": {
    "tags": [
      "strength",
      "form",
      "core"
    ],
    "keywords": [
      "lifting",
      "squat",
      "brace",
      "dead bug"
    ]
  },
  "fitness.impact": {
    "tags": [
      "cardio",
      "strength",
      "balance"
    ],
    "keywords": [
      "jump",
      "run",
      "squat",
      "lunge"
    ]
  },
  "fitness.coreControl": {
    "tags": [
      "core",
      "form",
      "strength"
    ],
    "keywords": [
      "dead bug",
      "brace",
      "plank",
      "bear"
    ]
  },
  "fitness.confidence": {
    "tags": [
      "balance",
      "form",
      "strength"
    ],
    "keywords": [
      "walk",
      "squat",
      "bridge",
      "lunge"
    ]
  },
  "stability.hips": {
    "tags": [
      "balance",
      "glutes",
      "strength"
    ],
    "keywords": [
      "clamshell",
      "side",
      "hip",
      "bridge"
    ]
  },
  "stability.balance": {
    "tags": [
      "balance",
      "form"
    ],
    "keywords": [
      "tree",
      "single leg",
      "standing"
    ]
  },
  "stability.posture": {
    "tags": [
      "posture",
      "core",
      "balance"
    ],
    "keywords": [
      "wall",
      "standing",
      "brace"
    ]
  },
  "stability.walking": {
    "tags": [
      "balance",
      "glutes",
      "form"
    ],
    "keywords": [
      "walk",
      "single leg",
      "hip"
    ]
  },
  "prostate.continence": {
    "tags": [
      "form",
      "breathing",
      "strength"
    ],
    "keywords": [
      "pelvic floor",
      "breath",
      "bridge"
    ]
  },
  "prostate.drips": {
    "tags": [
      "form",
      "breathing"
    ],
    "keywords": [
      "pelvic floor",
      "seated",
      "breath"
    ]
  },
  "prostate.urgency": {
    "tags": [
      "breathing",
      "relaxation",
      "form"
    ],
    "keywords": [
      "breath",
      "seated",
      "release"
    ]
  },
  "prostate.confidence": {
    "tags": [
      "strength",
      "core",
      "form"
    ],
    "keywords": [
      "bridge",
      "brace",
      "pelvic floor"
    ]
  },
  "bowel.urgency": {
    "tags": [
      "breathing",
      "relaxation",
      "form"
    ],
    "keywords": [
      "breath",
      "seated",
      "pelvic floor"
    ]
  },
  "bowel.accidents": {
    "tags": [
      "form",
      "strength",
      "core"
    ],
    "keywords": [
      "pelvic floor",
      "bridge",
      "brace"
    ]
  },
  "bowel.emptying": {
    "tags": [
      "breathing",
      "relaxation",
      "mobility"
    ],
    "keywords": [
      "breath",
      "release",
      "squat",
      "hip"
    ]
  },
  "bowel.confidence": {
    "tags": [
      "form",
      "strength",
      "breathing"
    ],
    "keywords": [
      "pelvic floor",
      "breath",
      "bridge"
    ]
  }
};

export const INTIMACY_FIRST_WEEK = {
  "intimacy.comfort": {
    "2": [
      "workout-with-coaches-leakproof-with-coach-laura-seated-diaphragmatic-breathing",
      "workout-with-coaches-intimacy-sensation-with-coach-samira-yoga-videos-a-1-baby-cobra-pose-with-legs-crossed",
      "exercise-categories-pelvic-resistance-butterfly-stretch",
      "workout-with-coaches-intimacy-sensation-with-coach-samira-yoga-videos-a-12-child-s-pose-with-knees-wide",
      "exercise-categories-pelvic-yoga-child-s-pose"
    ],
    "3": [
      "workout-with-coaches-leakproof-with-coach-laura-seated-diaphragmatic-breathing",
      "workout-with-coaches-leakproof-with-coach-laura-postpartum-and-pelvic-pain-pelvic-tilts-exercise",
      "workout-with-coaches-leakproof-with-coach-laura-postpartum-and-pelvic-pain-windshield-wipers",
      "exercise-categories-pelvic-resistance-child-s-pose",
      "exercise-categories-pelvic-yoga-child-s-pose"
    ],
    "5": [
      "workout-with-coaches-leakproof-with-coach-laura-seated-diaphragmatic-breathing",
      "workout-with-coaches-leakproof-with-coach-laura-postpartum-and-pelvic-pain-resting-pose",
      "exercise-categories-pelvic-resistance-figure-four-stretch-left",
      "exercise-categories-pelvic-resistance-figure-four-stretch-right",
      "exercise-categories-pelvic-yoga-child-s-pose"
    ],
    "6": [
      "workout-with-coaches-leakproof-with-coach-laura-seated-diaphragmatic-breathing",
      "workout-with-coaches-intimacy-sensation-with-coach-samira-yoga-videos-a-12-child-s-pose-with-knees-wide",
      "exercise-categories-pelvic-resistance-butterfly-stretch",
      "exercise-categories-pelvic-yoga-happy-baby",
      "exercise-categories-pelvic-yoga-child-s-pose"
    ],
    "7": [
      "workout-with-coaches-leakproof-with-coach-laura-seated-diaphragmatic-breathing",
      "workout-with-coaches-leakproof-with-coach-laura-postpartum-and-pelvic-pain-pelvic-tilts-exercise",
      "workout-with-coaches-leakproof-with-coach-laura-postpartum-and-pelvic-pain-windshield-wipers",
      "exercise-categories-pelvic-resistance-butterfly-stretch",
      "exercise-categories-pelvic-yoga-child-s-pose"
    ]
  },
  "intimacy.relaxation": {
    "2": [
      "workout-with-coaches-leakproof-with-coach-laura-seated-diaphragmatic-breathing",
      "exercise-categories-pelvic-yoga-cat-pose",
      "exercise-categories-pelvic-yoga-cow-pose",
      "exercise-categories-pelvic-resistance-child-s-pose",
      "exercise-categories-pelvic-resistance-deep-squat-rotations"
    ],
    "3": [
      "workout-with-coaches-leakproof-with-coach-laura-seated-diaphragmatic-breathing",
      "workout-with-coaches-leakproof-with-coach-laura-postpartum-and-pelvic-pain-pelvic-tilts-exercise",
      "exercise-categories-pelvic-resistance-butterfly-stretch",
      "workout-with-coaches-intimacy-sensation-with-coach-samira-yoga-videos-a-12-child-s-pose-with-knees-wide",
      "exercise-categories-pelvic-yoga-child-s-pose"
    ],
    "5": [
      "workout-with-coaches-leakproof-with-coach-laura-seated-diaphragmatic-breathing",
      "exercise-categories-pelvic-resistance-90-90-hip-switch",
      "exercise-categories-pelvic-resistance-deep-squat-rotations",
      "workout-with-coaches-intimacy-sensation-with-coach-samira-yoga-videos-a-18-extended-puppy-pose",
      "exercise-categories-pelvic-yoga-child-s-pose"
    ],
    "6": [
      "workout-with-coaches-leakproof-with-coach-laura-seated-diaphragmatic-breathing",
      "exercise-categories-pelvic-resistance-butterfly-stretch",
      "workout-with-coaches-intimacy-sensation-with-coach-samira-yoga-videos-a-12-child-s-pose-with-knees-wide",
      "workout-with-coaches-intimacy-sensation-with-coach-samira-yoga-videos-a-18-extended-puppy-pose",
      "exercise-categories-pelvic-yoga-happy-baby"
    ],
    "7": [
      "workout-with-coaches-leakproof-with-coach-laura-seated-diaphragmatic-breathing",
      "exercise-categories-pelvic-yoga-cat-pose",
      "exercise-categories-pelvic-yoga-cow-pose",
      "exercise-categories-pelvic-resistance-child-s-pose",
      "exercise-categories-pelvic-yoga-child-s-pose"
    ]
  },
  "intimacy.sensation": {
    "3": [
      "workout-with-coaches-leakproof-with-coach-laura-seated-diaphragmatic-breathing",
      "workout-with-coaches-leakproof-with-coach-laura-postpartum-and-pelvic-pain-pelvic-tilts-exercise",
      "exercise-categories-pelvic-yoga-bridge-pose",
      "exercise-categories-pelvic-strength-glute-bridges",
      "exercise-categories-pelvic-yoga-child-s-pose"
    ],
    "5": [
      "workout-with-coaches-leakproof-with-coach-laura-seated-diaphragmatic-breathing",
      "exercise-categories-pelvic-strength-glute-bridges",
      "exercise-categories-pelvic-strength-clamshells-left",
      "exercise-categories-pelvic-strength-clamshells-right",
      "exercise-categories-pelvic-yoga-bridge-pose"
    ],
    "6": [
      "workout-with-coaches-leakproof-with-coach-laura-seated-diaphragmatic-breathing",
      "workout-with-coaches-intimacy-sensation-with-coach-samira-yoga-videos-a-1-baby-cobra-pose-with-legs-crossed",
      "exercise-categories-pelvic-yoga-cat-pose",
      "exercise-categories-pelvic-yoga-cow-pose",
      "exercise-categories-pelvic-yoga-bridge-pose"
    ]
  },
  "intimacy.dryness": {
    "2": [
      "workout-with-coaches-leakproof-with-coach-laura-seated-diaphragmatic-breathing",
      "exercise-categories-pelvic-yoga-cat-pose",
      "exercise-categories-pelvic-yoga-cow-pose",
      "workout-with-coaches-intimacy-sensation-with-coach-samira-yoga-videos-a-1-baby-cobra-pose-with-legs-crossed",
      "workout-with-coaches-yoga-with-coach-maya-yoga-videos-b-7-hip-flexor-and-quad-stretches-2-supported-bridge"
    ],
    "3": [
      "workout-with-coaches-leakproof-with-coach-laura-seated-diaphragmatic-breathing",
      "workout-with-coaches-leakproof-with-coach-laura-postpartum-and-pelvic-pain-pelvic-tilts-exercise",
      "exercise-categories-pelvic-yoga-bridge-pose",
      "workout-with-coaches-intimacy-sensation-with-coach-samira-yoga-videos-a-12-child-s-pose-with-knees-wide",
      "exercise-categories-pelvic-yoga-child-s-pose"
    ],
    "5": [
      "workout-with-coaches-leakproof-with-coach-laura-seated-diaphragmatic-breathing",
      "workout-with-coaches-leakproof-with-coach-laura-postpartum-and-pelvic-pain-windshield-wipers",
      "exercise-categories-pelvic-resistance-butterfly-stretch",
      "workout-with-coaches-yoga-with-coach-maya-yoga-videos-b-7-hip-flexor-and-quad-stretches-2-supported-bridge",
      "exercise-categories-pelvic-yoga-child-s-pose"
    ],
    "6": [
      "workout-with-coaches-leakproof-with-coach-laura-seated-diaphragmatic-breathing",
      "workout-with-coaches-yoga-with-coach-maya-yoga-videos-b-4-definitive-poses-4-reclining-butterfly",
      "workout-with-coaches-intimacy-sensation-with-coach-samira-yoga-videos-a-18-extended-puppy-pose",
      "exercise-categories-pelvic-yoga-happy-baby",
      "exercise-categories-pelvic-yoga-child-s-pose"
    ],
    "7": [
      "workout-with-coaches-leakproof-with-coach-laura-seated-diaphragmatic-breathing",
      "exercise-categories-pelvic-yoga-cat-pose",
      "exercise-categories-pelvic-yoga-cow-pose",
      "workout-with-coaches-yoga-with-coach-maya-yoga-videos-b-7-hip-flexor-and-quad-stretches-2-supported-bridge",
      "exercise-categories-pelvic-yoga-child-s-pose"
    ]
  },
  "intimacy.confidence": {
    "3": [
      "workout-with-coaches-leakproof-with-coach-laura-seated-diaphragmatic-breathing",
      "workout-with-coaches-leakproof-with-coach-laura-postpartum-and-pelvic-pain-pelvic-tilts-exercise",
      "workout-with-coaches-leakproof-with-coach-laura-dead-bugs",
      "exercise-categories-pelvic-strength-glute-bridges",
      "exercise-categories-pelvic-yoga-child-s-pose"
    ],
    "5": [
      "workout-with-coaches-leakproof-with-coach-laura-seated-diaphragmatic-breathing",
      "exercise-categories-pelvic-strength-glute-bridges",
      "exercise-categories-pelvic-strength-clamshells-left",
      "exercise-categories-pelvic-strength-clamshells-right",
      "workout-with-coaches-leakproof-with-coach-laura-dead-bugs"
    ],
    "6": [
      "workout-with-coaches-leakproof-with-coach-laura-seated-diaphragmatic-breathing",
      "workout-with-coaches-intimacy-sensation-with-coach-samira-yoga-videos-a-12-child-s-pose-with-knees-wide",
      "exercise-categories-pelvic-resistance-butterfly-stretch",
      "workout-with-coaches-intimacy-sensation-with-coach-samira-yoga-videos-a-18-extended-puppy-pose",
      "exercise-categories-pelvic-yoga-bridge-pose"
    ],
    "7": [
      "workout-with-coaches-leakproof-with-coach-laura-seated-diaphragmatic-breathing",
      "workout-with-coaches-leakproof-with-coach-laura-postpartum-and-pelvic-pain-pelvic-tilts-exercise",
      "workout-with-coaches-leakproof-with-coach-laura-dead-bugs",
      "exercise-categories-pelvic-yoga-bridge-pose",
      "exercise-categories-pelvic-yoga-child-s-pose"
    ]
  },
  "intimacy.postpartum": {
    "1": [
      "workout-with-coaches-leakproof-with-coach-laura-seated-diaphragmatic-breathing",
      "workout-with-coaches-leakproof-with-coach-laura-postpartum-and-pelvic-pain-resting-pose",
      "workout-with-coaches-leakproof-with-coach-laura-postpartum-and-pelvic-pain-pelvic-tilts-exercise",
      "workout-with-coaches-intimacy-sensation-with-coach-samira-yoga-videos-a-12-child-s-pose-with-knees-wide"
    ],
    "2": [
      "workout-with-coaches-leakproof-with-coach-laura-seated-diaphragmatic-breathing",
      "workout-with-coaches-leakproof-with-coach-laura-postpartum-and-pelvic-pain-hip-circles",
      "workout-with-coaches-leakproof-with-coach-laura-postpartum-and-pelvic-pain-pelvic-tilts-exercise",
      "workout-with-coaches-intimacy-sensation-with-coach-samira-yoga-videos-a-1-baby-cobra-pose-with-legs-crossed",
      "workout-with-coaches-leakproof-with-coach-laura-postpartum-and-pelvic-pain-resting-pose"
    ],
    "3": [
      "workout-with-coaches-leakproof-with-coach-laura-seated-diaphragmatic-breathing",
      "workout-with-coaches-leakproof-with-coach-laura-postpartum-and-pelvic-pain-abdominal-brace",
      "workout-with-coaches-leakproof-with-coach-laura-postpartum-and-pelvic-pain-transverse-abdominal-contraction",
      "workout-with-coaches-leakproof-with-coach-laura-postpartum-and-pelvic-pain-bridge-with-pulse",
      "workout-with-coaches-leakproof-with-coach-laura-postpartum-and-pelvic-pain-resting-pose"
    ],
    "4": [
      "workout-with-coaches-leakproof-with-coach-laura-postpartum-and-pelvic-pain-hip-cars",
      "workout-with-coaches-leakproof-with-coach-laura-postpartum-and-pelvic-pain-windshield-wipers",
      "workout-with-coaches-leakproof-with-coach-laura-postpartum-and-pelvic-pain-leg-circles-left-leg",
      "exercise-categories-pelvic-resistance-figure-four-stretch-left",
      "workout-with-coaches-leakproof-with-coach-laura-postpartum-and-pelvic-pain-resting-pose"
    ],
    "5": [
      "workout-with-coaches-leakproof-with-coach-laura-seated-diaphragmatic-breathing",
      "workout-with-coaches-leakproof-with-coach-laura-postpartum-and-pelvic-pain-abdominal-brace",
      "workout-with-coaches-leakproof-with-coach-laura-postpartum-and-pelvic-pain-transverse-abdominal-march",
      "workout-with-coaches-leakproof-with-coach-laura-postpartum-and-pelvic-pain-bridge-with-heel-lift",
      "workout-with-coaches-leakproof-with-coach-laura-postpartum-and-pelvic-pain-resting-pose"
    ],
    "6": [
      "workout-with-coaches-leakproof-with-coach-laura-seated-diaphragmatic-breathing",
      "workout-with-coaches-leakproof-with-coach-laura-postpartum-and-pelvic-pain-resting-pose",
      "workout-with-coaches-leakproof-with-coach-laura-postpartum-and-pelvic-pain-windshield-wipers",
      "exercise-categories-pelvic-resistance-butterfly-stretch",
      "workout-with-coaches-intimacy-sensation-with-coach-samira-yoga-videos-a-12-child-s-pose-with-knees-wide"
    ],
    "7": [
      "workout-with-coaches-leakproof-with-coach-laura-seated-diaphragmatic-breathing",
      "workout-with-coaches-leakproof-with-coach-laura-postpartum-and-pelvic-pain-pelvic-tilts-exercise",
      "workout-with-coaches-leakproof-with-coach-laura-postpartum-and-pelvic-pain-hip-circles",
      "workout-with-coaches-leakproof-with-coach-laura-postpartum-and-pelvic-pain-abdominal-brace",
      "workout-with-coaches-leakproof-with-coach-laura-postpartum-and-pelvic-pain-resting-pose"
    ]
  }
};
