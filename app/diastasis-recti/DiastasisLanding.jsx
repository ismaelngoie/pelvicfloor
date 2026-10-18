"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ArrowDown, ArrowRight, Check, ChevronLeft, ChevronRight, CircleCheck, Heart, LockKeyhole, MonitorPlay, Play, ShieldCheck, Smartphone, Wind } from "lucide-react";
import { DEFAULT_PRICE_LABEL, DEFAULT_PRICE_PERIOD, PRICE_CURRENCY } from "@/lib/pricing";
import { isValidEmail } from "@/lib/checkout";
import { rememberPlan } from "@/lib/postPurchase";
import { diastasisSuccessPath, rememberDiastasisEntry } from "@/lib/diastasisEntry";
import styles from "./diastasis.module.css";

const CheckoutSheet = dynamic(() => import("@/components/funnel/CheckoutSheet"), { ssr: false });
const DiastasisPreview = dynamic(() => import("@/components/diastasis/DiastasisPreview"), { ssr: false });
const GOAL_ID = "diastasisRecti";

const GALLERY = [
  { label: "The plan", src: "/diastasis/at-home-720.webp", alt: "A calm at-home breathing practice", caption: "A little space for you. A clear next step." },
  { label: "The guidance", src: "/diastasis/app-practice.webp", alt: "Actual Pelvi web app: guided abdominal bracing practice with a timer and doming cues", caption: "Watch once. Then practice, with clear cues." },
  { label: "The videos", src: "/diastasis/app-player.webp", alt: "Actual Pelvi web app: Supine Abdominal Bracing video and session controls", caption: "See the movement. Follow at your own pace." },
  { label: "The check-ins", src: "/diastasis/app-check-in.webp", alt: "Actual Pelvi web app: daily questions about doming, deep-core connection and confidence", caption: "Track how movement feels, beyond the gap." },
];

const FAQ = [
  ["What is diastasis recti?", "It is a widening between the two sides of your abdominal muscles, common after pregnancy. The gap is only part of the picture: strength, coordination and how you feel moving matter too."],
  ["How soon could I notice a difference?", "Think consistent practice over weeks. Studies commonly assess changes over 8–12 weeks, with mixed results. Your 90-day plan gives you a clear routine; gap closure, a flat stomach and a particular recovery date are not guaranteed."],
  ["What if I had my baby years ago?", "You can still work on core strength and movement confidence. Your starting point matters more than a countdown from birth. If you have a persistent gap or symptoms, a pelvic health physiotherapist can assess your needs."],
  ["Can I use this after a C-section?", "Ask your clinician when to start, especially after a C-section, abdominal surgery or birth complications. This plan does not replace an examination or individual medical advice. Stop if exercise causes pain."],
  ["Is this just breathing and kegels?", "No. The plan starts with breathing and core awareness, then builds through heel slides, marching, bridges, lifting practice and later supported strength work. Practice is adjustable, with demonstrations and guidance on pressure and doming."],
  ["Do I need equipment or an App Store download?", "No special equipment or App Store download is needed. Open Pelvi in Safari or Chrome on your phone. A comfortable floor space or mat helps, and some movements use a chair or wall for support."],
  ["What am I paying for?", `Your Pelvi membership is ${DEFAULT_PRICE_LABEL} ${PRICE_CURRENCY} per ${DEFAULT_PRICE_PERIOD}, automatically renewed until you cancel. It includes your diastasis plan and the member tools shown here. The 90-day plan describes the program length, not a one-time payment.`],
  ["Can I cancel or get a refund?", "Cancel future renewals from You → Subscription → Manage or cancel. Your separate 7-day money-back guarantee has no exercise requirement: email contact@pelvi.health within 7 days. See the full subscription and guarantee terms below."],
];

function Phone({ src, alt, className = "" }) {
  return <div className={`${styles.phone} ${className}`}><img src={src} alt={alt} width="390" height={src.includes("check-in") ? "556" : "844"} loading="lazy" decoding="async" /></div>;
}

