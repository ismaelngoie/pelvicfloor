import {
  accessToken,
  firebaseProjectId,
  parseServiceAccount,
  patchDocument,
  typedValue,
} from "./stripeSync.js";

const MAX_CONVERSATIONS = 500;
const MAX_MESSAGES_PER_CONVERSATION = 120;

function firestoreRoot(projectId) {
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)`;
}

function fromField(field) {
  if (!field || typeof field !== "object") return null;
  if (Object.prototype.hasOwnProperty.call(field, "stringValue")) return field.stringValue;
  if (Object.prototype.hasOwnProperty.call(field, "timestampValue")) return field.timestampValue;
  if (Object.prototype.hasOwnProperty.call(field, "integerValue")) return Number(field.integerValue);
  if (Object.prototype.hasOwnProperty.call(field, "doubleValue")) return Number(field.doubleValue);
  if (Object.prototype.hasOwnProperty.call(field, "booleanValue")) return field.booleanValue;
  if (Object.prototype.hasOwnProperty.call(field, "nullValue")) return null;
  return null;
}

function validDate(value, fallback = "") {
  const timestamp = new Date(value || fallback || 0).getTime();
  return Number.isFinite(timestamp) && timestamp > 0 ? new Date(timestamp).toISOString() : "";
}

function decodeSegment(value) {
  try { return decodeURIComponent(value); } catch { return value; }
}

export function decodeCoachDocument(document) {
  if (!document?.name) return null;
  const match = document.name.match(/\/documents\/users\/([^/]+)\/chat\/([^/]+)$/);
  if (!match) return null;
  const fields = {};
  for (const [key, field] of Object.entries(document.fields || {})) fields[key] = fromField(field);
  const text = typeof fields.text === "string" ? fields.text.trim() : "";
  if (!text) return null;
  return {
    id: decodeSegment(match[2]),
    memberId: decodeSegment(match[1]),
    role: fields.role === "user" ? "user" : "mia",
    source: typeof fields.source === "string" ? fields.source : "",
    text,
    date: validDate(fields.date, document.updateTime),
  };
}

function messageTime(message) {
  const value = new Date(message?.date || message?.latestAt || 0).getTime();
  return Number.isFinite(value) ? value : 0;
}

export function groupCoachConversations(messages, { truncated = false } = {}) {
  const grouped = new Map();
  for (const message of messages || []) {
    if (!message?.memberId || !message?.text) continue;
    const rows = grouped.get(message.memberId) || [];
    rows.push(message);
    grouped.set(message.memberId, rows);
  }
  const conversations = [...grouped.entries()].map(([memberId, rows]) => {
    rows.sort((left, right) => messageTime(left) - messageTime(right) || left.id.localeCompare(right.id));
    const latest = rows[rows.length - 1];
    let unansweredCount = 0;
    for (let index = rows.length - 1; index >= 0 && rows[index].role === "user"; index -= 1) unansweredCount += 1;
    const lastMember = [...rows].reverse().find((row) => row.role === "user");
    const lastMia = [...rows].reverse().find((row) => row.role === "mia");
    return {
      memberId,
      latestAt: latest?.date || "",
      latestText: latest?.text || "",
      latestRole: latest?.role || "",
      needsReply: latest?.role === "user",
      unansweredCount,
      lastMemberAt: lastMember?.date || "",
      lastMiaAt: lastMia?.date || "",
      messages: rows.slice(-MAX_MESSAGES_PER_CONVERSATION),
    };
  });
  conversations.sort((left, right) => {
    if (left.needsReply !== right.needsReply) return left.needsReply ? -1 : 1;
    return messageTime(right) - messageTime(left);
  });
  const limited = conversations.slice(0, MAX_CONVERSATIONS);
  return {
    conversations: limited,
    summary: {
      conversations: limited.length,
      needsReply: limited.filter((row) => row.needsReply).length,
      unansweredMessages: limited.reduce((sum, row) => sum + row.unansweredCount, 0),
      truncated: truncated || conversations.length > MAX_CONVERSATIONS,
    },
  };
}

async function credentials(env) {
  if (!env.FIREBASE_SERVICE_ACCOUNT) throw new Error("Firebase service account is not configured.");
  const account = parseServiceAccount(env.FIREBASE_SERVICE_ACCOUNT);
  return {
    projectId: account.project_id || firebaseProjectId(env),
    token: await accessToken(account),
  };
}

export async function listCoachConversations(env, limit = 4000) {
  const maximum = Math.max(100, Math.min(5000, Math.round(Number(limit) || 4000)));
  const { projectId, token } = await credentials(env);
  // Deliberately do not order by `date`: Firestore orderBy silently excludes
  // documents missing that field. Support must never hide a customer's
  // question. The complete bounded set is sorted after decoding instead.
  const response = await fetch(`${firestoreRoot(projectId)}/documents:runQuery`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "chat", allDescendants: true }],
        limit: maximum,
      },
    }),
  });
  if (!response.ok) throw new Error(`Coach inbox query failed: ${response.status}`);
  const rows = await response.json();
  const documents = Array.isArray(rows) ? rows.map((row) => row.document).filter(Boolean) : [];
  const messages = documents.map(decodeCoachDocument).filter(Boolean);
  return groupCoachConversations(messages, { truncated: documents.length >= maximum });
}

function validMemberId(value) {
  const id = typeof value === "string" ? value.trim() : "";
  return id && id.length <= 512 && !id.includes("/") && id !== "." && id !== ".." ? id : "";
}

function validRequestId(value) {
  const raw = typeof value === "string" ? value.trim() : "";
  return /^[a-zA-Z0-9_-]{8,100}$/.test(raw) ? raw : crypto.randomUUID();
}

export async function writeCoachReply(env, { memberId, text, requestId }) {
  const safeMemberId = validMemberId(memberId);
  if (!safeMemberId) throw new Error("Choose a valid member conversation.");
  const body = typeof text === "string" ? text.trim() : "";
  if (!body) throw new Error("Type a reply first.");
  if (body.length > 2000) throw new Error("Keep the reply under 2000 characters.");
  const { projectId, token } = await credentials(env);
  const id = `mia_${validRequestId(requestId)}`;
  const now = new Date().toISOString();
  const fields = {
    role: typedValue("mia"),
    source: typedValue("admin"),
    text: typedValue(body),
    date: { timestampValue: now },
  };
  await patchDocument({
    projectId,
    token,
    path: `users/${encodeURIComponent(safeMemberId)}/chat/${encodeURIComponent(id)}`,
    fields,
    updateMask: Object.keys(fields),
  });
  return { id, memberId: safeMemberId, role: "mia", source: "admin", text: body, date: now };
}
