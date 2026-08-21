import { requireOwner } from "../../functions-lib/ownerAuth.js";
import {
  parseStructuredOutput,
  projectIdFor,
  publicProject,
  responseSourceUrls,
  safeProjectId,
  validIdempotencyKey,
  validateBlueprint,
  validateRenderedTranscript,
  validateReview,
  validateVideoTitle,
} from "../../functions-lib/videoFactory.js";
import {
  decryptSecret,
  continuePrivateYoutubeUpload,
  generateThumbnail,
  inspectPrivateYoutubeUpload,
  readHeyGenRender,
  readHeyGenSession,
  readOpenAIResponse,
  readRenderedSubtitle,
  refreshYoutubeAccess,
  signOAuthState,
  startClaimReview,
  startHeyGenRender,
  startPrivateYoutubeUploadSession,
  startResearch,
  uploadYoutubeThumbnail,
  youtubeAuthorizationUrl,
} from "../../functions-lib/videoFactoryProviders.js";
import {
  acquireVideoProjectLease,
  listVideoProjects,
  readVideoAsset,
  readVideoConfig,
  readVideoProject,
  releaseVideoProjectLease,
  uploadVideoAsset,
  writeVideoProject,
} from "../../functions-lib/videoFactoryStore.js";
import {
  publicEffectiveProviderSettings,
  publicProviderSettings,
  resolvedProviderEnv,
  saveProviderSettings,
} from "../../functions-lib/videoFactorySettings.js";
import { ipRateLimited, json, readJson } from "../../functions-lib/stripeSync.js";

const MAX_BODY = 12 * 1024;

async function withProjectLease(env, projectId, operation, callback, ttlMs = 3 * 60 * 1000) {
  const lease = await acquireVideoProjectLease(env, projectId, operation, ttlMs);
  if (!lease.acquired) {
    return json(202, { project: publicProject(lease.project), busy: true });
  }
  try {
    return await callback(lease.project);
  } finally {
    await releaseVideoProjectLease(env, projectId, lease.token).catch((error) => {
      console.error("Video Factory lease release failed", { projectId, operation, message: error?.message || "unknown" });
    });
  }
}

export async function onRequestPost({ request, env }) {
  const owner = await requireOwner(request, env);
  if (!owner.ok) return json(owner.status, { error: owner.error });
  if (ipRateLimited(request, { windowMs: 60_000, max: 90 })) {
    return json(429, { error: "The studio is receiving too many requests. Wait a moment." });
  }

  const body = await readJson(request, MAX_BODY);
  if (!body) return json(400, { error: "Send a valid Video Factory request." });
  const action = typeof body.action === "string" ? body.action : "";

  try {
    if (action === "status") return json(200, await factoryStatus(env, request));
    if (action === "save_settings") return saveSettings(env, request, body);
    const providers = await resolvedProviderEnv(env);
    if (action === "list") {
      const projects = await listVideoProjects(env);
      return json(200, { projects: projects.map(publicProject) });
    }
    if (action === "create") return createProject(providers, body);
    if (action === "refresh") return refreshProject(providers, body);
    if (action === "render") return renderProject(providers, body);
    if (action === "thumbnail") return createThumbnail(providers, body);
    if (action === "youtube_connect") return connectYoutube(providers, request);
    if (action === "youtube_upload") return uploadYoutube(providers, body);
    if (action === "retry") return retryProject(providers, body);
    return json(400, { error: "Unknown Video Factory action." });
  } catch (error) {
    console.error("Video Factory request failed", { action, message: error?.message || "unknown" });
    return json(502, { error: publicError(error) });
  }
}

