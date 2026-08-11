"use client";

// The two questionnaires a pelvic floor clinician actually charts, ported item
// for item from "Pelvic Floor/Core/Clinical/OutcomeMeasures.swift".
//
//   • ICIQ-UI SF — three scored items (frequency 0 to 5, amount 0 to 6,
//     interference 0 to 10) giving a total of 0 to 21, plus a fourth, unscored
//     self-diagnostic item about when leaks happen. Bands: 1 to 5 slight,
//     6 to 12 moderate, 13 to 18 severe, 19 to 21 very severe.
//
//   • PFDI-20 — twenty items in three subscales: POPDI-6 (prolapse), CRADI-8
//     (colorectal and anal), UDI-6 (urinary). Each item is 0 when the symptom is
//     absent and 1 to 4 for how much it bothers her. A subscale is the mean of
//     its answered items times 25, so each runs 0 to 100; the total is the sum
//     of the three, 0 to 300. Lower is better everywhere.
//
// THE ITEM WORDING IS THE STANDARD WORDING, and it is copied across unchanged
// on purpose. Rewriting an instrument's items invalidates it, and a score a
// clinician cannot trust is worse than no score. Where a clinical word is
// unavoidable ("rectum", "lower abdomen") a plain English hint sits under the
// question instead of replacing it — same as the phone.

export const ICIQ = {
  shortName: "ICIQ-UI SF",
  fullName:
    "International Consultation on Incontinence Questionnaire, Urinary Incontinence Short Form",
  maximumTotal: 21,

  frequencyQuestion: "How often do you leak urine?",
  frequencyOptions: [
    { score: 0, text: "Never" },
    { score: 1, text: "About once a week or less often" },
    { score: 2, text: "Two or three times a week" },
    { score: 3, text: "About once a day" },
    { score: 4, text: "Several times a day" },
    { score: 5, text: "All the time" },
  ],

  amountQuestion:
    "How much urine do you usually leak, whether you wear protection or not?",
  amountOptions: [
    { score: 0, text: "None" },
    { score: 2, text: "A small amount" },
    { score: 4, text: "A moderate amount" },
    { score: 6, text: "A large amount" },
  ],

  interferenceQuestion:
    "Overall, how much does leaking urine interfere with your everyday life?",
  interferenceLowLabel: "Not at all",
  interferenceHighLabel: "A great deal",

  situationQuestion: "When does urine leak?",
  situationHelp:
    "Pick all that apply to you. This one is not scored. It tells your clinician which kind of leaking you have.",
  situations: [
    { id: "never", text: "Never. Urine does not leak." },
    { id: "beforeToilet", text: "Leaks before you can get to the toilet" },
    { id: "coughSneeze", text: "Leaks when you cough or sneeze" },
    { id: "asleep", text: "Leaks when you are asleep" },
    { id: "activity", text: "Leaks when you are physically active or exercising" },
    { id: "afterFinishing", text: "Leaks when you have finished urinating and are dressed" },
    { id: "noReason", text: "Leaks for no obvious reason" },
    { id: "allTheTime", text: "Leaks all the time" },
  ],
};

/** Severity bands published with the ICIQ-UI SF. */
export function iciqSeverity(total) {
  if (total == null) return null;
  if (total < 1) return { id: "none", clinical: "None", plain: "No leaking right now" };
  if (total <= 5) return { id: "slight", clinical: "Slight", plain: "A little leaking" };
  if (total <= 12) return { id: "moderate", clinical: "Moderate", plain: "Leaking some of the time" };
  if (total <= 18) return { id: "severe", clinical: "Severe", plain: "Leaking a lot" };
  return { id: "verySevere", clinical: "Very severe", plain: "Leaking nearly all the time" };
}

/**
 * Nil until all three scored items have been answered. A partial ICIQ has no
 * published meaning, so it is never given a number.
 */
export function iciqTotal(answers) {
  const { frequency, amount, interference } = answers || {};
  if (frequency == null || amount == null || interference == null) return null;
  return frequency + amount + interference;
}

export const PFDI = {
  shortName: "PFDI-20",
  fullName: "Pelvic Floor Distress Inventory, short form",
  maximumTotal: 300,
  absentText: "No, I do not have this",
  botherQuestion: "How much does it bother you?",
  botherOptions: [
    { score: 1, text: "Not at all" },
    { score: 2, text: "Somewhat" },
    { score: 3, text: "Moderately" },
    { score: 4, text: "Quite a bit" },
  ],
};

