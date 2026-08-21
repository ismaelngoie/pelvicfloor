const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const URL_IN_TITLE = /https?:\/\/|www\./i;

export const VIDEO_SOURCE_DOMAINS = [
  "nice.org.uk",
  "acog.org",
  "auanet.org",
  "uroweb.org",
  "ics.org",
  "who.int",
  "iris.who.int",
  "cdc.gov",
  "csepguidelines.ca",
  "cochrane.org",
  "cochranelibrary.com",
  "pubmed.ncbi.nlm.nih.gov",
  "pmc.ncbi.nlm.nih.gov",
  "rcog.org.uk",
  "iuga.org",
  "nhs.uk",
];

export const VIDEO_GOALS = [
  "intimacy",
  "bladder_leaks",
  "postpartum",
  "diastasis_recti",
  "pregnancy_prep",
  "pelvic_pain",
  "core_strength",
  "fitness",
];

export const ACTIVE_VIDEO_STATES = new Set([
  "researching",
  "claim_check_starting",
  "claim_check",
  "storyboarding",
  "rendering",
  "quality_check",
  "uploading",
]);

export const VIDEO_STAGES = [
  { id: "researching", label: "Research", detail: "Current clinical sources and viewer language" },
  { id: "claim_check", label: "Medical check", detail: "Every claim reproduced against its source" },
  { id: "storyboarding", label: "Production", detail: "Script, scenes, captions and thumbnail" },
  { id: "rendering", label: "Render", detail: "Presenter, voice, visuals and edit" },
  { id: "ready", label: "Ready", detail: "Preview and private YouTube delivery" },
];

export function validateVideoTitle(value) {
  const title = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  if (title.length < 12) return { ok: false, error: "Use a complete viewer question or title." };
  if (title.length > 180) return { ok: false, error: "Keep the title under 180 characters." };
  if (CONTROL_CHARACTERS.test(title) || URL_IN_TITLE.test(title)) {
    return { ok: false, error: "Use a plain title without links or control characters." };
  }
  return { ok: true, title };
}

export function validIdempotencyKey(value) {
  const key = typeof value === "string" ? value.trim() : "";
  return /^[a-zA-Z0-9_-]{12,80}$/.test(key) ? key : null;
}

export function projectIdFor(key) {
  const safe = validIdempotencyKey(key);
  if (safe) return `vf_${safe}`;
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  const suffix = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `vf_${Date.now().toString(36)}_${suffix}`;
}

export function safeProjectId(value) {
  const id = typeof value === "string" ? value.trim() : "";
  return /^vf_[a-zA-Z0-9_-]{12,100}$/.test(id) ? id : null;
}

function stringSchema({ minLength = 0, maxLength = 4000 } = {}) {
  // OpenAI Structured Outputs supports a strict subset of JSON Schema and
  // rejects minLength/maxLength on strings. These limits are enforced again
  // by the server after generation, so do not send unsupported keywords.
  void minLength;
  void maxLength;
  return { type: "string" };
}

function stringArraySchema(maxItems = 12, maxLength = 300) {
  return { type: "array", maxItems, items: stringSchema({ maxLength }) };
}