async function factoryStatus(env, request) {
  const providers = await resolvedProviderEnv(env);
  let connected = Boolean(providers.YOUTUBE_REFRESH_TOKEN);
  if (!connected && env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const config = await readVideoConfig(providers, "youtube");
      connected = Boolean(config?.encryptedRefreshToken);
    } catch {}
  }
  return {
    source: "Pelvi Video Factory",
    fetchedAt: Date.now(),
    enabled: providers.VIDEO_FACTORY_ENABLED !== "false",
    integrations: {
      research: Boolean(providers.OPENAI_API_KEY),
      image: providers.VIDEO_FACTORY_IMAGE_PROVIDER === "gemini" ? Boolean(providers.GEMINI_API_KEY) : Boolean(providers.OPENAI_API_KEY),
      presenter: Boolean(providers.HEYGEN_API_KEY && providers.HEYGEN_AVATAR_ID),
      presenterVoice: Boolean(providers.HEYGEN_VOICE_ID),
      presenterBrand: Boolean(providers.HEYGEN_BRAND_KIT_ID || providers.HEYGEN_STYLE_ID),
      persistence: Boolean(providers.FIREBASE_SERVICE_ACCOUNT),
      youtubeOAuth: Boolean(providers.YOUTUBE_CLIENT_ID && providers.YOUTUBE_CLIENT_SECRET),
      youtubeConnected: connected,
    },
    youtubeRedirectUri: `${new URL(request.url).origin}/api/video-factory-youtube`,
    models: {
      research: providers.VIDEO_FACTORY_OPENAI_MODEL || "gpt-5.6-sol",
      review: providers.VIDEO_FACTORY_REVIEW_MODEL || providers.VIDEO_FACTORY_OPENAI_MODEL || "gpt-5.6-sol",
      image: providers.VIDEO_FACTORY_IMAGE_MODEL || "gemini-3-pro-image",
    },
    settings: publicEffectiveProviderSettings(providers),
    costs: {
      thumbnailEstimateUSD: thumbnailEstimate(providers),
      thumbnailLabel: thumbnailCostLabel(providers),
      note: "Presenter cost depends on the connected provider plan and finished duration.",
    },
  };
}

function thumbnailEstimate(env) {
  if ((env.VIDEO_FACTORY_IMAGE_PROVIDER || "gemini") !== "gemini") return null;
  return {
    "gemini-3-pro-image": 0.134,
    "gemini-3.1-flash-image": 0.101,
    "gemini-3.1-flash-lite-image": 0.0336,
  }[env.VIDEO_FACTORY_IMAGE_MODEL || "gemini-3-pro-image"] ?? null;
}

function thumbnailCostLabel(env) {
  if ((env.VIDEO_FACTORY_IMAGE_PROVIDER || "gemini") !== "gemini") return "Selected OpenAI image model";
  return env.VIDEO_FACTORY_IMAGE_MODEL === "gemini-3.1-flash-lite-image"
    ? "Nano Banana 2 Lite · 1K · 16:9"
    : `${env.VIDEO_FACTORY_IMAGE_MODEL === "gemini-3.1-flash-image" ? "Nano Banana 2" : "Nano Banana Pro"} · 2K · 16:9`;
}

async function saveSettings(env, request, body) {
  const settings = await saveProviderSettings(env, body.settings || {});
  return json(200, {
    saved: true,
    settings: publicProviderSettings(settings),
    status: await factoryStatus(env, request),
  });
}

async function createProject(env, body) {
  if (env.VIDEO_FACTORY_ENABLED === "false") return json(503, { error: "Video Factory is paused." });
  requireIntegration(env, "FIREBASE_SERVICE_ACCOUNT", "Project storage");
  requireIntegration(env, "OPENAI_API_KEY", "Research");
  const checked = validateVideoTitle(body.title);
  if (!checked.ok) return json(400, { error: checked.error });

  const key = validIdempotencyKey(body.idempotencyKey);
  const id = projectIdFor(key);
  if (key) {
    const existing = await readVideoProject(env, id);
    if (existing) return json(200, { project: publicProject(existing), reused: true });
  }

  const now = new Date().toISOString();
  await writeVideoProject(env, id, {
    title: checked.title,
    status: "researching",
    providerSnapshotJson: JSON.stringify(providerSnapshot(env)),
    createdAt: now,
    updatedAt: now,
    error: "",
  });

  return restartResearch(env, { id });
}

async function refreshProject(env, body) {
  const project = await ownedProject(env, body.projectId);
  const projectEnv = providerEnvForProject(env, project);
  if (project.status === "researching" && !project.openaiResponseId) return restartResearch(projectEnv, project);
  if (project.status === "researching") return refreshResearch(projectEnv, project);
  if (project.status === "claim_check_starting") return restartClaimReview(projectEnv, project);
  if (project.status === "claim_check") return refreshClaimReview(projectEnv, project);
  if (project.status === "storyboarding") return restartRender(projectEnv, project);
  if (project.status === "rendering") return refreshRender(projectEnv, project);
  if (project.status === "quality_check") return verifyAndArchiveRender(projectEnv, project);
  return json(200, { project: publicProject(project) });
}

