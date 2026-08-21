import {
  researchPrompt,
  reviewPrompt,
  VIDEO_BLUEPRINT_SCHEMA,
  VIDEO_REVIEW_SCHEMA,
  VIDEO_SOURCE_DOMAINS,
  heyGenPrompt,
  thumbnailPrompt,
  youtubeDescription,
} from "./videoFactory.js";

const OPENAI_API = "https://api.openai.com/v1";
const HEYGEN_API = "https://api.heygen.com";

function openAIHeaders(env) {
  return { Authorization: `Bearer ${env.OPENAI_API_KEY}`, "Content-Type": "application/json" };
}

async function openAIRequest(env, path, init = {}) {
  const response = await fetch(`${OPENAI_API}${path}`, {
    ...init,
    headers: { ...openAIHeaders(env), ...(init.headers || {}) },
  });
  if (!response.ok) {
    const body = await response.text();
    console.error("Video Factory OpenAI request failed", { path, status: response.status, body: body.slice(0, 500) });
    throw new Error(`Research provider failed: ${response.status}`);
  }
  return response.json();
}

function responseBody({ prompt, schema, name, model, background = true }) {
  return {
    model,
    ...(String(model).startsWith("gpt-5") ? { reasoning: { effort: "high" } } : {}),
    background,
    store: true,
    tools: [{ type: "web_search", filters: { allowed_domains: VIDEO_SOURCE_DOMAINS } }],
    include: ["web_search_call.action.sources"],
    input: prompt,
    text: {
      format: {
        type: "json_schema",
        name,
        strict: true,
        schema,
      },
    },
  };
}

export async function startResearch(env, title) {
  return openAIRequest(env, "/responses", {
    method: "POST",
    body: JSON.stringify(responseBody({
      prompt: researchPrompt(title),
      schema: VIDEO_BLUEPRINT_SCHEMA,
      name: "pelvi_video_blueprint",
      model: env.VIDEO_FACTORY_OPENAI_MODEL || "gpt-5.6-sol",
    })),
  });
}

export async function startClaimReview(env, draft) {
  return openAIRequest(env, "/responses", {
    method: "POST",
    body: JSON.stringify(responseBody({
      prompt: reviewPrompt(draft),
      schema: VIDEO_REVIEW_SCHEMA,
      name: "pelvi_video_medical_review",
      model: env.VIDEO_FACTORY_REVIEW_MODEL || env.VIDEO_FACTORY_OPENAI_MODEL || "gpt-5.6-sol",
    })),
  });
}

export async function readOpenAIResponse(env, id) {
  if (!/^resp_[a-zA-Z0-9_-]+$/.test(String(id || ""))) throw new Error("Research job ID is invalid.");
  return openAIRequest(
    env,
    `/responses/${encodeURIComponent(id)}?include=${encodeURIComponent("web_search_call.action.sources")}`,
    { method: "GET" },
  );
}

function heyGenHeaders(env) {
  return { "X-Api-Key": env.HEYGEN_API_KEY, "Content-Type": "application/json" };
}