export const VIDEO_BLUEPRINT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "version", "inputTitle", "goal", "audience", "answer", "runtimeSeconds",
    "scriptTitle", "fullScript", "scenePlan", "claims", "sources", "youtube",
    "thumbnail", "safety", "quality",
  ],
  properties: {
    version: { type: "string", enum: ["1.0"] },
    inputTitle: stringSchema({ minLength: 8, maxLength: 180 }),
    goal: { type: "string", enum: VIDEO_GOALS },
    audience: stringSchema({ minLength: 12, maxLength: 500 }),
    answer: stringSchema({ minLength: 20, maxLength: 700 }),
    runtimeSeconds: { type: "integer", minimum: 120, maximum: 240 },
    scriptTitle: stringSchema({ minLength: 8, maxLength: 100 }),
    fullScript: stringSchema({ minLength: 700, maxLength: 6500 }),
    scenePlan: {
      type: "array",
      minItems: 6,
      maxItems: 18,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["startSeconds", "endSeconds", "narration", "onScreenText", "visualDirection", "citationIds"],
        properties: {
          startSeconds: { type: "integer", minimum: 0, maximum: 240 },
          endSeconds: { type: "integer", minimum: 1, maximum: 240 },
          narration: stringSchema({ minLength: 1, maxLength: 900 }),
          onScreenText: stringSchema({ maxLength: 120 }),
          visualDirection: stringSchema({ minLength: 4, maxLength: 600 }),
          citationIds: stringArraySchema(5, 30),
        },
      },
    },
    claims: {
      type: "array",
      minItems: 1,
      maxItems: 20,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "text", "kind", "sourceIds", "evidenceStrength", "certainty", "limits"],
        properties: {
          id: stringSchema({ minLength: 2, maxLength: 30 }),
          text: stringSchema({ minLength: 8, maxLength: 700 }),
          kind: { type: "string", enum: ["definition", "association", "benefit", "harm", "instruction", "triage"] },
          sourceIds: { type: "array", minItems: 1, maxItems: 5, items: stringSchema({ minLength: 1, maxLength: 30 }) },
          evidenceStrength: { type: "string", enum: ["guideline", "high", "moderate", "low", "very_low", "consensus"] },
          certainty: stringSchema({ minLength: 3, maxLength: 200 }),
          limits: stringSchema({ maxLength: 500 }),
        },
      },
    },
    sources: {
      type: "array",
      minItems: 2,
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "tier", "publisher", "title", "url", "year", "scope"],
        properties: {
          id: stringSchema({ minLength: 1, maxLength: 30 }),
          tier: { type: "string", enum: ["A", "B", "C"] },
          publisher: stringSchema({ minLength: 2, maxLength: 120 }),
          title: stringSchema({ minLength: 4, maxLength: 300 }),
          url: stringSchema({ minLength: 12, maxLength: 500 }),
          year: stringSchema({ minLength: 4, maxLength: 20 }),
          scope: stringSchema({ minLength: 5, maxLength: 500 }),
        },
      },
    },
    youtube: {
      type: "object",
      additionalProperties: false,
      required: ["title", "description", "tags", "chapters", "pinnedComment", "nextVideoTitle"],
      properties: {
        title: stringSchema({ minLength: 8, maxLength: 100 }),
        description: stringSchema({ minLength: 120, maxLength: 4500 }),
        tags: stringArraySchema(15, 60),
        chapters: {
          type: "array",
          minItems: 3,
          maxItems: 10,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["time", "title"],
            properties: {
              time: stringSchema({ minLength: 4, maxLength: 8 }),
              title: stringSchema({ minLength: 2, maxLength: 80 }),
            },
          },
        },
        pinnedComment: stringSchema({ minLength: 20, maxLength: 900 }),
        nextVideoTitle: stringSchema({ minLength: 8, maxLength: 100 }),
      },
    },
    thumbnail: {
      type: "object",
      additionalProperties: false,
      required: ["headline", "visualPrompt"],
      properties: {
        headline: stringSchema({ minLength: 2, maxLength: 38 }),
        visualPrompt: stringSchema({ minLength: 20, maxLength: 1000 }),
      },
    },
    safety: {
      type: "object",
      additionalProperties: false,
      required: ["triageLevel", "triageLine", "redFlags", "disclaimer"],
      properties: {
        triageLevel: { type: "string", enum: ["none", "routine", "same_day", "emergency"] },
        triageLine: stringSchema({ maxLength: 700 }),
        redFlags: stringArraySchema(10, 300),
        disclaimer: stringSchema({ minLength: 20, maxLength: 600 }),
      },
    },
    quality: {
      type: "object",
      additionalProperties: false,
      required: ["score", "hardFails", "notes"],
      properties: {
        score: { type: "integer", minimum: 0, maximum: 100 },
        hardFails: stringArraySchema(12, 300),
        notes: stringArraySchema(12, 300),
      },
    },
  },
};

export const VIDEO_REVIEW_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["approved", "safetyPass", "engagementScore", "medicalFindings", "humanVoiceFindings", "finalBlueprint"],
  properties: {
    approved: { type: "boolean" },
    safetyPass: { type: "boolean" },
    engagementScore: { type: "integer", minimum: 0, maximum: 100 },
    medicalFindings: stringArraySchema(20, 500),
    humanVoiceFindings: stringArraySchema(20, 500),
    finalBlueprint: VIDEO_BLUEPRINT_SCHEMA,
  },
};

