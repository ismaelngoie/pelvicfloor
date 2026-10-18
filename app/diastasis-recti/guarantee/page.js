import styles from "../diastasis.module.css";

export const metadata = {
  title: "12-Week Money-Back Guarantee | Pelvi",
  description: "The 12-week money-back offer for Pelvi’s diastasis recti web membership.",
  alternates: { canonical: "https://pelvi.health/diastasis-recti/guarantee" },
};

export default function DiastasisGuaranteePage() {
  return <div className={`${styles.page} ${styles.guaranteePage}`}>
    <header className={styles.header}>
      <a href="/diastasis-recti" className={styles.logo} aria-label="Back to the Pelvi diastasis recti plan">pelvi<span>®</span></a>
      <a href="/diastasis-recti" className={styles.login}>Back to your plan →</a>
    </header>
    <article className={styles.guaranteeContent}>
      <p className={styles.eyebrow}>THE DIASTASIS RECTI WEB OFFER</p>
      <h1>Your progress.<br /><em>Or your money back.</em></h1>
      <p>If you are not happy with your progress within the first 12 weeks, ask for a full refund.</p>
      <h2>How to ask for your refund</h2>
      <p>Email <a href="mailto:contact@pelvi.health">contact@pelvi.health</a> within 84 days of your first membership payment. Include the email address used at checkout so we can find your purchase. You do not need to send photos, health information or proof of completed exercises.</p>
      <h2>What the refund covers</h2>
      <p>This offer covers all Pelvi membership fees you paid from your first payment through your refund request within that 84-day period. It applies to purchases through the Pelvi diastasis recti web offer shown on <a href="/diastasis-recti">this page</a>.</p>
      <h2>Your membership</h2>
      <p>Your membership renews monthly until you cancel. You can stop future payments in You → Subscription → Manage or cancel. Canceling a renewal does not send a refund request; email us to claim this offer.</p>
      <h2>About this offer</h2>
      <p>This offer extends the standard refund window for the diastasis recti web membership. The <a href="/terms-of-service">standard subscription terms</a> still apply to other matters. The guarantee is a refund promise if you are unhappy with your progress; individual exercise results vary.</p>
      <p><a href="/diastasis-recti">← Back to the diastasis recti plan</a></p>
    </article>
  </div>;
}