export async function startHeyGenRender(env, blueprint) {
  const body = {
    prompt: heyGenPrompt(blueprint),
    mode: "generate",
    orientation: "landscape",
  };
  if (env.HEYGEN_AVATAR_ID) body.avatar_id = env.HEYGEN_AVATAR_ID;
  if (env.HEYGEN_VOICE_ID) body.voice_id = env.HEYGEN_VOICE_ID;
  if (env.HEYGEN_STYLE_ID) body.style_id = env.HEYGEN_STYLE_ID;
  if (env.HEYGEN_BRAND_KIT_ID) body.brand_kit_id = env.HEYGEN_BRAND_KIT_ID;

  const response = await fetch(`${HEYGEN_API}/v3/video-agents`, {
    method: "POST",
    headers: heyGenHeaders(env),
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text();
    console.error("Video Factory HeyGen create failed", { status: response.status, body: text.slice(0, 500) });
    throw new Error(`Video renderer failed to start: ${response.status}`);
  }
  const payload = await response.json();
  const data = payload?.data || payload;
  const videoId = data?.video_id || data?.videoId;
  const sessionId = data?.session_id || data?.sessionId || "";
  if (!sessionId) throw new Error("Video renderer returned no session ID.");
  return { videoId: videoId || "", sessionId };
}

export async function readHeyGenSession(env, sessionId) {
  if (!sessionId) throw new Error("Video renderer session ID is missing.");
  const response = await fetch(`${HEYGEN_API}/v3/video-agents/${encodeURIComponent(sessionId)}`, {
    headers: heyGenHeaders(env),
  });
  if (!response.ok) throw new Error(`Video renderer session failed: ${response.status}`);
  const payload = await response.json();
  const data = payload?.data || payload;
  return {
    videoId: data?.video_id || data?.videoId || "",
    status: String(data?.status || payload?.status || "processing").toLowerCase(),
    progress: Math.max(0, Math.min(100, Number(data?.progress) || 0)),
    error: data?.failure_message || data?.failureMessage || data?.failure_code || data?.failureCode || data?.error?.message || data?.error || "",
  };
}

export async function readHeyGenRender(env, videoId) {
  const response = await fetch(`${HEYGEN_API}/v3/videos/${encodeURIComponent(videoId)}`, {
    headers: heyGenHeaders(env),
  });
  if (!response.ok) throw new Error(`Video renderer status failed: ${response.status}`);
  const payload = await response.json();
  const data = payload?.data || payload;
  const captionedVideoUrl = data?.captioned_video_url || data?.captionedVideoUrl || "";
  return {
    status: String(data?.status || "processing").toLowerCase(),
    videoUrl: captionedVideoUrl || data?.video_url || data?.videoUrl || "",
    captionedVideoUrl,
    subtitleUrl: data?.subtitle_url || data?.subtitleUrl || "",
    thumbnailUrl: data?.thumbnail_url || data?.thumbnailUrl || "",
    durationSeconds: Number(data?.duration || data?.duration_seconds) || 0,
    error: data?.failure_message || data?.failureMessage || data?.failure_code || data?.failureCode || data?.error?.message || data?.error || "",
  };
}

export async function readRenderedSubtitle(subtitleUrl) {
  if (!/^https:\/\//i.test(String(subtitleUrl || ""))) throw new Error("The renderer returned no valid subtitle file.");
  const response = await fetch(subtitleUrl);
  if (!response.ok) throw new Error(`The rendered subtitle file could not be read: ${response.status}`);
  const contentLength = Number(response.headers.get("Content-Length"));
  if (Number.isFinite(contentLength) && contentLength > 1024 * 1024) throw new Error("The rendered subtitle file is unexpectedly large.");
  const text = await response.text();
  if (!text.trim() || text.length > 1024 * 1024) throw new Error("The rendered subtitle file is empty or invalid.");
  return text;
}

export async function generateThumbnail(env, blueprint) {
  if ((env.VIDEO_FACTORY_IMAGE_PROVIDER || "gemini") === "gemini") {
    return generateGeminiThumbnail(env, blueprint);
  }
  const response = await openAIRequest(env, "/images/generations", {
    method: "POST",
    body: JSON.stringify({
      model: env.VIDEO_FACTORY_IMAGE_MODEL || "gpt-image-2",
      prompt: thumbnailPrompt(blueprint),
      size: "1280x720",
      quality: "high",
      output_format: "jpeg",
      output_compression: 70,
      background: "opaque",
      n: 1,
    }),
  });
  const item = response?.data?.[0];
  if (item?.url) return { url: item.url, revisedPrompt: item.revised_prompt || "" };
  if (item?.b64_json) {
    ensureYoutubeThumbnailBytes(base64ByteLength(item.b64_json));
    return { dataUrl: `data:image/jpeg;base64,${item.b64_json}`, revisedPrompt: item.revised_prompt || "" };
  }
  throw new Error("Thumbnail provider returned no image.");
}

async function generateGeminiThumbnail(env, blueprint) {
  if (!env.GEMINI_API_KEY) throw new Error("Google Gemini image generation is not configured yet.");
  const model = env.VIDEO_FACTORY_IMAGE_MODEL || "gemini-3-pro-image";
  const imageSize = model === "gemini-3.1-flash-lite-image" ? "1K" : "2K";
  let generated = await requestGeminiThumbnail(env, model, blueprint, imageSize);
  if (generated.byteLength > 2 * 1024 * 1024 && imageSize !== "1K") {
    generated = await requestGeminiThumbnail(env, model, blueprint, "1K");
  }
  ensureYoutubeThumbnailBytes(generated.byteLength);
  return { dataUrl: `data:${generated.mime};base64,${generated.data}`, revisedPrompt: "" };
}

async function requestGeminiThumbnail(env, model, blueprint, imageSize) {
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: { "x-goog-api-key": env.GEMINI_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      input: [{ type: "text", text: thumbnailPrompt(blueprint) }],
      response_format: {
        type: "image",
        mime_type: "image/jpeg",
        aspect_ratio: "16:9",
        image_size: imageSize,
      },
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    console.error("Video Factory Gemini image request failed", { status: response.status, body: text.slice(0, 500) });
    throw new Error(`Thumbnail provider failed: ${response.status}`);
  }
  const payload = await response.json();
  const image = payload?.output_image || payload?.outputImage || findGeminiImage(payload);
  const data = image?.data || image?.inline_data?.data || image?.inlineData?.data;
  if (!data) throw new Error("Nano Banana returned no thumbnail image.");
  const mime = image?.mime_type || image?.mimeType || "image/jpeg";
  if (mime !== "image/jpeg") throw new Error("Nano Banana returned a non-JPEG thumbnail.");
  return { data, mime, byteLength: base64ByteLength(data) };
}

function findGeminiImage(payload) {
  const queue = [payload];
  while (queue.length) {
    const value = queue.shift();
    if (!value || typeof value !== "object") continue;
    if ((value.type === "image" || value.inline_data || value.inlineData) && (value.data || value.inline_data?.data || value.inlineData?.data)) return value;
    for (const child of Object.values(value)) {
      if (child && typeof child === "object") queue.push(child);
    }
  }
  return null;
}

export function youtubeAuthorizationUrl(env, state, redirectUri) {
  const params = new URLSearchParams({
    client_id: env.YOUTUBE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/youtube.upload",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeYoutubeCode(env, code, redirectUri) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.YOUTUBE_CLIENT_ID,
      client_secret: env.YOUTUBE_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }).toString(),
  });
  if (!response.ok) throw new Error(`YouTube connection failed: ${response.status}`);
  const payload = await response.json();
  if (!payload.refresh_token) throw new Error("YouTube returned no refresh token. Revoke access and connect again.");
  return payload;
}

