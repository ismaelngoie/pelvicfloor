import {
  Callout,
  Cite,
  Figure,
  H2,
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
  "What falling oestrogen changes down there",
  "Two problems that look like one",
  "Pelvic floor training still works after menopause",
  "Local vaginal oestrogen is a real option, and a conversation",
  "If sex has become painful, do not start with kegels",
  "Prolapse symptoms often surface around now",
  "What to actually do this month",
  "See someone if this is you",
];

export function Body() {
  return (
    <>
      <Lede>
        Leaks, urgency, dryness and painful sex that arrive around menopause are
        usually two problems wearing one coat. One is muscle, and pelvic floor
        training treats it. The other is tissue, and training does not touch it.
        Working out which parts of your symptoms belong to which is the whole
        difference between six useful months and six frustrating ones.
      </Lede>

      <H2>What falling oestrogen changes down there</H2>
      <P>
        Oestrogen receptors are dense in the vagina, the urethra, the bladder
        base and the pelvic floor's supporting tissue. When oestrogen falls, that
        tissue becomes thinner, drier and less elastic, and blood flow to it
        drops. The collective name for the resulting symptoms is the genitourinary
        syndrome of menopause, and it covers vaginal dryness, burning and
        itching, discomfort or pain with sex, urinary urgency, more frequent
        urinary tract infections, and leaks.
      </P>
      <P>
        Two things follow from that list. First, this is not a strength problem,
        so a stronger pelvic floor does not reverse it. Second, unlike hot
        flushes, it does not settle on its own with time. It tends to persist and
        slowly progress unless it is treated, which is precisely why it is worth
        naming rather than tolerating.
      </P>

      <H2>Two problems that look like one</H2>
      <P>
        Symptoms tell you which lane you are mostly in, and most women around
        menopause are in both.
      </P>
      <Table
        head={["More likely a muscle problem", "More likely a tissue problem"]}
        rows={[
          [
            "Leaking on a cough, sneeze, laugh, lift or jump",
            "Dryness, burning, itching or soreness at rest",
          ],
          [
            "A heavy or dragging feeling that is worse by the end of the day",
            "Pain at the entrance on penetration, or a stinging, papercut feeling",
          ],
          [
            "Symptoms that improve with training and worsen when you stop",
            "Repeated urinary tract infections",
          ],
          [
            "You cannot feel a contraction, or it fades fast",
            "Symptoms that arrived alongside other menopausal changes and are creeping worse",
          ],
        ]}
        caption="Most women have some of both columns. The treatments are different and they are not alternatives to each other."
      />

      <H2>Pelvic floor training still works after menopause</H2>
      <P>
        The evidence for pelvic floor muscle training is not age-limited. In the
        Cochrane review of 31 trials and 1,817 women, those with stress urinary
        incontinence who trained were eight times more likely to report cure than
        controls, 56% versus 6% <Cite id="cochranePFMT">(Cochrane, 2018)</Cite>.
        Guidelines make supervised pelvic floor muscle training of at least three
        months the first-line treatment for stress or mixed incontinence in
        women, with no upper age at which that stops applying{" "}
        <Cite id="niceNG123">(NICE NG123)</Cite>.
      </P>
      <Figure
        value="56% vs 6%"
        label="Reported cure of stress urinary incontinence with pelvic floor muscle training versus no treatment or an inactive control, across four trials graded high-quality evidence."
        sourceId="cochranePFMT"
      />
      <P>
        Muscle responds to training at every age. What changes after menopause is
        that training on its own is more often only half the answer, and that the
        recovery of tissue quality is a separate job with a separate treatment.
      </P>

      <H2>Local vaginal oestrogen is a real option, and a conversation</H2>
      <P>
        Vaginal oestrogen, given locally as a cream, pessary, tablet or ring, is
        a recognised treatment for urogenital symptoms of menopause and is
        covered in the NICE menopause guideline{" "}
        <Cite id="niceNG23">(NICE NG23)</Cite>. It is a different treatment from
        systemic hormone replacement therapy, with a different dose, a different
        route and a different risk profile, and the two are frequently confused
        in conversation and online.
      </P>
      <Callout tone="safety" title="This part is not ours to advise on">
        <P>
          Whether local oestrogen is appropriate for you depends on your medical
          history, and there are histories where it needs specialist input. That
          is a conversation with a GP, a gynaecologist or a menopause specialist,
          not a decision to make from an article. What we would say is this: a
          lot of women never have the conversation at all, because nobody told
          them the option existed.
        </P>
      </Callout>
      <P>
        Non-hormonal options exist too and are worth knowing about: vaginal
        moisturisers used regularly are different from lubricants used for sex,
        and both have a place. Neither replaces a clinical assessment if
        something hurts.
      </P>

      <H2>If sex has become painful, do not start with kegels</H2>
      <P>
        This is the most consequential mistake in this whole area. When
        penetration hurts, the pelvic floor learns to guard: it tightens
        protectively in anticipation, which makes the next attempt hurt more,
        which reinforces the guarding. Adding a strengthening programme to a
        muscle that is already holding on is likely to make the pain worse rather
        than better.
      </P>
      <P>
        The sequence that tends to help is the opposite one: settle the tissue,
        release the muscle, and only then think about strength. That usually
        means addressing dryness properly, working on release and breathing
        rather than contraction, and often working with a pelvic health
        physiotherapist who can tell you where the tenderness actually is.{" "}
        <Xref href="/blog/guide-to-releasing-a-tight-pelvic-floor">
          Our guide to releasing a tight pelvic floor
        </Xref>{" "}
        is the better starting point than anything on this page about
        strengthening.
      </P>

      <H2>Prolapse symptoms often surface around now</H2>
      <P>
        A feeling of heaviness, dragging, or a bulge you can feel is common and
        frequently first noticed in the years around menopause, partly because
        the supporting tissue changes and partly because it has had decades to
        develop.{" "}
        <Cite id="acogProlapse">ACOG's patient page on pelvic support problems</Cite>{" "}
        is a calm and accurate place to read about it, which matters because the
        search results for prolapse are not.
      </P>
      <P>
        The important message is that prolapse is treatable and that surgery is
        not the only route. Pelvic floor muscle training, load management and
        pessaries are all conservative options, and which one fits depends on
        what is prolapsing and how far. That is a finding, and findings need an
        examination.
      </P>

      <H2>What to actually do this month</H2>
      <UL>
        <LI>
          <Strong>Separate your symptoms into the two columns above.</Strong> It
          takes five minutes and it determines everything else.
        </LI>
        <LI>
          <Strong>Score yourself before you change anything.</Strong>{" "}
          <Xref href="/blog/how-to-measure-pelvic-floor-progress">
            The ICIQ-UI SF and the PFDI-20
          </Xref>{" "}
          take about ten minutes together and give you a baseline you cannot go
          back and collect later.
        </LI>
        <LI>
          <Strong>If leaks are on effort</Strong>, start the guideline dose:{" "}
          <Xref href="/blog/how-many-kegels-should-i-do-a-day">
            at least 8 contractions three times a day
          </Xref>
          , for at least three months.
        </LI>
        <LI>
          <Strong>If the problem is urgency</Strong>, start{" "}
          <Xref href="/blog/bladder-training-plan-for-urgency">
            bladder training
          </Xref>{" "}
          instead. It is the first-line treatment for that pattern.
        </LI>
        <LI>
          <Strong>Book the tissue conversation.</Strong> Dryness, burning,
          repeated infections and pain with sex are the ones that will not
          improve with training, and they have their own treatments.
        </LI>
      </UL>
      <Callout title="What we do and do not have">
        <P>
          Pelvi has nine 90-day programs, and none of them is called menopause.
          The three that map onto these symptoms are the bladder leaks program,
          the pelvic pain program, which starts with release rather than
          strengthening, and the intimacy program. If your symptoms are mostly in
          the tissue column, a training app is not the tool you need first, and
          we would rather say so.
        </P>
      </Callout>

      <H2>See someone if this is you</H2>
      <SeeSomeone
        items={[
          "Any bleeding after menopause. Even once, even spotting, even if you are certain it is nothing. This always needs investigating.",
          "Pain with sex, or you cannot tolerate penetration.",
          "Repeated urinary tract infections, or burning when you pass urine.",
          "A bulge, heaviness or dragging feeling in the vagina.",
          "New or worsening pelvic pain.",
          "Three months of correct training with no change in leaking at all.",
        ]}
      >
        <P>
          A pelvic health physiotherapist can assess the muscle side; a GP,
          gynaecologist or menopause specialist handles the hormonal side. Find a
          physiotherapist through <Cite id="aptaPelvic">APTA Pelvic Health</Cite>{" "}
          in the US or <Cite id="pogp">POGP</Cite> in the UK.
        </P>
      </SeeSomeone>
    </>
  );
}
