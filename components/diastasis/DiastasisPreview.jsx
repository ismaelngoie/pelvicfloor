"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { exerciseGuidance } from "@/lib/exercisePrescription";
import styles from "./DiastasisPreview.module.css";

// The complete MP4 from public/content/video_catalog.json and the existing
// Perfect Your Form course. Keep its catalog title and URL together.
const SAMPLE = {
  id: "perfect-your-form-heel-slides",
  title: "Heel Slides",
  tags: ["form"],
  url: "https://firebasestorage.googleapis.com/v0/b/pelvic-floor-exercise-908ed.appspot.com/o/Perfect%20Your%20Form%2FHeel%20Slides.mp4?alt=media&token=ab50368d-9cd9-418b-86d7-01c1cde98a90",
};
const GUIDANCE = exerciseGuidance(SAMPLE, { goalId: "diastasisRecti" });
const FOCUSABLE = "button:not([disabled]), a[href], video[controls], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

function focusableElements(dialog) {
  return [...dialog.querySelectorAll(FOCUSABLE)].filter((element) => element.getClientRects().length > 0);
}

function guardPageScroll(trigger) {
  const elements = new Set([document.documentElement, document.body]);
  // The site scrolls inside <main>; also preserve a route's own scroll host.
  for (let element = trigger instanceof Element ? trigger : null; element; element = element.parentElement) {
    if (/(auto|scroll)/.test(window.getComputedStyle(element).overflowY)) elements.add(element);
  }
  document.querySelectorAll("main").forEach((element) => elements.add(element));
  const previous = [...elements].map((element) => ({
    element,
    value: element.style.getPropertyValue("overflow-y"),
    priority: element.style.getPropertyPriority("overflow-y"),
  }));
  previous.forEach(({ element }) => element.style.setProperty("overflow-y", "hidden"));
  return () => previous.forEach(({ element, value, priority }) => {
    if (value) element.style.setProperty("overflow-y", value, priority);
    else element.style.removeProperty("overflow-y");
  });
}

export default function DiastasisPreview({ open = false, onClose }) {
  const [mounted, setMounted] = useState(false);
  const [mediaError, setMediaError] = useState(false);
  const dialogRef = useRef(null);
  const videoRef = useRef(null);
  const closeRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open || !mounted) return undefined;
    const dialog = dialogRef.current;
    const video = videoRef.current;
    const previousFocus = document.activeElement;
    const restoreScroll = guardPageScroll(previousFocus);
    setMediaError(false);

    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    closeRef.current?.focus({ preventScroll: true });

    const containFocus = (event) => {
      if (!dialog.contains(event.target)) closeRef.current?.focus({ preventScroll: true });
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current?.();
        return;
      }
      if (event.key !== "Tab") return;
      const elements = focusableElements(dialog);
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (!first) { event.preventDefault(); dialog.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener("focusin", containFocus);
    dialog.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("focusin", containFocus);
      dialog.removeEventListener("keydown", onKeyDown);
      video?.pause();
      if (dialog.open && typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
      restoreScroll();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [open, mounted]);

  if (!open || !mounted) return null;

  return createPortal(
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      role="dialog"
      tabIndex={-1}
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => { event.preventDefault(); onCloseRef.current?.(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onCloseRef.current?.(); }}
    >
      <div className={styles.panel}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>A look inside your plan</p>
            <h2 id={titleId} className={styles.title}>{SAMPLE.title}</h2>
          </div>
          <button ref={closeRef} type="button" onClick={() => onCloseRef.current?.()} className={styles.close} aria-label="Close exercise preview">
            <span aria-hidden="true">×</span>
          </button>
        </header>
        <p id={descriptionId} className={styles.description}>Exercise demonstration. Follow your own plan and clinician advice.</p>

        <video ref={videoRef} className={styles.video} controls playsInline preload="none" aria-label="Heel Slides exercise demonstration" onError={() => setMediaError(true)}>
          <source src={SAMPLE.url} type="video/mp4" onError={() => setMediaError(true)} />
          Your browser cannot play this video. Use the link below to open the demonstration.
        </video>
        {mediaError && <p role="status" className={styles.error}>This browser could not load the video. You can try opening the demonstration directly.</p>}
        <a href={SAMPLE.url} target="_blank" rel="noopener noreferrer" className={styles.directLink}>Open the full demonstration in a new tab</a>

        <section className={styles.guidance} aria-label="Written exercise guidance">
          <h3>Guidance from the plan</h3>
          <p>{GUIDANCE.feel}</p>
          <p>{GUIDANCE.breathe}</p>
          <p>{GUIDANCE.avoid}</p>
          <p className={styles.easier}><strong>Make it easier:</strong> {GUIDANCE.easier}</p>
        </section>
      </div>
    </dialog>,
    document.body
  );
}
