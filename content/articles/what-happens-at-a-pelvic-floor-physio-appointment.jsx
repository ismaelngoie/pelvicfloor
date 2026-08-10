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
  "The whole appointment in one paragraph",
  "Why an assessment beats another month of guessing",
  "What to bring, and what to wear",
  "The questions, and why they are so personal",
  "The physical assessment, from the outside in",
  "The internal examination, and how to decline it",
  "What you leave with",
  "How many appointments, and what it costs",
  "How to find one",
];

export function Body() {
  return (
    <>
      <Lede>
        Most of a first pelvic floor physiotherapy appointment is talking. Expect
        twenty to thirty minutes of questions about bladder, bowel, sex and birth
        history, then a physical assessment that starts with how you breathe and
        move, and may end with an internal examination that you can decline at
        any point without losing the rest of the appointment.
      </Lede>

      <H2>The whole appointment in one paragraph</H2>
      <P>
        You arrive, you fill in some forms, and a physiotherapist takes a long
        history. She watches you breathe, and probably watches you stand, sit,
        squat or step, because the pelvic floor is part of a system and the
        system includes your ribcage, your hips and your feet. She may look
        externally to see whether the muscles move when you contract. She will
        offer an internal examination, explain what it tells her, and ask
        permission. Then you get findings in plain language and a home programme
        that is usually two or three specific things, not twenty. Typical length
        is 45 to 60 minutes for a first appointment.
      </P>

      <H2>Why an assessment beats another month of guessing</H2>
      <P>
        The single strongest argument for going is that the most important
        question in pelvic floor rehabilitation cannot be answered from the
        inside: is the muscle weak, or is it tight, or is it working the wrong
        way round? Those three need opposite treatments, and doing the wrong one
        makes symptoms worse rather than merely wasting time.
      </P>
      <P>
        The evidence on self-taught technique is not encouraging. In a classic
        study, women were given brief verbal instruction and then assessed:{" "}
        <Strong>only 49% produced an ideal contraction</Strong>, and{" "}
        <Strong>25% used a technique that could actually promote incontinence</Strong>
        , mostly by bearing down instead of lifting{" "}
        <Cite id="bumpTechnique">(Bump et al., 1991)</Cite>. The authors
        concluded that verbal or written instruction is not adequate preparation
        for starting a programme. That is the gap an assessment closes, and no
        app, video or article can close it for you.
      </P>
      <Figure
        value="49%"
        label="Proportion of women who produced an ideal pelvic floor contraction after brief verbal instruction. A quarter used a technique that could promote incontinence."
        sourceId="bumpTechnique"
      />
      <P>
        It is also what the guidelines assume. NICE recommends{" "}
        <Strong>supervised</Strong> pelvic floor muscle training as first-line
        treatment, not unsupervised training{" "}
        <Cite id="niceNG123">(NICE NG123)</Cite>. The supervision is part of the
        prescription.
      </P>

      <H2>What to bring, and what to wear</H2>
      <UL>
        <LI>
          <Strong>A three-day bladder diary</Strong> if bladder symptoms are the
          reason you are going. Times, rough amounts, what you drank, and any
          leaks with what you were doing. It is the most useful thing you can
          hand over.
        </LI>
        <LI>
          <Strong>A scored questionnaire</Strong>, so your symptoms are a number
          you can repeat in three months rather than an impression.{" "}
          <Xref href="/blog/how-to-measure-pelvic-floor-progress">
            The two clinicians actually use are here
          </Xref>
          .
        </LI>
        <LI>
          <Strong>A list of your medications</Strong>, including anything for
          blood pressure or mood, because some affect bladder and bowel function.
        </LI>
        <LI>
          <Strong>Your birth notes</Strong> if you have them and birth is
          relevant, particularly any record of tearing or an instrumental
          delivery.
        </LI>
        <LI>
          <Strong>Clothes you can move in.</Strong> Leggings or shorts rather
          than a fitted dress. You may be asked to squat, step or lift something.
        </LI>
      </UL>

      <H2>The questions, and why they are so personal</H2>
      <P>
        The history is long and it is unusually intimate, and that catches people
        off guard. You will be asked how many times a day you pass urine, whether
        you get there in time, whether you leak and what you were doing, what
        your bowels are like, whether you strain, whether sex hurts and where,
        what your periods do, how your babies were born, and what you have
        already tried.
      </P>
      <P>
        The reason is that the pelvic floor does four jobs at once, and a symptom
        in one is routinely caused by a problem in another. Constipation causes
        urinary urgency. Painful sex changes how you sit and breathe. A tear that
        healed badly changes how a muscle contracts. A physiotherapist who only
        asked about your presenting complaint would miss most of the useful
        information.
      </P>
      <Callout title="You can say the words">
        <P>
          There is no symptom in this area a pelvic health physiotherapist has
          not heard many times this month. Wind, smell, blood, faeces, pain during
          sex, not wanting sex, prolapse you can feel with a finger. Being
          specific is not oversharing, it is the diagnostic information.
        </P>
      </Callout>

      <H2>The physical assessment, from the outside in</H2>
      <P>
        The physical part usually moves in stages, and the early stages are fully
        clothed.
      </P>
      <OL>
        <NumLI>
          <Strong>Breathing and posture.</Strong> The diaphragm and the pelvic
          floor move together. Someone who braces and holds their breath all day
          is loading the pelvic floor with every task.
        </NumLI>
        <NumLI>
          <Strong>Movement.</Strong> Standing, sitting, squatting, stepping up,
          sometimes a cough or a jump if leaking is the issue. This is how the
          problem shows up in life, so it is where it should be tested.
        </NumLI>
        <NumLI>
          <Strong>The abdominal wall.</Strong> Checking for a gap between the
          abdominal muscles, and more importantly whether the midline can generate
          tension.
        </NumLI>
        <NumLI>
          <Strong>External observation.</Strong> Watching whether the perineum
          lifts on a contraction and lowers on a release, and whether anything
          descends when you bear down.
        </NumLI>
        <NumLI>
          <Strong>The internal examination</Strong>, if you consent to it.
        </NumLI>
      </OL>

      <H2>The internal examination, and how to decline it</H2>
      <P>
        A vaginal or rectal examination is the most informative single test,
        because it is the only way to feel strength, endurance, how quickly the
        muscle fires, whether it releases, whether there is a tender or overactive
        area, and whether there is any prolapse. It takes a few minutes, it uses
        one gloved finger and lubricant, and it should not hurt. It is not a
        speculum examination and it is not a smear.
      </P>
      <P>Your rights in that room, everywhere it is done properly:</P>
      <UL>
        <LI>
          <Strong>Consent is explicit and it is ongoing.</Strong> You should be
          told what will happen and why before anything begins, and you can stop
          at any moment, including halfway through, without giving a reason.
        </LI>
        <LI>
          <Strong>You can decline entirely</Strong> and still have a useful
          appointment. Say so at the start. A good clinician will tell you what
          she loses by not doing it and then get on with the rest.
        </LI>
        <LI>
          <Strong>You can ask for a chaperone.</Strong> In many settings one is
          offered as standard, and you are entitled to request one anywhere.
        </LI>
        <LI>
          <Strong>You can bring someone</Strong> into the room with you.
        </LI>
        <LI>
          <Strong>You can ask for a female clinician</Strong>, though
          availability varies.
        </LI>
      </UL>
      <P>
        If any of that is not offered, that is a reason to find a different
        clinician, not a reason to give up on the treatment.
      </P>

      <H2>What you leave with</H2>
      <P>
        A good first appointment ends with three things: an explanation you can
        repeat to someone else, a home programme small enough to actually do, and
        a plan for what happens next.
      </P>
      <Table
        head={["If the finding is", "The plan usually starts with"]}
        rows={[
          [
            "Weak, poorly coordinated pelvic floor",
            "Strength and endurance training at a specific dose, progressed into upright positions and then into load.",
          ],
          [
            "Overactive or tight pelvic floor",
            "Downtraining first: breathing, release positions, sometimes manual therapy. Strengthening is deliberately postponed.",
          ],
          [
            "Bearing down instead of lifting",
            "Retraining the contraction itself, often with feedback, before any dose is set at all.",
          ],
          [
            "Urgency driving the symptoms",
            "Bladder training for a minimum of six weeks, with pelvic floor work supporting it.",
          ],
          [
            "Prolapse symptoms",
            "Load management, pelvic floor training, and a conversation about a pessary or a referral.",
          ],
        ]}
        caption="Same symptom, opposite plans. This is why the assessment comes before the programme."
      />

      <H2>How many appointments, and what it costs</H2>
      <P>
        A common pattern is an initial assessment, a review three to six weeks
        later, then a small number of follow-ups spaced further apart. Most of
        the work happens at home in between, which is where an app earns its
        place: not as a replacement for the assessment, but as the thing that
        gets the home programme done on the days nobody is watching.{" "}
        <Xref href="/blog/how-to-choose-a-pelvic-floor-app">
          How to judge one, including ours, is here
        </Xref>
        .
      </P>
      <P>
        Cost varies enormously by country and by insurance. In the UK, pelvic
        health physiotherapy is available on the NHS and privately, and some NHS
        services take self-referrals while others need a GP. In the US, most
        states allow some level of direct access to physical therapy without a
        physician referral, and many plans cover it, though the details differ by
        plan and by state. Check the clinic's own page before you assume you need
        a referral.
      </P>

      <H2>How to find one</H2>
      <UL>
        <LI>
          <Strong>United States.</Strong> The{" "}
          <Cite id="aptaPelvic">APTA Pelvic Health locator</Cite> lists physical
          therapists with pelvic health training by location.
        </LI>
        <LI>
          <Strong>United Kingdom.</Strong> <Cite id="pogp">POGP</Cite> is the
          professional network for pelvic, obstetric and gynaecological
          physiotherapy and has a public directory.
        </LI>
        <LI>
          <Strong>Elsewhere.</Strong> Search for "pelvic health physiotherapist"
          plus your city rather than "physiotherapist", and check that internal
          assessment is offered. It is the difference between a pelvic health
          clinician and a generalist.
        </LI>
      </UL>

      <SeeSomeone
        title="Book sooner rather than later if"
        items={[
          "You are more than three months postpartum and still leaking, in pain, or feeling a bulge.",
          "You cannot tell whether you are contracting or bearing down.",
          "Exercises are making your symptoms worse.",
          "Sex is painful, or you cannot tolerate penetration.",
          "You are leaking from the bowel or losing control of wind.",
          "You have been doing the right things for eight weeks and nothing has changed.",
        ]}
      >
        <P>
          For symptoms that need an emergency department rather than an
          appointment,{" "}
          <Xref href="/blog/pelvic-floor-red-flags">the red flag list is here</Xref>
          .
        </P>
      </SeeSomeone>
    </>
  );
}
