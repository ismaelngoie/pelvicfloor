"use client";

// The 90-day intro. The first thing she sees after money changes hands.
//
// PORTED FROM: "Pelvic Floor/Core/UI/ProgramIntroView.swift". On iPhone this is
// a full-screen cover presented over the tab bar 420ms after the purchase
// lands, and it is non-dismissible except by its two buttons, because it is the
// payoff: it is the promise she just bought, said back to her, with her name
// and her goal in it. The web had nothing like it. The order of the blocks, the
// wording of every line and the black background are the iOS screen's, so a
// member who buys on her laptop and a member who buys on her phone are given
// the same moment.
//
// WHAT IS DELIBERATELY NOT HERE. Anything that sells. No benefits, no proof, no
// second offer, no goal content she did not ask for. The owner's line was that
// showing leak content to someone who came for intimacy is worse than showing
// nothing, and this file takes that literally: when her goal is unknown, the
// week-1 card and the guarantee promise are not rendered at all, and the two
// sentences that would have named a goal lose that clause instead of guessing.
// See lib/postPurchase.js for why the goal can be unknown.

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Calendar, Check, Ellipsis, ShieldCheck, Smartphone } from "lucide-react";

import SFIcon from "@/components/funnel/icons";
import { useReducedMotion, useThemeColor } from "@/components/funnel/ui";
import { canOfferApp } from "@/lib/appPrompt";
import { day90String, milestoneCardPromise } from "@/lib/guaranteeCopy";
import { goalAccent, goalAccentCSS } from "@/lib/goalCopy";
import { GOALS, loadProgram, totalDays } from "@/lib/program";
import { formatAmount } from "@/lib/checkout";
import { DEFAULT_PRICE_PERIOD } from "@/lib/pricing";
import AppInstallSheet from "./AppInstallSheet";

const BRAND_GRADIENT = "linear-gradient(160deg, #F68AA2 0%, #E65473 55%, #C33A5C 100%)";

// How long "Start Day 1" will wait for a session before going anyway.
//
// Going anyway is the right end of that wait rather than a failure: /app can
// recover on its own, and a member staring at a dead button on the screen she
// has just paid for is the worse outcome of the two. Three seconds is longer
// than the sign-in takes on a phone on 4G and short enough not to read as a
// hang.
const SESSION_WAIT_MS = 3000;

/**
 * @param {object} props
 * @param {string|null} props.goalId   her goal, or null when it is genuinely unknown
 * @param {string} props.name          her first name, or ""
 * @param {boolean} [props.sessionPending]  the sign-in that this payment buys
 *   is still in flight. See the note on the action bar.
 * @param {{amount:number,currency:string,interval:string}|null} [props.price]
 *   what Stripe is actually charging, or null when this browser does not know.
 */