async function refreshResearch(env, project) {
  requireIntegration(env, "OPENAI_API_KEY", "Research");
  if (!project.openaiResponseId) throw new Error("This project has no research job.");
  const response = await readOpenAIResponse(env, project.openaiResponseId);
  const state = String(response?.status || "in_progress");
  if (["queued", "in_progress"].includes(state)) return json(200, { project: publicProject(project) });
  if (state !== "completed") {
    const failed = await failProject(env, project.id, new Error("Research did not complete."), "researching");
    return json(200, { project: publicProject(failed) });
  }

  const draft = parseStructuredOutput(response);
  const checked = validateBlueprint(draft, { retrievedSourceUrls: responseSourceUrls(response) });
  if (!checked.ok) {
    const failed = await failProject(env, project.id, new Error(checked.error), "researching");
    return json(200, { project: publicProject(failed) });
  }

  await writeVideoProject(env, project.id, {
    status: "claim_check_starting",
    draftJson: JSON.stringify(checked.blueprint),
    updatedAt: new Date().toISOString(),
    error: "",
  });

  return restartClaimReview(env, { id: project.id });
}

async function refreshClaimReview(env, project) {
  requireIntegration(env, "OPENAI_API_KEY", "Medical review");
  if (!project.reviewResponseId) throw new Error("This project has no medical-review job.");
  const response = await readOpenAIResponse(env, project.reviewResponseId);
  const state = String(response?.status || "in_progress");
  if (["queued", "in_progress"].includes(state)) return json(200, { project: publicProject(project) });
  if (state !== "completed") {
    const failed = await failProject(env, project.id, new Error("Medical review did not complete."), "claim_check");
    return json(200, { project: publicProject(failed) });
  }

  const review = parseStructuredOutput(response);
  const sourceCheck = validateBlueprint(review?.finalBlueprint, { retrievedSourceUrls: responseSourceUrls(response) });
  if (!sourceCheck.ok) {
    const failed = await failProject(env, project.id, new Error(sourceCheck.error), "claim_check");
    return json(200, { project: publicProject(failed) });
  }
  const checked = validateReview(review);
  if (!checked.ok) {
    const failed = await failProject(env, project.id, new Error(checked.error), "claim_check");
    return json(200, { project: publicProject(failed) });
  }

  const scriptReady = await writeVideoProject(env, project.id, {
    status: "script_ready",
    blueprintJson: JSON.stringify(checked.blueprint),
    reviewJson: JSON.stringify(checked.review),
    estimatedProductionCostUSD: estimatedProductionCost(env, checked.blueprint.runtimeSeconds),
    updatedAt: new Date().toISOString(),
    error: "",
  });

  if (!rendererConfigured(env)) return json(200, { project: publicProject(scriptReady), needsPresenterSetup: true });
  return renderStoredProject(env, scriptReady);
}

async function renderProject(env, body) {
  const project = await ownedProject(env, body.projectId);
  if (!["script_ready", "failed", "ready"].includes(project.status)) {
    return json(409, { error: "This project is not ready to render." });
  }
  return renderStoredProject(providerEnvForProject(env, project), project);
}

async function renderStoredProject(env, project) {
  if (!rendererConfigured(env)) return json(503, { error: "Add a commercially authorized presenter and voice in the Video Factory setup." });
  return withProjectLease(env, project.id, "renderer_start", async (current) => {
    const activeRenderStarted = new Date(current.renderStartedAt || 0).getTime();
    const hasActiveRender = Boolean(current.heygenVideoId || current.heygenSessionId) &&
      Number.isFinite(activeRenderStarted) && Date.now() - activeRenderStarted < 45 * 60 * 1000 &&
      ["script_ready", "storyboarding", "rendering"].includes(current.status) && !current.videoObject;
    if (hasActiveRender) {
      const repaired = current.status === "rendering" ? current : await writeVideoProject(env, current.id, {
        status: "rendering",
        updatedAt: new Date().toISOString(),
      });
      return json(200, { project: publicProject(repaired), reused: true });
    }
    if (!["script_ready", "failed", "ready"].includes(current.status)) {
      return json(409, { error: "This project is not ready to render." });
    }
    const blueprint = parseBlueprint(current);
    await writeVideoProject(env, current.id, {
      status: "storyboarding",
      videoUrl: "",
      videoObject: "",
      subtitleUrl: "",
      subtitleObject: "",
      transcriptSimilarity: 0,
      heygenVideoId: "",
      heygenSessionId: "",
      renderStartedAt: "",
      updatedAt: new Date().toISOString(),
      error: "",
    });
    try {
      const render = await startHeyGenRender(env, blueprint);
      const startedAt = new Date().toISOString();
      const next = await writeVideoProject(env, current.id, {
        status: "rendering",
        heygenVideoId: render.videoId,
        heygenSessionId: render.sessionId,
        renderStartedAt: startedAt,
        updatedAt: startedAt,
      });
      return json(202, { project: publicProject(next) });
    } catch (error) {
      const failed = await failProject(env, current.id, error, "storyboarding");
      return json(200, { project: publicProject(failed) });
    }
  });
}

