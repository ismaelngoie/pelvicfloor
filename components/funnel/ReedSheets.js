"use client";

// The three sheets that rise over the paywall (and the welcome screen):
//   CredentialsSheet  Dr Reed's video on top, her written credentials below
//                     (ClinicalReviewerUI).
//   RecoverySheet     the "Still thinking about it?" sheet after a cancelled
//                     checkout (PurchaseCancellationRecoveryView).
//   DayOneSheet       the Day 1 briefing behind the exercise card
//                     (DayOneBriefingSheet).

import React from "react";
import { BadgeCheck } from "lucide-react";
import { DR_REED, PAYWALL } from "./revealCopy";
import { track } from "@/lib/analytics";
import { useDialogBehaviour } from "./paywallHooks";
import SFIcon from "./icons";
import { Button } from "./atelier";
import DrReedVideo from "./DrReedVideo";

function Sheet({ open, onClose, label, children, tall = false }) {
  const ref = useDialogBehaviour(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center tab:items-center" role="presentation">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/45" />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={`relative z-10 flex w-full max-w-[30rem] flex-col overflow-hidden rounded-t-[28px] bg-atelier-paper font-figtree text-atelier-ink shadow-[0_-20px_60px_rgba(0,0,0,0.35)] tab:rounded-[28px] ${
          tall ? "max-h-[92dvh]" : "max-h-[88dvh]"
        }`}
      >
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain no-scrollbar">{children}</div>
      </div>
    </div>
  );
}

export function CredentialsSheet({ open, onClose }) {
  const c = DR_REED.sheet;
  return (
    <Sheet open={open} onClose={onClose} label={`${c.name}, credentials`} tall>
      <DrReedVideo
        src={DR_REED.credentials}
        topAligned
        onPlayed={() => track("reviewer_video_played")}
        className="w-full"
        style={{ aspectRatio: "9 / 10", maxHeight: 380 }}
      />
      <div className="px-6 pb-[max(env(safe-area-inset-bottom),20px)] pt-5">
        <h2 className="font-serif text-[30px] leading-[1.05] text-atelier-ink">{c.name}</h2>
        <p className="mt-1 text-[12px] font-semibold uppercase tracking-[0.14em] text-atelier-rose">{c.letters}</p>
        <p className="mt-3 whitespace-pre-line text-[15px] leading-snug text-atelier-ink2">{c.role}</p>
        <p className="mt-4 font-serif text-[19px] italic leading-snug text-atelier-ink">{c.quote}</p>
        <ul className="mt-4 space-y-2.5">
          {c.facts.map(([icon, text]) => (
            <li key={text} className="flex items-center gap-3 text-[14.5px] font-medium text-atelier-ink">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-atelier-rose/[0.12] text-atelier-rose">
                <SFIcon name={icon} size={16} strokeWidth={2} />
              </span>
              {text}
            </li>
          ))}
        </ul>
        <Button onClick={onClose} variant="ink" className="mt-6">
          {c.done}
        </Button>
      </div>
    </Sheet>
  );
}

export function RecoverySheet({ open, onClose, onContinue }) {
  const r = PAYWALL.recovery;
  return (
    <Sheet open={open} onClose={onClose} label={r.title} tall>
      <DrReedVideo
        src={DR_REED.recovery}
        topAligned
        onPlayed={() => track("recovery_video_played")}
        className="w-full"
        style={{ height: 340 }}
      />
      <div className="px-6 pb-[max(env(safe-area-inset-bottom),20px)] pt-5">
        <h2 className="font-serif text-[30px] leading-[1.05] text-atelier-ink">{r.title}</h2>
        <p className="mt-3 text-[15.5px] leading-snug text-atelier-ink2">{r.body}</p>
        <Button onClick={onContinue} variant="roseBright" className="mt-6 gap-2">
          <BadgeCheck aria-hidden="true" size={18} /> {r.cta}
        </Button>
        <Button onClick={onClose} variant="quiet" className="mt-1 h-12">
          {r.dismiss}
        </Button>
      </div>
    </Sheet>
  );
}

export function DayOneSheet({ open, onClose, sessionTitle, ctaTitle, onStart, image }) {
  const d = PAYWALL.dayOne;
  return (
    <Sheet open={open} onClose={onClose} label={d.eyebrow}>
      <div className="relative h-[220px] w-full overflow-hidden bg-atelier-ink">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="" className="h-full w-full object-cover opacity-90" />
        <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold tracking-[0.12em] text-atelier-ink">
          {d.minutes}
        </span>
      </div>
      <div className="px-6 pb-[max(env(safe-area-inset-bottom),20px)] pt-5">
        <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-atelier-rose">{d.eyebrow}</p>
        <h2 className="mt-2 font-serif text-[30px] leading-[1.05] text-atelier-ink">{sessionTitle}</h2>
        <p className="mt-3 text-[15.5px] leading-snug text-atelier-ink2">{d.body}</p>
        <Button onClick={onStart} variant="roseBright" className="mt-6">
          {ctaTitle}
        </Button>
        <Button onClick={onClose} variant="quiet" className="mt-1 h-12">
          {d.dismiss}
        </Button>
      </div>
    </Sheet>
  );
}
