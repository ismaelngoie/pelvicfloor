import { requireOwner } from "../../functions-lib/ownerAuth.js";
import { safeProjectId } from "../../functions-lib/videoFactory.js";
import { readVideoAsset, readVideoProject } from "../../functions-lib/videoFactoryStore.js";

export async function onRequestGet({ request, env }) {
  const owner = await requireOwner(request, env);
  if (!owner.ok) return new Response(owner.error, { status: owner.status });
  const url = new URL(request.url);
  const id = safeProjectId(url.searchParams.get("projectId"));
  const kind = url.searchParams.get("kind");
  if (!id || !["thumbnail", "video"].includes(kind)) return new Response("Not found", { status: 404 });
  const project = await readVideoProject(env, id);
  const objectName = kind === "video" ? project?.videoObject : project?.thumbnailObject;
  if (!objectName) return new Response("Not found", { status: 404 });
  const asset = await readVideoAsset(env, objectName);
  if (!asset.ok || !asset.body) return new Response("Not found", { status: 404 });
  return new Response(asset.body, {
    status: 200,
    headers: {
      "Content-Type": asset.headers.get("Content-Type") || (kind === "video" ? "video/mp4" : "image/png"),
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
