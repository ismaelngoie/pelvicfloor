"use client";

// You.
//
// This is the browser's copy of "Pelvic Floor/Scene/Main/Hub/ProfileView.swift",
// and it is meant to be read next to it. Same sections, same order, same rows,
// same row shapes, same tint per row:
//
//   header            avatar, name, crown, "Member since" pill
//   summaryStats      Sessions · Minutes · Calories · Best Streak, each tappable
//   progressCard      How You're Feeling · Bladder Diary · Progress Check · Report
//   boutiqueCard      The Pelvi® Boutique
//   accountCard       the goal card, then Name · Age · Height · Weight
//   supportAndCommunityCard
//                     Reminders · Resource Center · Privacy · Help · account · Invite
//
// Two cards are here that the phone does not have, and both are here because
// the phone does not need them: Subscription, because Apple owns billing on the
// phone and Stripe owns it here, and the 90-Day Goal Guarantee, which is the
// promise this website sells on.
//
// WHAT COULD NOT BE PORTED, AND WHAT IS SAID ABOUT IT. Nothing is silently
// dropped. Where the phone can do something a browser genuinely cannot, the row
// stays and says where it lives:
//   • Daily reminders, streak nudges, Lock Screen Live Activity — see
//     YouSettings.js. A reminder has to fire with the tab closed; that needs a
//     push server this static site does not have, and a Live Activity is an iOS
//     API with no web counterpart.
//   • Haptics during a guided session work on Android here and only in the app
//     on iPhone, because Safari does not implement navigator.vibrate.
//   • The Boutique cannot be framed inside the page — see Boutique.js.
// Everything else on the phone's You tab is on this page and works.

import { useCallback, useEffect, useState } from "react";
import {
  Bell, BookHeart, CalendarDays, ChevronRight, ClipboardList, Clock, CreditCard,
  Crown, Droplets, FileText, Flame, Footprints, Gift, LifeBuoy, LineChart, LogOut,
  RefreshCw, Ruler, Scale, ShieldCheck, ShoppingBag, Smartphone, User as UserIcon,
} from "lucide-react";
import { useMember } from "./MemberProvider";
import { Card, PrimaryButton, Sheet } from "./ui";
import { GroupCard, Row } from "./youUI";
import Boutique from "./Boutique";
import BladderDiary from "./BladderDiary";
import ProgressCheck from "./ProgressCheck";
import DoctorReport from "./DoctorReport";
import ResourceCenter from "./ResourceCenter";
import HelpSupport from "./HelpSupport";
import FeelingTrendsSheet from "./FeelingTrends";
import YouSettings from "./YouSettings";
import { MinutesSheet, StreakJourneySheet, WorkoutHistorySheet } from "./ProgressDetail";
import { fetchDiaryEntries, fetchOutcomeChecks, owedMilestone, toDate } from "./youStore";
import { fetchRecentCheckIns } from "@/lib/memberData";
import { openBillingPortal, restorePurchase } from "@/lib/memberBilling";
import { GOALS, goalById } from "@/lib/program";
import { goalAccentCSS, pathwaySubtitle, pathwayTitle } from "@/lib/goalCopy";
import {
  CLAIM_EMAIL, COVERAGE_TITLE, LADDER_LINE, coverageBody, day90String,
} from "@/lib/guaranteeCopy";

// "Get the app" used to be an unconditional link to this URL, and it was the
// one place on the whole site that broke the rule the rest of it is built on.
// Two things were wrong with it, and either one is enough on its own:
//
//   1. IT WAS SHOWN TO ANDROID. lib/appPrompt.js states the rule out loud:
//      "Android and desktop must never be shown an App Store link they cannot
//      use." Every other install surface obeys it through isIOSDevice(). This
//      row did not, so a paying Android member tapping the only row in Support
//      that sounds like it is for her landed on apps.apple.com.
//
//   2. IT PROMISED SOMETHING THE APP CANNOT DO, on iPhone too. See the comment
//      on APP_HANDOFF_READY in lib/appStore.js: the shipped app cannot unlock
//      from a web purchase, so a member who paid $24.99 here and installs it
//      today is shown the app's own paywall asking for $24.99 again. That is
//      why every other install offer on the site is switched off, and the value
//      line under this row, "Your plan, offline, on your phone", was false on
//      both halves.
//
// So the row is gated on the same switch as everything else. Flip
// APP_HANDOFF_READY when the app can unlock from a web purchase and this comes
// back on iOS by itself; nothing else here needs to change. appStoreURL()
// rather than a hardcoded string, so the install carries the same campaign
// token as every other link and the attribution does not split.
import { APP_HANDOFF_READY, appStoreURL, isIOSDevice } from "@/lib/appStore";

