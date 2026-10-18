import { audioURL } from "./audioCatalog.js";

const CACHE = "pelvi-recorded-audio-v1";
export async function savedAudioURL(trackId) {
  if (typeof caches === "undefined") return null;
  try {
    const response = await (await caches.open(CACHE)).match(audioURL(trackId));
    return response ? URL.createObjectURL(await response.blob()) : null;
  } catch { return null; }
}

export async function saveAudioOffline(trackId) {
  if (typeof caches === "undefined") throw new Error("This browser does not support saving audio here.");
  const response = await fetch(audioURL(trackId));
  if (!response.ok) throw new Error("The recording could not download. Please try again.");
  await (await caches.open(CACHE)).put(audioURL(trackId), response);
  return savedAudioURL(trackId);
}

export async function removeSavedAudio(trackId) {
  if (typeof caches !== "undefined") await (await caches.open(CACHE)).delete(audioURL(trackId));
}
