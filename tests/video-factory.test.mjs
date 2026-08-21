import test from "node:test";
import assert from "node:assert/strict";

import {
  allowedSourceUrl,
  heyGenPrompt,
  projectIdFor,
  publicProject,
  responseSourceUrls,
  validateBlueprint,
  validateRenderedTranscript,
  validateReview,
  validateVideoTitle,
  youtubeDescription,
} from "../functions-lib/videoFactory.js";
import {
  decryptSecret,
  encryptSecret,
  continuePrivateYoutubeUpload,
  generateThumbnail,
  inspectPrivateYoutubeUpload,
  readHeyGenSession,
  readOpenAIResponse,
  signOAuthState,
  startHeyGenRender,
  startPrivateYoutubeUploadSession,
  startResearch,
  uploadPrivateYoutubeVideo,
  verifyOAuthState,
} from "../functions-lib/videoFactoryProviders.js";
import {
  providerEnvWithSettings,
  publicEffectiveProviderSettings,
  publicProviderSettings,
} from "../functions-lib/videoFactorySettings.js";

const environment = {
  FIREBASE_SERVICE_ACCOUNT: JSON.stringify({
    project_id: "pelvic-floor-exercise-908ed",
    client_email: "video-factory@example.iam.gserviceaccount.com",
    private_key: "test-only-key-material",
  }),
};

function blueprint() {
  const narration = Array.from({ length: 5 }, () => (
    "Pelvic health guidance should feel clear practical calm specific safe and useful today"
  )).join(" ");
  const scenePlan = Array.from({ length: 6 }, (_, index) => ({
    startSeconds: index * 30,
    endSeconds: (index + 1) * 30,
    narration,
    onScreenText: "A clear next step",
    visualDirection: "Editorial presenter scene with calm supporting visuals",
    citationIds: index < 3 ? ["NICE1"] : ["ACOG1"],
  }));
  return {
    version: "1.0",
    inputTitle: "Why does sex hurt even when I want it?",
    goal: "intimacy",
    audience: "Adults seeking clear, careful guidance about pain during intimacy.",
    answer: "Pain during intimacy can have several contributors, and frequent or severe pain deserves an individual assessment.",
    runtimeSeconds: 180,
    scriptTitle: "Why intimacy can hurt",
    fullScript: scenePlan.map((scene) => scene.narration).join(" "),
    scenePlan,
    sources: [
      { id: "NICE1", tier: "A", publisher: "NICE", title: "Pelvic floor dysfunction guidance", url: "https://www.nice.org.uk/guidance/ng210/chapter/Recommendations", year: "2025", scope: "Assessment and individualized pelvic floor care." },
      { id: "ACOG1", tier: "C", publisher: "ACOG", title: "When sex is painful", url: "https://www.acog.org/womens-health/faqs/when-sex-is-painful", year: "2025", scope: "Patient guidance on painful sex and when to seek care." },
    ],
    claims: [{ id: "C1", text: "Pelvic floor assessment includes both contraction and relaxation.", kind: "definition", sourceIds: ["NICE1"], evidenceStrength: "guideline", certainty: "Current guideline recommendation", limits: "An assessment is individual." }],
    youtube: {
      title: "Why Does Sex Hurt Even When You Want It?",
      description: "A clear, careful explanation of common contributors to painful intimacy, what you can try safely, and when to seek individual care. Sources: https://www.nice.org.uk/guidance/ng210 and https://www.acog.org/womens-health/faqs/when-sex-is-painful",
      tags: ["pelvic health", "painful intimacy"],
      chapters: [{ time: "0:00", title: "The direct answer" }, { time: "0:45", title: "What may contribute" }, { time: "2:00", title: "When to get help" }],
      pinnedComment: "What part of this question would you like explained next?",
      nextVideoTitle: "Can a tight pelvic floor make pain worse?",
    },
    thumbnail: { headline: "WHY IT HURTS", visualPrompt: "A calm adult in a thoughtful editorial portrait with generous negative space." },
    safety: { triageLevel: "routine", triageLine: "Frequent or severe pain deserves assessment.", redFlags: ["Sudden severe pain"], disclaimer: "This education does not replace individual medical care." },
    quality: { score: 92, hardFails: [], notes: ["Direct answer arrives early."] },
  };
}