export default function You() {
  const {
    member, user, goalId, entitlement, patchMember, refreshMember, refreshEntitlement,
    signIn, signOut,
    // `currentDayNumber` is the day she is on, and the only value allowed to
    // print as "Day N of 90". See lib/program.js, above `programState`.
    completions, events, history, streak, planLength, currentDayNumber, catalog,
  } = useMember();

  const [sheet, setSheet] = useState(null); // one slot, never two open at once
  const [reportRange, setReportRange] = useState("month");

  // Her own logs, read once when the tab opens. The diary and the progress
  // check are the only two record types this tab owns; check-ins are read so
  // the doctor's report can print them beside the rest.
  const [diaryEntries, setDiaryEntries] = useState([]);
  const [outcomeChecks, setOutcomeChecks] = useState([]);
  const [checkIns, setCheckIns] = useState([]);

  const memberId = member?.id;

  const loadDiary = useCallback(async () => {
    if (!memberId) return;
    try { setDiaryEntries(await fetchDiaryEntries(memberId)); } catch { /* keeps what is on screen */ }
  }, [memberId]);

  const loadChecks = useCallback(async () => {
    if (!memberId) return;
    try { setOutcomeChecks(await fetchOutcomeChecks(memberId)); } catch { /* same */ }
  }, [memberId]);

  useEffect(() => { loadDiary(); }, [loadDiary]);
  useEffect(() => { loadChecks(); }, [loadChecks]);

  useEffect(() => {
    let cancelled = false;
    if (!memberId) return undefined;
    fetchRecentCheckIns(memberId, 90)
      .then((rows) => { if (!cancelled) setCheckIns(rows); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [memberId]);

  // Read after mount, never during render. This is a static export: the HTML
  // for /app is built on a machine with no `navigator`, so deciding anything
  // from the user agent during the first client render is a hydration mismatch.
  // It starts false, which is the prerendered state and also the correct answer
  // for everybody today, and can only ever flip on for an iPhone or iPad.
  const [offerTheApp, setOfferTheApp] = useState(false);
  useEffect(() => {
    setOfferTheApp(APP_HANDOFF_READY && isIOSDevice());
  }, []);

  const email = (member?.email || user?.email || "").trim();
  const goal = goalById(goalId);
  const name = (member?.name || "").trim();
  const minutes = Math.round(history.totalSeconds / 60);
  // The phone's own estimate: minutes × 4 (ProfileViewModel.fetchData). Labelled
  // as an estimate here, because that is what it is.
  const calories = minutes * 4;
  const account = linkedAccount(user);
  const memberSince = memberSinceLabel(member);

  const lastCheck = outcomeChecks.length ? toDate(outcomeChecks[outcomeChecks.length - 1].date) : null;
  const checkDue = owedMilestone(currentDayNumber, outcomeChecks) != null;

  const close = () => setSheet(null);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-10 pt-4 lg:max-w-5xl lg:px-8 lg:pt-6">
      <header className="px-1">
        <h1 className="text-[30px] font-bold leading-tight tracking-[-0.4px] text-app-textPrimary">
          You
        </h1>
        <p className="mt-1 text-[15px] text-app-textSecondary">
          {name ? `${name}, ` : ""}
          {entitlement.source === "ios"
            ? "your plan came across from the app."
            : "everything about your plan lives here."}
        </p>
      </header>

      {/* The phone's header: the circle, the name with its crown, and the
          "Member since" pill.

          There is no photo picker, and that is not an omission. The phone
          uploads her picture to Firebase Storage and keeps the URL in
          UserDataManager — CloudSync.pushProfileSummary does not carry
          `imageUrl`, so it never reaches the member record this site reads.
          A picker here would upload a photo that the phone would never show
          and this page would lose on the next device. Her initial stands in. */}
      <div className="mt-5 flex flex-col items-center text-center">
        <span
          className="grid h-[84px] w-[84px] place-items-center rounded-full text-[32px] font-bold text-white ring-4 ring-white"
          style={{ backgroundImage: "linear-gradient(150deg, #F68AA2 0%, #C33A5C 100%)" }}
          aria-hidden="true"
        >
          {(name || email || "P").trim().charAt(0).toUpperCase()}
        </span>
        <p className="mt-3 flex items-center gap-2 text-[24px] font-bold leading-tight text-app-textPrimary">
          {name || "Pelvi Member"}
          <Crown className="h-5 w-5 fill-ios-yellow text-ios-yellow" aria-hidden="true" />
        </p>
        {memberSince && (
          <p
            className="mt-2 rounded-full px-3 py-1.5 text-[12px] font-semibold text-white"
            style={{ backgroundImage: "linear-gradient(135deg, #E65473cc 0%, #FF2D55e6 100%)" }}
          >
            ★ {memberSince}
          </p>
        )}
      </div>

      {/* Two columns from 1024, in the same reading order as the phone: who she
          is on the left, what she can do about her subscription on the right.
          `items-start` so a short column does not stretch its last card. */}
      <div className="mt-5 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
        <div>
          {/* --- My progress ------------------------------------------------ */}
          <Card>
            <h2 className="text-[17px] font-bold text-app-textPrimary">My progress</h2>
            {/* Two across at 320px, four from 416px. The phone fits four pills
                because it never has to survive a 320px viewport. */}
            <div className="mt-3 grid grid-cols-2 gap-2 xs:grid-cols-4">
              <StatPill
                icon={Footprints}
                tint="#4E9BE6"
                value={completions.length}
                label="Sessions"
                onClick={() => setSheet("history")}
              />
              <StatPill
                icon={Clock}
                tint="#AF52DE"
                value={minutes}
                label="Minutes"
                onClick={() => setSheet("minutes")}
              />
              <StatPill icon={Flame} tint="#E8843A" value={calories} label="Calories" estimate />
              <StatPill
                icon={Crown}
                tint="#FF2D55"
                value={streak.best}
                label="Best streak"
                onClick={() => setSheet("streak")}
              />
            </div>
            <p className="mt-2.5 text-[11.5px] text-app-textSecondary">
              Calories are an estimate from your practice time, the same one the app makes.
            </p>
          </Card>

          {/* --- Progress: the four clinical tools. Untitled, like the phone's
              progressCard: the "My progress" header above already names this
              part of the screen, and a second header would say it twice. --- */}
          <GroupCard className="mt-5">
            <Row
              icon={LineChart}
              tint="green"
              label="How You're Feeling"
              value="Your daily check-ins over time"
              onClick={() => setSheet("feeling")}
            />
            <Row
              icon={Droplets}
              tint="teal"
              label="Bladder Diary"
              value={diarySubtitle(diaryEntries)}
              onClick={() => setSheet("diary")}
            />
            <Row
              icon={ClipboardList}
              tint="mint"
              label="Progress Check"
              value={
                lastCheck
                  ? `Last done ${lastCheck.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
                  : "Two short sets of questions for your doctor"
              }
              badge={checkDue ? "Ready" : null}
              onClick={() => setSheet("check")}
            />
            <Row
              icon={FileText}
              tint="accent"
              label="Report for My Doctor"
              value="Share your progress with your doctor or therapist"
              onClick={() => setSheet("report")}
            />
          </GroupCard>

          {/* --- The goal card, then her details ---------------------------- */}
          <div
            className="mt-5 rounded-[20px] p-4 text-white shadow-[0_5px_14px_rgba(0,0,0,0.14)] ring-1 ring-inset ring-white/30"
            style={{ backgroundImage: goalAccentCSS(goalId) }}
          >
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/80">Your goal</p>
            <p className="mt-1 text-[20px] font-bold leading-tight">{goal?.title}</p>
            <p className="mt-1 text-[13px] text-white/90">{pathwaySubtitle(goalId)}</p>
            <p className="mt-2 text-[12.5px] font-semibold text-white/90">
              {pathwayTitle(goalId)}
              {planLength ? ` · Day ${Math.min(currentDayNumber, planLength)} of ${planLength}` : ""}
            </p>
            <button
              type="button"
              onClick={() => setSheet("goals")}
              className="mt-3 h-10 rounded-full bg-white/20 px-4 text-[13.5px] font-semibold ring-1 ring-inset ring-white/30"
            >
              Change my goal
            </button>
          </div>

          {/* Name, age, height and weight are editable here, and they write the
              exact four field names CloudSync.pushProfileSummary sends from the
              phone — `name`, `age`, `heightInches`, `weightLbs`. A member who
              corrects her height on a laptop and one who corrects it on her
              iPhone are writing the same field, so neither overwrites the other
              with a different shape. */}
          <GroupCard className="mt-5" title="About you">
            <Row
              icon={UserIcon}
              tint="gray"
              label="Name"
              value={name || "Add your name"}
              onClick={() => setSheet("name")}
            />
            <Row
              icon={CalendarDays}
              tint="gray"
              label="Age"
              value={member?.age ? `${member.age} years old` : "Add your age"}
              onClick={() => setSheet("age")}
            />
            <Row
              icon={Ruler}
              tint="gray"
              label="Height"
              value={member?.heightInches ? formatHeight(member.heightInches) : "Add your height"}
              onClick={() => setSheet("height")}
            />
            <Row
              icon={Scale}
              tint="gray"
              label="Weight"
              value={member?.weightLbs ? `${member.weightLbs} lbs` : "Add your weight"}
              onClick={() => setSheet("weight")}
            />
          </GroupCard>
        </div>

        <div>
          {/* --- The Boutique ---------------------------------------------- */}
          <GroupCard className="mt-5 lg:mt-0">
            <Row
              icon={ShoppingBag}
              tint="cyan"
              label="The Pelvi® Boutique"
              value="Shop products we love · 20% member discount"
              onClick={() => setSheet("boutique")}
            />
          </GroupCard>

          <BillingCard
            email={email}
            entitlement={entitlement}
            refreshMember={refreshMember}
            refreshEntitlement={refreshEntitlement}
          />

          {/* Guarantee */}
          <Card className="mt-5">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-app-primary/10">
                <ShieldCheck className="h-5 w-5 text-app-primary" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 className="text-[16px] font-bold leading-tight text-app-textPrimary">
                  90-Day Goal Guarantee
                </h2>
                <p className="mt-1 text-[13px] leading-snug text-app-textSecondary">
                  {LADDER_LINE}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSheet("terms")}
              className="mt-3 flex h-11 w-full items-center justify-between rounded-full border border-app-borderIdle bg-white px-4 text-[14px] font-semibold text-app-textPrimary"
            >
              {COVERAGE_TITLE}
              <ChevronRight className="h-4 w-4 text-app-textSecondary" aria-hidden="true" />
            </button>
          </Card>

          {/* --- Support and community -------------------------------------- */}
          <GroupCard className="mt-5" title="Support and community">
            <Row
              icon={Bell}
              tint="pink"
              label="Reminders"
              value="Voice cues, and where nudges come from"
              onClick={() => setSheet("reminders")}
            />
            <Row
              icon={BookHeart}
              tint="orange"
              label="Resource Center"
              value="Trusted answers about your body"
              onClick={() => setSheet("resources")}
            />
            <Row
              icon={ShieldCheck}
              tint="blue"
              label="Privacy Policy"
              value="What we collect, and how to delete it"
              href="/privacy-policy"
            />
            <Row
              icon={FileText}
              tint="gray"
              label="Terms"
              value="Your subscription and your guarantees"
              href="/terms"
            />
            <Row
              icon={LifeBuoy}
              tint="slate"
              label="Help & Support"
              value="Contact us, refunds, and help"
              onClick={() => setSheet("help")}
            />
            {offerTheApp ? (
              <Row
                icon={Smartphone}
                tint="gray"
                label="Get the app"
                value="Your plan, on your phone"
                href={appStoreURL("member")}
                external
              />
            ) : null}
            {/* THE ACCOUNT ROW. Signed out it is an invitation to sync, signed
                in it is her account and the way out of it — the phone's syncRow,
                wording included. The owner asked for both halves to stay
                exactly as they are. */}
            {account ? (
              <Row
                icon={ShieldCheck}
                tint="indigo"
                label="Account"
                value={account.displayText}
                onClick={() => setSheet("signout")}
              />
            ) : (
              <Row
                icon={UserIcon}
                tint="indigo"
                label="Sign up to sync your workouts"
                value="Save your progress to your account"
                onClick={signIn}
              />
            )}
            <Row
              icon={Gift}
              tint="purple"
              label="Invite a Friend"
              value="Share the love"
              onClick={() => setSheet("invite")}
            />
          </GroupCard>

          {/* THE SIGN-UP CARD. The row above is where the phone puts it, and a
              row is easy to miss on the one tab a signed-out member lands on.
              It only ever renders when there is no account on this browser, so
              a signed-in member never sees it. */}
          {!account && (
            <Card className="mt-5">
              <div className="flex items-start gap-3">
                <span
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
                  style={{ backgroundImage: "linear-gradient(180deg, #7A78E8 0%, #5856D6 100%)" }}
                >
                  <UserIcon className="h-5 w-5 text-white" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-[16px] font-bold leading-tight text-app-textPrimary">
                    Sign up to sync your workouts
                  </h2>
                  <p className="mt-1 text-[13px] leading-snug text-app-textSecondary">
                    Save your progress to your account and pick your plan up on any
                    device you sign in on.
                  </p>
                </div>
              </div>
              <PrimaryButton className="mt-4 h-12 text-[15px]" onClick={signIn}>
                Sign up to sync your workouts
              </PrimaryButton>
            </Card>
          )}

          {/* THE ESCAPE HATCH, AND IT IS LOAD BEARING NOW. Do not remove it, and do
              not move it anywhere more prominent than the bottom of this tab.

              pelvi.health sends any signed-in browser straight here without
              painting the marketing page (lib/openPlan.js). That is right for the
              member it is about, and it is a locked room for the one person it is
              not: someone using a partner's or a friend's laptop, signed in as
              them. This button is her whole way out. Firebase's signOut deletes the
              session out of localStorage, which is the exact key that redirect
              reads, so the next visit to pelvi.health is the marketing page again
              with nothing to explain and no flag to clear.

              It also has to stay a sign-out and not a "start again": the screen
              behind it is the login screen, which is the right destination for
              somebody swapping accounts.

              The one case it is NOT shown is the one where it could do nothing:
              no account on this browser at all. `linkedAccount` returns
              something for every signed-in member — her address, or the
              provider's name, or a plain "Signed in" — so every session that
              has a way out still has this button. */}
          {account && (
            <button
              type="button"
              onClick={signOut}
              className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-full border border-app-borderIdle bg-white text-[15px] font-semibold text-app-textPrimary"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </button>
          )}
        </div>
      </div>

      {/* --- Sheets ------------------------------------------------------- */}

      <Boutique open={sheet === "boutique"} onClose={close} name={name} />

      <BladderDiary
        open={sheet === "diary"}
        onClose={close}
        memberId={memberId}
        entries={diaryEntries}
        onChange={loadDiary}
      />

      <ProgressCheck
        open={sheet === "check"}
        onClose={close}
        memberId={memberId}
        milestone={owedMilestone(currentDayNumber, outcomeChecks) || 0}
        programDay={currentDayNumber}
        onSaved={loadChecks}
      />

      <DoctorReport
        open={sheet === "report"}
        onClose={close}
        range={reportRange}
        onRangeChange={setReportRange}
        member={member}
        goal={goal}
        currentDayNumber={currentDayNumber}
        planLength={planLength}
        completions={completions}
        totalSeconds={history.totalSeconds}
        streak={streak}
        checkIns={checkIns}
        diaryEntries={diaryEntries}
        outcomeChecks={outcomeChecks}
      />

      <FeelingTrendsSheet
        open={sheet === "feeling"}
        onClose={close}
        checkIns={checkIns}
        goalId={goalId}
        onOpenReport={() => setSheet("report")}
      />

      <ResourceCenter open={sheet === "resources"} onClose={close} />

      <YouSettings open={sheet === "reminders"} onClose={close} />

      <HelpSupport
        open={sheet === "help"}
        onClose={close}
        member={member}
        email={email}
        entitlement={entitlement}
        refreshMember={refreshMember}
        refreshEntitlement={refreshEntitlement}
      />

      <WorkoutHistorySheet
        open={sheet === "history"}
        onClose={close}
        events={events}
        catalog={catalog}
      />
      <MinutesSheet open={sheet === "minutes"} onClose={close} events={events} />
      <StreakJourneySheet
        open={sheet === "streak"}
        onClose={close}
        streak={streak}
        completions={completions}
      />

      <GoalSheet
        open={sheet === "goals"}
        onClose={close}
        currentGoalId={goalId}
        onChoose={async (nextGoal) => {
          await patchMember({ goal: nextGoal.id, goalTitle: nextGoal.title });
          close();
        }}
      />

      <NameSheet
        open={sheet === "name"}
        onClose={close}
        initial={name}
        onSave={async (nextName) => {
          await patchMember({ name: nextName });
          close();
        }}
      />

      <NumberSheet
        open={sheet === "age"}
        onClose={close}
        title="How old are you?"
        hint="It shapes what the plan asks of you, and nothing else."
        unit="years"
        min={13}
        max={100}
        initial={member?.age || 35}
        onSave={async (value) => { await patchMember({ age: value }); close(); }}
      />

      <HeightSheet
        open={sheet === "height"}
        onClose={close}
        initial={member?.heightInches || 65}
        onSave={async (value) => { await patchMember({ heightInches: value }); close(); }}
      />

      <NumberSheet
        open={sheet === "weight"}
        onClose={close}
        title="What do you weigh?"
        hint="Only used to estimate the effort in a session."
        unit="lbs"
        min={70}
        max={500}
        initial={member?.weightLbs || 150}
        onSave={async (value) => { await patchMember({ weightLbs: value }); close(); }}
      />

      <InviteSheet open={sheet === "invite"} onClose={close} />

      {/* The phone asks before it signs her out, and so does this. */}
      <Sheet open={sheet === "signout"} onClose={close} title="Sign out of your account?">
        <div className="pb-6">
          <p className="text-[15px] leading-snug text-app-textPrimary">
            Your plan and everything you have logged stay on your account. You can
            sign back in any time.
          </p>
          <div className="mt-5 space-y-2.5">
            <button
              type="button"
              onClick={signOut}
              className="h-12 w-full rounded-full bg-ios-pink text-[15px] font-bold text-white"
            >
              Sign Out
            </button>
            <button
              type="button"
              onClick={close}
              className="h-12 w-full rounded-full border border-app-borderIdle bg-white text-[15px] font-semibold text-app-textPrimary"
            >
              Cancel
            </button>
          </div>
        </div>
      </Sheet>

      <Sheet open={sheet === "terms"} onClose={close} title={COVERAGE_TITLE}>
        <div className="pb-6">
          <ul className="space-y-3">
            {coverageBody(goalId).split("\n").map((line) => (
              <li key={line} className="text-[15px] leading-snug text-app-textPrimary">
                {line.replace(/^•\s*/, "")}
              </li>
            ))}
          </ul>
          <p className="mt-5 text-[13.5px] leading-snug text-app-textSecondary">
            Your day 90 is {day90String(startDateOf(member))}. Email {CLAIM_EMAIL} and we will
            take it from there.
          </p>
        </div>
      </Sheet>
    </div>
  );
}

// --- Billing ---------------------------------------------------------------

function BillingCard({ email, entitlement, refreshMember, refreshEntitlement }) {
  const [portalState, setPortalState] = useState("idle");
  const [restoreState, setRestoreState] = useState("idle");
  const [message, setMessage] = useState(null);

  const openPortal = useCallback(async () => {
    if (!email) { setMessage("We need an email on your account before we can open billing."); return; }
    setPortalState("working");
    setMessage(null);
    try {
      const { url, error } = await openBillingPortal(`${window.location.origin}/app/you`);
      if (url) {
        window.location.href = url;
        return;
      }
      setMessage(
        error ||
          (entitlement.source === "ios"
            ? "Your plan was bought in the App Store, so Apple handles the billing. Open Settings on your iPhone, tap your name, then Subscriptions."
            : "We could not find a billing account for that email. Email contact@pelvi.health and we will sort it out.")
      );
    } catch {
      setMessage("We could not reach our billing system. Please try again in a minute.");
    } finally {
      setPortalState("idle");
    }
  }, [email, entitlement.source]);

  const restore = useCallback(async () => {
    if (!email) { setMessage("We need an email on your account before we can look you up."); return; }
    setRestoreState("working");
    setMessage(null);
    try {
      // The restore call links her subscription to her record. What decides the
      // gate is Stripe's live answer, so ask for it again afterwards, skipping
      // the endpoint's one minute memo — otherwise the screen would still be
      // reading a "no" that was cached before she pressed the button.
      const { isPremium, linked } = await restorePurchase(email);
      if (isPremium) {
        const answer = await refreshEntitlement();
        await refreshMember();
        setMessage(
          answer?.active || linked
            ? "Found it. Your plan is active."
            : "We found your plan. If it is still not open in a minute, email contact@pelvi.health."
        );
      } else {
        setMessage(
          entitlement.active
            ? "Nothing extra to restore. Your plan is already active."
            : "No active subscription was found for that email."
        );
      }
    } catch {
      setMessage("We could not reach our billing system. Please try again in a minute.");
    } finally {
      setRestoreState("idle");
    }
  }, [email, refreshMember, refreshEntitlement, entitlement.active]);

  return (
    <Card className="mt-5">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-app-positive/12">
          <CreditCard className="h-5 w-5 text-app-positive" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-[16px] font-bold leading-tight text-app-textPrimary">Subscription</h2>
          <p className="mt-1 text-[13px] leading-snug text-app-textSecondary">
            {entitlement.active ? "Active" : "Not active"}
            {entitlement.source === "ios" ? " · bought in the App Store" : ""}
            {entitlement.renewsAt
              ? ` · renews ${entitlement.renewsAt.toLocaleDateString("en-US", { month: "long", day: "numeric" })}`
              : ""}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2.5">
        <PrimaryButton className="h-12 text-[15px]" onClick={openPortal} disabled={portalState === "working"}>
          {portalState === "working" ? "Opening..." : "Manage or cancel"}
        </PrimaryButton>
        <button
          type="button"
          onClick={restore}
          disabled={restoreState === "working"}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-app-borderIdle bg-white text-[15px] font-semibold text-app-textPrimary disabled:opacity-60"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          {restoreState === "working" ? "Checking..." : "Restore purchase"}
        </button>
      </div>

      {message && (
        <p role="status" className="mt-3 text-[13.5px] leading-snug text-app-textPrimary">
          {message}
        </p>
      )}
    </Card>
  );
}

// --- Pieces ----------------------------------------------------------------

/**
 * The phone's StatPill: glyph, number, label. A button when there is something
 * behind it, and a plain tile when there is not — the phone does the same, and
 * tapping Calories there does nothing at all.
 */
function StatPill({ icon: Icon, tint, value, label, onClick, estimate }) {
  const inner = (
    <>
      <Icon className="h-[18px] w-[18px]" style={{ color: tint }} aria-hidden="true" />
      <span className="mt-1.5 block text-[22px] font-bold leading-none tabular-nums text-app-textPrimary">
        {value}
      </span>
      <span className="mt-1 flex items-center gap-0.5 text-[10.5px] font-medium text-app-textSecondary">
        {label}
        {onClick && <ChevronRight className="h-3 w-3" aria-hidden="true" />}
      </span>
    </>
  );
  const className =
    "flex w-full flex-col items-center rounded-2xl bg-app-background px-2 py-3 text-center";

  return onClick ? (
    <button type="button" onClick={onClick} className={className} aria-label={`${label}: ${value}`}>
      {inner}
    </button>
  ) : (
    <div className={className} aria-label={estimate ? `${label}, estimated: ${value}` : undefined}>
      {inner}
    </div>
  );
}

function GoalSheet({ open, onClose, currentGoalId, onChoose }) {
  const [pending, setPending] = useState(null);
  useEffect(() => { if (!open) setPending(null); }, [open]);

  if (pending) {
    return (
      <Sheet open={open} onClose={onClose} title="Change your main goal?">
        <div className="pb-6">
          <p className="text-[15px] leading-snug text-app-textPrimary">
            Sticking with one goal for 3 to 4 weeks gives your body time to change.
          </p>
          <p className="mt-3 text-[15px] leading-snug text-app-textPrimary">
            Are you sure you want to switch to {pending.title}?
          </p>
          <p className="mt-3 text-[13px] leading-snug text-app-textSecondary">
            Your sessions and your streak stay exactly as they are. Your daily plan changes
            from tomorrow.
          </p>
          <div className="mt-6 space-y-2.5">
            <PrimaryButton onClick={() => onChoose(pending)}>Change Goal</PrimaryButton>
            <button
              type="button"
              onClick={() => setPending(null)}
              className="h-12 w-full rounded-full border border-app-borderIdle bg-white text-[15px] font-semibold text-app-textPrimary"
            >
              Keep My Goal
            </button>
          </div>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onClose={onClose} title="Your goal">
      <div className="pb-6">
        <p className="text-[13.5px] leading-snug text-app-textSecondary">
          Pick the one that matters most. Your plan is built around it.
        </p>
        <ul className="mt-4 grid grid-cols-2 gap-3">
          {GOALS.map((option) => {
            const selected = option.id === currentGoalId;
            return (
              <li key={option.id}>
                <button
                  type="button"
                  onClick={() => (selected ? onClose() : setPending(option))}
                  aria-pressed={selected}
                  className={`flex h-[104px] w-full flex-col items-center justify-center gap-2 rounded-[22px] border-2 bg-white px-2 text-center ${
                    selected ? "border-ios-pink" : "border-app-borderIdle"
                  }`}
                >
                  <span className="text-2xl" aria-hidden="true">{option.emoji}</span>
                  <span
                    className={`text-[13.5px] font-semibold leading-tight ${
                      selected ? "text-ios-pink" : "text-app-textPrimary"
                    }`}
                  >
                    {option.title}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </Sheet>
  );
}

function NameSheet({ open, onClose, initial, onSave }) {
  const [value, setValue] = useState(initial || "");
  useEffect(() => { if (open) setValue(initial || ""); }, [open, initial]);
  const valid = value.trim().length >= 2;

  return (
    <Sheet open={open} onClose={onClose} title="What should Mia call you?">
      <form
        className="pb-6"
        onSubmit={(e) => { e.preventDefault(); if (valid) onSave(value.trim()); }}
      >
        <label className="block">
          <span className="sr-only">Your first name</span>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoComplete="given-name"
            placeholder="Your first name"
            className="h-14 w-full rounded-2xl border border-app-borderIdle bg-white px-4 text-[17px] font-medium text-app-textPrimary placeholder:text-app-textSecondary focus:border-ios-pink focus:outline-none"
          />
        </label>
        <PrimaryButton className="mt-5" type="submit" disabled={!valid}>
          Save Changes
        </PrimaryButton>
      </form>
    </Sheet>
  );
}

/**
 * Age and weight. The phone gives each of these its own screen with a picker;
 * a number field with its own keyboard is the browser's version of the same
 * thing, and `inputMode="numeric"` is what puts the digits keyboard up on a
 * phone.
 */
function NumberSheet({ open, onClose, title, hint, unit, min, max, initial, onSave }) {
  const [value, setValue] = useState(String(initial ?? ""));
  useEffect(() => { if (open) setValue(String(initial ?? "")); }, [open, initial]);
  const parsed = Number.parseInt(value, 10);
  const valid = Number.isFinite(parsed) && parsed >= min && parsed <= max;

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <form
        className="pb-6"
        onSubmit={(e) => { e.preventDefault(); if (valid) onSave(parsed); }}
      >
        <p className="text-[13.5px] leading-snug text-app-textSecondary">{hint}</p>
        <div className="mt-4 flex items-center gap-3">
          <input
            type="number"
            inputMode="numeric"
            value={value}
            min={min}
            max={max}
            onChange={(e) => setValue(e.target.value)}
            className="h-14 min-w-0 flex-1 rounded-2xl border border-app-borderIdle bg-white px-4 text-[17px] font-medium text-app-textPrimary focus:border-ios-pink focus:outline-none"
          />
          <span className="shrink-0 text-[15px] font-semibold text-app-textSecondary">{unit}</span>
        </div>
        <PrimaryButton className="mt-5" type="submit" disabled={!valid}>
          Save Changes
        </PrimaryButton>
      </form>
    </Sheet>
  );
}

function HeightSheet({ open, onClose, initial, onSave }) {
  const [feet, setFeet] = useState(Math.floor((initial || 65) / 12));
  const [inches, setInches] = useState((initial || 65) % 12);
  useEffect(() => {
    if (!open) return;
    setFeet(Math.floor((initial || 65) / 12));
    setInches((initial || 65) % 12);
  }, [open, initial]);

  const total = feet * 12 + inches;
  const valid = total >= 36 && total <= 90;

  return (
    <Sheet open={open} onClose={onClose} title="How tall are you?">
      <form className="pb-6" onSubmit={(e) => { e.preventDefault(); if (valid) onSave(total); }}>
        <p className="text-[13.5px] leading-snug text-app-textSecondary">
          The app stores this in inches, the same as your phone does.
        </p>
        <div className="mt-4 flex gap-3">
          <label className="min-w-0 flex-1">
            <span className="mb-1 block text-[12.5px] font-semibold text-app-textSecondary">Feet</span>
            <select
              value={feet}
              onChange={(e) => setFeet(Number(e.target.value))}
              className="h-14 w-full rounded-2xl border border-app-borderIdle bg-white px-4 text-[17px] font-medium text-app-textPrimary focus:border-ios-pink focus:outline-none"
            >
              {[3, 4, 5, 6, 7].map((f) => (
                <option key={f} value={f}>{f}'</option>
              ))}
            </select>
          </label>
          <label className="min-w-0 flex-1">
            <span className="mb-1 block text-[12.5px] font-semibold text-app-textSecondary">Inches</span>
            <select
              value={inches}
              onChange={(e) => setInches(Number(e.target.value))}
              className="h-14 w-full rounded-2xl border border-app-borderIdle bg-white px-4 text-[17px] font-medium text-app-textPrimary focus:border-ios-pink focus:outline-none"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={i}>{i}"</option>
              ))}
            </select>
          </label>
        </div>
        <PrimaryButton className="mt-5" type="submit" disabled={!valid}>
          Save Changes
        </PrimaryButton>
      </form>
    </Sheet>
  );
}

/**
 * Invite a Friend. The phone opens a UIActivityViewController; the web's
 * equivalent is navigator.share, which every phone browser has and no desktop
 * browser does — so the fallback is the link itself, copyable, which is what
 * the share sheet was going to hand over anyway.
 */
function InviteSheet({ open, onClose }) {
  const [copied, setCopied] = useState(false);
  const url = "https://pelvi.health";
  const text = "Check out this Pelvic Floor app I'm using!";

  const share = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "Pelvi", text, url });
        return;
      } catch {
        // She backed out of the share sheet, or it refused. Copy still works.
      }
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Invite a Friend">
      <div className="pb-6">
        <p className="text-[15px] leading-snug text-app-textPrimary">{text}</p>
        <p className="mt-2 text-[13.5px] leading-snug text-app-textSecondary">
          One in three women has leaks and almost nobody talks about it. Send this to
          the one you would want to tell.
        </p>
        <p className="mt-4 select-all break-all rounded-2xl bg-app-background px-4 py-3 text-[14px] font-medium text-app-textPrimary">
          {url}
        </p>
        <PrimaryButton className="mt-4 h-12 text-[15px]" onClick={share}>
          {copied ? "Copied" : "Share the love"}
        </PrimaryButton>
      </div>
    </Sheet>
  );
}

// --- Helpers ---------------------------------------------------------------

function formatHeight(inches) {
  const total = Number(inches) || 0;
  const feet = Math.floor(total / 12);
  const rest = total % 12;
  return `${feet}'${rest}"`;
}

function startDateOf(member) {
  const raw = member?.programStartedAt || member?.joinDate;
  if (!raw) return new Date();
  if (typeof raw?.toDate === "function") return raw.toDate();
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

/** "Member since July 2025", the phone's own format (MMMM yyyy). */
function memberSinceLabel(member) {
  const raw = member?.joinDate || member?.programStartedAt;
  const d = raw?.toDate ? raw.toDate() : raw ? new Date(raw) : null;
  if (!d || Number.isNaN(d.getTime())) return null;
  return `Member since ${d.toLocaleDateString(undefined, { month: "long", year: "numeric" })}`;
}

/**
 * A read-only view of the account this browser is signed in to, the same shape
 * the phone's LinkedAccountInfo has: her address when the provider shared a
 * real one, and the provider's name when it did not. Apple's private-relay
 * addresses read better as the provider line than as a random relay string.
 */
function linkedAccount(user) {
  if (!user) return null;
  const provider = (user.providerData || [])[0]?.providerId || "";
  const label =
    provider === "apple.com" ? "Apple" : provider === "google.com" ? "Google" : null;
  const email = (user.email || "").trim();
  if (email && !email.endsWith("privaterelay.appleid.com")) {
    return { displayText: email };
  }
  return { displayText: label ? `Signed in with ${label}` : "Signed in" };
}

function diarySubtitle(entries) {
  if (!entries?.length) return "Log trips, leaks and drinks in one tap";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const count = entries.filter((e) => {
    const d = toDate(e.timestamp);
    if (!d) return false;
    const day = new Date(d);
    day.setHours(0, 0, 0, 0);
    return day.getTime() === today.getTime();
  }).length;
  return count ? `${count} logged today` : "Log trips, leaks and drinks in one tap";
}
