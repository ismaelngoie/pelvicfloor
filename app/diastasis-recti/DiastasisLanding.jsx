"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ArrowDown, ArrowRight, Check, ChevronLeft, ChevronRight, CircleCheck, Heart, MonitorPlay, ShieldCheck, Smartphone, Wind } from "lucide-react";
import { DEFAULT_PRICE_LABEL, DEFAULT_PRICE_PERIOD, PRICE_CURRENCY } from "@/lib/pricing";
import { rememberPlan } from "@/lib/postPurchase";
import { diastasisSuccessPath } from "@/lib/diastasisEntry";
import InlineExercisePreview from "@/components/diastasis/InlineExercisePreview";
import styles from "./diastasis.module.css";

const CheckoutSheet = dynamic(() => import("@/components/funnel/CheckoutSheet"), { ssr: false });
const GOAL_ID = "diastasisRecti";
const CTA = "Start Fixing My Diastasis Recti";

const GALLERY = [
  { label: "Your plan", src: "/diastasis/at-home-720.webp", alt: "A woman practicing a breathing exercise at home", caption: "Your daily plan. Ready when you are." },
  { label: "Coach videos", src: "/diastasis/app-player.webp", alt: "Actual Pelvi app with a paused Supine Abdominal Bracing coach video", caption: "Watch the coach. Follow each step." },
  { label: "Check-ins", src: "/diastasis/app-check-in.webp", alt: "Actual Pelvi app: daily core self-assessment questions", caption: "Keep track of how your core feels." },
];

const PRESS = [
  ["CafeMom", "cafe-mom.png"], ["Women’s Health", "womens-health.png"],
  ["TODAY", "today.png"], ["NPR", "npr.png"],
  ["USA TODAY", "usa-today.png"], ["Mother Muse", "mother-muse.png"],
];

const FAQ = [
  ["What is diastasis recti?", "It is a gap between the two sides of your stomach muscles. It is common after pregnancy. Strength and how you feel when moving matter as well as the size of the gap."],
  ["What results can I expect in 12 weeks?", "Regular exercise can build core strength. Research on closing the gap has mixed results, and Pelvi has not been tested in a clinical trial. Use 12 weeks to review your progress, rather than as a deadline for healing. Gap closure, a flat stomach and visible results are not guaranteed. Your plan continues for 90 days."],
  ["Is the whole session five minutes?", "Five minutes is a simple starting habit. Follow the coach videos, then practice at your own pace. Full sessions can take longer as your plan builds."],
  ["What if I had my baby years ago?", "You can still work on core strength. If the gap has stayed or you have symptoms, a pelvic health physiotherapist can help you understand what you need."],
  ["Can I use this after a C-section?", "Ask your doctor or physiotherapist when to start, especially after a C-section, surgery or birth complications. Stop if exercise causes pain."],
  ["What does the self-assessment do?", "Simple check-ins ask about pressure, a ridge or bulge during exercise, and how confident you feel moving. They help you record your experience. They do not measure the gap, diagnose a condition or replace a medical assessment."],
  ["Is this just breathing and kegels?", "No. Start with breathing and gentle core exercises. Then build up to heel slides, marching, bridges and everyday lifting practice. Videos show you the steps, with tips on breathing and when to make a move easier."],
  ["Do I need equipment or an app download?", "Open Pelvi in Safari or Chrome on your phone. No App Store download or special equipment is needed. A mat or comfortable floor space helps. Some exercises use a chair or wall."],
  ["What am I paying for?", `Your Pelvi membership is ${DEFAULT_PRICE_LABEL} ${PRICE_CURRENCY} per ${DEFAULT_PRICE_PERIOD}, automatically renewed until you cancel. It includes your diastasis plan and the member tools shown here. The 90-day plan describes the program length, not a one-time payment.`],
  ["Can I cancel or get a refund?", "Cancel future payments from You → Subscription → Manage or cancel. For the 7-day money-back guarantee, email contact@pelvi.health within 7 days. You do not need to complete any exercises to ask for a refund. See the full terms below."],
];

function Phone({ src, alt, className = "" }) {
  return <div className={`${styles.phone} ${className}`}><img src={src} alt={alt} width="390" height={src.includes("check-in") ? "556" : "844"} loading="lazy" decoding="async" /></div>;
}

