import {
  accessToken,
  firebaseProjectId,
  parseServiceAccount,
} from "./stripeSync.js";

const COLLECTION = "videoFactoryProjects";
const CONFIG_COLLECTION = "videoFactoryConfig";
const STORAGE_SCOPE = "https://www.googleapis.com/auth/devstorage.read_write";

function firestoreRoot(projectId) {
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)`;
}

function toField(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  return { stringValue: String(value) };
}

function fromField(field) {
  if (!field || typeof field !== "object") return null;
  if (Object.prototype.hasOwnProperty.call(field, "stringValue")) return field.stringValue;
  if (Object.prototype.hasOwnProperty.call(field, "integerValue")) return Number(field.integerValue);
  if (Object.prototype.hasOwnProperty.call(field, "doubleValue")) return Number(field.doubleValue);
  if (Object.prototype.hasOwnProperty.call(field, "booleanValue")) return field.booleanValue;
  if (Object.prototype.hasOwnProperty.call(field, "nullValue")) return null;
  return null;
}

function decodeDocument(document) {
  if (!document?.name) return null;
  const id = document.name.split("/").pop();
  const result = { id, _updateTime: document.updateTime || "" };
  for (const [key, field] of Object.entries(document.fields || {})) result[key] = fromField(field);
  return result;
}

async function patchVideoProject(env, id, patch, updateTime = "") {
  const { projectId, token } = await credentials(env);
  const fields = {};
  const masks = [];
  for (const [key, value] of Object.entries(patch || {})) {
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(key)) continue;
    fields[key] = toField(value);
    masks.push(`updateMask.fieldPaths=${encodeURIComponent(key)}`);
  }
  if (!masks.length) return readVideoProject(env, id);
  const precondition = updateTime ? `&currentDocument.updateTime=${encodeURIComponent(updateTime)}` : "";
  const url = `${firestoreRoot(projectId)}/documents/${COLLECTION}/${encodeURIComponent(id)}?${masks.join("&")}${precondition}`;
  const response = await fetch(url, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields }),
  });
  if (!response.ok) {
    const error = new Error(`Video project write failed: ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return decodeDocument(await response.json());
}

async function credentials(env) {
  if (!env.FIREBASE_SERVICE_ACCOUNT) throw new Error("Firebase service account is not configured.");
  const account = parseServiceAccount(env.FIREBASE_SERVICE_ACCOUNT);
  return {
    projectId: account.project_id || firebaseProjectId(env),
    token: await accessToken(account),
  };
}

async function storageCredentials(env) {
  if (!env.FIREBASE_SERVICE_ACCOUNT) throw new Error("Firebase service account is not configured.");
  const account = parseServiceAccount(env.FIREBASE_SERVICE_ACCOUNT);
  return {
    bucket: env.VIDEO_FACTORY_BUCKET || "pelvic-floor-exercise-908ed.appspot.com",
    token: await accessToken(account, STORAGE_SCOPE),
  };
}

export async function readVideoProject(env, id) {
  const { projectId, token } = await credentials(env);
  const response = await fetch(`${firestoreRoot(projectId)}/documents/${COLLECTION}/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Video project read failed: ${response.status}`);
  return decodeDocument(await response.json());
}

export async function writeVideoProject(env, id, patch) {
  return patchVideoProject(env, id, patch);
}

export async function acquireVideoProjectLease(env, id, operation, ttlMs = 3 * 60 * 1000) {
  const current = await readVideoProject(env, id);
  if (!current) throw new Error("Video project was not found.");
  const now = Date.now();
  const currentExpiry = new Date(current.operationLeaseExpiresAt || 0).getTime();
  if (current.operationLeaseToken && Number.isFinite(currentExpiry) && currentExpiry > now) {
    return { acquired: false, project: current, token: "" };
  }
  const token = crypto.randomUUID();
  try {
    const project = await patchVideoProject(env, id, {
      operationLeaseToken: token,
      operationLeaseName: String(operation || "operation").slice(0, 80),
      operationLeaseExpiresAt: new Date(now + Math.max(30_000, Math.min(30 * 60 * 1000, ttlMs))).toISOString(),
    }, current._updateTime);
    return { acquired: true, project, token };
  } catch (error) {
    if (![400, 409, 412].includes(error?.status)) throw error;
    return { acquired: false, project: await readVideoProject(env, id), token: "" };
  }
}

