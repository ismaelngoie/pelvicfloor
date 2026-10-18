"use client";

import { useEffect, useId, useRef, useState } from "react";
import { SAMPLE_VIDEO } from "./sampleVideo";
import { trackDiastasisEvent } from "@/lib/diastasisAnalytics";
import styles from "./InlineExercisePreview.module.css";

const NEARBY_PIXELS = 360;
const VISIBLE_FRACTION = 0.25;

// Used by the scroll/resize fallback when IntersectionObserver is unavailable.
export function previewVisibility(rect, width, height) {
  const overlapWidth = Math.max(0, Math.min(rect.right, width) - Math.max(rect.left, 0));
  const overlapHeight = Math.max(0, Math.min(rect.bottom, height) - Math.max(rect.top, 0));
  const area = Math.max(0, rect.width) * Math.max(0, rect.height);
  return {
    nearby: rect.bottom >= -NEARBY_PIXELS && rect.top <= height + NEARBY_PIXELS && rect.right > 0 && rect.left < width,
    visible: area > 0 && overlapWidth * overlapHeight / area >= VISIBLE_FRACTION,
  };
}

export default function InlineExercisePreview() {
  const frameRef = useRef(null);
  const videoRef = useRef(null);
  const policyRef = useRef({ visible: false, pageVisible: false, automatic: false });
  const userPausedRef = useRef(false);
  const playAttemptRef = useRef(0);
  const playPendingRef = useRef(false);
  const [sourceReady, setSourceReady] = useState(false);
  const [inView, setInView] = useState(false);
  const [pageVisible, setPageVisible] = useState(false);
  // Wait for the actual preference before attempting automatic playback.
  const [reducedMotion, setReducedMotion] = useState(true);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [mediaError, setMediaError] = useState(false);
  const titleId = useId();
  const captionId = useId();
  policyRef.current = {
    visible: inView,
    pageVisible,
    automatic: sourceReady && inView && pageVisible && !reducedMotion && !mediaError,
  };

  const pauseVideo = () => {
    playAttemptRef.current += 1;
    playPendingRef.current = false;
    videoRef.current?.pause();
  };

  const playWhenVisible = () => {
    const video = videoRef.current;
    if (!video || !policyRef.current.automatic || userPausedRef.current || playPendingRef.current || !video.paused) return;
    const attempt = ++playAttemptRef.current;
    playPendingRef.current = true;
    video.muted = true;
    try {
      Promise.resolve(video.play()).catch((error) => {
        if (attempt === playAttemptRef.current && policyRef.current.automatic && error?.name !== "AbortError") setAutoplayBlocked(true);
      }).finally(() => {
        if (attempt === playAttemptRef.current) playPendingRef.current = false;
      });
    } catch {
      playPendingRef.current = false;
      setAutoplayBlocked(true);
    }
  };

  useEffect(() => {
    const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const applyMotion = () => setReducedMotion(Boolean(query?.matches));
    const applyVisibility = () => {
      if (document.hidden) {
        policyRef.current.pageVisible = false;
        policyRef.current.automatic = false;
        pauseVideo();
      }
      setPageVisible(!document.hidden);
    };
    applyMotion(); applyVisibility();
    query?.addEventListener?.("change", applyMotion);
    if (query && !query.addEventListener) query.addListener?.(applyMotion);
    document.addEventListener("visibilitychange", applyVisibility);
    return () => {
      query?.removeEventListener?.("change", applyMotion);
      if (query && !query.removeEventListener) query.removeListener?.(applyMotion);
      document.removeEventListener("visibilitychange", applyVisibility);
    };
  }, []);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return undefined;
    if (typeof IntersectionObserver !== "undefined") {
      const nearby = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) return;
        setSourceReady(true);
        nearby.disconnect();
      }, { rootMargin: `${NEARBY_PIXELS}px 0px`, threshold: 0 });
      const visibility = new IntersectionObserver(([entry]) => {
        const visible = entry.isIntersecting && entry.intersectionRatio >= VISIBLE_FRACTION;
        if (!visible) {
          policyRef.current.visible = false;
          policyRef.current.automatic = false;
          pauseVideo();
        }
        setInView(visible);
      }, { threshold: [0, VISIBLE_FRACTION] });
      nearby.observe(frame); visibility.observe(frame);
      return () => { nearby.disconnect(); visibility.disconnect(); };
    }
    let animationFrame = null;
    const check = () => {
      animationFrame = null;
      const next = previewVisibility(frame.getBoundingClientRect(), window.innerWidth, window.innerHeight);
      if (next.nearby) setSourceReady(true);
      if (!next.visible) {
        policyRef.current.visible = false;
        policyRef.current.automatic = false;
        pauseVideo();
      }
      setInView(next.visible);
    };
    const schedule = () => { if (animationFrame == null) animationFrame = window.requestAnimationFrame(check); };
    check();
    // Capture observes scrolling inside the site's main scroll container too.
    window.addEventListener("scroll", schedule, { capture: true, passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    return () => {
      if (animationFrame != null) window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  useEffect(() => {
    if (policyRef.current.automatic) playWhenVisible();
    else pauseVideo();
    // Playback reads the current policy through refs; controls keep manual play.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceReady, inView, pageVisible, reducedMotion, mediaError]);

  useEffect(() => {
    const video = videoRef.current;
    return () => {
      policyRef.current.automatic = false;
      playAttemptRef.current += 1;
      video?.pause();
    };
  }, []);

  return (
    <section className={styles.section} aria-labelledby={titleId}>
      <div className={styles.content}>
        <span className={styles.mark} aria-hidden="true">✦</span>
        <h2 id={titleId} className={styles.heading}>Take a look inside</h2>
        <p className={styles.subtitle}>Daily coach videos. Clear steps to follow.</p>
        <figure className={styles.figure}>
          <div ref={frameRef} className={styles.frame}>
            <video
              ref={videoRef}
              className={styles.video}
              src={sourceReady ? `${SAMPLE_VIDEO.url}#t=0.1` : undefined}
              controls loop muted playsInline preload="metadata"
              aria-label={SAMPLE_VIDEO.title}
              aria-describedby={captionId}
              onCanPlay={playWhenVisible}
              onPlay={() => {
                if (!policyRef.current.visible || !policyRef.current.pageVisible) { pauseVideo(); return; }
                userPausedRef.current = false;
                trackDiastasisEvent("video_play");
                setAutoplayBlocked(false);
              }}
              onPause={() => { if (policyRef.current.automatic) userPausedRef.current = true; }}
              onError={() => { trackDiastasisEvent("video_error"); setMediaError(true); }}
            >
              Your browser cannot play this video. Use the preview link below.
            </video>
          </div>
          <figcaption id={captionId} className={styles.caption}>Video preview</figcaption>
        </figure>
        {(reducedMotion || autoplayBlocked) && !mediaError && <p className={styles.note}>Press play when you’re ready.</p>}
        {mediaError && <p role="status" className={styles.note}>This browser could not load the preview. <a href={SAMPLE_VIDEO.url} target="_blank" rel="noopener noreferrer">Open the video preview</a>.</p>}
      </div>
    </section>
  );
}
