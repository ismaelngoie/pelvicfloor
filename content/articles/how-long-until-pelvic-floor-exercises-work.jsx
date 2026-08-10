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

// Must match the H2 headings below, in order. It builds the "On this page" list.
export const headings = [
  "Three months is the number the guidelines use",
  "What changes first is control, not leaking",
  "A realistic week by week picture",
  "What the evidence says you can expect at the end",
  "Four reasons a timeline stalls",
  "Why our own program runs 90 days",
  "When to stop waiting and get assessed",
];

export function Body() {
  return (
    <>
      <Lede>
        Give it three months before you decide it has not worked. That is the
        trial length written into the clinical guidelines, and it is longer than
        almost anyone expects. What you should notice much sooner, within two or
        three weeks, is not fewer leaks but better control: being able to find
        the muscle, hold it deliberately, and let it go completely.
      </Lede>

      <H2>Three months is the number the guidelines use</H2>
      <P>
        The UK's National Institute for Health and Care Excellence tells
        clinicians to offer a supervised pelvic floor muscle training programme
        of{" "}
        <Strong>at least 3 months' duration as first-line treatment</Strong> for
        women with stress or mixed urinary incontinence{" "}
        <Cite id="niceNG123">(NICE NG123)</Cite>. Three months is not a
        suggestion about how long to be patient. It is the point at which the
        treatment is considered to have had a fair trial, and it is the point at
        which the next step, whether that is more specialist input or a different
        treatment altogether, gets considered.
      </P>
      <P>
        That number matters because of what it rules out. If you have been doing
        pelvic floor exercises for eleven days and concluded they do not work for
        you, you have not run the experiment. And if someone sold you a two-week
        fix, they were describing something other than muscle training.
      </P>

      <H2>What changes first is control, not leaking</H2>
      <P>
        Pelvic floor training improves three separate things on three separate
        timelines, and confusing them is why the first month feels like nothing
        is happening.
      </P>
      <UL>
        <LI>
          <Strong>Awareness and coordination</Strong> come first, often within
          one to three weeks. This is the ability to isolate the pelvic floor
          without clenching your glutes, thighs or abdominals, and to release it
          fully afterwards. It is a skill, and skills improve quickly.
        </LI>
        <LI>
          <Strong>Endurance</Strong> follows. Holding a contraction for eight
          seconds instead of three, or getting through a set without the last
          repetition collapsing, tends to shift between weeks three and eight.
        </LI>
        <LI>
          <Strong>Symptom change</Strong> is last, because it depends on the
          first two being reliable enough to work automatically, under pressure,
          when you are not thinking about it. This is the part that takes the
          full three months.
        </LI>
      </UL>
      <P>
        So the honest early win is not a dry day. It is noticing, one afternoon,
        that you tightened before you sneezed without deciding to.
      </P>

      <H2>A realistic week by week picture</H2>
      <P>
        This is a typical trajectory, not a promise. Individual recovery varies
        enormously with what caused the problem, how long it has been there, and
        whether the pelvic floor is weak or already too tight.
      </P>
      <Table
        head={["When", "What most people notice", "What to focus on"]}
        rows={[
          [
            "Week 1 to 2",
            "You can find the muscle and feel a lift. Contractions are short and you tire fast.",
            "Technique and full release. Lying down is easier than sitting.",
          ],
          [
            "Week 3 to 4",
            "Holds get longer and steadier. You start catching pressure moments deliberately.",
            "Adding quick contractions alongside long holds.",
          ],
          [
            "Week 5 to 8",
            "First symptom changes for many people: fewer or smaller leaks, less urgency.",
            "Training in the positions you actually leak in, standing and moving.",
          ],
          [
            "Week 9 to 12",
            "Control starts to feel automatic rather than remembered.",
            "Load: stairs, lifting, running, whatever your real life demands.",
          ],
          [
            "After 12 weeks",
            "This is the point at which the trial has been run and can be judged.",
            "Either maintenance, or a reassessment if nothing has changed.",
          ],
        ]}
        caption="A common pattern in pelvic floor rehabilitation. Your own timeline may be faster or slower, and slower is not failure."
      />

      <H2>What the evidence says you can expect at the end</H2>
      <P>
        The strongest evidence for pelvic floor muscle training is a Cochrane
        review of 31 trials covering 1,817 women. Among women with stress urinary
        incontinence, those who did pelvic floor muscle training were{" "}
        <Strong>eight times more likely to report cure</Strong> than women who
        had no treatment or an inactive control: 56% versus 6%{" "}
        <Cite id="cochranePFMT">(Cochrane, 2018)</Cite>. Across all types of
        urinary incontinence together, the training group was five times more
        likely to report cure, 35% versus 6%.
      </P>
      <Figure
        value="56% vs 6%"
        label="Women with stress urinary incontinence reporting cure after pelvic floor muscle training, compared with no treatment or an inactive control. Risk ratio 8.38, from four trials and 165 women, graded high-quality evidence."
        sourceId="cochranePFMT"
      />
      <P>
        Read those numbers carefully, because they cut both ways. Cure is common
        and it is worth the three months. Cure is also not universal: in the same
        high-quality evidence, roughly two in five women with stress incontinence
        did not report cure. That is the honest shape of this treatment, and it
        is why a plan that has no next step after ninety days is not a plan.
      </P>

      <H2>Four reasons a timeline stalls</H2>
      <P>
        If eight weeks of genuinely consistent practice has changed nothing at
        all, the usual cause is not that you need to try harder. It is one of
        these four, and three of them get worse with more effort.
      </P>
      <H3>You are contracting the wrong thing</H3>
      <P>
        This is the most common single reason, and it is invisible from the
        inside. Squeezing the buttocks, gripping the inner thighs, sucking in the
        stomach or, worst of all, bearing down instead of lifting all feel like
        doing something. One assessment with a pelvic health physiotherapist
        settles it, which is the whole argument for{" "}
        <Xref href="/blog/what-happens-at-a-pelvic-floor-physio-appointment">
          booking one early rather than late
        </Xref>
        .
      </P>
      <H3>The muscle is tight, not weak</H3>
      <P>
        A pelvic floor that never fully releases is already working, all day, and
        strengthening it is like adding weight to a cramp. The tell is that
        symptoms include urgency, pain with sex, difficulty emptying, or a
        constant low ache, and that kegels make them worse rather than better.
      </P>
      <H3>The dose is wrong</H3>
      <P>
        Too little and nothing adapts. Too much and quality collapses. The
        guideline dose is specific and smaller than most people assume, which is{" "}
        <Xref href="/blog/how-many-kegels-should-i-do-a-day">
          worth reading on its own
        </Xref>
        .
      </P>
      <H3>The problem is not a pelvic floor problem</H3>
      <P>
        Urgency that comes on suddenly and gets you on the way to the bathroom
        responds to{" "}
        <Xref href="/blog/bladder-training-plan-for-urgency">
          bladder training
        </Xref>
        , which guidelines recommend for a minimum of six weeks as a first-line
        treatment in its own right <Cite id="niceNG123">(NICE NG123)</Cite>.
        Doing kegels for a bladder problem is training the wrong system.
      </P>

      <H2>Why our own program runs 90 days</H2>
      <P>
        We build Pelvi around the same three-month trial, not around a number
        that sounded good in an advert. Each of the nine goals has a 13-week
        program behind it, which is 90 days, split into weekly themes with a
        specific session for each day. Behind those sessions sits a library of
        533 filmed exercises, because reading "lift and hold" is a poor
        substitute for watching someone do it.
      </P>
      <P>
        Two details about how it counts progress, since honest measurement is the
        whole point of a three-month trial. A video only counts as done once you
        have watched 80% of it, and a day only counts once 60% of that day's
        videos are done. Those thresholds exist because an app that marks a
        session complete when you open it produces a lovely chart and a useless
        experiment.
      </P>
      <Callout title="What the plan does not do">
        <P>
          It cannot examine you, and it cannot tell whether your pelvic floor is
          weak or tight. Nothing on a phone can. If you have pain, a bulge, or
          symptoms that are getting worse, an assessment comes first and the app
          comes second.
        </P>
      </Callout>

      <H2>When to stop waiting and get assessed</H2>
      <P>
        Three months is the trial length for training that is going in the right
        direction. It is not a reason to wait three months with something that is
        getting worse.
      </P>
      <SeeSomeone
        items={[
          "Nothing has changed at all after 8 weeks of honest, near daily practice. Get your technique checked before you spend another month on it.",
          "The exercises make your symptoms worse: more urgency, more ache, more pain during sex.",
          "You feel a bulge, heaviness or dragging in the vagina, or something you can feel with a finger.",
          "There is pain: with sex, with sitting, with emptying your bladder or bowels.",
          "There is blood you cannot explain, in urine or from the vagina outside a period.",
          "You are leaking from the bowel, or you cannot control wind.",
          "You are pregnant or within a year of giving birth and something feels wrong. Check the urgent maternal warning signs first.",
        ]}
      >
        <P>
          You can find a pelvic health physiotherapist directly through the{" "}
          <Cite id="aptaPelvic">APTA Pelvic Health locator</Cite> in the US or{" "}
          <Cite id="pogp">POGP</Cite> in the UK. In much of the US you can refer
          yourself without seeing a doctor first.
        </P>
      </SeeSomeone>
    </>
  );
}