const SOURCE_POLICY = `
Use current sources only from: ${VIDEO_SOURCE_DOMAINS.join(", ")}.
Tier A is a current guideline or standard. Tier B is a systematic review or meta-analysis. Tier C is authoritative patient safety guidance. Social posts, YouTube videos, clinic blogs, product pages and generated summaries can inform the viewer's wording but NEVER support a medical claim.
Every medical claim needs at least one source ID. Actionable treatment claims need a current Tier A guideline or two concordant Tier B reviews. Preserve the population, duration and certainty. Low or very-low certainty must use may/can-help-some-people language. Never invent a DOI, quote, credential, statistic or patient story.
`;

const SAFETY_POLICY = `
Do not diagnose tight versus weak from symptoms. Do not prescribe universal Kegels. Do not teach repeated urine-stream stopping. Do not tell anyone to push through pain. Do not give generic internal release, wand or dilator instructions. Diastasis width is not a universal measure of function and no single exercise closes every gap. Do not promise a cure, guaranteed orgasm, leak-proof body, closed gap, reversed prolapse or permanent result. Pregnancy and postpartum advice must be symptom- and complication-aware, not based only on weeks.
If the title signals severe or sudden pelvic/abdominal pain, fainting, shoulder pain, heavy bleeding, possible pregnancy, new saddle numbness, leg weakness, bladder/bowel retention, chest pain, seizure, severe breathlessness or thoughts of harm, put short urgent triage near the beginning and give no exercise instructions.
`;

const VOICE_POLICY = `
Write like a warm, precise human educator at a sixth- to eighth-grade reading level. Start with the exact private moment in the first eight seconds. Give the direct answer by second 22. Use short natural sentences and contractions. No channel intro, biography, 'let's dive in', generic anatomy lecture, fear bait, invented patient anecdotes, or claims of treating people in a clinic. The presenter is a Pelvi educational host, not a doctor and not a licensed clinician unless a separate verified human reviewer is supplied later.
`;

export function researchPrompt(title) {
  return `You are the research and editorial engine for Pelvi Health's pelvic-floor education channel.

Viewer title: ${JSON.stringify(title)}

Research the exact question on the live web. Build a complete 2:00-4:00 production blueprint. Default to 2:45-3:30 and 420-475 spoken words. Anatomy gets at most 25 seconds and only when it changes the decision.

${SOURCE_POLICY}
${SAFETY_POLICY}
${VOICE_POLICY}

Story structure: 0-8s symptom mirror and earned promise; 8-22s validation; 22-42s direct answer with uncertainty; 42-95s at most two mechanisms; 95-155s one to three low-risk reversible steps plus stop rule; 155-180s common mistake and who this does not fit; 180-205s when to get routine or urgent help; final recap and a specific next-question bridge.

The full script must match the scene narration. Put a compact source slug on screen when a supported claim lands, but do not read citations aloud. The YouTube description must include 2-5 direct source links. Make the title useful and compelling without clickbait. Make the thumbnail headline two to five plain-English words.

Return only the required JSON blueprint.`;
}

export function reviewPrompt(draft) {
  return `You are the independent medical-claims editor and human-voice editor for Pelvi Health. Re-open every cited source on the live web and audit this draft before it can render.

${SOURCE_POLICY}
${SAFETY_POLICY}
${VOICE_POLICY}

Audit criteria: exact title match; private moment in first 8 seconds; direct answer by 22 seconds; one clear takeaway; reversible actions; current reproducible evidence; honest uncertainty; a retention beat every 25-35 seconds; specific next-video bridge; no filler. Medical safety must be 100%. Engagement must score at least 85/100.

Correct the blueprint directly. Delete unsupported claims. Fix mismatched citations, populations, certainty, red flags, stiff wording and fake authority. Set approved only if the final blueprint is safe, reproducible, natural and ready to publish.

DRAFT:
${JSON.stringify(draft)}

Return only the required review JSON.`;
}

export function outputText(response) {
  if (typeof response?.output_text === "string" && response.output_text.trim()) return response.output_text.trim();
  for (const item of Array.isArray(response?.output) ? response.output : []) {
    if (item?.type !== "message") continue;
    for (const content of Array.isArray(item.content) ? item.content : []) {
      if ((content?.type === "output_text" || content?.type === "text") && typeof content.text === "string") {
        return content.text.trim();
      }
    }
  }
  return "";
}

export function parseStructuredOutput(response) {
  const text = outputText(response);
  if (!text) throw new Error("The research model returned no structured output.");
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("The research model returned malformed structured output.");
  }
}