export default function ProgramIntro({ goalId, name, sessionPending = false, price = null }) {
  const reduced = useReducedMotion();
  // The browser chrome follows the screen down. Without this the iOS status bar
  // area stays brand pink above a black page, which is the single thing that
  // most makes a web app look like a web page.
  useThemeColor("#000000");

  const [week, setWeek] = useState(null);
  const [remaining, setRemaining] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [offerApp, setOfferApp] = useState(false);
  // She pressed Start Day 1 before the session existed. Not an error state and
  // never a blocked button: it is a held navigation.
  const [waiting, setWaiting] = useState(false);

  // Let go of the held tap the moment the session lands, or after the ceiling
  // above, whichever comes first. `window.location`, not a router push: /app has
  // to arrive as a fresh document so Microsoft Clarity is never injected over
  // the member app. Same rule as the anchor itself.
  useEffect(() => {
    if (!waiting) return undefined;
    if (!sessionPending) {
      window.location.href = "/app";
      return undefined;
    }
    const timer = setTimeout(() => {
      window.location.href = "/app";
    }, SESSION_WAIT_MS);
    return () => clearTimeout(timer);
  }, [waiting, sessionPending]);

  // After mount, never during render: canOfferApp reads navigator and
  // localStorage, and a server render cannot see either.
  useEffect(() => {
    setOfferApp(canOfferApp());
  }, []);

  // Week 1, from the same JSON the member app reads. Fetched rather than
  // bundled, and its absence is a supported state: if the network drops between
  // the payment and this screen she gets the promise without the schedule,
  // which is still the right screen.
  useEffect(() => {
    if (!GOALS.some((g) => g.id === goalId)) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const program = await loadProgram(goalId);
        if (cancelled || !program?.weeks?.length) return;
        setWeek(program.weeks[0]);
        // iOS hardcodes "87 more days". Counted here instead, so a program that
        // is ever shortened cannot leave a wrong number on the payoff screen.
        setRemaining(Math.max(0, totalDays(program) - program.weeks[0].days.slice(0, 3).length));
      } catch {
        // Nothing to say and nothing to retry. See above.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [goalId]);

  // goalById() answers with core strength for anything it does not recognise,
  // which is the right default on a paywall and the wrong one here: a stored id
  // that has gone stale would print "Your goal: Build Core Strength" to someone
  // who came for intimacy, which is the exact mismatch this screen exists to
  // avoid. So an unrecognised id is treated as no goal at all.
  const goal = GOALS.find((g) => g.id === goalId) || null;
  const gradient = goal ? goalAccentCSS(goalId, "160deg") : BRAND_GRADIENT;
  // The day glyphs are stroked SVGs, so they take a colour and not a gradient:
  // background-clip:text paints text, and an icon inside a transparent-text
  // span simply disappears. The first stop of her goal's gradient is the
  // closest honest match, and it is the colour iOS draws those rows in anyway.
  const glyphColor = goal ? goalAccent(goalId)[0] : "#E65473";
  const day90 = useMemo(() => day90String(new Date()), []);
  const priceLine = useMemo(
    () =>
      price
        ? `${formatAmount(price.amount, price.currency)} a ${price.interval || DEFAULT_PRICE_PERIOD}. Cancel anytime.`
        : "",
    [price]
  );

  // Staggered entrances, matching the spring-in on iOS. `backwards` on the
  // keyframe is what stops a flash of the finished state on a slow phone.
  const rise = (i) => (reduced ? undefined : { animationDelay: `${0.08 + i * 0.09}s` });
  const riseClass = reduced ? "" : "funnel-rise";

  return (
    <>
      {/* Fixed, so the black escapes the 1152px column the root layout caps
          every page at. A page background that stopped dead at 1152 with
          #FAF9FA either side would read as a seam down both edges of the one
          screen that is meant to feel like the app. */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 bg-black" />

      {/* THE BUTTONS ARE PINNED, and that is a port of the iOS screen rather
          than a flourish: ProgramIntroView puts the ScrollView and the two
          buttons in the same VStack, so the buttons never scroll away. Left as
          one long scrolling page, "Start Day 1" sits below the fold on a 375 by
          812 phone, which is every phone this will be seen on. The middle
          scrolls, the action does not. */}
      <div className="relative flex h-full min-h-full w-full flex-col font-system text-white">
        <div className="mx-auto flex min-h-0 w-full max-w-[520px] flex-1 flex-col overflow-y-auto overscroll-contain px-6 pb-2 pl-[max(1.5rem,var(--sal))] pr-[max(1.5rem,var(--sar))] pt-6 no-scrollbar tab:pt-14">
          {/* my-auto, not justify-center on the parent. Both centre short
              content, and there are two lengths of this screen: with her goal
              it overflows a phone, and without one (a restore in a browser that
              never ran the funnel) it is four short blocks that would otherwise
              sit at the top with 600px of black under them. justify-center on a
              scroll container clips the top of overflowing content and makes it
              unreachable; auto margins on the child centre it when it fits and
              get out of the way when it does not. */}
          <div className="my-auto w-full">
          {/* The receipt, in one line and at the top, so it is answered before
              she has to wonder. It is not the point of this screen, so it gets
              the smallest type on it. */}
          <div className={`${riseClass} text-center`} style={rise(0)}>
            <p className="flex items-center justify-center gap-1.5 text-[13px] font-semibold text-white/45">
              <Check size={14} strokeWidth={3} className="text-app-positive" aria-hidden="true" />
              Payment confirmed
            </p>
            {/* A RECEIPT, SO IT IS THE AMOUNT SHE WAS ACTUALLY CHARGED.
                This line used to print the advertised constant from
                lib/pricing.js under the words "Payment confirmed", which is a
                claim about her money that is only true while every member is on
                the list price in dollars. A promotional price, a legacy price
                or another currency all made it a lie on the one screen where
                that costs the most trust. When the real amount is not known —
                a restore, a browser that never ran the checkout — the line is
                simply not rendered. See lib/postPurchase.js. */}
            {priceLine ? (
              <p className="mt-1 text-[12px] text-white/30">{priceLine}</p>
            ) : null}
          </div>

          {/* Hero. 110px rounded bold on iOS; the goal gradient is painted
              through the glyph itself, which is what makes this screen feel
              like hers rather than like a template. */}
          {/* One image to a screen reader, matching the iOS view, which combines
              these two lines into the single label "90 days to your goal".
              Read separately they are a bare number and a fragment. */}
          <div
            className={`${riseClass} mt-5 text-center`}
            style={rise(1)}
            role="img"
            aria-label="90 days to your goal"
          >
            <p
              className="bg-clip-text text-[104px] font-black leading-[0.9] tracking-[-3px] xs:text-[118px]"
              // NOT Tailwind's text-transparent. The gradient is painted through
              // the glyph with background-clip: text, and if a browser ignores
              // that, a transparent colour leaves the biggest thing on the
              // payoff screen invisible. -webkit-text-fill-color ships with
              // -webkit-background-clip: text in every engine that has either,
              // so the plain `color` below is what actually renders anywhere the
              // effect is not supported.
              style={{
                backgroundImage: gradient,
                color: glyphColor,
                WebkitTextFillColor: "transparent",
              }}
            >
              90
            </p>
            <p className="mt-2 text-[12px] font-bold uppercase tracking-[3px] text-white/60">
              Days to your goal
            </p>
          </div>

          <div className={`${riseClass} mt-6 text-center`} style={rise(2)}>
            <h1 className="text-[24px] font-bold leading-tight tracking-[-0.3px] text-white xs:text-[26px]">
              {name ? `${name}, your journey starts now.` : "Welcome, your journey starts now."}
            </h1>
            <p className="mx-auto mt-3 max-w-[19rem] text-[16px] leading-relaxed text-white/75">
              One short session a day, for 90 days.
              {goal ? ` Your goal: ${goal.title}.` : ""}
            </p>
          </div>

          {week ? (
            <section
              className={`${riseClass} mt-6 rounded-[20px] bg-white/[0.06] p-5`}
              style={rise(3)}
              aria-label="Your first week"
            >
              <h2 className="text-[12px] font-bold uppercase tracking-[1.5px] text-white/60">
                Week 1 · {week.theme}
              </h2>
              <ul className="mt-3 space-y-2.5">
                {week.days.slice(0, 3).map((day) => (
                  <li key={day.day} className="flex items-start gap-3">
                    <span
                      className="mt-[1px] flex w-7 shrink-0 justify-center"
                      style={{ color: glyphColor }}
                    >
                      <SFIcon name={day.icon} size={17} strokeWidth={2.4} />
                    </span>
                    <span className="text-[15px] font-semibold leading-snug text-white/90">
                      Day {day.day}: {day.title}
                    </span>
                  </li>
                ))}
                {remaining > 0 && (
                  <li className="flex items-start gap-3">
                    <span className="mt-[1px] flex w-7 shrink-0 justify-center text-white/40">
                      <Ellipsis size={17} aria-hidden="true" />
                    </span>
                    <span className="text-[15px] leading-snug text-white/50">
                      {remaining} more days, one new day at a time
                    </span>
                  </li>
                )}
              </ul>
            </section>
          ) : null}

          <p className={`${riseClass} mt-5 flex items-start gap-2.5 px-1 text-[13px] leading-relaxed text-white/55`} style={rise(4)}>
            <Calendar size={15} className="mt-[2px] shrink-0" aria-hidden="true" />
            <span>A new day opens each day. Miss a day? Nothing is lost, you just carry on.</span>
          </p>

          {/* The promise, in her own goal's words, from lib/guaranteeCopy.js and
              nowhere else. Rendered only when the goal is known: the fallback
              phrase in that file is a sensible default for a paywall and a
              wrong answer here. */}
          {goal ? (
            <p className={`${riseClass} mt-3 flex items-start gap-2.5 px-1 text-[13px] leading-relaxed text-white/55`} style={rise(5)}>
              <ShieldCheck size={15} className="mt-[2px] shrink-0 text-app-primary" aria-hidden="true" />
              <span>{milestoneCardPromise(goalId, day90)}</span>
            </p>
          ) : null}

            <div className="h-3 shrink-0" aria-hidden="true" />
          </div>
        </div>

        {/* The action bar. Outside the scroll area, so it is under her thumb the
            moment the screen appears. The gradient above it is what stops a
            line of text from appearing to be cut in half by a hard edge. */}
        <div className="relative z-10 shrink-0 bg-gradient-to-t from-black via-black to-transparent pt-6">
          <div className={`${riseClass} mx-auto flex w-full max-w-[520px] flex-col gap-2 px-6 pb-[calc(env(safe-area-inset-bottom)+18px)] pl-[max(1.5rem,var(--sal))] pr-[max(1.5rem,var(--sar))]`} style={rise(6)}>
            {/* A PLAIN <a>, NOT next/link, AND IT HAS TO STAY ONE. This is the
                crossing from a page Microsoft Clarity records into one it must
                never record. next/link makes that a client-side route change:
                same document, same recorder, and the member app's DOM, her
                name, her check-ins and her Coach Mia transcripts committed
                inside a live recording before any guard could run. A plain
                anchor is a full page load, so /app arrives as a fresh document
                that the gate in app/Clarity.jsx never injects the tag into. The
                same note is on the old link this replaced; keep both. */}
            {/* THE TAP THAT ARRIVES BEFORE THE SESSION DOES.
                This button is pinned, it is above the fold and it is the only
                thing on the screen to press, so it gets pressed immediately —
                and the session that the payment buys is still being minted at
                that moment (Stripe lookup, then Identity Toolkit, then
                signInWithCustomToken, which is three round trips and a chunk of
                the Firebase SDK). /app is a full page load into a gate that
                asks who she is, so a tap that lands one second early puts a
                sign-in screen in front of a woman who paid thirty seconds ago:
                exactly the extra step this whole change exists to delete.
                So the tap is HELD, not blocked. The button never disables and
                never stops responding; it simply says "One moment" until the
                session lands, and goes anyway after SESSION_WAIT_MS. */}
            <a
              href="/app"
              aria-live="polite"
              onClick={(event) => {
                if (!sessionPending || waiting) return;
                event.preventDefault();
                setWaiting(true);
              }}
              className="flex h-[56px] w-full items-center justify-center gap-2 rounded-[18px] text-[17px] font-bold text-white shadow-[0_8px_24px_rgba(0,0,0,0.45)] transition-transform active:scale-[0.985]"
              style={{ backgroundImage: gradient }}
            >
              {waiting ? "One moment" : "Start Day 1"}
              {waiting ? null : <ArrowRight size={19} aria-hidden="true" />}
            </a>

            {/* iPhone and iPad only, and only until she answers it once. An
                Android or desktop visitor never renders this element at all,
                because canOfferApp is a user-agent check and not a width one. */}
            {offerApp ? (
              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[18px] text-[15px] font-semibold text-white/70"
              >
                <Smartphone size={16} aria-hidden="true" />
                Download the app on iPhone
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <AppInstallSheet
        open={sheetOpen}
        surface="success"
        onClose={() => {
          setSheetOpen(false);
          // Closed for good, whichever way she closed it. The button goes with
          // it, so the offer is made once and never again on this browser.
          setOfferApp(false);
        }}
      />
    </>
  );
}
