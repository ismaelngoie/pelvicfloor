import {
  Callout,
  Cite,
  Figure,
  H2,
  LI,
  Lede,
  NumLI,
  OL,
  P,
  SeeSomeone,
  Strong,
  Table,
  UL,
  Xref,
} from "@/components/blog/prose";

// Must match the H2 headings below, in order.
export const headings = [
  "Why a bit better is not a measurement",
  "The ICIQ-UI SF: three questions, zero to twenty one",
  "The PFDI-20: twenty questions, three subscales, zero to three hundred",
  "How much change counts as real",
  "When to score, and how often",
  "How we do it inside the app",
  "Four things that will ruin your data",
  "What to do with the numbers",
];

export function Body() {
  return (
    <>
      <Lede>
        Clinicians do not judge pelvic floor treatment on whether it feels
        better. They score it, using two short questionnaires that turn a
        symptom into a number you can repeat. The ICIQ-UI SF scores urinary
        leaking from 0 to 21 in three questions. The PFDI-20 covers bladder,
        bowel and prolapse symptoms in twenty. Both are free to fill in, both
        take minutes, and both are far more useful than a memory of how last
        month felt.
      </Lede>

      <H2>Why a bit better is not a measurement</H2>
      <P>
        Three things make self-assessment unreliable in exactly this area.
        Symptoms fluctuate week to week with sleep, illness, hydration,
        constipation and stress, so any single day is a poor sample. Memory
        rewrites: once you feel better, the past feels worse than it was, and
        once you feel discouraged, it feels as though nothing has ever changed.
        And the thing that improves first is often not the thing you are
        watching.
      </P>
      <P>
        A score fixes all three, because it asks the same questions about the
        same window of time every time you take it. It also converts your
        experience into something a urogynaecologist or a pelvic health
        physiotherapist recognises instantly, which turns a rushed appointment
        into a productive one.
      </P>

      <H2>The ICIQ-UI SF: three questions, zero to twenty one</H2>
      <P>
        The ICIQ-UI Short Form is the instrument most incontinence research
        reports, published by the ICIQ questionnaire group{" "}
        <Cite id="iciq">(ICIQ)</Cite>. It has three scored items and one unscored
        one:
      </P>
      <Table
        head={["Item", "What it asks", "Score range"]}
        rows={[
          ["1", "How often you leak urine", "0 to 5"],
          ["2", "How much you usually leak, protection or not", "0 to 6"],
          [
            "3",
            "How much leaking interferes with everyday life, on a scale from not at all to a great deal",
            "0 to 10",
          ],
          [
            "4",
            "When leaks happen: on coughing, on the way to the toilet, in your sleep, during activity, and so on. Not scored.",
            "Not scored",
          ],
        ]}
        caption="Total is the sum of items 1 to 3. Item 4 is not scored: it tells a clinician which kind of incontinence you are describing."
      />
      <P>
        The total runs from 0 to 21, and the published severity bands are 1 to 5
        slight, 6 to 12 moderate, 13 to 18 severe, and 19 to 21 very severe. A
        partial answer has no meaning: if you skip one of the three scored items,
        there is no total, and inventing one is worse than having none.
      </P>
      <Callout title="Get the real form, do not use a paraphrase">
        <P>
          The exact wording matters. These instruments are validated as written,
          and a reworded item is a different question with different published
          thresholds, which is why we describe the structure here rather than
          reprinting it. Download the actual questionnaire from{" "}
          <Cite id="iciq">the ICIQ group</Cite>, or ask your clinician for a copy.
        </P>
      </Callout>

      <H2>The PFDI-20: twenty questions, three subscales, zero to three hundred</H2>
      <P>
        The Pelvic Floor Distress Inventory short form is the wider instrument.
        Its twenty items split into three subscales, and its great advantage over
        the ICIQ is that it does not assume your problem is urinary.
      </P>
      <UL>
        <LI>
          <Strong>POPDI-6</Strong>, six items on prolapse symptoms: pressure,
          heaviness, a bulge, and the feeling of not emptying properly.
        </LI>
        <LI>
          <Strong>CRADI-8</Strong>, eight items on colorectal and anal symptoms:
          straining, incomplete emptying, leakage of stool or wind, pain with
          bowel movements.
        </LI>
        <LI>
          <Strong>UDI-6</Strong>, six items on urinary symptoms: frequency,
          urgency, leaking on effort, difficulty emptying, pain.
        </LI>
      </UL>
      <P>
        Each item scores 0 if you do not have the symptom at all, and 1 to 4 for
        how much it bothers you if you do. A subscale is the average of the items
        you answered, multiplied by 25, so each subscale runs 0 to 100. The total
        is the three subscales added together, so it runs 0 to 300.{" "}
        <Strong>Lower is better everywhere</Strong>, which trips people up
        constantly, because it is the opposite of a fitness score.
      </P>
      <P>
        The subscale split is the useful part. A total that barely moves while
        POPDI drops by 20 tells you the prolapse symptoms improved and the bowel
        symptoms did not, which is a completely different conversation from
        nothing worked.
      </P>

      <H2>How much change counts as real</H2>
      <P>
        A number that moves is not automatically a number that means something.
        Every instrument has noise, and researchers publish a minimum important
        difference: the smallest change that patients themselves report as a
        genuine improvement.
      </P>
      <Table
        head={["Instrument", "Range", "A change worth calling real"]}
        rows={[
          [
            "ICIQ-UI SF",
            "0 to 21, lower is better",
            "Around 2.5 points in a self-management population at four months. Published estimates vary with how strictly improvement is defined.",
          ],
          [
            "PFDI-20",
            "0 to 300, lower is better",
            "Roughly 13 to 23 points in conservative care, and higher, into the 20s to 50s, after surgery.",
          ],
        ]}
        caption="Sources: published minimum important difference estimates for each instrument. See the source list below."
      />
      <Figure
        value="2.5 points"
        label="Approximate minimum important difference for the ICIQ-UI SF reported in a self-management population at four months. Smaller changes are hard to distinguish from measurement noise."
        sourceId="iciqMID"
      />
      <P>
        The practical consequence: if your ICIQ total goes from 12 to 11, do not
        celebrate and do not despair. That is inside the noise. From 12 to 8 is a
        result <Cite id="iciqMID">(minimum important difference review)</Cite>.
        For the PFDI-20, the threshold depends on what kind of treatment you are
        having, and the conservative-care numbers are the relevant ones if you are
        doing exercises rather than having surgery{" "}
        <Cite id="pfdiMID">(MID and PASS estimates)</Cite>.
      </P>

      <H2>When to score, and how often</H2>
      <P>
        Both instruments ask about a recent window, so scoring weekly measures
        weather rather than climate. A schedule that works:
      </P>
      <OL>
        <NumLI>
          <Strong>Day 0, before you change anything.</Strong> This is the one
          people skip and the only one you cannot go back and collect. Score
          yourself the day you decide to start, not the day you notice progress.
        </NumLI>
        <NumLI>
          <Strong>Day 30.</Strong> Early. Expect coordination gains rather than
          symptom change, and do not read too much into a flat result.
        </NumLI>
        <NumLI>
          <Strong>Day 60.</Strong> The trend point. Two scores make a line, three
          make a direction.
        </NumLI>
        <NumLI>
          <Strong>Day 90.</Strong> The decision point, because ninety days is the
          trial length the guidelines use for pelvic floor muscle training{" "}
          <Cite id="niceNG123">(NICE NG123)</Cite>. Either it moved, or you have
          a specific, dated, scored reason to go back to a clinician.
        </NumLI>
      </OL>

      <H2>How we do it inside the app</H2>
      <P>
        Pelvi uses these two instruments and it uses them on exactly that
        schedule: it offers a progress check on program days 1, 30, 60 and 90,
        and it can always be postponed. It is deliberately not part of the daily
        check-in, because twenty-four questions bolted onto a thirty-second habit
        is how you kill the habit.
      </P>
      <P>
        Two design decisions are worth stating because they are the ones that
        make the number trustworthy. The item wording is the standard wording,
        not a friendlier rewrite, because a rewritten instrument is not the
        instrument any more and a score a clinician cannot trust is worse than no
        score. Where a clinical word is unavoidable, a plain English hint sits
        underneath the question rather than replacing it.
      </P>
      <P>
        The same principle governs how sessions get marked done. A video counts
        only once 80% of it has been watched, and a day counts only once 60% of
        that day's videos are complete. An app that marks a session done when you
        open it produces a beautiful adherence chart and a worthless experiment,
        and if the chart is worthless then so is any conclusion you draw from
        comparing it against your scores.
      </P>

      <H2>Four things that will ruin your data</H2>
      <UL>
        <LI>
          <Strong>Scoring only when you feel bad.</Strong> Or only when you feel
          good. Put the four dates in a calendar on day 0 and keep them.
        </LI>
        <LI>
          <Strong>Changing three things at once.</Strong> New exercises, less
          caffeine and a new medication in the same fortnight means you will
          never know which one worked.
        </LI>
        <LI>
          <Strong>Answering how you want to be rather than how you are.</Strong>{" "}
          Nobody sees this but you and, if you choose, your clinician.
        </LI>
        <LI>
          <Strong>Reading a rise as failure.</Strong> A worse score after an
          illness, a stressful month or a return to running is information. It
          tells you what loads your system, which is genuinely useful.
        </LI>
      </UL>

      <H2>What to do with the numbers</H2>
      <P>
        Take them with you. A scored baseline and a scored ninety-day follow-up
        turn an eight-minute appointment into a conversation about what to change
        rather than an attempt to reconstruct four months from memory. Both
        instruments are recognised immediately by pelvic health physiotherapists
        and urogynaecologists, which is exactly why they are worth using instead
        of a symptom diary you invented.
      </P>
      <P>
        And if the numbers have not moved after ninety days of doing the right
        things, that is not a wasted quarter. It is a documented, dated, scored
        trial of first-line treatment, which is the strongest possible position
        from which to ask for the next step.{" "}
        <Xref href="/blog/what-happens-at-a-pelvic-floor-physio-appointment">
          What that next appointment involves is here
        </Xref>
        .
      </P>

      <SeeSomeone
        title="A score is not a substitute for being seen"
        items={[
          "Any new blood, in urine or from the vagina outside a period, needs investigating regardless of what a questionnaire says.",
          "Pain is under-represented by both of these instruments. If pain is your main symptom, do not let a reassuring total talk you out of an appointment.",
          "A rising score over two consecutive checks means get assessed, not try harder.",
          "If you are pregnant or within a year of birth, the urgent maternal warning signs override any score.",
        ]}
      >
        <P>
          <Xref href="/blog/pelvic-floor-red-flags">
            The full red flag list is here
          </Xref>
          , and it is the article to read first if anything on this page made you
          uneasy.
        </P>
      </SeeSomeone>
    </>
  );
}
