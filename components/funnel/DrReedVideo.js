"use client";

// Dr Reed on video. The clips are 9:16 HEVC/H.264 MP4s bundled with the app and
// copied to /public/video/dr-reed. `topAligned` pins the crop to the top of
// the frame so her head stays in shot when the box is shorter than 16:9, the
// way the phone's AVPlayerLayer does it on the sheets.
//
// Autoplay with sound is only allowed after a user gesture. Every place this
// plays is reached by a tap, so the first attempt is unmuted; if the browser
// still refuses, the clip plays muted and a "Tap for sound" pill appears.

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Volume2 } from "lucide-react";

export default function DrReedVideo({
  src,
  topAligned = false,
  // Vertical crop as a CSS object-position value. Overrides `topAligned`, for
  // the sheets where the frame has shelf above her head to trim.
  objectPosition,
  autoPlay = true,
  loop = false,
  onFinish,
  onPlayed,
  className = "",
  style,
  fill = false,
}) {
  const ref = useRef(null);
  const [needsUnmute, setNeedsUnmute] = useState(false);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;
  const playedRef = useRef(onPlayed);
  playedRef.current = onPlayed;

  useEffect(() => {
    const video = ref.current;
    if (!video || !autoPlay) return undefined;
    let cancelled = false;
    video.muted = false;
    const attempt = video.play();
    if (attempt && typeof attempt.catch === "function") {
      attempt
        .then(() => {
          if (!cancelled) playedRef.current?.();
        })
        .catch(() => {
          if (cancelled) return;
          video.muted = true;
          setNeedsUnmute(true);
          video.play().then(() => playedRef.current?.()).catch(() => {});
        });
    }
    return () => {
      cancelled = true;
      video.pause();
    };
  }, [src, autoPlay]);

  const unmute = useCallback(() => {
    const video = ref.current;
    if (!video) return;
    video.muted = false;
    video.currentTime = 0;
    video.play().catch(() => {});
    setNeedsUnmute(false);
  }, []);

  return (
    <div className={`relative overflow-hidden bg-black ${className}`} style={style}>
      <video
        ref={ref}
        src={src}
        playsInline
        preload="auto"
        loop={loop}
        onEnded={() => finishRef.current?.()}
        className={`h-full w-full ${fill ? "object-cover" : "object-cover"}`}
        style={{ objectPosition: objectPosition || (topAligned ? "50% 0%" : "50% 50%") }}
      />
      {needsUnmute ? (
        <button
          type="button"
          onClick={unmute}
          className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-white/90 px-3.5 py-2 text-[13px] font-semibold text-atelier-ink shadow-[0_6px_16px_rgba(0,0,0,0.25)]"
        >
          <Volume2 size={15} aria-hidden="true" /> Tap for sound
        </button>
      ) : null}
    </div>
  );
}
