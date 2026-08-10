"use client";

// Asked once, right after the plan finishes building and before she sees it.
//
// The position is the whole trick. "Your plan is ready. Where should we send
// it?" is only true at this exact moment, and asking here means the timeline
// runs straight into the paywall with nothing interrupting it.
//
// Skipping is genuinely free, and the line under the skip button says so. An
// email extracted by making someone feel they will lose their plan is an email
// that bounces on the first send.

import React, { useEffect, useRef, useState } from "react";
import { Shield, X } from "lucide-react";
import { EMAIL_CTA, EMAIL_PLACEHOLDER, EMAIL_SKIP, EMAIL_SUBTITLE, emailTitle } from "./copy";
import {
  EMAIL_CHECKLIST, EMAIL_SHIELD_LINE, EMAIL_SKIP_REASSURANCE,
} from "@/lib/guaranteeCopy";
import { isEmailValid } from "./funnelState";
import { BackButton, PrimaryButton, useKeyboardInset } from "./ui";

export default function EmailCaptureScreen({ profile, onSubmit, onSkip, onBack, busy = false }) {
  const inputRef = useRef(null);
  const keyboardInset = useKeyboardInset();
  const [email, setEmail] = useState(profile.email || "");
  const [focused, setFocused] = useState(false);
  const valid = isEmailValid(email);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 240);
    return () => clearTimeout(timer);
  }, []);

  const submit = () => {
    if (!valid || busy) return;
    onSubmit(email.trim());
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-white font-system">
      <div className="shrink-0 px-5 pt-[max(env(safe-area-inset-top),14px)] tab:pt-4">
        <div className="flex h-11 items-center">
          <BackButton onClick={onBack} />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain no-scrollbar px-7 pb-4">
        <h1 className="pt-4 text-center text-[26px] font-medium leading-[1.04] tracking-[-0.4px] text-app-textPrimary sm:text-[30px]">
          {emailTitle(profile.name)}
        </h1>
        <p className="mx-auto mt-2 max-w-[22rem] text-center text-[14px] leading-snug text-app-textSecondary sm:text-[15px]">
          {EMAIL_SUBTITLE}
        </p>

        <div className="mt-8 rounded-[22px] border border-app-borderIdle bg-app-background p-5">
          <ul className="space-y-3">
            {EMAIL_CHECKLIST.map((line) => (
              <li
                key={line}
                className="flex items-start gap-2 text-[14px] font-medium leading-snug text-app-textPrimary sm:text-[15px]"
              >
                <span aria-hidden="true" className="text-app-primaryInk">
                  ✓
                </span>
                <span>{line.replace(/^✓\s*/, "")}</span>
              </li>
            ))}
          </ul>
          <div className="my-4 h-px w-full bg-black/10" />
          {/* primaryInk, not primary: #E65473 at 12px on #FAF9FA is 3.40:1.
              The glyph keeps the brand pink, because an icon beside legible
              text is not what has to carry the meaning. */}
          <p className="flex items-start gap-2 text-[12px] font-medium leading-snug text-app-primaryInk sm:text-[13px]">
            <Shield aria-hidden="true" size={14} strokeWidth={2.2} className="mt-[1px] shrink-0 text-app-primary" />
            <span>{EMAIL_SHIELD_LINE}</span>
          </p>
        </div>

        <div className="mt-10">
          <div className="relative">
            <input
              ref={inputRef}
              type="email"
              inputMode="email"
              // Never recorded. Clarity masks input values by default; the
              // attribute pins it, so that a later change to the project's
              // masking mode cannot start capturing addresses from the one
              // screen whose whole job is to collect one. Analytics learns
              // "given" or "skipped" and nothing else. See lib/analytics.js.
              data-clarity-mask="true"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              placeholder={EMAIL_PLACEHOLDER}
              aria-label="Your email address"
              autoComplete="email"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="send"
              className="w-full bg-transparent px-9 pb-3 text-center text-[18px] font-medium text-app-textPrimary caret-app-primary outline-none placeholder:text-app-textSecondary/50 sm:text-[20px]"
            />
            {email ? (
              <button
                type="button"
                onClick={() => {
                  setEmail("");
                  inputRef.current?.focus();
                }}
                aria-label="Clear your email address"
                className="absolute bottom-2 right-0 flex h-9 w-9 items-center justify-center rounded-full text-app-textSecondary/60 transition-colors active:bg-black/5"
              >
                <X aria-hidden="true" size={18} strokeWidth={2.4} />
              </button>
            ) : null}
          </div>
          <div
            aria-hidden="true"
            className={`h-[2px] w-full rounded-full transition-colors duration-200 motion-reduce:transition-none ${
              focused ? "bg-app-primary" : "bg-app-borderIdle"
            }`}
          />
        </div>
      </div>

      <div
        className="shrink-0 space-y-3 px-7 pb-[max(env(safe-area-inset-bottom),16px)] pt-3 tab:pb-5"
        style={keyboardInset ? { paddingBottom: keyboardInset + 16 } : undefined}
      >
        {/* `busy` is the one round trip in Funnel.js that asks whether this
            address is already paying us. It is normally a few hundred
            milliseconds and it gives up after three seconds, but the button has
            to say something in the meantime rather than look broken. */}
        <PrimaryButton onClick={submit} disabled={!valid || busy} variant="rose">
          {busy ? "One moment..." : EMAIL_CTA}
        </PrimaryButton>
        <button
          type="button"
          onClick={onSkip}
          className="flex h-11 w-full items-center justify-center text-[14px] text-app-textSecondary"
        >
          {EMAIL_SKIP}
        </button>
        {/* Both lines dropped their opacity modifier. At /80 and /70 they
            measured 3.17:1 and 2.67:1 against white. This is the copy that
            tells her skipping costs her nothing, so it is the last thing that
            should be hard to read. */}
        <p className="text-center text-[12px] text-app-textSecondary">
          {EMAIL_SKIP_REASSURANCE}
        </p>
      </div>
    </div>
  );
}