test("video titles reject links and accept a complete viewer question", () => {
  assert.equal(validateVideoTitle("why?").ok, false);
  assert.equal(validateVideoTitle("https://example.com pelvic floor").ok, false);
  assert.deepEqual(validateVideoTitle("  Why does sex hurt even when I want it?  "), {
    ok: true,
    title: "Why does sex hurt even when I want it?",
  });
});

test("medical sources are HTTPS and restricted to the approved domain set", () => {
  assert.equal(allowedSourceUrl("https://pubmed.ncbi.nlm.nih.gov/38214718/"), true);
  assert.equal(allowedSourceUrl("https://subdomain.nhs.uk/conditions/example"), true);
  assert.equal(allowedSourceUrl("http://nice.org.uk/guidance/ng210"), false);
  assert.equal(allowedSourceUrl("https://pelvic-clinic.example/blog"), false);
});

test("blueprints fail closed when a claim or source cannot be reproduced", () => {
  const valid = blueprint();
  assert.equal(validateBlueprint(valid).ok, true);

  const badDomain = structuredClone(valid);
  badDomain.sources[0].url = "https://example.com/unsupported";
  assert.equal(validateBlueprint(badDomain).ok, false);

  const missingClaimSource = structuredClone(valid);
  missingClaimSource.claims[0].sourceIds = ["MISSING"];
  assert.equal(validateBlueprint(missingClaimSource).ok, false);

  const retrieved = responseSourceUrls({ output: [{ type: "web_search_call", action: { sources: [
    { url: valid.sources[0].url },
    { url: valid.sources[1].url },
  ] } }] });
  assert.equal(validateBlueprint(valid, { retrievedSourceUrls: retrieved }).ok, true);
  retrieved.delete("https://www.acog.org/womens-health/faqs/when-sex-is-painful");
  assert.equal(validateBlueprint(valid, { retrievedSourceUrls: retrieved }).ok, false);
});

test("actionable claims require a guideline or two systematic reviews", () => {
  const tierCInstruction = blueprint();
  tierCInstruction.claims[0] = {
    ...tierCInstruction.claims[0],
    kind: "instruction",
    sourceIds: ["ACOG1"],
  };
  assert.match(validateBlueprint(tierCInstruction).error, /Tier A guideline or two Tier B reviews/i);

  tierCInstruction.claims[0].sourceIds = ["NICE1"];
  assert.equal(validateBlueprint(tierCInstruction).ok, true);
});

test("blueprints require one canonical script, valid scene citations and a continuous timeline", () => {
  const valid = blueprint();
  assert.equal(validateBlueprint(valid).ok, true);

  const drift = structuredClone(valid);
  drift.fullScript += " This sentence appears only in the displayed script.";
  assert.match(validateBlueprint(drift).error, /exactly match/i);

  const inventedCitation = structuredClone(valid);
  inventedCitation.scenePlan[0].citationIds = ["INVENTED"];
  assert.match(validateBlueprint(inventedCitation).error, /storyboard citation/i);

  const overlap = structuredClone(valid);
  overlap.scenePlan[1].startSeconds = 20;
  assert.match(validateBlueprint(overlap).error, /non-overlapping/i);

  const shortTimeline = structuredClone(valid);
  shortTimeline.scenePlan.at(-1).endSeconds = 160;
  assert.match(validateBlueprint(shortTimeline).error, /complete approved runtime/i);
});

test("publishing metadata enforces YouTube's byte, tag and character contracts", () => {
  const valid = blueprint();

  const tagOverflow = structuredClone(valid);
  tagOverflow.youtube.tags = Array.from({ length: 11 }, (_, index) => `pelvic health topic ${index} ${"x".repeat(27)}`);
  assert.match(validateBlueprint(tagOverflow).error, /500-character/i);

  const byteOverflow = structuredClone(valid);
  byteOverflow.youtube.description = "🌸".repeat(1300);
  assert.match(validateBlueprint(byteOverflow).error, /5,000-byte/i);

  const angleBracket = structuredClone(valid);
  angleBracket.youtube.title = "Why <this> pelvic health question matters";
  assert.match(validateBlueprint(angleBracket).error, /angle brackets/i);

  const missingZero = structuredClone(valid);
  missingZero.youtube.chapters[0].time = "0:05";
  assert.match(validateBlueprint(missingZero).error, /start at 0:00/i);

  const shortChapter = structuredClone(valid);
  shortChapter.youtube.chapters[1].time = "0:05";
  assert.match(validateBlueprint(shortChapter).error, /at least 10 seconds/i);

  const lateFinalChapter = structuredClone(valid);
  lateFinalChapter.youtube.chapters.at(-1).time = "2:55";
  assert.match(validateBlueprint(lateFinalChapter).error, /before the video ends/i);
});