export function responseSourceUrls(response) {
  const urls = new Set();
  const queue = [response];
  const seen = new Set();
  while (queue.length) {
    const value = queue.shift();
    if (!value || typeof value !== "object" || seen.has(value)) continue;
    seen.add(value);
    if (typeof value.url === "string" && allowedSourceUrl(value.url)) {
      const normalized = normalizedSourceUrl(value.url);
      if (normalized) urls.add(normalized);
    }
    for (const child of Object.values(value)) {
      if (child && typeof child === "object") queue.push(child);
    }
  }
  return urls;
}

export function allowedSourceUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    return VIDEO_SOURCE_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

export function youtubeDescription(blueprint) {
  const description = String(blueprint?.youtube?.description || "").trim();
  const chapters = Array.isArray(blueprint?.youtube?.chapters)
    ? blueprint.youtube.chapters
      .filter((chapter) => chapter && typeof chapter.time === "string" && typeof chapter.title === "string")
      .map((chapter) => `${chapter.time.trim()} ${chapter.title.trim()}`)
      .filter((chapter) => chapter.trim())
    : [];
  return chapters.length ? `${description}\n\nChapters\n${chapters.join("\n")}` : description;
}

export function validateBlueprint(value, { retrievedSourceUrls = null } = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, error: "Blueprint is missing." };
  const invalid = completeBlueprintValidationError(value);
  if (invalid) return { ok: false, error: invalid };
  if (!VIDEO_GOALS.includes(value.goal)) return { ok: false, error: "Blueprint goal is invalid." };
  if (!Number.isInteger(value.runtimeSeconds) || value.runtimeSeconds < 120 || value.runtimeSeconds > 240) {
    return { ok: false, error: "Blueprint runtime is outside 2-4 minutes." };
  }
  if (typeof value.fullScript !== "string" || value.fullScript.trim().length < 700 || value.fullScript.length > 4500) {
    return { ok: false, error: "Blueprint script is incomplete." };
  }
  if (!Array.isArray(value.sources) || value.sources.length < 2 || value.sources.some((source) => !allowedSourceUrl(source?.url))) {
    return { ok: false, error: "Blueprint contains an unapproved or missing medical source." };
  }
  if (retrievedSourceUrls instanceof Set && value.sources.some((source) => !retrievedSourceUrls.has(normalizedSourceUrl(source?.url)))) {
    return { ok: false, error: "A cited medical source was not returned by the live research provider." };
  }
  const sourceIds = new Set(value.sources.map((source) => source?.id).filter(Boolean));
  const sourceById = new Map(value.sources.map((source) => [source?.id, source]));
  if (sourceIds.size !== value.sources.length) return { ok: false, error: "Medical source IDs must be unique." };
  if (!Array.isArray(value.claims) || value.claims.length < 1) return { ok: false, error: "Blueprint has no claim ledger." };
  const claimIds = new Set(value.claims.map((claim) => claim?.id).filter(Boolean));
  if (claimIds.size !== value.claims.length) return { ok: false, error: "Medical claim IDs must be unique." };
  for (const claim of value.claims) {
    if (!Array.isArray(claim?.sourceIds) || claim.sourceIds.length < 1 || claim.sourceIds.some((id) => !sourceIds.has(id))) {
      return { ok: false, error: "A medical claim is not tied to a reproducible source." };
    }
    if (["benefit", "instruction"].includes(claim.kind)) {
      const referenced = [...new Set(claim.sourceIds)].map((id) => sourceById.get(id)).filter(Boolean);
      const hasTierA = referenced.some((source) => source.tier === "A");
      const tierBCount = referenced.filter((source) => source.tier === "B").length;
      if (!hasTierA && tierBCount < 2) {
        return { ok: false, error: "An actionable treatment claim needs a Tier A guideline or two Tier B reviews." };
      }
    }
  }
  if (!Array.isArray(value.scenePlan) || value.scenePlan.length < 6) return { ok: false, error: "Blueprint storyboard is incomplete." };
  for (const scene of value.scenePlan) {
    if (scene.citationIds.some((id) => !sourceIds.has(id))) {
      return { ok: false, error: "A storyboard citation is not tied to a reproducible source." };
    }
  }
  const sceneScript = value.scenePlan.map((scene) => scene.narration).join(" ");
  if (!sameTranscript(value.fullScript, sceneScript)) {
    return { ok: false, error: "The final script must exactly match the ordered scene narration." };
  }
  const firstScene = value.scenePlan[0];
  const lastScene = value.scenePlan[value.scenePlan.length - 1];
  if (firstScene.startSeconds > 1 || Math.abs(lastScene.endSeconds - value.runtimeSeconds) > 3) {
    return { ok: false, error: "Storyboard timing must cover the complete approved runtime." };
  }
  for (let index = 1; index < value.scenePlan.length; index += 1) {
    const previous = value.scenePlan[index - 1];
    const scene = value.scenePlan[index];
    if (scene.startSeconds < previous.endSeconds || scene.startSeconds - previous.endSeconds > 3) {
      return { ok: false, error: "Storyboard scenes must be ordered, non-overlapping and nearly continuous." };
    }
  }
  const spokenWords = transcriptWords(sceneScript).length;
  const minimumWords = Math.floor(value.runtimeSeconds * 1.7);
  const maximumWords = Math.ceil(value.runtimeSeconds * 3);
  if (spokenWords < minimumWords || spokenWords > maximumWords) {
    return { ok: false, error: "The approved narration length does not fit the requested runtime." };
  }
  const narrationLength = value.scenePlan.reduce((sum, scene) => sum + String(scene?.narration || "").length, 0);
  const directionLength = value.scenePlan.reduce((sum, scene) => sum + String(scene?.visualDirection || "").length, 0);
  const onScreenLength = value.scenePlan.reduce((sum, scene) => sum + String(scene?.onScreenText || "").length, 0);
  if (narrationLength > 4500 || directionLength > 2200 || onScreenLength > 1000) {
    return { ok: false, error: "Blueprint storyboard is too long for the production renderer." };
  }
  if (!value.youtube?.title || !value.youtube?.description || !value.thumbnail?.headline) {
    return { ok: false, error: "Blueprint publishing package is incomplete." };
  }
  return { ok: true, blueprint: value };
}

