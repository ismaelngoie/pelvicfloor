import {
  Callout,
  Cite,
  Figure,
  H2,
  H3,
  LI,
  Lede,
  P,
  SeeSomeone,
  Strong,
  Table,
  UL,
  Xref,
} from "@/components/blog/prose";

// Must match the H2 headings below, in order.
export const headings = [
  "Before anything else: you may not need an app",
  "The three kinds of pelvic floor app",
  "Seven questions to ask before you subscribe",
  "How Pelvi answers its own questions",
  "Delete it immediately if it does any of these",
  "The honest limits of any app",
];

export function Body() {
  return (
    <>
      <Lede>
        We make one of these, so read this with that in mind. What follows is the
        list of questions we would ask about any pelvic floor app, including
        ours, and at the end we answer all seven about Pelvi in public, including
        the two where the answer is not flattering.
      </Lede>

      <Callout title="Our conflict of interest, stated plainly">
        <P>
          Pelvi Health sells a subscription pelvic floor training app. This page
          exists partly because people search for how to choose one. We have
          tried to write criteria that would still be the right criteria if we
          failed them, and where we do fail them we have said so rather than
          quietly leaving the question off the list.
        </P>
      </Callout>

      <H2>Before anything else: you may not need an app</H2>
      <P>
        The treatment that guidelines recommend first is{" "}
        <Strong>supervised</Strong> pelvic floor muscle training, at least three
        months of it, for stress or mixed urinary incontinence{" "}
        <Cite id="niceNG123">(NICE NG123)</Cite>. The word supervised is doing
        real work in that sentence. In one study, after brief verbal instruction
        only 49% of women produced an ideal pelvic floor contraction, and 25%
        used a technique that could actively promote incontinence{" "}
        <Cite id="bumpTechnique">(Bump et al., 1991)</Cite>.
      </P>
      <Figure
        value="1 in 4"
        label="Women who, after brief instruction, used a pelvic floor technique that could promote incontinence rather than improve it. No app can detect this happening."
        sourceId="bumpTechnique"
      />
      <P>
        No phone can tell whether you are lifting or bearing down. If you have
        never been assessed, the highest-value thing you can buy is not a
        subscription, it is one appointment.{" "}
        <Xref href="/blog/what-happens-at-a-pelvic-floor-physio-appointment">
          What happens in that appointment is here
        </Xref>
        . The right role for an app is doing the work between appointments, which
        is most of the work.
      </P>

      <H2>The three kinds of pelvic floor app</H2>
      <P>
        Nearly everything in the stores falls into one of three groups, and they
        are not competing with each other so much as solving different problems.
      </P>
      <Table
        head={["Type", "What it is", "Best for"]}
        rows={[
          [
            "Timers",
            "A screen that counts squeeze and release intervals, often with a streak. No progression, no assessment, no content.",
            "Someone who already knows exactly what to do and only needs reminding.",
          ],
          [
            "Device apps",
            "An app paired with an insertable biofeedback sensor that reports what your muscle is doing.",
            "People who cannot tell whether they are contracting correctly and want objective feedback. Usually a significant upfront cost.",
          ],
          [
            "Program apps",
            "A structured, progressing plan over weeks or months, usually with video, sometimes with symptom tracking.",
            "People who need the whole plan built for them and kept moving. This is what Pelvi is.",
          ],
        ]}
      />
      <P>
        Published evaluations of this market are not flattering. One review found
        120 pelvic floor apps in the stores and scored 32 in detail; only about a
        third cited any primary literature at all{" "}
        <Cite id="appEvaluation">(Barnes et al., 2019)</Cite>. Popularity and a
        good rating tell you about the onboarding, not about the clinical
        content.
      </P>

      <H2>Seven questions to ask before you subscribe</H2>

      <H3>1. Does it know the difference between weak and tight?</H3>
      <P>
        This is the question that matters most, because getting it wrong makes
        symptoms worse rather than merely wasting time. A pelvic floor that is
        short and overactive needs release before strength, and a strengthening
        program handed to it will increase urgency, ache and pain with sex. At
        minimum, an app should ask about pain, urgency and painful sex during
        onboarding, and should route those answers somewhere different from
        "more contractions". If the only path through the product is
        strengthening, it has answered no.
      </P>

      <H3>2. Can it deliver the guideline dose, for the guideline duration?</H3>
      <P>
        The prescription is at least 8 contractions three times a day, sustained
        for at least three months <Cite id="niceNG123">(NICE NG123)</Cite>. Look
        at the app's own program length. A seven-day challenge is not a course of
        treatment, and a plan that runs out in three weeks is measuring against
        the wrong yardstick.{" "}
        <Xref href="/blog/how-many-kegels-should-i-do-a-day">
          The dose, and how to split it, is here
        </Xref>
        .
      </P>

      <H3>3. Does it progress, or does it repeat?</H3>
      <P>
        Muscles adapt to demand. If week nine is the same session as week one,
        nothing is being asked of you that was not already easy. Real progression
        shows up as longer holds, harder positions, then movement, then load:
        lying, sitting, standing, walking, lifting, jumping. Ask whether the app
        ever gets you upright and moving, because that is where leaking actually
        happens.
      </P>

      <H3>4. Can you see the movement?</H3>
      <P>
        Written instructions are how people end up training the wrong muscle,
        which is the whole finding of the technique study above. Video is not a
        luxury here. Check that the exercises are actually filmed and
        demonstrated rather than described in a paragraph next to an
        illustration.
      </P>

      <H3>5. Does it measure anything a clinician would recognise?</H3>
      <P>
        Streaks and minutes measure the app. They do not measure you. The
        instruments clinicians recognise are the ICIQ-UI SF for urinary symptoms
        and the PFDI-20 for the wider picture, and an app that captures those
        gives you something you can hand over at an appointment.{" "}
        <Xref href="/blog/how-to-measure-pelvic-floor-progress">
          Both are explained here
        </Xref>
        , and you can score yourself with them whether or not your app supports
        them.
      </P>

      <H3>6. Who made the content, and will they say?</H3>
      <P>
        Look for a named person with verifiable credentials and a real page you
        can check: a licence number, a practice, a professional profile. A stock
        photo captioned "our medical team", or a named doctor whose name returns
        nothing anywhere on the web, is worse than no claim at all, because it
        tells you what the company does when nobody is checking.
      </P>

      <H3>7. What does it do when you get worse?</H3>
      <P>
        Every serious product needs an off-ramp. Ask what happens if you report
        pain, or a bulge, or blood. A good app tells you to stop and see someone,
        by name, with a link. A bad one has no field for that information at all
        and offers you tomorrow's session regardless.
      </P>

      <H2>How Pelvi answers its own questions</H2>
      <P>
        Marked honestly. Two of these are a no, and we would rather you read that
        here than find out after paying.
      </P>
      <Table
        head={["Question", "Our answer"]}
        rows={[
          [
            "1. Weak versus tight",
            "Partly, and this is a genuine limitation. Onboarding asks about your goal, your symptoms and existing conditions, and there is a 90-day pelvic pain program that starts with release rather than strengthening. But no app can examine you, and ours cannot either. If you have pain, get assessed first.",
          ],
          [
            "2. Dose and duration",
            "Yes on duration: every one of the nine goals has a 13-week, 90-day program, which matches the three-month trial the guideline describes. On dose, our sessions are guided five-minute workouts rather than a contraction counter, so if a clinician has given you a specific rep prescription, keep doing it alongside.",
          ],
          [
            "3. Progression",
            "Yes. Each program runs as 13 weekly themes with a distinct session for each of the 90 days, and it moves from breathing and activation into strength, movement and load. Days unlock one per calendar day, and missing a week pauses the plan rather than wiping it.",
          ],
          [
            "4. Video",
            "Yes. 533 filmed exercises sit behind the programs, which is the largest single thing we have built, and it exists specifically because reading an exercise is how people get it wrong.",
          ],
          [
            "5. Measurement",
            "Yes. The app runs the ICIQ-UI SF and the PFDI-20 on program days 1, 30, 60 and 90, using the standard item wording rather than a friendlier rewrite. A session also has to be genuinely watched to count: 80% of a video, 60% of a day's videos.",
          ],
          [
            "6. Named clinical reviewer",
            "No, and this is the honest gap. Our exercise library was filmed with coaches, and these articles are written and sourced by our own team, but we do not currently have a named, licensed clinical reviewer, and we will not print one until we do. Every article on this site says so at the bottom.",
          ],
          [
            "7. What happens if you get worse",
            "Partly. The daily check-in asks about leaks and pain depending on your goal, and every article here carries a red flag section. It is not a substitute for a clinician noticing, and we do not claim it is.",
          ],
        ]}
        caption="Answered against the same seven questions we would use on anyone else's app."
      />

      <H2>Delete it immediately if it does any of these</H2>
      <UL>
        <LI>
          <Strong>Promises to cure prolapse</Strong>, or to guarantee you will
          never leak again. Neither is a claim any evidence supports.
        </LI>
        <LI>
          <Strong>Tells you to push, bear down or strain</Strong> as part of a
          pelvic floor exercise.
        </LI>
        <LI>
          <Strong>Has no way to report that things got worse</Strong>, and no
          point at which it tells you to see someone.
        </LI>
        <LI>
          <Strong>Escalates the dose without ever checking technique.</Strong>{" "}
          Hundreds of repetitions a day is a red flag on its own.
        </LI>
        <LI>
          <Strong>Names a clinician you cannot find anywhere else.</Strong> Try
          searching the name and the credential. It takes thirty seconds.
        </LI>
        <LI>
          <Strong>Cannot be cancelled from inside the app</Strong>, or hides what
          it will charge you and when.
        </LI>
      </UL>

      <H2>The honest limits of any app</H2>
      <P>
        The evidence base supports the training, not the delivery mechanism.
        Pelvic floor muscle training works: eight times more likely to report
        cure of stress incontinence than no treatment, 56% versus 6% across four
        trials graded high-quality <Cite id="cochranePFMT">(Cochrane, 2018)</Cite>
        . An app is a way of getting that training done consistently for three
        months, which is genuinely hard and genuinely where most people fail. It
        is not a second opinion, it is not an examination, and it cannot see what
        you are doing.
      </P>
      <P>
        The best outcome, for most people, is both: one assessment to find out
        what is actually wrong, and then something that gets the work done on the
        two hundred days when nobody is watching.
      </P>

      <SeeSomeone
        title="Skip the app store and book an appointment if"
        items={[
          "You have pain anywhere in the pelvis, or sex hurts.",
          "You feel a bulge, heaviness or dragging.",
          "There is blood you cannot explain.",
          "You are leaking from the bowel, or losing control of wind.",
          "Exercises you have already tried made things worse.",
          "You are pregnant or within a year of giving birth and something feels wrong.",
        ]}
      >
        <P>
          Find a pelvic health physiotherapist through{" "}
          <Cite id="aptaPelvic">APTA Pelvic Health</Cite> in the US or{" "}
          <Cite id="pogp">POGP</Cite> in the UK.{" "}
          <Xref href="/blog/pelvic-floor-red-flags">
            The full red flag list is here
          </Xref>
          .
        </P>
      </SeeSomeone>
    </>
  );
}
