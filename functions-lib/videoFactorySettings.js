import { decryptSecret, encryptSecret } from "./videoFactoryProviders.js";
import { readVideoConfig, writeVideoConfig } from "./videoFactoryStore.js";

const SETTINGS_ID = "providers";
const SECRET_FIELDS = new Set([
  "openaiApiKey",
  "geminiApiKey",
  "heygenApiKey",
  "youtubeClientSecret",
]);
const TEXT_FIELDS = new Set([
  ...SECRET_FIELDS,
  "researchModel",
  "reviewModel",
  "imageProvider",
  "imageModel",
  "heygenAvatarId",
  "heygenVoiceId",
  "heygenStyleId",
  "heygenBrandKitId",
  "youtubeClientId",
]);

const DEFAULTS = {
  researchModel: "gpt-5.6-sol",
  reviewModel: "gpt-5.6-sol",
  imageProvider: "gemini",
  imageModel: "gemini-3-pro-image",
};

export async function readProviderSettings(env) {
  let stored = {};
  try {
    const config = await readVideoConfig(env, SETTINGS_ID);
    if (config?.encryptedSettings) stored = JSON.parse(await decryptSecret(env, config.encryptedSettings));
  } catch (error) {
    console.error("Video Factory provider settings could not be read", { message: error?.message || "unknown" });
  }
  return stored;
}

export async function saveProviderSettings(env, input) {
  const current = await readProviderSettings(env);
  const next = { ...DEFAULTS, ...current };
  for (const field of TEXT_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(input || {}, field)) continue;
    const value = typeof input[field] === "string" ? input[field].trim() : "";
    if (SECRET_FIELDS.has(field) && /^•{4,}/.test(value)) continue;
    if (value.length > 5000) throw new Error(`${field} is too long.`);
    next[field] = value;
  }
  if (!["gemini", "openai"].includes(next.imageProvider)) next.imageProvider = DEFAULTS.imageProvider;
  if (!/^[a-zA-Z0-9._-]{2,100}$/.test(next.researchModel)) next.researchModel = DEFAULTS.researchModel;
  if (!/^[a-zA-Z0-9._-]{2,100}$/.test(next.reviewModel)) next.reviewModel = next.researchModel;
  const imageModelValid = /^[a-zA-Z0-9._-]{2,100}$/.test(next.imageModel);
  const imageModelMatchesProvider = next.imageProvider === "gemini"
    ? String(next.imageModel || "").startsWith("gemini-")
    : String(next.imageModel || "").startsWith("gpt-image-");
  if (!imageModelValid || !imageModelMatchesProvider) {
    next.imageModel = next.imageProvider === "gemini" ? "gemini-3-pro-image" : "gpt-image-2";
  }
  const encryptedSettings = await encryptSecret(env, JSON.stringify(next));
  await writeVideoConfig(env, SETTINGS_ID, {
    encryptedSettings,
    updatedAt: new Date().toISOString(),
  });
  return next;
}

export async function resolvedProviderEnv(env) {
  const stored = await readProviderSettings(env);
  return providerEnvWithSettings(env, stored);
}