function completeBlueprintValidationError(value) {
  const text = (candidate, min, max, label) => {
    if (typeof candidate !== "string" || candidate.length < min || candidate.length > max) {
      return `${label} must contain ${min}-${max} characters.`;
    }
    return "";
  };
  const list = (candidate, min, max, label) => {
    if (!Array.isArray(candidate) || candidate.length < min || candidate.length > max) {
      return `${label} must contain ${min}-${max} items.`;
    }
    return "";
  };
  const strings = (candidate, minItems, maxItems, minLength, maxLength, label) => {
    const countError = list(candidate, minItems, maxItems, label);
    if (countError) return countError;
    if (candidate.some((item) => text(item, minLength, maxLength, label))) {
      return `${label} contains an invalid text value.`;
    }
    return "";
  };

  let error = text(value.version, 3, 3, "Blueprint version");
  if (error || value.version !== "1.0") return error || "Blueprint version is invalid.";
  for (const [candidate, min, max, label] of [
    [value.inputTitle, 8, 180, "Input title"],
    [value.audience, 12, 500, "Audience"],
    [value.answer, 20, 700, "Direct answer"],
    [value.scriptTitle, 8, 100, "Script title"],
    [value.fullScript, 700, 4500, "Full script"],
  ]) {
    error = text(candidate, min, max, label);
    if (error) return error;
  }

  error = list(value.scenePlan, 6, 18, "Storyboard");
  if (error) return error;
  for (const scene of value.scenePlan) {
    if (!scene || typeof scene !== "object") return "Storyboard scene is invalid.";
    if (!Number.isInteger(scene.startSeconds) || scene.startSeconds < 0 || scene.startSeconds > 240 ||
        !Number.isInteger(scene.endSeconds) || scene.endSeconds < 1 || scene.endSeconds > 240 ||
        scene.endSeconds <= scene.startSeconds) return "Storyboard timing is invalid.";
    for (const [candidate, min, max, label] of [
      [scene.narration, 1, 900, "Scene narration"],
      [scene.onScreenText, 0, 120, "Scene on-screen text"],
      [scene.visualDirection, 4, 600, "Scene visual direction"],
    ]) {
      error = text(candidate, min, max, label);
      if (error) return error;
    }
    error = strings(scene.citationIds, 0, 5, 1, 30, "Scene citations");
    if (error) return error;
  }

  error = list(value.claims, 1, 20, "Claim ledger");
  if (error) return error;
  for (const claim of value.claims) {
    for (const [candidate, min, max, label] of [
      [claim?.id, 2, 30, "Claim ID"],
      [claim?.text, 8, 700, "Claim text"],
      [claim?.certainty, 3, 200, "Claim certainty"],
      [claim?.limits, 0, 500, "Claim limits"],
    ]) {
      error = text(candidate, min, max, label);
      if (error) return error;
    }
    error = strings(claim.sourceIds, 1, 5, 1, 30, "Claim sources");
    if (error) return error;
    if (!["definition", "association", "benefit", "harm", "instruction", "triage"].includes(claim.kind)) {
      return "Claim kind is invalid.";
    }
    if (!["guideline", "high", "moderate", "low", "very_low", "consensus"].includes(claim.evidenceStrength)) {
      return "Claim evidence strength is invalid.";
    }
  }

  error = list(value.sources, 2, 8, "Medical sources");
  if (error) return error;
  for (const source of value.sources) {
    for (const [candidate, min, max, label] of [
      [source?.id, 1, 30, "Source ID"],
      [source?.publisher, 2, 120, "Source publisher"],
      [source?.title, 4, 300, "Source title"],
      [source?.url, 12, 500, "Source URL"],
      [source?.year, 4, 20, "Source year"],
      [source?.scope, 5, 500, "Source scope"],
    ]) {
      error = text(candidate, min, max, label);
      if (error) return error;
    }
    if (!["A", "B", "C"].includes(source.tier)) return "Medical source tier is invalid.";
  }

  for (const [candidate, min, max, label] of [
    [value.youtube?.title, 8, 100, "YouTube title"],
    [value.youtube?.description, 120, 4500, "YouTube description"],
    [value.youtube?.pinnedComment, 20, 900, "Pinned comment"],
    [value.youtube?.nextVideoTitle, 8, 100, "Next-video title"],
    [value.thumbnail?.headline, 2, 38, "Thumbnail headline"],
    [value.thumbnail?.visualPrompt, 20, 1000, "Thumbnail prompt"],
    [value.safety?.triageLine, 0, 700, "Safety triage line"],
    [value.safety?.disclaimer, 20, 600, "Safety disclaimer"],
  ]) {
    error = text(candidate, min, max, label);
    if (error) return error;
  }
  error = strings(value.youtube?.tags, 0, 15, 1, 60, "YouTube tags");
  if (error) return error;
  const tagBudget = value.youtube.tags.reduce(
    (sum, tag) => sum + tag.length + (/\s/.test(tag) ? 2 : 0),
    Math.max(0, value.youtube.tags.length - 1),
  );
  if (tagBudget > 500) return "YouTube tags exceed the 500-character upload limit.";
  const uploadDescription = youtubeDescription(value);
  if (new TextEncoder().encode(uploadDescription).byteLength > 5000) {
    return "YouTube description exceeds the 5,000-byte upload limit.";
  }
  if (/[<>]/.test(value.youtube.title) || /[<>]/.test(uploadDescription)) {
    return "YouTube title and description cannot contain angle brackets.";
  }
  error = list(value.youtube?.chapters, 3, 10, "YouTube chapters");
  if (error) return error;
  const chapterStarts = [];
  for (const chapter of value.youtube.chapters) {
    error = text(chapter?.time, 4, 8, "Chapter time") || text(chapter?.title, 2, 80, "Chapter title");
    if (error) return error;
    const seconds = chapterTimeSeconds(chapter.time);
    if (seconds === null) return "YouTube chapter timestamps must use M:SS or H:MM:SS.";
    chapterStarts.push(seconds);
  }
  if (chapterStarts[0] !== 0) return "The first YouTube chapter must start at 0:00.";
  for (let index = 1; index < chapterStarts.length; index += 1) {
    if (chapterStarts[index] - chapterStarts[index - 1] < 10) {
      return "YouTube chapters must be ordered and each chapter must last at least 10 seconds.";
    }
  }
  if (value.runtimeSeconds - chapterStarts.at(-1) < 10) {
    return "The final YouTube chapter must begin at least 10 seconds before the video ends.";
  }
  error = strings(value.safety?.redFlags, 0, 10, 1, 300, "Safety red flags");
  if (error) return error;
  error = strings(value.quality?.hardFails, 0, 12, 1, 300, "Quality hard fails");
  if (error) return error;
  error = strings(value.quality?.notes, 0, 12, 1, 300, "Quality notes");
  if (error) return error;
  if (!["none", "routine", "same_day", "emergency"].includes(value.safety?.triageLevel)) {
    return "Safety triage level is invalid.";
  }
  if (!Number.isInteger(value.quality?.score) || value.quality.score < 0 || value.quality.score > 100) {
    return "Quality score must be an integer from 0 to 100.";
  }
  return "";
}