async function refreshRender(env, project) {
  if (!rendererConfigured(env)) return json(503, { error: "The commercially authorized presenter is not configured." });
  const renderStartedAt = new Date(project.renderStartedAt || project.updatedAt || project.createdAt || 0).getTime();
  const renderTimedOut = Number.isFinite(renderStartedAt) && Date.now() - renderStartedAt > 45 * 60 * 1000;
  if (renderTimedOut) {
    const failed = await failProject(env, project.id, new Error("The renderer did not produce a video within 45 minutes."), "rendering");
    return json(200, { project: publicProject(failed) });
  }
  let videoId = project.heygenVideoId || "";
  if (!videoId) {
    if (!project.heygenSessionId) throw new Error("This project has no render session.");
    const session = await readHeyGenSession(env, project.heygenSessionId);
    if (!session.videoId) {
      const activeSessionStates = new Set(["pending", "queued", "waiting", "processing", "rendering", "generating", "in_progress"]);
      const failedSessionStates = new Set(["failed", "failure", "error", "cancelled", "canceled"]);
      if (failedSessionStates.has(session.status)) {
        const failed = await failProject(env, project.id, new Error(session.error || "The video renderer session failed."), "rendering");
        return json(200, { project: publicProject(failed) });
      }
      if (!activeSessionStates.has(session.status)) {
        const message = session.status === "waiting_for_input"
          ? "The renderer requested input instead of producing the approved video."
          : "The renderer session ended without a video.";
        const failed = await failProject(env, project.id, new Error(session.error || message), "rendering");
        return json(200, { project: publicProject(failed) });
      }
      return json(200, { project: publicProject(project) });
    }
    videoId = session.videoId;
    project = await writeVideoProject(env, project.id, {
      heygenVideoId: videoId,
      updatedAt: new Date().toISOString(),
    });
  }
  const render = await readHeyGenRender(env, videoId);
  if (["pending", "queued", "waiting", "processing", "rendering"].includes(render.status)) {
    return json(200, { project: publicProject(project) });
  }
  if (!["completed", "complete", "success", "succeeded"].includes(render.status) || !render.videoUrl) {
    const failed = await failProject(env, project.id, new Error(render.error || "The video renderer did not complete."), "rendering");
    return json(200, { project: publicProject(failed) });
  }
  if (!render.captionedVideoUrl || !render.subtitleUrl) {
    const failed = await failProject(env, project.id, new Error("The renderer did not return the required captioned video and transcript."), "rendering");
    return json(200, { project: publicProject(failed) });
  }
  const blueprint = parseBlueprint(project);
  const minimumDuration = Math.max(110, Math.floor(blueprint.runtimeSeconds * 0.75));
  const maximumDuration = Math.min(260, Math.ceil(blueprint.runtimeSeconds * 1.3));
  if (!Number.isFinite(render.durationSeconds) || render.durationSeconds < minimumDuration || render.durationSeconds > maximumDuration) {
    const failed = await failProject(env, project.id, new Error("The rendered video duration does not match the approved 2-4 minute production."), "render_verification");
    return json(200, { project: publicProject(failed) });
  }
  const checking = await writeVideoProject(env, project.id, {
    status: "quality_check",
    videoUrl: render.videoUrl,
    subtitleUrl: render.subtitleUrl,
    providerThumbnailUrl: render.thumbnailUrl,
    durationSeconds: render.durationSeconds,
    updatedAt: new Date().toISOString(),
    error: "",
  });
  return verifyAndArchiveRender(env, checking);
}

async function verifyAndArchiveRender(env, project) {
  return withProjectLease(env, project.id, "render_archive", async (current) => {
    if (current.status === "ready" && current.videoObject && current.subtitleObject) {
      return json(200, { project: publicProject(current), reused: true });
    }
    return verifyAndArchiveRenderUnlocked(env, current);
  }, 10 * 60 * 1000);
}