export function providerEnvWithSettings(env, stored = {}) {
  const imageProvider = stored.imageProvider || env.VIDEO_FACTORY_IMAGE_PROVIDER || DEFAULTS.imageProvider;
  const defaultImageModel = imageProvider === "openai" ? "gpt-image-2" : DEFAULTS.imageModel;
  const requestedImageModel = stored.imageModel || env.VIDEO_FACTORY_IMAGE_MODEL || defaultImageModel;
  const imageModel = imageProvider === "openai"
    ? (String(requestedImageModel).startsWith("gpt-image-") ? requestedImageModel : "gpt-image-2")
    : (String(requestedImageModel).startsWith("gemini-") ? requestedImageModel : DEFAULTS.imageModel);
  return Object.assign(Object.create(env || null), {
    OPENAI_API_KEY: stored.openaiApiKey || env.OPENAI_API_KEY || "",
    VIDEO_FACTORY_OPENAI_MODEL: stored.researchModel || env.VIDEO_FACTORY_OPENAI_MODEL || DEFAULTS.researchModel,
    VIDEO_FACTORY_REVIEW_MODEL: stored.reviewModel || env.VIDEO_FACTORY_REVIEW_MODEL || stored.researchModel || env.VIDEO_FACTORY_OPENAI_MODEL || DEFAULTS.reviewModel,
    VIDEO_FACTORY_IMAGE_PROVIDER: imageProvider,
    VIDEO_FACTORY_IMAGE_MODEL: imageModel,
    GEMINI_API_KEY: stored.geminiApiKey || env.GEMINI_API_KEY || env.GOOGLE_AI_API_KEY || "",
    HEYGEN_API_KEY: stored.heygenApiKey || env.HEYGEN_API_KEY || "",
    HEYGEN_AVATAR_ID: stored.heygenAvatarId || env.HEYGEN_AVATAR_ID || "",
    HEYGEN_VOICE_ID: stored.heygenVoiceId || env.HEYGEN_VOICE_ID || "",
    HEYGEN_STYLE_ID: stored.heygenStyleId || env.HEYGEN_STYLE_ID || "",
    HEYGEN_BRAND_KIT_ID: stored.heygenBrandKitId || env.HEYGEN_BRAND_KIT_ID || "",
    YOUTUBE_CLIENT_ID: stored.youtubeClientId || env.YOUTUBE_CLIENT_ID || "",
    YOUTUBE_CLIENT_SECRET: stored.youtubeClientSecret || env.YOUTUBE_CLIENT_SECRET || "",
  });
}

export function publicEffectiveProviderSettings(env) {
  return publicProviderSettings({
    openaiApiKey: env.OPENAI_API_KEY,
    geminiApiKey: env.GEMINI_API_KEY,
    heygenApiKey: env.HEYGEN_API_KEY,
    youtubeClientSecret: env.YOUTUBE_CLIENT_SECRET,
    researchModel: env.VIDEO_FACTORY_OPENAI_MODEL,
    reviewModel: env.VIDEO_FACTORY_REVIEW_MODEL,
    imageProvider: env.VIDEO_FACTORY_IMAGE_PROVIDER,
    imageModel: env.VIDEO_FACTORY_IMAGE_MODEL,
    heygenAvatarId: env.HEYGEN_AVATAR_ID,
    heygenVoiceId: env.HEYGEN_VOICE_ID,
    heygenStyleId: env.HEYGEN_STYLE_ID,
    heygenBrandKitId: env.HEYGEN_BRAND_KIT_ID,
    youtubeClientId: env.YOUTUBE_CLIENT_ID,
  });
}

export function publicProviderSettings(settings) {
  return {
    openaiApiKey: masked(settings.openaiApiKey),
    geminiApiKey: masked(settings.geminiApiKey),
    heygenApiKey: masked(settings.heygenApiKey),
    youtubeClientSecret: masked(settings.youtubeClientSecret),
    researchModel: settings.researchModel || DEFAULTS.researchModel,
    reviewModel: settings.reviewModel || settings.researchModel || DEFAULTS.reviewModel,
    imageProvider: settings.imageProvider || DEFAULTS.imageProvider,
    imageModel: settings.imageModel || DEFAULTS.imageModel,
    heygenAvatarId: settings.heygenAvatarId || "",
    heygenVoiceId: settings.heygenVoiceId || "",
    heygenStyleId: settings.heygenStyleId || "",
    heygenBrandKitId: settings.heygenBrandKitId || "",
    youtubeClientId: settings.youtubeClientId || "",
  };
}

function masked(value) {
  const text = String(value || "");
  if (!text) return "";
  return `••••••••${text.slice(-4)}`;
}
