import {
  bearerToken,
  checkIdToken,
  firebaseProjectId,
  originAllowed,
} from "./stripeSync.js";

export const OWNER_EMAIL = "ismael@ngoie.com";

/**
 * The static /video page is only a visual gate. This is the real gate used by
 * every Video Factory operation.
 */
export async function requireOwner(request, env) {
  if (!originAllowed(request, env)) {
    return { ok: false, status: 403, error: "This request did not come from pelvi.health." };
  }

  const caller = await checkIdToken(bearerToken(request), firebaseProjectId(env));
  if (!caller.ok || caller.emailVerified !== true || caller.email !== OWNER_EMAIL) {
    return { ok: false, status: 403, error: "Sign in with the Pelvi owner account." };
  }

  return { ok: true, caller };
}