async function verifyAndArchiveRenderUnlocked(env, project) {
  const blueprint = parseBlueprint(project);
  if (!project.videoUrl || !project.subtitleUrl) {
    const failed = await failProject(env, project.id, new Error("The finished render is missing its video or transcript URL."), "rendering");
    return json(200, { project: publicProject(failed) });
  }
  try {
    const subtitleText = await readRenderedSubtitle(project.subtitleUrl);
    const checked = validateRenderedTranscript(blueprint, subtitleText);
    if (!checked.ok) {
      const failed = await failProject(env, project.id, new Error(checked.error), "render_verification");
      return json(200, { project: publicProject(failed) });
    }
    const videoObject = `video-factory/${project.id}/final.mp4`;
    const subtitleObject = `video-factory/${project.id}/captions.srt`;
    await uploadVideoAsset(env, videoObject, project.videoUrl);
    await uploadVideoAsset(env, subtitleObject, project.subtitleUrl);
    const next = await writeVideoProject(env, project.id, {
      status: "ready",
      videoObject,
      subtitleObject,
      transcriptSimilarity: checked.similarity,
      updatedAt: new Date().toISOString(),
      error: "",
      failedStage: "",
    });
    return json(200, { project: publicProject(next) });
  } catch (error) {
    const failed = await failProject(env, project.id, error, "archiving");
    return json(200, { project: publicProject(failed) });
  }
}

async function createThumbnail(env, body) {
  const project = await ownedProject(env, body.projectId);
  const projectEnv = providerEnvForProject(env, project);
  if ((projectEnv.VIDEO_FACTORY_IMAGE_PROVIDER || "gemini") === "gemini") {
    requireIntegration(projectEnv, "GEMINI_API_KEY", "Thumbnail generation");
  } else {
    requireIntegration(projectEnv, "OPENAI_API_KEY", "Thumbnail generation");
  }
  return withProjectLease(projectEnv, project.id, "thumbnail_generation", async (current) => {
    const blueprint = parseBlueprint(current);
    const result = await generateThumbnail(projectEnv, blueprint);
    const objectName = `video-factory/${current.id}/thumbnail.jpg`;
    await uploadVideoAsset(projectEnv, objectName, result.url || result.dataUrl);
    const next = await writeVideoProject(projectEnv, current.id, {
      thumbnailObject: objectName,
      thumbnailPrompt: result.revisedPrompt || "",
      updatedAt: new Date().toISOString(),
    });
    return json(200, { project: publicProject(next) });
  }, 8 * 60 * 1000);
}

async function connectYoutube(env, request) {
  requireIntegration(env, "YOUTUBE_CLIENT_ID", "YouTube OAuth");
  requireIntegration(env, "YOUTUBE_CLIENT_SECRET", "YouTube OAuth");
  const origin = new URL(request.url).origin;
  const redirectUri = `${origin}/api/video-factory-youtube`;
  const state = await signOAuthState(env, {
    exp: Date.now() + 10 * 60 * 1000,
    nonce: crypto.randomUUID(),
    returnTo: `${origin}/video/`,
  });
  return json(200, { url: youtubeAuthorizationUrl(env, state, redirectUri) });
}

async function uploadYoutube(env, body) {
  requireIntegration(env, "YOUTUBE_CLIENT_ID", "YouTube upload");
  requireIntegration(env, "YOUTUBE_CLIENT_SECRET", "YouTube upload");
  const project = await ownedProject(env, body.projectId);
  return withProjectLease(env, project.id, "youtube_delivery", (current) => uploadYoutubeUnlocked(env, body, current), 25 * 60 * 1000);
}