export async function refreshYoutubeAccess(env, refreshToken) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.YOUTUBE_CLIENT_ID,
      client_secret: env.YOUTUBE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }).toString(),
  });
  if (!response.ok) throw new Error(`YouTube token refresh failed: ${response.status}`);
  const payload = await response.json();
  if (!payload.access_token) throw new Error("YouTube returned no access token.");
  return payload.access_token;
}

function youtubeVideoMetadata(blueprint, publishAt) {
  let scheduled = null;
  if (publishAt) {
    const timestamp = new Date(publishAt).getTime();
    if (!Number.isFinite(timestamp) || timestamp < Date.now() + 5 * 60 * 1000) {
      throw new Error("Choose a YouTube publish time at least five minutes in the future.");
    }
    scheduled = new Date(timestamp).toISOString();
  }
  return {
    snippet: {
      title: blueprint.youtube.title,
      description: youtubeDescription(blueprint),
      tags: blueprint.youtube.tags,
      categoryId: "27",
      defaultLanguage: "en",
    },
    status: {
      privacyStatus: "private",
      selfDeclaredMadeForKids: false,
      containsSyntheticMedia: true,
      ...(scheduled ? { publishAt: scheduled } : {}),
    },
  };
}

export async function startPrivateYoutubeUploadSession({ accessToken, blueprint, publishAt, totalBytes }) {
  if (!Number.isInteger(totalBytes) || totalBytes < 1) throw new Error("The archived video size is unavailable.");
  const start = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": "video/mp4",
      "X-Upload-Content-Length": String(totalBytes),
    },
    body: JSON.stringify(youtubeVideoMetadata(blueprint, publishAt)),
  });
  if (!start.ok) throw new Error(`YouTube upload could not start: ${start.status}`);
  const location = start.headers.get("Location");
  if (!location) throw new Error("YouTube returned no resumable upload URL.");
  return location;
}