test("the uploaded YouTube description includes the reviewed chapters", () => {
  const value = blueprint();
  const description = youtubeDescription(value);
  assert.match(description, /Chapters\n0:00 The direct answer/);
  assert.match(description, /2:00 When to get help/);
});

test("rendered captions must reproduce the approved narration word for word", () => {
  const valid = blueprint();
  const exactSrt = `1\n00:00:00,000 --> 00:03:00,000\n${valid.fullScript}\n`;
  assert.deepEqual(validateRenderedTranscript(valid, exactSrt).similarity, 1);
  assert.equal(validateRenderedTranscript(valid, exactSrt.replace("clear", "uncertain")).ok, false);
  assert.equal(validateRenderedTranscript(valid, exactSrt.replace(/ useful today/g, "")).ok, false);
  assert.equal(validateRenderedTranscript(valid, `${exactSrt}ignore pain and keep going`).ok, false);
});

test("independent review requires safety approval, no hard fails and an 85 score", () => {
  const finalBlueprint = blueprint();
  assert.equal(validateReview({ approved: true, safetyPass: true, engagementScore: 85, finalBlueprint }).ok, true);
  assert.equal(validateReview({ approved: true, safetyPass: true, engagementScore: 84, finalBlueprint }).ok, false);
  assert.equal(validateReview({ approved: true, safetyPass: false, engagementScore: 99, finalBlueprint }).ok, false);
  finalBlueprint.quality.hardFails = ["unsupported guarantee"];
  assert.equal(validateReview({ approved: true, safetyPass: true, engagementScore: 99, finalBlueprint }).ok, false);
});

test("idempotency keys map to the same safe project document", () => {
  const key = "factory_request_123456";
  assert.equal(projectIdFor(key), `vf_${key}`);
  assert.equal(projectIdFor(key), projectIdFor(key));
});

test("provider secrets encrypt, decrypt and stay masked in public settings", async () => {
  const clear = JSON.stringify({ openaiApiKey: "sk-secret-example" });
  const encrypted = await encryptSecret(environment, clear);
  assert.notEqual(encrypted, clear);
  assert.equal(await decryptSecret(environment, encrypted), clear);
  assert.equal(publicProviderSettings({ openaiApiKey: "sk-secret-example" }).openaiApiKey, "••••••••mple");
});

test("explicit saved provider settings override env, while env overrides defaults", () => {
  const fromEnv = providerEnvWithSettings({
    OPENAI_API_KEY: "env-openai",
    VIDEO_FACTORY_OPENAI_MODEL: "gpt-5.4",
    VIDEO_FACTORY_IMAGE_PROVIDER: "openai",
  });
  assert.equal(fromEnv.OPENAI_API_KEY, "env-openai");
  assert.equal(fromEnv.VIDEO_FACTORY_OPENAI_MODEL, "gpt-5.4");
  assert.equal(fromEnv.VIDEO_FACTORY_REVIEW_MODEL, "gpt-5.4");
  assert.equal(fromEnv.VIDEO_FACTORY_IMAGE_PROVIDER, "openai");
  assert.equal(fromEnv.VIDEO_FACTORY_IMAGE_MODEL, "gpt-image-2");
  assert.equal(publicEffectiveProviderSettings(fromEnv).imageProvider, "openai");

  const fromSaved = providerEnvWithSettings({ OPENAI_API_KEY: "env-openai" }, {
    openaiApiKey: "saved-openai",
    imageProvider: "gemini",
    imageModel: "gemini-3.1-flash-image",
  });
  assert.equal(fromSaved.OPENAI_API_KEY, "saved-openai");
  assert.equal(fromSaved.VIDEO_FACTORY_IMAGE_MODEL, "gemini-3.1-flash-image");
});

