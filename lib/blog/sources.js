// Every external source any article is allowed to cite, in one place.
//
// Why a registry instead of inline links: a health article that cites a dead
// URL is worse than one that cites nothing, because the reader who clicks is
// the reader who was checking. Keeping them here means one file to re-check,
// and it means two articles citing NICE NG123 cite the same NICE NG123.
//
// Rule for adding one: the URL has to have been fetched and returned a real
// page, and the claim the article makes has to be the claim the source makes.
// Anti-bot 403s from a publisher are fine (Cochrane and the CDC both serve them
// to scripts); a 404 is not.
//
// `note` is what this source actually supports. If an article needs a claim the
// note does not cover, the article is wrong, not the note.

export const SOURCES = {
  niceNG123: {
    id: "niceNG123",
    label:
      "NICE. Urinary incontinence and pelvic organ prolapse in women: management (NG123)",
    url: "https://www.nice.org.uk/guidance/ng123",
    publisher: "National Institute for Health and Care Excellence",
    year: "2019",
    note: "Supervised pelvic floor muscle training of at least 3 months as first-line treatment for stress or mixed urinary incontinence; programmes of at least 8 contractions 3 times a day; bladder training for a minimum of 6 weeks as first-line treatment for urgency or mixed urinary incontinence.",
  },
  niceQS77: {
    id: "niceQS77",
    label: "NICE. Urinary incontinence in women: quality standard (QS77)",
    url: "https://www.nice.org.uk/guidance/qs77",
    publisher: "National Institute for Health and Care Excellence",
    year: "2015",
    note: "Quality statements on supervised pelvic floor muscle training and on bladder training.",
  },
  niceNG23: {
    id: "niceNG23",
    label: "NICE. Menopause: identification and management (NG23)",
    url: "https://www.nice.org.uk/guidance/ng23",
    publisher: "National Institute for Health and Care Excellence",
    year: "2024",
    note: "Management of menopausal symptoms, including vaginal oestrogen for urogenital atrophy.",
  },
  cochranePFMT: {
    id: "cochranePFMT",
    label:
      "Dumoulin C, Cacciari LP, Hay-Smith EJC. Pelvic floor muscle training versus no treatment, or inactive control treatments, for urinary incontinence in women. Cochrane Database of Systematic Reviews",
    url: "https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD005654.pub4/full",
    publisher: "Cochrane",
    year: "2018",
    note: "31 trials, 1,817 women. Women with stress urinary incontinence doing PFMT were eight times more likely to report cure than controls (56% versus 6%, RR 8.38). Across any type of incontinence, five times more likely (35% versus 6%, RR 5.34).",
  },
  cochranePFMTOpenAccess: {
    id: "cochranePFMTOpenAccess",
    label:
      "Dumoulin C, et al. Abridged republication of the Cochrane review, free full text (PMC6428911)",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC6428911/",
    publisher: "Brazilian Journal of Physical Therapy / PubMed Central",
    year: "2019",
    note: "Open-access version of the same review, for readers without a Cochrane subscription.",
  },
  iciq: {
    id: "iciq",
    label: "ICIQ-UI Short Form, the ICIQ questionnaire group",
    url: "https://iciq.net/iciq-ui-sf",
    publisher: "International Consultation on Incontinence Questionnaire",
    year: "",
    note: "The instrument itself: three scored items (frequency 0 to 5, amount 0 to 6, interference 0 to 10) totalling 0 to 21, plus one unscored item on when leaks happen.",
  },
  iciqMID: {
    id: "iciqMID",
    label:
      "Minimum important difference of the ICIQ-UI SF score after self-management of urinary incontinence (PMC10865549)",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10865549/",
    publisher: "PubMed Central",
    year: "2024",
    note: "Reviews published minimum important difference estimates for the ICIQ-UI SF, including a drop of about 2.5 points at four months in a self-management population.",
  },
  pfdiMID: {
    id: "pfdiMID",
    label:
      "Minimal important difference and patient acceptable symptom state for PFDI-20 and POPDI-6 in pelvic organ prolapse surgery (PMC8642346)",
    url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8642346/",
    publisher: "PubMed Central",
    year: "2021",
    note: "Minimal important difference estimates for the PFDI-20 vary by treatment: roughly 13 to 23 points in conservative care cohorts and 24 to 53 points after surgery.",
  },
  bumpTechnique: {
    id: "bumpTechnique",
    label:
      "Bump RC, Hurt WG, Fantl JA, Wyman JF. Assessment of Kegel pelvic muscle exercise performance after brief verbal instruction. American Journal of Obstetrics and Gynecology",
    url: "https://pubmed.ncbi.nlm.nih.gov/1872333/",
    publisher: "American Journal of Obstetrics and Gynecology",
    year: "1991",
    note: "After brief verbal instruction, only 49% of women produced an ideal pelvic floor contraction, and 25% used a technique that could promote incontinence. The authors concluded that verbal or written instruction alone is not adequate preparation for starting a programme.",
  },
  acogProlapse: {
    id: "acogProlapse",
    label: "ACOG. Pelvic Support Problems",
    url: "https://www.acog.org/womens-health/faqs/pelvic-support-problems",
    publisher: "American College of Obstetricians and Gynecologists",
    year: "",
    note: "Patient-facing explanation of pelvic organ prolapse, its symptoms and its treatment options.",
  },
  cdcWarningSigns: {
    id: "cdcWarningSigns",
    label: "CDC Hear Her. Urgent Maternal Warning Signs",
    url: "https://www.cdc.gov/hearher/maternal-warning-signs/index.html",
    publisher: "US Centers for Disease Control and Prevention",
    year: "",
    note: "The list of symptoms during pregnancy and in the year after birth that mean get medical care immediately.",
  },
  nhsIncontinence: {
    id: "nhsIncontinence",
    label: "NHS. Urinary incontinence",
    url: "https://www.nhs.uk/conditions/urinary-incontinence/",
    publisher: "NHS",
    year: "",
    note: "Plain-English overview of the types of urinary incontinence and how they are treated.",
  },
  appEvaluation: {
    id: "appEvaluation",
    label:
      "Barnes KL, et al. Evaluation of Smartphone Pelvic Floor Exercise Applications Using Standardized Scoring System. Female Pelvic Medicine and Reconstructive Surgery",
    url: "https://journals.lww.com/fpmrs/Abstract/2019/07000/Evaluation_of_Smartphone_Pelvic_Floor_Exercise.14.aspx",
    publisher: "Female Pelvic Medicine and Reconstructive Surgery",
    year: "2019",
    note: "120 pelvic floor apps found, 32 scored in detail. Only about a third of them cited any primary literature in their store descriptions.",
  },
  ics: {
    id: "ics",
    label: "International Continence Society",
    url: "https://www.ics.org/",
    publisher: "ICS",
    year: "",
    note: "The body that publishes the standard terminology for lower urinary tract function.",
  },
  pogp: {
    id: "pogp",
    label: "Pelvic, Obstetric and Gynaecological Physiotherapy (POGP)",
    url: "https://thepogp.co.uk/",
    publisher: "POGP",
    year: "",
    note: "UK professional network for pelvic health physiotherapists, with a public find-a-physio directory.",
  },
  aptaPelvic: {
    id: "aptaPelvic",
    label: "APTA Pelvic Health. Find a PT",
    url: "https://aptapelvichealth.org/ptlocator/",
    publisher: "American Physical Therapy Association, Academy of Pelvic Health",
    year: "",
    note: "US directory of physical therapists with pelvic health training.",
  },
};

/** Resolve an array of source ids to source objects, dropping unknown ids. */
export function resolveSources(ids = []) {
  return ids.map((id) => SOURCES[id]).filter(Boolean);
}