async function uploadYoutubeUnlocked(env, body, initialProject) {
  let project = initialProject;
  if (project.status !== "ready" || (!project.videoUrl && !project.videoObject)) return json(409, { error: "Finish the video render before uploading." });
  if (project.youtubeVideoId && ["thumbnail_failed", "thumbnail_uploading"].includes(project.youtubeStatus)) {
    return retryYoutubeThumbnail(env, project);
  }
  if (project.youtubeVideoId) {
    return json(200, { project: publicProject(project), reused: true });
  }
  if (project.youtubeStatus === "recovery_required" && body.confirmNewUpload !== true) {
    return json(409, { error: "Check the Pelvi YouTube channel first, then explicitly start a new upload to avoid a duplicate." });
  }
  if (project.youtubeStatus === "recovery_required" && body.confirmNewUpload === true) {
    project = await writeVideoProject(env, project.id, {
      youtubeUploadUrl: "",
      youtubeUploadBytes: 0,
      youtubeStatus: "",
      youtubeError: "",
      updatedAt: new Date().toISOString(),
    });
  }
  const blueprint = parseBlueprint(project);
  const refreshToken = await youtubeRefreshToken(env);
  if (!refreshToken) return json(409, { error: "Connect the Pelvi YouTube channel first." });

  let uploadUrl = project.youtubeUploadUrl || "";
  try {
    const accessToken = await refreshYoutubeAccess(env, refreshToken);
    if (!project.videoObject) throw new Error("The privately archived video is required before YouTube upload.");
    let totalBytes = Number(project.youtubeUploadBytes) || 0;
    if (!totalBytes) {
      const source = await readVideoAsset(env, project.videoObject);
      totalBytes = Number(source.headers.get("Content-Length"));
      if (source.body) await source.body.cancel().catch(() => {});
      if (!Number.isInteger(totalBytes) || totalBytes < 1) throw new Error("The archived video size is unavailable.");
    }
    let publishAt = project.publishAt || "";
    if (!uploadUrl) {
      const checkedSchedule = validatePublishAt(body.publishAt);
      if (!checkedSchedule.ok) return json(400, { error: checkedSchedule.error });
      publishAt = checkedSchedule.value;
    }
    if (!uploadUrl) {
      uploadUrl = await startPrivateYoutubeUploadSession({ accessToken, blueprint, publishAt, totalBytes });
      project = await writeVideoProject(env, project.id, {
        youtubeStatus: "uploading",
        youtubeUploadUrl: uploadUrl,
        youtubeUploadBytes: totalBytes,
        publishAt,
        youtubeError: "",
        updatedAt: new Date().toISOString(),
      });
    }
    const inspection = await inspectPrivateYoutubeUpload({ accessToken, uploadUrl, totalBytes });
    if (inspection.expired) {
      const recovery = await writeVideoProject(env, project.id, {
        youtubeStatus: "recovery_required",
        youtubeError: "The resumable YouTube session expired. Check the channel before starting a new copy.",
        updatedAt: new Date().toISOString(),
      });
      return json(200, { project: publicProject(recovery) });
    }
    let uploaded = inspection;
    if (!inspection.complete) {
      const videoResponse = await readVideoAsset(env, project.videoObject, { startByte: inspection.nextByte });
      uploaded = await continuePrivateYoutubeUpload({
        accessToken,
        uploadUrl,
        videoResponse,
        totalBytes,
        startByte: inspection.nextByte,
      });
    }
    if (uploaded.expired) {
      const recovery = await writeVideoProject(env, project.id, {
        youtubeStatus: "recovery_required",
        youtubeError: "The resumable YouTube session expired. Check the channel before starting a new copy.",
        updatedAt: new Date().toISOString(),
      });
      return json(200, { project: publicProject(recovery) });
    }
    if (!uploaded.complete) {
      const paused = await writeVideoProject(env, project.id, {
        youtubeStatus: "upload_paused",
        youtubeError: "YouTube saved part of the video. Resume to continue from the saved byte.",
        updatedAt: new Date().toISOString(),
      });
      return json(202, { project: publicProject(paused) });
    }
    let next = await writeVideoProject(env, project.id, {
      youtubeStatus: "thumbnail_uploading",
      youtubeVideoId: uploaded.id,
      youtubeUrl: uploaded.url,
      youtubeUploadUrl: "",
      youtubeUploadBytes: 0,
      updatedAt: new Date().toISOString(),
    });
    next = await attachYoutubeThumbnail(env, next, accessToken);
    return json(200, { project: publicProject(next) });
  } catch (error) {
    await writeVideoProject(env, project.id, {
      youtubeStatus: uploadUrl ? "upload_paused" : "failed",
      youtubeError: publicError(error),
      updatedAt: new Date().toISOString(),
    });
    throw error;
  }
}

function validatePublishAt(value) {
  if (!value) return { ok: true, value: "" };
  if (typeof value !== "string") return { ok: false, error: "Choose a valid YouTube publish time." };
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp) || timestamp < Date.now() + 5 * 60 * 1000) {
    return { ok: false, error: "Choose a YouTube publish time at least five minutes in the future." };
  }
  return { ok: true, value: new Date(timestamp).toISOString() };
}

async function retryYoutubeThumbnail(env, project) {
  const refreshToken = await youtubeRefreshToken(env);
  if (!refreshToken) return json(409, { error: "Connect the Pelvi YouTube channel first." });
  const accessToken = await refreshYoutubeAccess(env, refreshToken);
  const next = await attachYoutubeThumbnail(env, project, accessToken);
  return json(200, { project: publicProject(next) });
}