test("YouTube OAuth state is signed, expiring and tamper evident", async () => {
  const state = await signOAuthState(environment, { exp: Date.now() + 60_000, returnTo: "https://pelvi.health/video/" });
  assert.equal((await verifyOAuthState(environment, state)).returnTo, "https://pelvi.health/video/");
  assert.equal(await verifyOAuthState(environment, `${state}x`), null);
  const expired = await signOAuthState(environment, { exp: Date.now() - 1 });
  assert.equal(await verifyOAuthState(environment, expired), null);
});

test("public project output never includes provider job IDs or stored raw JSON", () => {
  const project = publicProject({
    id: "vf_factory_request_123456",
    title: "Example",
    status: "script_ready",
    blueprintJson: JSON.stringify(blueprint()),
    reviewJson: JSON.stringify({ engagementScore: 91, medicalFindings: [], humanVoiceFindings: [] }),
    openaiResponseId: "resp_secret",
    encryptedSettings: "encrypted-secret",
    videoObject: "video-factory/vf_factory_request_123456/final.mp4",
    estimatedProductionCostUSD: 6.13,
  });
  assert.equal(project.blueprint.goal, "intimacy");
  assert.equal(project.review.engagementScore, 91);
  assert.equal(project.estimatedProductionCostUSD, 6.13);
  assert.equal(project.hasArchivedVideo, true);
  assert.match(project.videoAssetUrl, /kind=video$/);
  assert.equal("openaiResponseId" in project, false);
  assert.equal("encryptedSettings" in project, false);
});