export const PFDI_SUBSCALES = [
  { id: "popdi", shortName: "POPDI-6", fullName: "Pelvic Organ Prolapse Distress Inventory 6", plainTitle: "Pressure and heaviness" },
  { id: "cradi", shortName: "CRADI-8", fullName: "Colorectal Anal Distress Inventory 8", plainTitle: "Bowel symptoms" },
  { id: "udi", shortName: "UDI-6", fullName: "Urinary Distress Inventory 6", plainTitle: "Bladder symptoms" },
];

export const PFDI_ITEMS = [
  // POPDI-6
  { id: 1, subscale: "popdi", question: "Do you usually experience pressure in the lower abdomen?", hint: "The lower abdomen is the area below your belly button." },
  { id: 2, subscale: "popdi", question: "Do you usually experience heaviness or dullness in the pelvic area?", hint: "A heavy or dragging feeling low down." },
  { id: 3, subscale: "popdi", question: "Do you usually have a bulge or something falling out that you can see or feel in the vaginal area?", hint: null },
  { id: 4, subscale: "popdi", question: "Do you usually have to push on the vagina or around the rectum to have or complete a bowel movement?", hint: "The rectum is your back passage. A bowel movement means passing stool." },
  { id: 5, subscale: "popdi", question: "Do you usually experience a feeling of incomplete bladder emptying?", hint: "It feels like some urine is still left after you go." },
  { id: 6, subscale: "popdi", question: "Do you ever have to push up on a bulge in the vaginal area with your fingers to start or complete urination?", hint: null },

  // CRADI-8
  { id: 7, subscale: "cradi", question: "Do you feel you need to strain too hard to have a bowel movement?", hint: null },
  { id: 8, subscale: "cradi", question: "Do you feel you have not completely emptied your bowels at the end of a bowel movement?", hint: null },
  { id: 9, subscale: "cradi", question: "Do you usually lose stool beyond your control if your stool is well formed?", hint: "Solid stool leaks before you can get to a toilet." },
  { id: 10, subscale: "cradi", question: "Do you usually lose stool beyond your control if your stool is loose or liquid?", hint: null },
  { id: 11, subscale: "cradi", question: "Do you usually lose gas from the rectum beyond your control?", hint: "Wind you cannot hold in." },
  { id: 12, subscale: "cradi", question: "Do you usually have pain when you pass your stool?", hint: null },
  { id: 13, subscale: "cradi", question: "Do you experience a strong sense of urgency and have to rush to the bathroom to have a bowel movement?", hint: null },
  { id: 14, subscale: "cradi", question: "Does part of your stool ever pass through the rectum and bulge outside during or after a bowel movement?", hint: null },

  // UDI-6
  { id: 15, subscale: "udi", question: "Do you usually experience frequent urination?", hint: "You go to the toilet more often than feels normal for you." },
  { id: 16, subscale: "udi", question: "Do you usually experience urine leakage associated with a feeling of urgency, that is, a strong sensation of needing to go to the bathroom?", hint: null },
  { id: 17, subscale: "udi", question: "Do you usually experience urine leakage related to coughing, sneezing, or laughing?", hint: null },
  { id: 18, subscale: "udi", question: "Do you usually experience small amounts of urine leakage, that is, drops?", hint: null },
  { id: 19, subscale: "udi", question: "Do you usually experience difficulty emptying your bladder?", hint: null },
  { id: 20, subscale: "udi", question: "Do you usually experience pain or discomfort in the lower abdomen or genital region?", hint: null },
];

/**
 * Mean of the answered items times 25, so the subscale runs 0 to 100. Null when
 * nothing in the subscale was answered, which is what the published scoring
 * says to do.
 */
export function pfdiSubscaleScore(values, subscale) {
  const answers = PFDI_ITEMS.filter((i) => i.subscale === subscale)
    .map((i) => values?.[i.id])
    .filter((v) => typeof v === "number");
  if (!answers.length) return null;
  return (answers.reduce((sum, v) => sum + v, 0) / answers.length) * 25;
}

/** Sum of the three subscales, 0 to 300. Null unless all three scored. */
export function pfdiTotal(values) {
  const scores = PFDI_SUBSCALES.map((s) => pfdiSubscaleScore(values, s.id));
  if (scores.some((s) => s == null)) return null;
  return scores.reduce((sum, s) => sum + s, 0);
}

/** A plain sentence for a subscale score, so the member gets something back. */
export function pfdiPlainBand(score) {
  if (score < 10) return "Barely bothering you";
  if (score < 30) return "Bothering you a little";
  if (score < 60) return "Bothering you a fair amount";
  return "Bothering you a lot";
}