export default function DiastasisLanding() {
  const [active, setActive] = useState(0);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutPath, setCheckoutPath] = useState("/diastasis-recti/start?paid=1");
  const [offerVisible, setOfferVisible] = useState(false);
  const offerRef = useRef(null);
  const scrollRef = useRef(null);
  const touchX = useRef(null);
  const closeCheckout = useCallback(() => setCheckoutOpen(false), []);

  useEffect(() => {
    const target = offerRef.current;
    if (!target || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setOfferVisible(entry.isIntersecting), { root: scrollRef.current, threshold: 0.45 });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  const beginCheckout = (event) => {
    event?.preventDefault();
    rememberPlan({ goalId: GOAL_ID, name: "" });
    setCheckoutPath(diastasisSuccessPath(window.location.search));
    setCheckoutOpen(true);
  };

  return (
    <div ref={scrollRef} className={styles.page}>
      <a href="#dr-product" className={styles.skip}>Skip to the plan</a>
      <div className={styles.announcement}>Start with 5 minutes a day. Build a habit for your core.</div>
      <header className={styles.header}>
        <a href="/" className={styles.logo} aria-label="Pelvi Health home">pelvi<span>®</span></a>
        <span className={styles.headerNote}>YOUR DAILY DIASTASIS RECTI PLAN</span>
        <a href="/app" className={styles.login}>Member log in <ArrowRight size={14} aria-hidden="true" /></a>
      </header>

      <section id="dr-product" className={styles.product} aria-labelledby="dr-title">
        <div className={styles.visualColumn}>
          <div className={styles.gallery} onTouchStart={e => { touchX.current = e.changedTouches[0].clientX; }} onTouchEnd={e => { if (touchX.current === null) return; const delta = e.changedTouches[0].clientX - touchX.current; if (Math.abs(delta) > 55) setActive(current => (current + (delta < 0 ? 1 : -1) + GALLERY.length) % GALLERY.length); touchX.current = null; }}>
            {active === 0 ? <div className={styles.overview}>
              <img className={styles.heroPhoto} src="/diastasis/at-home-1200.webp" srcSet="/diastasis/at-home-720.webp 720w, /diastasis/at-home-1200.webp 1200w" sizes="(min-width: 1000px) 50vw, 100vw" alt="A woman practicing relaxed breathing at home" width="1200" height="800" fetchPriority="high" />
              <span className={styles.galleryTag}>DAILY COACH VIDEOS</span>
              <div className={styles.heroMessage}>5 minutes.<br /><em>A place to start.</em></div>
              <Phone src="/diastasis/app-player.webp" alt={GALLERY[1].alt} className={styles.heroPhone} />
            </div> : <div className={`${styles.screenStage} ${active === 2 ? styles.checkInStage : ""}`}>
              <div className={styles.screenLabel}>INSIDE YOUR PELVI PLAN <span>0{active}</span></div>
              <Phone src={GALLERY[active].src} alt={GALLERY[active].alt} />
              <p>{GALLERY[active].caption}</p>
            </div>}
            <button className={`${styles.galleryArrow} ${styles.previous}`} type="button" aria-label="Previous product image" onClick={() => setActive((active + GALLERY.length - 1) % GALLERY.length)}><ChevronLeft size={20} /></button>
            <button className={`${styles.galleryArrow} ${styles.next}`} type="button" aria-label="Next product image" onClick={() => setActive((active + 1) % GALLERY.length)}><ChevronRight size={20} /></button>
          </div>
          <div className={styles.thumbnails} role="group" aria-label="Explore your plan">
            {GALLERY.map((item, i) => <button type="button" key={item.label} aria-label={`View ${item.label.toLowerCase()}`} aria-pressed={active === i} className={`${styles.thumbnail} ${active === i ? styles.selected : ""}`} onClick={() => setActive(i)}><img src={item.src} alt="" width="60" height="60" loading="lazy" /><span>{item.label}</span></button>)}
          </div>
          <p className={styles.screenNote}>Real Pelvi app screens, shown with example data.</p>
        </div>

        <div className={styles.offerColumn}>
          <p className={styles.eyebrow}>YOUR DIASTASIS RECTI EXERCISE PLAN</p>
          <h1 id="dr-title">Rebuild your core.<br /><em>Without surgery.</em></h1>
          <p className={styles.heroCopy}><strong>Start with 5 minutes a day.</strong><span>Daily coach videos. Simple exercises for your abdominal separation. Full sessions can take longer.</span></p>
          <div className={styles.price}><strong>{DEFAULT_PRICE_LABEL}</strong><span>{PRICE_CURRENCY} / {DEFAULT_PRICE_PERIOD}<small>Full Pelvi membership</small></span></div>
          <p className={styles.billingTerms}>Monthly membership. Renews until canceled.</p>
          <ul className={styles.benefits}>
            <li><Check size={17} /> Guided Core Self-Assessment</li>
            <li><Check size={17} /> Pressure-Aware Approach</li>
            <li><Check size={17} /> Track Your Progress for 12 Weeks</li>
          </ul>
          <div ref={offerRef} id="dr-offer" className={styles.purchase}>
            <button type="button" className={styles.primary} onClick={beginCheckout}><span>{CTA}</span><ArrowRight size={18} aria-hidden="true" /></button>
            <p className={styles.socialProof}>Join <strong>10,734+ women</strong> fixing their Diastasis Recti</p>
          </div>
          <div className={styles.guarantee}><ShieldCheck size={23} /><p><strong>7 days to make sure it’s for you.</strong><span>Money back for any reason. <a href="#dr-refund" onClick={() => { const details = document.getElementById("dr-refund"); if (details) details.open = true; }}>How it works</a></span></p></div>
        </div>
      </section>

      <section className={styles.press} aria-label="Publications covering diastasis recti">
        <p>Diastasis recti, in the news</p>
        <div className={styles.pressLogos}>{PRESS.map(([name, file]) => <img key={file} src={`/diastasis/press/${file}`} alt={name} width="160" height="48" loading="lazy" />)}</div>
      </section>
      <InlineExercisePreview />

      <div className={styles.trustStrip}><span><Smartphone size={17} /> iPhone + Android</span><span><Heart size={17} /> At your own pace</span><span><MonitorPlay size={17} /> TV playback options</span></div>

      <section className={styles.recognition} aria-labelledby="dr-recognition">
        <p className={styles.eyebrow}>LESS GUESSING. A CLEAR DAILY PLAN.</p>
        <h2 id="dr-recognition">Worried about the gap?<br /><em>Know what to do next.</em></h2>
        <p>No more saving random exercises.<br className={styles.desktopBreak} /> Open today’s plan and follow the coach.</p>
        <div className={styles.recognitionBottom}><span>One day at a time.</span><span>Your next step is ready. <ArrowDown size={16} /></span></div>
      </section>

      <section className={styles.method} aria-labelledby="dr-method">
        <div className={styles.methodImage}><img src="/diastasis/at-home-1200.webp" alt="A gentle breathing exercise at home" width="1200" height="800" loading="lazy" decoding="async" /></div>
        <div className={styles.methodCopy}><p className={styles.eyebrow}>MAKE TIME FOR YOUR CORE</p><h2 id="dr-method">Open your plan.<br /><em>Follow your coach.</em></h2>
          <ol className={styles.steps}>
            <li><span>01</span><div><h3>Know what to do today.</h3><p>Your daily exercises are ready when you open Pelvi.</p></div></li>
            <li><span>02</span><div><h3>Watch the coach. Then practice.</h3><p>Clear videos show each move, with breathing tips and easier options.</p></div></li>
            <li><span>03</span><div><h3>See how you’re doing.</h3><p>Answer a few simple questions and keep track as you go.</p></div></li>
          </ol>
        </div>
      </section>

      <section className={styles.inside} aria-labelledby="dr-inside">
        <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>INSIDE YOUR MEMBERSHIP</p><h2 id="dr-inside">Daily guidance.<br /><em>Right on your phone.</em></h2></div><p>Open in Safari or Chrome.<br />No App Store download.</p></div>
        <div className={styles.appShowcase}>
          <article><div className={styles.appImage}><Phone src="/diastasis/app-player.webp" alt={GALLERY[1].alt} /></div><span>01 / DAILY COACH VIDEOS</span><h3>See every move.</h3><p>Pause, replay and follow at your own pace.</p></article>
          <article><div className={`${styles.appImage} ${styles.tvImage}`}><MonitorPlay size={48} aria-hidden="true" /><h3>Your coach.<br />On your TV.</h3><p>AirPlay + Chromecast options<br />on supported devices.</p></div><span>02 / MORE ROOM TO FOLLOW</span><h3>Use your bigger screen.</h3><p>Keep your phone close or watch on a supported TV.</p></article>
          <article><div className={styles.appImage}><Phone src="/diastasis/app-check-in.webp" alt={GALLERY[2].alt} /></div><span>03 / SIMPLE SELF-ASSESSMENTS</span><h3>Track how your core feels.</h3><p>Keep a record of pressure, control and confidence.</p></article>
        </div>
        <p className={styles.demoNote}>Actual Pelvi web app, shown with example data. Sessions vary with your plan.</p>
      </section>

      <section className={styles.progression} aria-labelledby="dr-progression">
        <div><p className={styles.eyebrow}>90 DAYS. ONE CLEAR NEXT STEP.</p><h2 id="dr-progression">Start gently.<br /><em>Build from there.</em></h2><p>Begin with the basics. Add more as your plan builds.<br />Missed a day? Pick up where you left off.</p></div>
        <ol className={styles.phases}>
          <li><Wind size={24} /><div><span>LEARN THE BASICS</span><h3>Breathe. Feel. Control.</h3><p>Learn how to breathe with each move and when to make it easier.</p></div></li>
          <li><CircleCheck size={24} /><div><span>ADD GENTLE MOVEMENT</span><h3>Slide. March. Bridge.</h3><p>Practice simple moves with step-by-step videos.</p></div></li>
          <li><Heart size={24} /><div><span>BRING IT INTO DAILY LIFE</span><h3>Lift. Move. Keep building.</h3><p>Build up to lifting practice and more challenging core exercises.</p></div></li>
        </ol>
      </section>

      <section className={styles.evidence} aria-labelledby="dr-evidence"><p className={styles.eyebrow}>MAKE TIME FOR YOUR PROGRESS</p><h2 id="dr-evidence">Make the next<br /><em>12 weeks count.</em></h2><p>Practice regularly. Track how movement feels.<br />Give your core a clear plan to follow.</p><details><summary>What does the research say about results? <span>+</span></summary><div><p>A 12-week exercise trial improved strength without closing the gap. Reviews have mixed findings on gap reduction. These studies did not test Pelvi, and they do not guarantee your results. Some people need individual treatment or surgery.</p><a href="https://pubmed.ncbi.nlm.nih.gov/37286390/" target="_blank" rel="noopener noreferrer">Read the 12-week study ↗</a><a href="https://pubmed.ncbi.nlm.nih.gov/41995773/" target="_blank" rel="noopener noreferrer">Read the 2026 research review ↗</a><a href="https://pubmed.ncbi.nlm.nih.gov/41995887/" target="_blank" rel="noopener noreferrer">Read the second 2026 review ↗</a><a href="https://www.nhs.uk/baby/support-and-services/your-post-pregnancy-body/" target="_blank" rel="noopener noreferrer">NHS advice after pregnancy ↗</a></div></details></section>

      <section className={styles.faq} aria-labelledby="dr-faq"><div><p className={styles.eyebrow}>BEFORE YOU START</p><h2 id="dr-faq">Your questions.<br /><em>Simple answers.</em></h2><p>Need a hand?<br /><a href="mailto:contact@pelvi.health">contact@pelvi.health</a></p></div><div className={styles.faqList}>{FAQ.map(([question, answer], i) => <details key={question} id={i === FAQ.length - 1 ? "dr-refund" : undefined}><summary>{question}<span>+</span></summary><p>{answer} {i === FAQ.length - 1 && <a href="/terms">Read the full terms</a>}</p></details>)}</div></section>

      <section className={styles.finalOffer}><div><p className={styles.eyebrow}>START WITH 5 MINUTES A DAY</p><h2>Your core.<br /><em>Your next step.</em></h2><p>Daily coach videos. A clear plan for diastasis recti.</p><div className={styles.finalPrice}>{DEFAULT_PRICE_LABEL}<span>{PRICE_CURRENCY} / {DEFAULT_PRICE_PERIOD}</span></div><p className={styles.finalTerms}>Monthly membership. Renews until canceled.</p><button type="button" className={styles.primary} onClick={beginCheckout}><span>{CTA}</span><ArrowRight size={18} aria-hidden="true" /></button><p className={styles.finalSocial}>Join 10,734+ women fixing their Diastasis Recti</p></div><div className={styles.finalArt}><Phone src="/diastasis/app-player.webp" alt={GALLERY[1].alt} /><span>DAILY COACH<br /><em>videos.</em></span></div></section>

      <footer className={styles.footer}><div><a href="/" className={styles.logo}>pelvi<span>®</span></a><p>Core care. In your corner.</p></div><nav aria-label="Landing page footer"><a href="/app">Member log in</a><a href="mailto:contact@pelvi.health">Contact</a><a href="/terms">Terms & refunds</a><a href="/privacy-policy">Privacy</a></nav><p className={styles.suitability}>Recently had a C-section or abdominal surgery, have pain, a known hernia or clinician restrictions? Ask your clinician before starting. Stop if exercise causes pain. Pelvi provides exercise guidance and education, not diagnosis or medical care.</p><p className={styles.copyright}>© {new Date().getFullYear()} Pelvi Health. Lifestyle imagery is illustrative.</p></footer>

      {!offerVisible && !checkoutOpen && <div className={styles.stickyOffer}><div><strong>{DEFAULT_PRICE_LABEL}<small> / {DEFAULT_PRICE_PERIOD}</small></strong><span>7-day money-back guarantee</span></div><button type="button" onClick={beginCheckout}><span>{CTA}</span><ArrowRight size={17} aria-hidden="true" /></button></div>}
      {checkoutOpen && <CheckoutSheet open onClose={closeCheckout} goalId={GOAL_ID} successPath={checkoutPath} />}
    </div>
  );
}
