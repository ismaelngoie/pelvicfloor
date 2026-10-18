// This is the same Firebase project as the shipped apps. Only the production
// web sign-in helper origin changes; local and preview sites keep their
// existing provider redirect configuration.
export const FIREBASE_AUTH_PROJECT = "pelvic-floor-exercise-908ed";
export const FIREBASE_DEFAULT_AUTH_DOMAIN = `${FIREBASE_AUTH_PROJECT}.firebaseapp.com`;
export const PELVI_AUTH_DOMAIN = "pelvi.health";

export function resolveFirebaseAuthDomain({ hostname = "", projectId = FIREBASE_AUTH_PROJECT, configuredDomain = "" } = {}) {
  const domain = typeof configuredDomain === "string" ? configuredDomain.trim().toLowerCase() : "";
  const projectDomain = `${projectId}.firebaseapp.com`;
  const production = [PELVI_AUTH_DOMAIN, `www.${PELVI_AUTH_DOMAIN}`].includes(String(hostname).toLowerCase());
  // Activate only after Google and Apple permit the new callback URL. Shipping
  // the proxy alone must never switch a working production login prematurely.
  if (projectId === FIREBASE_AUTH_PROJECT && production && domain === PELVI_AUTH_DOMAIN) return PELVI_AUTH_DOMAIN;
  // A production build can also be opened on localhost or a Pages preview.
  // Neither should start a redirect through the production auth domain.
  if (domain === PELVI_AUTH_DOMAIN) return projectDomain;
  return domain || projectDomain;
}