async function attachYoutubeThumbnail(env, project, accessToken) {
  const thumbnailUrl = project.thumbnailUrl || project.providerThumbnailUrl;
  const thumbnailResponse = project.thumbnailObject ? await readVideoAsset(env, project.thumbnailObject) : null;
  if (!thumbnailUrl && !thumbnailResponse) {
    return writeVideoProject(env, project.id, {
      youtubeStatus: "uploaded",
      youtubeThumbnailUploaded: false,
      youtubeError: "",
      updatedAt: new Date().toISOString(),
    });
  }
  try {
    await uploadYoutubeThumbnail({
      accessToken,
      videoId: project.youtubeVideoId,
      thumbnailUrl,
      thumbnailResponse,
    });
    return writeVideoProject(env, project.id, {
      youtubeStatus: "uploaded",
      youtubeThumbnailUploaded: true,
      youtubeError: "",
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return writeVideoProject(env, project.id, {
      youtubeStatus: "thumbnail_failed",
      youtubeThumbnailUploaded: false,
      youtubeError: publicError(error),
      updatedAt: new Date().toISOString(),
    });
  }
}

async function retryProject(env, body) {
  const project = await ownedProject(env, body.projectId);
  const projectEnv = providerEnvForProject(env, project);
  if (project.status !== "failed") return json(409, { error: "Only a failed project needs retrying." });
  const stage = project.failedStage || "researching";
  if (stage === "archiving") return verifyAndArchiveRender(projectEnv, project);
  if (stage === "claim_check" && project.draftJson) {
    const reset = await writeVideoProject(env, project.id, {
      status: "claim_check_starting",
      reviewResponseId: "",
      error: "",
      failedStage: "",
      updatedAt: new Date().toISOString(),
    });
    return restartClaimReview(projectEnv, reset);
  }
  if (stage === "rendering" || stage === "storyboarding" || stage === "render_verification") {
    const reset = await writeVideoProject(env, project.id, {
      status: "script_ready",
      heygenVideoId: "",
      heygenSessionId: "",
      renderStartedAt: "",
      error: "",
      failedStage: "",
      updatedAt: new Date().toISOString(),
    });
    return renderStoredProject(projectEnv, reset);
  }
  const checked = validateVideoTitle(project.title);
  if (!checked.ok) return json(400, { error: checked.error });
  const reset = await writeVideoProject(env, project.id, {
    status: "researching",
    openaiResponseId: "",
    reviewResponseId: "",
    error: "",
    failedStage: "",
    updatedAt: new Date().toISOString(),
  });
  return restartResearch(projectEnv, reset);
}

async function restartClaimReview(env, project) {
  return withProjectLease(env, project.id, "claim_review_start", async (current) => {
    if (current.reviewResponseId) {
      const repaired = current.status === "claim_check" ? current : await writeVideoProject(env, current.id, {
        status: "claim_check",
        updatedAt: new Date().toISOString(),
      });
      return json(200, { project: publicProject(repaired), reused: true });
    }
    if (current.status !== "claim_check_starting") {
      return json(200, { project: publicProject(current), reused: true });
    }
    const draft = JSON.parse(current.draftJson || "null");
    const checked = validateBlueprint(draft);
    if (!checked.ok) {
      const failed = await failProject(env, current.id, new Error(checked.error), "researching");
      return json(200, { project: publicProject(failed) });
    }
    try {
      const review = await startClaimReview(env, checked.blueprint);
      const next = await writeVideoProject(env, current.id, {
        status: "claim_check",
        reviewResponseId: review.id,
        updatedAt: new Date().toISOString(),
        error: "",
      });
      return json(200, { project: publicProject(next) });
    } catch (error) {
      const failed = await failProject(env, current.id, error, "claim_check");
      return json(200, { project: publicProject(failed) });
    }
  });
}

async function restartResearch(env, project) {
  return withProjectLease(env, project.id, "research_start", async (current) => {
    if (current.openaiResponseId) return json(200, { project: publicProject(current), reused: true });
    if (current.status !== "researching") return json(200, { project: publicProject(current), reused: true });
    const checked = validateVideoTitle(current.title);
    if (!checked.ok) {
      const failed = await failProject(env, current.id, new Error(checked.error), "researching");
      return json(200, { project: publicProject(failed) });
    }
    try {
      const response = await startResearch(env, checked.title);
      const next = await writeVideoProject(env, current.id, {
        status: "researching",
        openaiResponseId: response.id,
        updatedAt: new Date().toISOString(),
        error: "",
      });
      return json(202, { project: publicProject(next) });
    } catch (error) {
      const failed = await failProject(env, current.id, error, "researching");
      return json(200, { project: publicProject(failed) });
    }
  });
}

async function restartRender(env, project) {
  const reset = await writeVideoProject(env, project.id, {
    status: "script_ready",
    heygenVideoId: "",
    heygenSessionId: "",
    renderStartedAt: "",
    failedStage: "",
    updatedAt: new Date().toISOString(),
    error: "",
  });
  return renderStoredProject(env, reset);
}

async function ownedProject(env, value) {
  const id = safeProjectId(value);
  if (!id) throw new Error("Project ID is invalid.");
  const project = await readVideoProject(env, id);
  if (!project) throw new Error("Video project was not found.");
  return project;
}

function parseBlueprint(project) {
  let blueprint;
  try { blueprint = JSON.parse(project.blueprintJson || ""); } catch { throw new Error("The reviewed blueprint is missing."); }
  const checked = validateBlueprint(blueprint);
  if (!checked.ok) throw new Error(checked.error);
  return checked.blueprint;
}

function rendererConfigured(env) {
  return Boolean(env.HEYGEN_API_KEY && env.HEYGEN_AVATAR_ID);
}

function providerSnapshot(env) {
  return {
    version: 1,
    researchModel: env.VIDEO_FACTORY_OPENAI_MODEL || "gpt-5.6-sol",
    reviewModel: env.VIDEO_FACTORY_REVIEW_MODEL || env.VIDEO_FACTORY_OPENAI_MODEL || "gpt-5.6-sol",
    imageProvider: env.VIDEO_FACTORY_IMAGE_PROVIDER || "gemini",
    imageModel: env.VIDEO_FACTORY_IMAGE_MODEL || "gemini-3-pro-image",
    renderer: "heygen_video_agent_v3",
    heygenAvatarId: env.HEYGEN_AVATAR_ID || "",
    heygenVoiceId: env.HEYGEN_VOICE_ID || "",
    heygenStyleId: env.HEYGEN_STYLE_ID || "",
    heygenBrandKitId: env.HEYGEN_BRAND_KIT_ID || "",
  };
}

function providerEnvForProject(env, project) {
  let snapshot = null;
  try { snapshot = JSON.parse(project.providerSnapshotJson || ""); } catch {}
  if (!snapshot || snapshot.version !== 1) return env;
  return Object.assign(Object.create(env || null), {
    VIDEO_FACTORY_OPENAI_MODEL: snapshot.researchModel || env.VIDEO_FACTORY_OPENAI_MODEL,
    VIDEO_FACTORY_REVIEW_MODEL: snapshot.reviewModel || env.VIDEO_FACTORY_REVIEW_MODEL,
    VIDEO_FACTORY_IMAGE_PROVIDER: snapshot.imageProvider || env.VIDEO_FACTORY_IMAGE_PROVIDER,
    VIDEO_FACTORY_IMAGE_MODEL: snapshot.imageModel || env.VIDEO_FACTORY_IMAGE_MODEL,
    HEYGEN_AVATAR_ID: snapshot.heygenAvatarId || env.HEYGEN_AVATAR_ID,
    HEYGEN_VOICE_ID: snapshot.heygenVoiceId || env.HEYGEN_VOICE_ID,
    HEYGEN_STYLE_ID: snapshot.heygenStyleId || env.HEYGEN_STYLE_ID,
    HEYGEN_BRAND_KIT_ID: snapshot.heygenBrandKitId || env.HEYGEN_BRAND_KIT_ID,
  });
}

function estimatedProductionCost(env, runtimeSeconds) {
  const presenterEstimate = (Math.max(0, Number(runtimeSeconds) || 0) / 60) * 2;
  const imageEstimate = thumbnailEstimate(env) || 0;
  return Math.round((presenterEstimate + imageEstimate) * 100) / 100;
}

function requireIntegration(env, name, label) {
  if (!env[name]) throw new Error(`${label} is not configured yet.`);
}

async function failProject(env, id, error, stage) {
  return writeVideoProject(env, id, {
    status: "failed",
    failedStage: stage,
    error: publicError(error),
    updatedAt: new Date().toISOString(),
  });
}

function publicError(error) {
  const message = typeof error?.message === "string" ? error.message : "The Video Factory could not finish that step.";
  if (/api[_ -]?key|secret|token|credential/i.test(message)) return "A private integration is not configured correctly.";
  return message.slice(0, 280);
}

async function youtubeRefreshToken(env) {
  if (env.YOUTUBE_REFRESH_TOKEN) return env.YOUTUBE_REFRESH_TOKEN;
  const config = await readVideoConfig(env, "youtube");
  if (!config?.encryptedRefreshToken) return "";
  return decryptSecret(env, config.encryptedRefreshToken);
}
