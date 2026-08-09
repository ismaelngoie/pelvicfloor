"use client";

import { useEffect, useRef, useState } from "react";

/**
 * True when the member has asked her system to stop moving things.
 *
 * Everything on the paywall that rotates, breathes or slides checks this. The
 * content never changes, only whether it animates between states, so a member
 * with vestibular sensitivity still reads every showcase item and every review.
 */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    if (mq.addEventListener) {
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
    mq.addListener(apply);
    return () => mq.removeListener(apply);
  }, []);

  return reduced;
}

/**
 * Step an index 0..length-1 every `ms`, pausing while the tab is hidden so a
 * member coming back to the tab does not find the carousel five items along.
 */
export function useRotation(length, ms, enabled = true) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [length]);

  useEffect(() => {
    if (!enabled || length <= 1 || typeof window === "undefined") return undefined;

    let timer = null;
    const start = () => {
      if (timer) return;
      timer = window.setInterval(() => {
        setIndex((i) => (i + 1) % length);
      }, ms);
    };
    const stop = () => {
      if (!timer) return;
      window.clearInterval(timer);
      timer = null;
    };
    const onVisibility = () => (document.hidden ? stop() : start());

    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [length, ms, enabled]);

  return index;
}

/**
 * Count from `from` to `to` over `ms`, ease-out-cubic, exactly as the iOS
 * social-proof line does. Returns `to` straight away when motion is reduced, so
 * the number is never a moving target for someone who asked for stillness.
 */
export function useCountUp(from, to, ms, { enabled = true, reduced = false } = {}) {
  const [value, setValue] = useState(reduced || !enabled ? to : from);

  useEffect(() => {
    if (!enabled || reduced || typeof window === "undefined") {
      setValue(to);
      return undefined;
    }
    let raf = 0;
    const started = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - started) / ms);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [from, to, ms, enabled, reduced]);

  return value;
}

/**
 * Paint the browser chrome to match the paywall while it is on screen, and put
 * it back on the way out. Without this the Safari toolbar stays pink over a
 * near-black screen and the top of the phone looks broken.
 */
export function usePageChrome(color) {
  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    let meta = document.querySelector('meta[name="theme-color"]');
    let created = false;
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "theme-color");
      document.head.appendChild(meta);
      created = true;
    }
    const previous = meta.getAttribute("content");
    meta.setAttribute("content", color);

    const html = document.documentElement;
    const previousHtmlBg = html.style.backgroundColor;
    html.style.backgroundColor = color;

    return () => {
      if (created) meta.remove();
      else if (previous) meta.setAttribute("content", previous);
      html.style.backgroundColor = previousHtmlBg;
    };
  }, [color]);
}

/**
 * Modal plumbing: hold focus inside the sheet, close on Escape, and give focus
 * back to whatever opened it. A payment sheet you cannot tab out of is the
 * difference between a usable screen reader flow and a dead end.
 */
export function useDialogBehaviour(open, onClose) {
  const ref = useRef(null);
  const returnTo = useRef(null);

  // Held in a ref so an inline arrow from the parent cannot re-run the effect
  // on every render and yank focus back to the first field mid-typing.
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open || typeof document === "undefined") return undefined;

    returnTo.current = document.activeElement;

    const focusFirst = () => {
      const node = ref.current;
      if (!node) return;
      const target =
        node.querySelector("[data-autofocus]") ||
        node.querySelector(
          'input, select, textarea, button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
        );
      if (target && typeof target.focus === "function") target.focus();
    };
    const raf = requestAnimationFrame(focusFirst);

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        closeRef.current?.();
        return;
      }
      if (event.key !== "Tab" || !ref.current) return;
      const focusable = Array.from(
        ref.current.querySelectorAll(
          'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKeyDown, true);
      const back = returnTo.current;
      if (back && typeof back.focus === "function") back.focus();
    };
  }, [open]);

  return ref;
}