function chapterTimeSeconds(value) {
  if (typeof value !== "string" || value !== value.trim() || !/^\d{1,2}:\d{2}(?::\d{2})?$/.test(value)) return null;
  const parts = value.split(":").map(Number);
  if (parts.some((part) => !Number.isInteger(part) || part < 0)) return null;
  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    if (seconds > 59) return null;
    return minutes * 60 + seconds;
  }
  const [hours, minutes, seconds] = parts;
  if (minutes > 59 || seconds > 59) return null;
  return hours * 3600 + minutes * 60 + seconds;
}

export function renderedTranscriptText(value) {
  return String(value || "")
    .replace(/^\uFEFF/, "")
    .replace(/<[^>]+>/g, " ")
    .split(/\r?\n/)
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed || /^WEBVTT$/i.test(trimmed) || /^NOTE(?:\s|$)/i.test(trimmed)) return false;
      if (/^\d+$/.test(trimmed)) return false;
      return !/^(?:\d{1,2}:)?\d{1,2}:\d{2}[.,]\d{3}\s*-->\s*(?:\d{1,2}:)?\d{1,2}:\d{2}[.,]\d{3}/.test(trimmed);
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function validateRenderedTranscript(blueprint, subtitleText) {
  const expected = blueprint?.scenePlan?.map((scene) => scene.narration).join(" ") || "";
  const actual = renderedTranscriptText(subtitleText);
  const expectedWords = transcriptWords(expected);
  const actualWords = transcriptWords(actual);
  if (expectedWords.length < 100 || actualWords.length < 100) {
    return { ok: false, error: "The renderer returned an incomplete narration transcript." };
  }
  if (!sameWordArrays(expectedWords, actualWords)) {
    return { ok: false, error: "The rendered narration drifted from the medically approved script." };
  }
  return {
    ok: true,
    transcript: actual,
    similarity: 1,
  };
}