test("Nano Banana sends the official Interactions payload and respects Lite resolution", async () => {
  const originalFetch = globalThis.fetch;
  let requestBody;
  globalThis.fetch = async (_url, init) => {
    requestBody = JSON.parse(init.body);
    return new Response(JSON.stringify({ output_image: { data: "aGVsbG8=", mime_type: "image/jpeg" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  try {
    const result = await generateThumbnail({
      VIDEO_FACTORY_IMAGE_PROVIDER: "gemini",
      VIDEO_FACTORY_IMAGE_MODEL: "gemini-3.1-flash-lite-image",
      GEMINI_API_KEY: "test-key",
    }, {
      audience: "Adults with a pelvic health question",
      youtube: { title: "Why does sex hurt?" },
      thumbnail: { headline: "WHY IT HURTS", visualPrompt: "A thoughtful adult woman" },
    });
    assert.equal(result.dataUrl, "data:image/jpeg;base64,aGVsbG8=");
    assert.equal(requestBody.model, "gemini-3.1-flash-lite-image");
    assert.equal(requestBody.response_format.aspect_ratio, "16:9");
    assert.equal(requestBody.response_format.image_size, "1K");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("research starts as a background web-search job with a strict output schema", async () => {
  const originalFetch = globalThis.fetch;
  let requestBody;
  globalThis.fetch = async (_url, init) => {
    requestBody = JSON.parse(init.body);
    return new Response(JSON.stringify({ id: "resp_123" }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  try {
    const response = await startResearch({ OPENAI_API_KEY: "test-key", VIDEO_FACTORY_OPENAI_MODEL: "gpt-5.4" }, "Why does sex hurt even when I want it?");
    assert.equal(response.id, "resp_123");
    assert.equal(requestBody.background, true);
    assert.equal(requestBody.tools[0].type, "web_search");
    assert.ok(requestBody.tools[0].filters.allowed_domains.includes("nice.org.uk"));
    assert.equal(requestBody.reasoning.effort, "high");
    assert.equal(requestBody.text.format.type, "json_schema");
    assert.equal(requestBody.text.format.strict, true);
    assert.equal(JSON.stringify(requestBody.text.format.schema).includes("minLength"), false);
    assert.equal(JSON.stringify(requestBody.text.format.schema).includes("maxLength"), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("background response retrieval asks OpenAI to return live web source records", async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = "";
  globalThis.fetch = async (url) => {
    requestedUrl = String(url);
    return new Response(JSON.stringify({ id: "resp_123", status: "in_progress" }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  try {
    await readOpenAIResponse({ OPENAI_API_KEY: "test-key" }, "resp_123");
    assert.match(requestedUrl, /include=web_search_call.action.sources/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("HeyGen accepts sessions without an immediate video ID and surfaces terminal state", async () => {
  const originalFetch = globalThis.fetch;
  const replies = [
    { data: { session_id: "session_123" } },
    { data: { status: "failed", failure_message: "Presenter unavailable" } },
  ];
  globalThis.fetch = async () => new Response(JSON.stringify(replies.shift()), { status: 200, headers: { "Content-Type": "application/json" } });
  try {
    const started = await startHeyGenRender({ HEYGEN_API_KEY: "test" }, blueprint());
    assert.deepEqual(started, { videoId: "", sessionId: "session_123" });
    const session = await readHeyGenSession({ HEYGEN_API_KEY: "test" }, "session_123");
    assert.equal(session.status, "failed");
    assert.equal(session.error, "Presenter unavailable");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("HeyGen production brief stays inside the official 10,000-character prompt limit", () => {
  const value = blueprint();
  value.youtube.title = "Why sex can hurt";
  value.youtube.description = "A useful description";
  value.youtube.tags = ["pelvic floor"];
  value.sources = value.sources.map((source) => ({ ...source, publisher: "Publisher", year: "2026" }));
  const prompt = heyGenPrompt(value);
  assert.ok(prompt.length < 10_000);
  assert.equal(prompt.includes("FULL SCRIPT:"), false);
});

test("YouTube uploads are private, owner-triggered and disclose realistic synthetic media", async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, init = {}) => {
    requests.push({ url: String(url), init });
    if (String(url).startsWith("https://www.googleapis.com/upload/youtube/v3/videos")) {
      return new Response(null, { status: 200, headers: { Location: "https://upload.example/session" } });
    }
    if (String(url) === "https://video.example/final.mp4") {
      return new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { "Content-Type": "video/mp4", "Content-Length": "3" } });
    }
    if (String(url) === "https://upload.example/session") {
      return new Response(JSON.stringify({ id: "youtube123" }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    throw new Error(`Unexpected fetch ${url}`);
  };
  try {
    const result = await uploadPrivateYoutubeVideo({
      accessToken: "access",
      project: { videoUrl: "https://video.example/final.mp4" },
      blueprint: { youtube: { title: "Title", description: "Description", tags: ["pelvic floor"] } },
      publishAt: "",
    });
    assert.equal(result.id, "youtube123");
    const metadataRequest = requests.find((request) => request.url.startsWith("https://www.googleapis.com/upload/youtube/v3/videos"));
    const metadata = JSON.parse(metadataRequest.init.body);
    assert.equal(metadata.status.privacyStatus, "private");
    assert.equal(metadata.status.selfDeclaredMadeForKids, false);
    assert.equal(metadata.status.containsSyntheticMedia, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("YouTube rejects a stale schedule before creating an upload session", async () => {
  await assert.rejects(() => startPrivateYoutubeUploadSession({
    accessToken: "access",
    blueprint: { youtube: { title: "Title", description: "Description", tags: [], chapters: [] } },
    publishAt: new Date(Date.now() - 60_000).toISOString(),
    totalBytes: 10,
  }), /at least five minutes in the future/i);
});

test("interrupted YouTube uploads resume from the server-confirmed byte without duplicating", async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, init = {}) => {
    requests.push({ url: String(url), init });
    if (requests.length === 1) return new Response(null, { status: 308, headers: { Range: "bytes=0-99" } });
    return new Response(JSON.stringify({ id: "youtube-resumed" }), { status: 201, headers: { "Content-Type": "application/json" } });
  };
  try {
    const inspected = await inspectPrivateYoutubeUpload({ accessToken: "access", uploadUrl: "https://upload.example/session", totalBytes: 300 });
    assert.deepEqual(inspected, { expired: false, complete: false, nextByte: 100 });
    const resumed = await continuePrivateYoutubeUpload({
      accessToken: "access",
      uploadUrl: "https://upload.example/session",
      videoResponse: new Response(new Uint8Array(200), { status: 206, headers: { "Content-Type": "video/mp4", "Content-Length": "200" } }),
      totalBytes: 300,
      startByte: 100,
    });
    assert.equal(resumed.id, "youtube-resumed");
    assert.equal(requests[1].init.headers["Content-Range"], "bytes 100-299/300");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
