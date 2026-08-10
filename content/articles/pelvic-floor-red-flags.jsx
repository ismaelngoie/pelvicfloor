import {
  Callout,
  Cite,
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
  "Go to an emergency department today for any of these",
  "Pregnant, or within a year of giving birth? A separate list applies",
  "Stop the exercises and book an appointment for these",
  "Common, treatable, and not urgent",
  "What is not a red flag, even though it feels like one",
  "How to get seen, and what to say when you do",
];

export function Body() {
  return (
    <>
      <Lede>
        Most pelvic floor symptoms are common, unglamorous and very treatable.
        A small number are not, and they are worth knowing by name so that you
        can tell the difference at 11pm without a search engine. This page is the
        list. It is deliberately blunt, and it is the one article on this site we
        would rather you read before any of the others.
      </Lede>

      <Callout tone="safety" title="If you are unsure, be seen">
        <P>
          Nothing written here can examine you. Reading a list and deciding you
          are probably fine is the failure mode this page is trying to prevent,
          not the outcome it wants. If a symptom is new, severe, or frightening,
          the correct response is a clinician, not more reading.
        </P>
      </Callout>

      <H2>Go to an emergency department today for any of these</H2>
      <P>
        These are not "book an appointment next week" symptoms. They are same-day
        symptoms, and in the first three cases minutes matter.
      </P>
      <UL>
        <LI>
          <Strong>
            You cannot pass urine at all, or you can only pass small amounts and
            still feel painfully full.
          </Strong>{" "}
          A bladder that cannot empty is an emergency.
        </LI>
        <LI>
          <Strong>
            New numbness or tingling in the saddle area, the parts of you that
            would touch a bicycle seat, especially alongside new bladder or bowel
            problems and weakness or numbness in both legs.
          </Strong>{" "}
          This combination is how cauda equina syndrome presents. It is rare, it
          is a surgical emergency, and delay causes permanent damage. Do not wait
          until morning.
        </LI>
        <LI>
          <Strong>Heavy vaginal bleeding</Strong>, soaking through a pad in an
          hour, or passing large clots.
        </LI>
        <LI>
          <Strong>
            Fever with pelvic or back pain, feeling shivery, confused or very
            unwell.
          </Strong>{" "}
          Infection in the urinary tract can move fast.
        </LI>
        <LI>
          <Strong>Sudden severe pelvic pain</Strong> that is unlike anything you
          have had before, particularly with faintness, vomiting, or a positive
          pregnancy test.
        </LI>
      </UL>

      <H2>Pregnant, or within a year of giving birth? A separate list applies</H2>
      <P>
        Everything above still counts, and there is a further list that overrides
        it. The US Centers for Disease Control publishes a set of urgent maternal
        warning signs that apply during pregnancy and for a full year afterwards{" "}
        <Cite id="cdcWarningSigns">(CDC Hear Her)</Cite>. The reason for the
        one-year window is that serious postpartum complications do not stop at
        the six-week check, and they are routinely missed because everyone,
        including the woman herself, assumes the dangerous part is over.
      </P>
      <P>
        Seek care immediately for a severe headache that will not go away or is
        getting worse, changes in your vision, a fever of 100.4F (38C) or higher,
        trouble breathing, chest pain or a fast-beating heart, extreme swelling of
        your hands or face, dizziness or fainting, severe belly pain that does not
        go away, severe nausea and vomiting, or thoughts of harming yourself or
        your baby. The full list, and the reasoning behind it, is on the{" "}
        <Cite id="cdcWarningSigns">CDC's page</Cite>, and it is worth reading in
        full while you are well rather than while you are frightened.
      </P>
      <Callout tone="safety" title="Say the sentence">
        <P>
          If you are not being taken seriously, the phrase clinicians are trained
          to respond to is: "I am worried something is seriously wrong." Say it
          plainly, and say that you are pregnant or how many weeks postpartum you
          are, because it changes the differential diagnosis entirely.
        </P>
      </Callout>

      <H2>Stop the exercises and book an appointment for these</H2>
      <P>
        None of these is an emergency. All of them mean that continuing to
        strengthen is the wrong move until someone has worked out what is going
        on, because in each case the most likely explanations include a pelvic
        floor that is too tight rather than too weak, and strengthening a tight
        muscle makes it tighter.
      </P>
      <Table
        head={["What you notice", "Why it changes the plan"]}
        rows={[
          [
            "Pelvic floor exercises make your symptoms worse",
            "The most common reason is an overactive, shortened pelvic floor that needs release before strength.",
          ],
          [
            "Pain with sex, or you cannot tolerate penetration",
            "Adding contractions to a muscle that is already guarding usually increases the guarding.",
          ],
          [
            "A bulge, heaviness or dragging in the vagina, or something you can feel",
            "That is the classic description of pelvic organ prolapse. It is treatable, often without surgery, but the plan depends on what is prolapsing and how far.",
          ],
          [
            "Leaking from the bowel, or losing control of wind",
            "Anal incontinence is under-reported and very treatable, and it needs assessing rather than exercising blindly.",
          ],
          [
            "Difficulty emptying your bladder or bowel, or never feeling finished",
            "Straining and incomplete emptying both load the pelvic floor further, and both have specific fixes.",
          ],
          [
            "Pain that wakes you at night, or that is getting steadily worse",
            "Night pain and progressive pain are the two patterns that most often mean something other than muscle.",
          ],
          [
            "Any bleeding you cannot explain, in urine or from the vagina outside a period",
            "Blood always needs a cause found, even once, even a small amount, even if you are sure it is nothing.",
          ],
        ]}
      />
      <P>
        Prolapse in particular has a lot of frightening search results and a much
        calmer clinical reality:{" "}
        <Cite id="acogProlapse">ACOG's patient page on pelvic support problems</Cite>{" "}
        is a good place to start before you read anything else about it.
      </P>

      <H2>Common, treatable, and not urgent</H2>
      <P>
        For balance, because a red-flag list read alone makes everything feel
        sinister. These are things a lot of people have, that respond well to the
        right treatment, and that do not need an emergency department.
      </P>
      <UL>
        <LI>
          Leaking when you cough, sneeze, laugh, lift or jump. First-line
          treatment is supervised pelvic floor muscle training for at least three
          months <Cite id="niceNG123">(NICE NG123)</Cite>.
        </LI>
        <LI>
          Sudden urgency and getting to the toilet in time. First-line treatment
          is bladder training for a minimum of six weeks{" "}
          <Cite id="niceNG123">(NICE NG123)</Cite>, and{" "}
          <Xref href="/blog/bladder-training-plan-for-urgency">
            the protocol is here
          </Xref>
          .
        </LI>
        <LI>
          Not being able to feel your pelvic floor working. Very common, and the
          single best reason to book an assessment rather than a warning sign in
          itself.
        </LI>
        <LI>
          A gap in the abdominal muscles after pregnancy. Extremely common, and
          it is a function question more than a width question.
        </LI>
      </UL>

      <H2>What is not a red flag, even though it feels like one</H2>
      <P>
        Three things people worry about that, on their own, are not causes for
        alarm.
      </P>
      <H3>Being unable to feel a contraction on day one</H3>
      <P>
        This is normal and it is a starting point, not a diagnosis. It is the
        thing an assessment resolves fastest.
      </P>
      <H3>Mild muscle soreness after starting</H3>
      <P>
        Like any muscle, the pelvic floor can ache a little when it is first
        worked. What is not normal is pain, an ache that persists all day, or
        symptoms that get worse over a week rather than better.
      </P>
      <H3>Progress that stalls for a fortnight</H3>
      <P>
        Recovery is not linear, and two flat weeks inside a three-month trial is
        noise rather than failure. Eight weeks of nothing at all is a different
        conversation, and{" "}
        <Xref href="/blog/how-long-until-pelvic-floor-exercises-work">
          the realistic timeline is here
        </Xref>
        .
      </P>

      <H2>How to get seen, and what to say when you do</H2>
      <P>
        For anything non-urgent on this page, a pelvic health physiotherapist is
        usually the right first appointment. In much of the US you can refer
        yourself directly under direct access rules and find someone through the{" "}
        <Cite id="aptaPelvic">APTA Pelvic Health locator</Cite>. In the UK, some
        NHS services accept self-referral for pelvic health and others need a GP
        letter; <Cite id="pogp">POGP</Cite> lists practitioners.{" "}
        <Xref href="/blog/what-happens-at-a-pelvic-floor-physio-appointment">
          What actually happens in that appointment is here
        </Xref>
        , because not knowing is the reason most people never book one.
      </P>
      <P>Take four things with you and the appointment doubles in value:</P>
      <UL>
        <LI>A three-day bladder diary, if bladder symptoms are the issue.</LI>
        <LI>
          A scored questionnaire, so your symptoms are a number rather than a
          memory.{" "}
          <Xref href="/blog/how-to-measure-pelvic-floor-progress">
            The two clinicians use are here
          </Xref>
          .
        </LI>
        <LI>
          A short history: when it started, what makes it worse, what you have
          already tried and for how long.
        </LI>
        <LI>
          The question you actually came to ask, written down. It is
          extraordinarily easy to leave without asking it.
        </LI>
      </UL>

      <SeeSomeone
        title="The short version, if you remember nothing else"
        items={[
          "Cannot pass urine, saddle numbness, heavy bleeding, fever with pelvic pain, or sudden severe pain: emergency department, today.",
          "Pregnant or within a year of birth with any CDC urgent maternal warning sign: emergency care now.",
          "Pain, a bulge, blood, bowel leakage, or exercises making things worse: stop the exercises and book an assessment.",
          "Everything else: three months of the right training, measured properly, then reassess.",
        ]}
      />
    </>
  );
}
