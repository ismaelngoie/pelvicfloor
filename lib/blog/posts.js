// The articles this app router renders, and everything about them that is not
// prose.
//
// Metadata lives here rather than beside the prose so that three things cannot
// drift apart: the visible page, the JSON-LD, and whatever the sitemap decides
// to publish. The FAQ in particular is defined once and used twice, as the
// <details> list a reader opens and as the FAQPage entries a crawler reads. If
// those two ever disagree, Google calls it a mismatch and it is a manual action
// risk on a page that sells a health subscription.
//
// URL shape: these export as out/blog/<slug>.html, so they are served at
// /blog/<slug> with NO trailing slash, and the canonical says so. The 53 legacy
// posts in public/blog are directories of index.html and keep their trailing
// slash. Both resolve. See lib/blog/legacyPosts.js.
//
// `sources` are ids from lib/blog/sources.js. Anything an article states as a
// number has to be in one of them.
//
// `related` are slugs. New slugs are matched against this file; anything else is
// treated as a legacy post and gets the trailing slash automatically.

export const BLOG_BASE = "/blog";

/** New posts are served without a trailing slash; legacy posts keep theirs. */
export function postHref(slug) {
  return `${BLOG_BASE}/${slug}`;
}

export const POSTS = [
  {
    slug: "how-long-until-pelvic-floor-exercises-work",
    title: "How Long Do Pelvic Floor Exercises Take to Work?",
    description:
      "Most guidelines expect three months of pelvic floor training before you judge it. Here is what the research says about the timeline, week by week, and what should change first.",
    category: "Pelvic Floor Exercises",
    published: "2026-08-09",
    updated: "2026-08-09",
    readingMinutes: 8,
    keyTakeaways: [
      "Three months is the standard trial length. NICE tells clinicians to offer supervised pelvic floor muscle training of at least 3 months before deciding it has not worked.",
      "The first thing that changes is usually not leaking. It is being able to find the muscle and hold it, which most people notice inside two to three weeks.",
      "Strength gains in any muscle take about 6 to 12 weeks to become reliable, and the pelvic floor is not an exception to that.",
      "If nothing at all has shifted by week 8 of honest daily practice, the problem is usually technique, tension or dose, not effort. That is the moment to be assessed rather than to try harder.",
    ],
    faq: [
      {
        q: "Can I feel a difference in a week?",
        a: "Some people do, and what they feel is almost always coordination rather than strength. Being able to find the muscle, hold it for a few seconds and let it go completely is a skill, and skills improve fast. Actual muscle strength takes weeks longer.",
      },
      {
        q: "Is it too late if my symptoms started years ago?",
        a: "No. Trials of pelvic floor muscle training routinely include women whose symptoms are years old and still show benefit. How long you have had the symptom matters less than whether you are training the right muscle in the right way.",
      },
      {
        q: "What if I miss days?",
        a: "Missing days slows the timeline, it does not reset it. Consistency over weeks is what matters, not a perfect streak. Aim for most days rather than every day, and pick a dose you can actually repeat.",
      },
      {
        q: "Should I stop if it is not working after a month?",
        a: "A month is too early to judge, but it is a good moment to check your technique with a pelvic health physiotherapist. In a classic study, only 49% of women produced an ideal contraction after brief verbal instruction and a quarter used a technique that could make leaking worse. A single assessment can save you two months of training the wrong muscle.",
      },
      {
        q: "Do I have to keep doing them forever?",
        a: "Some maintenance is realistic. Strength that is not used fades, the same way it does anywhere else in the body. Most people move to a smaller weekly dose once symptoms settle rather than stopping outright.",
      },
    ],
    sources: [
      "niceNG123",
      "cochranePFMT",
      "cochranePFMTOpenAccess",
      "bumpTechnique",
      "niceQS77",
      "aptaPelvic",
      "pogp",
    ],
    related: [
      "how-many-kegels-should-i-do-a-day",
      "how-to-measure-pelvic-floor-progress",
      "why-am-i-still-leaking-after-kegels",
    ],
  },

  {
    slug: "how-many-kegels-should-i-do-a-day",
    title: "How Many Kegels Should You Do a Day?",
    description:
      "The guideline dose is at least 8 contractions, three times a day. Here is where that number comes from, how to split it between long holds and quick squeezes, and when more is worse.",
    category: "Pelvic Floor Exercises",
    published: "2026-08-09",
    updated: "2026-08-09",
    readingMinutes: 8,
    keyTakeaways: [
      "The dose in the NICE guideline is at least 8 contractions performed 3 times a day, which is 24 a day, not the hundreds you see quoted online.",
      "Split them. Long holds train endurance, quick squeezes train the reflex that catches a cough, and most symptoms need both.",
      "The rest between contractions is part of the exercise. A pelvic floor that never fully lets go is not getting stronger, it is getting tighter.",
      "If squeezing makes you ache, makes you need the toilet more, or hurts during sex, stop counting reps and get assessed for a tight pelvic floor first.",
    ],
    faq: [
      {
        q: "Is 100 kegels a day better than 24?",
        a: "No, and it is often worse. The guideline dose exists because quality collapses with fatigue: past a certain point you stop recruiting the pelvic floor and start squeezing your glutes, thighs and abdominals instead. Twenty-four good contractions beat a hundred sloppy ones.",
      },
      {
        q: "How long should I hold each one?",
        a: "Start with what you can hold cleanly, which for many people is 3 to 5 seconds, and build towards 8 to 10. Rest at least as long as you held. If the last contraction in a set is noticeably weaker than the first, you have found your current limit, and that is useful information rather than a failure.",
      },
      {
        q: "Can I do them while driving or at my desk?",
        a: "Yes, once you are confident you are contracting the right muscle. Early on it helps to lie down, because gravity is doing less and it is easier to feel what is moving. Progressing to sitting and then standing is part of the training, not a shortcut.",
      },
      {
        q: "What if I cannot feel anything at all?",
        a: "That is common and it is the single best reason to see a pelvic health physiotherapist. An internal examination tells you in one appointment whether the muscle is contracting, whether it is contracting the wrong way, or whether it is already too tight to move.",
      },
      {
        q: "Do men do the same number?",
        a: "The dose used in men's rehabilitation is broadly similar in structure, with sets of holds and quick contractions repeated across the day. The muscle group and the cues differ, so use instructions written for men rather than translating these.",
      },
    ],
    sources: [
      "niceNG123",
      "niceQS77",
      "bumpTechnique",
      "cochranePFMT",
      "ics",
      "aptaPelvic",
      "pogp",
    ],
    related: [
      "how-long-until-pelvic-floor-exercises-work",
      "pelvic-floor-red-flags",
      "how-to-do-kegels-correctly",
    ],
  },

  {
    slug: "bladder-training-plan-for-urgency",
    title: "Bladder Training: A 6-Week Plan for Urgency and Frequency",
    description:
      "If the problem is getting to the toilet in time rather than a cough, kegels are the wrong first move. Bladder training is the guideline first-line treatment. Here is the actual protocol.",
    category: "Leakproof Control",
    published: "2026-08-09",
    updated: "2026-08-09",
    readingMinutes: 9,
    keyTakeaways: [
      "For urgency, NICE recommends bladder training for a minimum of 6 weeks as the first-line treatment, before medication is considered.",
      "Bladder training is not holding on until you are desperate. It is delaying by small, deliberate amounts and using an urge-suppression routine so the urge passes before you move.",
      "Start by measuring. Three days of a simple bladder diary tells you your real current interval, which is the number the whole plan is built on.",
      "Going to the toilet just in case is the habit that shrinks the interval fastest, and it is the one most people do not realise they have.",
    ],
    faq: [
      {
        q: "How is urgency different from stress incontinence?",
        a: "Stress incontinence leaks when pressure spikes: a cough, a sneeze, a jump. Urgency leaks are preceded by a sudden desperate need to go, and often happen on the way to the bathroom or when you put the key in the front door. Many people have both, which is called mixed incontinence.",
      },
      {
        q: "Should I drink less to leak less?",
        a: "Usually not. Concentrated urine irritates the bladder lining and can make urgency worse, so cutting fluids often backfires. What tends to help is moving fluid earlier in the day rather than reducing the total, and looking at caffeine and alcohol specifically.",
      },
      {
        q: "How long before I notice a change?",
        a: "The guideline minimum trial is six weeks, and most people see their interval start to stretch somewhere in weeks two to four. If nothing at all has moved by six weeks of honest practice, that is the point to go back to your clinician rather than to keep going alone.",
      },
      {
        q: "What if I leak while I am trying to delay?",
        a: "Then the delay was too long for now. Shorten it. The plan only works if you succeed most of the time, because what you are training is the confidence that an urge can pass, and leaking teaches the opposite.",
      },
      {
        q: "Can I do pelvic floor exercises at the same time?",
        a: "Yes, and for mixed symptoms that combination is what guidelines expect. A quick, strong pelvic floor squeeze is also part of urge suppression itself, because it sends a signal that helps settle the bladder muscle.",
      },
    ],
    sources: ["niceNG123", "niceQS77", "nhsIncontinence", "ics", "aptaPelvic"],
    related: [
      "how-to-measure-pelvic-floor-progress",
      "pelvic-floor-red-flags",
      "understanding-urge-vs-stress-incontinence",
    ],
  },

  {
    slug: "pelvic-floor-red-flags",
    title: "Pelvic Floor Red Flags: When to Stop and See Someone",
    description:
      "Most pelvic symptoms are common and treatable. A small number are not, and they are worth knowing by name. Here are the ones that mean stop exercising and get seen, today.",
    category: "Getting Help",
    published: "2026-08-09",
    updated: "2026-08-09",
    readingMinutes: 8,
    keyTakeaways: [
      "Pelvic floor exercises are not the right response to blood, fever, a new lump, or pain that wakes you at night. Those need a person, not a program.",
      "In pregnancy and for a full year after birth, the CDC's urgent maternal warning signs override everything else on this page. A severe headache that will not shift, a fever of 100.4F or higher, chest pain or trouble breathing means emergency care now.",
      "Losing control of your bowels along with numbness in the saddle area and new difficulty passing urine is a medical emergency called cauda equina syndrome. Go to an emergency department the same day.",
      "Pain that gets worse when you do pelvic floor exercises is a reason to stop them and be assessed, not a reason to push through.",
    ],
    faq: [
      {
        q: "Is it normal to leak a little after having a baby?",
        a: "It is common, which is not the same as normal or as something you have to live with. Leaking that is still there at three months postpartum is worth an appointment with a pelvic health physiotherapist rather than another six months of waiting.",
      },
      {
        q: "I feel a bulge. Is that an emergency?",
        a: "A feeling of heaviness or a bulge is the classic description of pelvic organ prolapse. It is not usually an emergency and it is very treatable, including without surgery. It is a reason to book an appointment rather than to go to hospital, unless you also cannot pass urine.",
      },
      {
        q: "Should I stop exercising completely if something hurts?",
        a: "Stop the thing that hurts. That is different from stopping everything. Gentle breathing and general movement are almost always still fine, and a physiotherapist can tell you which specific loads to leave alone while the cause is being sorted out.",
      },
      {
        q: "Can pelvic pain be caused by stress?",
        a: "Stress and pain genuinely interact, and a pelvic floor that is held tight all day can produce real physical symptoms. That is not the same as the pain being imagined, and it is also not a reason to skip investigation of the physical causes first.",
      },
      {
        q: "What if my doctor tells me it is just part of getting older?",
        a: "Ask for a referral to a pelvic health physiotherapist anyway, or find one directly. Incontinence becomes more common with age; that does not make it untreatable, and guidelines recommend a proper trial of conservative treatment regardless of age.",
      },
    ],
    sources: [
      "cdcWarningSigns",
      "acogProlapse",
      "niceNG123",
      "nhsIncontinence",
      "aptaPelvic",
      "pogp",
    ],
    related: [
      "what-happens-at-a-pelvic-floor-physio-appointment",
      "how-many-kegels-should-i-do-a-day",
      "postpartum-bleeding-lochia-whats-normal-when-to-call-doctor",
    ],
  },

  {
    slug: "what-happens-at-a-pelvic-floor-physio-appointment",
    title: "What Actually Happens at a Pelvic Floor Physio Appointment",
    description:
      "The reason most people never book one is not cost, it is not knowing what they are walking into. Here is the appointment, step by step, including what you can decline.",
    category: "Getting Help",
    published: "2026-08-09",
    updated: "2026-08-09",
    readingMinutes: 9,
    keyTakeaways: [
      "The first appointment is mostly talking. Expect 20 to 30 minutes of questions about bladder, bowel, sex and birth history before anyone examines anything.",
      "An internal examination is the most useful single test, because it is the only way to know whether your pelvic floor is weak, tight, or simply being contracted the wrong way. It is also optional, every time.",
      "You can say no to any part of it and still get a useful assessment and a plan. Consent is ongoing, not a form you sign once at the start.",
      "One assessment can save months. After brief verbal instruction only 49% of women in one study produced an ideal contraction, and 25% used a technique that could promote incontinence. No app can see that happening.",
    ],
    faq: [
      {
        q: "Do I have to have an internal examination?",
        a: "No. It is offered because it gives the clearest picture, but you can decline it and still be assessed. External observation, questions, a bladder diary and functional testing all give a physiotherapist useful information.",
      },
      {
        q: "What should I wear?",
        a: "Something you can move in and undress from easily. You will usually be asked to move, breathe and possibly squat or step, so leggings or shorts work better than a fitted dress.",
      },
      {
        q: "Can I go on my period?",
        a: "Yes. Many clinics will still see you and simply skip or reschedule an internal examination. It is worth mentioning when you book so nobody is surprised.",
      },
      {
        q: "How many appointments will I need?",
        a: "It varies with the problem, but a common pattern is an assessment, then a review three to six weeks later, then a small number of follow-ups spaced further apart. Most of the work happens at home between appointments.",
      },
      {
        q: "Do I need a referral?",
        a: "It depends on your country and your insurance. In much of the US you can self-refer to a physical therapist under direct access rules; in the UK some NHS trusts take self-referrals for pelvic health and others need a GP. Check the clinic's own page first.",
      },
    ],
    sources: ["niceNG123", "bumpTechnique", "niceQS77", "aptaPelvic", "pogp", "acogProlapse"],
    related: [
      "pelvic-floor-red-flags",
      "how-to-choose-a-pelvic-floor-app",
      "hypertonic-vs-hypotonic-pelvic-floor-self-checks-treatment",
    ],
  },

  {
    slug: "pelvic-floor-exercises-for-menopause",
    title: "Pelvic Floor Exercises and Menopause: What Changes, What Helps",
    description:
      "Leaks, urgency and dryness that arrive around menopause are a tissue problem as much as a strength problem. Here is what oestrogen changes, and why training alone is often only half the answer.",
    category: "Menopause",
    published: "2026-08-09",
    updated: "2026-08-09",
    readingMinutes: 9,
    keyTakeaways: [
      "Falling oestrogen thins and dries the tissue of the vagina, urethra and bladder base. That is a separate problem from muscle weakness, and pelvic floor exercises do not fix it on their own.",
      "Pelvic floor muscle training still works after menopause. The Cochrane evidence for it is not age-limited, and it remains first-line for stress and mixed incontinence.",
      "Local vaginal oestrogen is a recognised treatment for genitourinary symptoms of menopause, and NICE covers it in its menopause guideline. It is a conversation to have with a clinician, not something to rule out by reading.",
      "If sex has become painful, adding more kegels is likely to make it worse. Tight, dry tissue needs lengthening and lubrication before it needs strengthening.",
    ],
    faq: [
      {
        q: "Is leaking just part of getting older?",
        a: "It gets more common with age, and it is still treatable at every age. Guidelines recommend a proper trial of pelvic floor muscle training and, for urgency, bladder training, regardless of how old you are.",
      },
      {
        q: "Will HRT fix my bladder symptoms?",
        a: "That is a question for a clinician who knows your history. Systemic HRT and local vaginal oestrogen are different treatments with different evidence, and local oestrogen is the one specifically aimed at genitourinary symptoms. Do not start or stop either based on an article.",
      },
      {
        q: "Why does sex hurt now when it never did?",
        a: "The most common reason around menopause is thinner, drier, less elastic tissue, often with pelvic floor muscles that have tightened protectively in response. Both parts usually need addressing, and doing more strengthening while it hurts tends to make the second part worse.",
      },
      {
        q: "Do pelvic floor exercises help with dryness?",
        a: "Not directly. They improve muscle function and blood flow, which can help sensation and comfort, but they do not restore the tissue changes that low oestrogen causes. Lubricants, vaginal moisturisers and local oestrogen address that side.",
      },
      {
        q: "Is it too late to start if I am years past menopause?",
        a: "No. Muscle responds to training at every age. What changes is that the tissue side of the problem is more likely to need addressing alongside the training rather than instead of it.",
      },
    ],
    sources: [
      "niceNG23",
      "niceNG123",
      "cochranePFMT",
      "cochranePFMTOpenAccess",
      "acogProlapse",
      "aptaPelvic",
      "pogp",
    ],
    related: [
      "how-many-kegels-should-i-do-a-day",
      "pelvic-floor-red-flags",
      "guide-to-releasing-a-tight-pelvic-floor",
    ],
  },

  {
    slug: "how-to-measure-pelvic-floor-progress",
    title: "How to Tell If Your Pelvic Floor Training Is Working",
    description:
      "Feeling stronger is not evidence. Clinicians score pelvic floor symptoms with two short questionnaires, the ICIQ-UI SF and the PFDI-20. You can use both at home, free, in ten minutes.",
    category: "Progress and Measurement",
    published: "2026-08-09",
    updated: "2026-08-09",
    readingMinutes: 10,
    keyTakeaways: [
      "The ICIQ-UI SF scores urinary leaking from 0 to 21 using three questions, and it is the instrument most incontinence trials report.",
      "The PFDI-20 covers the wider picture in 20 questions across prolapse, bowel and bladder symptoms, scoring 0 to 300, where lower is better.",
      "A change only counts once it is bigger than the measurement noise. Published estimates put a meaningful ICIQ-UI SF improvement at roughly 2.5 points, and the PFDI-20 threshold varies by treatment, from roughly 13 points in conservative care up to the 40s after surgery.",
      "Score yourself before you start, not after you have already improved. A baseline you did not take is the one number you cannot go back and get.",
    ],
    faq: [
      {
        q: "Are these questionnaires free to use?",
        a: "The ICIQ family is distributed by the ICIQ group and is free for individual clinical and research use, with registration required for study use. The PFDI-20 is widely published in the medical literature. Both are used routinely in clinics.",
      },
      {
        q: "How often should I score myself?",
        a: "Monthly is plenty. These instruments ask about the last four weeks, so scoring weekly measures noise. A baseline, then day 30, day 60 and day 90 gives you a curve without turning your recovery into a spreadsheet.",
      },
      {
        q: "My score went up. Does that mean I am worse?",
        a: "It might mean a bad four weeks rather than a trend. One score is a point, two scores are a line, three are a direction. Also check whether something changed: a new medication, an illness, a return to running.",
      },
      {
        q: "Can I show these scores to my doctor?",
        a: "Yes, and that is the main reason to bother. A urogynaecologist or a pelvic health physiotherapist recognises both instruments immediately, which makes an eight-minute appointment far more productive than describing symptoms from memory.",
      },
      {
        q: "What if my symptom is not urinary?",
        a: "The PFDI-20 is the better fit, because it has separate subscales for prolapse symptoms and for bowel and rectal symptoms alongside the urinary ones. The ICIQ group also publishes separate questionnaires for bowel symptoms and for sexual function.",
      },
    ],
    sources: [
      "iciq",
      "iciqMID",
      "pfdiMID",
      "niceNG123",
      "cochranePFMT",
      "aptaPelvic",
    ],
    related: [
      "how-long-until-pelvic-floor-exercises-work",
      "bladder-training-plan-for-urgency",
      "how-to-choose-a-pelvic-floor-app",
    ],
  },

  {
    slug: "how-to-choose-a-pelvic-floor-app",
    title: "How to Choose a Pelvic Floor App, Including Ours",
    description:
      "There are over a hundred pelvic floor apps and most are a timer with a logo. Seven questions that separate the ones built on a clinical protocol from the ones that count to ten.",
    category: "Getting Help",
    published: "2026-08-09",
    updated: "2026-08-09",
    readingMinutes: 9,
    keyTakeaways: [
      "One published evaluation found 120 pelvic floor apps in the stores and scored 32 in detail. Only about a third cited any primary literature at all.",
      "The first question is not how good the app is. It is whether your pelvic floor is weak or tight, because a strengthening app given to a tight pelvic floor makes symptoms worse.",
      "Check the dose against the guideline. If an app cannot deliver at least 8 contractions three times a day and keep it up for three months, it is not delivering the treatment the guideline describes.",
      "An app is not a substitute for an assessment. The best use of one is doing the work between appointments, and the best apps say so.",
    ],
    faq: [
      {
        q: "Are pelvic floor apps actually effective?",
        a: "App-delivered pelvic floor muscle training has been tested in randomised trials and can improve symptoms. What is being tested is the training, though, not the app itself: the delivery method matters much less than whether the right muscle is being trained at the right dose for long enough.",
      },
      {
        q: "Do I need a device that goes inside?",
        a: "No. Biofeedback devices can help some people confirm they are contracting correctly, but guidelines make supervised training the first-line treatment, not a gadget. A physiotherapist's finger does the same job with better judgement attached.",
      },
      {
        q: "Free or paid?",
        a: "Price is a poor signal on its own. What matters is whether the program progresses, whether it can tell weak from tight, and whether anyone with clinical training shaped the content. Plenty of paid apps are timers, and a few free ones are made by health services.",
      },
      {
        q: "What should make me delete an app immediately?",
        a: "Any app that promises to cure prolapse, that tells you to push or bear down, that has no way to say your symptoms are getting worse, or that never once suggests seeing a clinician.",
      },
      {
        q: "Is Pelvi right for everyone?",
        a: "No. If you have not been assessed and you have pain, a bulge, or symptoms that are getting worse, see a pelvic health physiotherapist first. Pelvi is built for the training part, and training is only one part of the answer.",
      },
    ],
    sources: [
      "appEvaluation",
      "niceNG123",
      "bumpTechnique",
      "cochranePFMT",
      "aptaPelvic",
      "pogp",
    ],
    related: [
      "what-happens-at-a-pelvic-floor-physio-appointment",
      "how-to-measure-pelvic-floor-progress",
      "how-many-kegels-should-i-do-a-day",
    ],
  },
];

export const POSTS_BY_SLUG = Object.fromEntries(
  POSTS.map((post) => [post.slug, post])
);

/**
 * Every URL this section owns, newest first, for whoever builds the sitemap.
 * `lastModified` is the article's own updated date and not the build time, so
 * that it stays true across redeploys. Google only honours lastmod when it
 * matches the page, and an inaccurate one poisons the honest ones later.
 */
export function blogSitemapEntries(baseUrl = "https://pelvi.health") {
  return POSTS.map((post) => ({
    url: `${baseUrl}${postHref(post.slug)}`,
    lastModified: post.updated,
  }));
}