export async function releaseVideoProjectLease(env, id, token) {
  if (!token) return;
  const current = await readVideoProject(env, id);
  if (!current || current.operationLeaseToken !== token) return;
  try {
    await patchVideoProject(env, id, {
      operationLeaseToken: "",
      operationLeaseName: "",
      operationLeaseExpiresAt: "",
    }, current._updateTime);
  } catch (error) {
    if (![400, 409, 412].includes(error?.status)) throw error;
  }
}

export async function listVideoProjects(env, limit = 40) {
  const { projectId, token } = await credentials(env);
  const response = await fetch(`${firestoreRoot(projectId)}/documents:runQuery`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: COLLECTION }],
        orderBy: [{ field: { fieldPath: "createdAt" }, direction: "DESCENDING" }],
        limit: Math.max(1, Math.min(100, Number(limit) || 40)),
      },
    }),
  });
  if (!response.ok) throw new Error(`Video project list failed: ${response.status}`);
  const rows = await response.json();
  return rows.map((row) => decodeDocument(row.document)).filter(Boolean);
}

export async function readVideoConfig(env, id = "youtube") {
  const { projectId, token } = await credentials(env);
  const response = await fetch(`${firestoreRoot(projectId)}/documents/${CONFIG_COLLECTION}/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Video config read failed: ${response.status}`);
  return decodeDocument(await response.json());
}

export async function writeVideoConfig(env, id, patch) {
  const { projectId, token } = await credentials(env);
  const fields = {};
  const masks = [];
  for (const [key, value] of Object.entries(patch || {})) {
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(key)) continue;
    fields[key] = toField(value);
    masks.push(`updateMask.fieldPaths=${encodeURIComponent(key)}`);
  }
  const response = await fetch(`${firestoreRoot(projectId)}/documents/${CONFIG_COLLECTION}/${encodeURIComponent(id)}?${masks.join("&")}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields }),
  });
  if (!response.ok) throw new Error(`Video config write failed: ${response.status}`);
  return decodeDocument(await response.json());
}

export async function uploadVideoAsset(env, objectName, source) {
  if (!/^video-factory\/[a-zA-Z0-9_/-]{10,220}\.(png|jpg|jpeg|webp|vtt|srt|json|mp4)$/.test(objectName)) {
    throw new Error("Video asset path is invalid.");
  }
  const asset = await sourceResponse(source);
  if (!asset.ok || !asset.body) throw new Error("Generated video asset could not be read.");
  const contentType = String(asset.headers.get("Content-Type") || "").toLowerCase();
  if (objectName.endsWith(".mp4") && !contentType.startsWith("video/") && contentType !== "application/octet-stream") {
    throw new Error("Rendered video has an invalid media type.");
  }
  if (/\.(png|jpg|jpeg|webp)$/.test(objectName) && !contentType.startsWith("image/")) throw new Error("Generated image has an invalid media type.");
  if (/\.(vtt|srt)$/.test(objectName) && !contentType.startsWith("text/") && !["application/x-subrip", "application/octet-stream"].includes(contentType)) {
    throw new Error("Rendered captions have an invalid media type.");
  }
  const contentLength = Number(asset.headers.get("Content-Length"));
  if (Number.isFinite(contentLength) && contentLength > 500 * 1024 * 1024) throw new Error("Generated asset is too large.");
  const { bucket, token } = await storageCredentials(env);
  const url = `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(bucket)}/o?uploadType=media&name=${encodeURIComponent(objectName)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": contentType || "application/octet-stream",
    },
    body: asset.body,
  });
  if (!response.ok) throw new Error(`Video asset upload failed: ${response.status}`);
  return objectName;
}

export async function readVideoAsset(env, objectName, { startByte = 0 } = {}) {
  if (!/^video-factory\/[a-zA-Z0-9_/-]{10,220}\.(png|jpg|jpeg|webp|vtt|srt|json|mp4)$/.test(String(objectName || ""))) {
    return new Response(null, { status: 404 });
  }
  const { bucket, token } = await storageCredentials(env);
  const headers = { Authorization: `Bearer ${token}` };
  if (Number.isInteger(startByte) && startByte > 0) headers.Range = `bytes=${startByte}-`;
  return fetch(`https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(objectName)}?alt=media`, {
    headers,
  });
}

async function sourceResponse(source) {
  if (typeof source !== "string") return new Response(null, { status: 400 });
  const match = /^data:([a-zA-Z0-9/+.-]+);base64,([a-zA-Z0-9+/=]+)$/.exec(source);
  if (!match) return fetch(source);
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Response(bytes, { headers: { "Content-Type": match[1] } });
}
