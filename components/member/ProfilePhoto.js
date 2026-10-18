"use client";

import { useRef, useState } from "react";
import { User } from "lucide-react";

export default function ProfilePhoto({ member, patchMember, size = 100 }) {
  const input = useRef(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const src = member?.imageUrl || member?.profileImageUrl;
  async function choose(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Choose a photo from your library."); return; }
    setSaving(true); setError("");
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; image.src = url; });
      const canvas = document.createElement("canvas"); canvas.width = 320; canvas.height = 320;
      const context = canvas.getContext("2d");
      const side = Math.min(image.naturalWidth, image.naturalHeight);
      context.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side, 0, 0, 320, 320);
      // Small enough for the member document; signed-in browsers share the same
      // imageUrl field. No public upload or third-party photo service is needed.
      await patchMember({ imageUrl: canvas.toDataURL("image/jpeg", 0.8) });
    } catch { setError("Your photo could not be saved. Please try again."); }
    finally { URL.revokeObjectURL(url); setSaving(false); if (input.current) input.current.value = ""; }
  }
  return <div className="text-center"><input ref={input} type="file" accept="image/*" onChange={(event) => choose(event.target.files?.[0])} className="hidden" aria-label="Choose profile photo" /><button type="button" disabled={saving} onClick={() => input.current?.click()} aria-label="Profile photo" title="Opens the photo picker" className="relative inline-grid place-items-center overflow-hidden rounded-full border-4 border-white bg-atelier-card text-atelier-ink3 shadow-md" style={{ width: size, height: size }}>{src ? <img src={src} alt="Your profile" className="h-full w-full object-cover" /> : <User className="h-1/3 w-1/3 fill-current" aria-hidden="true" />}{saving && <span className="absolute inset-0 grid place-items-center bg-white/80 text-xs">Saving…</span>}</button>{error && <p role="alert" className="mt-2 max-w-xs text-xs text-atelier-rosewood">{error}</p>}</div>;
}