function transcriptWords(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function sameTranscript(left, right) {
  return sameWordArrays(transcriptWords(left), transcriptWords(right));
}

function sameWordArrays(left, right) {
  return left.length === right.length && left.every((word, index) => word === right[index]);
}

function normalizedSourceUrl(value) {
  try {
    const url = new URL(value);
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|ref$)/i.test(key)) url.searchParams.delete(key);
    }
    url.pathname = url.pathname.replace(/\/+$/, "") || "/";
    return `${url.protocol}//${url.hostname.toLowerCase()}${url.port ? `:${url.port}` : ""}${url.pathname}${url.search}`;
  } catch {
    return "";
  }
}

export function validateReview(value) {
  if (!value || typeof value !== "object") return { ok: false, error: "Review output is missing." };
  const checked = validateBlueprint(value.finalBlueprint);
  if (!checked.ok) return checked;
  if (value.approved !== true || value.safetyPass !== true) {
    return { ok: false, error: "The independent medical review did not approve this script." };
  }
  if (!Number.isInteger(value.engagementScore) || value.engagementScore < 85) {
    return { ok: false, error: "The script did not reach the 85/100 publishing threshold." };
  }
  if (Array.isArray(value.finalBlueprint?.quality?.hardFails) && value.finalBlueprint.quality.hardFails.length) {
    return { ok: false, error: "The reviewed script still contains a hard-fail issue." };
  }
  return { ok: true, blueprint: checked.blueprint, review: value };
}

