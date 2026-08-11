"use client";

// The Resource Center's five articles and three trusted sources, ported
// verbatim from "Pelvic Floor/Scene/Main/Hub/Health Resources/HealthResourcesView.swift"
// (ResourceProvider).
//
// These are NOT the 23 Insights articles. Those live in public/content/insights.json
// and are already on the Insights tab; these five are the safety and anatomy set
// the phone keeps behind the You tab, and none of them appears in that file.
// Do not rewrite the copy here — it is the same words a member reads on her
// phone, including the three "when to see a doctor" rules, and a paraphrase of a
// safety article is a different safety article.

export const RESOURCE_CATEGORIES = [
  { id: "safetyFirst", title: "Safety First" },
  { id: "understandingYourBody", title: "Understanding Your Body" },
  { id: "clinicalReferences", title: "Trusted Sources" },
];

export const RESOURCE_ARTICLES = [
  {
    id: "whenToSeeADoctor",
    category: "safetyFirst",
    title: "When to See a Doctor",
    summary: "The signs that mean it is time to call a doctor.",
    accent: "#FF2D55",
    body: [
      { type: "h", text: "Your Health Comes First" },
      { type: "p", text: "This app helps you build strength and body awareness. It does not replace medical advice. Your safety comes first." },
      { type: "p", text: "Please see a doctor or a pelvic health physical therapist if any of these happen:" },
      { type: "li", text: "Sharp, shooting, or intense pain during or after exercise." },
      { type: "li", text: "A sudden change or worsening of your symptoms (like increased leaking or pain)." },
      { type: "li", text: "Bleeding, numbness, or tingling in the pelvic region." },
      { type: "li", text: "If you suspect you may have a prolapse (a feeling of heaviness, bulging, or pressure)." },
      { type: "p", text: "A doctor can give you a proper diagnosis and a plan built for you. Think of this app as part of your team, working alongside your doctor." },
    ],
    takeaways: [
      "Sharp or intense pain is not normal. Stop and consult a professional.",
      "If things suddenly get worse, see a doctor.",
      "This app supports medical care. It does not replace it.",
    ],
  },
  {
    id: "isSorenessNormal",
    category: "safetyFirst",
    title: "Is Some Muscle Soreness Normal?",
    summary: "How to tell normal tiredness from a warning sign.",
    accent: "#AF52DE",
    body: [
      { type: "h", text: "Feeling the Burn (The Good Kind)" },
      { type: "p", text: "Yes. Mild soreness is normal when you start any new exercise, and the pelvic floor is no different. It usually shows up a day or two later, and it means your muscles are getting stronger." },
      { type: "p", text: "What to Expect:" },
      { type: "li", text: "A feeling of tiredness or a dull ache in the pelvic region, similar to how your legs might feel after doing squats." },
      { type: "li", text: "It usually turns up 1 to 2 days after a session and fades on its own." },
      { type: "p", text: "What is NOT Normal: You should never feel sharp, shooting, stabbing, or intense pain. Pain that makes you wince or alter your movement is a warning sign from your body to stop." },
      { type: "p", text: "If you feel sharp pain, stop and speak to a doctor. The rule is simple: if it does not feel right, do not do it." },
    ],
    takeaways: [
      "Mild muscle fatigue is a normal sign of your muscles getting stronger.",
      "Soreness should feel like a dull ache, not sharp or stabbing pain.",
      "If you feel any sharp pain, stop the exercise immediately.",
    ],
  },
  {
    id: "medicalDisclaimer",
    category: "safetyFirst",
    title: "Medical Disclaimer",
    summary: "What this app is, and what it is not.",
    accent: "#E8934A",
    body: [
      { type: "h", text: "For Informational Purposes Only" },
      { type: "p", text: "Everything in this app is here to teach and inform. It is not a medical diagnosis, medical advice, or treatment." },
      { type: "p", text: "The use of this app does not create a doctor-patient relationship." },
      { type: "p", text: "Always ask your doctor or another qualified health professional about any medical condition. Never ignore or delay medical advice because of something you read or did in this app. Anything you do with the information here is at your own risk." },
    ],
    takeaways: [
      "This app is here to teach. It is not medical advice.",
      "Using this app does not create a doctor-patient relationship.",
      "Always ask a doctor about any medical worry.",
    ],
  },
  {
    id: "anatomyOfThePelvicFloor",
    category: "understandingYourBody",
    title: "How Your Pelvic Floor Works",
    summary: "A plain guide to the muscles you are training, and why they matter.",
    accent: "#4E9BE6",
    body: [
      { type: "h", text: "Your Body's “Support System”" },
      { type: "p", text: "Think of your pelvic floor as a muscular “hammock” or sling that stretches from your pubic bone at the front to your tailbone at the back. This group of muscles, ligaments, and tissues has three crucial jobs:" },
      { type: "li", text: "Support: It holds up your pelvic organs, including your bladder, bowel, and (in women) your uterus." },
      { type: "li", text: "Control: It wraps around the openings for urine and stool and works like a valve. When you need to hold on, these are the muscles doing the work." },
      { type: "li", text: "Sex: These muscles matter for arousal and orgasm." },
      { type: "p", text: "When these muscles are weak or out of sync, you get leaks or a heavy, dropping feeling. When they are too tight, you get pain or a sudden need to go. That is why the plan builds a pelvic floor that is strong and able to relax." },
    ],
    takeaways: [
      "The pelvic floor acts as a supportive hammock for your pelvic organs.",
      "It controls both your bladder and your bowel.",
      "A healthy pelvic floor means better feeling during sex.",
    ],
  },
  {
    id: "mindBodyConnection",
    category: "understandingYourBody",
    title: "The Mind-Body Connection",
    summary: "Stress lands in your pelvic floor. Here is how to break the cycle.",
    accent: "#5856D6",
    body: [
      { type: "h", text: "Your Body's Stress Container" },
      { type: "p", text: "When you feel stressed or anxious, what's the first thing you do physically? Many people clench their jaw, raise their shoulders, or tighten their fists. Your pelvic floor does the exact same thing. It's a common area for the body to subconsciously hold tension." },
      { type: "p", text: "The Tension Cycle: Long-running stress leaves the pelvic floor permanently tight (hypertonic). That tension brings pelvic pain, a sudden need to go, and pain during sex. Those problems are stressful in themselves, so stress makes you tight and tightness makes you more stressed." },
      { type: "p", text: "Breaking the Cycle with Mindfulness: The trick is to notice this area on purpose. Pair your exercises with slow breathing and your body learns to let the tension go." },
      { type: "li", text: "Body Scan: Take 60 seconds to mentally scan your body. Notice any areas of tension without judgment. Can you feel tension in your jaw? Your shoulders? Your pelvic floor?" },
      { type: "li", text: "Letting Go: Use slow, deep belly breaths to tell your pelvic floor to soften on every breath in." },
      { type: "p", text: "Noticing this link between mind and body is a big step toward lasting relief." },
    ],
    takeaways: [
      "The pelvic floor is a common area where the body holds stress.",
      "Stress can create a cycle of muscle tightness and increased anxiety.",
      "Slow breathing calms your body and lets the tension go.",
    ],
  },
];

export const TRUSTED_SOURCES = [
  {
    id: "mayo",
    source: "Mayo Clinic",
    url: "https://www.mayoclinic.org/healthy-lifestyle/womens-health/in-depth/kegel-exercises/art-20045283",
    host: "mayoclinic.org",
  },
  {
    id: "niddk",
    source: "NIH.gov",
    url: "https://www.niddk.nih.gov/health-information/urologic-diseases/kegel-exercises",
    host: "niddk.nih.gov",
  },
  {
    id: "acog",
    source: "ACOG",
    url: "https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2020/04/physical-activity-and-exercise-during-pregnancy-and-the-postpartum-period",
    host: "acog.org",
  },
];
