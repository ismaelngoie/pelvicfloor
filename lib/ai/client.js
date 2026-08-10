"use client";

// The one Firebase AI Logic client the member app uses.
//
// SAME PROJECT, SAME BACKEND, SAME MODEL AS THE PHONE.
// The iOS app builds its client with
//
//     FirebaseAI.firebaseAI(backend: .agentPlatform(location: "global"))
//
// which is the Vertex AI backend at the "global" location. The JavaScript SDK
// spells the same thing `new VertexAIBackend("global")`, and it ships inside
// the `firebase` package this site already depends on. No new key, no new
// vendor, no new bill: requests go to
// firebasevertexai.googleapis.com/v1beta/projects/pelvic-floor-exercise-908ed/
// locations/global/... authenticated with the same public Firebase web config.
//
// THE SDK IS LOADED ON DEMAND. `import("firebase/ai")` inside the function,
// never at the top of the module, so the AI SDK is a separate chunk that a
// member who never opens Coach Mia and never asks a question never downloads.
// 98 percent of this traffic is a phone on mobile data; that matters.

import { getApp } from "firebase/app";
import { db } from "@/lib/firebase";

/**
 * Remote kill switch, the web half of the phone's UserDefaults key.
 * `localStorage.setItem("pelvi.miaModel", "gemini-3.5-flash")` swaps the model
 * for a browser without a deploy, exactly as `pelvi.miaModel` does on iOS.
 */
export const MODEL_OVERRIDE_KEY = "pelvi.miaModel";

/** Kept in step with CoachMiaService.defaultModelName on iOS. */
export const DEFAULT_MODEL = "gemini-3.5-flash-lite";

/**
 * A request that hangs is worse than one that fails: she is looking at a
 * spinner either way, and only one of them offers her a retry. The SDK's own
 * default is 180 seconds, which on a phone is indistinguishable from broken.
 */
export const REQUEST_TIMEOUT_MS = 45000;

export function resolvedModelName() {
  try {
    const override = window.localStorage.getItem(MODEL_OVERRIDE_KEY);
    if (typeof override === "string" && override.trim()) return override.trim();
  } catch {
    // Private mode, or storage disabled. The default is the answer.
  }
  return DEFAULT_MODEL;
}

let aiPromise = null;

/** The shared AI instance, built once per page load. */
async function aiInstance() {
  if (!aiPromise) {
    aiPromise = (async () => {
      const { getAI, VertexAIBackend } = await import("firebase/ai");
      // db() is what initialises the shared FirebaseApp with the project config
      // in lib/firebase.js. Calling it here means this module does not keep a
      // second copy of that config, and it throws the same clear error when a
      // deployment has not been given its keys.
      db();
      return getAI(getApp(), { backend: new VertexAIBackend("global") });
    })();
    // A failed init must not be cached: the next attempt, on a working
    // connection, has to be allowed to succeed.
    aiPromise.catch(() => {
      aiPromise = null;
    });
  }
  return aiPromise;
}

/**
 * A configured model, honouring the override key.
 *
 * @param {object} params
 * @param {object} params.generationConfig  temperature, caps, schema
 * @param {string} params.systemInstruction the persona or the brief
 */
export async function generativeModel({ generationConfig, systemInstruction }) {
  const [ai, { getGenerativeModel }] = await Promise.all([aiInstance(), import("firebase/ai")]);
  return getGenerativeModel(
    ai,
    {
      model: resolvedModelName(),
      generationConfig,
      ...(systemInstruction
        ? { systemInstruction: { role: "system", parts: [{ text: systemInstruction }] } }
        : {}),
    },
    { timeout: REQUEST_TIMEOUT_MS }
  );
}

/** The SDK's Schema builder, for the one place that constrains its response. */
export async function schemaBuilder() {
  const { Schema } = await import("firebase/ai");
  return Schema;
}