export function heyGenPrompt(blueprint) {
  const scenes = blueprint.scenePlan.map((scene, index) => (
    `SCENE ${index + 1} (${scene.startSeconds}-${scene.endSeconds}s)\n` +
    `NARRATION: ${scene.narration}\n` +
    `ON SCREEN: ${scene.onScreenText || "None"}\n` +
    `VISUAL: ${scene.visualDirection}\n` +
    `SOURCE SLUGS: ${(scene.citationIds || []).join(", ") || "None"}`
  )).join("\n\n");

  const prompt = `Create a polished 16:9 YouTube education video for Pelvi Health.

TITLE: ${blueprint.youtube.title}
TARGET RUNTIME: ${blueprint.runtimeSeconds} seconds
PRESENTER: One consistent Pelvi educational host whose avatar and voice are commercially authorized. Never call the host a doctor, therapist or clinician. Never add invented credentials, a clinic, patients or firsthand treatment stories.
VOICE: Warm, grounded, conversational, confident and human. Natural pauses. No sales-announcer voice.
VISUAL IDENTITY: Premium editorial health film. Deep plum, warm cream, restrained rose and soft lavender. Clean kinetic typography, tactile paper and glass textures, subtle depth, no generic hospital stock footage, no neon anatomy, no shame, no before-and-after body manipulation.
EDIT: Give the first line immediately. Change the visual composition every 4-8 seconds. Alternate presenter, tasteful lifestyle B-roll, simple medically conservative diagrams and typography. Captions are always on. Never show explicit genitals or an anatomically dubious internal animation.
SCRIPT LOCK: Speak every NARRATION line below verbatim, in order. Do not rewrite, summarize, improvise, add claims, add statistics, or add spoken calls to action. On-screen text and visual direction are not narration.
CTA: Educational first. The final bridge points to the next viewer question and may mention the Pelvic Floor & Core Coach assessment once.

SHOT PLAN:
${scenes}

End on a clean source card with: ${blueprint.sources.map((source) => `${source.publisher} ${source.year}`).join(" · ")}.`;
  if (prompt.length > 10_000) throw new Error("The approved production brief exceeds the renderer's 10,000-character limit.");
  return prompt;
}

export function thumbnailPrompt(blueprint) {
  return `YouTube thumbnail, 16:9 horizontal editorial photograph for a premium pelvic-health education channel. Topic: ${blueprint.youtube.title}. Audience: ${blueprint.audience}. Concept: ${blueprint.thumbnail.visualPrompt}. Show one relatable adult whose age and presentation fit the stated audience. Do not infer a gender that the audience or question does not specify. Use an authentic thoughtful expression and dignified clothing. Warm cinematic side light, deep plum background, cream and restrained rose accents, premium magazine composition, generous negative space, crisp face, emotionally specific but never distressed or sexualized. Add only this exact large readable headline: \"${blueprint.thumbnail.headline}\". No logo, no doctor coat, no medical credential, no anatomy diagram, no extra words, no watermark.`;
}

export function stageIndex(status) {
  if (["uploaded", "ready"].includes(status)) return 4;
  if (["rendering", "quality_check"].includes(status)) return 3;
  if (["storyboarding", "script_ready"].includes(status)) return 2;
  if (status === "claim_check") return 1;
  return 0;
}

export function publicProject(project) {
  if (!project) return null;
  let blueprint = null;
  let review = null;
  try { blueprint = project.blueprintJson ? JSON.parse(project.blueprintJson) : null; } catch {}
  try { review = project.reviewJson ? JSON.parse(project.reviewJson) : null; } catch {}
  return {
    id: project.id,
    title: project.title,
    status: project.status,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    error: project.error || "",
    videoUrl: project.videoUrl || "",
    hasArchivedVideo: Boolean(project.videoObject),
    videoAssetUrl: project.videoObject
      ? `/api/video-factory-asset?projectId=${encodeURIComponent(project.id)}&kind=video`
      : "",
    providerThumbnailUrl: project.providerThumbnailUrl || "",
    thumbnailUrl: project.thumbnailUrl || "",
    hasThumbnail: Boolean(project.thumbnailObject || project.thumbnailUrl || project.providerThumbnailUrl),
    thumbnailAssetUrl: project.thumbnailObject
      ? `/api/video-factory-asset?projectId=${encodeURIComponent(project.id)}&kind=thumbnail`
      : "",
    durationSeconds: Number(project.durationSeconds) || blueprint?.runtimeSeconds || 0,
    estimatedProductionCostUSD: Number(project.estimatedProductionCostUSD) || 0,
    youtubeVideoId: project.youtubeVideoId || "",
    youtubeUrl: project.youtubeUrl || "",
    youtubeStatus: project.youtubeStatus || "",
    youtubeError: project.youtubeError || "",
    publishAt: project.publishAt || "",
    blueprint,
    review: review ? {
      engagementScore: review.engagementScore,
      medicalFindings: review.medicalFindings || [],
      humanVoiceFindings: review.humanVoiceFindings || [],
    } : null,
  };
}
