"use client";

// The app offer. One sheet, one tap out of it, never seen again.
//
// She has paid. That is the whole context, and it changes what this screen is
// allowed to be. It is not a pitch, it has no benefit list, no star rating, no
// screenshots and no second reason: the owner's line was "if they have paid
// that means they are convinced". So there is exactly one sentence here, and it
// is the one that answers the only question a person who just paid actually
// has, which is whether starting again on the phone means starting again.
//
// It is also opened, never auto-presented. The screen underneath is the 90-day
// guarantee she just bought, and sliding a sheet over that two seconds after it
// appears would take away the moment this whole page exists to give her.
//
// The App Store link comes from lib/appStore.js so the campaign tokens cannot
// drift from the Smart App Banner's; see the notes in that file for how Apple
// reports them.
//
// NOTHING RENDERS THIS TODAY. canOfferApp() in lib/appPrompt.js is held closed
// by APP_HANDOFF_READY, because the shipped iPhone app cannot yet unlock from a
// web purchase and the sentence below would therefore be a promise it cannot
// keep. Read that constant's comment before touching a word of this file: the
// copy here is written to be true the day the handoff lands, not today.

import { useCallback, useEffect, useId, useRef } from "react";
import { ArrowUpRight, X } from "lucide-react";

import { appStoreURL } from "@/lib/appStore";
import { OFFER_CLOSED, closeAppOffer } from "@/lib/appPrompt";
import { trackAppOffer } from "@/lib/analytics";

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose      called after the offer has been closed
 * @param {string} [props.surface]        campaign surface, see lib/appStore.js
 */
export default function AppInstallSheet({ open, onClose, surface = "success" }) {
  const titleId = useId();
  const panelRef = useRef(null);
  // Where focus came from, so it can be given back. Without this, closing the
  // sheet drops focus on <body> and a keyboard or switch-control user is
  // returned to the top of the document instead of to the button she pressed.
  const returnFocusRef = useRef(null);

  const finish = useCallback(
    (reason) => {
      closeAppOffer(reason);
      trackAppOffer(reason === OFFER_CLOSED.openedStore ? "opened" : "not_now");
      onClose?.();
    },
    [onClose]
  );

  /**
   * She tapped through to Apple.
   *
   * The preference and the event are recorded now, synchronously, because
   * neither touches the DOM. Closing the sheet is deferred by a tick on
   * purpose: onClose unmounts this dialog, and tearing the anchor out of the
   * document inside its own click handler is how a browser ends up cancelling
   * the navigation it was about to perform. One task later the App Store is
   * already opening and the DOM is ours to change again.
   */
  const openStore = useCallback(() => {
    closeAppOffer(OFFER_CLOSED.openedStore);
    trackAppOffer("opened");
    setTimeout(() => onClose?.(), 0);
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;
    trackAppOffer("offered");
    returnFocusRef.current =
      typeof document !== "undefined" ? document.activeElement : null;
    // Focus the panel itself rather than the button. Landing on "Get the app"
    // means a screen reader announces the action before the sentence that
    // explains it, and it puts a return key one keystroke away from Apple.
    panelRef.current?.focus({ preventScroll: true });
    return () => {
      const back = returnFocusRef.current;
      if (back && typeof back.focus === "function") back.focus({ preventScroll: true });
    };
  }, [open]);

  // Escape closes, and Tab is kept inside. Three focusable elements, so the
  // trap is a pair of edge checks rather than a library.
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        finish(OFFER_CLOSED.notNow);
        return;
      }
      if (event.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const stops = panel.querySelectorAll("a[href], button:not([disabled])");
      if (!stops.length) return;
      const first = stops[0];
      const last = stops[stops.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, finish]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 backdrop-blur-sm tab:items-center"
      // mousedown, not click: a drag that starts inside the panel and ends on
      // the backdrop fires click on the backdrop, and closing on that reads as
      // the sheet dismissing itself.
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) finish(OFFER_CLOSED.notNow);
      }}
    >
      {/* motion-safe on the entrance, so the sheet simply is where it is for
          anyone who has asked their phone to stop animating things. */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="max-h-[92dvh] w-full max-w-[440px] overflow-y-auto overscroll-contain rounded-t-[28px] bg-app-surface px-6 pb-[calc(env(safe-area-inset-bottom)+22px)] pt-7 shadow-[0_-8px_40px_rgba(0,0,0,0.35)] outline-none motion-safe:animate-slide-up tab:rounded-[28px] tab:pb-7"
      >
        <div className="flex items-center gap-4">
          {/* The real app icon, at the size the App Store shows it. It is the
              one piece of "proof this is the right app" that costs nothing. */}
          <img
            src="/icon-192.png"
            alt=""
            aria-hidden="true"
            width={60}
            height={60}
            className="h-[60px] w-[60px] shrink-0 rounded-[14px] shadow-[0_2px_10px_rgba(0,0,0,0.14)]"
          />
          <div className="min-w-0">
            <h2
              id={titleId}
              className="text-[20px] font-extrabold leading-tight tracking-[-0.3px] text-app-textPrimary"
            >
              Get Pelvi on your iPhone
            </h2>
            <p className="mt-0.5 text-[13px] font-medium text-app-textSecondary">
              Free to download. Nothing more to pay.
            </p>
          </div>
        </div>

        {/* One sentence. It removes the only real objection, which is having to
            start over, and names the one thing the browser genuinely cannot do. */}
        <p className="mt-5 text-[15px] leading-relaxed text-app-textSecondary">
          Sign in with the same email and your plan, your day count and your
          streak are all there. Daily reminders only work in the app.
        </p>

        <a
          href={appStoreURL(surface)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={openStore}
          className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-cta-gradient text-[17px] font-bold text-white shadow-[0_6px_16px_rgba(230,84,115,0.35)] transition-transform active:scale-[0.98]"
        >
          Get the app
          <ArrowUpRight size={19} aria-hidden="true" />
        </a>

        <button
          type="button"
          onClick={() => finish(OFFER_CLOSED.notNow)}
          className="mt-2 flex h-12 w-full items-center justify-center gap-1.5 rounded-full text-[15px] font-semibold text-app-textSecondary"
        >
          <X size={15} aria-hidden="true" />
          Not now
        </button>
      </div>
    </div>
  );
}
