import {
  encryptSecret,
  exchangeYoutubeCode,
  verifyOAuthState,
} from "../../functions-lib/videoFactoryProviders.js";
import { writeVideoConfig } from "../../functions-lib/videoFactoryStore.js";
import { resolvedProviderEnv } from "../../functions-lib/videoFactorySettings.js";

export async function onRequestGet({ request, env }) {
  const providers = await resolvedProviderEnv(env);
  const url = new URL(request.url);
  const state = await verifyOAuthState(providers, url.searchParams.get("state"));
  const safeReturn = state?.returnTo && sameOrigin(state.returnTo, url.origin)
    ? state.returnTo
    : `${url.origin}/video/`;
  if (!state) return redirect(`${url.origin}/video/?youtube=invalid_state`);
  if (url.searchParams.get("error")) return redirect(`${safeReturn}?youtube=denied`);
  const code = url.searchParams.get("code");
  if (!code) return redirect(`${safeReturn}?youtube=missing_code`);

  try {
    const redirectUri = `${url.origin}/api/video-factory-youtube`;
    const token = await exchangeYoutubeCode(providers, code, redirectUri);
    const encryptedRefreshToken = await encryptSecret(providers, token.refresh_token);
    await writeVideoConfig(providers, "youtube", {
      encryptedRefreshToken,
      connectedAt: new Date().toISOString(),
      scope: token.scope || "youtube.upload",
    });
    return redirect(`${safeReturn}?youtube=connected`);
  } catch (error) {
    console.error("Video Factory YouTube callback failed", { message: error?.message || "unknown" });
    return redirect(`${safeReturn}?youtube=failed`);
  }
}

function sameOrigin(value, origin) {
  try { return new URL(value).origin === origin; } catch { return false; }
}

function redirect(location) {
  return new Response(null, {
    status: 302,
    headers: {
      Location: location,
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
