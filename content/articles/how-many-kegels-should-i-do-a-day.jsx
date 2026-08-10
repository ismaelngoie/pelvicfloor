import {
  Callout,
  Cite,
  Figure,
  H2,
  H3,
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
  "The guideline dose is 8 contractions, three times a day",
  "Why the internet says a hundred and the guideline says twenty four",
  "Split them: long holds and quick squeezes do different jobs",
  "The rest between contractions is part of the exercise",
  "How to progress without adding more reps",
  "When more kegels is the wrong answer entirely",
  "What a day of this looks like in practice",
  "See someone if this is you",
];

export function Body() {
  return (
    <>
      <Lede>
        The dose in the clinical guideline is at least 8 contractions, performed
        3 times a day. That is 24 a day, not the 100 or 300 you see quoted
        online, and it should be sustained for at least three months. The bigger
        question is not how many but what kind: long holds and quick squeezes
        train different things, and most symptoms need both.
      </Lede>

      <H2>The guideline dose is 8 contractions, three times a day</H2>
      <P>
        NICE states that pelvic floor muscle training programmes should comprise{" "}
        <Strong>at least 8 contractions performed 3 times per day</Strong>, and
        that a supervised programme of at least 3 months is the first-line
        treatment for stress or mixed urinary incontinence{" "}
        <Cite id="niceNG123">(NICE NG123)</Cite>. That is the whole prescription.
        Twenty four contractions a day, most days, for twelve weeks.
      </P>
      <Figure
        value="8 x 3"
        label="At least eight contractions, three times a day, sustained for at least three months. The dose written into the NICE guideline for pelvic floor muscle training."
        sourceId="niceNG123"
      />
      <P>
        It is a floor, not a ceiling: a physiotherapist who has examined you may
        prescribe more, or fewer, or a completely different emphasis. But if you
        are training on your own and want a number that is defensible, this is
        it.
      </P>

      <H2>Why the internet says a hundred and the guideline says twenty four</H2>
      <P>
        Because counting is easy and quality is not. A pelvic floor contraction
        is a small, deep, internal lift. It fatigues fast, and when it fatigues
        the body recruits substitutes: the gluteals, the adductors on the inside
        of the thighs, the abdominal wall, and the breath held to brace the whole
        cylinder. By repetition sixty, most people are no longer training the
        muscle they set out to train.
      </P>
      <P>
        Worse, some people compensate by bearing down instead of lifting up,
        which pushes pressure towards the pelvic floor rather than away from it.
        Doing that a hundred times a day is not a neutral waste of effort. So the
        rule is simple: when the quality of a contraction drops, the set is
        finished, whatever the number says.
      </P>

      <H2>Split them: long holds and quick squeezes do different jobs</H2>
      <P>
        The pelvic floor has to do two unrelated jobs, and training only one of
        them explains a lot of stalled progress.
      </P>
      <UL>
        <LI>
          <Strong>Long holds</Strong> train endurance: the low-level, all-day
          support that keeps things where they belong while you stand, walk and
          carry a toddler. Build towards holding 8 to 10 seconds cleanly.
        </LI>
        <LI>
          <Strong>Quick squeezes</Strong> train speed: the fast contraction that
          has to fire in the split second before a cough, a sneeze or a jump
          spikes the pressure in your abdomen. Strength is no use here if it
          arrives late.
        </LI>
      </UL>
      <P>
        A practical split for one of your three daily sets, once you are
        confident about technique:
      </P>
      <Table
        head={["Part of the set", "What to do", "Why"]}
        rows={[
          [
            "Long holds",
            "8 contractions, hold each one as long as you can hold it cleanly, up to 10 seconds. Rest the same length of time.",
            "Endurance. This is the number the guideline dose refers to.",
          ],
          [
            "Quick squeezes",
            "8 to 10 fast, full contractions with a complete release between each.",
            "Speed and reflex. This is what catches a sneeze.",
          ],
          [
            "One functional rep",
            "One deliberate squeeze just before something that usually makes you leak.",
            "Transfers the skill into real life, where you actually need it.",
          ],
        ]}
      />

      <H2>The rest between contractions is part of the exercise</H2>
      <P>
        Letting go completely matters as much as squeezing. A muscle that never
        returns to its resting length is not getting stronger, it is getting
        shorter and more irritable, and a shortened pelvic floor produces its own
        set of symptoms: urgency, pain with penetration, difficulty emptying, a
        constant low ache.
      </P>
      <P>
        Rest at least as long as you held. If you held for six seconds, rest for
        six. If your release feels vague, or you cannot tell whether you have let
        go, that is worth knowing about, and it is one of the things an internal
        examination answers immediately.
      </P>
      <Callout title="A quick check on release">
        <P>
          Take a slow breath in and let your belly and ribs widen. On a genuine
          release, the pelvic floor drops and softens as the diaphragm descends.
          If nothing changes on the inhale, you may be holding tension you had
          not noticed.
        </P>
      </Callout>

      <H2>How to progress without adding more reps</H2>
      <P>
        Progression in any muscle comes from increasing the demand, and reps are
        only one of four ways to do that. The other three are usually better here.
      </P>
      <OL>
        <NumLI>
          <Strong>Hold longer.</Strong> Three seconds to five to eight to ten.
          This is the first thing to push.
        </NumLI>
        <NumLI>
          <Strong>Change position.</Strong> Lying down is easiest because gravity
          is helping. Progress to sitting, then standing, then standing with your
          feet apart. Most leaking happens upright, so training upright is not
          optional.
        </NumLI>
        <NumLI>
          <Strong>Add movement.</Strong> Hold while you shift weight, step, or
          go up a stair. The goal is a pelvic floor that works while you are busy
          doing something else.
        </NumLI>
        <NumLI>
          <Strong>Add load.</Strong> Only once the first three are solid: lifting,
          carrying, jumping, running. This is where a lot of people who did
          everything right on the mat find out they never trained for the thing
          that actually leaks.
        </NumLI>
      </OL>

      <H2>When more kegels is the wrong answer entirely</H2>
      <P>
        There are two situations where adding repetitions predictably makes
        things worse.
      </P>
      <H3>An overactive or tight pelvic floor</H3>
      <P>
        If squeezing produces an ache, if you need the toilet more after doing
        them, if sex hurts, or if you have chronic pelvic, hip or low back pain,
        the muscle may already be short and overworking. What that needs is
        length and release before strength, and pushing more contractions into it
        is genuinely counterproductive.
      </P>
      <H3>Urgency rather than pressure leaks</H3>
      <P>
        If your leaks are preceded by a sudden desperate need to go, rather than
        triggered by a cough or a jump, the first-line treatment in the guidelines
        is bladder training for a minimum of six weeks, not more kegels{" "}
        <Cite id="niceNG123">(NICE NG123)</Cite>. Quick pelvic floor contractions
        are part of settling an urge, but they are a component of the technique
        rather than the treatment.{" "}
        <Xref href="/blog/bladder-training-plan-for-urgency">
          The bladder training protocol is here
        </Xref>
        .
      </P>

      <H2>What a day of this looks like in practice</H2>
      <P>
        Twenty four contractions is roughly five minutes of actual work spread
        across a day, which is why the hard part is never the effort. It is
        remembering. Attach each set to something you already do without thinking:
        the kettle boiling, the commute, brushing your teeth.
      </P>
      <P>
        Our own programs are built to that shape. Each of the nine goals in Pelvi
        has a 13-week plan behind it, one session a day, five minutes at a time,
        drawn from 533 filmed exercises so you can watch the movement rather than
        interpret a paragraph about it. The point of filming them is exactly the
        problem this article keeps circling: written instructions are how people
        end up training the wrong muscle.
      </P>
      <P>
        Whatever you use to remember, the underlying prescription is the one at
        the top of this page, and you should be able to hold your app to it. If
        it cannot deliver eight contractions three times a day for three months,
        it is not delivering the treatment the guideline describes.{" "}
        <Xref href="/blog/how-to-choose-a-pelvic-floor-app">
          Here is how we would judge one, including ours
        </Xref>
        .
      </P>

      <H2>See someone if this is you</H2>
      <SeeSomeone
        items={[
          "You cannot feel anything at all when you try to contract, or you cannot tell whether you are lifting or bearing down.",
          "Kegels reliably make your symptoms worse rather than better.",
          "Sex is painful, or you cannot tolerate penetration.",
          "You feel a bulge, heaviness or dragging inside the vagina.",
          "You are leaking from the bowel, or losing control of wind.",
          "Emptying your bladder or bowel is difficult, or you feel you never finish.",
          "You have new pelvic pain, or pain that wakes you at night.",
        ]}
      >
        <P>
          An internal examination is the only way to tell weak from tight, and it
          takes one appointment. Find someone through{" "}
          <Cite id="aptaPelvic">APTA Pelvic Health</Cite> in the US or{" "}
          <Cite id="pogp">POGP</Cite> in the UK.
        </P>
      </SeeSomeone>
    </>
  );
}