export async function inspectPrivateYoutubeUpload({ accessToken, uploadUrl, totalBytes }) {
  if (!/^https:\/\//i.test(String(uploadUrl || ""))) throw new Error("The YouTube upload session is invalid.");
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Length": "0",
      "Content-Range": `bytes */${totalBytes}`,
    },
  });
  if (response.status === 200 || response.status === 201) return completedYoutubeUpload(response);
  if (response.status === 404 || response.status === 410) return { expired: true, complete: false, nextByte: 0 };
  if (response.status !== 308) throw new Error(`YouTube upload status failed: ${response.status}`);
  return { expired: false, complete: false, nextByte: nextYoutubeByte(response.headers.get("Range")) };
}

export async function continuePrivateYoutubeUpload({ accessToken, uploadUrl, videoResponse, totalBytes, startByte = 0 }) {
  if (!videoResponse?.ok || !videoResponse.body) throw new Error("The archived video could not be read for YouTube.");
  const remaining = totalBytes - startByte;
  if (!Number.isInteger(remaining) || remaining < 1) throw new Error("The YouTube upload range is invalid.");
  const sourceLength = Number(videoResponse.headers.get("Content-Length"));
  if (Number.isFinite(sourceLength) && sourceLength !== remaining) {
    throw new Error("The archived video range does not match YouTube's saved offset.");
  }
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "video/mp4",
    "Content-Range": `bytes ${startByte}-${totalBytes - 1}/${totalBytes}`,
  };
  let body = videoResponse.body;
  if (typeof globalThis.FixedLengthStream === "function") {
    const fixed = new globalThis.FixedLengthStream(remaining);
    videoResponse.body.pipeTo(fixed.writable).catch(() => {});
    body = fixed.readable;
  } else {
    // Node's fetch honors this in the focused contract tests. Cloudflare
    // derives the same header from FixedLengthStream in production.
    headers["Content-Length"] = String(remaining);
  }
  const uploaded = await fetch(uploadUrl, {
    method: "PUT",
    headers,
    body,
  });
  if (uploaded.status === 200 || uploaded.status === 201) return completedYoutubeUpload(uploaded);
  if (uploaded.status === 308) {
    return { complete: false, expired: false, nextByte: nextYoutubeByte(uploaded.headers.get("Range")) };
  }
  if (uploaded.status === 404 || uploaded.status === 410) return { complete: false, expired: true, nextByte: 0 };
  throw new Error(`YouTube video upload failed: ${uploaded.status}`);
}

export async function uploadPrivateYoutubeVideo({ accessToken, project, blueprint, publishAt, videoResponse = null }) {
  const source = videoResponse?.ok ? videoResponse : await fetch(project.videoUrl);
  if (!source.ok || !source.body) throw new Error("The rendered video could not be downloaded for YouTube.");
  const totalBytes = Number(source.headers.get("Content-Length"));
  if (!Number.isInteger(totalBytes) || totalBytes < 1) throw new Error("The rendered video size is unavailable.");
  const uploadUrl = await startPrivateYoutubeUploadSession({ accessToken, blueprint, publishAt, totalBytes });
  const result = await continuePrivateYoutubeUpload({ accessToken, uploadUrl, videoResponse: source, totalBytes, startByte: 0 });
  if (!result.complete) throw new Error("YouTube did not finish the resumable upload.");
  return result;
}

async function completedYoutubeUpload(response) {
  const payload = await response.json().catch(() => null);
  if (!payload?.id) throw new Error("YouTube returned no video ID.");
  return { complete: true, expired: false, id: payload.id, url: `https://www.youtube.com/watch?v=${payload.id}` };
}

function nextYoutubeByte(range) {
  const match = /bytes=\d+-(\d+)/i.exec(String(range || ""));
  return match ? Number(match[1]) + 1 : 0;
}

export async function uploadYoutubeThumbnail({ accessToken, videoId, thumbnailUrl, thumbnailResponse }) {
  if (!thumbnailUrl && !thumbnailResponse) return false;
  const source = thumbnailResponse || (thumbnailUrl.startsWith("data:image/")
    ? dataUrlResponse(thumbnailUrl)
    : await fetch(thumbnailUrl));
  if (!source.ok) throw new Error("The generated thumbnail could not be read for YouTube.");
  const contentType = String(source.headers.get("Content-Type") || "image/jpeg").split(";")[0].toLowerCase();
  if (!["image/jpeg", "image/png", "application/octet-stream"].includes(contentType)) {
    throw new Error("The generated thumbnail has an unsupported YouTube media type.");
  }
  const bytes = new Uint8Array(await source.arrayBuffer());
  ensureYoutubeThumbnailBytes(bytes.byteLength);
  const response = await fetch(`https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${encodeURIComponent(videoId)}&uploadType=media`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": contentType,
    },
    body: bytes,
  });
  if (!response.ok) throw new Error(`YouTube thumbnail upload failed: ${response.status}`);
  return true;
}