export default function DiastasisLanding() {
  const [active, setActive] = useState(0);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutPath, setCheckoutPath] = useState("/diastasis-recti/start?paid=1");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [offerVisible, setOfferVisible] = useState(false);
  const offerRef = useRef(null);
  const emailRef = useRef(null);
  const scrollRef = useRef(null);
  const touchX = useRef(null);
  const closeCheckout = useCallback(() => setCheckoutOpen(false), []);
  const closePreview = useCallback(() => setPreviewOpen(false), []);

  useEffect(() => {
    const target = offerRef.current;
    if (!target || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setOfferVisible(entry.isIntersecting), { root: scrollRef.current, threshold: 0.45 });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  const beginCheckout = (event) => {
    event?.preventDefault();
    if (!isValidEmail(email)) {
      setEmailError("Enter a valid email address, like name@example.com.");
      emailRef.current?.focus();
      return;
    }
    setEmailError("");
    rememberPlan({ goalId: GOAL_ID, name: "" });
    rememberDiastasisEntry({ email: email.trim() });
    setCheckoutPath(diastasisSuccessPath(window.location.search));
    setCheckoutOpen(true);
  };

  const goToOffer = () => {
    if (isValidEmail(email)) { beginCheckout(); return; }
    offerRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "center" });
    emailRef.current?.focus({ preventScroll: true });
  };

  return (
    <div ref={scrollRef} className={styles.page}>
      <a href="#dr-product" className={styles.skip}>Skip to the plan</a>
      <div className={styles.announcement}>A little practice. A stronger connection to you.</div>
      <header className={styles.header}>
        <a href="/" className={styles.logo} aria-label="Pelvi Health home">pelvi<span>®</span></a>
        <span className={styles.headerNote}>CORE CARE, AT YOUR PACE</span>
        <a href="/app" className={styles.login}>Member log in <ArrowRight size={14} aria-hidden="true" /></a>
      </header>

      <section id="dr-product" className={styles.product} aria-labelledby="dr-title">
        <div className={styles.visualColumn}>
          <div className={styles.gallery} onTouchStart={e => { touchX.current = e.changedTouches[0].clientX; }} onTouchEnd={e => { if (touchX.current === null) return; const delta = e.changedTouches[0].clientX - touchX.current; if (Math.abs(delta) > 55) setActive(current => (current + (delta < 0 ? 1 : -1) + GALLERY.length) % GALLERY.length); touchX.current = null; }}>
            {active === 0 ? <div className={styles.overview}>
              <img className={styles.heroPhoto} src="/diastasis/at-home-1200.webp" srcSet="/diastasis/at-home-720.webp 720w, /diastasis/at-home-1200.webp 1200w" sizes="(min-width: 1000px) 50vw, 100vw" alt="A woman practicing relaxed breathing at home" width="1200" height="800" fetchPriority="high" />
              <span className={styles.galleryTag}>THE 90-DAY CORE PLAN</span>
              <div className={styles.heroMessage}>Your body.<br /><em>Your way forward.</em></div>
              <Phone src="/diastasis/app-practice.webp" alt={GALLERY[1].alt} className={styles.heroPhone} />
            </div> : <div className={`${styles.screenStage} ${active === 3 ? styles.checkInStage : ""}`}>
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
          <p className={styles.screenNote}>Real web-app screens. Example practice and check-ins.</p>
        </div>

        <div className={styles.offerColumn}>
          <p className={styles.eyebrow}>DIASTASIS RECTI · AT-HOME CORE TRAINING</p>
          <h1 id="dr-title">Feel stronger<br /><em>through your middle.</em></h1>
          <p className={styles.heroCopy}>A clear, progressive 90-day plan for your core.<br className={styles.desktopBreak} /> Less guessing. More guided movement.</p>
          <div className={styles.price}><strong>{DEFAULT_PRICE_LABEL}</strong><span>{PRICE_CURRENCY} / {DEFAULT_PRICE_PERIOD}<small>Full Pelvi membership</small></span></div>
          <ul className={styles.benefits}>
            <li><Check size={17} /> Your daily routine, already laid out</li>
            <li><Check size={17} /> Clear video demos + adjustable practice</li>
            <li><Check size={17} /> Start in your browser. No download needed.</li>
          </ul>
          <form ref={offerRef} id="dr-offer" className={styles.purchaseForm} onSubmit={beginCheckout}>
            <label htmlFor="dr-email">Where should we send your receipt?</label>
            <input ref={emailRef} id="dr-email" type="email" name="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck="false" placeholder="Your email address" required maxLength={254} value={email} onChange={event => { setEmail(event.target.value); setEmailError(""); }} aria-invalid={Boolean(emailError)} aria-describedby={`dr-email-hint${emailError ? " dr-email-error" : ""}`} data-clarity-mask="true" />
            <p id="dr-email-hint" className={styles.emailHint}>Use your Google or Apple account email for easy access later.</p>
            {emailError && <p id="dr-email-error" role="alert" className={styles.emailError}>{emailError}</p>}
            <button type="submit" className={styles.primary}>Start My Core Plan <ArrowRight size={18} aria-hidden="true" /></button>
            <p className={styles.renewal}>{DEFAULT_PRICE_LABEL} {PRICE_CURRENCY} billed every {DEFAULT_PRICE_PERIOD} until you cancel.<br />Cancel future renewals in your account.</p>
            <div className={styles.wallets} aria-label="Secure Stripe checkout. Apple Pay and Google Pay appear on eligible devices; card payment is available."><LockKeyhole size={13} /><span>Secure checkout</span><b>Apple Pay</b><b>Google Pay</b><b>Card</b></div>
            <p className={styles.walletNote}>Wallet availability depends on your device and Stripe.</p>
          </form>
          <div className={styles.guarantee}><ShieldCheck size={23} /><p><strong>7 days to make sure it’s for you.</strong><span>Money back for any reason. <a href="#dr-refund" onClick={() => { const details = document.getElementById("dr-refund"); if (details) details.open = true; }}>How it works</a></span></p></div>
          <button type="button" className={styles.previewLink} onClick={() => setPreviewOpen(true)}><Play size={14} fill="currentColor" /> Take a look inside first</button>
        </div>
      </section>

      <div className={styles.trustStrip}><span><Smartphone size={17} /> iPhone + Android</span><span><Heart size={17} /> At your own pace</span><span><MonitorPlay size={17} /> TV playback options</span></div>

      <section className={styles.recognition} aria-labelledby="dr-recognition">
        <p className={styles.eyebrow}>A STARTING POINT THAT MAKES SENSE</p>
        <h2 id="dr-recognition">“I just want to know<br /><em>what to do.”</em></h2>
        <p>Doming when you sit up. A middle that feels unfamiliar.<br className={styles.desktopBreak} /> Too many saved videos, and no clear plan.</p>
        <div className={styles.recognitionBottom}><span>You don’t need another rabbit hole.</span><span>You need your next step. <ArrowDown size={16} /></span></div>
      </section>

      <section className={styles.method} aria-labelledby="dr-method">
        <div className={styles.methodImage}><img src="/diastasis/at-home-1200.webp" alt="Comfortable breathing practice in a quiet living room" width="1200" height="800" loading="lazy" decoding="async" /><button type="button" onClick={() => setPreviewOpen(true)}><span><Play size={18} fill="currentColor" /></span> See a real exercise <ArrowRight size={17} /></button></div>
        <div className={styles.methodCopy}><p className={styles.eyebrow}>YOUR ROUTINE, TAKEN CARE OF</p><h2 id="dr-method">Open. Follow.<br /><em>Carry on with your day.</em></h2>
          <ol className={styles.steps}>
            <li><span>01</span><div><h3>Know what to do today.</h3><p>Your next session is ready, with short exercise demonstrations.</p></div></li>
            <li><span>02</span><div><h3>See it. Feel it. Practice it.</h3><p>Follow the video, then use guided practice and clear pressure cues.</p></div></li>
            <li><span>03</span><div><h3>Build from there.</h3><p>Adjust the dose. Log a check-in. Come back to your next step.</p></div></li>
          </ol>
        </div>
      </section>

      <section className={styles.inside} aria-labelledby="dr-inside">
        <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>THIS IS WHAT YOU GET</p><h2 id="dr-inside">A plan you can <em>actually see yourself using.</em></h2></div><p>Your phone. A comfortable spot.<br />A little time for your core.</p></div>
        <div className={styles.appShowcase}>
          <article><div className={styles.appImage}><Phone src="/diastasis/app-player.webp" alt={GALLERY[2].alt} /></div><span>01 / SEE THE MOVEMENT</span><h3>Every move, demonstrated.</h3><p>Pause, replay or follow on a supported TV.</p></article>
          <article><div className={styles.appImage}><Phone src="/diastasis/app-practice.webp" alt={GALLERY[1].alt} /></div><span>02 / MAKE IT YOUR PRACTICE</span><h3>More than pressing play.</h3><p>Timed practice and cues for your own session.</p></article>
          <article><div className={styles.appImage}><Phone src="/diastasis/app-check-in.webp" alt={GALLERY[3].alt} /></div><span>03 / NOTICE YOUR PROGRESS</span><h3>Check in with your body.</h3><p>Doming, deep-core connection and confidence.</p></article>
        </div>
        <p className={styles.demoNote}>Actual Pelvi web app, shown with example data. Sessions vary with your plan.</p>
      </section>

      <section className={styles.progression} aria-labelledby="dr-progression">
        <div><p className={styles.eyebrow}>A ROUTINE THAT MOVES FORWARD</p><h2 id="dr-progression">Start gently.<br /><em>Keep building.</em></h2><p>90 days of structure, with room to go at your pace.<br />A missed day doesn’t erase your progress.</p></div>
        <ol className={styles.phases}>
          <li><Wind size={24} /><div><span>BEGIN WITH CONNECTION</span><h3>Breath. Awareness. Control.</h3><p>Learn a comfortable starting position and how to manage pressure.</p></div></li>
          <li><CircleCheck size={24} /><div><span>ADD CONTROLLED MOVEMENT</span><h3>Slide. March. Bridge.</h3><p>Bring your core into movement, with adjustable practice.</p></div></li>
          <li><Heart size={24} /><div><span>BUILD TOWARD EVERYDAY LIFE</span><h3>Lift. Move. Feel more capable.</h3><p>Progress toward lifting practice and supported strength work.</p></div></li>
        </ol>
      </section>

      <section className={styles.evidence} aria-labelledby="dr-evidence"><p className={styles.eyebrow}>REALISTIC EXPECTATIONS. REAL REASONS TO START.</p><h2 id="dr-evidence">Your core is more<br /><em>than a gap measurement.</em></h2><p>Abdominal training can build strength. Research on narrowing the gap is mixed. Your plan focuses on progressive practice, control and confidence, without promising a flat stomach or a recovery deadline.</p><details><summary>The research behind that <span>+</span></summary><div><p>A 12-week trial improved abdominal strength without changing separation. Recent reviews report mixed results for gap reduction. These studies assessed exercise programs, not Pelvi.</p><a href="https://pubmed.ncbi.nlm.nih.gov/37286390/" target="_blank" rel="noopener noreferrer">2023 randomized trial ↗</a><a href="https://pubmed.ncbi.nlm.nih.gov/41995773/" target="_blank" rel="noopener noreferrer">2026 systematic review ↗</a><a href="https://pubmed.ncbi.nlm.nih.gov/41995887/" target="_blank" rel="noopener noreferrer">2026 review of randomized trials ↗</a><a href="https://www.nhs.uk/baby/support-and-services/your-post-pregnancy-body/" target="_blank" rel="noopener noreferrer">NHS: your post-pregnancy body ↗</a></div></details></section>

      <section className={styles.faq} aria-labelledby="dr-faq"><div><p className={styles.eyebrow}>BEFORE YOU MAKE IT YOURS</p><h2 id="dr-faq">A few good<br /><em>questions.</em></h2><p>Need a hand?<br /><a href="mailto:contact@pelvi.health">contact@pelvi.health</a></p></div><div className={styles.faqList}>{FAQ.map(([question, answer], i) => <details key={question} id={i === 7 ? "dr-refund" : undefined}><summary>{question}<span>+</span></summary><p>{answer} {i === 7 && <a href="/terms">Read the full terms</a>}</p></details>)}</div></section>

      <section className={styles.finalOffer}><div><p className={styles.eyebrow}>YOUR NEXT STEP CAN BE SIMPLE</p><h2>A little practice.<br /><em>A little more you.</em></h2><p>Your progressive core plan, ready when you are.</p><div className={styles.finalPrice}>{DEFAULT_PRICE_LABEL}<span>{PRICE_CURRENCY} / {DEFAULT_PRICE_PERIOD}</span></div><button type="button" className={styles.primary} onClick={goToOffer}>Start My Core Plan <ArrowRight size={18} /></button><p className={styles.finalTerms}>Renews every {DEFAULT_PRICE_PERIOD} until canceled.<br />7-day money-back guarantee.</p></div><div className={styles.finalArt}><Phone src="/diastasis/app-practice.webp" alt={GALLERY[1].alt} /><span>ONE CLEAR STEP<br /><em>at a time.</em></span></div></section>

      <footer className={styles.footer}><div><a href="/" className={styles.logo}>pelvi<span>®</span></a><p>Core care. In your corner.</p></div><nav aria-label="Landing page footer"><a href="/app">Member log in</a><a href="mailto:contact@pelvi.health">Contact</a><a href="/terms">Terms & refunds</a><a href="/privacy-policy">Privacy</a></nav><p className={styles.suitability}>Recently had a C-section or abdominal surgery, have pain, a known hernia or clinician restrictions? Ask your clinician before starting. Stop if exercise causes pain. Pelvi provides exercise guidance and education, not diagnosis or medical care.</p><p className={styles.copyright}>© {new Date().getFullYear()} Pelvi Health. Lifestyle imagery is illustrative.</p></footer>

      {!offerVisible && !checkoutOpen && !previewOpen && <div className={styles.stickyOffer}><div><strong>{DEFAULT_PRICE_LABEL}<small> / {DEFAULT_PRICE_PERIOD}</small></strong><span>7-day money-back guarantee</span></div><button type="button" onClick={goToOffer}>Start My Plan <ArrowRight size={17} /></button></div>}
      {checkoutOpen && <CheckoutSheet open onClose={closeCheckout} goalId={GOAL_ID} email={email.trim()} successPath={checkoutPath} />}
      {previewOpen && <DiastasisPreview open onClose={closePreview} />}
    </div>
  );
}
