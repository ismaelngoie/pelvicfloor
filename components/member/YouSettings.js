"use client";

// Reminders, ported from
// "Pelvic Floor/Scene/Main/Hub/Notification/NotificationSettingsView.swift".
//
// The phone's screen has four sections: Daily Routine, Extra Nudges, Pelvi on
// your Lock Screen, and Voice & Taps. Exactly one of them is a thing a browser
// can honestly offer, and the honest thing to do with the other three is to say
// where they live rather than draw three switches that do nothing.
//
//   Daily Routine / Extra Nudges  A daily reminder means waking a device up at
//     7pm whether or not a tab is open. That needs a scheduled push, which needs
//     a push server and a subscription per browser; this site is a static export
//     with neither. A switch here would be a promise nothing keeps.
//   Lock Screen                   Live Activities are an iOS API. There is no
//     web equivalent, not a partial one.
//   Voice & Taps                  Real, and already wired: the guided session on
//     this site speaks through the Web Speech API and reads the same
//     localStorage key this screen writes ("pelvi.session.voice"), so turning it
//     off here turns it off in Urge Rescue and Audio Kegels. Gentle taps use
//     navigator.vibrate, which Android honours and iOS Safari does not implement
//     at all — so it is described as what it is rather than offered as a switch
//     that half the members would find dead.

import { useEffect, useState } from "react";
import { Bell, Smartphone, Vibrate, Volume2 } from "lucide-react";
import { Sheet } from "./ui";

/** The key GuidedSession.js reads. Same name, same "1" / "0". */
const VOICE_KEY = "pelvi.session.voice";

export default function YouSettings({ open, onClose }) {
  const [voiceOn, setVoiceOn] = useState(true);

  // Read after mount, never during render: this page is prerendered on a build
  // machine with no localStorage, and deciding anything from it during the
  // first client render is a hydration mismatch.
  useEffect(() => {
    if (!open) return;
    try {
      const stored = window.localStorage.getItem(VOICE_KEY);
      if (stored != null) setVoiceOn(stored === "1");
    } catch {
      // Storage blocked. The default is on, which is what the session assumes.
    }
  }, [open]);

  const setVoice = (next) => {
    setVoiceOn(next);
    try {
      window.localStorage.setItem(VOICE_KEY, next ? "1" : "0");
    } catch {
      // Nothing to persist to. The session still respects the default.
    }
    if (!next) {
      try { window.speechSynthesis?.cancel(); } catch { /* nothing to cancel */ }
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Reminders">
      <div className="pb-6">
        <Section icon={Volume2} tint="#FF2D55" title="Voice & Taps">
          <p className="text-[13.5px] leading-snug text-app-textSecondary">
            Urge Rescue and Audio Kegels are built to work with your eyes closed.
          </p>
          <Toggle
            label="Spoken cues"
            hint="A calm voice counts every hold and release."
            on={voiceOn}
            onChange={setVoice}
          />
          <div className="mt-3 flex items-start gap-3 border-t border-black/[0.06] pt-3">
            <Vibrate className="mt-0.5 h-4 w-4 shrink-0 text-app-textSecondary" aria-hidden="true" />
            <p className="text-[12.5px] leading-snug text-app-textSecondary">
              Gentle taps follow your device. Android phones buzz along with the
              session here; iPhones only do it in the Pelvi app, because Safari
              has no way to.
            </p>
          </div>
        </Section>

        <Section icon={Bell} tint="#E65473" title="Daily reminders">
          <p className="text-[13.5px] leading-snug text-app-textSecondary">
            A reminder has to arrive when this tab is closed, and a browser cannot
            promise that. Daily nudges, streak cheers and the warning before you
            lose a streak are set up in the Pelvi app on your iPhone, and they keep
            working whether or not you ever open this page.
          </p>
        </Section>

        <Section icon={Smartphone} tint="#8E93A6" title="Pelvi on your Lock Screen">
          <p className="text-[13.5px] leading-snug text-app-textSecondary">
            The card that keeps your day, your streak and today's 5 minutes on the
            Lock Screen is a Live Activity. That is an iPhone feature with no web
            equivalent, so it lives in the app.
          </p>
        </Section>
      </div>
    </Sheet>
  );
}

function Section({ icon: Icon, tint, title, children }) {
  return (
    <section className="mt-4 rounded-[20px] border border-black/[0.06] bg-white p-4 first:mt-0">
      <div className="flex items-center gap-2.5">
        <Icon className="h-5 w-5" style={{ color: tint }} aria-hidden="true" />
        <h3 className="text-[16px] font-bold text-app-textPrimary">{title}</h3>
      </div>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function Toggle({ label, hint, on, onChange }) {
  return (
    <div className="mt-3 flex items-center gap-3">
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium text-app-textPrimary">{label}</span>
        <span className="block text-[12.5px] leading-snug text-app-textSecondary">{hint}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => onChange(!on)}
        className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors ${
          on ? "bg-app-positive" : "bg-app-borderIdle"
        }`}
      >
        <span
          className={`absolute top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow transition-all ${
            on ? "left-[22px]" : "left-[2px]"
          }`}
        />
      </button>
    </div>
  );
}