function ensureYoutubeThumbnailBytes(byteLength) {
  if (!Number.isFinite(byteLength) || byteLength < 1) throw new Error("The generated thumbnail is empty.");
  if (byteLength > 2 * 1024 * 1024) throw new Error("The generated thumbnail exceeds YouTube's 2 MB upload limit.");
}

function base64ByteLength(value) {
  const text = String(value || "").replace(/\s+/g, "");
  if (!text) return 0;
  const padding = text.endsWith("==") ? 2 : text.endsWith("=") ? 1 : 0;
  return Math.floor((text.length * 3) / 4) - padding;
}

function dataUrlResponse(value) {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([a-zA-Z0-9+/=]+)$/.exec(value || "");
  if (!match) return new Response(null, { status: 400 });
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Response(bytes, { headers: { "Content-Type": match[1] } });
}

async function encryptionBytes(env) {
  const raw = String(env.VIDEO_FACTORY_ENCRYPTION_KEY || "").trim();
  if (raw) {
    let bytes;
    try {
      const binary = atob(raw.replace(/-/g, "+").replace(/_/g, "/"));
      bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    } catch {
      bytes = new TextEncoder().encode(raw);
    }
    if (bytes.length !== 32) throw new Error("Video Factory encryption key must be exactly 32 bytes.");
    return bytes;
  }
  const serviceAccount = typeof env.FIREBASE_SERVICE_ACCOUNT === "string"
    ? env.FIREBASE_SERVICE_ACCOUNT
    : JSON.stringify(env.FIREBASE_SERVICE_ACCOUNT || {});
  if (!serviceAccount) throw new Error("Firebase service account is required to protect provider keys.");
  const material = new TextEncoder().encode(`pelvi-video-factory-v1|${serviceAccount}`);
  return new Uint8Array(await crypto.subtle.digest("SHA-256", material));
}

function encode64(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decode64(value) {
  const padded = String(value).replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

export async function encryptSecret(env, value) {
  const key = await crypto.subtle.importKey("raw", await encryptionBytes(env), "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(value));
  return `${encode64(iv)}.${encode64(new Uint8Array(encrypted))}`;
}

export async function decryptSecret(env, value) {
  const [ivRaw, dataRaw] = String(value || "").split(".");
  if (!ivRaw || !dataRaw) throw new Error("Stored YouTube connection is invalid.");
  const key = await crypto.subtle.importKey("raw", await encryptionBytes(env), "AES-GCM", false, ["decrypt"]);
  const clear = await crypto.subtle.decrypt({ name: "AES-GCM", iv: decode64(ivRaw) }, key, decode64(dataRaw));
  return new TextDecoder().decode(clear);
}

export async function signOAuthState(env, payload) {
  const secret = await oauthStateBytes(env);
  const encoded = encode64(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await crypto.subtle.importKey("raw", secret, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(encoded));
  return `${encoded}.${encode64(new Uint8Array(signature))}`;
}

export async function verifyOAuthState(env, state) {
  const [encoded, signature] = String(state || "").split(".");
  if (!encoded || !signature) return null;
  let secret;
  try { secret = await oauthStateBytes(env); } catch { return null; }
  const key = await crypto.subtle.importKey("raw", secret, { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("HMAC", key, decode64(signature), new TextEncoder().encode(encoded));
  if (!ok) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(decode64(encoded)));
    if (!payload?.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

async function oauthStateBytes(env) {
  const configured = String(env.VIDEO_FACTORY_OAUTH_STATE_SECRET || "");
  if (configured.length >= 24) return new TextEncoder().encode(configured);
  const base = await encryptionBytes(env);
  const suffix = new TextEncoder().encode("|youtube-oauth-v1");
  const material = new Uint8Array(base.length + suffix.length);
  material.set(base, 0);
  material.set(suffix, base.length);
  return new Uint8Array(await crypto.subtle.digest("SHA-256", material));
}
